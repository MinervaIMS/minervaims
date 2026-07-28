// =====================================================================
// /join — static page copy.
//
// Only text that does not change between intakes lives here. Everything
// that does (status, semester, deadline, key figures, written questions,
// FAQ entries) is loaded from Supabase; see the hooks in src/hooks.
// =====================================================================

export interface DivisionBlurb {
  key: 'equity' | 'investment' | 'macro' | 'portfolio' | 'quant';
  name: string;
  blurb: string;
  /** What the backdrop is, for assistive technology. */
  imageAlt: string;
  /** Quantitative Research sits on pure black and bleeds slightly wider. */
  tone: 'violet' | 'black';
}

export const DIVISIONS: DivisionBlurb[] = [
  {
    key: 'equity',
    name: 'Equity Research',
    blurb:
      'Coverage begins with the industry, not the company. The division first establishes which metrics and models matter within a sector, then builds company-level analysis on that foundation, rather than starting from a single name in isolation.',
    imageAlt: 'A sector research terminal showing airline industry constituents, price charts and key metrics.',
    tone: 'violet',
  },
  {
    key: 'investment',
    name: 'Investment Research',
    blurb:
      'The Global Outlook is structured to the same standard as the capital markets outlooks published by leading investment banks, covering public markets comprehensively across equities, fixed income, currencies and commodities.',
    imageAlt: 'The planet Saturn and its rings against deep space.',
    tone: 'violet',
  },
  {
    key: 'macro',
    name: 'Macro Research',
    blurb:
      'Reports examine in depth how shifts in the global economy and the decisions of central banks will shape the years ahead.',
    imageAlt:
      'A macroeconomic dashboard showing currencies, interest rates, commodity benchmarks and equity indices.',
    tone: 'violet',
  },
  {
    key: 'portfolio',
    name: 'Portfolio Management',
    blurb:
      "The only society at Bocconi running two virtual funds: the Multi-Asset Global Opportunities Fund and the Long-Short Equity Fund. The division designs, runs and reports on both, translating the other divisions' research into implementable allocations across equities, rates and commodities.",
    imageAlt: 'The entrance to the New York Stock Exchange, with the flag above the facade.',
    tone: 'violet',
  },
  {
    key: 'quant',
    name: 'Quantitative Research',
    blurb:
      "The division writes its own original research rather than testing existing work, produced to academic research standards. It covers niches most student research never reaches, including exotic option pricing, forecasting, machine learning and neural networks applied to financial markets, alongside the risk metrics' profile of the two virtual funds.",
    imageAlt: 'Dense white mathematical formulae for derivatives pricing and stochastic processes on a black ground.',
    tone: 'black',
  },
];

export interface AdmissionStep {
  number: string;
  title: string;
  body: string;
}

export const ADMISSION_STEPS: AdmissionStep[] = [
  {
    number: '01',
    title: 'Prepare your materials',
    body: 'Assemble two documents before opening the form: your curriculum vitae and the written answer for your first-choice division. The CV and written answer must be submitted as single PDFs named Surname_Name_CV.pdf and Surname_Name_Answer.pdf.',
  },
  {
    number: '02',
    title: 'Submit your application',
    body: 'Complete the online form by expressing your preference for a first-choice and a second-choice division and uploading your two documents, correctly formatted and named. Make sure your account is created and verified to track your application status. Applications are reviewed on a rolling basis, so submitting earlier in the intake window may work in your favour.',
  },
  {
    number: '03',
    title: 'Interview',
    body: 'Candidates who pass the initial screening are invited to interview with current members of the Society. The interview is conducted entirely in English. It assesses your technical knowledge relevant to the division applied for, calibrated to your year and course of study; your awareness of current market news and data, as a direct indicator of the time you dedicate to following markets; and your motivation for applying to Minerva specifically.',
  },
  {
    number: '04',
    title: 'Onboarding',
    body: "Successful candidates join the analyst team of their division, working under the guidance of team leaders and senior analysts from day one, and contributing to the team's work as they learn the Society's research process directly from their peers.",
  },
];

// ---------------------------------------------------------------------
// Alumni wall.
//
// Twenty destinations selected from public/logos/ and weighted on
// prestige: leading investment banks, hedge funds, asset managers, the
// three strategy consultancies, and the academic programmes members go on
// to. Bocconi itself is deliberately absent: it is where members come
// from, not where they go. Grouped so the wall reads as an argument
// rather than a list.
// ---------------------------------------------------------------------

export interface AlumniLogo {
  file: string;
  name: string;
}

export interface AlumniLogoGroup {
  title: string;
  logos: AlumniLogo[];
}

export const ALUMNI_GROUPS: AlumniLogoGroup[] = [
  {
    title: 'Investment banking',
    logos: [
      { file: 'goldman-sachs.svg', name: 'Goldman Sachs' },
      { file: 'morgan-stanley.svg', name: 'Morgan Stanley' },
      { file: 'j-p-morgan.svg', name: 'J.P. Morgan' },
      { file: 'lazard.svg', name: 'Lazard' },
      { file: 'rothschild-and-co.svg', name: 'Rothschild & Co' },
      { file: 'mediobanca.svg', name: 'Mediobanca' },
    ],
  },
  {
    title: 'Hedge funds and asset management',
    logos: [
      { file: 'citadel.svg', name: 'Citadel' },
      { file: 'd-e-shaw.svg', name: 'D. E. Shaw & Co.' },
      { file: 'squarepoint-capital.svg', name: 'Squarepoint Capital' },
      { file: 'blackrock.svg', name: 'BlackRock' },
      { file: 'pimco.svg', name: 'PIMCO' },
      { file: 'ares-management.svg', name: 'Ares Management' },
    ],
  },
  {
    title: 'Consulting and institutions',
    logos: [
      { file: 'mckinsey-and-company.svg', name: 'McKinsey & Company' },
      { file: 'boston-consulting-group.svg', name: 'Boston Consulting Group' },
      { file: 'bain-and-company.svg', name: 'Bain & Company' },
      { file: 'european-central-bank.svg', name: 'European Central Bank' },
    ],
  },
  {
    title: 'Graduate study',
    logos: [
      { file: 'university-of-oxford.svg', name: 'University of Oxford' },
      { file: 'mit.svg', name: 'Massachusetts Institute of Technology' },
      { file: 'london-school-of-economics.svg', name: 'London School of Economics' },
      { file: 'london-business-school.svg', name: 'London Business School' },
    ],
  },
];
