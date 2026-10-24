import type { Response } from 'express';

export function ok<T>(
  res: Response,
  data: T,
  status = 200,
  meta?: Record<string, unknown>
) {
  const requestId = (res.locals.requestId as string) || undefined;
  return res.status(status).json({
    request_id: requestId,
    data,
    ...(meta ? { meta } : {}),
  });
}

export function fail(
  res: Response,
  status: number,
  error: string,
  details?: Record<string, unknown>
) {
  const requestId = (res.locals.requestId as string) || undefined;
  return res.status(status).json({
    request_id: requestId,
    error,
    ...(details ? { details } : {}),
  });
}
