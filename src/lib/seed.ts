import bcrypt from 'bcryptjs';
import { db } from './db.js';
import {
  SITE_SETTING_KEYS,
  DEFAULT_ANNOUNCEMENT_BANNER,
  DEFAULT_HERO_STATS,
  DEFAULT_SEO,
  upsertSiteSetting,
} from './site-settings-keys.js';
import { DEFAULT_SITE_NAVIGATION } from './navigation-defaults.js';

const seedArticles = [
  {
    slug: 'google-play-12-testers-policy',
    title: 'Google Play – 12 Testers for 14 Days',
    description: "Everything you need to know about Google Play's closed testing requirement.",
    content:
      'Google Play requires developers with personal accounts to test their apps with at least 12 testers for 14 consecutive days before they can apply for production access.\n\n## Who Does This Apply To?\n\nThis requirement applies to all new personal developer accounts created after the policy was introduced.\n\n## How to Meet the Requirement\n\n1. Set up a closed testing track in Google Play Console\n2. Add at least 12 testers to your testing track\n3. Ensure testers actively engage with your app for 14 consecutive days\n4. Apply for production access after meeting the requirement',
    coverImage: '/images/blog/blog-12-testers.png',
    category: 'GOOGLE PLAY',
    status: 'published',
    readTime: '5 min read',
    featured: true,
  },
  {
    slug: 'how-to-find-beta-testers-for-android-apps',
    title: 'How to Find Beta Testers for Your Android App',
    description: 'Discover 7 proven methods for finding reliable beta testers.',
    content:
      'Finding reliable beta testers is crucial for app development success.\n\n## 1. Professional Testing Services\nServices like Fast Testers provide professional testers.\n\n## 2. Social Media Communities\nReddit, Discord, and Facebook groups dedicated to app development.\n\n## 3. Developer Forums\nStack Overflow, XDA Developers communities.\n\n## 4. Friends and Family\nThey can provide initial feedback.\n\n## 5. University Programs\nStudents may be willing to test apps.\n\n## 6. Beta Testing Platforms\nPlatforms dedicated to connecting developers with testers.\n\n## 7. Existing User Base\nAsk current users to test new features.',
    coverImage: '/images/blog/beta-testers.png',
    category: 'BETA TESTING',
    status: 'published',
    readTime: '7 min read',
    featured: false,
  },
  {
    slug: 'google-play-closed-testing',
    title: 'Google Play Closed Testing Complete Guide',
    description: 'A comprehensive walkthrough of the entire closed testing process.',
    content:
      'Closed testing is a crucial phase in getting your app approved on Google Play.\n\n## Setting Up Closed Testing\n\n1. Open Google Play Console\n2. Navigate to Testing > Closed Testing\n3. Create a new testing track\n4. Add your testers\n\n## Best Practices\n\n- Provide clear testing instructions\n- Create a feedback channel\n- Monitor tester engagement daily\n- Respond to feedback promptly',
    coverImage: '/images/blog/closed-testing.png',
    category: 'CLOSED TESTING',
    status: 'published',
    readTime: '10 min read',
    featured: false,
  },
  {
    slug: 'app-rejected-google-play',
    title: "App Rejected by Google Play? Here's What to Do",
    description: 'Got your app rejected? This guide walks you through the most common rejection reasons.',
    content:
      'Getting your app rejected by Google Play can be frustrating.\n\n## Common Rejection Reasons\n\n1. Policy violations\n2. Poor app quality\n3. Missing required information\n4. Inappropriate content\n5. Security issues\n\n## How to Fix\n\n1. Read the rejection notice carefully\n2. Address each issue\n3. Test thoroughly before resubmitting\n4. Update your app description if needed',
    coverImage: '/images/blog/app-rejected.png',
    category: 'APP REJECTION',
    status: 'published',
    readTime: '6 min read',
    featured: false,
  },
  {
    slug: 'multi-language-app-testing',
    title: 'Multi-Language App Testing Guide',
    description: 'Learn how to test your app across multiple languages and regions.',
    content:
      'Testing your app across multiple languages is essential for global success.\n\n## Why Multi-Language Testing Matters\n\n- Reaches a wider audience\n- Improves user experience\n- Increases app ratings\n\n## Testing Checklist\n\n1. Verify all text is properly translated\n2. Check text overflow\n3. Test RTL languages\n4. Verify date and number formats\n5. Test with different character sets',
    coverImage: '/images/blog/multi-language.png',
    category: 'INTERNATIONAL',
    status: 'published',
    readTime: '8 min read',
    featured: false,
  },
  {
    slug: 'publish-app-google-play',
    title: 'How to Publish an App on Google Play Store',
    description: 'A straightforward, step-by-step guide to getting your Android app live.',
    content:
      'Publishing your app on Google Play involves several steps.\n\n## Step 1: Create a Developer Account\nSign up for a Google Play Developer account.\n\n## Step 2: Prepare Your App\n- Create a signed APK or App Bundle\n- Prepare screenshots and descriptions\n\n## Step 3: Upload and Configure\n- Upload your app bundle\n- Fill in the store listing\n\n## Step 4: Test Your App\nUse closed testing to get feedback.\n\n## Step 5: Publish\nSubmit for review and publication.',
    coverImage: '/images/blog/guide-publish.png',
    category: 'PUBLISHING',
    status: 'published',
    readTime: '12 min read',
    featured: false,
  },
];

