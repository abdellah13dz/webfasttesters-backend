import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  generateAutomationToken,
  hashAutomationToken,
  looksLikeAutomationToken,
  tokensEqual,
} from './tokens.js';

describe('automation tokens', () => {
  it('generates ft_auto_ tokens with stable hashes', () => {
    const first = generateAutomationToken();
    assert.equal(looksLikeAutomationToken(first.token), true);
    assert.equal(first.hash, hashAutomationToken(first.token));
    assert.equal(tokensEqual(first.hash, hashAutomationToken(first.token)), true);
    assert.equal(looksLikeAutomationToken('admin-jwt-not-a-key'), false);
  });
});
