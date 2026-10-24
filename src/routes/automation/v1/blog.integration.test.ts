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
  const createdSlugs = new Set<string>();
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
        rateLimit: 600,
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
    const slugs = [...createdSlugs, slug];
    await db.article.deleteMany({ where: { slug: { in: slugs } } }).catch(() => undefined);
    if (draftId) {
      await db.article.deleteMany({ where: { id: draftId } }).catch(() => undefined);
    }
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

  it('rejects unsafe featured_image URLs', async () => {
    const res = await api('POST', '/api/automation/v1/blog/drafts', {
      body: {
        title: `Bad Image ${stamp}`,
        slug: `bad-image-${stamp}`,
        excerpt: 'x',
        content: '<p>x</p>',
        category: 'TESTING',
        featured_image: 'javascript:alert(1)',
      },
    });
    assert.equal(res.status, 400);
  });

  it('creates an unpublished draft', async () => {
    createdSlugs.add(slug);
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
        featured_image: 'https://assets.fasttesters.com/blog/automation-test.jpg',
      },
    });

    assert.equal(res.status, 201);
    const body = res.json as {
      data: { id: string; status: string; slug: string; featured_image: string | null };
    };
    assert.equal(body.data.status, 'draft');
    assert.equal(body.data.slug, slug);
    assert.equal(body.data.featured_image, 'https://assets.fasttesters.com/blog/automation-test.jpg');
    draftId = body.data.id;
  });

  it('replays idempotent create', async () => {
    // Body must match the original create exactly (request hash is compared).
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
        featured_image: 'https://assets.fasttesters.com/blog/automation-test.jpg',
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
      body: {
        excerpt: 'Updated excerpt from integration test.',
        seo_title: 'Updated SEO title',
      },
    });
    assert.equal(patchRes.status, 200);
    const body = patchRes.json as { data: { excerpt: string; seo_title: string | null; status: string } };
    assert.equal(body.data.excerpt, 'Updated excerpt from integration test.');
    assert.equal(body.data.seo_title, 'Updated SEO title');
    assert.equal(body.data.status, 'draft');

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

  it('Make.com workflow: list → duplicate check → create → get → isolate', async () => {
    const flowSlug = `make-flow-${stamp}`;
    const flowTitle = `Make Flow Draft ${stamp}`;
    createdSlugs.add(flowSlug);

    const listRes = await api('GET', '/api/automation/v1/blog/posts?limit=5&status=draft');
    assert.equal(listRes.status, 200);

    const dupCheck = await api('GET', `/api/automation/v1/blog/posts?slug=${flowSlug}`);
    assert.equal(dupCheck.status, 200);
    assert.equal((dupCheck.json as { data: unknown[] }).data.length, 0);

    const createRes = await api('POST', '/api/automation/v1/blog/drafts', {
      headers: { 'Idempotency-Key': `make-flow-${stamp}` },
      body: {
        title: flowTitle,
        slug: flowSlug,
        excerpt: 'Make.com style workflow draft',
        content: '<p>Workflow content</p>',
        category: 'TESTING',
        seo_title: 'Make flow SEO',
        meta_description: 'Make flow meta',
        primary_keyword: 'make workflow',
      },
    });
    assert.equal(createRes.status, 201);
    const created = (createRes.json as { data: { id: string; status: string } }).data;
    assert.equal(created.status, 'draft');

    const getRes = await api('GET', `/api/automation/v1/blog/posts/${created.id}`);
    assert.equal(getRes.status, 200);
    assert.equal((getRes.json as { data: { status: string } }).data.status, 'draft');

    const publicRes = await api('GET', `/api/articles?slug=${flowSlug}`, { auth: false });
    assert.deepEqual(publicRes.json, []);
  });

  it('creates exactly one article for 10 concurrent identical Idempotency-Keys', async () => {
    const { db } = await import('../../../lib/db.js');
    const concSlug = `conc-idem-${stamp}`;
    const concTitle = `Concurrent Idem ${stamp}`;
    const idemKey = `concurrent-idem-${stamp}`;
    createdSlugs.add(concSlug);

    const body = {
      title: concTitle,
      slug: concSlug,
      excerpt: 'Concurrent idempotency test',
      content: '<p>Concurrent</p>',
      category: 'TESTING',
    };

    let results = await Promise.all(
      Array.from({ length: 10 }, () =>
        api('POST', '/api/automation/v1/blog/drafts', {
          headers: { 'Idempotency-Key': idemKey },
          body,
        })
      )
    );

    // Transient pooler errors: retry failed attempts with the same key (must replay).
    results = await Promise.all(
      results.map(async (r) => {
        if (r.status === 201 || r.status === 409) return r;
        await new Promise((resolve) => setTimeout(resolve, 250));
        return api('POST', '/api/automation/v1/blog/drafts', {
          headers: { 'Idempotency-Key': idemKey },
          body,
        });
      })
    );

    const successes = results.filter((r) => r.status === 201);
    assert.ok(successes.length >= 1, `expected ≥1×201, got ${results.map((r) => r.status)}`);
    assert.equal(
      successes.length + results.filter((r) => r.status === 409).length,
      10,
      `expected only 201/409 after retry, got ${results.map((r) => r.status)}`
    );

    const ids = successes.map((r) => (r.json as { data: { id: string } }).data.id);
    assert.equal(new Set(ids).size, 1, 'all successful responses must share one article id');

    const count = await db.article.count({ where: { slug: concSlug } });
    assert.equal(count, 1, 'exactly one article must exist for the shared Idempotency-Key');
  });

  it('allows only one create when concurrent requests share a slug but use different keys', async () => {
    const { db } = await import('../../../lib/db.js');
    const raceSlug = `conc-slug-${stamp}`;
    createdSlugs.add(raceSlug);

    const results = await Promise.all(
      Array.from({ length: 8 }, (_, i) =>
        api('POST', '/api/automation/v1/blog/drafts', {
          headers: { 'Idempotency-Key': `slug-race-${stamp}-${i}` },
          body: {
            title: `Slug Race ${stamp} ${i}`,
            slug: raceSlug,
            excerpt: 'slug race',
            content: '<p>slug race</p>',
            category: 'TESTING',
          },
        })
      )
    );

    const created = results.filter((r) => r.status === 201);
    assert.equal(created.length, 1, `expected one 201, got ${results.map((r) => r.status)}`);

    const count = await db.article.count({ where: { slug: raceSlug } });
    assert.equal(count, 1, 'exactly one article for contested slug');
  });
});