const seedReviews = [
  { text: 'Not only did Fast Testers fulfill the requirement of 12 testers engaging with my app Grosch over 14 days, but they also provided thoughtful feedback.', author: 'Madeline Petersen', role: 'Creator of Grosch', appName: 'Grosch', category: 'Finance', result: 'Production access granted in 16 days', rating: 5, featured: false, caseStudy: true, sortOrder: 0 },
  { text: 'Got my app approved in the Play Store on the first attempt, thanks to the testers community.', author: 'Wouter Olwagen', role: 'Creator of Wouter\'s App', appName: "Wouter's App", category: 'Productivity', result: 'Approved on first attempt', rating: 5, featured: true, caseStudy: false, sortOrder: 1 },
  { text: 'Private testing option did wonders. I got not only dozens of testers who knew how to interact with the app, but also I received detailed report.', author: 'Konrad Ptasiński', role: 'Game Developer of Curse of the Crypt', appName: 'Curse of the Crypt', category: 'Utilities', result: 'Detailed reports delivered', rating: 5, featured: true, caseStudy: false, sortOrder: 2 },
  { text: 'Your reviews were excellent. And we got approved for production in one day after integrating your feedback.', author: 'Dennis Chukwuemeka', role: 'Creator of DDV Bible', appName: 'DDV Bible', category: 'Education', result: 'Approved 1 day after feedback', rating: 5, featured: true, caseStudy: false, sortOrder: 3 },
  { text: 'Fantastic service and all of my questions were answered quickly and efficiently.', author: 'Nicola Michelmore', role: 'Creator of Motorhome & RV Manager', appName: 'Motorhome & RV Manager', rating: 5, featured: false, caseStudy: false, sortOrder: 4 },
  { text: 'This app was a blessing when I needed testers for closed testing. Definitely worth the money.', author: 'Kenan Grahic', role: 'Creator of Sandman', appName: 'Sandman', category: 'Lifestyle', result: 'Approved after 5 rejections', rating: 5, featured: false, caseStudy: true, sortOrder: 1 },
  { text: 'Best app for testers... I got my app rejected five times and finally, with the help of Fast Testers, today I got production access.', author: 'NIRAV K PATEL', role: 'Creator of ScrinTrim', appName: 'ScrinTrim', category: 'Utilities', result: 'Production access granted', rating: 5, featured: true, caseStudy: false, sortOrder: 5 },
  { text: 'Great service—I went for the paid and got a great bit of feedback from testing.', author: 'Jason Alexander', role: 'Creator of ConvertQ', appName: 'ConvertQ', rating: 4, featured: false, caseStudy: false, sortOrder: 6 },
  { text: "Everything went perfectly with the app! Very happy and it's the best service for testing your app.", author: 'PIERRE-ALEXANDRE COTE', role: 'Creator of F1 Insider', appName: 'F1 Insider', rating: 5, featured: false, caseStudy: false, sortOrder: 7 },
  { text: 'Very helpful application! Successfully passed closed testing and received production approval!', author: 'Agnieszka Piérkowska', role: 'Developer of Bibile', appName: 'Bibile', rating: 5, featured: false, caseStudy: false, sortOrder: 8 },
  { text: "I just got granted production access for my app! I couldn't have done it without you guys.", author: 'Keval Sakariya', role: 'Developer of Modern QR', appName: 'Modern QR', category: 'Productivity', result: 'Production access granted', rating: 5, featured: false, caseStudy: true, sortOrder: 2 },
  { text: 'After just 14 days, I was finally able to access production without any issues. The support was impeccable.', author: 'Kevin Corigliano', role: 'Developer of Echo Verse', appName: 'Echo Verse', rating: 5, featured: true, caseStudy: false, sortOrder: 7 },
];

