// =====================================================================
// What every public page IS, in words, in one place.
// ---------------------------------------------------------------------
// Each route below carries the title a search result shows, the sentence
// underneath it, and whether the page belongs in the sitemap at all.
//
// WHY A REGISTRY RATHER THAN A TAG PER PAGE. Every page used to declare
// a title and nothing else, so twenty-odd routes shared ONE description,
// ONE canonical and ONE social preview, all of them the homepage's. A
// result page for /archive told the reader about the association in
// general; a link to /join shared on LinkedIn showed the homepage's
// title. Writing the sentence beside the route, in a list that can be
// read end to end, is also the only practical way to keep twenty
// descriptions genuinely different from one another rather than twenty
// rewordings of the same one.
//
// The same list generates `public/sitemap.xml` (see
// `scripts/generate-sitemap.mjs`), so a page cannot be described here and
// then be missing from the sitemap, or the other way round.
//
// Descriptions are written to be TRUE AND SPECIFIC rather than
// promotional: they are read by search engines, by the people who see
// them under a blue link, and increasingly by language models answering
// a question about the association. All three are better served by a
// sentence that states what is on the page.
// =====================================================================

export interface RouteMeta {
  /** The `<title>`, without the site suffix, which is added by `Seo`. */
  title: string;
  /** The meta description. Aim for 140 to 165 characters. */
  description: string;
  /**
   * A different title for social previews, where there is room for
   * something less clipped than a search result allows. Optional.
   */
  socialTitle?: string;
  /** Sitemap priority, 0 to 1. Omitted routes are not in the sitemap. */
  priority?: number;
  /** How often the page's content actually changes. */
  changefreq?: 'always' | 'hourly' | 'daily' | 'weekly' | 'monthly' | 'yearly' | 'never';
  /**
   * Keep this page out of the index. Used for the pages that exist to
   * serve a signed-in flow (sign in, reset password, the workspace) and
   * for anything transactional: none of them is an answer to a search.
   */
  noindex?: boolean;
}

