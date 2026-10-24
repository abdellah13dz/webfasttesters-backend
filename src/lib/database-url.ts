/**
 * Supabase direct hosts (db.*.supabase.co) are often IPv6-only and fail on
 * Render/Vercel. Rewrite to the session pooler automatically when detected.
 */
/**
 * Cap Prisma client connections so concurrent automation requests do not
 * exhaust Supabase session-pooler slots (often ~15 on free/small plans).
 */
function applyPoolLimits(url: URL): void {
  if (!url.searchParams.has('connection_limit')) {
    url.searchParams.set(
      'connection_limit',
      process.env.PRISMA_CONNECTION_LIMIT?.trim() || '5'
    );
  }
  if (!url.searchParams.has('pool_timeout')) {
    url.searchParams.set('pool_timeout', process.env.PRISMA_POOL_TIMEOUT?.trim() || '20');
  }
}

export function resolveDatabaseUrl(rawUrl?: string): string | undefined {
  if (!rawUrl?.trim()) return rawUrl;

  try {
    const url = new URL(rawUrl);

    if (url.hostname.includes('pooler.supabase.com')) {
      applyPoolLimits(url);
      return url.toString();
    }

    const directMatch = url.hostname.match(/^db\.([a-z0-9]+)\.supabase\.co$/i);
    if (!directMatch) {
      applyPoolLimits(url);
      return url.toString();
    }

    const projectRef = directMatch[1];
    const region = process.env.SUPABASE_POOLER_REGION || 'eu-west-1';
    const password = url.password;

    url.username = `postgres.${projectRef}`;
    url.password = password;
    url.hostname = `aws-0-${region}.pooler.supabase.com`;
    if (!url.port) url.port = '5432';

    applyPoolLimits(url);
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
  if (resolved) {
    process.env.DATABASE_URL = resolved;
  }
}
