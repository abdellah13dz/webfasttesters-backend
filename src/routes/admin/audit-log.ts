import { Router } from 'express';
import { db } from '../../lib/db.js';

const router = Router();

router.get('/', async (req, res) => {
  try {
    const page = Math.max(1, parseInt(String(req.query.page || '1'), 10));
    const pageSize = Math.min(100, Math.max(1, parseInt(String(req.query.pageSize || '50'), 10)));
    const entity = req.query.entity as string | undefined;
    const action = req.query.action as string | undefined;

    const where: { entity?: string; action?: string } = {};
    if (entity) where.entity = entity;
    if (action) where.action = action;

    const [data, total] = await Promise.all([
      db.adminAuditLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      db.adminAuditLog.count({ where }),
    ]);

    res.json({ data, total, page, pageSize });
  } catch (error) {
    console.error('Audit log list error:', error);
    res.status(500).json({ error: 'Failed to fetch audit log' });
  }
});

export default router;
