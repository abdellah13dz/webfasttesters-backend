import { Router } from 'express';
import { db } from '../../lib/db.js';

const router = Router();

router.get('/', async (_req, res) => {
  try {
    const reviews = await db.review.findMany({ orderBy: { createdAt: 'desc' } });
    res.json(reviews);
  } catch (error) {
    console.error('Error fetching reviews:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/', async (req, res) => {
  try {
    const { text, author, role, rating, visible, featured, sortOrder, link, avatarUrl, appLink, appName } = req.body;

    if (!text || !author) {
      return res.status(400).json({ error: 'Text and author are required' });
    }

    if (rating !== undefined && (rating < 1 || rating > 5)) {
      return res.status(400).json({ error: 'Rating must be between 1 and 5' });
    }

    const review = await db.review.create({
      data: {
        text,
        author,
        role: role ?? null,
        rating: rating ?? 5,
        visible: visible ?? true,
        featured: featured ?? false,
        sortOrder: sortOrder ?? 0,
        link: link ?? null,
        avatarUrl: avatarUrl ?? null,
        appLink: appLink ?? null,
        appName: appName ?? null,
      },
    });

    res.status(201).json(review);
  } catch (error) {
    console.error('Error creating review:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const review = await db.review.findUnique({ where: { id: req.params.id } });
    if (!review) return res.status(404).json({ error: 'Review not found' });
    res.json(review);
  } catch (error) {
    console.error('Error fetching review:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const existing = await db.review.findUnique({ where: { id: req.params.id } });
    if (!existing) return res.status(404).json({ error: 'Review not found' });

    const { text, author, role, rating, visible, featured, sortOrder, link, avatarUrl, appLink, appName } = req.body;

    if (rating !== undefined && (rating < 1 || rating > 5)) {
      return res.status(400).json({ error: 'Rating must be between 1 and 5' });
    }

    const review = await db.review.update({
      where: { id: req.params.id },
      data: {
        ...(text !== undefined && { text }),
        ...(author !== undefined && { author }),
        ...(role !== undefined && { role }),
        ...(rating !== undefined && { rating }),
        ...(visible !== undefined && { visible }),
        ...(featured !== undefined && { featured }),
        ...(sortOrder !== undefined && { sortOrder }),
        ...(link !== undefined && { link }),
        ...(avatarUrl !== undefined && { avatarUrl }),
        ...(appLink !== undefined && { appLink }),
        ...(appName !== undefined && { appName }),
      },
    });

    res.json(review);
  } catch (error) {
    console.error('Error updating review:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const existing = await db.review.findUnique({ where: { id: req.params.id } });
    if (!existing) return res.status(404).json({ error: 'Review not found' });
    await db.review.delete({ where: { id: req.params.id } });
    res.json({ message: 'Review deleted successfully' });
  } catch (error) {
    console.error('Error deleting review:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
