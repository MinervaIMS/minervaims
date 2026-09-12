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
      body: 'Complete the online form by expressing your preference for a first-choice and a second-choice division and uploading your two documents, correctly formatted and named. Make sure your Minerva account is created and verified to track your application status. Applications are reviewed on a rolling basis, so submitting earlier in the intake window may work in your favour.',
      files: [],
    },
    {
      n: 3,
      title: 'Interview',
      body: 'Candidates who pass the initial screening are invited to interview with current members of the Society. It assesses your technical knowledge relevant to the division applied for, calibrated to your year and course of study, your awareness of current market news and data, and your motivation for applying to Minerva specifically.',
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
  lead: 'Answer the written question for your first-choice division.',
  constraints: [
    'Main answer: maximum one page.',
    'Appendix: up to two pages for charts and tables.',
    'Font size: minimum 10pt.',
  ],
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
  /**
   * Closed, but with a date. It is a different fact from "closed" and it
   * deserves its own heading: a candidate scanning the page should be able
   * to tell the two apart without reading the sentence under them.
   */
  scheduledHeading: 'Applications opening soon',
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

// =====================================================================
// THE TWO DATES THE PAGE ACTUALLY KNOWS, SAID OUT LOUD.
// ---------------------------------------------------------------------
// `application_settings` holds a start and an end, to the minute, and the
// page was using them ONLY to decide which of two headings to print. A
// candidate arriving between intakes was told "Admissions open at the
// start of each academic semester", which is true of the association in
// general and says nothing about the intake that is already scheduled and
// already has a date. That is a candidate who has to come back and check,
// repeatedly, for information the page is holding.
//
// So when a window is scheduled the closed state names the day and the
// hour it opens, and the open state names the day and the hour it closes.
// Both in Europe/Rome, which is the zone the deadline is published in, and
// both in UK English to match the rest of the site.
// =====================================================================

/** Day and hour in the zone the association publishes its deadlines in. */
function romeDateTime(when: Date): { date: string; time: string } {
  return {
    date: new Intl.DateTimeFormat('en-GB', {
      day: 'numeric',
      month: 'long',
      timeZone: 'Europe/Rome',
    }).format(when),
    time: new Intl.DateTimeFormat('en-GB', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
      timeZone: 'Europe/Rome',
    }).format(when),
  };
}

/**
 * Builds the open-state sentence.
 *
 * IT NAMES THE OTHER WAY THE WINDOW CAN END. The published date is a
 * deadline, not a promise of how long the places last: an intake closes on
 * that date OR when the available places are filled, whichever comes
 * first, and a candidate who reads only the date can reasonably conclude
 * there is no hurry. Saying both is the difference between a deadline and
 * an accurate deadline.
 */
export function formatDeadlineSentence(semesterLabel: string, endDate: Date | null): string {
  if (!endDate) {
    return `Applications for ${semesterLabel} are open, and close once the available spots are filled.`;
  }
  const { date, time } = romeDateTime(endDate);
  return `Applications for ${semesterLabel} close on ${date} at ${time} CET, or sooner upon successful filling of available spots.`;
}

/**
 * The closed-state sentence WHEN, AND ONLY WHEN, a window is scheduled and
 * has not started yet.
 *
 * `null` for everything else - no configured window, or a window that has
 * already ended - so the caller falls back to the general sentence rather
 * than announcing a date that has passed. That fallback is the reason this
 * returns null instead of a string: an intake whose end has gone by is
 * closed with nothing scheduled, and printing its old start date would be
 * worse than saying nothing.
 */
export function formatOpeningSentence(
  semesterLabel: string,
  startDate: Date | null,
  now: Date = new Date(),
): string | null {
  if (!startDate) return null;
  if (startDate.getTime() <= now.getTime()) return null;
  const { date, time } = romeDateTime(startDate);
  return `Applications for ${semesterLabel} will open on ${date} at ${time} CET.`;
}
