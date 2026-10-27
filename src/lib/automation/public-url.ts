/**
 * Public marketing-site blog URL conventions (Next.js app).
 * Frontend resolves articles at /blog/{slug} via GET /api/articles?slug=.
 */
export function getPublicSiteOrigin(): string {
  const raw =
    process.env.SITE_URL?.trim() ||
    process.env.FRONTEND_URL?.trim() ||
    'https://fasttesters.com';
  return raw.replace(/\/$/, '');
}

export function buildPublicArticleUrl(slug: string): string {
  return `${getPublicSiteOrigin()}/blog/${slug.replace(/^\/+/, '')}`;
}

/** Same filter the public API uses for published articles. */
export async function verifyPublishedArticleAccessible(
  findPublished: (slug: string) => Promise<{ id: string; slug: string; status: string } | null>,
  slug: string
): Promise<{ ok: true; public_url: string } | { ok: false; public_url: string; reason: string }> {
  const publicUrl = buildPublicArticleUrl(slug);
  const row = await findPublished(slug);
  if (!row || row.status !== 'published') {
    return {
      ok: false,
      public_url: publicUrl,
      reason: 'Article is not retrievable as published via the public articles filter',
    };
  }
  return { ok: true, public_url: publicUrl };
}
