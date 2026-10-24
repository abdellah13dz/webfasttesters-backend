import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { validateFeaturedImageUrl } from './validate-image-url.js';

describe('validateFeaturedImageUrl', () => {
  it('accepts legitimate HTTPS image URLs', () => {
    const result = validateFeaturedImageUrl(
      'https://assets.fasttesters.com/blog/cover.jpg'
    );
    assert.equal(result.ok, true);
    if (result.ok) {
      assert.equal(result.url, 'https://assets.fasttesters.com/blog/cover.jpg');
    }
  });

  it('rejects non-HTTPS schemes', () => {
    assert.equal(validateFeaturedImageUrl('http://cdn.example.com/a.jpg').ok, false);
    assert.equal(validateFeaturedImageUrl('javascript:alert(1)').ok, false);
    assert.equal(validateFeaturedImageUrl('data:image/png;base64,abc').ok, false);
    assert.equal(validateFeaturedImageUrl('ftp://files.example.com/a.jpg').ok, false);
  });

  it('rejects localhost and private networks', () => {
    assert.equal(validateFeaturedImageUrl('https://localhost/a.jpg').ok, false);
    assert.equal(validateFeaturedImageUrl('https://127.0.0.1/a.jpg').ok, false);
    assert.equal(validateFeaturedImageUrl('https://10.0.0.5/a.jpg').ok, false);
    assert.equal(validateFeaturedImageUrl('https://192.168.1.10/a.jpg').ok, false);
    assert.equal(validateFeaturedImageUrl('https://172.16.0.1/a.jpg').ok, false);
  });
});
