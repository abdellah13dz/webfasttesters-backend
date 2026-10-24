import { createHash } from 'node:crypto';
import { Prisma } from '@prisma/client';
import { db } from '../db.js';

const IDEMPOTENCY_TTL_MS = 24 * 60 * 60 * 1000;
/** Pending reservations older than this may be reclaimed by a new request. */
const RESERVATION_TIMEOUT_MS = 60_000;
const POLL_INTERVAL_MS = 100;
const POLL_MAX_MS = 15_000;

/** Marker while a create is in flight (not a final HTTP status). */
export const IDEMPOTENCY_PENDING_CODE = 0;

export type IdempotencyRecord = {
  id: string;
  apiKeyId: string;
  key: string;
  requestHash: string | null;
  responseCode: number;
  responseBody: string;
  createdAt: Date;
  expiresAt: Date;
};

export function hashRequestBody(body: unknown): string {
  return createHash('sha256').update(stableStringify(body ?? {})).digest('hex');
}

function stableStringify(value: unknown): string {
  if (value === null || typeof value !== 'object') {
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) {
    return `[${value.map((item) => stableStringify(item)).join(',')}]`;
  }
  const obj = value as Record<string, unknown>;
  const keys = Object.keys(obj).sort();
  return `{${keys.map((k) => `${JSON.stringify(k)}:${stableStringify(obj[k])}`).join(',')}}`;
}

function isPending(record: IdempotencyRecord): boolean {
  return record.responseCode === IDEMPOTENCY_PENDING_CODE;
}

function isExpired(record: IdempotencyRecord): boolean {
  return record.expiresAt.getTime() < Date.now();
}

function isStaleReservation(record: IdempotencyRecord): boolean {
  return isPending(record) && Date.now() - record.createdAt.getTime() > RESERVATION_TIMEOUT_MS;
}

async function sleep(ms: number) {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

export async function getIdempotencyRecord(
  apiKeyId: string,
  key: string
): Promise<IdempotencyRecord | null> {
  const existing = await db.automationIdempotencyKey.findUnique({
    where: { apiKeyId_key: { apiKeyId, key } },
  });
  if (!existing) return null;

  if (isExpired(existing) || isStaleReservation(existing)) {
    await db.automationIdempotencyKey
      .delete({ where: { id: existing.id } })
      .catch(() => undefined);
    return null;
  }

  return existing;
}

/**
 * Atomically reserve an idempotency key, or return an already-completed response.
 * Concurrent callers either win the reservation or wait/poll for the winner's result.
 */
export async function beginIdempotentRequest(input: {
  apiKeyId: string;
  key: string;
  requestHash: string;
}): Promise<
  | { kind: 'reserved' }
  | { kind: 'replay'; record: IdempotencyRecord }
  | { kind: 'conflict'; message: string }
  | { kind: 'in_progress_timeout' }
> {
  const expiresAt = new Date(Date.now() + IDEMPOTENCY_TTL_MS);

  for (let attempt = 0; attempt < 3; attempt++) {
    const existing = await getIdempotencyRecord(input.apiKeyId, input.key);

    if (existing && !isPending(existing)) {
      if (existing.requestHash && existing.requestHash !== input.requestHash) {
        return {
          kind: 'conflict',
          message: 'Idempotency-Key was reused with a different request body',
        };
      }
      return { kind: 'replay', record: existing };
    }

    if (existing && isPending(existing)) {
      const waited = await waitForCompletion(input.apiKeyId, input.key, input.requestHash);
      return waited;
    }

    try {
      await db.automationIdempotencyKey.create({
        data: {
          apiKeyId: input.apiKeyId,
          key: input.key,
          requestHash: input.requestHash,
          responseCode: IDEMPOTENCY_PENDING_CODE,
          responseBody: JSON.stringify({ status: 'pending' }),
          expiresAt,
        },
      });
      return { kind: 'reserved' };
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        // Another request won the insert — wait for its completion.
        const waited = await waitForCompletion(input.apiKeyId, input.key, input.requestHash);
        if (waited.kind !== 'in_progress_timeout') {
          return waited;
        }
        continue;
      }
      throw error;
    }
  }

  return { kind: 'in_progress_timeout' };
}

async function waitForCompletion(
  apiKeyId: string,
  key: string,
  requestHash: string
): Promise<
  | { kind: 'replay'; record: IdempotencyRecord }
  | { kind: 'conflict'; message: string }
  | { kind: 'in_progress_timeout' }
  | { kind: 'reserved' }
> {
  const deadline = Date.now() + POLL_MAX_MS;

  while (Date.now() < deadline) {
    await sleep(POLL_INTERVAL_MS);
    const record = await getIdempotencyRecord(apiKeyId, key);

    if (!record) {
      // Winner abandoned — try to reserve again.
      try {
        await db.automationIdempotencyKey.create({
          data: {
            apiKeyId,
            key,
            requestHash,
            responseCode: IDEMPOTENCY_PENDING_CODE,
            responseBody: JSON.stringify({ status: 'pending' }),
            expiresAt: new Date(Date.now() + IDEMPOTENCY_TTL_MS),
          },
        });
        return { kind: 'reserved' };
      } catch (error) {
        if (
          error instanceof Prisma.PrismaClientKnownRequestError &&
          error.code === 'P2002'
        ) {
          continue;
        }
        throw error;
      }
    }

    if (!isPending(record)) {
      if (record.requestHash && record.requestHash !== requestHash) {
        return {
          kind: 'conflict',
          message: 'Idempotency-Key was reused with a different request body',
        };
      }
      return { kind: 'replay', record };
    }
  }

  return { kind: 'in_progress_timeout' };
}

export async function completeIdempotentRequest(input: {
  apiKeyId: string;
  key: string;
  requestHash: string;
  responseCode: number;
  responseBody: unknown;
}) {
  const expiresAt = new Date(Date.now() + IDEMPOTENCY_TTL_MS);

  await db.automationIdempotencyKey.update({
    where: {
      apiKeyId_key: { apiKeyId: input.apiKeyId, key: input.key },
    },
    data: {
      requestHash: input.requestHash,
      responseCode: input.responseCode,
      responseBody: JSON.stringify(input.responseBody),
      expiresAt,
    },
  });
}

/** Release a failed/abandoned reservation so a retry can proceed. */
export async function releaseIdempotentReservation(apiKeyId: string, key: string) {
  await db.automationIdempotencyKey
    .deleteMany({
      where: {
        apiKeyId,
        key,
        responseCode: IDEMPOTENCY_PENDING_CODE,
      },
    })
    .catch(() => undefined);
}

/** @deprecated use getIdempotencyRecord / beginIdempotentRequest */
export async function findIdempotentResponse(apiKeyId: string, key: string) {
  const record = await getIdempotencyRecord(apiKeyId, key);
  if (!record || isPending(record)) return null;
  return record;
}

/** @deprecated use completeIdempotentRequest */
export async function storeIdempotentResponse(input: {
  apiKeyId: string;
  key: string;
  requestHash: string;
  responseCode: number;
  responseBody: unknown;
}) {
  await completeIdempotentRequest(input);
}
