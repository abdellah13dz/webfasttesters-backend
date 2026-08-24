export const SITE_SETTING_KEYS = {
  ANNOUNCEMENT_BANNER: 'announcement_banner',
  HERO_STATS: 'hero_stats',
  DEFAULT_SEO: 'default_seo',
  PAGE_SEO_OVERRIDES: 'page_seo_overrides',
  SITE_NAVIGATION: 'site_navigation',
} as const;

export interface AnnouncementBannerSetting {
  enabled: boolean;
  message: string;
  ctaText: string;
  ctaLink: string;
}

export interface HeroStatsSetting {
  heroCount: number;
  successRate: number;
  appsCount: number;
  countriesCount: number;
}

export interface DefaultSeoSetting {
  siteUrl: string;
  title: string;
  description: string;
  keywords: string;
  ogImage: string;
}

export const DEFAULT_ANNOUNCEMENT_BANNER: AnnouncementBannerSetting = {
  enabled: true,
  message:
    '🚀 Google Play closed testing — 15 testers for 16 days for $15/app. Covers Google’s 12 testers / 14 days requirement.',
  ctaText: 'Get Started →',
  ctaLink: 'https://app.fasttesters.com/',
};

export const DEFAULT_HERO_STATS: HeroStatsSetting = {
  heroCount: 15,
  successRate: 15,
  appsCount: 16,
  countriesCount: 15,
};

export const DEFAULT_SEO: DefaultSeoSetting = {
  siteUrl: process.env.SITE_URL || 'https://fasttesters.com',
  title: 'Fast Testers | Google Play Closed Testing — 15 Testers for 16 Days',
  description:
    'Google requires 12 testers for 14 consecutive days. Fast Testers provides 15 real testers for 16 days for $15 one-time so you can complete closed testing and apply for production access. Google decides approval.',
  keywords:
    'android app testing, google play testers, 12 testers policy, app testing service, beta testing, production access',
  ogImage: '/images/hero/hero-bg.png',
};

export async function getSiteSetting<T>(db: { siteSetting: { findUnique: (args: { where: { key: string } }) => Promise<{ value: string } | null> } }, key: string, fallback: T): Promise<T> {
  const row = await db.siteSetting.findUnique({ where: { key } });
  if (!row) return fallback;
  try {
    return JSON.parse(row.value) as T;
  } catch {
    return fallback;
  }
}

export async function upsertSiteSetting(
  db: { siteSetting: { upsert: (args: { where: { key: string }; create: { key: string; value: string }; update: { value: string } }) => Promise<unknown> } },
  key: string,
  value: unknown
) {
  const serialized = JSON.stringify(value);
  await db.siteSetting.upsert({
    where: { key },
    create: { key, value: serialized },
    update: { value: serialized },
  });
}
