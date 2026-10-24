import { Router } from 'express';
import type { Prisma } from '@prisma/client';
import { db } from '../../../lib/db.js';
import {
  toAutomationArticle,
  toAutomationArticleSummary,
} from '../../../lib/automation/article-mapper.js';
import {
  estimateReadTime,
  normalizeKeywords,
  sanitizeHtmlContent,
  sanitizePlainText,
  slugify,
} from '../../../lib/automation/sanitize.js';
import {
  findIdempotentResponse,
  hashRequestBody,
  storeIdempotentResponse,
} from '../../../lib/automation/idempotency.js';
import { fail, ok } from '../../../lib/automation/response.js';
import {
  requireAutomationScope,
  type AutomationRequest,
} from '../../../middleware/requireAutomation.js';

const router = Router();

const DRAFT_STATUS = 'draft';
const MAX_PAGE_SIZE = 100;
const DEFAULT_PAGE_SIZE = 20;

function paramId(value: string | string[]): string {
  return Array.isArray(value) ? value[0] : value;
}

type DraftInput = {
  title?: unknown;
  slug?: unknown;
  excerpt?: unknown;
  description?: unknown;
  content?: unknown;
  body?: unknown;
  seo_title?: unknown;
  seoTitle?: unknown;
  meta_description?: unknown;
  seoDescription?: unknown;
  primary_keyword?: unknown;
  secondary_keywords?: unknown;
  seo_keywords?: unknown;
  seoKeywords?: unknown;
  category?: unknown;
  tags?: unknown;
  featured_image?: unknown;
  coverImage?: unknown;
  read_time?: unknown;
  readTime?: unknown;
};

function asOptionalString(value: unknown): string | undefined {
  return typeof value === 'string' ? value : undefined;
}

function parsePagination(query: AutomationRequest['query']) {
  const page = Math.max(1, Number.parseInt(String(query.page ?? '1'), 10) || 1);
  const requested = Number.parseInt(String(query.limit ?? DEFAULT_PAGE_SIZE), 10) || DEFAULT_PAGE_SIZE;
  const limit = Math.min(MAX_PAGE_SIZE, Math.max(1, requested));
  return { page, limit, skip: (page - 1) * limit };
}

function buildListWhere(query: AutomationRequest['query']): Prisma.ArticleWhereInput {
  const where: Prisma.ArticleWhereInput = {};

  const status = asOptionalString(query.status);
  if (status) where.status = status;

  const category = asOptionalString(query.category);
  if (category) where.category = category;

  const slug = asOptionalString(query.slug);
  if (slug) where.slug = slug;

  const title = asOptionalString(query.title);
  if (title) where.title = { equals: title, mode: 'insensitive' };

  const q = asOptionalString(query.q)?.trim();
  if (q) {
    where.OR = [
      { title: { contains: q, mode: 'insensitive' } },
      { slug: { contains: q, mode: 'insensitive' } },
      { description: { contains: q, mode: 'insensitive' } },
    ];
  }

  return where;
}

