import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { buildPublicArticleUrl, verifyPublishedArticleAccessible } from './public-url.js';

describe('buildPublicArticleUrl', () => {
  it('builds /blog/{slug} under SITE_URL', () => {
    const prev = process.env.SITE_URL;
    process.env.SITE_URL = 'https://fasttesters.com';
    assert.equal(
      buildPublicArticleUrl('google-play-closed-testing'),
      'https://fasttesters.com/blog/google-play-closed-testing'
    );
    process.env.SITE_URL = prev;
  });
});

describe('verifyPublishedArticleAccessible', () => {
  it('reports ok when finder returns published row', async () => {
    const result = await verifyPublishedArticleAccessible(
      async () => ({ id: '1', slug: 'a', status: 'published' }),
      'a'
    );
    assert.equal(result.ok, true);
  });

  it('reports failure when not published', async () => {
    const result = await verifyPublishedArticleAccessible(async () => null, 'missing');
    assert.equal(result.ok, false);
  });
});
