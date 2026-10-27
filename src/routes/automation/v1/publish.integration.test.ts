/**
 * Publish / published-update / revision tests.
 * Requires schema migration 20261027120000_article_publish_revisions.
 * Skip unless AUTOMATION_PUBLISH_INTEGRATION=1.
 * Creates disposable articles only; cleans up afterward. Never touches real content.
 *
 * Idempotency-Key on publish/update/rollback is strongly recommended (not HTTP-mandatory).
 * Without it, retries may create duplicate revisions / re-apply mutations.
 */
import 'dotenv/config';
import assert from 'node:assert/strict';
import { after, before, describe, it } from 'node:test';
import type { Server } from 'node:http';
import { applyDatabaseUrlEnv } from '../../../lib/database-url.js';

applyDatabaseUrlEnv();

const enabled = process.env.AUTOMATION_PUBLISH_INTEGRATION === '1';

describe('automation publish workflow', { skip: !enabled }, () => {
  let server: Server;
  let baseUrl = '';
  let token = '';
  let keyId = '';
  const articleIds: string[] = [];
  const stamp = Date.now();
  const slug = `auto-publish-test-${stamp}`;

  before(async () => {
    const { db } = await import('../../../lib/db.js');
    const { generateAutomationToken } = await import('../../../lib/automation/tokens.js');
    const { createApp } = await import('../../../app.js');

    const generated = generateAutomationToken();
    token = generated.token;
    const record = await db.automationApiKey.create({
      data: {
        name: `publish-test-${stamp}`,
        keyPrefix: generated.prefix,
        keyHash: generated.hash,
        scopes: JSON.stringify([
          'blog:read',
          'blog:draft:create',
          'blog:draft:update',
          'blog:publish',
          'blog:update_published',
          'blog:revisions:read',
          'blog:rollback',
        ]),
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
    if (!address || typeof address === 'string') throw new Error('bind failed');
    baseUrl = `http://127.0.0.1:${address.port}`;
  });

  after(async () => {
    const { db } = await import('../../../lib/db.js');
    for (const id of articleIds) {
      await db.articleRevision.deleteMany({ where: { articleId: id } }).catch(() => undefined);
      await db.article.deleteMany({ where: { id } }).catch(() => undefined);
    }
    await db.article.deleteMany({ where: { slug: { startsWith: `auto-publish-test-${stamp}` } } }).catch(
      () => undefined
    );
    await db.article
      .deleteMany({ where: { slug: { startsWith: `auto-publish-legacy-${stamp}` } } })
      .catch(() => undefined);
    await db.article
      .deleteMany({ where: { slug: { startsWith: `auto-publish-conc-${stamp}` } } })
      .catch(() => undefined);
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

  async function api(method: string, path: string, body?: unknown, headers?: Record<string, string>) {
    const response = await fetch(`${baseUrl}${path}`, {
      method,
      headers: {
        Authorization: `Bearer ${token}`,
        ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
        ...(headers ?? {}),
      },
      body: body !== undefined ? JSON.stringify(body) : undefined,
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

  async function createDraft(opts: { title: string; slug: string; content?: string }) {
    const create = await api('POST', '/api/automation/v1/blog/drafts', {
      title: opts.title,
      slug: opts.slug,
      excerpt: 'Disposable publish integration draft',
      content: opts.content ?? '<p>Original publish test content.</p>',
      category: 'TESTING',
      seo_title: 'Publish test',
      meta_description: 'Disposable',
      primary_keyword: 'publish test',
    });
    assert.equal(create.status, 201);
    const id = (create.json as { data: { id: string } }).data.id;
    articleIds.push(id);
    return id;
  }

  it('creates draft, publishes, updates published, lists revisions, rolls back', async () => {
    const articleId = await createDraft({ title: `Publish Test ${stamp}`, slug });

    // Documented: publish without Idempotency-Key is allowed but not retry-safe.
    const publishNoKey = await api('POST', `/api/automation/v1/blog/drafts/${articleId}/publish`, {});
    assert.equal(publishNoKey.status, 200);
    const pubBody = publishNoKey.json as {
      data: {
        status: string;
        public_accessible: boolean;
        article_id: string;
        published_at: string | null;
      };
    };
    assert.equal(pubBody.data.status, 'published');
    assert.equal(pubBody.data.public_accessible, true);
    assert.equal(pubBody.data.article_id, articleId);
    assert.ok(pubBody.data.published_at, 'newly published articles get publishedAt');

    const publishWithKey = await api(
      'POST',
      `/api/automation/v1/blog/drafts/${articleId}/publish`,
      {},
      { 'Idempotency-Key': `publish-${stamp}` }
    );
    assert.equal(publishWithKey.status, 200);
    assert.equal(
      (publishWithKey.json as { data: { already_published?: boolean } }).data.already_published,
      true
    );

    const replay = await api(
      'POST',
      `/api/automation/v1/blog/drafts/${articleId}/publish`,
      {},
      { 'Idempotency-Key': `publish-${stamp}` }
    );
    assert.equal(replay.status, 200);
    assert.equal(replay.headers.get('Idempotency-Replayed'), 'true');

    const publicFeed = await fetch(`${baseUrl}/api/articles?slug=${slug}`);
    const publicJson = (await publicFeed.json()) as unknown[];
    assert.equal(publicJson.length, 1);

    const get = await api('GET', `/api/automation/v1/blog/posts/${articleId}`);
    assert.equal(get.status, 200);
    const article = (
      get.json as {
        data: { status: string; content: string; version: string; published_at: string | null };
      }
    ).data;
    assert.equal(article.status, 'published');
    assert.ok(article.content.includes('Original'));
    assert.ok(article.published_at);

    const update = await api(
      'PATCH',
      `/api/automation/v1/blog/published/${articleId}`,
      {
        content: '<p>Updated published content.</p>',
        expected_updated_at: article.version,
      },
      { 'Idempotency-Key': `update-${stamp}` }
    );
    assert.equal(update.status, 200);
    const updated = (
      update.json as {
        data: {
          status: string;
          article: { content: string };
          published_at: string | null;
          version: string;
        };
      }
    ).data;
    assert.equal(updated.status, 'published');
    assert.ok(updated.article.content.includes('Updated'));
    assert.equal(updated.published_at, article.published_at, 'ordinary update does not reset publishedAt');

    const seoOnly = await api(
      'PATCH',
      `/api/automation/v1/blog/published/${articleId}`,
      {
        seo_title: 'SEO-only title',
        meta_description: 'SEO-only description',
        expected_updated_at: updated.version,
      },
      { 'Idempotency-Key': `seo-${stamp}` }
    );
    assert.equal(seoOnly.status, 200);
    const seoArticle = (
      seoOnly.json as { data: { article: { seo_title: string | null; content: string } } }
    ).data.article;
    assert.equal(seoArticle.seo_title, 'SEO-only title');
    assert.ok(seoArticle.content.includes('Updated'));

    const stale = await api('PATCH', `/api/automation/v1/blog/published/${articleId}`, {
      content: '<p>Stale</p>',
      expected_updated_at: article.version,
    });
    assert.equal(stale.status, 409);

    const revisions = await api('GET', `/api/automation/v1/blog/articles/${articleId}/revisions`);
    assert.equal(revisions.status, 200);
    const revList = (revisions.json as { data: { revisions: { id: string }[] } }).data.revisions;
    assert.ok(revList.length >= 1);
    const targetRev = revList[revList.length - 1];

    const rollback = await api(
      'POST',
      `/api/automation/v1/blog/articles/${articleId}/revisions/${targetRev.id}/rollback`,
      {},
      { 'Idempotency-Key': `rollback-${stamp}` }
    );
    assert.equal(rollback.status, 200);
    const rolled = (
      rollback.json as {
        data: {
          status: string;
          article: { content: string };
          safety_revision_id: string;
        };
      }
    ).data;
    assert.equal(rolled.status, 'published');

    const rollbackReplay = await api(
      'POST',
      `/api/automation/v1/blog/articles/${articleId}/revisions/${targetRev.id}/rollback`,
      {},
      { 'Idempotency-Key': `rollback-${stamp}` }
    );
    assert.equal(rollbackReplay.status, 200);
    assert.equal(rollbackReplay.headers.get('Idempotency-Replayed'), 'true');
    assert.equal(
      (rollbackReplay.json as { data: { safety_revision_id: string } }).data.safety_revision_id,
      rolled.safety_revision_id
    );

    const revsAfterReplay = await api(
      'GET',
      `/api/automation/v1/blog/articles/${articleId}/revisions`
    );
    const revsAfter = (
      revsAfterReplay.json as { data: { revisions: { id: string; reason: string }[] } }
    ).data.revisions;
    const safetyCount = revsAfter.filter((r) => r.reason === 'rollback_safety').length;
    // First rollback created one safety; replay must not create another.
    assert.equal(safetyCount, 1);

    // Same key, different revision id → 409
    if (revList.length >= 2) {
      const other = revList[0].id === targetRev.id ? revList[1] : revList[0];
      const conflictRev = await api(
        'POST',
        `/api/automation/v1/blog/articles/${articleId}/revisions/${other.id}/rollback`,
        {},
        { 'Idempotency-Key': `rollback-${stamp}` }
      );
      assert.equal(conflictRev.status, 409);
    }
  });

  it('rejects same idempotency key with different article id on rollback', async () => {
    const a1 = await createDraft({
      title: `Rollback A ${stamp}`,
      slug: `auto-publish-test-${stamp}-a`,
    });
    const a2 = await createDraft({
      title: `Rollback B ${stamp}`,
      slug: `auto-publish-test-${stamp}-b`,
    });

    for (const id of [a1, a2]) {
      const pub = await api(
        'POST',
        `/api/automation/v1/blog/drafts/${id}/publish`,
        {},
        { 'Idempotency-Key': `pub-rb-${id}` }
      );
      assert.equal(pub.status, 200);
    }

    const revs1 = await api('GET', `/api/automation/v1/blog/articles/${a1}/revisions`);
    const revs2 = await api('GET', `/api/automation/v1/blog/articles/${a2}/revisions`);
    const r1 = (revs1.json as { data: { revisions: { id: string }[] } }).data.revisions[0];
    const r2 = (revs2.json as { data: { revisions: { id: string }[] } }).data.revisions[0];
    assert.ok(r1 && r2);

    const first = await api(
      'POST',
      `/api/automation/v1/blog/articles/${a1}/revisions/${r1.id}/rollback`,
      {},
      { 'Idempotency-Key': `rollback-cross-${stamp}` }
    );
    assert.equal(first.status, 200);

    const second = await api(
      'POST',
      `/api/automation/v1/blog/articles/${a2}/revisions/${r2.id}/rollback`,
      {},
      { 'Idempotency-Key': `rollback-cross-${stamp}` }
    );
    assert.equal(second.status, 409);
  });

  it('releases idempotency reservation after failed rollback so retry can succeed', async () => {
    const articleId = await createDraft({
      title: `Fail Rollback ${stamp}`,
      slug: `auto-publish-test-${stamp}-fail`,
    });
    const pub = await api(
      'POST',
      `/api/automation/v1/blog/drafts/${articleId}/publish`,
      {},
      { 'Idempotency-Key': `pub-fail-${stamp}` }
    );
    assert.equal(pub.status, 200);

    const missing = await api(
      'POST',
      `/api/automation/v1/blog/articles/${articleId}/revisions/does-not-exist/rollback`,
      {},
      { 'Idempotency-Key': `rollback-fail-${stamp}` }
    );
    assert.equal(missing.status, 404);

    const revs = await api('GET', `/api/automation/v1/blog/articles/${articleId}/revisions`);
    const revId = (revs.json as { data: { revisions: { id: string }[] } }).data.revisions[0]?.id;
    assert.ok(revId);

    const retry = await api(
      'POST',
      `/api/automation/v1/blog/articles/${articleId}/revisions/${revId}/rollback`,
      {},
      { 'Idempotency-Key': `rollback-fail-${stamp}` }
    );
    // Different payload (revisionId) vs failed reservation released → either 200 or 409 if
    // 404 was somehow completed. Expected: reservation released on non-2xx/non-409 → 200.
    assert.equal(retry.status, 200);
  });

  it('preserves null publishedAt for legacy published articles on update', async () => {
    const { db } = await import('../../../lib/db.js');
    const legacySlug = `auto-publish-legacy-${stamp}`;
    const legacy = await db.article.create({
      data: {
        slug: legacySlug,
        title: `Legacy Published ${stamp}`,
        description: 'Legacy published without publishedAt',
        content: '<p>Legacy body</p>',
        category: 'TESTING',
        status: 'published',
        readTime: '1 min read',
        publishedAt: null,
      },
    });
    articleIds.push(legacy.id);

    const get = await api('GET', `/api/automation/v1/blog/posts/${legacy.id}`);
    assert.equal(get.status, 200);
    const version = (get.json as { data: { version: string; published_at: string | null } }).data;
    assert.equal(version.published_at, null);

    const update = await api(
      'PATCH',
      `/api/automation/v1/blog/published/${legacy.id}`,
      {
        content: '<p>Legacy updated</p>',
        expected_updated_at: version.version,
      },
      { 'Idempotency-Key': `legacy-upd-${stamp}` }
    );
    assert.equal(update.status, 200);
    const body = update.json as {
      data: { published_at: string | null; article: { content: string } };
    };
    assert.equal(body.data.published_at, null);
    assert.ok(body.data.article.content.includes('Legacy updated'));

    const row = await db.article.findUnique({ where: { id: legacy.id } });
    assert.equal(row?.publishedAt, null);
  });

  it('handles concurrent published updates without duplicate revision numbers or HTTP 500', async () => {
    const articleId = await createDraft({
      title: `Concurrent ${stamp}`,
      slug: `auto-publish-conc-${stamp}`,
    });
    const pub = await api(
      'POST',
      `/api/automation/v1/blog/drafts/${articleId}/publish`,
      {},
      { 'Idempotency-Key': `conc-pub-${stamp}` }
    );
    assert.equal(pub.status, 200);

    const get = await api('GET', `/api/automation/v1/blog/posts/${articleId}`);
    const version = (get.json as { data: { version: string } }).data.version;

    const results = await Promise.all(
      [1, 2, 3, 4].map((n) =>
        api(
          'PATCH',
          `/api/automation/v1/blog/published/${articleId}`,
          {
            content: `<p>Concurrent update ${n}</p>`,
            // Intentionally same expected version — at most one should win;
            // others 409. Unique revision numbers still required for winners path.
            expected_updated_at: version,
          },
          { 'Idempotency-Key': `conc-upd-${stamp}-${n}` }
        )
      )
    );

    for (const r of results) {
      assert.notEqual(r.status, 500, `unexpected 500: ${JSON.stringify(r.json)}`);
      assert.ok(r.status === 200 || r.status === 409, `unexpected status ${r.status}`);
    }
    const successes = results.filter((r) => r.status === 200);
    assert.ok(successes.length >= 1, 'at least one update must succeed');
    assert.ok(successes.length <= 1, 'optimistic lock: at most one success with same version');

    const { db } = await import('../../../lib/db.js');
    const revisions = await db.articleRevision.findMany({
      where: { articleId },
      orderBy: { revisionNumber: 'asc' },
    });
    const numbers = revisions.map((r) => r.revisionNumber);
    assert.deepEqual(numbers, [...new Set(numbers)].sort((a, b) => a - b));
    for (let i = 1; i < numbers.length; i++) {
      assert.ok(numbers[i]! > numbers[i - 1]!);
    }

    const final = await api('GET', `/api/automation/v1/blog/posts/${articleId}`);
    assert.equal(final.status, 200);
    const content = (final.json as { data: { content: string } }).data.content;
    assert.match(content, /Concurrent update \d/);
  });

  it('returns 403 when publish/update/rollback scopes are missing', async () => {
    const { db } = await import('../../../lib/db.js');
    const { generateAutomationToken } = await import('../../../lib/automation/tokens.js');
    const generated = generateAutomationToken();
    const limited = await db.automationApiKey.create({
      data: {
        name: `publish-limited-${stamp}`,
        keyPrefix: generated.prefix,
        keyHash: generated.hash,
        scopes: JSON.stringify(['blog:read', 'blog:draft:create']),
        active: true,
      },
    });

    try {
      const articleId = await createDraft({
        title: `Scope Test ${stamp}`,
        slug: `auto-publish-test-${stamp}-scope`,
      });

      const publish = await fetch(`${baseUrl}/api/automation/v1/blog/drafts/${articleId}/publish`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${generated.token}`,
          'Content-Type': 'application/json',
        },
        body: '{}',
      });
      assert.equal(publish.status, 403);

      // Publish with full token then try update/rollback without scopes
      await api(
        'POST',
        `/api/automation/v1/blog/drafts/${articleId}/publish`,
        {},
        { 'Idempotency-Key': `scope-pub-${stamp}` }
      );

      const update = await fetch(`${baseUrl}/api/automation/v1/blog/published/${articleId}`, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${generated.token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ content: '<p>x</p>' }),
      });
      assert.equal(update.status, 403);

      const revs = await api('GET', `/api/automation/v1/blog/articles/${articleId}/revisions`);
      // limited key lacks revisions:read — use full token
      assert.equal(revs.status, 200);
      const revId = (revs.json as { data: { revisions: { id: string }[] } }).data.revisions[0]?.id;
      assert.ok(revId);

      const rollback = await fetch(
        `${baseUrl}/api/automation/v1/blog/articles/${articleId}/revisions/${revId}/rollback`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${generated.token}`,
            'Content-Type': 'application/json',
          },
          body: '{}',
        }
      );
      assert.equal(rollback.status, 403);
    } finally {
      await db.automationApiKey.deleteMany({ where: { id: limited.id } });
    }
  });

  it('returns 403 when publishing a hidden article', async () => {
    const { db } = await import('../../../lib/db.js');
    const hiddenSlug = `auto-publish-test-${stamp}-hidden`;
    const hidden = await db.article.create({
      data: {
        slug: hiddenSlug,
        title: `Hidden ${stamp}`,
        description: 'Hidden article',
        content: '<p>Hidden</p>',
        category: 'TESTING',
        status: 'hidden',
        readTime: '1 min read',
      },
    });
    articleIds.push(hidden.id);

    const res = await api(
      'POST',
      `/api/automation/v1/blog/drafts/${hidden.id}/publish`,
      {},
      { 'Idempotency-Key': `hidden-${stamp}` }
    );
    assert.equal(res.status, 403);
  });

  it('returns 404 when rolling back a revision belonging to another article', async () => {
    const a1 = await createDraft({
      title: `Other Rev A ${stamp}`,
      slug: `auto-publish-test-${stamp}-ora`,
    });
    const a2 = await createDraft({
      title: `Other Rev B ${stamp}`,
      slug: `auto-publish-test-${stamp}-orb`,
    });
    for (const id of [a1, a2]) {
      assert.equal(
        (
          await api(
            'POST',
            `/api/automation/v1/blog/drafts/${id}/publish`,
            {},
            { 'Idempotency-Key': `ora-pub-${id}` }
          )
        ).status,
        200
      );
    }
    const revs2 = await api('GET', `/api/automation/v1/blog/articles/${a2}/revisions`);
    const foreignRev = (revs2.json as { data: { revisions: { id: string }[] } }).data.revisions[0]
      ?.id;
    assert.ok(foreignRev);

    const res = await api(
      'POST',
      `/api/automation/v1/blog/articles/${a1}/revisions/${foreignRev}/rollback`,
      {},
      { 'Idempotency-Key': `foreign-rev-${stamp}` }
    );
    assert.equal(res.status, 404);
  });

  it('rejects Admin JWT for Automation API operations', async () => {
    const res = await fetch(`${baseUrl}/api/automation/v1/blog/drafts`, {
      method: 'POST',
      headers: {
        Authorization: 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.admin.fake',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        title: 'Admin JWT should fail',
        excerpt: 'x',
        content: '<p>x</p>',
        category: 'TESTING',
      }),
    });
    assert.ok(res.status === 401 || res.status === 403);
  });
});
