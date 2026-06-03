import { Router } from 'express';
import { db } from '../../lib/db.js';
import { sendContactReplyEmail } from '../../lib/mailer.js';

const router = Router();

router.get('/', async (req, res) => {
  try {
    const page = Math.max(1, parseInt(String(req.query.page || '1')));
    const pageSize = Math.max(1, Math.min(100, parseInt(String(req.query.pageSize || '20'))));
    const status = req.query.status ? String(req.query.status) : undefined;

    const where = status ? { status } : {};

    const [data, total] = await Promise.all([
      db.contact.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      db.contact.count({ where }),
    ]);

    res.json({ data, total, page, pageSize });
  } catch (error) {
    console.error('Get contacts error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.delete('/', async (req, res) => {
  try {
    const { ids } = req.body;
    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ error: 'ids array is required' });
    }

    const result = await db.contact.deleteMany({ where: { id: { in: ids } } });
    res.json({ deleted: result.count });
  } catch (error) {
    console.error('Bulk delete contacts error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const contact = await db.contact.findUnique({ where: { id: req.params.id } });
    if (!contact) return res.status(404).json({ error: 'Contact not found' });
    res.json(contact);
  } catch (error) {
    console.error('Get contact error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const existing = await db.contact.findUnique({ where: { id: req.params.id } });
    if (!existing) return res.status(404).json({ error: 'Contact not found' });

    const { status, reply } = req.body;
    const data: Record<string, unknown> = {};
    if (status !== undefined) data.status = status;
    if (reply !== undefined) {
      data.reply = reply;
      data.repliedAt = new Date();
    }

    const contact = await db.contact.update({ where: { id: req.params.id }, data });

    let emailSent = false;
    let emailError: string | undefined;

    if (reply !== undefined && String(reply).trim()) {
      const mailResult = await sendContactReplyEmail({
        email: contact.email,
        name: contact.name,
        subject: contact.subject,
        reply: String(reply).trim(),
      });
      emailSent = mailResult.sent;
      emailError = mailResult.error;
    }

    res.json({ ...contact, emailSent, emailError });
  } catch (error) {
    console.error('Update contact error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const existing = await db.contact.findUnique({ where: { id: req.params.id } });
    if (!existing) return res.status(404).json({ error: 'Contact not found' });
    await db.contact.delete({ where: { id: req.params.id } });
    res.json({ message: 'Contact deleted' });
  } catch (error) {
    console.error('Delete contact error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
