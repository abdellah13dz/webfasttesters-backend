/**
 * Seed blog articles and FAQ items into PostgreSQL.
 * Usage: DATABASE_URL="..." npx tsx scripts/seed-seo-content.ts
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const FAQ_ITEMS = [
  {
    category: 'Google Play',
    question: 'Will Google accept this?',
    answer:
      'Yes. Fast Testers provides real Android users who install your app through Google Play closed testing — exactly what Google requires for the 14-day, 12-tester production access rule.',
    sortOrder: 1,
  },
  {
    category: 'Testers',
    question: 'Are testers real?',
    answer:
      'Yes. Every tester is a real person with a genuine Android device and Google account. They install your app from the Play Store closed testing track.',
    sortOrder: 2,
  },
  {
    category: 'Testing',
    question: 'Do testers install my app?',
    answer:
      'Yes. Testers join your closed testing track and install your app from Google Play — the same flow Google monitors for production access.',
    sortOrder: 3,
  },
  {
    category: 'Publishing',
    question: 'Can I publish immediately?',
    answer:
      'You must complete 14 consecutive days of closed testing with at least 12 testers before requesting production access. Fast Testers assigns testers in ~1 hour so you can start immediately.',
    sortOrder: 4,
  },
  {
    category: 'Setup',
    question: 'Do I need to invite testers?',
    answer:
      'No manual recruiting required. Submit your closed testing link after payment and professional testers are assigned automatically.',
    sortOrder: 5,
  },
  {
    category: 'Guarantee',
    question: 'What if production is rejected?',
    answer:
      'Fast Testers includes a production access guarantee. If your app does not reach production after our testing period, you receive a full refund per our refund policy.',
    sortOrder: 6,
  },
];

function slugify(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 80);
}

function articleBody(title: string, topic: string): string {
  return `# ${title}

Google Play closed testing is a mandatory step for most new personal developer accounts. This guide covers **${topic}** and how Fast Testers helps you comply without weeks of recruiting.

## Why this matters

Personal developer accounts created after November 2023 must run closed testing with at least **12 testers for 14 consecutive days** before requesting production access. Skipping or faking this step leads to rejected production applications and delayed launches.

## What Google checks

Google verifies that real users opt into your closed testing track, install your app from the Play Store, and remain enrolled during the testing window. Emulator installs, sideloaded APKs, and install farms do not count.

## Step-by-step compliance

1. Upload your app to the **Closed testing** track in Play Console
2. Generate your opt-in URL from the Testers tab
3. Recruit 12–15 reliable testers (Fast Testers assigns 15 in ~1 hour for $15)
4. Monitor installs daily for 14 consecutive days
5. Apply for production access with testing evidence

## Common mistakes

- Using internal testing instead of closed testing
- Dropping below 12 testers mid-period
- Requesting production access before day 14
- Sharing APK files instead of Play Store opt-in links

## How Fast Testers helps

Fast Testers is a one-time **$15 per app** service with no subscription. You receive 15 professional Android testers for 16 days, dashboard tracking, and reports so you can complete Google’s 12 testers / 14 consecutive days requirement and apply for production access. Google decides approval.

## FAQ

**How fast do testers start?** Typically within one hour after you submit your closed testing link.

**Is this against Google policy?** No. Closed testing with invited external testers is explicitly supported.

**What if my app is rejected for policy reasons?** Fix policy issues and resubmit. Your completed testing period still counts toward the requirement.

## Get started

[Start Closed Testing →](https://app.fasttesters.com/)

Related: [12 Testers Guide](https://fasttesters.com/google-play-12-testers) · [14-Day Testing](https://fasttesters.com/google-play-14-day-testing) · [Pricing](https://fasttesters.com/pricing)
`;
}

const ARTICLE_TOPICS: { title: string; topic: string; category: string }[] = [
  { title: 'Google Play 12 Testers Explained for Indie Developers', topic: 'the 12-tester minimum', category: 'Google Play' },
  { title: 'How Long Does Google Play Closed Testing Take?', topic: 'testing timelines', category: 'Testing' },
  { title: 'Closed Testing vs Open Testing on Google Play', topic: 'testing track differences', category: 'Google Play' },
  { title: 'What Happens After 14 Days of Closed Testing?', topic: 'post-testing production access', category: 'Publishing' },
  { title: 'Google Play Production Access Rejection Reasons', topic: 'common rejection causes', category: 'Publishing' },
  { title: 'How to Create a Closed Testing Track in Play Console', topic: 'Play Console setup', category: 'Setup' },
  { title: 'Best Way to Find Android Beta Testers in 2026', topic: 'tester recruitment strategies', category: 'Testing' },
  { title: 'Google Play Personal Account vs Organization Account', topic: 'account type differences', category: 'Google Play' },
  { title: 'Do Friends Count as Google Play Testers?', topic: 'friends and family as testers', category: 'Testing' },
  { title: 'Reddit Beta Testers: Pros and Cons for Play Store', topic: 'Reddit recruitment', category: 'Testing' },
  { title: 'How Many Testers Do You Need for Google Play?', topic: 'tester count requirements', category: 'Google Play' },
  { title: 'Google Play Closed Testing Opt-In Link Setup', topic: 'opt-in URL configuration', category: 'Setup' },
  { title: 'Testing Android Games for Google Play Production', topic: 'game app testing', category: 'Testing' },
  { title: 'Testing Utility Apps: Play Store Compliance Tips', topic: 'utility app testing', category: 'Testing' },
  { title: 'Multi-Language Apps and Google Play Closed Testing', topic: 'localization testing', category: 'Testing' },
  { title: 'Google Play Data Safety Form and Closed Testing', topic: 'data safety requirements', category: 'Compliance' },
  { title: 'Target API Level Requirements for Google Play 2026', topic: 'API level compliance', category: 'Compliance' },
  { title: 'App Rejected for Insufficient Testing: What to Do', topic: 'insufficient testing rejections', category: 'Publishing' },
  { title: 'How to Monitor Closed Testing Progress in Play Console', topic: 'Play Console metrics', category: 'Setup' },
  { title: 'First App on Google Play: Complete Checklist', topic: 'first-time publishing', category: 'Setup' },
  { title: 'Google Play Closed Testing for Flutter Apps', topic: 'Flutter app testing', category: 'Development' },
  { title: 'Google Play Closed Testing for React Native Apps', topic: 'React Native testing', category: 'Development' },
  { title: 'Unity Games and Google Play 14-Day Testing Rule', topic: 'Unity game testing', category: 'Development' },
  { title: 'Kotlin Android Apps: Closed Testing Best Practices', topic: 'native Android testing', category: 'Development' },
  { title: 'How to Write Closed Testing Release Notes', topic: 'release notes for testers', category: 'Setup' },
  { title: 'Google Play Internal Testing vs Closed Testing', topic: 'internal vs closed tracks', category: 'Google Play' },
  { title: 'When Can You Request Google Play Production Access?', topic: 'production access timing', category: 'Publishing' },
  { title: 'Google Play Closed Testing Email Templates for Testers', topic: 'tester communication', category: 'Testing' },
  { title: 'Avoiding Tester Dropout During 14-Day Testing', topic: 'tester retention', category: 'Testing' },
  { title: 'Google Play Testing Requirements by Country', topic: 'regional requirements', category: 'Google Play' },
  { title: 'Sideloading vs Play Store Testing: Why It Matters', topic: 'install method compliance', category: 'Compliance' },
  { title: 'Google Play Closed Testing for SaaS Android Apps', topic: 'SaaS app testing', category: 'Testing' },
  { title: 'Fitness Apps and Google Play Beta Testing Rules', topic: 'health app testing', category: 'Testing' },
  { title: 'Finance Apps: Google Play Testing and Compliance', topic: 'finance app requirements', category: 'Compliance' },
  { title: 'Kids Apps and Google Play Families Policy Testing', topic: 'family policy apps', category: 'Compliance' },
  { title: 'VPN Apps and Google Play Closed Testing Challenges', topic: 'VPN app testing', category: 'Compliance' },
  { title: 'WebView Wrapper Apps: Google Play Testing Guide', topic: 'WebView app testing', category: 'Development' },
  { title: 'How Google Detects Fake Testers and Install Farms', topic: 'fake tester detection', category: 'Compliance' },
  { title: 'Agency Guide: Testing Client Apps on Google Play', topic: 'agency multi-app testing', category: 'Business' },
  { title: 'Startup Guide: Launch Android App on Play Store Fast', topic: 'startup launch strategy', category: 'Business' },
  { title: 'Bootstrapped Developer Play Store Launch on $15', topic: 'budget-friendly testing', category: 'Business' },
  { title: 'Google Play Closed Testing Dashboard Metrics Explained', topic: 'dashboard analytics', category: 'Setup' },
  { title: 'Crash Reports During Closed Testing: Fix Before Production', topic: 'ANR and crash handling', category: 'Development' },
  { title: 'Updating Your App Mid Closed Testing Period', topic: 'mid-period updates', category: 'Testing' },
  { title: 'Google Play Store Listing Optimization Before Launch', topic: 'ASO before production', category: 'Marketing' },
  { title: 'Privacy Policy Requirements for Google Play Apps', topic: 'privacy policy setup', category: 'Compliance' },
  { title: 'Google Play Developer Identity Verification 2026', topic: 'identity verification', category: 'Google Play' },
  { title: 'Testing IoT Companion Android Apps', topic: 'IoT app testing', category: 'Testing' },
  { title: 'Social Apps and Google Play Closed Testing Volume', topic: 'social app testing', category: 'Testing' },
  { title: 'E-commerce Android Apps: Play Store Testing Tips', topic: 'e-commerce testing', category: 'Testing' },
  { title: 'Education Apps and Google Play Compliance Testing', topic: 'EdTech app testing', category: 'Testing' },
  { title: 'Productivity Apps: Meeting Google Play Testing Rules', topic: 'productivity app testing', category: 'Testing' },
  { title: 'AR/VR Android Apps and Closed Testing Requirements', topic: 'AR VR testing', category: 'Testing' },
  { title: 'Wear OS Companion Apps and Play Store Testing', topic: 'Wear OS testing', category: 'Testing' },
  { title: 'Android TV Apps and Google Play Testing Tracks', topic: 'Android TV testing', category: 'Testing' },
  { title: 'Instant Apps and Google Play Testing Considerations', topic: 'instant app testing', category: 'Development' },
  { title: 'App Bundle vs APK for Closed Testing Releases', topic: 'AAB release format', category: 'Development' },
  { title: 'Play App Signing Setup for First-Time Publishers', topic: 'app signing setup', category: 'Setup' },
  { title: 'Google Play Pre-Launch Report vs Closed Testing', topic: 'pre-launch testing', category: 'Testing' },
  { title: 'Staged Rollouts After Production Access Approval', topic: 'staged production rollout', category: 'Publishing' },
  { title: 'Google Play Console Permissions and Closed Testing', topic: 'permission declarations', category: 'Compliance' },
  { title: 'Notification Permission Changes and App Testing', topic: 'notification permission testing', category: 'Development' },
  { title: 'Background Location Apps and Play Store Review', topic: 'location permission apps', category: 'Compliance' },
  { title: 'Camera and Microphone Apps: Testing Checklist', topic: 'media permission testing', category: 'Compliance' },
  { title: 'Subscription Apps and Google Play Billing Testing', topic: 'in-app billing testing', category: 'Development' },
  { title: 'Ad-Supported Apps and Google Play Ad Policy Testing', topic: 'ad policy compliance', category: 'Compliance' },
  { title: 'Offline-First Apps and Closed Testing Best Practices', topic: 'offline app testing', category: 'Testing' },
  { title: 'Deep Link Testing Before Google Play Production', topic: 'deep link QA', category: 'Development' },
  { title: 'Push Notification Testing with Closed Testers', topic: 'FCM testing', category: 'Development' },
  { title: 'Analytics SDK Testing During Closed Testing', topic: 'analytics integration QA', category: 'Development' },
  { title: 'OAuth Login Testing for Android Apps', topic: 'authentication testing', category: 'Development' },
  { title: 'Biometric Login Apps and Play Store Compliance', topic: 'biometric auth testing', category: 'Development' },
  { title: 'Tablet Layout Testing for Google Play Apps', topic: 'tablet UI testing', category: 'Testing' },
  { title: 'Dark Mode and Theme Testing on Android', topic: 'theme testing', category: 'Development' },
  { title: 'Accessibility Testing Before Play Store Launch', topic: 'a11y compliance', category: 'Compliance' },
  { title: 'RTL Language Support Testing for Android Apps', topic: 'RTL layout testing', category: 'Testing' },
  { title: 'Low-End Device Testing for Global Play Store Launch', topic: 'device compatibility', category: 'Testing' },
  { title: 'Network Condition Testing for Android Apps', topic: 'offline network QA', category: 'Testing' },
  { title: 'Battery Usage Testing and Play Store Vitals', topic: 'battery optimization', category: 'Development' },
  { title: 'Google Play Android Vitals During Closed Testing', topic: 'vitals monitoring', category: 'Setup' },
  { title: 'Screenshot and Video Assets for Play Store Listing', topic: 'store asset creation', category: 'Marketing' },
  { title: 'Feature Graphic Design Tips for Google Play', topic: 'feature graphic design', category: 'Marketing' },
  { title: 'App Title and Description SEO for Google Play', topic: 'Play Store ASO', category: 'Marketing' },
  { title: 'Competitor Analysis for Android App Launch', topic: 'competitive research', category: 'Marketing' },
  { title: 'Launch Day Checklist After Production Access', topic: 'launch day planning', category: 'Marketing' },
  { title: 'Post-Launch Monitoring on Google Play Console', topic: 'post-launch analytics', category: 'Publishing' },
  { title: 'Handling User Reviews After Play Store Launch', topic: 'review management', category: 'Marketing' },
  { title: 'Updating Your App After Production Release', topic: 'post-launch updates', category: 'Publishing' },
  { title: 'Google Play Policy Changes Developers Should Watch', topic: 'policy updates', category: 'Google Play' },
  { title: 'Account Termination Risks and How to Avoid Them', topic: 'account safety', category: 'Compliance' },
  { title: 'Testing Multiple Apps on One Developer Account', topic: 'multi-app accounts', category: 'Business' },
  { title: 'Transferring Apps Between Developer Accounts', topic: 'app transfer process', category: 'Google Play' },
  { title: 'Google Play Closed Testing for White-Label Apps', topic: 'white-label testing', category: 'Business' },
  { title: 'MVP Launch Strategy with Google Play Closed Testing', topic: 'MVP launch', category: 'Business' },
  { title: 'Investor-Ready Metrics from Closed Testing Period', topic: 'investor metrics', category: 'Business' },
  { title: 'Customer Support Setup Before Play Store Launch', topic: 'support preparation', category: 'Business' },
  { title: 'Refund Policy Page Requirements for Play Store', topic: 'refund policy setup', category: 'Compliance' },
  { title: 'Terms of Service for Android Apps on Google Play', topic: 'terms of service', category: 'Compliance' },
  { title: 'GDPR Compliance for Android Apps on Google Play', topic: 'GDPR requirements', category: 'Compliance' },
  { title: 'COPPA and Kids Apps on Google Play Store', topic: 'COPPA compliance', category: 'Compliance' },
  { title: 'Export Compliance and Encryption Declarations', topic: 'encryption export rules', category: 'Compliance' },
  { title: 'Government App Distribution on Google Play', topic: 'government apps', category: 'Compliance' },
  { title: 'Enterprise Internal Apps vs Public Play Store Apps', topic: 'enterprise distribution', category: 'Business' },
  { title: 'Fast Testers vs Manual Tester Recruitment Cost Analysis', topic: 'cost comparison', category: 'Business' },
  { title: 'Case Study: First App Published in 16 Days with Fast Testers', topic: 'success case study', category: 'Case Studies' },
  { title: 'Case Study: Recovering from Google Play Rejection', topic: 'rejection recovery', category: 'Case Studies' },
  { title: 'Developer Interview: Why I Chose Professional Testers', topic: 'developer testimonial', category: 'Case Studies' },
  { title: 'Complete Glossary of Google Play Testing Terms', topic: 'testing terminology', category: 'Reference' },
  { title: 'Google Play Closed Testing FAQ: 50 Answers', topic: 'comprehensive FAQ', category: 'Reference' },
];

async function seedFaq() {
  for (const item of FAQ_ITEMS) {
    const existing = await prisma.faqItem.findFirst({ where: { question: item.question } });
    if (existing) {
      await prisma.faqItem.update({
        where: { id: existing.id },
        data: item,
      });
    } else {
      await prisma.faqItem.create({ data: item });
    }
  }
  console.log(`Seeded ${FAQ_ITEMS.length} FAQ items`);
}

async function seedArticles() {
  let created = 0;
  let skipped = 0;

  for (const { title, topic, category } of ARTICLE_TOPICS) {
    const slug = slugify(title);
    const existing = await prisma.article.findUnique({ where: { slug } });
    if (existing) {
      skipped++;
      continue;
    }

    await prisma.article.create({
      data: {
        slug,
        title,
        description: `Learn about ${topic} for Google Play closed testing. Complete guide for Android developers publishing on the Play Store.`,
        content: articleBody(title, topic),
        category,
        status: 'published',
        readTime: '8 min read',
        featured: created < 5,
        seoTitle: `${title} | Fast Testers`,
        seoDescription: `Complete guide to ${topic}. Google Play closed testing tips for Android developers.`,
        seoKeywords: `google play, closed testing, android, ${topic}`,
      },
    });
    created++;
  }

  console.log(`Created ${created} articles, skipped ${skipped} existing`);
}

async function main() {
  await seedFaq();
  await seedArticles();
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
