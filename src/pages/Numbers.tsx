import { Link } from 'react-router-dom';
import { Seo } from '@/components/shared/Seo';
import { PageIntroduction } from '@/components/shared';
import { AmbientGround } from '@/components/shared/AmbientGround';
import { KeyFigureValue } from '@/components/numbers/KeyFigureValue';
import '@/components/numbers/numbers.css';
import { useKeyNumbers } from '@/hooks/useKeyNumbers';
import { describeKeyNumber, formatAsOf, formatKeyNumber, latestAsOf, type KeyNumber, type KeyNumbersSnapshot } from '@/lib/key-numbers';
import { SITE_URL } from '@/lib/seo/site';
import { ORGANIZATION_ID, type JsonLd } from '@/lib/seo/structured-data';

// =====================================================================
// /numbers: Minerva in Numbers (Step 92).
// ---------------------------------------------------------------------
// The society summarised in figures, under three headings: People,
// Events, Reports. Every figure is computed automatically from the
// association's own records (the key numbers registry), nothing on this
// page is typed by a person, and the same figures, with the same text,
// appear across the site and in /data/key-numbers.json.
//
// This is the reference page, so each figure carries its definition and
// the date it is true at in plain view, not behind a click. The figures
// are a <dl> (label, value, definition) and the page states them again as
// a schema.org Dataset, generated from the same values (the parity rule).
// =====================================================================

const GROUPS: { key: string; title: string; intro: string }[] = [
  {
    key: 'numbers-people',
    title: 'People',
    intro: 'The students who run Minerva today, and the alumni network they join when they graduate.',
  },
  {
    key: 'numbers-events',
    title: 'Events',
    intro: 'Talks with professionals, alumni calls, company visits and the events of the association and its divisions.',
  },
  {
    key: 'numbers-reports',
    title: 'Reports',
    intro: 'The research the divisions publish in the public archive, and the student-managed virtual portfolios.',
  },
];

function figuresOf(snap: KeyNumbersSnapshot | null, pageKey: string): (KeyNumber & { slug: string })[] {
  if (!snap) return [];
  return (snap.pages[pageKey] ?? [])
    .map((slug) => (snap.numbers[slug] ? { ...snap.numbers[slug], slug } : null))
    .filter((n): n is KeyNumber & { slug: string } => n !== null);
}

function datasetJsonLd(snap: KeyNumbersSnapshot | null): JsonLd | null {
  if (!snap) return null;
  const all = GROUPS.flatMap((g) => figuresOf(snap, g.key));
  if (all.length === 0) return null;
  const seen = new Set<string>();
  return {
    '@context': 'https://schema.org',
    '@type': 'Dataset',
    '@id': `${SITE_URL}/numbers#dataset`,
    name: 'Minerva Investment Management Society in numbers',
    description: 'Figures about Minerva Investment Management Society, the Bocconi student association founded in 2017: people, events and research reports, computed automatically from the association\'s records.',
    url: `${SITE_URL}/numbers`,
    creator: { '@id': ORGANIZATION_ID },
    publisher: { '@id': ORGANIZATION_ID },
    inLanguage: 'en-GB',
    isAccessibleForFree: true,
    ...(latestAsOf(all) ? { dateModified: latestAsOf(all) } : {}),
    distribution: {
      '@type': 'DataDownload',
      encodingFormat: 'application/json',
      contentUrl: `${SITE_URL}/data/key-numbers.json`,
    },
    variableMeasured: all
      .filter((n) => (seen.has(n.slug) ? false : (seen.add(n.slug), true)))
      .map((n) => ({
        '@type': 'PropertyValue',
        name: n.label,
        value: n.value,
        valueReference: formatKeyNumber(n),
        description: describeKeyNumber(n),
      })),
  };
}

