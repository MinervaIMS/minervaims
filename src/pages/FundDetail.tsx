import { useParams, Link, Navigate } from 'react-router-dom';
import { PageIntroduction, ReportsList } from '@/components/shared';
import { Fund, fundLabels, activeFunds } from '@/lib/types';
import { reports } from '@/lib/data';

const fundDescriptions: Record<Fund, string> = {
  'long-short': 'European equity long/short strategy targeting absolute returns.',
  'multi-asset': 'Global multi-asset strategy with tactical allocation.',
  'dps': 'Diversified passive selection strategy.',
  'pir': 'Italian equity strategy with PIR compliance.',
};

const FundDetail = () => {
  const { fund } = useParams<{ fund: string }>();

  if (!fund || !fundLabels[fund as Fund]) {
    return <Navigate to="/funds" replace />;
  }

  const fundKey = fund as Fund;
  const fundReports = reports.filter(r => r.fund === fundKey);
  const isActive = activeFunds.includes(fundKey);

  return (
    <>
      <PageIntroduction
        title={fundLabels[fundKey]}
        description={fundDescriptions[fundKey]}
      />

      <div className="container py-section-sm md:py-section">
        {!isActive && (
          <div className="mb-8 p-4 bg-muted border-l-2 border-primary">
            <p className="font-body text-small text-muted-foreground">
              This fund is no longer active. Historical reports are available below.
            </p>
          </div>
        )}

        <section className="mb-12">
          <h2 className="font-serif text-heading mb-6 pb-3 border-b border-separator">
            Fund Reports
          </h2>
          <ReportsList reports={fundReports} />
        </section>

        {isActive && (
          <section>
            <Link 
              to={`/members/team?fund=${fundKey}`}
              className="inline-block font-body text-body text-primary hover:underline"
            >
              View current fund team
            </Link>
          </section>
        )}
      </div>
    </>
  );
};

export default FundDetail;
