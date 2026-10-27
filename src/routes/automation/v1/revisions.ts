import { Router } from 'express';
import { db } from '../../../lib/db.js';
import { toAutomationArticle } from '../../../lib/automation/article-mapper.js';
import {
  createArticleRevision,
  isRevisionUniqueConflict,
  parseSnapshot,
  resolvePublishedAtPreservation,
  snapshotToUpdateData,
} from '../../../lib/automation/revisions.js';
import {
  buildPublicArticleUrl,
  verifyPublishedArticleAccessible,
} from '../../../lib/automation/public-url.js';
import { withIdempotency } from '../../../lib/automation/with-idempotency.js';
import { fail, ok } from '../../../lib/automation/response.js';
import { writeAuditLog } from '../../../middleware/auditAdmin.js';
import {
  requireAutomationScope,
  type AutomationRequest,
} from '../../../middleware/requireAutomation.js';

const router = Router();
const PUBLISHED = 'published';

function paramId(value: string | string[]): string {
  return Array.isArray(value) ? value[0] : value;
}

function clientIp(req: AutomationRequest): string | null {
  const forwarded = req.headers['x-forwarded-for'];
  if (typeof forwarded === 'string') {
    return forwarded.split(',')[0]?.trim() || null;
  }
  return req.ip || req.socket.remoteAddress || null;
}

function revisionSummary(row: {
  id: string;
  articleId: string;
  revisionNumber: number;
  reason: string;
  actorKeyId: string | null;
  actorLabel: string | null;
  createdAt: Date;
}) {
  return {
    id: row.id,
    article_id: row.articleId,
    revision_number: row.revisionNumber,
    reason: row.reason,
    actor_key_id: row.actorKeyId,
    actor_label: row.actorLabel,
    created_at: row.createdAt.toISOString(),
  };
}

/** GET /articles/:id/revisions */
router.get(
  '/articles/:id/revisions',
  requireAutomationScope('blog:revisions:read'),
  async (req: AutomationRequest, res) => {
    try {
      const articleId = paramId(req.params.id);
      const article = await db.article.findUnique({ where: { id: articleId } });
      if (!article) return fail(res, 404, 'Article not found');

      const rows = await db.articleRevision.findMany({
        where: { articleId },
        orderBy: { revisionNumber: 'desc' },
      });

      return ok(res, {
        article_id: articleId,
        revisions: rows.map(revisionSummary),
      });
    } catch (error) {
      console.error(
        'Automation list revisions error:',
        error instanceof Error ? error.message : 'unknown'
      );
      return fail(res, 500, 'Failed to list revisions');
    }
  }
);

/** GET /articles/:id/revisions/:revisionId */
router.get(
  '/articles/:id/revisions/:revisionId',
  requireAutomationScope('blog:revisions:read'),
  async (req: AutomationRequest, res) => {
    try {
      const articleId = paramId(req.params.id);
      const revisionId = paramId(req.params.revisionId);
      const revision = await db.articleRevision.findUnique({ where: { id: revisionId } });
      if (!revision || revision.articleId !== articleId) {
        return fail(res, 404, 'Revision not found for this article');
      }

      return ok(res, {
        ...revisionSummary(revision),
        snapshot: parseSnapshot(revision.snapshot),
      });
    } catch (error) {
      console.error(
        'Automation get revision error:',
        error instanceof Error ? error.message : 'unknown'
      );
      return fail(res, 500, 'Failed to fetch revision');
    }
  }
);

/**
 * POST /articles/:id/revisions/:revisionId/rollback
 * Accepts Idempotency-Key (strongly recommended). Same key + same params replay;
 * same key + different article/revision → 409. Failed ops release the reservation.
 */
router.post(
  '/articles/:id/revisions/:revisionId/rollback',
  requireAutomationScope('blog:rollback'),
  async (req: AutomationRequest, res) => {
    try {
      await withIdempotency(req, res, async () => {
        const articleId = paramId(req.params.id);
        const revisionId = paramId(req.params.revisionId);

        const existing = await db.article.findUnique({ where: { id: articleId } });
        if (!existing) {
          fail(res, 404, 'Article not found');
          return;
        }

        if (existing.status !== PUBLISHED) {
          fail(res, 403, 'Rollback is only supported for published articles', {
            status: existing.status,
          });
          return;
        }

        const target = await db.articleRevision.findUnique({ where: { id: revisionId } });
        if (!target || target.articleId !== articleId) {
          fail(res, 404, 'Revision not found for this article');
          return;
        }

        const snapshot = parseSnapshot(target.snapshot);
        const preservedPublishedAt = resolvePublishedAtPreservation(
          existing.publishedAt,
          snapshot.publishedAt
        );

        const result = await db.$transaction(async (tx) => {
          const safetyRevision = await createArticleRevision({
            article: existing,
            reason: 'rollback_safety',
            actorKeyId: req.automationKey?.id,
            actorLabel: req.automationKey ? `automation:${req.automationKey.name}` : null,
            tx,
          });

          const article = await tx.article.update({
            where: { id: articleId },
            data: {
              ...snapshotToUpdateData(snapshot),
              // Keep current public slug/URL; stay published.
              slug: existing.slug,
              status: PUBLISHED,
              // Legacy null stays null — do not invent from createdAt.
              publishedAt: preservedPublishedAt,
            },
          });

          const restoreMarker = await createArticleRevision({
            article,
            reason: 'rollback_restore',
            actorKeyId: req.automationKey?.id,
            actorLabel: req.automationKey ? `automation:${req.automationKey.name}` : null,
            tx,
          });

          return { article, safetyRevision, restoreMarker };
        });

        const verification = await verifyPublishedArticleAccessible(
          (slug) =>
            db.article.findFirst({
              where: { status: PUBLISHED, slug },
              select: { id: true, slug: true, status: true },
            }),
          result.article.slug
        );

        void writeAuditLog({
          userId: req.automationKey?.id,
          userEmail: `automation:${req.automationKey?.name ?? 'unknown'}`,
          action: 'rollback',
          entity: 'automation_blog',
          entityId: articleId,
          metadata: {
            request_id: res.locals.requestId,
            restored_revision_id: target.id,
            safety_revision_id: result.safetyRevision.id,
            status: PUBLISHED,
          },
          ip: clientIp(req),
        });

        ok(res, {
          success: true,
          article: toAutomationArticle(result.article),
          article_id: result.article.id,
          status: result.article.status,
          published_at: result.article.publishedAt?.toISOString() ?? null,
          restored_revision_id: target.id,
          restored_revision_number: target.revisionNumber,
          safety_revision_id: result.safetyRevision.id,
          restore_marker_revision_id: result.restoreMarker.id,
          public_url: verification.public_url || buildPublicArticleUrl(result.article.slug),
          public_accessible: verification.ok,
          ...(!verification.ok ? { public_verification_error: verification.reason } : {}),
        });
      });
    } catch (error) {
      if (isRevisionUniqueConflict(error)) {
        return fail(res, 409, 'Revision number conflict — retry the request', {
          retryable: true,
        });
      }
      console.error(
        'Automation rollback error:',
        error instanceof Error ? error.message : 'unknown'
      );
      return fail(res, 500, 'Failed to roll back article');
    }
  }
);

export default router;
