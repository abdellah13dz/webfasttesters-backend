import { Router } from 'express';
import { db } from '../../lib/db.js';
import { sendNewsletterCampaign } from '../../lib/mailer.js';

const router = Router();

router.get('/', async (req, res) => {
  try {
    const page = Math.max(1, parseInt(String(req.query.page || '1'), 10));
    const pageSize = Math.max(1, parseInt(String(req.query.pageSize || '20'), 10));
    const search = String(req.query.search || '');

    const skip = (page - 1) * pageSize;
    const where = search ? { email: { contains: search } } : {};

    const [data, total] = await Promise.all([
      db.newsletter.findMany({ where, skip, take: pageSize, orderBy: { createdAt: 'desc' } }),
      db.newsletter.count({ where }),
    ]);

    res.json({ data, total, page, pageSize });
  } catch (error) {
    console.error('List newsletters error:', error);
    res.status(500).json({ error: 'Failed to fetch newsletter subscribers' });
  }
});

router.get('/export', async (_req, res) => {
  try {
    const subscribers = await db.newsletter.findMany({
      where: { active: true },
      orderBy: { createdAt: 'desc' },
    });

    const header = 'Email,Status,Subscribed Date\n';
    const rows = subscribers
      .map(
        (s) =>
          `"${s.email.replace(/"/g, '""')}","${s.active ? 'Active' : 'Inactive'}","${s.createdAt.toISOString()}"`
      )
      .join('\n');

    const filename = `newsletter-subscribers-${new Date().toISOString().split('T')[0]}.csv`;
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(header + rows);
  } catch (error) {
    console.error('Export newsletters error:', error);
    res.status(500).json({ error: 'Failed to export subscribers' });
  }
});

router.post('/campaign', async (req, res) => {
  try {
    const { subject, body, html, testEmail, subscriberIds } = req.body;

    if (!subject || !body) {
      return res.status(400).json({ error: 'Subject and body are required' });
    }

    let recipients: string[] = [];

    if (testEmail) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(testEmail)) {
        return res.status(400).json({ error: 'Invalid test email format' });
      }
      recipients = [String(testEmail).trim()];
    } else if (Array.isArray(subscriberIds) && subscriberIds.length > 0) {
      const subscribers = await db.newsletter.findMany({
        where: { id: { in: subscriberIds }, active: true },
      });
      recipients = subscribers.map((s) => s.email);
    } else {
      const subscribers = await db.newsletter.findMany({ where: { active: true } });
      recipients = subscribers.map((s) => s.email);
    }

    if (recipients.length === 0) {
      return res.status(400).json({ error: 'No active subscribers to send to' });
    }

    const result = await sendNewsletterCampaign({
      subject: String(subject),
      text: String(body),
      html: html ? String(html) : undefined,
      recipients,
    });

    res.json({
      message: `Campaign sent to ${result.sent} recipient(s)`,
      ...result,
      total: recipients.length,
    });
  } catch (error) {
    console.error('Newsletter campaign error:', error);
    res.status(500).json({ error: 'Failed to send campaign' });
  }
});

router.post('/', async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: 'Email is required' });

    const existing = await db.newsletter.findUnique({ where: { email } });
    if (existing) return res.status(409).json({ error: 'Email is already subscribed' });

    const subscriber = await db.newsletter.create({ data: { email } });
    res.status(201).json(subscriber);
  } catch (error) {
    console.error('Add newsletter subscriber error:', error);
    res.status(500).json({ error: 'Failed to add subscriber' });
  }
});

router.delete('/', async (req, res) => {
  try {
    const { ids } = req.body;
    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ error: 'ids array is required and must not be empty' });
    }

    const result = await db.newsletter.deleteMany({ where: { id: { in: ids } } });
    res.json({ message: `${result.count} subscriber(s) deleted successfully`, deleted: result.count });
  } catch (error) {
    console.error('Bulk delete newsletter subscribers error:', error);
    res.status(500).json({ error: 'Failed to delete subscribers' });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const subscriber = await db.newsletter.findUnique({ where: { id: req.params.id } });
    if (!subscriber) return res.status(404).json({ error: 'Subscriber not found' });
    res.json(subscriber);
  } catch (error) {
    console.error('Get newsletter subscriber error:', error);
    res.status(500).json({ error: 'Failed to fetch subscriber' });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const existing = await db.newsletter.findUnique({ where: { id: req.params.id } });
    if (!existing) return res.status(404).json({ error: 'Subscriber not found' });
    await db.newsletter.delete({ where: { id: req.params.id } });
    res.json({ message: 'Subscriber deleted successfully' });
  } catch (error) {
    console.error('Delete newsletter subscriber error:', error);
    res.status(500).json({ error: 'Failed to delete subscriber' });
  }
});

export default router;