export const ROUTE_META: Record<string, RouteMeta> = {
  '/': {
    title: 'Minerva Investment Management Society',
    socialTitle: 'Minerva Investment Management Society, Bocconi University',
    description:
      'The Bocconi University student society for investment research and portfolio management: five research divisions, two student-managed funds, and a public research archive.',
    priority: 1.0,
    changefreq: 'weekly',
  },
  '/about': {
    title: 'About the Society',
    description:
      'How Minerva IMS is organised: its purpose, its history since 2017, its governance, and the roles and divisions that make up the association at Bocconi.',
    priority: 0.9,
    changefreq: 'monthly',
  },
  '/people/members': {
    title: 'Members',
    description:
      'The people who run Minerva IMS: the board, the heads of division, the portfolio managers, the team leaders and the analysts of the current year.',
    priority: 0.7,
    changefreq: 'monthly',
  },
  '/people/alumni': {
    title: 'Alumni Network',
    description:
      'Where Minerva IMS alumni work today, across investment banks, asset managers, hedge funds, consultancies and graduate programmes worldwide, and the calls they hold with members.',
    priority: 0.7,
    changefreq: 'monthly',
  },
  '/events': {
    title: 'Events',
    description:
      'Conferences, guest speakers, company visits and alumni calls held by Minerva IMS at Bocconi, with the full archive of past events and their speakers.',
    priority: 0.8,
    changefreq: 'weekly',
  },
  '/archive': {
    title: 'Research Archive',
    description:
      'Every report published by Minerva IMS: equity research, investment outlooks, macro analysis, fund updates and quantitative papers, searchable by division, fund and year.',
    priority: 0.9,
    changefreq: 'weekly',
  },
  '/readings': {
    title: 'Recommended Readings',
    description:
      'Books, papers and resources the divisions of Minerva IMS recommend to students learning investment research, portfolio management and quantitative finance.',
    priority: 0.6,
    changefreq: 'monthly',
  },
  '/join': {
    title: 'Join Us: Recruiting and Admissions',
    socialTitle: 'Apply to Minerva Investment Management Society',
    description:
      'Admissions to Minerva IMS, the Bocconi society founded in 2017 and dedicated to asset management: what each division does, what the application asks for, and how selection works.',
    priority: 0.9,
    changefreq: 'weekly',
  },
  '/apply': {
    title: 'Application Form',
    description:
      'The application form for Minerva IMS at Bocconi: your details, your division preferences, your CV, and the written answer to your first-choice division’s question.',
    priority: 0.7,
    changefreq: 'monthly',
  },
  '/partnerships': {
    title: 'Partnerships',
    description:
      'Structured formats for collaboration between Minerva IMS and financial institutions, asset managers, advisory firms and corporates.',
    priority: 0.6,
    changefreq: 'monthly',
  },
  '/contacts': {
    title: 'Contacts',
    description:
      'How to reach Minerva IMS at Bocconi: the association email and its social channels, and who to write to about admissions, partnerships and press.',
    priority: 0.6,
    changefreq: 'yearly',
  },
  '/statute': {
    title: 'Society Statute',
    description:
      'The official statute of Minerva Investment Management Society: purpose, governance, membership, divisions and internal procedures.',
    priority: 0.6,
    changefreq: 'yearly',
  },
  '/sitemap': {
    title: 'Sitemap',
    description:
      'Every page of the Minerva IMS website in one list: the society, its divisions and funds, its people, its research and its legal notices.',
    priority: 0.3,
    changefreq: 'monthly',
  },
  '/lab': {
    title: 'Payoff Lab',
    description:
      'An interactive tool from the Quantitative Research division of Minerva IMS for building and visualising option payoff diagrams and multi-leg structures.',
    priority: 0.5,
    changefreq: 'monthly',
  },

  // ---- Legal. Indexed, because people do search for them, but low
  // priority: nobody arrives at the association through its cookie policy.
  '/terms-of-use': {
    title: 'Terms of Use',
    description:
      'The terms governing use of the Minerva IMS website, the research it publishes and the accounts it issues to members and applicants.',
    priority: 0.2,
    changefreq: 'yearly',
  },
  '/privacy-policy': {
    title: 'Privacy Policy',
    description:
      'How Minerva Investment Management Society collects, uses and protects personal data, in line with the GDPR and Italian data protection law.',
    priority: 0.2,
    changefreq: 'yearly',
  },
  '/cookie-policy': {
    title: 'Cookie Policy',
    description:
      'How the Minerva Investment Management Society website uses cookies and similar technologies, and how to control them.',
    priority: 0.2,
    changefreq: 'yearly',
  },
  '/disclaimer': {
    title: 'Disclaimer',
    description:
      'Everything Minerva IMS publishes is produced by students for educational purposes. It is not investment advice and is not a recommendation to buy or sell.',
    priority: 0.2,
    changefreq: 'yearly',
  },

  // ---- Not for the index. -------------------------------------------
  // These exist to serve a signed-in flow or a one-time transaction.
  // None of them is an answer to anybody's search, and several would leak
  // a half-finished journey into results if they were indexed.
  '/auth': { title: 'Sign In', description: 'Sign in to the Minerva IMS workspace.', noindex: true },
  '/forgot-password': { title: 'Reset Your Password', description: 'Reset your Minerva IMS workspace password.', noindex: true },
  '/reset-password': { title: 'Choose a New Password', description: 'Choose a new password for your Minerva IMS account.', noindex: true },
  '/password-reset-success': { title: 'Password Changed', description: 'Your Minerva IMS password has been changed.', noindex: true },
  '/check-email': { title: 'Check Your Email', description: 'Confirm your email address to continue.', noindex: true },
  '/application-check-email': { title: 'Check Your Email', description: 'Confirm your email address to complete your application.', noindex: true },
  '/verify-email': { title: 'Email Verification', description: 'Verifying your email address.', noindex: true },
  '/session-expired': { title: 'Session Expired', description: 'Your session has expired. Please sign in again.', noindex: true },
  '/access-denied': { title: 'Access Denied', description: 'You do not have access to this part of the workspace.', noindex: true },
  '/pending-approval': { title: 'Approval Pending', description: 'Your account is waiting to be approved.', noindex: true },
  '/unsubscribe': { title: 'Unsubscribe', description: 'Unsubscribe from the Minerva IMS mailing list.', noindex: true },
};

