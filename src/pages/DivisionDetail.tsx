import { useParams, Link, Navigate } from 'react-router-dom';
import { PageIntroduction } from '@/components/shared';
import { Division, divisionLabels, Fund, fundLabels, activeFunds, closedFunds } from '@/lib/types';
import { DivisionArchiveCarousel } from '@/components/shared/DivisionArchiveCarousel';

// Background images for divisions
import equityBg from '@/assets/division-equity-bg.webp';
import investmentBg from '@/assets/division-investment-bg.webp';
import macroBg from '@/assets/division-macro-bg.webp';
import teamBg from '@/assets/team-bg.webp'; // Fallback for portfolio and quant

// Division content configuration
interface DivisionContent {
  title: string;
  subtitle: string;
  description: string;
  sectionTitle: string;
}

const divisionContent: Record<Division, DivisionContent> = {
  equity: {
    title: 'Equity Research',
    subtitle: 'Company analysis with valuation models and investment theses.',
    description: 'Equity Research produces single-name coverage reports across sectors, translating business fundamentals into actionable, risk-aware views. Each report combines industry and competitive analysis, full financial statement modelling, and a dual valuation framework (discounted cash flow and relative multiples) to derive a target price and recommendation. Work is organised in small coverage teams led by a Lead Analyst, under the oversight of the Division\'s Co-Heads, with standardised sections on thesis, catalysts, and key risks.',
    sectionTitle: 'Latest Reports',
  },
  investment: {
    title: 'Investment Research',
    subtitle: 'Cross-asset views, scenarios, and actionable market positioning.',
    description: 'Investment Research delivers cross-asset strategy for MIMS\' virtual portfolios, translating macro conditions into actionable positioning. The team publishes periodic Global Outlooks and Trade Ideas covering growth, inflation and policy scenarios, tactical asset-allocation views, and focused recommendations across equities, rates/credit, FX and commodities. Structured under a Head/Co-Head, research is organised into specialist desks — Equities Strategy, Fixed Income, and FX & Commodities — each led by senior strategists and supported by analysts.',
    sectionTitle: 'Latest Outlooks',
  },
  macro: {
    title: 'Macro Research',
    subtitle: 'Global policy analysis with clear market transmission channels.',
    description: 'Macro Research produces thematic reports on global policy regimes and structural shifts in the international economy, linking macro narratives to market channels. Recent work spans monetary-policy scenarios across major economies, Europe\'s growth divergences and fiscal sustainability, China\'s rebalancing/deflation risks, and the move from dollarisation toward a more multipolar monetary system, including payments infrastructure. The division is led by a Head and Co-Head, supported by group leaders and analysts who build data-backed frameworks, scenarios and cross-asset implications.',
    sectionTitle: 'Latest Reports',
  },
  portfolio: {
    title: 'Portfolio Management',
    subtitle: 'Converts research into disciplined portfolios and rebalancing.',
    description: 'The Portfolio Management Division designs, runs and reports on MIMS\'s proprietary student-managed portfolios, translating research into implementable allocations across equities, rates and commodities. The team sets strategic views, builds diversified portfolios, sizes positions via risk contribution and liquidity, and rebalances semi-annually with interim adjustments around market dislocations. Analysts conduct security and trade due diligence, monitor performance and exposures, and maintain transparent holdings disclosure. Derivatives are used only to hedge currency and tail risks, not to add net leverage.',
    sectionTitle: 'Latest Funds Updates',
  },
  quant: {
    title: 'Quantitative Research',
    subtitle: 'Models and tools for risk, forecasting, derivatives.',
    description: 'Quantitative Research develops models and tooling for risk, forecasting and derivatives analysis, supporting portfolio construction and systematic research across MIMS. Recent publications cover coherent risk measures (CVaR/EVaR) with EVT estimation, regularised and Bayesian regression, neural networks for prediction, barrier-option pricing via Black–Scholes and Monte Carlo/importance sampling, and path-dependent volatility models calibrated to SPX/VIX and used for option-smile simulation. Led by a Head/Co-Head, the division is organised into Model Research and Implementation streams, staffed by analysts.',
    sectionTitle: 'Latest Research Publications',
  },
};

