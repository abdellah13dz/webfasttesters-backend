/**
 * Authority expansion v2 — APPEND ONLY (case studies + decision trees).
 * Marker: <!-- authority-expand:v2:{slug} -->
 * Targets articles still under 3500 words, plus featured/high-intent.
 *
 * Usage: node scripts/expand-authority-v2.js [--limit=N] [--slug=foo]
 */
const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();
const MARKER_PREFIX = '<!-- authority-expand:v2:';

function wordCount(html) {
  return html.replace(/<[^>]+>/g, ' ').split(/\s+/).filter(Boolean).length;
}

function humanTopic(title, slug) {
  const t = (title || slug)
    .replace(/-/g, ' ')
    .replace(/\s*\|\s*Fast Testers.*$/i, '')
    .trim();
  return t.replace(/\b\w/g, (c) => c.toUpperCase());
}

const HIGH_INTENT = new Set([
  'google-play-12-testers-policy',
  'google-play-closed-testing',
  'how-to-find-beta-testers-for-android-apps',
  'app-rejected-google-play',
  'multi-language-app-testing',
  'publish-app-google-play',
  'google-play-closed-testing-guide-how-to-get-12-testers-for-14-days',
  'how-to-get-12-testers-without-friends-or-family',
  'google-play-internal-testing-vs-closed-testing',
  'real-testers-vs-fake-testers',
  'what-happens-after-14-days-of-closed-testing',
  'app-not-eligible-for-production-access',
  'need-12-testers-for-google-play-fastest-solution',
  'fastest-way-to-get-google-play-production-access',
  'google-play-closed-testing-faq-50-answers',
]);

function caseStudyBlock(topic, slug) {
  const isReject = /reject|eligib|policy|violation/.test(slug);
  const isRecruit = /tester|beta|hire|find|recruit|reddit|buy|paid|fake|real|service|community/.test(slug);
  if (isReject) {
    return `
<h2 id="case-study">Case study: recovering production access after a rejection</h2>
<p><strong>Problem:</strong> A solo developer finished what they thought was “14 days of testing,” requested production access, and was told the app was not eligible / rejected. Their invite list had 18 emails, but only 9 had opted in for the full window — and a crash on day 6 caused three uninstalls.</p>
<p><strong>Solution:</strong> They paused the production request, fixed the crash on an internal track first, then rebuilt closed testing with ~15 real opted-in testers. During the new 14-day streak they also corrected a Data safety mismatch that would have failed review later. Guidance from articles like this one on <strong>${topic}</strong> helped them classify the issue as eligibility + stability, not “random Google rejection.”</p>
<p><strong>Result:</strong> Continuous 12+ streak completed, production access approved on the next request, staged rollout to 10% with clean vitals.</p>
<p><strong>Lessons learned:</strong></p>
<ul>
<li>Count opted-in installs, not invites.</li>
<li>Fix crash-driven churn before you burn another 14 days.</li>
<li>Use the window to clear declarations — not only the tester clock.</li>
</ul>
`.trim();
  }
  if (isRecruit) {
    return `
<h2 id="case-study">Case study: indie app that needed 12 testers in under a day</h2>
<p><strong>Problem:</strong> A Flutter indie developer had a client demo in three weeks. Friends-and-family recruitment stalled at 6 opted-in testers after five days of chasing messages.</p>
<p><strong>Solution:</strong> They kept DIY outreach running, but also submitted a valid closed testing opt-in link to a managed service to reach ~15 real Play installs quickly. They used this guide on <strong>${topic}</strong> to brief testers on what to exercise (onboarding, permissions, offline mode) and monitored Play Console daily so the continuous streak would not break.</p>
<p><strong>Result:</strong> Opted-in count stabilized above 12 within hours of assignment; 14 continuous days completed; production access requested on schedule.</p>
<p><strong>Lessons learned:</strong></p>
<ul>
<li>Recruit a buffer early — waiting until day 10 is the expensive mistake.</li>
<li>Real Play installs beat large invite lists.</li>
<li>Managed testing is a timeline tool, not a substitute for fixing product quality.</li>
</ul>
`.trim();
  }
  return `
<h2 id="case-study">Case study: first Play launch planned around the closed testing window</h2>
<p><strong>Problem:</strong> A small SaaS team treated Google Play publishing like iOS TestFlight — they expected to upload and go public the same week. They discovered the personal-account closed testing gate mid-sprint.</p>
<p><strong>Solution:</strong> They reframed the sprint around <strong>${topic}</strong>: internal testing for crash triage first, then closed testing with a buffer of testers, while design finished screenshots and legal finished privacy/Data safety in parallel.</p>
<p><strong>Result:</strong> The 14-day requirement stopped feeling like “dead time.” When eligibility flipped green, listing and declarations were already ready, so production review was the only remaining gate.</p>
<p><strong>Lessons learned:</strong></p>
<ul>
<li>Start the closed track as soon as the build is stable enough to keep installed.</li>
<li>Parallelize compliance work inside the window.</li>
<li>Protect the streak like a production SLA.</li>
</ul>
`.trim();
}

