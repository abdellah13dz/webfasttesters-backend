/**
 * Internal linking architecture pass:
 * 1) Retarget broken /blog/* links to closest live articles
 * 2) Append cluster hub + commercial conversion links (marker-based, append-only)
 * 3) Guarantee inbound links to orphan / weak pages from topical peers
 *
 * NEVER deletes article content. NEVER changes slugs.
 *
 * Usage: node scripts/apply-internal-linking.js
 */
const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();

const MARKER = '<!-- internal-linking:v1 -->';

/** Broken slug → best existing replacement (preserve intent). */
const BROKEN_REDIRECTS = {
  'how-to-keep-testers-engaged-during-closed-testing':
    'avoiding-tester-dropout-during-14-day-testing',
  'what-is-an-android-app-bundle-and-why-google-play-requires-it':
    'app-bundle-vs-apk-for-closed-testing-releases',
  'turning-tester-feedback-into-app-improvements':
    'crash-reports-during-closed-testing-fix-before-production',
  'common-reasons-google-play-apps-get-rejected': 'why-google-rejects-android-apps',
  'android-13-14-15-behavior-changes-app-testing':
    'target-api-level-requirements-for-google-play-2026',
  'multi-language-app-testing-on-google-play': 'multi-language-app-testing',
};

/**
 * Topic clusters: pillar + supporting members.
 * Every member links to pillar; pillar lists members.
 */
const CLUSTERS = [
  {
    id: 'closed-testing',
    name: 'Google Play Closed Testing',
    pillar: 'google-play-closed-testing',
    members: [
      'google-play-closed-testing-guide-how-to-get-12-testers-for-14-days',
      'google-play-closed-testing-requirements-2026',
      'how-to-create-a-closed-testing-track-in-play-console',
      'google-play-closed-testing-opt-in-link-setup',
      'how-long-does-google-play-closed-testing-take',
      'common-google-play-closed-testing-mistakes',
      'how-to-pass-google-play-closed-testing-on-the-first-try',
      'updating-your-app-mid-closed-testing-period',
      'google-play-closed-testing-faq-50-answers',
      'avoiding-tester-dropout-during-14-day-testing',
    ],
  },
  {
    id: '12-testers',
    name: '12 Testers & Production Access',
    pillar: 'google-play-12-testers-policy',
    members: [
      'google-play-12-testers-explained-for-indie-developers',
      'how-many-testers-do-you-need-for-google-play',
      'need-12-testers-for-google-play-fastest-solution',
      'how-to-get-12-testers-without-friends-or-family',
      'do-friends-count-as-google-play-testers',
      'what-happens-after-14-days-of-closed-testing',
      'when-can-you-request-google-play-production-access',
      'fastest-way-to-get-google-play-production-access',
      'google-play-says-not-enough-testers',
    ],
  },
  {
    id: 'beta-recruitment',
    name: 'Finding Android Beta Testers',
    pillar: 'how-to-find-beta-testers-for-android-apps',
    members: [
      'best-way-to-find-android-beta-testers-in-2026',
      'where-to-find-real-android-app-testers',
      'hire-android-app-testers',
      'reddit-beta-testers-pros-and-cons-for-play-store',
      'paid-testers-vs-free-testers',
      'real-testers-vs-fake-testers',
      'professional-testing-services-vs-community-testing',
      'android-beta-testing-best-practices',
      'buy-google-play-testers-is-it-safe',
    ],
  },
  {
    id: 'rejection',
    name: 'App Rejection & Eligibility',
    pillar: 'app-rejected-google-play',
    members: [
      'why-google-rejects-android-apps',
      'google-play-production-access-rejection-reasons',
      'app-not-eligible-for-production-access',
      'why-google-rejected-my-production-access-request',
      'closed-testing-completed-but-still-rejected',
      'app-rejected-for-insufficient-testing-what-to-do',
      'case-study-recovering-from-google-play-rejection',
      'google-play-policy-violations-during-closed-testing',
      'account-termination-risks-and-how-to-avoid-them',
    ],
  },
  {
    id: 'publishing',
    name: 'Publishing on Google Play',
    pillar: 'publish-app-google-play',
    members: [
      'first-app-on-google-play-complete-checklist',
      'android-app-release-checklist',
      'preparing-your-app-before-publishing',
      'google-play-store-submission-guide',
      'google-play-console-beginner-guide',
      'google-play-review-process-explained',
      'google-play-approval-time',
      'launch-day-checklist-after-production-access',
      'staged-rollouts-after-production-access-approval',
    ],
  },
  {
    id: 'tracks',
    name: 'Testing Tracks Compared',
    pillar: 'google-play-internal-testing-vs-closed-testing',
    members: [
      'closed-testing-vs-open-testing-on-google-play',
      'how-to-create-an-internal-testing-track',
      'internal-testing-vs-production-release',
      'closed-testing-vs-firebase-app-distribution',
      'closed-testing-vs-testflight',
      'sideloading-vs-play-store-testing-why-it-matters',
      'google-play-pre-launch-report-vs-closed-testing',
    ],
  },
  {
    id: 'services',
    name: 'Testing Services & Comparisons',
    pillar: 'google-play-closed-testing-service',
    members: [
      'google-play-testing-service-vs-diy',
      'how-to-choose-a-google-play-testing-service',
      'how-much-does-google-play-closed-testing-cost',
      'is-buying-google-play-testers-worth-it',
      'fast-testers-vs-reddit-testers',
      'fast-testers-vs-telegram-communities',
      'fast-testers-vs-facebook-groups',
      'why-professional-testers-improve-production-approval-chances',
    ],
  },
];

