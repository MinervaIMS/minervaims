// =====================================================================
// THE PICTURE A SHARED LINK SHOWS (Step 109).
// ---------------------------------------------------------------------
// A link pasted into WhatsApp, LinkedIn, iMessage, Telegram, Slack,
// Teams, Facebook or X is shown as a card: a picture, a title, a line of
// description and the address. Every one of those services reads the
// card from the page's HTML as the server sends it (the Open Graph and
// Twitter tags) and none of them runs the site's JavaScript, so a page
// whose tags are written only by the app shares as the homepage.
//
// Two things make each card the page's own:
//   * the build writes every public address as real HTML with that
//     page's own tags (vite.static-pages.ts, the "shells");
//   * each page has its own picture, made once from the page's own hero
//     photograph with the Society's seal and full name on it
//     (scripts/make-share-images.mjs writes public/share/<key>.jpg from
//     this list; scripts/share-previews.test.mjs checks every file).
//
// WHY THE SEAL AND THE FULL NAME ARE ON EVERY PICTURE. A card that names
// only "Events" or "Long Short Equity Fund" could be anybody's. The seal
// and "Minerva Investment Management Society" are on every picture, the
// title of every card ends with the Society's name (lib/seo/head.ts) and
// every description names it, so a page shared on its own is never
// mistaken for some other organisation's, nor for the homepage. Nothing
// else is on the picture: the seal, the page's name, the Society's name.
//
// The pictures are 1200 by 630 (the ratio every service lays out without
// cropping the sides), JPEG, well under 300 kB (WhatsApp drops a picture
// it finds too heavy). EVERYTHING ON THEM SITS IN THE MIDDLE SQUARE (630
// by 630): a chat on a small screen, WhatsApp first, crops the picture to
// a square from its centre, and the seal, the whole title and the name
// must all still be there.
//
// Only relative imports: the build (vite.static-pages.ts) reads this file.
// =====================================================================

/** Where the pictures are served from (public/share/). */
export const SHARE_IMAGE_DIR = '/share';
export const SHARE_IMAGE_WIDTH = 1200;
export const SHARE_IMAGE_HEIGHT = 630;
export const SHARE_IMAGE_TYPE = 'image/jpeg';

export interface ShareCard {
  /** The file name, without extension: public/share/<key>.jpg. */
  key: string;
  /** The title on the picture: the page's own name. */
  title: string;
  /**
   * The line under the title: the Society's name (the default), the
   * Society's workspace, or nothing (the homepage, whose title is the name).
   */
  foot?: 'society' | 'workspace' | 'none';
  /**
   * The page's own moving background, captured from the live page instead
   * of a photograph (scripts/make-share-images.mjs): the homepage's market
   * scene, the Join page's field of dots, or the stage of beams every event
   * registration and every form is drawn on.
   */
  scene?: 'home' | 'join' | 'stage';
  /**
   * A page with neither photograph nor moving background is drawn on the
   * page's own plain ground: white for the pages that are white (the
   * Statute, the legal pages, the Payoff Lab), black for the pages that are
   * dark (the Track Record, the Application Form). Never a coloured field.
   */
  ground?: 'white' | 'black';
  /**
   * The page's hero photograph, as the hosted asset record in src/assets
   * the page itself imports. Every card has a photograph, a scene or a
   * ground (scripts/share-previews.test.mjs).
   */
  photo?: string;
}

const card = (key: string, title: string, photo?: string, foot?: ShareCard['foot']): ShareCard => ({ key, title, photo, foot });
const scene = (key: string, title: string, s: NonNullable<ShareCard['scene']>, foot?: ShareCard['foot']): ShareCard => ({ key, title, scene: s, foot });
const plain = (key: string, title: string, ground: NonNullable<ShareCard['ground']>): ShareCard => ({ key, title, ground });