// Background images mapping
const divisionBackgrounds: Record<Division, string> = {
  equity: equityBg,
  investment: investmentBg,
  macro: macroBg,
  portfolio: teamBg,
  quant: teamBg,
};

// Fund descriptions for the Portfolio Management page
const fundDescriptions: Record<Fund, string> = {
  'multi-asset': 'Global diversified portfolio across equities, bonds, commodities.',
  'long-short': 'Market-neutral equity strategy driven by multi-factor signals.',
  'dps': 'ETF-based allocation delivering diversified, low-idiosyncratic exposure.',
  'pir': 'Italian equity portfolio aligned with PIR investment rules.',
};

const DivisionDetail = () => {
  const { division } = useParams<{ division: string }>();

  if (!division || !divisionLabels[division as Division]) {
    return <Navigate to="/divisions" replace />;
  }

  const divisionKey = division as Division;
  const content = divisionContent[divisionKey];
  const isPortfolio = divisionKey === 'portfolio';
  const backgroundImage = divisionBackgrounds[divisionKey];

  // Combine active and closed funds for the portfolio section
  const allFunds: { fund: Fund; isActive: boolean }[] = [
    ...activeFunds.map(f => ({ fund: f, isActive: true })),
    ...closedFunds.map(f => ({ fund: f, isActive: false })),
  ];

  return (
    <>
      {/* First Section: Title and Subtitle with Background */}
      <div className="relative">
        <div 
          className="absolute inset-0 bg-cover bg-center" 
          style={{ backgroundImage: `url(${backgroundImage})` }} 
        />
        <div className="relative z-10">
          <PageIntroduction
            title={content.title}
            description={content.subtitle}
            transparentBackground
          />
        </div>
      </div>

      {/* Second Section: Our Expertise */}
      <section className="py-section-sm md:py-section bg-background">
        <div className="container">
          <h2 className="font-serif text-heading mb-6 pb-3 border-b border-separator text-accent">
            Our Expertise
          </h2>
          <p className="font-body text-body-lg text-muted-foreground mb-8 max-w-4xl">
            {content.description}
          </p>
          <Link
            to="/members/team"
            className="inline-block px-10 py-4 bg-background text-accent border border-accent font-serif text-lg shadow-none hover:bg-accent hover:text-background hover:shadow-[0_4px_10px_rgba(0,0,0,0.15)] transition-all duration-200"
          >
            Meet the Team
          </Link>
        </div>
      </section>

      {/* Portfolio Management: MIMS Virtual Portfolios Section */}
      {isPortfolio && (
        <section className="py-section-sm md:py-section bg-background">
          <div className="container">
            <h2 className="font-serif text-heading mb-8 pb-3 border-b border-separator text-accent">
              MIMS Virtual Portfolios
            </h2>
            <div className="flex flex-col gap-4 max-w-4xl">
              {allFunds.map(({ fund }) => (
                <Link
                  key={fund}
                  to={`/funds/${fund}`}
                  className="group block bg-secondary p-6 transition-all duration-300 hover:bg-foreground hover:shadow-lg"
                >
                  <h3 className="font-serif text-xl md:text-2xl mb-2 group-hover:text-background transition-colors duration-300">
                    {fundLabels[fund]}
                  </h3>
                  <p className="font-body text-body-lg text-muted-foreground group-hover:text-background/80 transition-colors duration-300">
                    {fundDescriptions[fund]}
                  </p>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Third Section: Latest Reports/Publications */}
      <section className="py-section-sm md:py-section bg-accent">
        <div className="container">
          <h2 className="font-serif text-heading mb-6 pb-3 border-b border-background/20 text-background">
            {content.sectionTitle}
          </h2>
          <DivisionArchiveCarousel division={divisionKey} />
        </div>
      </section>
    </>
  );
};

export default DivisionDetail;
