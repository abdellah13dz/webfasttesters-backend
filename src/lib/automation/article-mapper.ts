import type { Article } from '@prisma/client';
import { parseKeywordList } from './sanitize.js';
import { buildPublicArticleUrl } from './public-url.js';

/** Make.com-facing article DTO mapped onto the existing Article schema. */
export interface AutomationArticleDto {
  id: string;
  title: string;
  slug: string;
  excerpt: string;
  content: string;
  seo_title: string | null;
  meta_description: string | null;
  primary_keyword: string | null;
  secondary_keywords: string[];
  tags: string[];
  category: string;
  featured_image: string | null;
  status: string;
  read_time: string;
  featured: boolean;
  created_at: string;
  updated_at: string;
  published_at: string | null;
  public_url: string;
  /** Optimistic concurrency token (ISO updatedAt). */
  version: string;
}

export function toAutomationArticle(article: Article): AutomationArticleDto {
  const keywords = parseKeywordList(article.seoKeywords);

  return {
    id: article.id,
    title: article.title,
    slug: article.slug,
    excerpt: article.description,
    content: article.content,
    seo_title: article.seoTitle,
    meta_description: article.seoDescription,
    primary_keyword: keywords.primary_keyword,
    secondary_keywords: keywords.secondary_keywords,
    tags: keywords.tags,
    category: article.category,
    featured_image: article.coverImage,
    status: article.status,
    read_time: article.readTime,
    featured: article.featured,
    created_at: article.createdAt.toISOString(),
    updated_at: article.updatedAt.toISOString(),
    published_at: article.publishedAt ? article.publishedAt.toISOString() : null,
    public_url: buildPublicArticleUrl(article.slug),
    version: article.updatedAt.toISOString(),
  };
}

export function toAutomationArticleSummary(article: Article): Omit<AutomationArticleDto, 'content'> {
  const full = toAutomationArticle(article);
  const { content: _content, ...summary } = full;
  return summary;
}