function validateDraftPayload(
  body: DraftInput,
  mode: 'create' | 'update'
): { error?: string; data?: Record<string, unknown> } {
  const title = asOptionalString(body.title);
  const slugRaw = asOptionalString(body.slug);
  const excerpt = asOptionalString(body.excerpt) ?? asOptionalString(body.description);
  const content = asOptionalString(body.content) ?? asOptionalString(body.body);
  const category = asOptionalString(body.category);
  const seoTitle = asOptionalString(body.seo_title) ?? asOptionalString(body.seoTitle);
  const metaDescription =
    asOptionalString(body.meta_description) ?? asOptionalString(body.seoDescription);
  const featuredImage =
    asOptionalString(body.featured_image) ?? asOptionalString(body.coverImage);
  const readTime = asOptionalString(body.read_time) ?? asOptionalString(body.readTime);

  if (mode === 'create') {
    if (!title?.trim()) return { error: 'title is required' };
    if (!excerpt?.trim()) return { error: 'excerpt is required' };
    if (!content?.trim()) return { error: 'content is required' };
    if (!category?.trim()) return { error: 'category is required' };
  }

  if (title !== undefined && !title.trim()) return { error: 'title cannot be empty' };
  if (excerpt !== undefined && !excerpt.trim()) return { error: 'excerpt cannot be empty' };
  if (content !== undefined && !content.trim()) return { error: 'content cannot be empty' };
  if (category !== undefined && !category.trim()) return { error: 'category cannot be empty' };

  const data: Record<string, unknown> = {};

  if (title !== undefined) data.title = sanitizePlainText(title, 200);
  if (excerpt !== undefined) data.description = sanitizePlainText(excerpt, 500);
  if (content !== undefined) data.content = sanitizeHtmlContent(content);
  if (category !== undefined) data.category = sanitizePlainText(category, 80).toUpperCase();

  if (slugRaw !== undefined) {
    const slug = slugify(slugRaw);
    if (!slug) return { error: 'slug is invalid' };
    data.slug = slug;
  } else if (mode === 'create' && title) {
    data.slug = slugify(title);
  }

  if (seoTitle !== undefined) {
    data.seoTitle = seoTitle ? sanitizePlainText(seoTitle, 70) : null;
  }
  if (metaDescription !== undefined) {
    data.seoDescription = metaDescription ? sanitizePlainText(metaDescription, 160) : null;
  }
  if (featuredImage !== undefined) {
    data.coverImage = featuredImage ? sanitizePlainText(featuredImage, 500) : null;
  }

  const hasKeywordInput =
    body.primary_keyword !== undefined ||
    body.secondary_keywords !== undefined ||
    body.tags !== undefined ||
    body.seo_keywords !== undefined ||
    body.seoKeywords !== undefined;

  if (hasKeywordInput) {
    const legacy =
      asOptionalString(body.seo_keywords) ?? asOptionalString(body.seoKeywords) ?? null;
    if (
      legacy &&
      body.primary_keyword === undefined &&
      body.secondary_keywords === undefined &&
      body.tags === undefined
    ) {
      data.seoKeywords = sanitizePlainText(legacy, 500);
    } else {
      data.seoKeywords = normalizeKeywords(
        asOptionalString(body.primary_keyword),
        body.secondary_keywords as string[] | string | null | undefined,
        body.tags as string[] | string | null | undefined
      );
    }
  }

  if (readTime !== undefined) {
    data.readTime = readTime ? sanitizePlainText(readTime, 40) : undefined;
  } else if (mode === 'create' && typeof data.content === 'string') {
    data.readTime = estimateReadTime(data.content);
  }

  return { data };
}

/** GET /posts — list articles (read scope). Supports pagination + filters. */
router.get(
  '/posts',
  requireAutomationScope('blog:read'),
  async (req: AutomationRequest, res) => {
    try {
      const { page, limit, skip } = parsePagination(req.query);
      const where = buildListWhere(req.query);

      const [total, articles] = await Promise.all([
        db.article.count({ where }),
        db.article.findMany({
          where,
          orderBy: { createdAt: 'desc' },
          skip,
          take: limit,
        }),
      ]);

      return ok(
        res,
        articles.map(toAutomationArticleSummary),
        200,
        {
          page,
          limit,
          total,
          total_pages: Math.max(1, Math.ceil(total / limit)),
        }
      );
    } catch (error) {
      console.error('Automation list posts error:', error);
      return fail(res, 500, 'Failed to list posts');
    }
  }
);

/** GET /posts/:id — single article by id or slug. */
router.get(
  '/posts/:id',
  requireAutomationScope('blog:read'),
  async (req: AutomationRequest, res) => {
    try {
      const idOrSlug = paramId(req.params.id);
      const article = await db.article.findFirst({
        where: {
          OR: [{ id: idOrSlug }, { slug: idOrSlug }],
        },
      });

      if (!article) return fail(res, 404, 'Article not found');
      return ok(res, toAutomationArticle(article));
    } catch (error) {
      console.error('Automation get post error:', error);
      return fail(res, 500, 'Failed to fetch post');
    }
  }
);

