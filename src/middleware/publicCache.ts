import type { Request, Response, NextFunction } from 'express';

/** Cache-Control for public read endpoints (CDN + browser). */
export function publicCache(maxAgeSeconds: number) {
  return (_req: Request, res: Response, next: NextFunction) => {
    res.setHeader(
      'Cache-Control',
      `public, max-age=${maxAgeSeconds}, s-maxage=${maxAgeSeconds}, stale-while-revalidate=86400`
    );
    next();
  };
}
