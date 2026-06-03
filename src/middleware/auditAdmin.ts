import type { Response, NextFunction } from 'express';
import { db } from '../lib/db.js';
import type { AuthenticatedRequest } from './requireAdmin.js';

function getClientIp(req: AuthenticatedRequest): string | null {
  const forwarded = req.headers['x-forwarded-for'];
  if (typeof forwarded === 'string') {
    return forwarded.split(',')[0]?.trim() || null;
  }
  return req.ip || req.socket.remoteAddress || null;
}

function methodToAction(method: string): string {
  switch (method) {
    case 'POST':
      return 'create';
    case 'PUT':
    case 'PATCH':
      return 'update';
    case 'DELETE':
      return 'delete';
    default:
      return method.toLowerCase();
  }
}

function entityFromPath(path: string): string {
  const segment = path.replace(/^\/+/, '').split('/')[0] || 'unknown';
  return segment.replace(/-/g, '_');
}

export async function writeAuditLog(data: {
  userId?: string | null;
  userEmail: string;
  action: string;
  entity: string;
  entityId?: string | null;
  metadata?: Record<string, unknown> | null;
  ip?: string | null;
}) {
  try {
    await db.adminAuditLog.create({
      data: {
        userId: data.userId ?? null,
        userEmail: data.userEmail,
        action: data.action,
        entity: data.entity,
        entityId: data.entityId ?? null,
        metadata: data.metadata ? JSON.stringify(data.metadata) : null,
        ip: data.ip ?? null,
      },
    });
  } catch (error) {
    console.error('Failed to write audit log:', error);
  }
}

export function auditAdminMutations(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  if (!['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method)) {
    return next();
  }

  const admin = req.admin;
  const entity = entityFromPath(req.baseUrl.replace('/api/admin/', '') || req.path);
  const action = methodToAction(req.method);
  const entityId = typeof req.params.id === 'string' ? req.params.id : null;

  res.on('finish', () => {
    if (res.statusCode < 200 || res.statusCode >= 400 || !admin) {
      return;
    }

    void writeAuditLog({
      userId: admin.sub,
      userEmail: admin.email,
      action,
      entity,
      entityId,
      metadata: {
        method: req.method,
        path: req.originalUrl,
      },
      ip: getClientIp(req),
    });
  });

  next();
}