/** POST /drafts — create unpublished draft only. */
router.post(
  '/drafts',
  requireAutomationScope('blog:draft:create'),
  async (req: AutomationRequest, res) => {
    try {
      const key = req.automationKey!;
      const idempotencyKeyHeader = req.headers['idempotency-key'];
      const idempotencyKey =
        typeof idempotencyKeyHeader === 'string' ? idempotencyKeyHeader.trim().slice(0, 128) : '';

      if (idempotencyKey) {
        const existing = await findIdempotentResponse(key.id, idempotencyKey);
        if (existing) {
          const body = JSON.parse(existing.responseBody) as unknown;
          res.setHeader('Idempotency-Replayed', 'true');
          return res.status(existing.responseCode).json(body);
        }
      }

      const validation = validateDraftPayload(req.body as DraftInput, 'create');
      if (validation.error || !validation.data) {
        return fail(res, 400, validation.error ?? 'Invalid payload');
      }

      const data = validation.data as {
        title: string;
        slug: string;
        description: string;
        content: string;
        category: string;
        seoTitle?: string | null;
        seoDescription?: string | null;
        seoKeywords?: string | null;
        coverImage?: string | null;
        readTime?: string;
      };

      if (!data.slug) {
        return fail(res, 400, 'Unable to derive a valid slug from title');
      }

      const [slugConflict, titleConflict] = await Promise.all([
        db.article.findUnique({ where: { slug: data.slug } }),
        db.article.findFirst({
          where: { title: { equals: data.title, mode: 'insensitive' } },
        }),
      ]);

      if (slugConflict) {
        return fail(res, 409, 'An article with this slug already exists', {
          field: 'slug',
          value: data.slug,
          existing_id: slugConflict.id,
        });
      }

      if (titleConflict) {
        return fail(res, 409, 'An article with this title already exists', {
          field: 'title',
          value: data.title,
          existing_id: titleConflict.id,
        });
      }

      const article = await db.article.create({
        data: {
          slug: data.slug,
          title: data.title,
          description: data.description,
          content: data.content,
          category: data.category,
          coverImage: data.coverImage ?? null,
          seoTitle: data.seoTitle ?? null,
          seoDescription: data.seoDescription ?? null,
          seoKeywords: data.seoKeywords ?? null,
          readTime: data.readTime ?? '5 min read',
          status: DRAFT_STATUS,
          featured: false,
        },
      });

      const payload = {
        request_id: res.locals.requestId,
        data: toAutomationArticle(article),
      };

      if (idempotencyKey) {
        await storeIdempotentResponse({
          apiKeyId: key.id,
          key: idempotencyKey,
          requestHash: hashRequestBody(req.body),
          responseCode: 201,
          responseBody: payload,
        });
      }

      return res.status(201).json(payload);
    } catch (error) {
      console.error('Automation create draft error:', error);
      return fail(res, 500, 'Failed to create draft');
    }
  }
);

