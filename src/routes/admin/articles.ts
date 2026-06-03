import { Router } from 'express';
import { db } from '../../lib/db.js';

const router = Router();

router.get('/', async (req, res) => {
  try {
    const status = req.query.status as string | undefined;
    const articles = await db.article.findMany({
      where: status ? { status } : undefined,
      orderBy: { createdAt: 'desc' },
    });
    res.json(articles);
  } catch (error) {
    console.error('Articles list error:', error);
    res.status(500).json({ error: 'Failed to fetch articles' });
  }
});

router.post('/', async (req, res) => {
  try {
    const { slug, title, description, content, coverImage, category, status, readTime, featured, seoTitle, seoDescription, seoKeywords } = req.body;

    if (!slug || !title || !description || !content || !category) {
      return res.status(400).json({ error: 'slug, title, description, content, and category are required' });
    }

    const existing = await db.article.findUnique({ where: { slug } });
    if (existing) {
      return res.status(409).json({ error: 'An article with this slug already exists' });
    }

    const article = await db.article.create({
      data: {
        slug,
        title,
        description,
        content,
        coverImage: coverImage ?? null,
        category,
        status: status ?? 'draft',
        readTime: readTime ?? '5 min read',
        featured: featured ?? false,
        seoTitle: seoTitle ?? null,
        seoDescription: seoDescription ?? null,
        seoKeywords: seoKeywords ?? null,
      },
    });

    res.status(201).json(article);
  } catch (error) {
    console.error('Article create error:', error);
    res.status(500).json({ error: 'Failed to create article' });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const article = await db.article.findUnique({ where: { id: req.params.id } });
    if (!article) return res.status(404).json({ error: 'Article not found' });
    res.json(article);
  } catch (error) {
    console.error('Article get error:', error);
    res.status(500).json({ error: 'Failed to fetch article' });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const existing = await db.article.findUnique({ where: { id: req.params.id } });
    if (!existing) return res.status(404).json({ error: 'Article not found' });

    const { slug, title, description, content, coverImage, category, status, readTime, featured, seoTitle, seoDescription, seoKeywords } = req.body;

    if (slug && slug !== existing.slug) {
      const duplicate = await db.article.findUnique({ where: { slug } });
      if (duplicate) return res.status(409).json({ error: 'An article with this slug already exists' });
    }

    const article = await db.article.update({
      where: { id: req.params.id },
      data: {
        ...(slug !== undefined && { slug }),
        ...(title !== undefined && { title }),
        ...(description !== undefined && { description }),
        ...(content !== undefined && { content }),
        ...(coverImage !== undefined && { coverImage }),
        ...(category !== undefined && { category }),
        ...(status !== undefined && { status }),
        ...(readTime !== undefined && { readTime }),
        ...(featured !== undefined && { featured }),
        ...(seoTitle !== undefined && { seoTitle }),
        ...(seoDescription !== undefined && { seoDescription }),
        ...(seoKeywords !== undefined && { seoKeywords }),
      },
    });

    res.json(article);
  } catch (error) {
    console.error('Article update error:', error);
    res.status(500).json({ error: 'Failed to update article' });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const existing = await db.article.findUnique({ where: { id: req.params.id } });
    if (!existing) return res.status(404).json({ error: 'Article not found' });
    await db.article.delete({ where: { id: req.params.id } });
    res.json({ message: 'Article deleted successfully' });
  } catch (error) {
    console.error('Article delete error:', error);
    res.status(500).json({ error: 'Failed to delete article' });
  }
});

export default router;
