import type { Request } from 'express';

const BOT_UA =
  /bot|crawl|spider|slurp|facebookexternalhit|preview|headless|wget|curl|python-requests|scrapy/i;

export function parseDevice(userAgent: string | null | undefined): string | null {
  if (!userAgent) return null;
  if (BOT_UA.test(userAgent)) return 'bot';
  if (/iPad|Tablet|PlayBook|Silk/i.test(userAgent)) return 'tablet';
  if (/Mobile|Android|iPhone|iPod|webOS|BlackBerry|IEMobile|Opera Mini/i.test(userAgent)) {
    return 'mobile';
  }
  return 'desktop';
}

export function parseBrowser(userAgent: string | null | undefined): string | null {
  if (!userAgent) return null;
  if (/Edg\//i.test(userAgent)) return 'Edge';
  if (/OPR\/|Opera/i.test(userAgent)) return 'Opera';
  if (/Chrome\//i.test(userAgent) && !/Edg\//i.test(userAgent)) return 'Chrome';
  if (/Safari\//i.test(userAgent) && !/Chrome\//i.test(userAgent)) return 'Safari';
  if (/Firefox\//i.test(userAgent)) return 'Firefox';
  if (/MSIE|Trident\//i.test(userAgent)) return 'IE';
  return 'Other';
}

export function extractCountry(req: Request): string | null {
  const headers = req.headers;
  const candidates = [
    headers['cf-ipcountry'],
    headers['x-vercel-ip-country'],
    headers['x-country-code'],
    headers['cloudfront-viewer-country'],
  ];

  for (const value of candidates) {
    const code = Array.isArray(value) ? value[0] : value;
    if (!code) continue;
    const normalized = code.trim().toUpperCase();
    if (normalized && normalized !== 'XX' && normalized !== 'T1') {
      return normalized.slice(0, 2);
    }
  }

  return null;
}

export function extractCity(req: Request): string | null {
  const headers = req.headers;
  const candidates = [headers['cf-ipcity'], headers['x-vercel-ip-city'], headers['x-city']];
  for (const value of candidates) {
    const city = Array.isArray(value) ? value[0] : value;
    if (city?.trim()) return decodeURIComponent(city.trim()).slice(0, 100);
  }
  return null;
}

export function extractRegion(req: Request): string | null {
  const headers = req.headers;
  const candidates = [
    headers['cf-region'],
    headers['cf-region-code'],
    headers['x-vercel-ip-country-region'],
    headers['x-region'],
  ];
  for (const value of candidates) {
    const region = Array.isArray(value) ? value[0] : value;
    if (region?.trim()) return region.trim().slice(0, 100);
  }
  return null;
}

export function normalizeReferrer(referrer: string | null | undefined, siteHost?: string): string | null {
  if (!referrer?.trim()) return null;
  try {
    const url = new URL(referrer);
    if (siteHost && url.hostname.replace(/^www\./, '') === siteHost.replace(/^www\./, '')) {
      return 'Direct / Internal';
    }
    return url.hostname.replace(/^www\./, '');
  } catch {
    return referrer.slice(0, 200);
  }
}

export function toDateKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export function startOfDayUtc(dateStr: string): Date {
  return new Date(`${dateStr}T00:00:00.000Z`);
}

export function endOfDayUtc(dateStr: string): Date {
  return new Date(`${dateStr}T23:59:59.999Z`);
}

export function daysBetween(from: Date, to: Date): string[] {
  const keys: string[] = [];
  const cursor = new Date(Date.UTC(from.getUTCFullYear(), from.getUTCMonth(), from.getUTCDate()));
  const end = new Date(Date.UTC(to.getUTCFullYear(), to.getUTCMonth(), to.getUTCDate()));

  while (cursor <= end) {
    keys.push(toDateKey(cursor));
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }
  return keys;
}

export function incrementCount(map: Record<string, number>, key: string | null | undefined) {
  const normalized = (key || 'Unknown').trim() || 'Unknown';
  map[normalized] = (map[normalized] || 0) + 1;
}

export function sortCountMap(map: Record<string, number>, limit = 20) {
  return Object.entries(map)
    .sort(([, a], [, b]) => b - a)
    .slice(0, limit)
    .map(([name, count]) => ({ name, count }));
}

export const COUNTRY_NAMES: Record<string, string> = {
  US: 'United States',
  GB: 'United Kingdom',
  CA: 'Canada',
  AU: 'Australia',
  DE: 'Germany',
  FR: 'France',
  ES: 'Spain',
  IT: 'Italy',
  NL: 'Netherlands',
  BE: 'Belgium',
  CH: 'Switzerland',
  AT: 'Austria',
  SE: 'Sweden',
  NO: 'Norway',
  DK: 'Denmark',
  FI: 'Finland',
  IE: 'Ireland',
  PT: 'Portugal',
  PL: 'Poland',
  CZ: 'Czechia',
  RO: 'Romania',
  HU: 'Hungary',
  GR: 'Greece',
  TR: 'Turkey',
  RU: 'Russia',
  UA: 'Ukraine',
  IN: 'India',
  PK: 'Pakistan',
  BD: 'Bangladesh',
  CN: 'China',
  JP: 'Japan',
  KR: 'South Korea',
  SG: 'Singapore',
  MY: 'Malaysia',
  ID: 'Indonesia',
  TH: 'Thailand',
  VN: 'Vietnam',
  PH: 'Philippines',
  AE: 'United Arab Emirates',
  SA: 'Saudi Arabia',
  EG: 'Egypt',
  MA: 'Morocco',
  DZ: 'Algeria',
  TN: 'Tunisia',
  NG: 'Nigeria',
  ZA: 'South Africa',
  BR: 'Brazil',
  MX: 'Mexico',
  AR: 'Argentina',
  CL: 'Chile',
  CO: 'Colombia',
  PE: 'Peru',
  IL: 'Israel',
  NZ: 'New Zealand',
};