/** Every picture there is. The generator writes exactly these. */
export const SHARE_CARDS: ShareCard[] = [
  scene('home', 'Minerva Investment Management Society', 'home', 'none'),
  // The Society.
  card('about', 'About the Society', 'mims-about-us.webp.asset.json'),
  plain('track-record', "Minerva's Track Record", 'black'),
  card('company-relations', 'Company Relations', 'MIMS_Milan_Background-v2.webp.asset.json'),
  card('partnerships', 'Partnerships', 'MIMS_London_Background.webp.asset.json'),
  card('contacts', 'Contacts', 'MIMS_Contacts.webp.asset.json'),
  plain('statute', 'Society Statute', 'white'),
  card('sitemap', 'Sitemap', 'MIMS_Sitemap.webp.asset.json'),
  // People.
  card('members', 'Members', 'mims-members.webp.asset.json'),
  card('alumni', 'Alumni Network', 'MIMS_Alumni_Background-v2.webp.asset.json'),
  // Research.
  card('archive', 'Research Archive', 'mims-archive.webp.asset.json'),
  card('readings', 'Recommended Readings', 'mims-readings.webp.asset.json'),
  plain('lab', 'Payoff Lab', 'white'),
  // Recruiting.
  scene('join', 'Join Minerva', 'join'),
  card('division-fit', 'Division Fit', 'MIMS_Milan_Background-v2.webp.asset.json'),
  plain('apply', 'Application Form', 'black'),
  // Events.
  card('events', 'Events', 'MIMS_Events.webp.asset.json'),
  // Legal.
  plain('terms-of-use', 'Terms of Use', 'white'),
  plain('privacy-policy', 'Privacy Policy', 'white'),
  plain('cookie-policy', 'Cookie Policy', 'white'),
  plain('disclaimer', 'Disclaimer', 'white'),
  // The five divisions.
  card('division-equity', 'Equity Research Division', 'MIMS_Equity_Research.webp.asset.json'),
  card('division-investment', 'Investment Research Division', 'mims-investment-research.webp.asset.json'),
  card('division-macro', 'Macro Research Division', 'MIMS_Macro_Research.webp.asset.json'),
  card('division-portfolio', 'Portfolio Management Division', 'MIMS_Portfolio_Management.webp.asset.json'),
  card('division-quant', 'Quantitative Research Division', 'mims-quant-research.webp.asset.json'),
  // The four funds.
  card('fund-long-short', 'Long Short Equity Fund', 'MIMS_Long_Short_Fund.webp.asset.json'),
  card('fund-multi-asset', 'Multi Asset Global Opportunities Fund', 'MIMS_Multi_Asset_Fund.webp.asset.json'),
  card('fund-dps', 'Diversified Passive Selection Fund', 'MIMS_Diversified_Passive_Fund.webp.asset.json'),
  card('fund-pir', 'Italian Equity PIR Fund', 'mims-pir-fund.webp.asset.json'),
  // A report: its division's photograph, named as a report.
  card('report', 'Research Report', 'mims-archive.webp.asset.json'),
  card('report-equity', 'Equity Research Report', 'MIMS_Equity_Research.webp.asset.json'),
  card('report-investment', 'Investment Research Report', 'mims-investment-research.webp.asset.json'),
  card('report-macro', 'Macro Research Report', 'MIMS_Macro_Research.webp.asset.json'),
  card('report-portfolio', 'Portfolio Management Report', 'MIMS_Portfolio_Management.webp.asset.json'),
  card('report-quant', 'Quantitative Research Report', 'mims-quant-research.webp.asset.json'),
  // An event's registration: the page's own stage of beams, named by its kind.
  scene('event', 'Event Registration', 'stage'),
  scene('event-aperitivo', 'Aperitivo', 'stage'),
  scene('event-division', 'Division Event', 'stage'),
  scene('event-online-call', 'Online Call', 'stage'),
  scene('event-guest', 'Guest Event', 'stage'),
  scene('event-alumni-call', 'Alumni Call', 'stage'),
  scene('event-company-visit', 'Company Visit', 'stage'),
  scene('event-association-wide', 'Association-wide Event', 'stage'),
  scene('event-on-display', 'Association on Display', 'stage'),
  // A form: the same stage, the page a form opens on.
  scene('form', 'Form', 'stage'),
  // The workspace: the sign-in stage a link to it opens on, named by its section.
  scene('workspace', 'Minerva Workspace', 'stage', 'none'),
  scene('ws-dashboard', 'Dashboard', 'stage', 'workspace'),
  scene('ws-my-profile', 'My Profile', 'stage', 'workspace'),
  scene('ws-career', 'Career', 'stage', 'workspace'),
  scene('ws-calendar', 'Calendar', 'stage', 'workspace'),
  scene('ws-reports', 'Reports', 'stage', 'workspace'),
  scene('ws-recruiting', 'Recruiting', 'stage', 'workspace'),
  scene('ws-my-application', 'My Application', 'stage', 'workspace'),
  scene('ws-events', 'Events', 'stage', 'workspace'),
  scene('ws-people', 'People', 'stage', 'workspace'),
  scene('ws-social-media', 'Social Media', 'stage', 'workspace'),
  scene('ws-operations', 'Operations', 'stage', 'workspace'),
  scene('ws-website', 'Website', 'stage', 'workspace'),
  scene('ws-settings', 'Settings', 'stage', 'workspace'),
  scene('ws-how-to-use', 'How To Use', 'stage', 'workspace'),
];

