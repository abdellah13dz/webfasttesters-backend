const CONTROL_CHARS = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g;
const SCRIPT_BLOCK = /<script\b[^>]*>[\s\S]*?<\/script>/gi;
const EVENT_HANDLER = /\son\w+\s*=\s*(['"]).*?\1/gi;
const JAVASCRIPT_URL = /\s(href|src)\s*=\s*(['"])\s*javascript:[^'"]*\2/gi;

/** Strip dangerous patterns while allowing intentional article HTML. */
export function sanitizeHtmlContent(input: string): string {
  return input
    .replace(CONTROL_CHARS, '')
    .replace(SCRIPT_BLOCK, '')
    .replace(EVENT_HANDLER, '')
    .replace(JAVASCRIPT_URL, '');
}

export function sanitizePlainText(input: string, maxLength?: number): string {
  let value = input.replace(CONTROL_CHARS, '').trim();
  if (maxLength !== undefined && value.length > maxLength) {
    value = value.slice(0, maxLength);
  }
  return value;
}

export function slugify(input: string): string {
  return input
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 120);
}

export function estimateReadTime(content: string): string {
  const words = content.replace(/<[^>]+>/g, ' ').split(/\s+/).filter(Boolean).length;
  const minutes = Math.max(1, Math.ceil(words / 200));
  return `${minutes} min read`;
}

export function normalizeKeywords(
  primary?: string | null,
  secondary?: string[] | string | null,
  tags?: string[] | string | null
): string | null {
  const parts: string[] = [];

  if (primary) {
    parts.push(sanitizePlainText(primary, 80));
  }

  const secondaryList = toStringList(secondary);
  const tagList = toStringList(tags);

  for (const item of [...secondaryList, ...tagList]) {
    const cleaned = sanitizePlainText(item, 80);
    if (cleaned && !parts.some((p) => p.toLowerCase() === cleaned.toLowerCase())) {
      parts.push(cleaned);
    }
  }

  return parts.length ? parts.join(', ') : null;
}

export function parseKeywordList(seoKeywords: string | null | undefined): {
  primary_keyword: string | null;
  secondary_keywords: string[];
  tags: string[];
} {
  if (!seoKeywords?.trim()) {
    return { primary_keyword: null, secondary_keywords: [], tags: [] };
  }

  const parts = seoKeywords
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean);

  return {
    primary_keyword: parts[0] ?? null,
    secondary_keywords: parts.slice(1),
    tags: parts.slice(1),
  };
}

function toStringList(value: string[] | string | null | undefined): string[] {
  if (!value) return [];
  if (Array.isArray(value)) {
    return value.filter((item): item is string => typeof item === 'string');
  }
  return value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}
