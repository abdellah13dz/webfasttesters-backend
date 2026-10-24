/**
 * Validate featured_image / coverImage URLs for automation drafts.
 * The backend stores the URL string only (no remote fetch in this path).
 */
export function validateFeaturedImageUrl(
  raw: string
): { ok: true; url: string } | { ok: false; error: string } {
  const trimmed = raw.trim();
  if (!trimmed) {
    return { ok: false, error: 'featured_image cannot be empty' };
  }

  if (trimmed.length > 500) {
    return { ok: false, error: 'featured_image URL is too long' };
  }

  let parsed: URL;
  try {
    parsed = new URL(trimmed);
  } catch {
    return { ok: false, error: 'featured_image must be a valid absolute URL' };
  }

  if (parsed.protocol !== 'https:') {
    return { ok: false, error: 'featured_image must use HTTPS' };
  }

  const host = parsed.hostname.toLowerCase();

  if (
    host === 'localhost' ||
    host === '127.0.0.1' ||
    host === '::1' ||
    host === '0.0.0.0' ||
    host.endsWith('.localhost') ||
    host.endsWith('.local') ||
    host.endsWith('.internal')
  ) {
    return { ok: false, error: 'featured_image host is not allowed' };
  }

  if (isPrivateOrReservedHost(host)) {
    return { ok: false, error: 'featured_image must not target a private or reserved network' };
  }

  return { ok: true, url: trimmed };
}

function isPrivateOrReservedHost(host: string): boolean {
  // IPv6 unique local / link-local
  if (host.includes(':')) {
    const normalized = host.replace(/^\[|\]$/g, '').toLowerCase();
    if (
      normalized === '::1' ||
      normalized.startsWith('fc') ||
      normalized.startsWith('fd') ||
      normalized.startsWith('fe80:')
    ) {
      return true;
    }
  }

  const ipv4 = host.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (!ipv4) return false;

  const parts = ipv4.slice(1).map((p) => Number(p));
  if (parts.some((n) => Number.isNaN(n) || n < 0 || n > 255)) return true;

  const [a, b] = parts;

  // 0.0.0.0/8, 10/8, 127/8, 169.254/16, 172.16/12, 192.168/16, 100.64/10 (CGNAT)
  if (a === 0 || a === 10 || a === 127) return true;
  if (a === 169 && b === 254) return true;
  if (a === 172 && b >= 16 && b <= 31) return true;
  if (a === 192 && b === 168) return true;
  if (a === 100 && b >= 64 && b <= 127) return true;
  // multicast / reserved
  if (a >= 224) return true;

  return false;
}