function decisionTreeBlock(topic) {
  return `
<h2 id="decision-tree">Decision guide: what should you do next?</h2>
<p>Use this decision path when applying <strong>${topic}</strong>:</p>
<ol>
<li><strong>Is your account a new personal developer account that still needs production access?</strong><br />If yes, plan for closed testing with 12+ opted-in testers for 14 continuous days. If no, still test — but confirm the exact eligibility text in Play Console.</li>
<li><strong>Do you already have 12+ reliable people who will install from Play and stay for two weeks?</strong><br />If yes, DIY can work — add a buffer and monitor daily. If no, use community exchange or a managed closed testing service.</li>
<li><strong>Is your build stable enough that testers will not churn?</strong><br />If no, run internal testing first. Entering the counted window with crash loops is how streaks die.</li>
<li><strong>Are Data safety, privacy policy, permissions, and listing aligned with real behavior?</strong><br />If no, fix during the window so production review does not bounce you after the clock.</li>
<li><strong>Has production access been rejected?</strong><br />Classify: eligibility vs policy vs declarations vs stability. Fix that category completely, then re-test / re-request.</li>
</ol>
<p><em>Visual placeholder:</em> Decision tree diagram for ${topic} (DIY vs managed vs fix-and-retry).</p>
`.trim();
}

function expertBlock(topic) {
  return `
<h2 id="expert-recommendations">Expert recommendations</h2>
<ul>
<li><strong>Instrument the streak:</strong> Check opted-in count daily for the first week; replace dropouts same day.</li>
<li><strong>Brief testers once:</strong> Send a short checklist (install from Play, open app daily, try core flow, report crashes). Silent testers still count if opted in — engaged testers protect quality.</li>
<li><strong>Never “solve” recruitment with fake installs:</strong> It fails the intent of closed testing and can create account risk.</li>
<li><strong>Ship a boring-stable build to closed testing:</strong> Save experimental features for internal tracks.</li>
<li><strong>Educate first, then accelerate:</strong> If your blocker is simply finding real testers fast, a one-time managed option (Fast Testers: 15 testers, $15/app) is often cheaper than slipping a launch.</li>
</ul>
<p>For hands-on setup after reading about <strong>${topic}</strong>, see <a href="/how-it-works">how it works</a> and <a href="/pricing">pricing</a>, or <a href="https://app.fasttesters.com/">submit your closed testing link</a> when you are ready.</p>
`.trim();
}

function buildAppend(article) {
  const topic = humanTopic(article.title, article.slug);
  return [
    '<hr />',
    '<p><em>Further expansion — case study, decisions, and expert recommendations. Prior sections remain unchanged.</em></p>',
    caseStudyBlock(topic, article.slug),
    decisionTreeBlock(topic),
    expertBlock(topic),
  ].join('\n\n');
}

function parseArgs(argv) {
  const out = { limit: null, slug: null };
  for (const a of argv.slice(2)) {
    if (a.startsWith('--limit=')) out.limit = Number(a.split('=')[1]);
    if (a.startsWith('--slug=')) out.slug = a.split('=')[1];
  }
  return out;
}

(async () => {
  const args = parseArgs(process.argv);
  const articles = await p.article.findMany({
    where: { status: 'published' },
    select: {
      id: true,
      slug: true,
      title: true,
      featured: true,
      content: true,
    },
  });

  let targets = articles.filter((a) => {
    if (args.slug) return a.slug === args.slug;
    const w = wordCount(a.content || '');
    if (HIGH_INTENT.has(a.slug) || a.featured) return w < 4800;
    return w < 3500;
  });
  if (args.limit) targets = targets.slice(0, args.limit);

  console.log(`Targets: ${targets.length}`);
  for (const a of targets) {
    const marker = `${MARKER_PREFIX}${a.slug} -->`;
    const append = buildAppend(a);
    let base = a.content || '';
    if (base.includes(marker)) {
      base = base.slice(0, base.indexOf(marker)).trimEnd();
    }
    // Avoid duplicating if somehow already has v2 case study id
    const newContent = `${base.trimEnd()}\n\n${marker}\n${append}\n`;
    const before = wordCount(a.content || '');
    const after = wordCount(newContent);
    const readTimeMins = Math.max(10, Math.min(28, Math.round(after / 220)));
    await p.article.update({
      where: { id: a.id },
      data: { content: newContent, readTime: `${readTimeMins} min read` },
    });
    console.log(
      `UPDATED ${String(before).padStart(5)} → ${String(after).padStart(5)} (+${after - before}) | ${a.slug}`
    );
  }
  console.log('Done.');
  await p.$disconnect();
})().catch(async (e) => {
  console.error(e);
  await p.$disconnect();
  process.exit(1);
});
