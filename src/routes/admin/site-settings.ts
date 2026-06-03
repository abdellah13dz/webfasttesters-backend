import { Router } from 'express';
import { db } from '../../lib/db.js';
import {
  SITE_SETTING_KEYS,
  DEFAULT_ANNOUNCEMENT_BANNER,
  DEFAULT_HERO_STATS,
  DEFAULT_SEO,
  getSiteSetting,
  upsertSiteSetting,
} from '../../lib/site-settings-keys.js';
import { DEFAULT_SITE_NAVIGATION } from '../../lib/navigation-defaults.js';

const router = Router();

router.get('/', async (_req, res) => {
  try {
    const [announcementBanner, heroStats, defaultSeo, pageSeoOverrides, navigation] = await Promise.all([
      getSiteSetting(db, SITE_SETTING_KEYS.ANNOUNCEMENT_BANNER, DEFAULT_ANNOUNCEMENT_BANNER),
      getSiteSetting(db, SITE_SETTING_KEYS.HERO_STATS, DEFAULT_HERO_STATS),
      getSiteSetting(db, SITE_SETTING_KEYS.DEFAULT_SEO, DEFAULT_SEO),
      getSiteSetting<Record<string, unknown>>(db, SITE_SETTING_KEYS.PAGE_SEO_OVERRIDES, {}),
      getSiteSetting(db, SITE_SETTING_KEYS.SITE_NAVIGATION, DEFAULT_SITE_NAVIGATION),
    ]);

    res.json({
      announcementBanner,
      heroStats,
      defaultSeo,
      pageSeoOverrides,
      navigation,
    });
  } catch (error) {
    console.error('Site settings get error:', error);
    res.status(500).json({ error: 'Failed to fetch site settings' });
  }
});

router.put('/', async (req, res) => {
  try {
    const { announcementBanner, heroStats, defaultSeo, pageSeoOverrides, navigation } = req.body;

    if (announcementBanner !== undefined) {
      await upsertSiteSetting(db, SITE_SETTING_KEYS.ANNOUNCEMENT_BANNER, announcementBanner);
    }
    if (heroStats !== undefined) {
      await upsertSiteSetting(db, SITE_SETTING_KEYS.HERO_STATS, heroStats);
    }
    if (defaultSeo !== undefined) {
      await upsertSiteSetting(db, SITE_SETTING_KEYS.DEFAULT_SEO, defaultSeo);
    }
    if (pageSeoOverrides !== undefined) {
      await upsertSiteSetting(db, SITE_SETTING_KEYS.PAGE_SEO_OVERRIDES, pageSeoOverrides);
    }
    if (navigation !== undefined) {
      await upsertSiteSetting(db, SITE_SETTING_KEYS.SITE_NAVIGATION, navigation);
    }

    const [banner, stats, seo, overrides, nav] = await Promise.all([
      getSiteSetting(db, SITE_SETTING_KEYS.ANNOUNCEMENT_BANNER, DEFAULT_ANNOUNCEMENT_BANNER),
      getSiteSetting(db, SITE_SETTING_KEYS.HERO_STATS, DEFAULT_HERO_STATS),
      getSiteSetting(db, SITE_SETTING_KEYS.DEFAULT_SEO, DEFAULT_SEO),
      getSiteSetting<Record<string, unknown>>(db, SITE_SETTING_KEYS.PAGE_SEO_OVERRIDES, {}),
      getSiteSetting(db, SITE_SETTING_KEYS.SITE_NAVIGATION, DEFAULT_SITE_NAVIGATION),
    ]);

    res.json({
      announcementBanner: banner,
      heroStats: stats,
      defaultSeo: seo,
      pageSeoOverrides: overrides,
      navigation: nav,
    });
  } catch (error) {
    console.error('Site settings update error:', error);
    res.status(500).json({ error: 'Failed to update site settings' });
  }
});

export default router;
