import { Router } from 'express';
import { db } from '../../lib/db.js';
import {
  COUNTRY_NAMES,
  daysBetween,
  endOfDayUtc,
  incrementCount,
  sortCountMap,
  startOfDayUtc,
  toDateKey,
} from '../../lib/analytics-utils.js';

const router = Router();

function parseRange(query: Record<string, unknown>): { from: Date; to: Date; fromKey: string; toKey: string } {
  const now = new Date();
  const defaultToKey = toDateKey(now);
  const defaultFrom = new Date(now);
  defaultFrom.setUTCDate(defaultFrom.getUTCDate() - 29);
  const defaultFromKey = toDateKey(defaultFrom);

  const fromKey =
    typeof query.from === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(query.from)
      ? query.from
      : defaultFromKey;
  const toKey =
    typeof query.to === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(query.to)
      ? query.to
      : defaultToKey;

  let from = startOfDayUtc(fromKey);
  let to = endOfDayUtc(toKey);

  if (from > to) {
    from = startOfDayUtc(toKey);
    to = endOfDayUtc(fromKey);
  }

  // Cap range at 366 days to keep responses bounded
  const maxSpanMs = 366 * 24 * 60 * 60 * 1000;
  if (to.getTime() - from.getTime() > maxSpanMs) {
    from = new Date(to.getTime() - maxSpanMs);
  }

  return {
    from,
    to,
    fromKey: toDateKey(from),
    toKey: toDateKey(to),
  };
}

router.get('/', async (req, res) => {
  try {
    const { from, to, fromKey, toKey } = parseRange(req.query as Record<string, unknown>);

    const events = await db.analyticsEvent.findMany({
      where: {
        createdAt: {
          gte: from,
          lte: to,
        },
      },
      select: {
        eventType: true,
        page: true,
        element: true,
        visitorId: true,
        sessionId: true,
        country: true,
        city: true,
        referrer: true,
        device: true,
        browser: true,
        language: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    const eventsByType: Record<string, number> = {};
    const pageViews: Record<string, number> = {};
    const ctaClicks: Record<string, number> = {};
    const countries: Record<string, number> = {};
    const countryVisitors: Record<string, Set<string>> = {};
    const devices: Record<string, number> = {};
    const browsers: Record<string, number> = {};
    const referrers: Record<string, number> = {};
    const languages: Record<string, number> = {};
    const cities: Record<string, number> = {};

    const uniqueVisitors = new Set<string>();
    const uniqueSessions = new Set<string>();
    const pageViewVisitors = new Set<string>();
    const sessionPageViews: Record<string, number> = {};

    const dayKeys = daysBetween(from, to);
    const dailyStats: Record<
      string,
      { events: number; pageViews: number; ctaClicks: number; uniqueVisitors: Set<string> }
    > = {};

    for (const key of dayKeys) {
      dailyStats[key] = {
        events: 0,
        pageViews: 0,
        ctaClicks: 0,
        uniqueVisitors: new Set(),
      };
    }

    for (const event of events) {
      eventsByType[event.eventType] = (eventsByType[event.eventType] || 0) + 1;

      if (event.visitorId) uniqueVisitors.add(event.visitorId);
      if (event.sessionId) uniqueSessions.add(event.sessionId);

      const dayKey = toDateKey(new Date(event.createdAt));
      if (dailyStats[dayKey]) {
        dailyStats[dayKey].events += 1;
        if (event.visitorId) dailyStats[dayKey].uniqueVisitors.add(event.visitorId);
      }

      if (event.eventType === 'page_view') {
        pageViews[event.page] = (pageViews[event.page] || 0) + 1;
        if (dailyStats[dayKey]) dailyStats[dayKey].pageViews += 1;
        if (event.visitorId) pageViewVisitors.add(event.visitorId);
        if (event.sessionId) {
          sessionPageViews[event.sessionId] = (sessionPageViews[event.sessionId] || 0) + 1;
        }
      }

      if (event.eventType === 'cta_click' && event.element) {
        ctaClicks[event.element] = (ctaClicks[event.element] || 0) + 1;
        if (dailyStats[dayKey]) dailyStats[dayKey].ctaClicks += 1;
      }

      incrementCount(countries, event.country);
      incrementCount(devices, event.device);
      incrementCount(browsers, event.browser);
      incrementCount(referrers, event.referrer || 'Direct / Internal');
      incrementCount(languages, event.language);
      if (event.city) incrementCount(cities, event.city);

      if (event.country && event.visitorId) {
        if (!countryVisitors[event.country]) countryVisitors[event.country] = new Set();
        countryVisitors[event.country].add(event.visitorId);
      }
    }

    const totalPageViews = Object.values(pageViews).reduce((sum, n) => sum + n, 0);
    const totalCtaClicks = Object.values(ctaClicks).reduce((sum, n) => sum + n, 0);
    const totalFormSubmissions = eventsByType.form_submit || 0;
    const uniqueVisitorCount = uniqueVisitors.size;
    const uniqueSessionCount = uniqueSessions.size;

    const singlePageSessions = Object.values(sessionPageViews).filter((n) => n === 1).length;
    const sessionsWithPageViews = Object.keys(sessionPageViews).length;
    const bounceRate =
      sessionsWithPageViews > 0
        ? Math.round((singlePageSessions / sessionsWithPageViews) * 1000) / 10
        : 0;

    const avgPagesPerVisitor =
      uniqueVisitorCount > 0
        ? Math.round((totalPageViews / uniqueVisitorCount) * 10) / 10
        : 0;

    const countriesList = Object.entries(countries)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 25)
      .map(([code, visits]) => ({
        code,
        name: COUNTRY_NAMES[code] || code,
        visits,
        uniqueVisitors: countryVisitors[code]?.size || 0,
      }));

    res.json({
      range: { from: fromKey, to: toKey },
      summary: {
        totalEvents: events.length,
        pageViews: totalPageViews,
        uniqueVisitors: uniqueVisitorCount,
        uniqueSessions: uniqueSessionCount,
        ctaClicks: totalCtaClicks,
        formSubmissions: totalFormSubmissions,
        avgPagesPerVisitor,
        bounceRate,
        trackedWithVisitorId: events.filter((e) => e.visitorId).length,
      },
      eventsByType,
      pageViews,
      ctaClicks,
      dailyStats: dayKeys.map((date) => ({
        date,
        events: dailyStats[date].events,
        pageViews: dailyStats[date].pageViews,
        ctaClicks: dailyStats[date].ctaClicks,
        uniqueVisitors: dailyStats[date].uniqueVisitors.size,
      })),
      countries: countriesList,
      devices: sortCountMap(devices),
      browsers: sortCountMap(browsers),
      referrers: sortCountMap(referrers),
      languages: sortCountMap(languages),
      cities: sortCountMap(cities, 15),
    });
  } catch (error) {
    console.error('Get analytics error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
