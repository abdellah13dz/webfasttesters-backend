import { createHash } from 'node:crypto';
import { db } from '../db.js';

const IDEMPOTENCY_TTL_MS = 24 * 60 * 60 * 1000;

export function hashRequestBody(body: unknown): string {
  return createHash('sha256').update(JSON.stringify(body ?? {})).digest('hex');
}

export async function findIdempotentResponse(apiKeyId: string, key: string) {
  const existing = await db.automationIdempotencyKey.findUnique({
    where: {
      apiKeyId_key: { apiKeyId, key },
    },
  });

  if (!existing) return null;

  if (existing.expiresAt.getTime() < Date.now()) {
    await db.automationIdempotencyKey.delete({ where: { id: existing.id } }).catch(() => undefined);
    return null;
  }

  return existing;
}

export async function storeIdempotentResponse(input: {
  apiKeyId: string;
  key: string;
  requestHash: string;
  responseCode: number;
  responseBody: unknown;
}) {
  const expiresAt = new Date(Date.now() + IDEMPOTENCY_TTL_MS);

  await db.automationIdempotencyKey.upsert({
    where: {
      apiKeyId_key: { apiKeyId: input.apiKeyId, key: input.key },
    },
    create: {
      apiKeyId: input.apiKeyId,
      key: input.key,
      requestHash: input.requestHash,
      responseCode: input.responseCode,
      responseBody: JSON.stringify(input.responseBody),
      expiresAt,
    },
    update: {
      requestHash: input.requestHash,
      responseCode: input.responseCode,
      responseBody: JSON.stringify(input.responseBody),
      expiresAt,
    },
  });
}
