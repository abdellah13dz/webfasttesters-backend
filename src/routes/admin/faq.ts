import { Router } from 'express';
import { db } from '../../lib/db.js';

const router = Router();

router.get('/', async (_req, res) => {
  try {
    const items = await db.faqItem.findMany({ orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }] });
    res.json(items);
  } catch (error) {
    console.error('FAQ list error:', error);
    res.status(500).json({ error: 'Failed to fetch FAQ items' });
  }
});

router.post('/', async (req, res) => {
  try {
    const { category, question, answer, icon, sortOrder, published } = req.body;

    if (!question || !answer) {
      return res.status(400).json({ error: 'question and answer are required' });
    }

    const item = await db.faqItem.create({
      data: {
        category: category ?? 'General',
        question,
        answer,
        icon: icon ?? null,
        sortOrder: sortOrder ?? 0,
        published: published ?? true,
      },
    });

    res.status(201).json(item);
  } catch (error) {
    console.error('FAQ create error:', error);
    res.status(500).json({ error: 'Failed to create FAQ item' });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const existing = await db.faqItem.findUnique({ where: { id: req.params.id } });
    if (!existing) return res.status(404).json({ error: 'FAQ item not found' });

    const { category, question, answer, icon, sortOrder, published } = req.body;

    const item = await db.faqItem.update({
      where: { id: req.params.id },
      data: {
        ...(category !== undefined && { category }),
        ...(question !== undefined && { question }),
        ...(answer !== undefined && { answer }),
        ...(icon !== undefined && { icon }),
        ...(sortOrder !== undefined && { sortOrder }),
        ...(published !== undefined && { published }),
      },
    });

    res.json(item);
  } catch (error) {
    console.error('FAQ update error:', error);
    res.status(500).json({ error: 'Failed to update FAQ item' });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const existing = await db.faqItem.findUnique({ where: { id: req.params.id } });
    if (!existing) return res.status(404).json({ error: 'FAQ item not found' });

    await db.faqItem.delete({ where: { id: req.params.id } });
    res.json({ message: 'FAQ item deleted' });
  } catch (error) {
    console.error('FAQ delete error:', error);
    res.status(500).json({ error: 'Failed to delete FAQ item' });
  }
});

export default router;
