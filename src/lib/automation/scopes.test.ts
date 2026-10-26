import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { hasScope, parseScopes } from './scopes.js';

describe('scopes', () => {
  it('parses valid scopes and rejects unknown ones', () => {
    const scopes = parseScopes('["blog:read","blog:draft:create","media:upload","admin:all"]');
    assert.deepEqual(scopes, ['blog:read', 'blog:draft:create', 'media:upload']);
    assert.equal(hasScope(scopes, 'blog:read'), true);
    assert.equal(hasScope(scopes, 'media:upload'), true);
    assert.equal(hasScope(scopes, 'blog:draft:update'), false);
  });

  it('returns empty array for invalid JSON', () => {
    assert.deepEqual(parseScopes('not-json'), []);
  });
});
