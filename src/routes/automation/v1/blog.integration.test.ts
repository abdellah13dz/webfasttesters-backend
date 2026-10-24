/**
 * Integration tests against the real database.
 * Creates disposable automation credentials and drafts, then cleans them up.
 *
 * Skip unless AUTOMATION_INTEGRATION=1 (avoids accidental prod writes).
 */
import 'dotenv/config';
import assert from 'node:assert/strict';
import { after, before, describe, it } from 'node:test';
import type { Server } from 'node:http';
import { applyDatabaseUrlEnv } from '../../../lib/database-url.js';

applyDatabaseUrlEnv();

const enabled = process.env.AUTOMATION_INTEGRATION === '1';

describe('automation blog API integration', { skip: !enabled }, () => {
  let server: Server;
  let baseUrl = '';
  let token = '';
  let keyId = '';
  let draftId = '';
  const stamp = Date.now();
  const title = `Automation Test Draft ${stamp}`;
  const slug = `automation-test-draft-${stamp}`;

  before(async () => {
    const { db } = await import('../../../lib/db.js');
    const { generateAutomationToken } = await import('../../../lib/automation/tokens.js');
    const { DEFAULT_AUTOMATION_SCOPES } = await import('../../../lib/automation/scopes.js');
    const { createApp } = await import('../../../app.js');

    const generated = generateAutomationToken();
    token = generated.token;

    const record = await db.automationApiKey.create({
      data: {
        name: `test-key-${stamp}`,
        keyPrefix: generated.prefix,
        keyHash: generated.hash,
        scopes: JSON.stringify(DEFAULT_AUTOMATION_SCOPES),
        active: true,
        rateLimit: 120,
      },
    });
    keyId = record.id;

    const app = createApp();
    await new Promise<void>((resolve) => {
      server = app.listen(0, '127.0.0.1', () => resolve());
    });
    const address = server.address();
    if (!address || typeof address === 'string') {
      throw new Error('Failed to bind test server');
    }
    baseUrl = `http://127.0.0.1:${address.port}`;
  });

  after(async () => {
    const { db } = await import('../../../lib/db.js');
    if (draftId) {
      await db.article.deleteMany({ where: { id: draftId } }).catch(() => undefined);
    }
    await db.article.deleteMany({ where: { slug } }).catch(() => undefined);
    if (keyId) {
      await db.automationIdempotencyKey.deleteMany({ where: { apiKeyId: keyId } }).catch(() => undefined);
      await db.automationApiKey.deleteMany({ where: { id: keyId } }).catch(() => undefined);
    }
    await new Promise<void>((resolve, reject) => {
      if (!server) return resolve();
      server.close((err) => (err ? reject(err) : resolve()));
    });
    await db.$disconnect();
  });

  async function api(
    method: string,
    path: string,
    options?: { body?: unknown; headers?: Record<string, string>; auth?: boolean }
  ) {
    const headers: Record<string, string> = {
      ...(options?.headers ?? {}),
    };
    if (options?.auth !== false) {
      headers.Authorization = `Bearer ${token}`;
    }
    if (options?.body !== undefined) {
      headers['Content-Type'] = 'application/json';
    }

    const response = await fetch(`${baseUrl}${path}`, {
      method,
      headers,
      body: options?.body !== undefined ? JSON.stringify(options.body) : undefined,
    });

    const text = await response.text();
    let json: unknown = null;
    try {
      json = text ? JSON.parse(text) : null;
    } catch {
      json = text;
    }
    return { status: response.status, json, headers: response.headers };
  }

  it('rejects missing authentication', async () => {
    const res = await api('GET', '/api/automation/v1/blog/posts', { auth: false });
    assert.equal(res.status, 401);
  });

  it('serves openapi without auth', async () => {
    const res = await api('GET', '/api/automation/v1/openapi.json', { auth: false });
    assert.equal(res.status, 200);
    assert.equal((res.json as { openapi?: string }).openapi, '3.0.3');
  });

  it('validates draft creation payload', async () => {
    const res = await api('POST', '/api/automation/v1/blog/drafts', {
      body: { title: 'Missing fields' },
    });
    assert.equal(res.status, 400);
  });

  it('creates an unpublished draft', async () => {
    const res = await api('POST', '/api/automation/v1/blog/drafts', {
      headers: { 'Idempotency-Key': `idem-${stamp}` },
      body: {
        title,
        slug,
        excerpt: 'Temporary automation test draft — safe to delete.',
        content: '<p>Automation integration test content.</p>',
        category: 'TESTING',
        seo_title: 'Automation test',
        meta_description: 'Temporary draft for API tests',
        primary_keyword: 'automation test',
        secondary_keywords: ['make.com'],
      },
    });

    assert.equal(res.status, 201);
    const body = res.json as { data: { id: string; status: string; slug: string } };
    assert.equal(body.data.status, 'draft');
    assert.equal(body.data.slug, slug);
    draftId = body.data.id;
  });

  it('replays idempotent create', async () => {
    const res = await api('POST', '/api/automation/v1/blog/drafts', {
      headers: { 'Idempotency-Key': `idem-${stamp}` },
      body: {
        title,
        slug,
        excerpt: 'Temporary automation test draft — safe to delete.',
        content: '<p>Automation integration test content.</p>',
        category: 'TESTING',
      },
    });

    assert.equal(res.status, 201);
    assert.equal(res.headers.get('Idempotency-Replayed'), 'true');
    const body = res.json as { data: { id: string } };
    assert.equal(body.data.id, draftId);
  });

  it('rejects duplicate slug on new create', async () => {
    let res = await api('POST', '/api/automation/v1/blog/drafts', {
      body: {
        title: `${title} copy`,
        slug,
        excerpt: 'dup',
        content: '<p>dup</p>',
        category: 'TESTING',
      },
    });
    // Supabase pooler can briefly drop connections; one retry keeps this deterministic.
    if (res.status === 500) {
      await new Promise((r) => setTimeout(r, 1000));
      res = await api('POST', '/api/automation/v1/blog/drafts', {
        body: {
          title: `${title} copy`,
          slug,
          excerpt: 'dup',
          content: '<p>dup</p>',
          category: 'TESTING',
        },
      });
    }
    assert.equal(res.status, 409);
  });

  it('reads the draft and lists categories', async () => {
    const getRes = await api('GET', `/api/automation/v1/blog/posts/${draftId}`);
    assert.equal(getRes.status, 200);
    assert.equal((getRes.json as { data: { status: string } }).data.status, 'draft');

    const catRes = await api('GET', '/api/automation/v1/blog/categories');
    assert.equal(catRes.status, 200);
  });

  it('updates draft but blocks publishing', async () => {
    const patchRes = await api('PATCH', `/api/automation/v1/blog/drafts/${draftId}`, {
      body: { excerpt: 'Updated excerpt from integration test.' },
    });
    assert.equal(patchRes.status, 200);

    const publishRes = await api('PATCH', `/api/automation/v1/blog/drafts/${draftId}`, {
      body: { status: 'published' },
    });
    assert.equal(publishRes.status, 403);
  });

  it('keeps draft off the public articles feed', async () => {
    const res = await api('GET', `/api/articles?slug=${slug}`, { auth: false });
    assert.equal(res.status, 200);
    assert.deepEqual(res.json, []);
  });

  it('enforces scopes for read-only keys', async () => {
    const { db } = await import('../../../lib/db.js');
    const { generateAutomationToken } = await import('../../../lib/automation/tokens.js');
    const generated = generateAutomationToken();
    const readOnly = await db.automationApiKey.create({
      data: {
        name: `test-readonly-${stamp}`,
        keyPrefix: generated.prefix,
        keyHash: generated.hash,
        scopes: JSON.stringify(['blog:read']),
        active: true,
      },
    });

    try {
      const res = await fetch(`${baseUrl}/api/automation/v1/blog/drafts`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${generated.token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: `Should Fail ${stamp}`,
          excerpt: 'x',
          content: '<p>x</p>',
          category: 'TESTING',
        }),
      });
      assert.equal(res.status, 403);
    } finally {
      await db.automationApiKey.delete({ where: { id: readOnly.id } });
    }
  });
});
