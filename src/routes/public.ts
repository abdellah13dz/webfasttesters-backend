import { Router } from 'express';
import { db } from '../lib/db.js';
import { verifyRecaptcha } from '../lib/recaptcha.js';
import { notifyAdminNewContact, notifyAdminNewAppSubmission } from '../lib/mailer.js';
import {
  SITE_SETTING_KEYS,
  DEFAULT_ANNOUNCEMENT_BANNER,
  DEFAULT_HERO_STATS,
  DEFAULT_SEO,
  getSiteSetting,
} from '../lib/site-settings-keys.js';
import { DEFAULT_SITE_NAVIGATION, SUPPORTED_LOCALES } from '../lib/navigation-defaults.js';
import { formRateLimit, analyticsRateLimit } from '../middleware/rateLimit.js';

const router = Router();

router.get('/', (_req, res) => {
  res.json({ message: 'Hello, world!' });
});

router.get('/reviews', async (req, res) => {
  try {
    const featured = req.query.featured === 'true';
    const caseStudy = req.query.caseStudy === 'true';
    const excludeFeatured = req.query.excludeFeatured === 'true';
    const limit = req.query.limit ? Math.min(50, parseInt(String(req.query.limit), 10)) : undefined;

    const reviews = await db.review.findMany({
      where: {
        visible: true,
        ...(featured ? { featured: true } : {}),
        ...(caseStudy ? { caseStudy: true } : {}),
        ...(excludeFeatured ? { featured: false } : {}),
      },
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'desc' }],
      ...(limit ? { take: limit } : {}),
    });
    res.json(reviews);
  } catch (error) {
    console.error('Error fetching public reviews:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/pricing', async (_req, res) => {
  try {
    const plans = await db.pricingPlan.findMany({
      where: { active: true },
      orderBy: [{ popular: 'desc' }, { createdAt: 'asc' }],
    });
    res.json(plans);
  } catch (error) {
    console.error('Error fetching public pricing:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/articles', async (req, res) => {
  try {
    const slug = req.query.slug as string | undefined;

    const where: { status: string; slug?: string } = { status: 'published' };
    if (slug) where.slug = slug;

    const articles = await db.article.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });

    res.json(articles);
  } catch {
    res.json([]);
  }
});

router.post('/contact', formRateLimit, async (req, res) => {
  try {
    const { name, email, subject, message, recaptchaToken } = req.body;

    if (!name || !email || !subject || !message) {
      return res.status(400).json({ error: 'Name, email, subject, and message are required' });
    }

    const recaptchaResult = await verifyRecaptcha(recaptchaToken, 'contact_form');
    if (!recaptchaResult.passed) {
      return res.status(403).json({
        error: 'reCAPTCHA verification failed. Please try again.',
        details: recaptchaResult.error,
      });
    }

    const contact = await db.contact.create({
      data: { name, email, subject, message },
    });

    notifyAdminNewContact({ name, email, subject, message }).catch((err) => {
      console.error('Admin contact notification failed:', err);
    });

    res.status(201).json(contact);
  } catch (error) {
    console.error('Create contact error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/feedback', formRateLimit, async (req, res) => {
  try {
    const { rating, message, recaptchaToken } = req.body;

    if (!rating || rating < 1 || rating > 5) {
      return res.status(400).json({ error: 'Rating must be between 1 and 5' });
    }

    const trimmedMessage = message ? String(message).trim() : '';
    if (trimmedMessage.length > 1000) {
      return res.status(400).json({ error: 'Message must be 1000 characters or less' });
    }

    const recaptchaResult = await verifyRecaptcha(recaptchaToken, 'feedback_form');
    if (!recaptchaResult.passed) {
      return res.status(403).json({
        error: 'reCAPTCHA verification failed. Please try again.',
        details: recaptchaResult.error,
      });
    }

    const feedback = await db.feedback.create({
      data: {
        rating: Number(rating),
        message: trimmedMessage,
      },
    });

    res.status(201).json(feedback);
  } catch (error) {
    console.error('Create feedback error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/analytics', analyticsRateLimit, async (req, res) => {
  try {
    const { eventType, page, element, metadata } = req.body;

    if (!eventType || !page) {
      return res.status(400).json({ error: 'eventType and page are required' });
    }

    const event = await db.analyticsEvent.create({
      data: {
        eventType,
        page,
        element: element || null,
        metadata: metadata ? JSON.stringify(metadata) : null,
      },
    });

    res.status(201).json(event);
  } catch (error) {
    console.error('Track event error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/submissions', formRateLimit, async (req, res) => {
  try {
    const {
      name,
      email,
      whatsapp,
      appName,
      packageName,
      playUrl,
      testingLink,
      pricingPlanId,
      planLabel,
      instructions,
      recaptchaToken,
    } = req.body;

    if (!name || !email || !whatsapp || !appName || !packageName || !testingLink) {
      return res.status(400).json({
        error: 'Name, email, WhatsApp number, app name, package name, and testing link are required',
      });
    }

    const whatsappDigits = String(whatsapp).replace(/\D/g, '');
    if (whatsappDigits.length < 8 || whatsappDigits.length > 15) {
      return res.status(400).json({ error: 'Please enter a valid WhatsApp number with country code' });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ error: 'Invalid email format' });
    }

    const recaptchaResult = await verifyRecaptcha(recaptchaToken, 'submit_app');
    if (!recaptchaResult.passed) {
      return res.status(403).json({
        error: 'reCAPTCHA verification failed. Please try again.',
        details: recaptchaResult.error,
      });
    }

    const submission = await db.appSubmission.create({
      data: {
        name: String(name).trim(),
        email: String(email).trim(),
        whatsapp: String(whatsapp).trim(),
        appName: String(appName).trim(),
        packageName: String(packageName).trim(),
        playUrl: playUrl ? String(playUrl).trim() : null,
        testingLink: String(testingLink).trim(),
        pricingPlanId: pricingPlanId ? String(pricingPlanId) : null,
        planLabel: planLabel ? String(planLabel) : null,
        instructions: instructions ? String(instructions).trim() : null,
      },
    });

    notifyAdminNewAppSubmission({
      name: submission.name,
      email: submission.email,
      whatsapp: submission.whatsapp,
      appName: submission.appName,
      packageName: submission.packageName,
      testingLink: submission.testingLink,
      planLabel: submission.planLabel,
    }).catch((err) => {
      console.error('Admin app submission notification failed:', err);
    });

    res.status(201).json(submission);
  } catch (error) {
    console.error('Create app submission error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/pages/:slug', async (req, res) => {
  try {
    const page = await db.page.findUnique({ where: { slug: req.params.slug } });
    if (!page || page.status !== 'published') {
      return res.status(404).json({ error: 'Page not found' });
    }
    res.json(page);
  } catch (error) {
    console.error('Public page error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/faq', async (_req, res) => {
  try {
    const items = await db.faqItem.findMany({
      where: { published: true },
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
    });
    res.json(items);
  } catch (error) {
    console.error('Public FAQ error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/changelog', async (_req, res) => {
  try {
    const entries = await db.changelogEntry.findMany({
      where: { published: true },
      orderBy: [{ sortOrder: 'asc' }, { publishedAt: 'desc' }],
    });
    res.json(entries);
  } catch (error) {
    console.error('Public changelog error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/status', async (_req, res) => {
  try {
    const [services, incidents] = await Promise.all([
      db.statusService.findMany({
        where: { active: true },
        orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
      }),
      db.statusIncident.findMany({
        where: { published: true },
        orderBy: [{ sortOrder: 'asc' }, { occurredAt: 'desc' }],
      }),
    ]);
    res.json({ services, incidents });
  } catch (error) {
    console.error('Public status error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/site-settings', async (_req, res) => {
  try {
    const [announcementBanner, heroStats, defaultSeo, pageSeoOverrides, navigation] = await Promise.all([
      getSiteSetting(db, SITE_SETTING_KEYS.ANNOUNCEMENT_BANNER, DEFAULT_ANNOUNCEMENT_BANNER),
      getSiteSetting(db, SITE_SETTING_KEYS.HERO_STATS, DEFAULT_HERO_STATS),
      getSiteSetting(db, SITE_SETTING_KEYS.DEFAULT_SEO, DEFAULT_SEO),
      getSiteSetting<Record<string, unknown>>(db, SITE_SETTING_KEYS.PAGE_SEO_OVERRIDES, {}),
      getSiteSetting(db, SITE_SETTING_KEYS.SITE_NAVIGATION, DEFAULT_SITE_NAVIGATION),
    ]);

    res.json({
      announcementBanner,
      heroStats,
      defaultSeo,
      pageSeoOverrides,
      navigation,
    });
  } catch (error) {
    console.error('Public site settings error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/translations', async (req, res) => {
  try {
    const locale = String(req.query.locale || 'en');
    if (!SUPPORTED_LOCALES.includes(locale as (typeof SUPPORTED_LOCALES)[number])) {
      return res.status(400).json({ error: 'Unsupported locale' });
    }

    const items = await db.translation.findMany({
      where: { locale },
      select: { key: true, value: true },
    });

    const overrides: Record<string, string> = {};
    for (const item of items) {
      overrides[item.key] = item.value;
    }

    res.json({ locale, overrides });
  } catch (error) {
    console.error('Public translations error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/newsletter', formRateLimit, async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ error: 'Invalid email format' });
    }

    const existing = await db.newsletter.findUnique({ where: { email } });

    if (existing) {
      if (!existing.active) {
        await db.newsletter.update({
          where: { id: existing.id },
          data: { active: true },
        });
        return res.json({ message: 'Resubscribed successfully' });
      }

      return res.status(409).json({ error: 'Email is already subscribed' });
    }

    const subscriber = await db.newsletter.create({ data: { email } });

    res.status(201).json({ message: 'Subscribed successfully', id: subscriber.id });
  } catch (error) {
    console.error('Newsletter signup error:', error);
    res.status(500).json({ error: 'Failed to subscribe' });
  }
});

export default router;
