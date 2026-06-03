const DEFAULT_ORIGINS = [
  'https://fasttesters.com',
  'https://www.fasttesters.com',
  'http://localhost:3000',
];

/** Origins allowed to call the API (browser CORS). */
export function getAllowedOrigins(): string[] {
  const origins = new Set<string>(DEFAULT_ORIGINS);

  if (process.env.FRONTEND_URL) {
    origins.add(process.env.FRONTEND_URL.replace(/\/$/, ''));
  }

  if (process.env.ALLOWED_ORIGINS) {
    for (const origin of process.env.ALLOWED_ORIGINS.split(',')) {
      const trimmed = origin.trim().replace(/\/$/, '');
      if (trimmed) origins.add(trimmed);
    }
  }

  return [...origins];
}
