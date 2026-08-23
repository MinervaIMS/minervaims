// =====================================================================
// /join page copy.
// ---------------------------------------------------------------------
// Editorial copy that does not change between intakes lives here so the
// page components stay layout-only. Everything that DOES change between
// intakes (status, dates, semester label, division questions, FAQ
// entries, key figures) is read from Supabase at runtime and is never
// hardcoded: see useApplicationSettings, useDivisionQuestions,
// useJoinFaqs and useKeyFigures.
// =====================================================================

export const JOIN_HERO = {
  title: 'Join Minerva',
  payoff: 'Built like an investment firm, run by students. Your first step towards a career in finance.',
  /** Invitation at the foot of the dark stage, in place of a bare "Scroll". */
  scrollCue: 'Discover how to join',
} as const;

export const JOIN_SOCIETY = {
  heading: 'Minerva Investment Management Society',
  lead: 'Minerva Investment Management Society is promoted and run by students of Bocconi University. Founded in 2017, it is Bocconi’s first association dedicated to asset management.',
  statements: [
    {
      figure: '5',
      title: 'Core Divisions',
      body: 'Equity Research, Investment Research, Macro Research, Portfolio Management and Quantitative Research, each built to the standard of a professional investment house, and supported by Media and Communication and by Operations.',
    },
    {
      figure: '2',
      title: 'Student-managed Funds',
      body: 'The Multi-Asset Global Opportunities Fund and the Long-Short Equity Fund, run across global markets and asset classes on the Society’s own research and views.',
    },
  ],
} as const;

export const JOIN_DIVISIONS = [
  {
    key: 'equity',
    name: 'Equity Research',
    description:
      'Coverage begins with the industry, not the company. We first establish which metrics and models matter within a sector, then build company-level analysis on that foundation.',
    video: '/media/join/mims-join-equity.mp4',
    poster: '/media/join/mims-join-equity-poster.webp',
  },
  {
    key: 'investment',
    name: 'Investment Research',
    description:
      'The Global Outlook is structured as the market outlooks published by leading investment banks, globally covering equities, fixed income, currencies and commodities.',
    video: '/media/join/mims-join-investment.mp4',
    poster: '/media/join/mims-join-investment-poster.webp',
  },
  {
    key: 'macro',
    name: 'Macro Research',
    description:
      'Our reports examine in depth how shifts in the global economy and the decisions of central banks will shape the years ahead.',
    video: '/media/join/mims-join-macro.mp4',
    poster: '/media/join/mims-join-macro-poster.webp',
  },
  {
    key: 'portfolio',
    name: 'Portfolio Management',
    description:
      'We’re the only society at Bocconi running two virtual funds: the Multi-Asset Global Opportunities Fund and the Long-Short Equity Fund. Just like asset managers.',
    // Option 1 (fund performance) is live; option 2 (report page population)
    // ships alongside it at /media/join/mims-join-portfolio-report.mp4 and is
    // swapped by changing these two lines.
    video: '/media/join/mims-join-portfolio-performance.mp4',
    poster: '/media/join/mims-join-portfolio-performance-poster.webp',
  },
  {
    key: 'quant',
    name: 'Quantitative Research',
    description:
      'We write our own original research rather than testing existing work, covering niches such as exotic option pricing and volatility modelling, while applying machine learning and neural networks to market data.',
    video: '/media/join/mims-join-quant.mp4',
    poster: '/media/join/mims-join-quant-poster.webp',
  },
] as const;

export type JoinDivision = (typeof JOIN_DIVISIONS)[number];

export const JOIN_JOURNEY = {
  heading: 'The Application Journey',
  lead: 'Admissions run once each academic semester. The process has four stages.',
  steps: [
    {
      n: 1,
      title: 'Prepare your materials',
      body: 'Assemble two documents before sending the application form: your curriculum vitae and the written answer for your first-choice division. The CV and written answer must be submitted as single PDFs named Surname_Name_CV.pdf and Surname_Name_Answer.pdf.',
      files: ['Surname_Name_CV.pdf', 'Surname_Name_Answer.pdf'],
    },
    {
      n: 2,
      title: 'Submit your application',
      body: 'Complete the online form by expressing your preference for a first-choice and a second-choice division and uploading your two documents, correctly formatted and named. Make sure your account is created and verified to track your application status. Applications are reviewed on a rolling basis, so submitting earlier in the intake window may work in your favour.',
      files: [],
    },
    {
      n: 3,
      title: 'Interview',
      body: 'Candidates who pass the initial screening are invited to interview with current members of the Society. The interview is conducted entirely in English. It assesses your technical knowledge relevant to the division applied for, calibrated to your year and course of study; your awareness of current market news and data, as a direct indicator of the time you dedicate to following markets; and your motivation for applying to Minerva specifically.',
      files: [],
    },
    {
      n: 4,
      title: 'Onboarding',
      body: 'Successful candidates join the analyst team of their division, working under the guidance of team leaders and senior analysts from day one, and contributing to the team’s work as they learn the Society’s research process directly from their peers.',
      files: [],
    },
  ],
} as const;

export const JOIN_WRITTEN = {
  heading: 'Craft your Application',
  lead: 'Each application requires the answer to one of the written question below.',
  divisions: [
    { key: 'equity', name: 'Equity Research' },
    { key: 'investment', name: 'Investment Research' },
    { key: 'macro', name: 'Macro Research' },
    { key: 'portfolio', name: 'Portfolio Management' },
    { key: 'quant', name: 'Quantitative Research' },
  ],
  /** Designed empty state, shown once rather than repeated per division. */
  emptyState: 'Published ahead of the next intake',
} as const;

export const JOIN_STATUS_COPY = {
  openHeading: 'Applications open',
  closedHeading: 'Applications closed',
  /** Closed-state sentence for the Status block, directly under the hero. */
  closedBodyTop: 'Admissions open at the start of each academic semester.',
  /** Closed-state sentence for the Close block at the foot of the page. */
  closedBodyBottom: 'Admissions open once each academic semester.',
  /**
   * Second closed-state sentence. Between intakes the most useful thing a
   * prospective candidate can do is read the work, so the closed state sends
   * them to the archive rather than leaving them with nothing to act on.
   */
  closedInvitation: '\n',
  applyLabel: 'Apply',
  archiveLabel: 'Read Our Reports',
  contactLabel: '',
} as const;

export const JOIN_FAQ_HEADING = 'Frequently Asked Questions';

/**
 * Builds the open-state sentence. Date and time come from application_settings
 * and are formatted in UK English against Europe/Rome, the CET/CEST zone the
 * published deadline is quoted in.
 */
export function formatDeadlineSentence(semesterLabel: string, endDate: Date | null): string {
  if (!endDate) {
    return `Applications for ${semesterLabel} are open.`;
  }
  const date = new Intl.DateTimeFormat('en-GB', {
    day: 'numeric',
    month: 'long',
    timeZone: 'Europe/Rome',
  }).format(endDate);
  const time = new Intl.DateTimeFormat('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZone: 'Europe/Rome',
  }).format(endDate);
  return `Applications for ${semesterLabel} close on ${date} at ${time} CET.`;
}
