/** Fields returned for blog list, RSS, sitemap, and related posts (no body HTML). */
export const ARTICLE_LIST_SELECT = {
  id: true,
  slug: true,
  title: true,
  description: true,
  coverImage: true,
  category: true,
  status: true,
  readTime: true,
  featured: true,
  createdAt: true,
  seoTitle: true,
  seoDescription: true,
} as const;
