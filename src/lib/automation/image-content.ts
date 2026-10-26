import path from 'node:path';
import { ALLOWED_IMAGE_TYPES } from '../uploads.js';

const BLOCKED_EXTENSIONS = new Set([
  '.exe',
  '.bat',
  '.cmd',
  '.com',
  '.msi',
  '.sh',
  '.php',
  '.js',
  '.mjs',
  '.cjs',
  '.html',
  '.htm',
]);

/** Detect raster/SVG image type from file bytes (not client Content-Type). */
export function detectImageContentType(buffer: Buffer): string | null {
  if (!buffer || buffer.length < 12) return null;

  // JPEG
  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return 'image/jpeg';
  }

  // PNG
  if (
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47 &&
    buffer[4] === 0x0d &&
    buffer[5] === 0x0a &&
    buffer[6] === 0x1a &&
    buffer[7] === 0x0a
  ) {
    return 'image/png';
  }

  // GIF
  const head6 = buffer.subarray(0, 6).toString('ascii');
  if (head6 === 'GIF87a' || head6 === 'GIF89a') {
    return 'image/gif';
  }

  // WebP (RIFF....WEBP)
  if (
    buffer.subarray(0, 4).toString('ascii') === 'RIFF' &&
    buffer.subarray(8, 12).toString('ascii') === 'WEBP'
  ) {
    return 'image/webp';
  }

  // SVG (text): optional BOM / whitespace / XML declaration then <svg
  const textSample = buffer
    .subarray(0, Math.min(buffer.length, 2048))
    .toString('utf8')
    .replace(/^\uFEFF/, '')
    .trimStart();
  if (/^(<\?xml[\s\S]*?>\s*)?<svg[\s>]/i.test(textSample)) {
    return 'image/svg+xml';
  }

  return null;
}

/** Reject SVG payloads that embed scripts or event handlers. */
export function isSafeSvgContent(buffer: Buffer): boolean {
  const content = buffer.toString('utf8');
  if (/<script\b/i.test(content)) return false;
  if (/javascript\s*:/i.test(content)) return false;
  // RegExp ctor: a regex literal cannot end with `=/i` (`/` closes the pattern).
  if (new RegExp(String.raw`\bon[a-z]+\s*=`, 'i').test(content)) return false;
  if (/<foreignObject\b/i.test(content)) return false;
  if (new RegExp(String.raw`xlink:href\s*=\s*["']\s*javascript:`, 'i').test(content)) {
    return false;
  }
  if (new RegExp(String.raw`href\s*=\s*["']\s*javascript:`, 'i').test(content)) {
    return false;
  }
  return true;
}

/**
 * Validate an automation image upload using extension denylist, magic bytes,
 * and SVG active-content checks. Prefer detected MIME over client-reported type.
 */
export function validateAutomationImageUpload(
  buffer: Buffer,
  claimedMime: string,
  originalname: string
): { ok: true; contentType: string } | { ok: false; error: string } {
  const ext = path.extname(originalname).toLowerCase();
  if (BLOCKED_EXTENSIONS.has(ext)) {
    return { ok: false, error: `File type ${ext} is not allowed` };
  }

  if (claimedMime.startsWith('text/html') || claimedMime.includes('javascript')) {
    return { ok: false, error: 'HTML and script files are not allowed' };
  }

  const detected = detectImageContentType(buffer);
  if (!detected) {
    return { ok: false, error: 'File content is not a recognized image' };
  }

  if (!ALLOWED_IMAGE_TYPES.has(detected)) {
    return {
      ok: false,
      error: 'Only JPEG, PNG, WebP, GIF, and SVG images are allowed',
    };
  }

  // Spoofing: client claims a different image type than bytes indicate
  if (claimedMime && ALLOWED_IMAGE_TYPES.has(claimedMime) && claimedMime !== detected) {
    return {
      ok: false,
      error: `MIME type mismatch: claimed ${claimedMime}, detected ${detected}`,
    };
  }

  if (detected === 'image/svg+xml' && !isSafeSvgContent(buffer)) {
    return { ok: false, error: 'SVG contains disallowed active content' };
  }

  return { ok: true, contentType: detected };
}
