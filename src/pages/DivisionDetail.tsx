import { useParams, Link, Navigate } from 'react-router-dom';
import { PageIntroduction, ReportsList } from '@/components/shared';
import { Division, divisionLabels } from '@/lib/types';
import { reports } from '@/lib/data';

const divisionDescriptions: Record<Division, string> = {
  equity: 'Fundamental analysis of public equities across sectors and geographies.',
  investment: 'Analysis of private market opportunities and M&A transactions.',
  macro: 'Macroeconomic analysis and monetary policy research.',
  portfolio: 'Management of simulated investment portfolios.',
  quant: 'Quantitative strategies and systematic investment research.',
};

const DivisionDetail = () => {
  const { division } = useParams<{ division: string }>();

  if (!division || !divisionLabels[division as Division]) {
    return <Navigate to="/divisions" replace />;
  }

  const divisionKey = division as Division;
  const divisionReports = reports.filter(r => r.division === divisionKey && !r.fund);

  // Special handling for portfolio management
  if (divisionKey === 'portfolio') {
    return (
      <>
        <PageIntroduction
          title={divisionLabels[divisionKey]}
          description={divisionDescriptions[divisionKey]}
        />

        <div className="container py-section-sm md:py-section">
          <section className="mb-12">
            <h2 className="font-serif text-heading mb-6 pb-3 border-b border-separator">
              Active Funds
            </h2>
            <div className="space-y-4">
              <Link 
                to="/funds/long-short" 
                className="block group py-4 border-b border-separator"
              >
                <h3 className="font-serif text-subheading group-hover:text-primary transition-colors">
                  Long Short Equity Fund
                </h3>
                <p className="font-body text-small text-muted-foreground mt-1">
                  European equity long/short strategy with defined risk parameters.
                </p>
              </Link>
              <Link 
                to="/funds/multi-asset" 
                className="block group py-4 border-b border-separator"
              >
                <h3 className="font-serif text-subheading group-hover:text-primary transition-colors">
                  Multi Asset Global Opportunities Fund
                </h3>
                <p className="font-body text-small text-muted-foreground mt-1">
                  Global multi-asset strategy with tactical allocation.
                </p>
              </Link>
            </div>
          </section>

          <section className="mb-12">
            <h2 className="font-serif text-heading mb-6 pb-3 border-b border-separator">
              Previous Funds
            </h2>
            <p className="font-body text-body text-muted-foreground mb-4">
              Historical fund reports are available in the archive.
            </p>
            <Link 
              to="/archive" 
              className="inline-block font-serif italic underline text-primary hover:opacity-80 transition-opacity"
            >
              View archive
            </Link>
          </section>

          <section>
            <Link 
              to="/members/team?division=portfolio" 
              className="inline-block font-serif italic underline text-primary hover:opacity-80 transition-opacity"
            >
              View current Portfolio Management team
            </Link>
          </section>
        </div>
      </>
    );
  }

  return (
    <>
      <PageIntroduction
        title={divisionLabels[divisionKey]}
        description={divisionDescriptions[divisionKey]}
      />

      <div className="container py-section-sm md:py-section">
        <section className="mb-12">
          <h2 className="font-serif text-heading mb-6 pb-3 border-b border-separator">
            {divisionKey === 'quant' ? 'Publications' : 'Reports'}
          </h2>
          <ReportsList reports={divisionReports} />
        </section>

        <section>
          <Link 
            to={`/members/team?division=${divisionKey}`}
            className="inline-block font-serif italic underline text-primary hover:opacity-80 transition-opacity"
          >
            View current {divisionLabels[divisionKey]} team
          </Link>
        </section>
      </div>
    </>
  );
};

export default DivisionDetail;