function titleFromSlug(slug) {
  return slug
    .split('-')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

function scoreRelated(a, b) {
  const at = new Set(a.slug.split('-').filter((t) => t.length > 3));
  const bt = b.slug.split('-');
  let score = 0;
  for (const t of bt) if (at.has(t)) score += 2;
  if (a.category && a.category === b.category) score += 5;
  if (a.featured && b.featured) score += 1;
  return score;
}

function pickPeers(article, all, n = 6) {
  return all
    .filter((x) => x.slug !== article.slug)
    .map((x) => ({ x, score: scoreRelated(article, x) }))
    .sort((a, b) => b.score - a.score || a.x.slug.localeCompare(b.x.slug))
    .slice(0, n)
    .map((r) => r.x);
}

function clusterFor(slug) {
  for (const c of CLUSTERS) {
    if (c.pillar === slug || c.members.includes(slug)) return c;
  }
  return null;
}

function buildHubHtml(article, allBySlug) {
  const cluster = clusterFor(article.slug);
  const peers = pickPeers(article, Object.values(allBySlug), 6);
  const parts = [];

  parts.push('<hr />');
  parts.push(
    '<p><em>Internal navigation hub — added to strengthen topical connections. Original article content above is unchanged.</em></p>'
  );

  if (cluster) {
    const pillar = allBySlug[cluster.pillar];
    const isPillar = cluster.pillar === article.slug;
    parts.push(`<h2 id="topic-cluster">Topic cluster: ${cluster.name}</h2>`);
    if (!isPillar && pillar) {
      parts.push(
        `<p><strong>Pillar guide:</strong> Start with <a href="/blog/${cluster.pillar}">${pillar.title || titleFromSlug(cluster.pillar)}</a> for the full overview, then use the supporting guides below.</p>`
      );
    } else {
      parts.push(
        `<p>This is the pillar page for <strong>${cluster.name}</strong>. Explore supporting guides to go deeper on specific steps, troubleshooting, and comparisons.</p>`
      );
    }
    const members = [cluster.pillar, ...cluster.members].filter(
      (s) => s !== article.slug && allBySlug[s]
    );
    parts.push('<ul>');
    for (const s of members.slice(0, 10)) {
      const t = allBySlug[s].title || titleFromSlug(s);
      const label = s === cluster.pillar ? `${t} (pillar)` : t;
      parts.push(`<li><a href="/blog/${s}">${label}</a></li>`);
    }
    parts.push('</ul>');
  }

  parts.push('<h2 id="continue-learning">Continue learning</h2>');
  parts.push('<ul>');
  for (const peer of peers) {
    parts.push(
      `<li><a href="/blog/${peer.slug}">${peer.title || titleFromSlug(peer.slug)}</a> — ${peer.description ? peer.description.slice(0, 110) : 'Related Google Play testing guide'}.</li>`
    );
  }
  parts.push('</ul>');

  parts.push('<h2 id="next-steps-commercial">Next steps</h2>');
  parts.push('<ul>');
  parts.push(
    '<li>Ready to run closed testing with real Android testers? <a href="/submit-app">Submit your app</a> or see <a href="/pricing">pricing ($15 one-time)</a>.</li>'
  );
  parts.push(
    '<li>Compare options on our <a href="/compare">testing service comparison</a> page, or read <a href="/reviews">developer reviews</a> and <a href="/case-studies">case studies</a>.</li>'
  );
  parts.push(
    '<li>Still deciding? Review <a href="/how-it-works">how Fast Testers works</a> and the <a href="/faq">FAQ</a>.</li>'
  );
  parts.push('</ul>');

  return parts.join('\n');
}

function fixBrokenLinks(html, slugSet) {
  let out = html;
  let fixes = 0;
  // Replace known broken redirects
  for (const [from, to] of Object.entries(BROKEN_REDIRECTS)) {
    if (!slugSet.has(to)) continue;
    const re = new RegExp(`(/blog/)${from.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?=["'#?])`, 'g');
    const before = out;
    out = out.replace(re, `$1${to}`);
    if (out !== before) {
      const matches = before.match(re);
      fixes += matches ? matches.length : 1;
    }
  }
  // Any remaining /blog/ links to missing slugs → closest by token score among live slugs
  const re = /href=["']\/blog\/([^"'#?]+)["']/gi;
  const missing = new Set();
  let m;
  while ((m = re.exec(out))) {
    if (!slugSet.has(m[1]) && !BROKEN_REDIRECTS[m[1]]) missing.add(m[1]);
  }
  for (const bad of missing) {
    const tokens = new Set(bad.split('-').filter((t) => t.length > 3));
    let best = null;
    let bestScore = -1;
    for (const live of slugSet) {
      let score = 0;
      for (const t of live.split('-')) if (tokens.has(t)) score++;
      if (score > bestScore) {
        bestScore = score;
        best = live;
      }
    }
    if (best && bestScore >= 2) {
      const fixRe = new RegExp(
        `(/blog/)${bad.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?=["'#?])`,
        'g'
      );
      const before = out;
      out = out.replace(fixRe, `$1${best}`);
      if (out !== before) fixes++;
    }
  }
  return { html: out, fixes };
}

function ensureInboundLink(fromHtml, toSlug, anchor) {
  if (new RegExp(`/blog/${toSlug}(["'#?])`).test(fromHtml)) return null;
  // Insert a single contextual sentence before the internal-linking marker or at end
  const sentence = `<p><strong>Related:</strong> Also see <a href="/blog/${toSlug}">${anchor}</a> for more detail on this topic.</p>\n`;
  return sentence;
}

(async () => {
  const articles = await p.article.findMany({
    where: { status: 'published' },
    select: {
      id: true,
      slug: true,
      title: true,
      description: true,
      category: true,
      featured: true,
      content: true,
    },
  });
  const slugSet = new Set(articles.map((a) => a.slug));
  const bySlug = Object.fromEntries(articles.map((a) => [a.slug, a]));

  // Compute current inbound
  const inbound = Object.fromEntries([...slugSet].map((s) => [s, 0]));
  for (const a of articles) {
    const re = /href=["']\/blog\/([^"'#?]+)["']/gi;
    let m;
    while ((m = re.exec(a.content || ''))) {
      if (slugSet.has(m[1])) inbound[m[1]]++;
    }
  }

  let totalBrokenFixes = 0;
  let hubs = 0;

  for (const a of articles) {
    let content = a.content || '';
    const fixed = fixBrokenLinks(content, slugSet);
    content = fixed.html;
    totalBrokenFixes += fixed.fixes;

    // Remove previous marker block if re-running
    if (content.includes(MARKER)) {
      content = content.slice(0, content.indexOf(MARKER)).trimEnd();
    }

    const hub = buildHubHtml(a, bySlug);
    content = `${content.trimEnd()}\n\n${MARKER}\n${hub}\n`;

    await p.article.update({
      where: { id: a.id },
      data: { content },
    });
    hubs++;
    if (hubs % 20 === 0) console.log(`Processed ${hubs}/${articles.length}...`);
  }

  // Pass 2: boost orphans / very weak inbound with reciprocal links from top peers
  const refreshed = await p.article.findMany({
    where: { status: 'published' },
    select: { id: true, slug: true, title: true, category: true, content: true, featured: true, description: true },
  });
  const inbound2 = Object.fromEntries(refreshed.map((a) => [a.slug, 0]));
  for (const a of refreshed) {
    const re = /href=["']\/blog\/([^"'#?]+)["']/gi;
    let m;
    while ((m = re.exec(a.content || ''))) {
      if (inbound2[m[1]] !== undefined) inbound2[m[1]]++;
    }
  }

  const weak = refreshed
    .filter((a) => (inbound2[a.slug] || 0) < 3)
    .sort((a, b) => (inbound2[a.slug] || 0) - (inbound2[b.slug] || 0));

  let boosts = 0;
  for (const weakArt of weak) {
    const donors = pickPeers(weakArt, refreshed, 4);
    for (const donor of donors) {
      // reload latest donor content from map we'll mutate
      const donorFresh = refreshed.find((x) => x.id === donor.id);
      if (!donorFresh) continue;
      if (new RegExp(`/blog/${weakArt.slug}(["'#?])`).test(donorFresh.content || '')) continue;
      const insert = ensureInboundLink(
        donorFresh.content,
        weakArt.slug,
        weakArt.title || titleFromSlug(weakArt.slug)
      );
      if (!insert) continue;
      // Place just before MARKER if present
      let html = donorFresh.content || '';
      if (html.includes(MARKER)) {
        html = html.replace(MARKER, `${insert}\n${MARKER}`);
      } else {
        html = html.trimEnd() + '\n' + insert;
      }
      donorFresh.content = html;
      await p.article.update({ where: { id: donorFresh.id }, data: { content: html } });
      boosts++;
      inbound2[weakArt.slug] = (inbound2[weakArt.slug] || 0) + 1;
    }
  }

  // Final stats
  const finalArts = await p.article.findMany({
    where: { status: 'published' },
    select: { slug: true, content: true },
  });
  const finalInbound = Object.fromEntries(finalArts.map((a) => [a.slug, 0]));
  let brokenLeft = 0;
  for (const a of finalArts) {
    const re = /href=["']\/blog\/([^"'#?]+)["']/gi;
    let m;
    while ((m = re.exec(a.content || ''))) {
      if (finalInbound[m[1]] !== undefined) finalInbound[m[1]]++;
      else brokenLeft++;
    }
  }
  const orphans = Object.entries(finalInbound).filter(([, n]) => n === 0);

  console.log('\nDone.');
  console.log('Hubs written:', hubs);
  console.log('Broken link retarget ops:', totalBrokenFixes);
  console.log('Weak-page boost inserts:', boosts);
  console.log('Remaining broken blog hrefs:', brokenLeft);
  console.log('Remaining orphans:', orphans.length, orphans.map(([s]) => s));
  console.log(
    'Inbound min/avg',
    Math.min(...Object.values(finalInbound)),
    (
      Object.values(finalInbound).reduce((s, n) => s + n, 0) /
      Object.values(finalInbound).length
    ).toFixed(1)
  );

  // Update CMS footer/resources navigation with pillar hubs if site_navigation exists
  const nav = await p.siteSetting.findUnique({ where: { key: 'site_navigation' } });
  if (nav?.value) {
    try {
      const parsed = JSON.parse(nav.value);
      const resources = parsed.footerSections?.find(
        (s) => s.titleKey === 'footer.resources' || s.title === 'Resources'
      );
      if (resources) {
        const extra = [
          { label: '12 Testers Policy', path: '/blog/google-play-12-testers-policy' },
          { label: 'Closed Testing Guide', path: '/blog/google-play-closed-testing' },
          { label: 'Find Beta Testers', path: '/blog/how-to-find-beta-testers-for-android-apps' },
          { label: 'App Rejected Help', path: '/blog/app-rejected-google-play' },
        ];
        const existingPaths = new Set((resources.links || []).map((l) => l.path));
        for (const link of extra) {
          if (!existingPaths.has(link.path)) resources.links.push(link);
        }
        await p.siteSetting.update({
          where: { key: 'site_navigation' },
          data: { value: JSON.stringify(parsed) },
        });
        console.log('Updated site_navigation footer resources with pillar links');
      }
      // header resources pillars
      if (Array.isArray(parsed.headerResources)) {
        const must = [
          { label: '12 Testers Policy', path: '/blog/google-play-12-testers-policy' },
          { label: 'Production Access Guide', path: '/blog/what-happens-after-14-days-of-closed-testing' },
        ];
        const paths = new Set(parsed.headerResources.map((l) => l.path));
        for (const link of must) {
          if (!paths.has(link.path)) parsed.headerResources.push(link);
        }
        await p.siteSetting.update({
          where: { key: 'site_navigation' },
          data: { value: JSON.stringify(parsed) },
        });
      }
    } catch (e) {
      console.warn('Nav update skipped:', e.message);
    }
  }

  await p.$disconnect();
})().catch(async (e) => {
  console.error(e);
  await p.$disconnect();
  process.exit(1);
});
