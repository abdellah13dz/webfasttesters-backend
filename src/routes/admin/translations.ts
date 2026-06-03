import { Router } from 'express';
import { db } from '../../lib/db.js';
import { SUPPORTED_LOCALES } from '../../lib/navigation-defaults.js';

const router = Router();

router.get('/', async (req, res) => {
  try {
    const locale = req.query.locale as string | undefined;
    const search = req.query.search as string | undefined;

    const where: { locale?: string; OR?: Array<{ key?: { contains: string; mode: 'insensitive' }; value?: { contains: string; mode: 'insensitive' } }> } = {};
    if (locale && SUPPORTED_LOCALES.includes(locale as (typeof SUPPORTED_LOCALES)[number])) {
      where.locale = locale;
    }
    if (search?.trim()) {
      where.OR = [
        { key: { contains: search.trim(), mode: 'insensitive' } },
        { value: { contains: search.trim(), mode: 'insensitive' } },
      ];
    }

    const items = await db.translation.findMany({
      where,
      orderBy: [{ locale: 'asc' }, { key: 'asc' }],
      take: 500,
    });

    res.json(items);
  } catch (error) {
    console.error('Translations list error:', error);
    res.status(500).json({ error: 'Failed to fetch translations' });
  }
});

router.post('/', async (req, res) => {
  try {
    const { locale, key, value } = req.body;

    if (!locale || !key || value === undefined) {
      return res.status(400).json({ error: 'locale, key, and value are required' });
    }

    if (!SUPPORTED_LOCALES.includes(locale)) {
      return res.status(400).json({ error: 'Unsupported locale' });
    }

    const item = await db.translation.upsert({
      where: { locale_key: { locale, key } },
      create: { locale, key, value: String(value) },
      update: { value: String(value) },
    });

    res.status(201).json(item);
  } catch (error) {
    console.error('Translation create error:', error);
    res.status(500).json({ error: 'Failed to save translation' });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const existing = await db.translation.findUnique({ where: { id: req.params.id } });
    if (!existing) return res.status(404).json({ error: 'Translation not found' });

    const { locale, key, value } = req.body;

    if (locale && locale !== existing.locale && !SUPPORTED_LOCALES.includes(locale)) {
      return res.status(400).json({ error: 'Unsupported locale' });
    }

    const item = await db.translation.update({
      where: { id: req.params.id },
      data: {
        ...(locale !== undefined && { locale }),
        ...(key !== undefined && { key }),
        ...(value !== undefined && { value: String(value) }),
      },
    });

    res.json(item);
  } catch (error) {
    console.error('Translation update error:', error);
    res.status(500).json({ error: 'Failed to update translation' });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const existing = await db.translation.findUnique({ where: { id: req.params.id } });
    if (!existing) return res.status(404).json({ error: 'Translation not found' });

    await db.translation.delete({ where: { id: req.params.id } });
    res.json({ message: 'Translation deleted' });
  } catch (error) {
    console.error('Translation delete error:', error);
    res.status(500).json({ error: 'Failed to delete translation' });
  }
});

export default router;