const BY_KEY = new Map(SHARE_CARDS.map((c) => [c.key, c]));

/** The site-relative address of a card's picture. */
export const shareImagePath = (key: string): string => `${SHARE_IMAGE_DIR}/${BY_KEY.has(key) ? key : 'home'}.jpg`;

/** The words a screen reader gives for a card's picture. */
export function shareImageAlt(key: string): string {
  const c = BY_KEY.get(key) ?? BY_KEY.get('home')!;
  if (c.key === 'home') return 'The seal of Minerva Investment Management Society';
  return `${c.title}${c.foot === 'workspace' ? ', in the workspace' : ''}, with the seal of Minerva Investment Management Society`;
}

/** The public pages, by address. */
export const ROUTE_SHARE_CARD: Record<string, string> = {
  '/': 'home',
  '/about': 'about',
  '/people/members': 'members',
  '/people/alumni': 'alumni',
  '/events': 'events',
  '/archive': 'archive',
  '/readings': 'readings',
  '/join': 'join',
  '/join/division-fit': 'division-fit',
  '/apply': 'apply',
  '/company-relations': 'company-relations',
  '/partnerships': 'partnerships',
  '/track-record': 'track-record',
  '/contacts': 'contacts',
  '/statute': 'statute',
  '/sitemap': 'sitemap',
  '/lab': 'lab',
  '/terms-of-use': 'terms-of-use',
  '/privacy-policy': 'privacy-policy',
  '/cookie-policy': 'cookie-policy',
  '/disclaimer': 'disclaimer',
};

/**
 * Old addresses the app sends on to a page (App.tsx): a link shared in
 * the old form shows the page it opens.
 */
export const SHARE_ALIASES: Record<string, string> = {
  '/people': '/people/members',
  '/members': '/people/members',
  '/members/team': '/people/members',
  '/members/alumni': '/people/alumni',
  '/numbers': '/track-record',
};

export const divisionShareCard = (division: string): string => (BY_KEY.has(`division-${division}`) ? `division-${division}` : 'home');
export const fundShareCard = (fund: string): string => (BY_KEY.has(`fund-${fund}`) ? `fund-${fund}` : 'home');
export const reportShareCard = (division: string | null | undefined): string => (BY_KEY.has(`report-${division}`) ? `report-${division}` : 'report');

