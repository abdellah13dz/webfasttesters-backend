/**
 * Safe SEO DB sync — extends/optimizes CMS SEO fields without deleting content.
 * Aligns default_seo with frontend SEO defaults and tightens SERP-length metadata.
 */
const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();

const DEFAULT_SEO = {
  siteUrl: 'https://fasttesters.com',
  title:
    'Fast Testers | Google Play Closed Testing Service — 12 Testers for 14 Days',
  description:
    'Get Google Play production access with 12 testers for 14 days! Professional Google Play Closed Testing service: 15 quality testers for $15 with production access. Trusted by 1,500+ developers.',
  keywords:
    'Google Play closed testing, 12 testers for Google Play, Google Play 12 Testers, 14 Day Closed Testing, android app testing, app testing service, App Testing for Google Play Store, google play testing service, mobile app testing, qa testers for apps, Google Play production access, Need testers for Google Play, google play testers, android app testers, Real Android Testers, Google Play App Approval, Google Play Testing Requirements, google play compliance testing, play store testing, app beta testing, google play app rejected testing, Get Your App Ready for Launch, google play 12 testers policy, fast testers, google play console, publish app on playstore, quality testers',
  ogImage: '/logo/android-chrome-512x512.png',
};

const LEGAL_PAGE_SEO = {
  'privacy-policy': {
    seoTitle: 'Privacy Policy - Fast Testers | Data Protection & Privacy',
    seoDescription:
      'Learn how Fast Testers handles your data, protects your privacy, and ensures security for your app testing information and personal details.',
    seoKeywords:
      'Fast Testers privacy policy, data protection, app testing privacy',
  },
  'terms-and-conditions': {
    seoTitle: 'Terms and Conditions - Fast Testers | Service Agreement',
    seoDescription:
      'Read the Fast Testers terms and conditions covering our app testing service, user responsibilities, payment terms, and Google Play compliance services.',
    seoKeywords:
      'Fast Testers terms, service agreement, app testing terms',
  },
};

/** Trim SEO titles that exceed ~60–65 ideal SERP length without changing meaning. */
const TITLE_FIXES = {
  'case-study-first-app-published-in-16-days-with-fast-testers':
    'Case Study: First App Published in 16 Days | Fast Testers',
  'crash-reports-during-closed-testing-fix-before-production':
    'Crash Reports in Closed Testing: Fix Before Production',
};

/** Trim meta descriptions to ~155 chars for full SERP display. */
const DESC_FIXES = {
  'google-play-closed-testing-guide-how-to-get-12-testers-for-14-days':
    'Stuck on Google Play closed testing? Learn how to recruit 12 active testers, keep them engaged for 14 days, and pass production review.',
  'app-rejected-google-play':
    'Got your Android app rejected or suspended? Learn common Google Play policy violations, how to read console logs, and a safe resubmission path.',
  'updating-your-app-mid-closed-testing-period':
    'Uploading a new build mid closed test? Learn whether updates reset the 14-day clock and how to ship safely without losing tester progress.',
  'bootstrapped-developer-play-store-launch-on-15':
    'Launch on Google Play on a tight budget: the $25 fee, the 12-tester / 14-day rule, and free or $15 ways to complete closed testing.',
  'privacy-policy-requirements-for-google-play-apps':
    'What your Google Play privacy policy must include, how it ties to Data safety, and how to prepare it during closed testing to avoid rejection.',
  'why-google-rejected-my-production-access-request':
    'Google rejected your production access after closed testing? Top rejection reasons and exactly how to fix each one before you reapply.',
  'startup-guide-launch-android-app-on-play-store-fast':
    'Startup guide to launching on Google Play fast: the 12-tester, 14-day closed-testing rule and how to parallelize everything else.',
};

(async () => {
  console.log('Updating default_seo...');
  await p.siteSetting.upsert({
    where: { key: 'default_seo' },
    create: { key: 'default_seo', value: JSON.stringify(DEFAULT_SEO) },
    update: { value: JSON.stringify(DEFAULT_SEO) },
  });

  // Keep empty overrides object (do not invent page overrides that could fight SSR metadata).
  await p.siteSetting.upsert({
    where: { key: 'page_seo_overrides' },
    create: { key: 'page_seo_overrides', value: '{}' },
    update: { value: '{}' },
  });

  // Fix inaccurate banner copy (15 testers, not 14) — E-E-A-T / product accuracy.
  const banner = await p.siteSetting.findUnique({
    where: { key: 'announcement_banner' },
  });
  if (banner?.value) {
    let parsed;
    try {
      parsed = JSON.parse(banner.value);
    } catch {
      parsed = null;
    }
    if (parsed && typeof parsed.message === 'string') {
      const nextMessage = parsed.message
        .replace('14 professional testers', '15 professional testers')
        .replace('14 quality testers', '15 quality testers');
      if (nextMessage !== parsed.message) {
        parsed.message = nextMessage;
        await p.siteSetting.update({
          where: { key: 'announcement_banner' },
          data: { value: JSON.stringify(parsed) },
        });
        console.log('Updated announcement_banner tester count to 15.');
      }
    }
  }

  console.log('Updating CMS legal page SEO...');
  for (const [slug, seo] of Object.entries(LEGAL_PAGE_SEO)) {
    const result = await p.page.updateMany({
      where: { slug },
      data: {
        seoTitle: seo.seoTitle,
        seoDescription: seo.seoDescription,
        seoKeywords: seo.seoKeywords,
      },
    });
    console.log(`  ${slug}: ${result.count} row(s)`);
  }

  console.log('Trimming long article SEO titles...');
  for (const [slug, seoTitle] of Object.entries(TITLE_FIXES)) {
    const result = await p.article.updateMany({
      where: { slug },
      data: { seoTitle },
    });
    console.log(`  title ${slug}: ${result.count} (${seoTitle.length} chars)`);
  }

  console.log('Trimming long article SEO descriptions...');
  for (const [slug, seoDescription] of Object.entries(DESC_FIXES)) {
    const result = await p.article.updateMany({
      where: { slug },
      data: { seoDescription },
    });
    console.log(
      `  desc ${slug}: ${result.count} (${seoDescription.length} chars)`
    );
  }

  // Verify
  const missing = await p.article.count({
    where: {
      status: 'published',
      OR: [{ seoTitle: null }, { seoTitle: '' }, { seoDescription: null }, { seoDescription: '' }],
    },
  });
  const stillLongTitle = await p.article.findMany({
    where: { status: 'published' },
    select: { slug: true, seoTitle: true, title: true },
  });
  const longT = stillLongTitle.filter(
    (a) => (a.seoTitle || a.title || '').length > 70
  );
  const stillLongDesc = (
    await p.article.findMany({
      where: { status: 'published' },
      select: { slug: true, seoDescription: true, description: true },
    })
  ).filter((a) => (a.seoDescription || a.description || '').length > 165);

  console.log('\nVerification:');
  console.log('  articles missing SEO fields:', missing);
  console.log('  titles >70 remaining:', longT.length, longT.map((a) => a.slug));
  console.log(
    '  descs >165 remaining:',
    stillLongDesc.length,
    stillLongDesc.map((a) => a.slug)
  );

  const defaultAfter = await p.siteSetting.findUnique({
    where: { key: 'default_seo' },
  });
  console.log('  default_seo:', defaultAfter?.value?.slice(0, 180), '...');

  await p.$disconnect();
  console.log('\nDone.');
})().catch(async (e) => {
  console.error(e);
  await p.$disconnect();
  process.exit(1);
});