/** PATCH /drafts/:id — update unpublished drafts only. */
router.patch(
  '/drafts/:id',
  requireAutomationScope('blog:draft:update'),
  async (req: AutomationRequest, res) => {
    try {
      const draftId = paramId(req.params.id);
      const existing = await db.article.findUnique({ where: { id: draftId } });
      if (!existing) return fail(res, 404, 'Draft not found');

      if (existing.status !== DRAFT_STATUS) {
        return fail(res, 403, 'Only unpublished drafts can be updated via automation API', {
          status: existing.status,
        });
      }

      // Reject any attempt to publish or change status away from draft
      if (req.body && typeof req.body === 'object' && 'status' in req.body) {
        const requestedStatus = (req.body as { status?: unknown }).status;
        if (requestedStatus !== undefined && requestedStatus !== DRAFT_STATUS) {
          return fail(res, 403, 'Publishing is not allowed via the automation API');
        }
      }

      const validation = validateDraftPayload(req.body as DraftInput, 'update');
      if (validation.error || !validation.data) {
        return fail(res, 400, validation.error ?? 'Invalid payload');
      }

      const data = validation.data as Record<string, unknown>;

      if (typeof data.slug === 'string' && data.slug !== existing.slug) {
        const slugConflict = await db.article.findUnique({ where: { slug: data.slug } });
        if (slugConflict) {
          return fail(res, 409, 'An article with this slug already exists', {
            field: 'slug',
            value: data.slug,
            existing_id: slugConflict.id,
          });
        }
      }

      if (typeof data.title === 'string' && data.title.toLowerCase() !== existing.title.toLowerCase()) {
        const titleConflict = await db.article.findFirst({
          where: {
            title: { equals: data.title, mode: 'insensitive' },
            NOT: { id: existing.id },
          },
        });
        if (titleConflict) {
          return fail(res, 409, 'An article with this title already exists', {
            field: 'title',
            value: data.title,
            existing_id: titleConflict.id,
          });
        }
      }

      const article = await db.article.update({
        where: { id: existing.id },
        data: {
          ...(data.slug !== undefined && { slug: data.slug as string }),
          ...(data.title !== undefined && { title: data.title as string }),
          ...(data.description !== undefined && { description: data.description as string }),
          ...(data.content !== undefined && { content: data.content as string }),
          ...(data.category !== undefined && { category: data.category as string }),
          ...(data.coverImage !== undefined && { coverImage: data.coverImage as string | null }),
          ...(data.seoTitle !== undefined && { seoTitle: data.seoTitle as string | null }),
          ...(data.seoDescription !== undefined && {
            seoDescription: data.seoDescription as string | null,
          }),
          ...(data.seoKeywords !== undefined && {
            seoKeywords: data.seoKeywords as string | null,
          }),
          ...(data.readTime !== undefined && { readTime: data.readTime as string }),
          status: DRAFT_STATUS,
          featured: false,
        },
      });

      return ok(res, toAutomationArticle(article));
    } catch (error) {
      console.error('Automation update draft error:', error);
      return fail(res, 500, 'Failed to update draft');
    }
  }
);

/** GET /categories — distinct article categories. */
router.get(
  '/categories',
  requireAutomationScope('blog:read'),
  async (_req: AutomationRequest, res) => {
    try {
      const rows = await db.article.findMany({
        select: { category: true },
        distinct: ['category'],
        orderBy: { category: 'asc' },
      });

      return ok(
        res,
        rows.map((row) => ({ name: row.category, slug: slugify(row.category) }))
      );
    } catch (error) {
      console.error('Automation categories error:', error);
      return fail(res, 500, 'Failed to list categories');
    }
  }
);

/**
 * GET /tags — derived from seoKeywords (no separate Tag model in this CMS).
 * Returns unique keyword tokens used across articles.
 */
router.get(
  '/tags',
  requireAutomationScope('blog:read'),
  async (_req: AutomationRequest, res) => {
    try {
      const rows = await db.article.findMany({
        where: { seoKeywords: { not: null } },
        select: { seoKeywords: true },
      });

      const counts = new Map<string, number>();
      for (const row of rows) {
        if (!row.seoKeywords) continue;
        for (const part of row.seoKeywords.split(',')) {
          const tag = part.trim();
          if (!tag) continue;
          const key = tag.toLowerCase();
          counts.set(key, (counts.get(key) ?? 0) + 1);
        }
      }

      const tags = [...counts.entries()]
        .map(([name, count]) => ({ name, count }))
        .sort((a, b) => a.name.localeCompare(b.name));

      return ok(res, tags);
    } catch (error) {
      console.error('Automation tags error:', error);
      return fail(res, 500, 'Failed to list tags');
    }
  }
);

export default router;
