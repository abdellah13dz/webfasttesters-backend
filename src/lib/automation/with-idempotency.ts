import type { Response } from 'express';
import {
  beginIdempotentRequest,
  completeIdempotentRequest,
  hashRequestBody,
  releaseIdempotentReservation,
} from './idempotency.js';
import { fail } from './response.js';
import type { AutomationRequest } from '../../middleware/requireAutomation.js';

/**
 * Shared Idempotency-Key reservation / replay for Automation write routes.
 * Follows existing publish/update conventions.
 */
export async function withIdempotency(
  req: AutomationRequest,
  res: Response,
  run: () => Promise<void>
): Promise<void> {
  const key = req.automationKey!;
  const idempotencyKeyHeader = req.headers['idempotency-key'];
  const idempotencyKey =
    typeof idempotencyKeyHeader === 'string' ? idempotencyKeyHeader.trim().slice(0, 128) : '';
  const requestHash = hashRequestBody({
    method: req.method,
    path: req.path,
    params: req.params,
    body: req.body ?? {},
  });
  let reserved = false;

  try {
    if (idempotencyKey) {
      const begin = await beginIdempotentRequest({
        apiKeyId: key.id,
        key: idempotencyKey,
        requestHash,
      });
      if (begin.kind === 'replay') {
        res.setHeader('Idempotency-Replayed', 'true');
        res.status(begin.record.responseCode).json(JSON.parse(begin.record.responseBody));
        return;
      }
      if (begin.kind === 'conflict') {
        fail(res, 409, begin.message, { field: 'Idempotency-Key' });
        return;
      }
      if (begin.kind === 'in_progress_timeout') {
        fail(res, 409, 'A request with this Idempotency-Key is still in progress', {
          field: 'Idempotency-Key',
          retryable: true,
        });
        return;
      }
      reserved = true;
    }

    const originalJson = res.json.bind(res);
    const captured: { code: number; body: unknown } = { code: 0, body: null };
    let didRespond = false;
    res.json = ((body: unknown) => {
      didRespond = true;
      captured.code = res.statusCode || 200;
      captured.body = body;
      return originalJson(body);
    }) as typeof res.json;

    await run();

    if (!reserved) return;

    if (didRespond && captured.code >= 200 && captured.code < 300) {
      await completeIdempotentRequest({
        apiKeyId: key.id,
        key: idempotencyKey,
        requestHash,
        responseCode: captured.code,
        responseBody: captured.body,
      });
    } else if (didRespond && captured.code === 409) {
      await completeIdempotentRequest({
        apiKeyId: key.id,
        key: idempotencyKey,
        requestHash,
        responseCode: captured.code,
        responseBody: captured.body,
      });
    } else {
      await releaseIdempotentReservation(key.id, idempotencyKey);
    }
  } catch (error) {
    if (reserved && idempotencyKey) {
      await releaseIdempotentReservation(key.id, idempotencyKey);
    }
    throw error;
  }
}
