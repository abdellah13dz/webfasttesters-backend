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
  message: '🚀 Limited time: Get 14 professional testers for just $15/app — 99.9% success rate!',
  ctaText: 'Get Started →',
  ctaLink: '/submit-app',
};

export const DEFAULT_HERO_STATS: HeroStatsSetting = {
  heroCount: 2900,
  successRate: 99,
  appsCount: 1500,
  countriesCount: 120,
};

export const DEFAULT_SEO: DefaultSeoSetting = {
  siteUrl: process.env.SITE_URL || 'https://fasttesters.com',
  title: 'Fast Testers - Get 12 Testers for Google Play in 48 Hours',
  description:
    'Fast Testers helps Android developers meet Google Play 12-tester requirement in 48 hours. Real testers, fast production access, and guaranteed approval.',
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
