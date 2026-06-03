import type { Request, Response, NextFunction } from 'express';
import { verifyAdminToken, type AdminTokenPayload } from '../lib/auth.js';

export interface AuthenticatedRequest extends Request {
  admin?: AdminTokenPayload;
}

function extractBearerToken(req: Request): string | undefined {
  const authHeader = req.headers.authorization;
  if (authHeader?.startsWith('Bearer ')) {
    return authHeader.slice(7).trim();
  }
  return undefined;
}

export function requireAdmin(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const token = extractBearerToken(req);

  if (!token) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  try {
    const payload = verifyAdminToken(token);
    if (payload.role !== 'admin') {
      return res.status(403).json({ error: 'Forbidden' });
    }
    req.admin = payload;
    next();
  } catch {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}
