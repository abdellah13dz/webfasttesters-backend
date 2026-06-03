import { Router } from 'express';
import { db } from '../../lib/db.js';

const router = Router();

router.get('/', async (_req, res) => {
  try {
    const entries = await db.changelogEntry.findMany({
      orderBy: [{ sortOrder: 'asc' }, { publishedAt: 'desc' }],
    });
    res.json(entries);
  } catch (error) {
    console.error('Changelog list error:', error);
    res.status(500).json({ error: 'Failed to fetch changelog entries' });
  }
});

router.post('/', async (req, res) => {
  try {
    const { version, title, description, tags, icon, publishedAt, sortOrder, published } = req.body;

    if (!version || !title || !description) {
      return res.status(400).json({ error: 'version, title, and description are required' });
    }

    const entry = await db.changelogEntry.create({
      data: {
        version,
        title,
        description,
        tags: tags ? JSON.stringify(tags) : '[]',
        icon: icon ?? 'Sparkles',
        publishedAt: publishedAt ? new Date(publishedAt) : new Date(),
        sortOrder: sortOrder ?? 0,
        published: published ?? true,
      },
    });

    res.status(201).json(entry);
  } catch (error) {
    console.error('Changelog create error:', error);
    res.status(500).json({ error: 'Failed to create changelog entry' });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const existing = await db.changelogEntry.findUnique({ where: { id: req.params.id } });
    if (!existing) return res.status(404).json({ error: 'Changelog entry not found' });

    const { version, title, description, tags, icon, publishedAt, sortOrder, published } = req.body;

    const entry = await db.changelogEntry.update({
      where: { id: req.params.id },
      data: {
        ...(version !== undefined && { version }),
        ...(title !== undefined && { title }),
        ...(description !== undefined && { description }),
        ...(tags !== undefined && { tags: JSON.stringify(tags) }),
        ...(icon !== undefined && { icon }),
        ...(publishedAt !== undefined && { publishedAt: new Date(publishedAt) }),
        ...(sortOrder !== undefined && { sortOrder }),
        ...(published !== undefined && { published }),
      },
    });

    res.json(entry);
  } catch (error) {
    console.error('Changelog update error:', error);
    res.status(500).json({ error: 'Failed to update changelog entry' });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const existing = await db.changelogEntry.findUnique({ where: { id: req.params.id } });
    if (!existing) return res.status(404).json({ error: 'Changelog entry not found' });

    await db.changelogEntry.delete({ where: { id: req.params.id } });
    res.json({ message: 'Changelog entry deleted' });
  } catch (error) {
    console.error('Changelog delete error:', error);
    res.status(500).json({ error: 'Failed to delete changelog entry' });
  }
});

export default router;
