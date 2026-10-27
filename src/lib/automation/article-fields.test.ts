import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { validateArticleFields, validatePublishReady } from './article-fields.js';

describe('validateArticleFields', () => {
  it('requires create fields', () => {
    const result = validateArticleFields({ title: 'Only title' }, 'create');
    assert.equal(result.error, 'excerpt is required');
  });

  it('supports partial update and content_html alias', () => {
    const result = validateArticleFields(
      { content_html: '<p>Hello</p>', excerpt: 'Ex' },
      'update'
    );
    assert.equal(result.error, undefined);
    assert.equal(result.data?.content, '<p>Hello</p>');
    assert.equal(result.data?.description, 'Ex');
  });
});

describe('validatePublishReady', () => {
  it('passes complete article', () => {
    assert.equal(
      validatePublishReady({
        title: 'T',
        slug: 't',
        description: 'd',
        content: '<p>c</p>',
        category: 'TEST',
      }),
      null
    );
  });
});
