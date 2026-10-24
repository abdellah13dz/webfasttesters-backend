import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  estimateReadTime,
  normalizeKeywords,
  parseKeywordList,
  sanitizeHtmlContent,
  sanitizePlainText,
  slugify,
} from './sanitize.js';

describe('sanitizeHtmlContent', () => {
  it('strips script tags and event handlers', () => {
    const dirty =
      '<p>Hello</p><script>alert(1)</script><a href="javascript:alert(1)" onclick="x()">x</a>';
    const clean = sanitizeHtmlContent(dirty);
    assert.equal(clean.includes('<script>'), false);
    assert.equal(clean.includes('onclick'), false);
    assert.equal(clean.includes('javascript:'), false);
    assert.equal(clean.includes('<p>Hello</p>'), true);
  });
});

describe('sanitizePlainText', () => {
  it('trims and enforces max length', () => {
    assert.equal(sanitizePlainText('  hi  ', 2), 'hi');
    assert.equal(sanitizePlainText('abcdef', 3), 'abc');
  });
});

describe('slugify', () => {
  it('creates URL-safe slugs', () => {
    assert.equal(slugify('Google Play Closed Testing!'), 'google-play-closed-testing');
  });
});

describe('keywords', () => {
  it('normalizes primary, secondary, and tags without duplicates', () => {
    const value = normalizeKeywords('primary', ['Secondary', 'primary'], ['tag-a']);
    assert.equal(value, 'primary, Secondary, tag-a');
  });

  it('parses seoKeywords into primary/secondary', () => {
    const parsed = parseKeywordList('one, two, three');
    assert.equal(parsed.primary_keyword, 'one');
    assert.deepEqual(parsed.secondary_keywords, ['two', 'three']);
  });
});

describe('estimateReadTime', () => {
  it('returns at least 1 minute', () => {
    assert.equal(estimateReadTime('short'), '1 min read');
  });
});
