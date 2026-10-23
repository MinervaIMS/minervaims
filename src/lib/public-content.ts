// =====================================================================
// The words of the division and fund pages, in one place.
// ---------------------------------------------------------------------
// Read by the pages themselves (DivisionDetail, FundDetail) and by the
// static copies the build writes of them (vite.static-pages.ts), so a
// crawler reading the HTML and a person reading the page get the same
// sentences. Plain data with no imports, so the build can load it.
// =====================================================================

export type ContentDivision = 'equity' | 'investment' | 'macro' | 'portfolio' | 'quant';
export type ContentFund = 'long-short' | 'multi-asset' | 'dps' | 'pir';

// What a division page says above its reports.
export interface DivisionContent {
  title: string;
  subtitle: string;
  description: string;
  sectionTitle: string;
}

export const DIVISION_CONTENT: Record<ContentDivision, DivisionContent> = {
  equity: {
    title: 'Equity Research',
    subtitle: 'Company analysis with valuation models and investment theses',
    description: 'Equity Research produces single-name coverage reports across sectors, translating business fundamentals into actionable, risk-aware views. Each report combines industry and competitive analysis, full financial statement modelling, and a dual valuation framework (discounted cash flow and relative multiples) to derive a target price and recommendation. Work is organised in small coverage teams led by a Lead Analyst, under the oversight of the Division\'s Co-Heads, with standardised sections on thesis, catalysts, and key risks.',
    sectionTitle: 'Latest Reports',
  },
  investment: {
    title: 'Investment Research',
    subtitle: 'Cross-asset views, scenarios, and actionable market positioning',
    description: 'Investment Research delivers cross-asset strategy for MIMS\' virtual portfolios, translating macro conditions into actionable positioning. The team publishes periodic Global Outlooks and Trade Ideas covering growth, inflation and policy scenarios, tactical asset-allocation views, and focused recommendations across equities, rates/credit, FX and commodities. Structured under a Head/Co-Head, research is organised into specialist desks: Equities Strategy, Fixed Income, and FX & Commodities, each led by senior strategists and supported by analysts.',
    sectionTitle: 'Latest Outlooks',
  },
  macro: {
    title: 'Macro Research',
    subtitle: 'Global policy analysis with clear market transmission channels',
    description: 'Macro Research produces thematic reports on global policy regimes and structural shifts in the international economy, linking macro narratives to market channels. Recent work spans monetary-policy scenarios across major economies, Europe\'s growth divergences and fiscal sustainability, China\'s rebalancing/deflation risks, and the move from dollarisation toward a more multipolar monetary system, including payments infrastructure. The division is led by a Head and Co-Head, supported by group leaders and analysts who build data-backed frameworks, scenarios and cross-asset implications.',
    sectionTitle: 'Latest Reports',
  },
  portfolio: {
    title: 'Portfolio Management',
    subtitle: 'Converts research into disciplined portfolios and rebalancing',
    description: 'The Portfolio Management Division designs, runs and reports on MIMS\'s proprietary student-managed portfolios, translating research into implementable allocations across equities, rates and commodities. The team sets strategic views, builds diversified portfolios, sizes positions via risk contribution and liquidity, and rebalances semi-annually with interim adjustments around market dislocations. Analysts conduct security and trade due diligence, monitor performance and exposures, and maintain transparent holdings disclosure. Derivatives are used only to hedge currency and tail risks, not to add net leverage.',
    sectionTitle: 'Latest Funds Updates',
  },
  quant: {
    title: 'Quantitative Research',
    subtitle: 'Models and tools for risk, forecasting, derivatives and much more',
    description: 'Quantitative Research applies advanced mathematical and statistical methods to open problems at the frontier of financial markets. The division develops models for risk measurement, forecasting and derivatives pricing, drawing on probability theory, statistical inference, optimisation and machine learning. Since the most interesting problems sit at the intersection of disciplines, the team deliberately brings together students from different quantitative backgrounds. Mathematics, economics, finance, AI and computer science all have a seat at the table: each member brings their own expertise and way of framing problems, and builds new ones by working alongside people who were trained entirely differently, replicating the collaborative structure of a real quantitative research team.',
    sectionTitle: 'Latest Research Publications',
  },
};

