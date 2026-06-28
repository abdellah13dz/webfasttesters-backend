export interface NavLink {
  labelKey?: string;
  label?: string;
  path: string;
  icon?: string;
}

export interface NavSection {
  titleKey?: string;
  title?: string;
  links: NavLink[];
}

export interface SiteNavigation {
  headerMain: NavLink[];
  headerResources: NavLink[];
  headerSupport: NavLink[];
  footerSections: NavSection[];
  footerLegal: NavLink[];
}

const COMMUNITY_URL = 'https://community.fasttesters.com/';

const COMMUNITY_HEADER_LINK: NavLink = {
  labelKey: 'header.freeTestersCommunity',
  path: COMMUNITY_URL,
};

const COMMUNITY_FOOTER_LINK: NavLink = {
  labelKey: 'footer.freeTestersCommunity',
  path: COMMUNITY_URL,
};

function isCommunityLink(link: NavLink): boolean {
  return (
    link.path === COMMUNITY_URL ||
    link.labelKey === 'header.freeTestersCommunity' ||
    link.labelKey === 'footer.freeTestersCommunity'
  );
}

function insertLinkAfter(links: NavLink[], link: NavLink, afterPath: string): NavLink[] {
  if (links.some(isCommunityLink)) return links;
  const index = links.findIndex((item) => item.path === afterPath);
  if (index === -1) return [...links, link];
  return [...links.slice(0, index + 1), link, ...links.slice(index + 1)];
}

function isProductFooterSection(section: NavSection): boolean {
  if (section.titleKey === 'footer.product') return true;
  return section.links.some(
    (link) => link.path === '/submit-app' || link.labelKey === 'footer.submitApp'
  );
}

/** Ensures community links exist when older DB navigation is loaded. */
export function mergeSiteNavigation(stored: SiteNavigation): SiteNavigation {
  return {
    ...stored,
    headerMain: insertLinkAfter(stored.headerMain ?? [], COMMUNITY_HEADER_LINK, '/blog'),
    footerSections: (stored.footerSections ?? []).map((section) =>
      isProductFooterSection(section)
        ? {
            ...section,
            links: insertLinkAfter(section.links ?? [], COMMUNITY_FOOTER_LINK, '/submit-app'),
          }
        : section
    ),
  };
}

const BASE_SITE_NAVIGATION: SiteNavigation = {
  headerMain: [
    { labelKey: 'header.howItWorks', path: '/how-it-works' },
    { labelKey: 'header.reviews', path: '/reviews' },
    { labelKey: 'header.pricing', path: '/pricing' },
    { labelKey: 'header.blog', path: '/blog' },
    { labelKey: 'header.freeTestersCommunity', path: COMMUNITY_URL },
  ],
  headerResources: [
    { labelKey: 'header.compare', path: '/compare' },
    { labelKey: 'header.caseStudies', path: '/case-studies' },
    { labelKey: 'header.androidTesters', path: '/android-app-testers' },
    { labelKey: 'header.betaTestersGuide', path: '/blog/how-to-find-beta-testers-for-android-apps' },
    { labelKey: 'header.googlePlayClosedTesting', path: '/blog/google-play-closed-testing' },
    { labelKey: 'header.appRejected', path: '/blog/app-rejected-google-play' },
    { labelKey: 'header.multiLanguageTesting', path: '/blog/multi-language-app-testing' },
    { labelKey: 'header.setupGuide', path: '/google-play-setup-guide' },
    { labelKey: 'header.productionAccess', path: '/google-play-production-access-12-testers' },
  ],
  headerSupport: [
    { labelKey: 'footer.helpCenter', path: '/support', icon: 'Headphones' },
    { labelKey: 'footer.contactUs', path: '/contact-us', icon: 'Mail' },
    { labelKey: 'footer.feedback', path: '/feedback', icon: 'MessageSquare' },
    { labelKey: 'footer.status', path: '/status', icon: 'Activity' },
    { labelKey: 'footer.appRejected', path: '/blog/app-rejected-google-play', icon: 'AlertTriangle' },
  ],
  footerSections: [
    {
      titleKey: 'footer.company',
      links: [
        { labelKey: 'footer.aboutUs', path: '/about-us' },
        { labelKey: 'footer.reviews', path: '/reviews' },
        { labelKey: 'footer.caseStudies', path: '/case-studies' },
        { labelKey: 'footer.partners', path: '/partners' },
        { labelKey: 'footer.blog', path: '/blog' },
        { labelKey: 'footer.changelog', path: '/changelog' },
      ],
    },
    {
      titleKey: 'footer.product',
      links: [
        { labelKey: 'footer.howItWorks', path: '/how-it-works' },
        { labelKey: 'footer.pricing', path: '/pricing' },
        { labelKey: 'footer.compare', path: '/compare' },
        { labelKey: 'footer.submitApp', path: '/submit-app' },
        { labelKey: 'footer.freeTestersCommunity', path: COMMUNITY_URL },
        { labelKey: 'footer.affiliateProgram', path: '/app-testing-referral-program' },
      ],
    },
    {
      titleKey: 'footer.resources',
      links: [
        { labelKey: 'footer.faq', path: '/faq' },
        { labelKey: 'footer.androidTesters', path: '/android-app-testers' },
        { labelKey: 'footer.googlePlayGuide', path: '/blog/publish-app-google-play' },
        { labelKey: 'footer.enterpriseGuide', path: '/guides/enterprise-onboarding' },
      ],
    },
    {
      titleKey: 'footer.support',
      links: [
        { labelKey: 'footer.helpCenter', path: '/support' },
        { labelKey: 'footer.contactUs', path: '/contact-us' },
        { labelKey: 'footer.feedback', path: '/feedback' },
        { labelKey: 'footer.status', path: '/status' },
        { labelKey: 'footer.appRejected', path: '/blog/app-rejected-google-play' },
      ],
    },
  ],
  footerLegal: [
    { labelKey: 'footer.termsAndConditions', path: '/terms-and-conditions' },
    { labelKey: 'footer.privacyPolicy', path: '/privacy-policy' },
    { labelKey: 'footer.cookiePolicy', path: '/cookie-policy' },
    { labelKey: 'footer.refundPolicy', path: '/refund-policy' },
    { labelKey: 'footer.referralPolicy', path: '/referral-policy' },
  ],
};

export const DEFAULT_SITE_NAVIGATION: SiteNavigation = mergeSiteNavigation(BASE_SITE_NAVIGATION);

export const SUPPORTED_LOCALES = ['en', 'es', 'tr', 'ar'] as const;
export type SupportedLocale = (typeof SUPPORTED_LOCALES)[number];

export function resolveSiteUrl(): string {
  return process.env.SITE_URL || process.env.FRONTEND_URL || 'https://fasttesters.com';
}