const Numbers = () => {
  const snap = useKeyNumbers();
  const all = GROUPS.flatMap((g) => figuresOf(snap, g.key));
  const asOf = formatAsOf(latestAsOf(all));

  return (
    <>
      <Seo page="/numbers" structuredData={[datasetJsonLd(snap)]} />

      {/* The black band of the stats sections, with the same lattice. */}
      <div data-page-hero className="relative overflow-hidden" style={{ backgroundColor: '#000' }}>
        <div className="absolute inset-0" aria-hidden="true">
          <AmbientGround kind="dots" lattice />
        </div>
        <div className="relative z-10">
          <PageIntroduction title="Minerva in Numbers" transparentBackground />
        </div>
      </div>

      <section className="bg-background pt-section-sm md:pt-section">
        <div className="container">
          <h2 className="mb-4 border-b border-separator pb-3 font-serif text-heading text-accent sm:mb-6">
            The society, counted
          </h2>
          <p className="max-w-3xl font-body text-sm leading-relaxed text-muted-foreground sm:text-body-lg">
            Every figure on this page is computed automatically, every night, from Minerva&apos;s own records: the
            research archive, the roster, the alumni directory, the events archive and the recruiting rounds. Each one
            has a definition and the date it is true at, and the same figure reads the same everywhere on this
            website.{asOf ? ` Figures as of ${asOf}.` : ''}
          </p>
        </div>
      </section>

      {GROUPS.map((g) => {
        const figures = figuresOf(snap, g.key);
        return (
          <section key={g.key} aria-labelledby={`${g.key}-heading`} className="bg-background pt-section-sm md:pt-section">
            <div className="container">
              <h2 id={`${g.key}-heading`} className="mb-4 border-b border-separator pb-3 font-serif text-heading text-accent sm:mb-6">
                {g.title}
              </h2>
              <p className="max-w-3xl font-body text-sm leading-relaxed text-muted-foreground sm:text-body">{g.intro}</p>
              {figures.length > 0 ? (
                <div className="kn-rules mt-8" style={{ ['--kn-rule' as string]: 'hsl(var(--separator))' }}>
                <dl className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
                  {figures.map((f) => (
                    <div key={f.slug} className="flex flex-col p-6 md:p-8">
                      <dt className="order-2 mt-3 font-body text-xs uppercase tracking-wider text-muted-foreground md:text-sm">
                        {f.label}
                      </dt>
                      <dd className="order-1 whitespace-nowrap font-serif text-5xl leading-none text-primary md:text-hero">
                        <KeyFigureValue figure={f} />
                      </dd>
                      <dd className="order-3 mt-3 font-body text-sm leading-relaxed text-muted-foreground">
                        {describeKeyNumber(f)}
                      </dd>
                    </div>
                  ))}
                </dl>
                </div>
              ) : (
                <p className="mt-8 font-body text-sm text-muted-foreground">The figures are being prepared.</p>
              )}
            </div>
          </section>
        );
      })}

      <section className="bg-background py-section-sm md:py-section">
        <div className="container">
          <p className="max-w-3xl font-body text-sm leading-relaxed text-muted-foreground">
            The performance of each fund (track record, returns, volatility, Sharpe ratio and drawdown) is on its own
            page: <Link to="/funds/long-short" className="text-accent underline underline-offset-4">Long Short Equity</Link>,{' '}
            <Link to="/funds/multi-asset" className="text-accent underline underline-offset-4">Multi Asset Global Opportunities</Link>,{' '}
            <Link to="/funds/dps" className="text-accent underline underline-offset-4">Diversified Passive Selection</Link> and{' '}
            <Link to="/funds/pir" className="text-accent underline underline-offset-4">Italian Equity PIR</Link>. They are
            virtual (paper) portfolios managed by students for education, not investment products. The same figures are
            available as data in <a href="/data/key-numbers.json" className="text-accent underline underline-offset-4">key-numbers.json</a>.
          </p>
        </div>
      </section>
    </>
  );
};

export default Numbers;
