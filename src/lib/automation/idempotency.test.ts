import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { hashRequestBody } from './idempotency.js';

describe('hashRequestBody', () => {
  it('is stable regardless of object key order', () => {
    const a = hashRequestBody({ title: 'A', slug: 'a', excerpt: 'e' });
    const b = hashRequestBody({ excerpt: 'e', slug: 'a', title: 'A' });
    assert.equal(a, b);
  });

  it('changes when payload changes', () => {
    const a = hashRequestBody({ title: 'A' });
    const b = hashRequestBody({ title: 'B' });
    assert.notEqual(a, b);
  });
});