// The one-line description of each fund on the Portfolio Management page.
export const FUND_DESCRIPTIONS: Record<ContentFund, string> = {
  'multi-asset': 'Global diversified portfolio across equities, bonds, commodities.',
  'long-short': 'Market-neutral equity strategy driven by multi-factor signals.',
  'dps': 'ETF-based allocation delivering diversified, low-idiosyncratic exposure.',
  'pir': 'Italian equity portfolio aligned with PIR investment rules.',
};

// What a fund page says above its figures.
export interface FundContent {
  title: string;
  subtitle: string;
  description: string;
  sectionTitle: string;
  /** Why the fund has no benchmark, under its table. */
  benchmarkNote?: string;
}

export const FUND_CONTENT: Record<ContentFund, FundContent> = {
  'multi-asset': {
    title: 'Multi Asset Global Opportunities Fund',
    subtitle: 'Global diversified portfolio across equities, bonds, commodities',
    description: 'The Multi Asset Global Opportunities Fund is MIMS\' actively managed, disclosed portfolio investing in listed equities, sovereign and credit instruments, and commodities. The mandate targets long-term capital growth with controlled volatility through diversified, opportunity-driven allocation across geographies, currencies and sectors. Position sizing is guided by marginal risk contribution, correlations and liquidity, typically across ~30 holdings. The team publishes semi-annual rebalancing reports and interim adjustments around market dislocations. Derivatives are used only for currency and tail-risk hedging, never for net leverage.',
    sectionTitle: 'Latest Fund Updates',
    benchmarkNote: 'Given its dynamic, opportunity-driven mandate and its wide investment universe, the portfolio does not have a reference benchmark upon which to calculate the alpha. Multi-strategy absolute-return indices (HFRI) would be the closest proxy, but are still far from a long-only, no-leverage strategy.',
  },
  'long-short': {
    title: 'Long Short Equity Fund',
    subtitle: 'Market-neutral equity strategy driven by multi-factor signals',
    description: 'MIMS\' Long Short Equity Fund is a semi-automated, actively managed, zero-net-investment portfolio designed to deliver positive absolute returns across market regimes. The team builds a market-neutral book across US and European equities by ranking stocks through a proprietary multi-factor model (value, momentum, quality, low volatility, yield and illiquidity) and taking offsetting long and short positions. Signals are standardised and winsorised, with sector and geographic balance checks. Allocations are reviewed at each rebalancing and documented in periodic reports.',
    sectionTitle: 'Latest Fund Updates',
    benchmarkNote: 'Given its semi-automated approach and zero-net-investment multi-factor strategy, the portfolio does not have a reference benchmark upon which to calculate the alpha.',
  },
  'dps': {
    title: 'Diversified Passive Selection Fund',
    subtitle: 'ETF-based allocation delivering diversified, low-idiosyncratic exposure.',
    description: 'ETF-only portfolio selecting UCITS instruments to express sector and macro themes while minimising idiosyncratic risk. The team sets strategic weights across equities, fixed income and commodities, diversified by region, sector and duration, and implements currency hedging where appropriate. Allocation is reviewed through semi-annual reports and interim adjustment notes when regimes shift (e.g., tariffs, fiscal shocks, rate repricing). Risk is monitored via VaR/Expected Shortfall and stress-aware duration management.',
    sectionTitle: 'Latest Fund Updates',
  },
  'pir': {
    title: 'Italian Equity PIR Fund',
    subtitle: 'Italian equity portfolio aligned with PIR investment rules.',
    description: 'The Italian Equity PIR Fund is MIMS\' actively managed, long-only portfolio investing exclusively in Italian equities within the PIR (Piano Individuale di Risparmio) framework. Portfolio construction combines a top-down view on the Italian macro backdrop with bottom-up single-name selection, while respecting PIR constraints on domestic issuers and minimum exposure to non-FTSE MIB constituents. Performance is assessed versus a blended FTSE MIB / FTSE Italia Mid-Small PIR benchmark, supported by VaR/Expected Shortfall risk monitoring.',
    sectionTitle: 'Latest Fund Updates',
  },
};
