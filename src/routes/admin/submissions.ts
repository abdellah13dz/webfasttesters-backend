import { Router } from 'express';
import { db } from '../../lib/db.js';

const router = Router();

router.get('/', async (req, res) => {
  try {
    const page = Math.max(1, parseInt(String(req.query.page || '1')));
    const pageSize = Math.max(1, Math.min(100, parseInt(String(req.query.pageSize || '20'))));
    const status = req.query.status ? String(req.query.status) : undefined;

    const where = status ? { status } : {};

    const [data, total] = await Promise.all([
      db.appSubmission.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      db.appSubmission.count({ where }),
    ]);

    res.json({ data, total, page, pageSize });
  } catch (error) {
    console.error('Get app submissions error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const submission = await db.appSubmission.findUnique({ where: { id: req.params.id } });
    if (!submission) return res.status(404).json({ error: 'Submission not found' });
    res.json(submission);
  } catch (error) {
    console.error('Get app submission error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const existing = await db.appSubmission.findUnique({ where: { id: req.params.id } });
    if (!existing) return res.status(404).json({ error: 'Submission not found' });

    const { status, notes } = req.body;
    const data: Record<string, unknown> = {};
    if (status !== undefined) data.status = status;
    if (notes !== undefined) data.notes = notes;

    const submission = await db.appSubmission.update({ where: { id: req.params.id }, data });
    res.json(submission);
  } catch (error) {
    console.error('Update app submission error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const existing = await db.appSubmission.findUnique({ where: { id: req.params.id } });
    if (!existing) return res.status(404).json({ error: 'Submission not found' });
    await db.appSubmission.delete({ where: { id: req.params.id } });
    res.json({ message: 'Submission deleted' });
  } catch (error) {
    console.error('Delete app submission error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.delete('/', async (req, res) => {
  try {
    const { ids } = req.body;
    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ error: 'ids array is required' });
    }

    const result = await db.appSubmission.deleteMany({ where: { id: { in: ids } } });
    res.json({ deleted: result.count });
  } catch (error) {
    console.error('Bulk delete app submissions error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
