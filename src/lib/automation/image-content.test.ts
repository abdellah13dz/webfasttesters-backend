import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  detectImageContentType,
  isSafeSvgContent,
  validateAutomationImageUpload,
} from './image-content.js';

function pngBuffer(): Buffer {
  return Buffer.from([
    0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d, 0x49, 0x48, 0x44,
    0x52,
  ]);
}

function jpegBuffer(): Buffer {
  return Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01]);
}

describe('detectImageContentType', () => {
  it('detects PNG and JPEG magic bytes', () => {
    assert.equal(detectImageContentType(pngBuffer()), 'image/png');
    assert.equal(detectImageContentType(jpegBuffer()), 'image/jpeg');
  });

  it('detects SVG text', () => {
    const svg = Buffer.from('<?xml version="1.0"?><svg xmlns="http://www.w3.org/2000/svg"></svg>');
    assert.equal(detectImageContentType(svg), 'image/svg+xml');
  });

  it('rejects unknown binary', () => {
    assert.equal(detectImageContentType(Buffer.from('MZ executable')), null);
  });
});

describe('validateAutomationImageUpload', () => {
  it('accepts matching PNG', () => {
    const result = validateAutomationImageUpload(pngBuffer(), 'image/png', 'cover.png');
    assert.equal(result.ok, true);
    if (result.ok) assert.equal(result.contentType, 'image/png');
  });

  it('rejects MIME spoofing (exe disguised as png mime)', () => {
    const exe = Buffer.alloc(32, 0);
    exe[0] = 0x4d;
    exe[1] = 0x5a;
    const result = validateAutomationImageUpload(exe, 'image/png', 'cover.png');
    assert.equal(result.ok, false);
  });

  it('rejects claimed jpeg that is actually png bytes', () => {
    const result = validateAutomationImageUpload(pngBuffer(), 'image/jpeg', 'x.jpg');
    assert.equal(result.ok, false);
  });

  it('rejects blocked extensions', () => {
    const result = validateAutomationImageUpload(pngBuffer(), 'image/png', 'evil.php');
    assert.equal(result.ok, false);
  });

  it('rejects SVG with script', () => {
    const dirty = Buffer.from('<svg><script>alert(1)</script></svg>');
    assert.equal(isSafeSvgContent(dirty), false);
    const result = validateAutomationImageUpload(dirty, 'image/svg+xml', 'x.svg');
    assert.equal(result.ok, false);
  });

  it('accepts safe SVG', () => {
    const clean = Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"><rect width="1" height="1"/></svg>');
    const result = validateAutomationImageUpload(clean, 'image/svg+xml', 'ok.svg');
    assert.equal(result.ok, true);
  });
});
