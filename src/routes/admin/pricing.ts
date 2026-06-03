import { Router } from 'express';
import { db } from '../../lib/db.js';

const router = Router();

router.get('/', async (_req, res) => {
  try {
    const plans = await db.pricingPlan.findMany({ orderBy: { createdAt: 'desc' } });
    res.json(plans);
  } catch (error) {
    console.error('List pricing plans error:', error);
    res.status(500).json({ error: 'Failed to fetch pricing plans' });
  }
});

router.post('/', async (req, res) => {
  try {
    const { name, price, currency, period, description, features, popular, active } = req.body;

    if (!name || price === undefined || price === null) {
      return res.status(400).json({ error: 'Name and price are required' });
    }

    const plan = await db.pricingPlan.create({
      data: {
        name,
        price: parseFloat(price),
        currency: currency || 'USD',
        period: period || 'one-time',
        description: description || null,
        features: features || '[]',
        popular: popular ?? false,
        active: active ?? true,
      },
    });

    res.status(201).json(plan);
  } catch (error) {
    console.error('Create pricing plan error:', error);
    res.status(500).json({ error: 'Failed to create pricing plan' });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const plan = await db.pricingPlan.findUnique({ where: { id: req.params.id } });
    if (!plan) return res.status(404).json({ error: 'Pricing plan not found' });
    res.json(plan);
  } catch (error) {
    console.error('Get pricing plan error:', error);
    res.status(500).json({ error: 'Failed to fetch pricing plan' });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const existing = await db.pricingPlan.findUnique({ where: { id: req.params.id } });
    if (!existing) return res.status(404).json({ error: 'Pricing plan not found' });

    const body = req.body;
    const data: Record<string, unknown> = {};

    if (body.name !== undefined) data.name = body.name;
    if (body.price !== undefined) data.price = parseFloat(body.price);
    if (body.currency !== undefined) data.currency = body.currency;
    if (body.period !== undefined) data.period = body.period;
    if (body.description !== undefined) data.description = body.description;
    if (body.features !== undefined) data.features = body.features;
    if (body.popular !== undefined) data.popular = body.popular;
    if (body.active !== undefined) data.active = body.active;

    const updated = await db.pricingPlan.update({ where: { id: req.params.id }, data });
    res.json(updated);
  } catch (error) {
    console.error('Update pricing plan error:', error);
    res.status(500).json({ error: 'Failed to update pricing plan' });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const existing = await db.pricingPlan.findUnique({ where: { id: req.params.id } });
    if (!existing) return res.status(404).json({ error: 'Pricing plan not found' });
    await db.pricingPlan.delete({ where: { id: req.params.id } });
    res.json({ message: 'Pricing plan deleted successfully' });
  } catch (error) {
    console.error('Delete pricing plan error:', error);
    res.status(500).json({ error: 'Failed to delete pricing plan' });
  }
});

export default router;
