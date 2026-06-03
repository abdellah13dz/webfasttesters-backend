import { Router } from 'express';
import { seedAll } from '../../lib/seed.js';

const router = Router();

function isSeedAllowed(): boolean {
  return process.env.NODE_ENV !== 'production' || process.env.ALLOW_SEED === 'true';
}

router.get('/', (_req, res) => {
  res.json({
    environment: process.env.NODE_ENV || 'development',
    seedAllowed: isSeedAllowed(),
    allowSeedEnv: process.env.ALLOW_SEED === 'true',
  });
});

router.post('/', async (req, res) => {
  try {
    if (!isSeedAllowed()) {
      return res.status(403).json({ error: 'Seed is disabled in production' });
    }

    const { action } = req.body;

    if (action !== 'seed-all') {
      return res.status(400).json({ error: 'Invalid action' });
    }

    await seedAll();

    res.json({ message: 'All data seeded successfully' });
  } catch (error) {
    console.error('Seed error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
