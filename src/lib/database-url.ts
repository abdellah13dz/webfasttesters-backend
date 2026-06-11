/**
 * Supabase direct hosts (db.*.supabase.co) are often IPv6-only and fail on
 * Render/Vercel. Rewrite to the session pooler automatically when detected.
 */
export function resolveDatabaseUrl(rawUrl?: string): string | undefined {
  if (!rawUrl?.trim()) return rawUrl;

  try {
    const url = new URL(rawUrl);

    if (url.hostname.includes('pooler.supabase.com')) {
      return rawUrl;
    }

    const directMatch = url.hostname.match(/^db\.([a-z0-9]+)\.supabase\.co$/i);
    if (!directMatch) {
      return rawUrl;
    }

    const projectRef = directMatch[1];
    const region = process.env.SUPABASE_POOLER_REGION || 'eu-west-1';
    const password = url.password;

    url.username = `postgres.${projectRef}`;
    url.password = password;
    url.hostname = `aws-0-${region}.pooler.supabase.com`;
    if (!url.port) url.port = '5432';

    const resolved = url.toString();

    if (process.env.NODE_ENV !== 'test') {
      console.warn(
        `[db] DATABASE_URL used direct Supabase host; rewritten to session pooler (${url.hostname})`
      );
    }

    return resolved;
  } catch {
    return rawUrl;
  }
}

/** Normalize process.env.DATABASE_URL before Prisma connects. */
export function applyDatabaseUrlEnv(): void {
  const resolved = resolveDatabaseUrl(process.env.DATABASE_URL);
  if (resolved && resolved !== process.env.DATABASE_URL) {
    process.env.DATABASE_URL = resolved;
  }
}
