/**
 * Authority expansion — APPEND ONLY.
 * Never deletes or replaces existing article HTML.
 * Marker: <!-- authority-expand:v1:{slug} -->
 *
 * Usage: node scripts/expand-authority-v1.js [--limit=N] [--slug=foo] [--featured-only]
 */
const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

const p = new PrismaClient();
const MARKER_PREFIX = '<!-- authority-expand:v1:';

function wordCount(html) {
  return html.replace(/<[^>]+>/g, ' ').split(/\s+/).filter(Boolean).length;
}

function titleFromSlug(slug) {
  return slug
    .split('-')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

function humanTopic(title, slug) {
  return (title || titleFromSlug(slug)).replace(/\s*\|\s*Fast Testers.*$/i, '').trim();
}

function pickRelated(allSlugs, slug, n = 8) {
  const tokens = new Set(slug.split('-').filter((t) => t.length > 3));
  const scored = allSlugs
    .filter((s) => s !== slug)
    .map((s) => {
      const st = s.split('-');
      let score = 0;
      for (const t of st) if (tokens.has(t)) score += 1;
      return { s, score };
    })
    .sort((a, b) => b.score - a.score || a.s.localeCompare(b.s));
  const top = scored.filter((x) => x.score > 0).slice(0, n).map((x) => x.s);
  if (top.length >= n) return top;
  const rest = scored.filter((x) => !top.includes(x.s)).slice(0, n - top.length);
  return [...top, ...rest.map((x) => x.s)];
}

function scenarioBlock(topic) {
  return `
<h2 id="real-world-scenarios">Real-world scenarios: who this matters for</h2>
<p>The guidance in this article on <strong>${topic}</strong> applies across many Android product types. Use these scenarios to map the advice to your situation.</p>
<table>
<thead>
<tr><th>Developer type</th><th>Typical challenge</th><th>Practical focus</th></tr>
</thead>
<tbody>
<tr><td>Indie / solo</td><td>Limited tester network and time</td><td>Start closed testing early; keep a buffer above 12 opted-in testers; parallelize listing + Data safety work</td></tr>
<tr><td>Startup</td><td>Launch deadline vs 14-day rule</td><td>Treat the window as fixed; recruit in parallel with QA; avoid last-minute track setup</td></tr>
<tr><td>Agency / white-label</td><td>Multiple client apps, each needing its own test</td><td>One closed test per app; standardize opt-in onboarding; track eligibility dates per client</td></tr>
<tr><td>Flutter / React Native</td><td>Cross-platform build + Play Console quirks</td><td>Ship a signed AAB to closed testing; verify installs from Play, not sideload; watch vitals on mid-range devices</td></tr>
<tr><td>Native Kotlin</td><td>Device/API fragmentation</td><td>Cover API levels and OEMs in your tester mix; fix crashes before requesting production</td></tr>
<tr><td>Game / Unity</td><td>Performance + retention during 14 days</td><td>Keep testers engaged so count never dips below 12; monitor ANRs and battery</td></tr>
<tr><td>E-commerce / fintech</td><td>Policy + payment flows</td><td>Test checkout, permissions, and declarations carefully before production access</td></tr>
<tr><td>Healthcare / kids / education</td><td>Sensitive policies (Families, data)</td><td>Align listing, privacy, and content rating with real app behavior during the test window</td></tr>
</tbody>
</table>
<p><em>Visual placeholder:</em> Scenario matrix infographic — Indie / Startup / Agency / Cross-platform paths for ${topic}.</p>
`.trim();
}

function comparisonBlock(topic, category) {
  const cat = (category || '').toLowerCase();
  if (cat.includes('beta') || cat.includes('testing') || /tester|recruit|hire|buy|reddit|telegram|facebook|community|diy|service|fake|real|paid|free/.test(topic.toLowerCase())) {
    return `
<h2 id="comparison-paths">Comparison: DIY recruitment vs managed closed testing</h2>
<p>When your goal is Google Play production access, the path you choose for testers affects time, risk, and feedback quality. Use this comparison while deciding how to apply <strong>${topic}</strong>.</p>
<table>
<thead>
<tr><th>Approach</th><th>Time to 12 opted-in</th><th>Cost</th><th>Dropout risk</th><th>Feedback quality</th><th>Best when</th></tr>
</thead>
<tbody>
<tr><td>Friends &amp; family</td><td>Days–weeks</td><td>$0</td><td>High</td><td>Mixed</td><td>Tiny MVP, flexible timeline</td></tr>
<tr><td>Reddit / Discord / Telegram</td><td>Unpredictable</td><td>$0–low</td><td>High</td><td>Variable</td><td>You can manage onboarding daily</td></tr>
<tr><td>Peer community exchange</td><td>Variable</td><td>$0</td><td>Medium</td><td>Developer-biased</td><td>You can test others’ apps in return</td></tr>
<tr><td>Managed closed testing (e.g. Fast Testers)</td><td>~1 hour after valid link</td><td>$15 one-time / app</td><td>Low (buffer of 15)</td><td>Real Play installs</td><td>You need speed + continuity for 14 days</td></tr>
</tbody>
</table>
<p><strong>Decision tip:</strong> If a broken streak would delay revenue or a client deadline, prioritize reliability over $0 recruitment. DIY is fine when you already have engaged testers and can monitor Play Console daily.</p>
<p><em>Visual placeholder:</em> Comparison diagram — DIY vs community vs managed testing for ${topic}.</p>
`.trim();
  }
  if (cat.includes('reject') || /reject|eligib|policy|violation|terminat|crash/.test(topic.toLowerCase())) {
    return `
<h2 id="rejection-categories">Comparison: rejection / eligibility categories</h2>
<p>Problems related to <strong>${topic}</strong> usually fall into a few buckets. Classify first, then fix — mixing categories wastes review cycles.</p>
<table>
<thead>
<tr><th>Category</th><th>What Google is signaling</th><th>Primary fix</th><th>Avoid</th></tr>
</thead>
<tbody>
<tr><td>Testing eligibility</td><td>Closed test incomplete / not continuous</td><td>Restore 12+ opted-in for 14 continuous days</td><td>Requesting production early</td></tr>
<tr><td>Policy / content</td><td>App or listing violates Play policy</td><td>Change product/listing to comply</td><td>Resubmitting unchanged</td></tr>
<tr><td>Declarations</td><td>Data safety, permissions, or rating mismatch</td><td>Align forms with real behavior</td><td>Copy-pasting inaccurate answers</td></tr>
<tr><td>Stability / quality</td><td>Crashes, broken core flows</td><td>Fix build; re-test on closed track</td><td>Ignoring tester crash reports</td></tr>
<tr><td>Metadata / listing</td><td>Misleading or stuffed listing</td><td>Clean title, description, graphics</td><td>Keyword stuffing</td></tr>
</tbody>
</table>
<p><em>Visual placeholder:</em> Flowchart — diagnose rejection category → fix → retest → re-request.</p>
`.trim();
  }
  return `
<h2 id="track-comparison">Closed testing vs other Play tracks (quick reference)</h2>
<p>Context for <strong>${topic}</strong>: choose the right track so you do not waste the 14-day window on the wrong workflow.</p>
<table>
<thead>
<tr><th>Track</th><th>Purpose</th><th>Counts toward 12×14?</th><th>Typical use</th></tr>
</thead>
<tbody>
<tr><td>Internal testing</td><td>Fast private builds</td><td>No</td><td>Shake out bugs before the counted window</td></tr>
<tr><td>Closed testing</td><td>Private / invite testers</td><td>Yes (for new personal accounts)</td><td>Meet production-access requirement + QA</td></tr>
<tr><td>Open testing</td><td>Public beta</td><td>Not a substitute for the closed requirement</td><td>Broader feedback after closed eligibility</td></tr>
<tr><td>Production</td><td>Public release</td><td>N/A</td><td>After access approved + review</td></tr>
</tbody>
</table>
<p><em>Visual placeholder:</em> Timeline — Internal → Closed (14 days) → Production request → Staged rollout.</p>
`.trim();
}

function mistakesBlock(topic) {
  return `
<h2 id="common-mistakes-expanded">Common mistakes (and how to avoid them)</h2>
<p>These mistakes repeatedly show up when developers work through <strong>${topic}</strong>:</p>
<ul>
<li><strong>Confusing invited vs opted-in testers</strong> — Only testers who open the opt-in link and install from Play count toward 12. Check the opted-in number in Play Console, not your email list.</li>
<li><strong>Recruiting exactly 12 with no buffer</strong> — One uninstall can break continuity. Aim for ~15 active opted-in testers.</li>
<li><strong>Starting the counted clock late</strong> — Listing assets, Data safety, and privacy work should run <em>during</em> the 14 days, not after.</li>
<li><strong>Using sideloaded APKs or fake installs</strong> — They do not satisfy Play’s closed testing expectations and can create account risk.</li>
<li><strong>Ignoring tester feedback until day 14</strong> — Crashes that drive uninstalls threaten your streak and your review outcome.</li>
<li><strong>Requesting production access before the continuous streak completes</strong> — Eligibility checks fail even if calendar time has passed.</li>
</ul>
<div style="border-left:4px solid #3b82f6;padding:12px 16px;margin:16px 0;background:rgba(59,130,246,0.06);">
<strong>Expert tip:</strong> Screenshot your Play Console tester count daily for the first week. If it dips, replace testers the same day — do not wait until the end of the window.
</div>
`.trim();
}

function troubleshootingBlock(topic) {
  return `
<h2 id="troubleshooting">Troubleshooting checklist</h2>
<p>If something feels “stuck” while applying <strong>${topic}</strong>, walk this list before changing strategy:</p>
<table>
<thead>
<tr><th>Symptom</th><th>Likely cause</th><th>Fix</th></tr>
</thead>
<tbody>
<tr><td>Console shows &lt; 12 testers</td><td>Invites sent but not opted in</td><td>Resend opt-in link; confirm install from Play</td></tr>
<tr><td>“Not eligible” after 14 calendar days</td><td>Count dipped below 12 mid-window</td><td>Restore 12+ and complete a full continuous streak</td></tr>
<tr><td>Tester cannot join</td><td>Wrong account, Group lag, or track not published</td><td>Verify Google account, Group membership, track release</td></tr>
<tr><td>App fails to install</td><td>Device/API mismatch or signing issue</td><td>Check AAB, minSDK, Play App Signing</td></tr>
<tr><td>Production still rejected after testing</td><td>Policy, declarations, or stability — not the clock</td><td>Read the exact reason; fix that category completely</td></tr>
</tbody>
</table>
<p><em>Visual placeholder:</em> Troubleshooting flowchart for ${topic}.</p>
`.trim();
}

function checklistBlock(topic) {
  return `
<h2 id="action-checklist">Action checklist</h2>
<p>Use this checklist alongside the rest of this guide on <strong>${topic}</strong>:</p>
<ul>
<li>☐ Closed testing track created with a signed release (AAB)</li>
<li>☐ Opt-in link tested on a fresh Google account</li>
<li>☐ At least 12 testers <em>opted in</em> (prefer ~15)</li>
<li>☐ Daily check that opted-in count stays ≥ 12 for 14 continuous days</li>
<li>☐ Core flows exercised (login, main feature, permissions, offline/online)</li>
<li>☐ Crashes / ANRs triaged from tester reports and vitals</li>
<li>☐ Store listing, screenshots, and feature graphic drafted</li>
<li>☐ Privacy policy + Data safety + content rating aligned with real behavior</li>
<li>☐ Production access requested only after eligibility is green</li>
<li>☐ Staged rollout plan ready for first public release</li>
</ul>
`.trim();
}

function faqBlock(topic, existingHasFaq) {
  const heading = existingHasFaq
    ? `<h2 id="faq-expanded">Additional FAQs developers ask about ${topic}</h2>`
    : `<h2 id="faq">Frequently asked questions about ${topic}</h2>`;
  return `
${heading}
<h3>Quick answer: what should I do first?</h3>
<p><strong>Confirm you are on a closed testing track with real opted-in installs, keep 12+ testers for 14 continuous days, and fix policy/stability issues in parallel.</strong> Then use the detailed sections above for ${topic}.</p>
<h3>Does this apply to organization (company) accounts?</h3>
<p>The classic 12×14 closed testing gate is primarily associated with new personal developer accounts. Always verify your account type and current Play Console eligibility messaging for your app.</p>
<h3>Do friends and family count as testers?</h3>
<p>Yes — if they opt in via your closed testing link and install from Google Play. They only help if they stay opted in for the continuous period.</p>
<h3>Can I update the app during the 14 days?</h3>
<p>You can usually push updates on the closed track, but unstable releases that cause uninstalls can threaten your tester count. Prefer polishing via internal testing first when possible.</p>
<h3>What if production access is still rejected?</h3>
<p>Read the exact reason. Incomplete testing is only one category — policy, Data safety mismatches, and crashes are common. Fix the cited issue fully before reapplying.</p>
<h3>Is paying for testers allowed?</h3>
<p>Using real people who install from Play is what matters. Avoid fake install farms. A one-time managed service that supplies real closed testers is a practical option when DIY recruitment is too slow.</p>
<h3>How is Fast Testers different from free communities?</h3>
<p>Free communities trade time and mutual availability. Fast Testers assigns about 15 real testers after you submit a valid closed testing link (one-time $15 per app) and includes a production access guarantee under its refund terms.</p>
<h3>Where should I go next?</h3>
<p>Review the related guides below, then either finish DIY recruitment or <a href="https://app.fasttesters.com/">start closed testing</a> if you need speed and continuity.</p>
`.trim();
}

function takeawaysBlock(topic) {
  return `
<h2 id="key-takeaways">Key takeaways</h2>
<ul>
<li><strong>${topic}</strong> should be treated as a practical Play Console workflow, not just theory.</li>
<li>For many new personal accounts, <strong>12 opted-in testers × 14 continuous days</strong> on closed testing gates production access.</li>
<li>Opt-in + install from Play beats “emails invited” every time — verify counts in Console.</li>
<li>Use the window for QA, listing, and compliance work so review is the only remaining gate.</li>
<li>Prefer real testers and a buffer above 12; avoid anything that looks like fake engagement.</li>
</ul>
`.trim();
}

function quickAnswerBlock(topic) {
  return `
<h2 id="quick-answer">Quick answer</h2>
<p><strong>${topic}</strong> matters because Google Play production access for many new personal developer accounts depends on a successful closed test: at least <strong>12 real testers opted in for 14 continuous days</strong>, plus a policy-compliant, stable app. Use this guide to execute the steps correctly, avoid streak-breaking mistakes, and decide whether DIY recruitment or a managed closed testing service is the better path for your deadline.</p>
`.trim();
}

function eeatBlock(topic) {
  return `
<h2 id="sources-trust">Sources, updates, and how to use this guide</h2>
<p>This article on <strong>${topic}</strong> is maintained for Android developers preparing Google Play closed testing and production access. Always cross-check eligibility text inside your own Play Console, because Google’s UI labels and account rules can vary by account type and date.</p>
<ul>
<li><strong>Primary official references:</strong> <a href="https://support.google.com/googleplay/android-developer/answer/9859152">Google Play closed testing help</a>, <a href="https://play.google.com/about/developer-content-policy/">Developer Program Policies</a>, and Play Console eligibility messaging for your app.</li>
<li><strong>Practical experience lens:</strong> guidance here reflects common failure modes indie developers and agencies hit when recruiting testers, maintaining the 14-day streak, and recovering from production-access rejections.</li>
<li><strong>Last reviewed focus:</strong> 12×14 closed testing continuity, real vs fake testers, and parallel listing/compliance work during the window.</li>
</ul>
`.trim();
}

function relatedBlock(topic, relatedSlugs) {
  const items = relatedSlugs
    .map((s) => `<li><a href="/blog/${s}">${titleFromSlug(s)}</a></li>`)
    .join('\n');
  return `
<h2 id="related-guides">Related guides and next steps</h2>
<p>Continue building topical depth around <strong>${topic}</strong> with these Fast Testers resources:</p>
<ul>
${items}
<li><a href="/pricing">Pricing — $15 closed testing</a></li>
<li><a href="/how-it-works">How Fast Testers works</a></li>
<li><a href="/faq">FAQ</a></li>
<li><a href="/reviews">Developer reviews</a></li>
<li><a href="/case-studies">Case studies</a></li>
<li><a href="https://app.fasttesters.com/">Submit your app / start closed testing</a></li>
</ul>
<p>Need reliable testers so your 14-day streak does not stall? Educate first with the guides above, then start when you are ready — one-time pricing, real Play installs, dashboard tracking.</p>
`.trim();
}

function buildAppend({ title, slug, category, content, allSlugs }) {
  const topic = humanTopic(title, slug);
  const hasFaq = /frequently asked|id=["']faq["']|<h2[^>]*>\s*FAQ/i.test(content);
  const hasTakeaways = /key takeaways|id=["']key-takeaways["']/i.test(content);
  const hasQuick = /quick answer|id=["']quick-answer["']/i.test(content);
  const hasTroubleshoot = /troubleshooting|id=["']troubleshooting["']/i.test(content);
  const hasChecklist = /action checklist|id=["']action-checklist["']|before publishing checklist/i.test(content);
  const hasScenarios = /real-world scenarios|id=["']real-world-scenarios["']/i.test(content);
  const related = pickRelated(allSlugs, slug, 8);

  const parts = [];
  parts.push(`<hr />`);
  parts.push(`<p><em>Expanded for topical authority — additional practical sections below. Original guide content above is unchanged.</em></p>`);
  if (!hasQuick) parts.push(quickAnswerBlock(topic));
  if (!hasTakeaways) parts.push(takeawaysBlock(topic));
  if (!hasScenarios) parts.push(scenarioBlock(topic));
  parts.push(comparisonBlock(topic, category));
  parts.push(mistakesBlock(topic));
  if (!hasTroubleshoot) parts.push(troubleshootingBlock(topic));
  if (!hasChecklist) parts.push(checklistBlock(topic));
  parts.push(faqBlock(topic, hasFaq));
  parts.push(eeatBlock(topic));
  parts.push(relatedBlock(topic, related));
  return parts.join('\n\n');
}

function parseArgs(argv) {
  const out = { limit: null, slug: null, featuredOnly: false, minWords: 0, maxWords: 2499 };
  for (const a of argv.slice(2)) {
    if (a.startsWith('--limit=')) out.limit = Number(a.split('=')[1]);
    if (a.startsWith('--slug=')) out.slug = a.split('=')[1];
    if (a === '--featured-only') out.featuredOnly = true;
    if (a.startsWith('--max-words=')) out.maxWords = Number(a.split('=')[1]);
    if (a.startsWith('--min-words=')) out.minWords = Number(a.split('=')[1]);
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
      category: true,
      featured: true,
      content: true,
      readTime: true,
    },
    orderBy: [{ featured: 'desc' }, { createdAt: 'asc' }],
  });

  const allSlugs = articles.map((a) => a.slug);
  let targets = articles.filter((a) => {
    const w = wordCount(a.content || '');
    if (args.slug) return a.slug === args.slug;
    if (args.featuredOnly && !a.featured) return false;
    return w >= args.minWords && w <= args.maxWords;
  });
  if (args.limit) targets = targets.slice(0, args.limit);

  console.log(`Targets: ${targets.length}`);
  const results = [];

  for (const a of targets) {
    const marker = `${MARKER_PREFIX}${a.slug} -->`;
    const append = buildAppend({
      title: a.title,
      slug: a.slug,
      category: a.category,
      content: a.content || '',
      allSlugs,
    });

    let base = a.content || '';
    if (base.includes(marker)) {
      const idx = base.indexOf(marker);
      base = base.slice(0, idx).trimEnd();
    }

    const newContent = `${base.trimEnd()}\n\n${marker}\n${append}\n`;
    const before = wordCount(a.content || '');
    const after = wordCount(newContent);
    const readTimeMins = Math.max(8, Math.min(25, Math.round(after / 220)));

    await p.article.update({
      where: { id: a.id },
      data: {
        content: newContent,
        readTime: `${readTimeMins} min read`,
      },
    });

    results.push({ slug: a.slug, before, after, added: after - before });
    console.log(
      `UPDATED ${String(before).padStart(5)} → ${String(after).padStart(5)} (+${after - before}) | ${a.slug}`
    );
  }

  const summaryPath = path.join(__dirname, 'authority-expand-v1-summary.json');
  fs.writeFileSync(summaryPath, JSON.stringify(results, null, 2));
  console.log(`\nDone. ${results.length} articles expanded. Summary: ${summaryPath}`);
  await p.$disconnect();
})().catch(async (e) => {
  console.error(e);
  await p.$disconnect();
  process.exit(1);
});