const EVENT_CARD: Record<string, string> = {
  aperitivo: 'event-aperitivo',
  division_event: 'event-division',
  online_call: 'event-online-call',
  guest: 'event-guest',
  guest_event: 'event-guest',
  alumni_call: 'event-alumni-call',
  company_visit: 'event-company-visit',
  association_wide: 'event-association-wide',
  association_on_display: 'event-on-display',
};
export const eventShareCard = (type: string | null | undefined): string => EVENT_CARD[String(type ?? '')] ?? 'event';

/** The card for any site address the registry knows; the homepage's otherwise. */
export function shareCardForPath(path: string): string {
  const p = SHARE_ALIASES[path] ?? path;
  if (ROUTE_SHARE_CARD[p]) return ROUTE_SHARE_CARD[p];
  let m = /^\/divisions\/([a-z-]+)$/.exec(p);
  if (m) return divisionShareCard(m[1]);
  m = /^\/funds\/([a-z-]+)$/.exec(p);
  if (m) return fundShareCard(m[1]);
  if (/^\/archive\/[^/]+$/.test(p)) return 'report';
  if (/^\/(events\/[^/]+\/register|e\/[^/]+)$/.test(p)) return 'event';
  if (/^\/(forms|f)\/[^/]+$/.test(p)) return 'form';
  if (p === '/workspace' || p.startsWith('/workspace/')) return 'workspace';
  return 'home';
}

// =====================================================================
// THE WORKSPACE'S ADDRESSES, FOR THEIR CARDS.
// ---------------------------------------------------------------------
// Members pass workspace links to one another ("the commitment form is at
// minervaims.org/workspace/my-profile/commitment"). The pages are behind
// sign-in and never indexed, but the card still says which page it is.
// The build cannot read lib/workspace-nav.ts (it imports the app's
// aliases and icons), so the addresses are listed here once more;
// scripts/share-previews.test.mjs fails the moment the two lists differ.
// =====================================================================

export interface WorkspaceShareSection {
  slug: string;
  label: string;
  card: string;
  /** [slug, label] of each subsection, as the navigation lists them. */
  subs: [string, string][];
}

export const WORKSPACE_SHARE_SECTIONS: WorkspaceShareSection[] = [
  { slug: 'dashboard', label: 'Dashboard', card: 'ws-dashboard', subs: [] },
  { slug: 'my-profile', label: 'My Profile', card: 'ws-my-profile', subs: [['personal-information', 'Personal Information'], ['membership', 'Membership'], ['commitment', 'Commitment']] },
  { slug: 'career', label: 'Career', card: 'ws-career', subs: [['cv-and-cover-letter', 'CV & Cover Letter'], ['linkedin', 'LinkedIn'], ['ib-questions', 'IB Questions'], ['brainteasers', 'Brainteasers'], ['gpa-converter', 'GPA Converter'], ['gmat-resources', 'GMAT Resources'], ['smart-tracker', 'Smart Tracker']] },
  { slug: 'calendar', label: 'Calendar', card: 'ws-calendar', subs: [] },
  { slug: 'reports', label: 'Reports', card: 'ws-reports', subs: [['upload', 'Upload Report'], ['archive', 'Report Archive'], ['templates', 'Templates & Repositories'], ['fund-performances', 'Fund Performances'], ['division-pages', 'Division Pages']] },
  { slug: 'applications', label: 'Recruiting', card: 'ws-recruiting', subs: [['screening', 'Candidates Screening'], ['interview-calendar', 'Interview Calendar'], ['phone-calls', 'Phone Calls'], ['offers', 'Offers'], ['application-setup', 'Application Setup'], ['applicant-preview', 'Applicant Preview']] },
  { slug: 'events', label: 'Events', card: 'ws-events', subs: [['my-events', 'My Events'], ['create', 'Create Event'], ['registration-forms', 'Registration Forms'], ['attendance', 'Attendance'], ['archive', 'Event Archive'], ['association-on-display', 'Association On Display']] },
  { slug: 'people', label: 'People', card: 'ws-people', subs: [['members', 'Members'], ['time-machine', 'Time Machine'], ['network', 'Network'], ['alumni', 'Alumni'], ['invites', 'Invites']] },
  { slug: 'social-media', label: 'Social Media', card: 'ws-social-media', subs: [['editorial-calendar', 'Editorial Calendar'], ['social-templates', 'Social Templates'], ['graphics', 'MIMS Graphics'], ['design-system', 'Design System'], ['ads-and-spending', 'Ads & Spending']] },
  { slug: 'operations', label: 'Operations', card: 'ws-operations', subs: [['membership-fees', 'Membership Fees'], ['treasury', 'Treasury'], ['forms', 'Forms'], ['external-relations', 'External Relations'], ['statute-and-documents', 'Statute & Documents']] },
  { slug: 'website', label: 'Website', card: 'ws-website', subs: [['pages', 'Pages'], ['readings', 'Readings'], ['testimonials', 'Testimonials'], ['partnerships', 'Partnerships'], ['history', 'History'], ['faqs', 'FAQs'], ['newsletter', 'Newsletter']] },
  { slug: 'settings', label: 'Settings', card: 'ws-settings', subs: [['users', 'Users'], ['role-permissions', 'Role Permissions'], ['activity-log', 'Activity Log'], ['automatic-emails', 'Automatic Emails'], ['sent-emails', 'Sent Emails'], ['certificates', 'Certificates'], ['declarations', 'Declarations']] },
  { slug: 'how-to-use', label: 'How To Use', card: 'ws-how-to-use', subs: [] },
];

