import { Router } from 'express';
import { db } from '../../lib/db.js';

const router = Router();

router.get('/', async (_req, res) => {
  try {
    const pages = await db.page.findMany({ orderBy: { slug: 'asc' } });
    res.json(pages);
  } catch (error) {
    console.error('Pages list error:', error);
    res.status(500).json({ error: 'Failed to fetch pages' });
  }
});

router.post('/', async (req, res) => {
  try {
    const { slug, title, content, pageType, status, seoTitle, seoDescription, seoKeywords, ogImage } = req.body;

    if (!slug || !title) {
      return res.status(400).json({ error: 'slug and title are required' });
    }

    const existing = await db.page.findUnique({ where: { slug } });
    if (existing) {
      return res.status(409).json({ error: 'A page with this slug already exists' });
    }

    const page = await db.page.create({
      data: {
        slug,
        title,
        content: content ?? '',
        pageType: pageType ?? 'content',
        status: status ?? 'published',
        seoTitle: seoTitle ?? null,
        seoDescription: seoDescription ?? null,
        seoKeywords: seoKeywords ?? null,
        ogImage: ogImage ?? null,
      },
    });

    res.status(201).json(page);
  } catch (error) {
    console.error('Page create error:', error);
    res.status(500).json({ error: 'Failed to create page' });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const page = await db.page.findUnique({ where: { id: req.params.id } });
    if (!page) return res.status(404).json({ error: 'Page not found' });
    res.json(page);
  } catch (error) {
    console.error('Page get error:', error);
    res.status(500).json({ error: 'Failed to fetch page' });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const existing = await db.page.findUnique({ where: { id: req.params.id } });
    if (!existing) return res.status(404).json({ error: 'Page not found' });

    const { slug, title, content, pageType, status, seoTitle, seoDescription, seoKeywords, ogImage } = req.body;

    if (slug && slug !== existing.slug) {
      const duplicate = await db.page.findUnique({ where: { slug } });
      if (duplicate) return res.status(409).json({ error: 'A page with this slug already exists' });
    }

    const page = await db.page.update({
      where: { id: req.params.id },
      data: {
        ...(slug !== undefined && { slug }),
        ...(title !== undefined && { title }),
        ...(content !== undefined && { content }),
        ...(pageType !== undefined && { pageType }),
        ...(status !== undefined && { status }),
        ...(seoTitle !== undefined && { seoTitle }),
        ...(seoDescription !== undefined && { seoDescription }),
        ...(seoKeywords !== undefined && { seoKeywords }),
        ...(ogImage !== undefined && { ogImage }),
      },
    });

    res.json(page);
  } catch (error) {
    console.error('Page update error:', error);
    res.status(500).json({ error: 'Failed to update page' });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const existing = await db.page.findUnique({ where: { id: req.params.id } });
    if (!existing) return res.status(404).json({ error: 'Page not found' });

    await db.page.delete({ where: { id: req.params.id } });
    res.json({ message: 'Page deleted' });
  } catch (error) {
    console.error('Page delete error:', error);
    res.status(500).json({ error: 'Failed to delete page' });
  }
});

export default router;
