import { Router } from 'express';
import { db } from '../../lib/db.js';

const router = Router();

router.get('/services', async (_req, res) => {
  try {
    const services = await db.statusService.findMany({ orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }] });
    res.json(services);
  } catch (error) {
    console.error('Status services list error:', error);
    res.status(500).json({ error: 'Failed to fetch status services' });
  }
});

router.post('/services', async (req, res) => {
  try {
    const { name, icon, uptime30Day, status, sortOrder, active } = req.body;

    if (!name) {
      return res.status(400).json({ error: 'name is required' });
    }

    const service = await db.statusService.create({
      data: {
        name,
        icon: icon ?? 'Smartphone',
        uptime30Day: uptime30Day ?? '99.99%',
        status: status ?? 'operational',
        sortOrder: sortOrder ?? 0,
        active: active ?? true,
      },
    });

    res.status(201).json(service);
  } catch (error) {
    console.error('Status service create error:', error);
    res.status(500).json({ error: 'Failed to create status service' });
  }
});

router.put('/services/:id', async (req, res) => {
  try {
    const existing = await db.statusService.findUnique({ where: { id: req.params.id } });
    if (!existing) return res.status(404).json({ error: 'Status service not found' });

    const { name, icon, uptime30Day, status, sortOrder, active } = req.body;

    const service = await db.statusService.update({
      where: { id: req.params.id },
      data: {
        ...(name !== undefined && { name }),
        ...(icon !== undefined && { icon }),
        ...(uptime30Day !== undefined && { uptime30Day }),
        ...(status !== undefined && { status }),
        ...(sortOrder !== undefined && { sortOrder }),
        ...(active !== undefined && { active }),
      },
    });

    res.json(service);
  } catch (error) {
    console.error('Status service update error:', error);
    res.status(500).json({ error: 'Failed to update status service' });
  }
});

router.delete('/services/:id', async (req, res) => {
  try {
    const existing = await db.statusService.findUnique({ where: { id: req.params.id } });
    if (!existing) return res.status(404).json({ error: 'Status service not found' });

    await db.statusService.delete({ where: { id: req.params.id } });
    res.json({ message: 'Status service deleted' });
  } catch (error) {
    console.error('Status service delete error:', error);
    res.status(500).json({ error: 'Failed to delete status service' });
  }
});

router.get('/incidents', async (_req, res) => {
  try {
    const incidents = await db.statusIncident.findMany({
      orderBy: [{ sortOrder: 'asc' }, { occurredAt: 'desc' }],
    });
    res.json(incidents);
  } catch (error) {
    console.error('Status incidents list error:', error);
    res.status(500).json({ error: 'Failed to fetch status incidents' });
  }
});

router.post('/incidents', async (req, res) => {
  try {
    const { title, description, status, occurredAt, duration, sortOrder, published } = req.body;

    if (!title || !description) {
      return res.status(400).json({ error: 'title and description are required' });
    }

    const incident = await db.statusIncident.create({
      data: {
        title,
        description,
        status: status ?? 'resolved',
        occurredAt: occurredAt ? new Date(occurredAt) : new Date(),
        duration: duration ?? null,
        sortOrder: sortOrder ?? 0,
        published: published ?? true,
      },
    });

    res.status(201).json(incident);
  } catch (error) {
    console.error('Status incident create error:', error);
    res.status(500).json({ error: 'Failed to create status incident' });
  }
});

router.put('/incidents/:id', async (req, res) => {
  try {
    const existing = await db.statusIncident.findUnique({ where: { id: req.params.id } });
    if (!existing) return res.status(404).json({ error: 'Status incident not found' });

    const { title, description, status, occurredAt, duration, sortOrder, published } = req.body;

    const incident = await db.statusIncident.update({
      where: { id: req.params.id },
      data: {
        ...(title !== undefined && { title }),
        ...(description !== undefined && { description }),
        ...(status !== undefined && { status }),
        ...(occurredAt !== undefined && { occurredAt: new Date(occurredAt) }),
        ...(duration !== undefined && { duration }),
        ...(sortOrder !== undefined && { sortOrder }),
        ...(published !== undefined && { published }),
      },
    });

    res.json(incident);
  } catch (error) {
    console.error('Status incident update error:', error);
    res.status(500).json({ error: 'Failed to update status incident' });
  }
});

router.delete('/incidents/:id', async (req, res) => {
  try {
    const existing = await db.statusIncident.findUnique({ where: { id: req.params.id } });
    if (!existing) return res.status(404).json({ error: 'Status incident not found' });

    await db.statusIncident.delete({ where: { id: req.params.id } });
    res.json({ message: 'Status incident deleted' });
  } catch (error) {
    console.error('Status incident delete error:', error);
    res.status(500).json({ error: 'Failed to delete status incident' });
  }
});

export default router;