/** The applicant's own pages: the same section address, other pages. */
export const WORKSPACE_APPLICANT_SHARE_SECTIONS: WorkspaceShareSection[] = [
  { slug: 'applications', label: 'My Application', card: 'ws-my-application', subs: [['status', 'Status'], ['interview', 'Interview'], ['phone-call', 'Phone Call'], ['offer', 'Offer']] },
  { slug: 'faqs', label: 'FAQs', card: 'ws-my-application', subs: [] },
];

export interface WorkspaceSharePage {
  path: string;
  /** The tab's title, the workspace's own. */
  documentTitle: string;
  /** The card's title, before the Society's name is added (lib/seo/head.ts). */
  title: string;
  description: string;
  card: string;
}

const WS_NAME = 'Minerva Investment Management Society';

/**
 * Every workspace address with its card: the bare workspace, each
 * section and each subsection. The tab title is the workspace's own
 * ("Brainteasers | Workspace | MIMS", MinervaWorkspace.tsx).
 */
export function workspaceSharePages(): WorkspaceSharePage[] {
  const out = new Map<string, WorkspaceSharePage>();
  out.set('/workspace', {
    path: '/workspace', documentTitle: 'Workspace | MIMS', title: 'Workspace', card: 'workspace',
    description: `The workspace of ${WS_NAME}, for its members and applicants. Sign in to open it.`,
  });
  for (const s of [...WORKSPACE_SHARE_SECTIONS, ...WORKSPACE_APPLICANT_SHARE_SECTIONS]) {
    const sectionPath = `/workspace/${s.slug}`;
    if (!out.has(sectionPath)) {
      out.set(sectionPath, {
        path: sectionPath, documentTitle: `${s.label} | Workspace | MIMS`, title: `${s.label} | Workspace`, card: s.card,
        description: `${s.label}, in the workspace of ${WS_NAME}. Sign in to open it.`,
      });
    }
    for (const [slug, label] of s.subs) {
      const p = `${sectionPath}/${slug}`;
      if (out.has(p)) continue;
      out.set(p, {
        path: p, documentTitle: `${label} | Workspace | MIMS`, title: `${label} | Workspace`, card: s.card,
        description: `${label}, in the ${s.label} section of the workspace of ${WS_NAME}. Sign in to open it.`,
      });
    }
  }
  return [...out.values()];
}