export async function seedAll() {
  const hashedPassword = await bcrypt.hash('admin123', 12);
  await db.user.upsert({
    where: { email: 'admin@fasttesters.com' },
    update: {},
    create: {
      email: 'admin@fasttesters.com',
      name: 'Admin',
      password: hashedPassword,
      role: 'admin',
    },
  });

  for (const article of seedArticles) {
    await db.article.upsert({
      where: { slug: article.slug },
      update: article,
      create: article,
    });
  }

  const existingReviews = await db.review.count();
  if (existingReviews === 0) {
    for (const review of seedReviews) {
      await db.review.create({ data: review });
    }
  } else {
    for (const review of seedReviews) {
      await db.review.updateMany({
        where: { author: review.author },
        data: {
          featured: review.featured ?? false,
          caseStudy: review.caseStudy ?? false,
          sortOrder: review.sortOrder,
          ...(review.appName ? { appName: review.appName } : {}),
          ...(review.category ? { category: review.category } : {}),
          ...(review.result ? { result: review.result } : {}),
        },
      });
    }
  }

  const defaultPlanFeatures = JSON.stringify([
    '15 Professional Testers',
    '100% Guarantee or Money Back',
    'Fastest Approval in the Market',
    'Detailed Testing Reports',
    '16-Day Testing Period',
    'Priority Support',
  ]);

  await db.pricingPlan.upsert({
    where: { id: 'default-plan' },
    update: {
      features: defaultPlanFeatures,
      description: "15 testers for 16 days — covers Google Play’s 12 testers / 14 consecutive days requirement",
    },
    create: {
      id: 'default-plan',
      name: 'Android Apps',
      price: 15,
      currency: 'USD',
      period: 'one-time',
      description: "15 testers for 16 days — covers Google Play’s 12 testers / 14 consecutive days requirement",
      features: defaultPlanFeatures,
      popular: true,
      active: true,
    },
  });

  await seedCmsContent();
}

const seedFaqItems = [
  { category: 'General', question: 'What is 12 testers for 14 days policy by Google Play?', answer: "Google Play's policy requires at least 12 real users testing your app for 14 consecutive days before you can publish to production. This policy applies to personal accounts created after November 13, 2023.", icon: 'Smartphone', sortOrder: 0 },
  { category: 'General', question: 'How does Fast Testers work?', answer: 'Pay $15, submit your closed-testing opt-in link from Google Play Console, 15 professional testers are assigned, they test your app for 16 days (covering Google’s 14 consecutive days), and then you can apply for production access. Google decides approval.', icon: 'Users', sortOrder: 1 },
  { category: 'Pricing', question: "What's the difference between free and paid testing?", answer: 'Free testing relies on forums and social media with no guarantee. Paid testing ($15) provides 15 professional testers for 16 days. Refund terms are in the refund policy.', icon: 'CreditCard', sortOrder: 2 },
  { category: 'Guarantee', question: 'What if my app gets rejected?', answer: "Our production access guarantee is the refund policy: we cover closed testing; Google decides production access. If you qualify under the policy, we refund that app.", icon: 'Shield', sortOrder: 3 },
  { category: 'Timing', question: 'How quickly do testers start testing?', answer: 'After you submit a valid closed-testing opt-in link, testers are typically assigned within about an hour.', icon: 'Clock', sortOrder: 4 },
  { category: 'General', question: 'Can I test multiple apps?', answer: 'Yes. Each app requires a separate $15 payment. Contact support for bulk pricing on 5+ apps.', icon: 'CheckCircle2', sortOrder: 5 },
  { category: 'Languages', question: 'What languages do testers support?', answer: 'We support 30+ languages including English, Spanish, German, French, Japanese, Korean, Chinese, Hindi, Arabic, and more.', icon: 'Globe', sortOrder: 6 },
  { category: 'Security', question: 'Is my app data secure?', answer: 'Yes. We use encrypted connections and never share your app data with third parties.', icon: 'Lock', sortOrder: 7 },
];

const seedChangelogEntries = [
  { version: 'v2.4.0', title: 'Enhanced Dashboard Analytics', tags: ['newFeature', 'improvement'], description: 'Completely redesigned dashboard with advanced analytics, real-time charts, and deeper insights into your testing progress.', icon: 'LayoutDashboard', publishedAt: new Date('2026-03-01'), sortOrder: 0 },
  { version: 'v2.3.0', title: 'Multi-Language Testing Support', tags: ['newFeature'], description: 'Now supporting 30+ languages for app testing with native speakers across the globe.', icon: 'Globe', publishedAt: new Date('2026-02-01'), sortOrder: 1 },
  { version: 'v2.2.0', title: 'Faster Tester Assignment', tags: ['improvement'], description: 'Reduced tester assignment time from 12 hours to just 6 hours.', icon: 'Zap', publishedAt: new Date('2026-01-01'), sortOrder: 2 },
  { version: 'v2.1.0', title: 'Affiliate Program Launch', tags: ['newFeature'], description: 'Introducing the Fast Testers Affiliate Program with commissions for referrals.', icon: 'Gift', publishedAt: new Date('2025-12-01'), sortOrder: 3 },
];

