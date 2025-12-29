import { useParams, Navigate } from 'react-router-dom';
import { PageIntroduction, FundArchiveCarousel } from '@/components/shared';
import { Fund, fundLabels, activeFunds } from '@/lib/types';

interface FundContent {
  title: string;
  subtitle: string;
  description: string;
  sectionTitle: string;
}

const fundContent: Record<Fund, FundContent> = {
  'multi-asset': {
    title: 'Multi Asset Global Opportunities Fund',
    subtitle: 'Global diversified portfolio across equities, bonds, commodities.',
    description: '',
    sectionTitle: 'Latest Fund Updates',
  },
  'long-short': {
    title: 'Long Short Equity Fund',
    subtitle: 'Market-neutral equity strategy driven by multi-factor signals.',
    description: '',
    sectionTitle: 'Latest Fund Updates',
  },
  'dps': {
    title: 'Diversified Passive Selection Fund',
    subtitle: 'ETF-based allocation delivering diversified, low-idiosyncratic exposure.',
    description: '',
    sectionTitle: 'Latest Fund Updates',
  },
  'pir': {
    title: 'Italian Equity PIR Fund',
    subtitle: 'Italian equity portfolio aligned with PIR investment rules.',
    description: '',
    sectionTitle: 'Latest Fund Updates',
  },
};

const FundDetail = () => {
  const { fund } = useParams<{ fund: string }>();

  if (!fund || !fundLabels[fund as Fund]) {
    return <Navigate to="/" replace />;
  }

  const fundKey = fund as Fund;
  const content = fundContent[fundKey];
  const isActive = activeFunds.includes(fundKey);

  return (
    <>
      {/* Hero Section */}
      <PageIntroduction
        title={content.title}
        description={content.subtitle}
      />

      {/* Inactive Fund Notice */}
      {!isActive && (
        <div className="container py-6">
          <div className="p-4 bg-muted border-l-2 border-primary">
            <p className="font-body text-small text-muted-foreground">
              This fund is no longer active. Historical updates are available below.
            </p>
          </div>
        </div>
      )}

      {/* Our Expertise Section */}
      {content.description && (
        <section className="py-section-sm md:py-section">
          <div className="container">
            <h2 className="font-serif text-heading mb-6 pb-3 border-b border-separator">
              Our Expertise
            </h2>
            <p className="font-body text-body-lg text-muted-foreground max-w-4xl">
              {content.description}
            </p>
          </div>
        </section>
      )}

      {/* Latest Fund Updates Section */}
      <section className="py-section-sm md:py-section bg-foreground">
        <div className="container">
          <h2 className="font-serif text-heading mb-6 pb-3 border-b border-background/20 text-background">
            {content.sectionTitle}
          </h2>
          <FundArchiveCarousel fund={fundKey} />
        </div>
      </section>
    </>
  );
};

export default FundDetail;