import 'dotenv/config';
import { applyDatabaseUrlEnv } from './lib/database-url.js';

applyDatabaseUrlEnv();

import express from 'express';
import compression from 'compression';
import cors from 'cors';
import publicRoutes from './routes/public.js';
import adminAuthRoutes from './routes/admin/auth.js';
import adminSeedRoutes from './routes/admin/seed.js';
import adminAnalyticsRoutes from './routes/admin/analytics.js';
import adminArticlesRoutes from './routes/admin/articles.js';
import adminReviewsRoutes from './routes/admin/reviews.js';
import adminPricingRoutes from './routes/admin/pricing.js';
import adminContactsRoutes from './routes/admin/contacts.js';
import adminFeedbackRoutes from './routes/admin/feedback.js';
import adminNewslettersRoutes from './routes/admin/newsletters.js';
import adminSubmissionsRoutes from './routes/admin/submissions.js';
import adminProfileRoutes from './routes/admin/profile.js';
import adminSmtpRoutes from './routes/admin/smtp.js';
import adminPagesRoutes from './routes/admin/pages.js';
import adminFaqRoutes from './routes/admin/faq.js';
import adminChangelogRoutes from './routes/admin/changelog.js';
import adminStatusRoutes from './routes/admin/status.js';
import adminSiteSettingsRoutes from './routes/admin/site-settings.js';
import adminTranslationsRoutes from './routes/admin/translations.js';
import adminAuditLogRoutes from './routes/admin/audit-log.js';
import adminUploadsRoutes from './routes/admin/uploads.js';
import { requireAdmin } from './middleware/requireAdmin.js';
import { auditAdminMutations } from './middleware/auditAdmin.js';
import { authRateLimit } from './middleware/rateLimit.js';
import { getAllowedOrigins } from './lib/cors-origins.js';
import { syncSmtpConfigFromEnv } from './lib/smtp-config.js';
import { UPLOAD_ROOT, ensureUploadDirs, isR2Configured } from './lib/uploads.js';
import { getUploadStorageMode } from './lib/r2.js';

const adminGuard = [requireAdmin, auditAdminMutations];

const app = express();
const PORT = process.env.PORT || 4000;

// Behind reverse proxy (nginx, cloud load balancer)
app.set('trust proxy', 1);

app.use(
  cors({
    origin: getAllowedOrigins(),
    credentials: true,
  })
);
app.use(compression());
app.use(express.json());

ensureUploadDirs();
if (!isR2Configured()) {
  app.use('/uploads', express.static(UPLOAD_ROOT));
  console.warn('R2 is not configured — uploads will be stored on local disk under /uploads');
}

app.use('/api', publicRoutes);
app.use('/api/admin/auth', authRateLimit, adminAuthRoutes);
app.use('/api/admin/seed', ...adminGuard, adminSeedRoutes);
app.use('/api/admin/analytics', ...adminGuard, adminAnalyticsRoutes);
app.use('/api/admin/articles', ...adminGuard, adminArticlesRoutes);
app.use('/api/admin/reviews', ...adminGuard, adminReviewsRoutes);
app.use('/api/admin/pricing', ...adminGuard, adminPricingRoutes);
app.use('/api/admin/contacts', ...adminGuard, adminContactsRoutes);
app.use('/api/admin/feedback', ...adminGuard, adminFeedbackRoutes);
app.use('/api/admin/submissions', ...adminGuard, adminSubmissionsRoutes);
app.use('/api/admin/newsletters', ...adminGuard, adminNewslettersRoutes);
app.use('/api/admin/profile', ...adminGuard, adminProfileRoutes);
app.use('/api/admin/smtp', ...adminGuard, adminSmtpRoutes);
app.use('/api/admin/pages', ...adminGuard, adminPagesRoutes);
app.use('/api/admin/faq', ...adminGuard, adminFaqRoutes);
app.use('/api/admin/changelog', ...adminGuard, adminChangelogRoutes);
app.use('/api/admin/status', ...adminGuard, adminStatusRoutes);
app.use('/api/admin/site-settings', ...adminGuard, adminSiteSettingsRoutes);
app.use('/api/admin/translations', ...adminGuard, adminTranslationsRoutes);
app.use('/api/admin/audit-log', ...adminGuard, adminAuditLogRoutes);
app.use('/api/admin/uploads', ...adminGuard, adminUploadsRoutes);

app.get('/health', (_req, res) => {
  res.json({ status: 'ok' });
});

app.listen(PORT, () => {
  console.log(`Backend server running on http://localhost:${PORT}`);
  console.log(`Upload storage: ${getUploadStorageMode()}`);
  syncSmtpConfigFromEnv().catch((error) => {
    console.error('SMTP env sync failed:', error);
  });
});