const seedStatusServices = [
  { name: 'App Testing', icon: 'Smartphone', uptime30Day: '99.98%', sortOrder: 0 },
  { name: 'Tester Assignment', icon: 'Users', uptime30Day: '99.95%', sortOrder: 1 },
  { name: 'Dashboard', icon: 'BarChart3', uptime30Day: '99.99%', sortOrder: 2 },
  { name: 'Payments', icon: 'CreditCard', uptime30Day: '99.97%', sortOrder: 3 },
  { name: 'Email Notifications', icon: 'Mail', uptime30Day: '99.93%', sortOrder: 4 },
  { name: 'API', icon: 'Code', uptime30Day: '99.96%', sortOrder: 5 },
];

const seedStatusIncidents = [
  { title: 'Brief API Latency', description: 'Some API requests experienced higher than normal latency. Root cause identified and resolved.', status: 'resolved', occurredAt: new Date('2026-02-28'), duration: '15 minutes', sortOrder: 0 },
  { title: 'Payment Gateway Maintenance', description: 'Scheduled maintenance for payment gateway upgrade. All services remained available.', status: 'scheduled', occurredAt: new Date('2026-02-15'), duration: '30 minutes', sortOrder: 1 },
];

const seedPages = [
  {
    slug: 'privacy-policy',
    title: 'Privacy Policy',
    pageType: 'legal',
    content: '# Privacy Policy\n\nFast Testers respects your privacy. This policy describes how we collect, use, and protect your information when you use our services.\n\n## Information We Collect\n\nWe collect personal information such as name, email, and payment details when you create an account or submit an app for testing.\n\n## How We Use Your Information\n\nWe use your information to deliver testing services, improve our platform, and communicate important updates.\n\n## Contact\n\nFor privacy questions, contact support@fasttesters.com.',
  },
  {
    slug: 'terms-and-conditions',
    title: 'Terms and Conditions',
    pageType: 'legal',
    content: '# Terms and Conditions\n\nBy using Fast Testers, you agree to these terms.\n\n## Services\n\nWe provide professional app testing services to help developers meet Google Play requirements.\n\n## Payments\n\nAll fees are charged per app submission unless otherwise agreed in writing.\n\n## Guarantee\n\nOur production access guarantee applies as described on our pricing page.',
  },
];

async function seedCmsContent() {
  const faqCount = await db.faqItem.count();
  if (faqCount === 0) {
    for (const item of seedFaqItems) {
      await db.faqItem.create({ data: item });
    }
  }

  const changelogCount = await db.changelogEntry.count();
  if (changelogCount === 0) {
    for (const entry of seedChangelogEntries) {
      await db.changelogEntry.create({
        data: {
          ...entry,
          tags: JSON.stringify(entry.tags),
        },
      });
    }
  }

  const serviceCount = await db.statusService.count();
  if (serviceCount === 0) {
    for (const service of seedStatusServices) {
      await db.statusService.create({ data: service });
    }
  }

  const incidentCount = await db.statusIncident.count();
  if (incidentCount === 0) {
    for (const incident of seedStatusIncidents) {
      await db.statusIncident.create({ data: incident });
    }
  }

  for (const page of seedPages) {
    await db.page.upsert({
      where: { slug: page.slug },
      update: {},
      create: page,
    });
  }

  await upsertSiteSetting(db, SITE_SETTING_KEYS.ANNOUNCEMENT_BANNER, DEFAULT_ANNOUNCEMENT_BANNER);
  await upsertSiteSetting(db, SITE_SETTING_KEYS.HERO_STATS, DEFAULT_HERO_STATS);
  await upsertSiteSetting(db, SITE_SETTING_KEYS.DEFAULT_SEO, DEFAULT_SEO);
  await upsertSiteSetting(db, SITE_SETTING_KEYS.PAGE_SEO_OVERRIDES, {});
  await upsertSiteSetting(db, SITE_SETTING_KEYS.SITE_NAVIGATION, DEFAULT_SITE_NAVIGATION);
}
