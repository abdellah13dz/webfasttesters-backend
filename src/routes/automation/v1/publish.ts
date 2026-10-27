import { Router } from 'express';
import { Prisma } from '@prisma/client';
import { db } from '../../../lib/db.js';
import { toAutomationArticle } from '../../../lib/automation/article-mapper.js';
import {
  validateArticleFields,
  validatePublishReady,
  type ArticleFieldInput,
} from '../../../lib/automation/article-fields.js';
import {
  createArticleRevision,
  isRevisionUniqueConflict,
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
const DRAFT = 'draft';

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

/** POST /drafts/:id/publish */
router.post(
  '/drafts/:id/publish',
  requireAutomationScope('blog:publish'),
  async (req: AutomationRequest, res) => {
    try {
      await withIdempotency(req, res, async () => {
        const id = paramId(req.params.id);
        const existing = await db.article.findUnique({ where: { id } });
        if (!existing) {
          fail(res, 404, 'Article not found');
          return;
        }

        if (existing.status === PUBLISHED) {
          const verification = await verifyPublishedArticleAccessible(
            (slug) =>
              db.article.findFirst({
                where: { status: PUBLISHED, slug },
                select: { id: true, slug: true, status: true },
              }),
            existing.slug
          );
          ok(res, {
            article: toAutomationArticle(existing),
            already_published: true,
            public_url: verification.public_url,
            public_accessible: verification.ok,
            ...(!verification.ok ? { public_verification_error: verification.reason } : {}),
          });
          return;
        }

        if (existing.status !== DRAFT) {
          fail(res, 403, 'Only draft articles can be published via this endpoint', {
            status: existing.status,
          });
          return;
        }

        const readyError = validatePublishReady(existing);
        if (readyError) {
          fail(res, 400, readyError);
          return;
        }

        const publishedAt = new Date();
        const result = await db.$transaction(async (tx) => {
          const revision = await createArticleRevision({
            article: existing,
            reason: 'publish',
            actorKeyId: req.automationKey?.id,
            actorLabel: req.automationKey ? `automation:${req.automationKey.name}` : null,
            tx,
          });

          const article = await tx.article.update({
            where: { id: existing.id },
            data: {
              status: PUBLISHED,
              // Set publishedAt exactly once on first publish; never invent from createdAt.
              publishedAt: existing.publishedAt ?? publishedAt,
            },
          });

          return { article, revision };
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
          action: 'publish',
          entity: 'automation_blog',
          entityId: result.article.id,
          metadata: {
            request_id: res.locals.requestId,
            previous_status: DRAFT,
            status: PUBLISHED,
            revision_id: result.revision.id,
            public_accessible: verification.ok,
          },
          ip: clientIp(req),
        });

        res.status(200).json({
          request_id: res.locals.requestId,
          success: true,
          data: {
            article: toAutomationArticle(result.article),
            article_id: result.article.id,
            slug: result.article.slug,
            status: result.article.status,
            published_at: result.article.publishedAt?.toISOString() ?? null,
            public_url: verification.public_url,
            public_accessible: verification.ok,
            ...(!verification.ok ? { public_verification_error: verification.reason } : {}),
            revision_id: result.revision.id,
            revision_number: result.revision.revisionNumber,
          },
        });
      });
    } catch (error) {
      if (isRevisionUniqueConflict(error)) {
        return fail(res, 409, 'Revision number conflict — retry the request', {
          retryable: true,
        });
      }
      console.error(
        'Automation publish error:',
        error instanceof Error ? error.message : 'unknown'
      );
      return fail(res, 500, 'Failed to publish article');
    }
  }
);

/**
 * PATCH /published/:id — update published article only; never unpublishes.
 * Optional optimistic concurrency: body.expected_updated_at / body.version / If-Match header.
 */
router.patch(
  '/published/:id',
  requireAutomationScope('blog:update_published'),
  async (req: AutomationRequest, res) => {
    try {
      await withIdempotency(req, res, async () => {
        const id = paramId(req.params.id);
        const existing = await db.article.findUnique({ where: { id } });
        if (!existing) {
          fail(res, 404, 'Article not found');
          return;
        }

        if (existing.status !== PUBLISHED) {
          fail(res, 403, 'Only published articles can be updated via this endpoint', {
            status: existing.status,
          });
          return;
        }

        if (req.body && typeof req.body === 'object' && 'status' in req.body) {
          const requested = (req.body as { status?: unknown }).status;
          if (requested !== undefined && requested !== PUBLISHED) {
            fail(res, 403, 'Cannot change publication status via published update endpoint');
            return;
          }
        }

        const ifMatch = req.headers['if-match'];
        const headerVersion =
          typeof ifMatch === 'string' ? ifMatch.replace(/^W\//, '').replace(/"/g, '').trim() : undefined;

        const validation = validateArticleFields(req.body as ArticleFieldInput, 'update');
        if (validation.error || !validation.data) {
          fail(res, 400, validation.error ?? 'Invalid payload');
          return;
        }

        const expected =
          validation.expectedUpdatedAt ||
          headerVersion ||
          undefined;

        if (expected && expected !== existing.updatedAt.toISOString()) {
          fail(res, 409, 'Stale article version — reload and retry', {
            expected_updated_at: expected,
            current_updated_at: existing.updatedAt.toISOString(),
            current_version: existing.updatedAt.toISOString(),
          });
          return;
        }

        const data = validation.data as Record<string, unknown>;

        // Preserve slug/URL by default: only change slug if explicitly provided and unique.
        if (typeof data.slug === 'string' && data.slug !== existing.slug) {
          const conflict = await db.article.findUnique({ where: { slug: data.slug } });
          if (conflict) {
            fail(res, 409, 'An article with this slug already exists', {
              field: 'slug',
              value: data.slug,
              existing_id: conflict.id,
            });
            return;
          }
        }

        if (
          typeof data.title === 'string' &&
          data.title.toLowerCase() !== existing.title.toLowerCase()
        ) {
          const titleConflict = await db.article.findFirst({
            where: {
              title: { equals: data.title, mode: 'insensitive' },
              NOT: { id: existing.id },
            },
          });
          if (titleConflict) {
            fail(res, 409, 'An article with this title already exists', {
              field: 'title',
              value: data.title,
              existing_id: titleConflict.id,
            });
            return;
          }
        }

        let result;
        try {
          result = await db.$transaction(async (tx) => {
            // Serialize writers; re-read under lock so we never save a revision for a lost update.
            await tx.$queryRaw`SELECT id FROM "Article" WHERE id = ${existing.id} FOR UPDATE`;
            const locked = await tx.article.findUnique({ where: { id: existing.id } });
            if (!locked || locked.status !== PUBLISHED) {
              throw Object.assign(new Error('concurrent_update'), { code: 'CONCURRENT_UPDATE' });
            }
            if (locked.updatedAt.getTime() !== existing.updatedAt.getTime()) {
              throw Object.assign(new Error('concurrent_update'), { code: 'CONCURRENT_UPDATE' });
            }

            const previousRevision = await createArticleRevision({
              article: locked,
              reason: 'update',
              actorKeyId: req.automationKey?.id,
              actorLabel: req.automationKey ? `automation:${req.automationKey.name}` : null,
              tx,
            });

            // Do not set publishedAt on ordinary updates — preserve null for legacy rows.
            const article = await tx.article.update({
              where: {
                id: locked.id,
                updatedAt: locked.updatedAt,
              },
              data: {
                ...(data.slug !== undefined && { slug: data.slug as string }),
                ...(data.title !== undefined && { title: data.title as string }),
                ...(data.description !== undefined && {
                  description: data.description as string,
                }),
                ...(data.content !== undefined && { content: data.content as string }),
                ...(data.category !== undefined && { category: data.category as string }),
                ...(data.coverImage !== undefined && {
                  coverImage: data.coverImage as string | null,
                }),
                ...(data.seoTitle !== undefined && { seoTitle: data.seoTitle as string | null }),
                ...(data.seoDescription !== undefined && {
                  seoDescription: data.seoDescription as string | null,
                }),
                ...(data.seoKeywords !== undefined && {
                  seoKeywords: data.seoKeywords as string | null,
                }),
                ...(data.readTime !== undefined && { readTime: data.readTime as string }),
                status: PUBLISHED,
              },
            });

            return { article, previousRevision };
          });
        } catch (error) {
          if (
            (error instanceof Error && (error as { code?: string }).code === 'CONCURRENT_UPDATE') ||
            (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025')
          ) {
            fail(res, 409, 'Concurrent update detected — reload and retry', {
              current_version: existing.updatedAt.toISOString(),
              retryable: true,
            });
            return;
          }
          if (isRevisionUniqueConflict(error)) {
            fail(res, 409, 'Revision number conflict — retry the request', {
              retryable: true,
            });
            return;
          }
          throw error;
        }

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
          action: 'update_published',
          entity: 'automation_blog',
          entityId: result.article.id,
          metadata: {
            request_id: res.locals.requestId,
            previous_revision_id: result.previousRevision.id,
            status: PUBLISHED,
            public_accessible: verification.ok,
          },
          ip: clientIp(req),
        });

        ok(res, {
          article: toAutomationArticle(result.article),
          article_id: result.article.id,
          slug: result.article.slug,
          status: result.article.status,
          updated_at: result.article.updatedAt.toISOString(),
          published_at: result.article.publishedAt?.toISOString() ?? null,
          public_url: verification.public_url || buildPublicArticleUrl(result.article.slug),
          public_accessible: verification.ok,
          ...(!verification.ok ? { public_verification_error: verification.reason } : {}),
          previous_revision_id: result.previousRevision.id,
          previous_revision_number: result.previousRevision.revisionNumber,
          version: result.article.updatedAt.toISOString(),
        });
      });
    } catch (error) {
      if (isRevisionUniqueConflict(error)) {
        return fail(res, 409, 'Revision number conflict — retry the request', {
          retryable: true,
        });
      }
      console.error(
        'Automation published update error:',
        error instanceof Error ? error.message : 'unknown'
      );
      return fail(res, 500, 'Failed to update published article');
    }
  }
);

export default router;
