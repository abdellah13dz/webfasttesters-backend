import { Router } from 'express';
import { db } from '../../lib/db.js';

const router = Router();

router.get('/', async (_req, res) => {
  try {
    const allEvents = await db.analyticsEvent.findMany({
      orderBy: { createdAt: 'desc' },
    });

    const totalEvents = allEvents.length;
    const eventsByType: Record<string, number> = {};
    const pageViews: Record<string, number> = {};
    const ctaClicks: Record<string, number> = {};

    for (const event of allEvents) {
      eventsByType[event.eventType] = (eventsByType[event.eventType] || 0) + 1;
      if (event.eventType === 'page_view') {
        pageViews[event.page] = (pageViews[event.page] || 0) + 1;
      }
      if (event.eventType === 'cta_click' && event.element) {
        ctaClicks[event.element] = (ctaClicks[event.element] || 0) + 1;
      }
    }

    const now = new Date();
    const thirtyDaysAgo = new Date(now);
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const dailyStats: Record<string, { events: number; pageViews: number; ctaClicks: number }> = {};

    for (let i = 0; i < 30; i++) {
      const d = new Date(thirtyDaysAgo);
      d.setDate(d.getDate() + i);
      const key = d.toISOString().split('T')[0];
      dailyStats[key] = { events: 0, pageViews: 0, ctaClicks: 0 };
    }

    for (const event of allEvents) {
      const eventDate = new Date(event.createdAt).toISOString().split('T')[0];
      if (dailyStats[eventDate]) {
        dailyStats[eventDate].events += 1;
        if (event.eventType === 'page_view') dailyStats[eventDate].pageViews += 1;
        if (event.eventType === 'cta_click') dailyStats[eventDate].ctaClicks += 1;
      }
    }

    const dailyStatsArray = Object.entries(dailyStats)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, stats]) => ({ date, ...stats }));

    res.json({
      totalEvents,
      eventsByType,
      pageViews,
      ctaClicks,
      dailyStats: dailyStatsArray,
    });
  } catch (error) {
    console.error('Get analytics error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