// =====================================================================
// The two families of detail pages.
// ---------------------------------------------------------------------
// A division and a fund each have a page of their own, and each of those
// is a genuinely different subject: somebody searching for "student
// managed long short equity fund Bocconi" should land on that fund, not
// on the homepage. Their titles and descriptions are built from the same
// words the pages themselves use, so the two can never describe the
// subject differently.
// =====================================================================

export interface DetailMeta { title: string; description: string; priority: number }

export const DIVISION_META: Record<string, DetailMeta> = {
  equity: {
    title: 'Equity Research Division',
    description:
      'The Equity Research division of Minerva IMS: single-name coverage across sectors, with full financial modelling, discounted cash flow and relative valuation, and target prices.',
    priority: 0.8,
  },
  investment: {
    title: 'Investment Research Division',
    description:
      'The Investment Research division of Minerva IMS: cross-asset strategy, global outlooks and trade ideas across equities, rates, credit, FX and commodities.',
    priority: 0.8,
  },
  macro: {
    title: 'Macro Research Division',
    description:
      'The Macro Research division of Minerva IMS: thematic reports on monetary policy, growth and fiscal sustainability, and structural shifts in the world economy.',
    priority: 0.8,
  },
  portfolio: {
    title: 'Portfolio Management Division',
    description:
      'The Portfolio Management division of Minerva IMS: running and reporting on the society’s student-managed portfolios across equities, rates and commodities.',
    priority: 0.8,
  },
  quant: {
    title: 'Quantitative Research Division',
    description:
      'The Quantitative Research division of Minerva IMS: models for risk, forecasting and derivatives pricing, built with statistics, optimisation and machine learning.',
    priority: 0.8,
  },
};

export const FUND_META: Record<string, DetailMeta> = {
  'multi-asset': {
    title: 'Multi Asset Global Opportunities Fund',
    description:
      'A student-managed portfolio of listed equities, sovereign and credit instruments and commodities, targeting long-term growth with controlled volatility. Holdings are disclosed.',
    priority: 0.7,
  },
  'long-short': {
    title: 'Long Short Equity Fund',
    description:
      'A market-neutral, zero-net-investment student portfolio across US and European equities, built on a proprietary multi-factor model. Run by Minerva IMS at Bocconi.',
    priority: 0.7,
  },
  dps: {
    title: 'Diversified Passive Selection Fund',
    description:
      'A closed ETF-only student portfolio of UCITS instruments expressing sector and macro themes with minimal idiosyncratic risk. Run by Minerva IMS at Bocconi.',
    priority: 0.6,
  },
  pir: {
    title: 'Italian Equity PIR Fund',
    description:
      'A closed long-only student portfolio of Italian equities within the PIR framework, combining a top-down view on the Italian economy with bottom-up single-name selection.',
    priority: 0.6,
  },
};

/**
 * Everything that belongs in `sitemap.xml`, in the order it should appear.
 *
 * Built from the three maps above rather than typed out again, so a route
 * described here is a route the sitemap knows about.
 */
export function sitemapEntries(): { path: string; priority: number; changefreq: string }[] {
  const out: { path: string; priority: number; changefreq: string }[] = [];
  for (const [path, meta] of Object.entries(ROUTE_META)) {
    if (meta.noindex || meta.priority === undefined) continue;
    out.push({ path, priority: meta.priority, changefreq: meta.changefreq ?? 'monthly' });
  }
  for (const [key, meta] of Object.entries(DIVISION_META)) {
    out.push({ path: `/divisions/${key}`, priority: meta.priority, changefreq: 'monthly' });
  }
  for (const [key, meta] of Object.entries(FUND_META)) {
    out.push({ path: `/funds/${key}`, priority: meta.priority, changefreq: 'monthly' });
  }
  return out.sort((a, b) => b.priority - a.priority || a.path.localeCompare(b.path));
}
