import type { Request, Response, NextFunction } from 'express';
import { db } from '../lib/db.js';
import {
  hasScope,
  parseScopes,
  type AutomationScope,
} from '../lib/automation/scopes.js';
import {
  hashAutomationToken,
  looksLikeAutomationToken,
} from '../lib/automation/tokens.js';
import { fail } from '../lib/automation/response.js';
import { rateLimit } from './rateLimit.js';
import { writeAuditLog } from './auditAdmin.js';

export interface AutomationKeyContext {
  id: string;
  name: string;
  scopes: AutomationScope[];
  rateLimit: number;
}

export interface AutomationRequest extends Request {
  automationKey?: AutomationKeyContext;
}

function extractBearerToken(req: Request): string | undefined {
  const authHeader = req.headers.authorization;
  if (authHeader?.startsWith('Bearer ')) {
    return authHeader.slice(7).trim();
  }

  const apiKeyHeader = req.headers['x-api-key'];
  if (typeof apiKeyHeader === 'string' && apiKeyHeader.trim()) {
    return apiKeyHeader.trim();
  }

  return undefined;
}

function getClientIp(req: Request): string | null {
  const forwarded = req.headers['x-forwarded-for'];
  if (typeof forwarded === 'string') {
    return forwarded.split(',')[0]?.trim() || null;
  }
  return req.ip || req.socket.remoteAddress || null;
}

export async function requireAutomation(
  req: AutomationRequest,
  res: Response,
  next: NextFunction
) {
  const token = extractBearerToken(req);

  if (!token || !looksLikeAutomationToken(token)) {
    return fail(res, 401, 'Authentication required');
  }

  try {
    const keyHash = hashAutomationToken(token);
    const record = await db.automationApiKey.findUnique({ where: { keyHash } });

    if (!record || !record.active || record.revokedAt) {
      return fail(res, 401, 'Invalid or revoked automation credential');
    }

    const scopes = parseScopes(record.scopes);
    req.automationKey = {
      id: record.id,
      name: record.name,
      scopes,
      rateLimit: record.rateLimit,
    };

    // Throttle lastUsedAt writes to avoid connection storms under concurrency.
    const staleMs = 5 * 60_000;
    if (!record.lastUsedAt || Date.now() - record.lastUsedAt.getTime() > staleMs) {
      void db.automationApiKey
        .update({
          where: { id: record.id },
          data: { lastUsedAt: new Date() },
        })
        .catch(() => undefined);
    }

    next();
  } catch (error) {
    // Do not log bearer tokens or full request objects.
    console.error(
      'Automation auth error:',
      error instanceof Error ? error.message : 'unknown'
    );
    return fail(res, 500, 'Authentication failed');
  }
}

export function requireAutomationScope(scope: AutomationScope) {
  return (req: AutomationRequest, res: Response, next: NextFunction) => {
    const key = req.automationKey;
    if (!key || !hasScope(key.scopes, scope)) {
      return fail(res, 403, 'Insufficient automation scope', { required_scope: scope });
    }
    next();
  };
}

/** Per-key rate limit; falls back to IP if key missing (should not happen after auth). */
export function automationRateLimit(req: AutomationRequest, res: Response, next: NextFunction) {
  const max = req.automationKey?.rateLimit ?? 60;
  const keyId = req.automationKey?.id ?? 'anonymous';

  return rateLimit({
    windowMs: 60_000,
    max,
    message: 'Automation API rate limit exceeded. Please retry later.',
    keyGenerator: () => `automation:${keyId}`,
  })(req, res, next);
}

export function auditAutomationMutations(
  req: AutomationRequest,
  res: Response,
  next: NextFunction
) {
  if (!['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method)) {
    return next();
  }

  // Upload route writes a dedicated media audit entry with object metadata.
  if (req.originalUrl.includes('/uploads/')) {
    return next();
  }

  const key = req.automationKey;
  const entityId = typeof req.params.id === 'string' ? req.params.id : null;

  res.on('finish', () => {
    if (res.statusCode < 200 || res.statusCode >= 400 || !key) {
      return;
    }

    void writeAuditLog({
      userId: key.id,
      userEmail: `automation:${key.name}`,
      action: req.method === 'POST' ? 'create' : 'update',
      entity: 'automation_blog',
      entityId,
      metadata: {
        method: req.method,
        path: req.originalUrl,
        request_id: res.locals.requestId,
        scopes: key.scopes,
      },
      ip: getClientIp(req),
    });
  });

  next();
}
