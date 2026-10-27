import { Router } from 'express';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import blogRoutes from './blog.js';
import publishRoutes from './publish.js';
import revisionsRoutes from './revisions.js';
import uploadsRoutes from './uploads.js';
import {
  auditAutomationMutations,
  automationRateLimit,
  requireAutomation,
} from '../../../middleware/requireAutomation.js';
import { requestId } from '../../../middleware/requestId.js';
import { ok } from '../../../lib/automation/response.js';

const router = Router();

router.use(requestId);

router.get('/health', (_req, res) => {
  return ok(res, {
    service: 'fasttesters-automation-api',
    version: 'v1',
    status: 'ok',
  });
});

router.get('/openapi.json', (_req, res) => {
  try {
    const candidates = [
      join(process.cwd(), 'docs/automation-api-v1.openapi.json'),
      join(__dirname, '../../../../docs/automation-api-v1.openapi.json'),
    ];

    for (const path of candidates) {
      try {
        const raw = readFileSync(path, 'utf8');
        res.type('application/json').send(raw);
        return;
      } catch {
        // try next
      }
    }

    res.status(404).json({ error: 'OpenAPI document not found' });
  } catch (error) {
    console.error('OpenAPI serve error:', error);
    res.status(500).json({ error: 'Failed to load OpenAPI document' });
  }
});

router.use(requireAutomation, automationRateLimit, auditAutomationMutations);
router.use('/blog', blogRoutes);
router.use('/blog', publishRoutes);
router.use('/blog', revisionsRoutes);
router.use('/uploads', uploadsRoutes);

export default router;
