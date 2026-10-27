import {
  estimateReadTime,
  normalizeKeywords,
  sanitizeHtmlContent,
  sanitizePlainText,
  slugify,
} from './sanitize.js';
import { validateFeaturedImageUrl } from './validate-image-url.js';

export type ArticleFieldInput = {
  title?: unknown;
  slug?: unknown;
  excerpt?: unknown;
  description?: unknown;
  content?: unknown;
  body?: unknown;
  content_html?: unknown;
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
  status?: unknown;
  expected_updated_at?: unknown;
  version?: unknown;
};

export function asOptionalString(value: unknown): string | undefined {
  return typeof value === 'string' ? value : undefined;
}

/**
 * Parse/validate article fields for create or partial update.
 * Does not force status — callers control draft vs published rules.
 */
export function validateArticleFields(
  body: ArticleFieldInput,
  mode: 'create' | 'update'
): { error?: string; data?: Record<string, unknown>; expectedUpdatedAt?: string } {
  const title = asOptionalString(body.title);
  const slugRaw = asOptionalString(body.slug);
  const excerpt = asOptionalString(body.excerpt) ?? asOptionalString(body.description);
  const content =
    asOptionalString(body.content) ??
    asOptionalString(body.body) ??
    asOptionalString(body.content_html);
  const category = asOptionalString(body.category);
  const seoTitle = asOptionalString(body.seo_title) ?? asOptionalString(body.seoTitle);
  const metaDescription =
    asOptionalString(body.meta_description) ?? asOptionalString(body.seoDescription);
  const featuredImage =
    asOptionalString(body.featured_image) ?? asOptionalString(body.coverImage);
  const readTime = asOptionalString(body.read_time) ?? asOptionalString(body.readTime);
  const expectedUpdatedAt =
    asOptionalString(body.expected_updated_at) ?? asOptionalString(body.version);

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
    if (!featuredImage) {
      data.coverImage = null;
    } else {
      const imageCheck = validateFeaturedImageUrl(featuredImage);
      if (!imageCheck.ok) return { error: imageCheck.error };
      data.coverImage = imageCheck.url;
    }
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

  return { data, expectedUpdatedAt };
}

export function validatePublishReady(article: {
  title: string;
  slug: string;
  description: string;
  content: string;
  category: string;
}): string | null {
  if (!article.title?.trim()) return 'title is required to publish';
  if (!article.slug?.trim()) return 'slug is required to publish';
  if (!article.description?.trim()) return 'excerpt is required to publish';
  if (!article.content?.trim()) return 'content is required to publish';
  if (!article.category?.trim()) return 'category is required to publish';
  return null;
}
