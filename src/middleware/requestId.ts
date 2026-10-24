import { randomUUID } from 'node:crypto';
import type { Request, Response, NextFunction } from 'express';

export function requestId(req: Request, res: Response, next: NextFunction) {
  const incoming = req.headers['x-request-id'];
  const id =
    typeof incoming === 'string' && incoming.trim().length > 0
      ? incoming.trim().slice(0, 128)
      : randomUUID();

  res.locals.requestId = id;
  res.setHeader('X-Request-Id', id);
  next();
}
