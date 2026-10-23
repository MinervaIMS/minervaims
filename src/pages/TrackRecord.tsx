import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Seo } from '@/components/shared/Seo';
import { PageIntroduction, PageLoader } from '@/components/shared';
import { useImagePreload } from '@/hooks/useImagePreload';
import { HERO_OVERLAY_URL } from '@/lib/hero-overlay';
import { supabase } from '@/integrations/supabase/client';
import { NumbersSection } from '@/components/numbers/NumbersSection';
import { ResearchByYearChart } from '@/components/track/ResearchByYearChart';
import { pageDataKey, readPageData } from '@/lib/page-data';
import { fmtMonth, fmtPct, fmtRatio } from '@/lib/fund-record';
import { reportFundLabel } from '@/lib/report-meta';
import {
  TRACK_DIVISIONS, TRACK_METHOD, isTrackRecordData, researchByYear, researchTotals, trackDate,
  trackDivisionLabel, trackFunds, type TrackRecordData,
} from '@/lib/track-record';
import archiveBgAsset from '@/assets/mims-archive.webp.asset.json';

// =====================================================================
// /track-record (Step 93): what Minerva has published, run and held,
// year by year, counted from its own records. Every count comes from one
// database read (public_track_record), the same totals the key numbers
// registry publishes, so this page and the figures section at its foot
// cannot disagree. Plain statements and tables; no superlatives.
// =====================================================================

const th = 'text-left py-3 px-3 font-normal';
const td = 'py-3 px-3';

const TrackRecord = () => {
  const embedded = readPageData<TrackRecordData>(pageDataKey.trackRecord());
  const [data, setData] = useState<TrackRecordData | null>(embedded);
  const [failed, setFailed] = useState(false);
  const imagesLoaded = useImagePreload([archiveBgAsset.url, HERO_OVERLAY_URL]);

  useEffect(() => {
    if (data) return;
    let alive = true;
    (supabase.rpc as unknown as (fn: string) => Promise<{ data: unknown; error: unknown }>)('public_track_record')
      .then(({ data: d, error }) => {
        if (!alive) return;
        if (error || !isTrackRecordData(d)) setFailed(true);
        else setData(d);
      }, () => { if (alive) setFailed(true); });
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if ((!data && !failed) || !imagesLoaded) return <PageLoader />;

  const years = data ? researchByYear(data.research) : [];
  const totals = researchTotals(years);
  const funds = data ? trackFunds(data) : [];
  const events = data?.events ?? [];

  return (
    <>
      <Seo page="/track-record" breadcrumbs={[{ name: 'About', path: '/about' }, { name: 'Track Record', path: '/track-record' }]} />

      <div data-page-hero className="relative">
        <div className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: `url(${archiveBgAsset.url})` }} />
        <div className="absolute inset-0 hero-overlay" />
        <div className="relative z-10">
          <PageIntroduction title="Track Record" transparentBackground />
        </div>
      </div>

      <section className="py-section-sm md:py-section bg-background">
        <div className="container">
          <h2 className="font-serif text-heading mb-6 pb-3 border-b border-separator text-accent">
            What Minerva has published, run and held
          </h2>
          <p className="font-body text-body-lg text-muted-foreground max-w-4xl">
            The research, the funds, the events and the people of the Minerva Investment Management Society, year by year,
            counted automatically from the association&apos;s own records. The definitions are at the foot of the page.
          </p>
          {data?.last_updated && (
            <p className="mt-4 font-body text-small text-muted-foreground">Last updated {trackDate(data.last_updated)}.</p>
          )}
          {failed && (
            <p className="mt-6 p-4 bg-muted border-l-2 border-primary font-body text-body text-muted-foreground">
              The track record could not be loaded just now. Please try again later, or browse the <Link to="/archive" className="underline">archive</Link> and the <Link to="/numbers" className="underline">key numbers</Link>.
            </p>
          )}
        </div>
      </section>

      {years.length > 0 && (
        <section className="pt-0 pb-section-sm md:pb-section bg-background" id="research">
          <div className="container">
            <h2 className="font-serif text-heading mb-6 pb-3 border-b border-separator text-accent">Research</h2>
            <ResearchByYearChart years={years} />
            <div className="overflow-x-auto mt-8">
              <table className="w-full text-sm font-body border-collapse min-w-[720px]">
                <caption className="sr-only">Reports published per year and division, with their pages</caption>
                <thead>
                  <tr className="border-b border-separator bg-accent text-background">
                    <th scope="col" className={th}>Year</th>
                    {TRACK_DIVISIONS.map((d) => <th key={d} scope="col" className={`${th} text-center`}>{trackDivisionLabel(d)}</th>)}
                    <th scope="col" className={`${th} text-center font-semibold`}>Reports</th>
                    <th scope="col" className={`${th} text-center`}>Pages</th>
                  </tr>
                </thead>
                <tbody>
                  {years.map((y) => (
                    <tr key={y.year} className="border-b border-separator/60">
                      <th scope="row" className={`${td} text-left font-normal text-accent`}>{y.year}</th>
                      {TRACK_DIVISIONS.map((d) => <td key={d} className={`${td} text-center`}>{y.byDivision[d]}</td>)}
                      <td className={`${td} text-center font-semibold`}>{y.total}</td>
                      <td className={`${td} text-center`}>{y.pagesKnown ? y.pages : ''}</td>
                    </tr>
                  ))}
                  <tr className="border-b border-separator bg-muted">
                    <th scope="row" className={`${td} text-left font-semibold text-accent`}>Total</th>
                    {TRACK_DIVISIONS.map((d) => <td key={d} className={`${td} text-center font-semibold`}>{totals.byDivision[d]}</td>)}
                    <td className={`${td} text-center font-semibold`}>{totals.total}</td>
                    <td className={`${td} text-center font-semibold`}>{totals.pagesKnown ? totals.pages : ''}</td>
                  </tr>
                </tbody>
              </table>
            </div>
            {totals.pagesKnown < totals.total && (
              <p className="mt-3 font-body text-xs text-muted-foreground">
                Pages are counted for the {totals.pagesKnown} of {totals.total} reports whose PDF has been counted so far.
              </p>
            )}
            <Link to="/archive" className="cta-link mt-8">Browse the archive</Link>
          </div>
        </section>
      )}

      {funds.length > 0 && (
        <section className="pt-0 pb-section-sm md:pb-section bg-background" id="funds">
          <div className="container">
            <h2 className="font-serif text-heading mb-6 pb-3 border-b border-separator text-accent">Funds</h2>
            <p className="font-body text-body text-muted-foreground max-w-4xl mb-6">
              Virtual (paper) portfolios managed by students for educational purposes. No real capital is invested. Returns are simulated, net and in EUR.
            </p>
            <div className="overflow-x-auto">
              <table className="w-full text-sm font-body border-collapse min-w-[860px]">
                <thead>
                  <tr className="border-b border-separator bg-accent text-background">
                    <th scope="col" className={th}>Fund</th>
                    <th scope="col" className={th}>Record</th>
                    <th scope="col" className={`${th} text-center`}>Since inception</th>
                    <th scope="col" className={`${th} text-center`}>Annualised return</th>
                    <th scope="col" className={`${th} text-center`}>Annualised volatility</th>
                    <th scope="col" className={`${th} text-center`}>Sharpe (€STR)</th>
                    <th scope="col" className={`${th} text-center`}>Maximum drawdown</th>
                  </tr>
                </thead>
                <tbody>
                  {funds.map(([key, f]) => (
                    <tr key={key} className="border-b border-separator/60">
                      <th scope="row" className={`${td} text-left font-normal`}>
                        <Link to={`/funds/${key}`} className="text-foreground underline underline-offset-4 hover:text-accent">{reportFundLabel(key)}</Link>
                        {f.status === 'closed' && <span className="block text-xs text-muted-foreground">Closed</span>}
                      </th>
                      <td className={`${td} text-muted-foreground`}>{f.record.months_count} months, {fmtMonth(f.record.first_month)} to {fmtMonth(f.record.last_month)}</td>
                      <td className={`${td} text-center`}>{fmtPct(f.record.itd)}</td>
                      <td className={`${td} text-center`}>{fmtPct(f.record.ann_return)}</td>
                      <td className={`${td} text-center`}>{fmtPct(f.record.ann_vol)}</td>
                      <td className={`${td} text-center`}>{fmtRatio(f.record.sharpe)}</td>
                      <td className={`${td} text-center`}>{fmtPct(f.record.max_drawdown)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="mt-3 font-body text-xs text-muted-foreground">
              An empty cell is a figure that cannot be computed yet: annualised figures need twelve months, the Sharpe ratio the €STR for every month. Each fund&apos;s page has its monthly table and its method.
            </p>
          </div>
        </section>
      )}

      {events.length > 0 && (
        <section className="pt-0 pb-section-sm md:pb-section bg-background" id="events">
          <div className="container">
            <h2 className="font-serif text-heading mb-6 pb-3 border-b border-separator text-accent">Events and speakers</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-sm font-body border-collapse min-w-[640px]">
                <thead>
                  <tr className="border-b border-separator bg-accent text-background">
                    <th scope="col" className={th}>Year</th>
                    <th scope="col" className={`${th} text-center`}>Events held</th>
                    <th scope="col" className={`${th} text-center`}>With guest speakers</th>
                    <th scope="col" className={`${th} text-center`}>Speakers</th>
                    <th scope="col" className={`${th} text-center`}>Alumni calls</th>
                    <th scope="col" className={`${th} text-center`}>Company visits</th>
                  </tr>
                </thead>
                <tbody>
                  {events.map((e) => (
                    <tr key={e.year} className="border-b border-separator/60">
                      <th scope="row" className={`${td} text-left font-normal text-accent`}>{e.year}</th>
                      <td className={`${td} text-center`}>{e.events}</td>
                      <td className={`${td} text-center`}>{e.with_guests}</td>
                      <td className={`${td} text-center`}>{e.speakers}</td>
                      <td className={`${td} text-center`}>{e.alumni_calls}</td>
                      <td className={`${td} text-center`}>{e.company_visits}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {(data?.company_visits_before_archive ?? 0) > 0 && (
              <p className="mt-3 font-body text-xs text-muted-foreground">
                {data!.company_visits_before_archive} company visits took place before the events archive begins; they are not shown by year.
              </p>
            )}
            <Link to="/events" className="cta-link mt-8">See the events</Link>
          </div>
        </section>
      )}

      {(data?.semesters.length ?? 0) > 0 && (
        <section className="pt-0 pb-section-sm md:pb-section bg-background" id="people">
          <div className="container">
            <h2 className="font-serif text-heading mb-6 pb-3 border-b border-separator text-accent">Members and alumni</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-sm font-body border-collapse min-w-[420px] max-w-2xl">
                <thead>
                  <tr className="border-b border-separator bg-accent text-background">
                    <th scope="col" className={th}>Semester</th>
                    <th scope="col" className={`${th} text-center`}>Members</th>
                    <th scope="col" className={`${th} text-center`}>Alumni</th>
                  </tr>
                </thead>
                <tbody>
                  {data!.semesters.map((s) => (
                    <tr key={s.key} className="border-b border-separator/60">
                      <th scope="row" className={`${td} text-left font-normal text-accent`}>{s.label}</th>
                      <td className={`${td} text-center`}>{s.members}</td>
                      <td className={`${td} text-center`}>{s.alumni}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      )}

      {(data?.alumni_areas.length ?? 0) > 0 && (
        <section className="pt-0 pb-section-sm md:pb-section bg-background" id="alumni">
          <div className="container">
            <h2 className="font-serif text-heading mb-6 pb-3 border-b border-separator text-accent">Where alumni work</h2>
            <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-2 font-body text-body max-w-5xl">
              {data!.alumni_areas.map((a) => (
                <li key={a.area} className="flex justify-between gap-4 border-b border-separator/60 py-2">
                  <span className="text-foreground">{a.area}</span>
                  <span className="text-muted-foreground">{a.alumni}</span>
                </li>
              ))}
            </ul>
            {data!.alumni_without_area > 0 && (
              <p className="mt-3 font-body text-xs text-muted-foreground">
                {data!.alumni_without_area} alumni in the directory have not recorded a job area.
              </p>
            )}
            <Link to="/people/alumni" className="cta-link mt-8">Meet the alumni</Link>
          </div>
        </section>
      )}

      <section className="pt-0 pb-section-sm md:pb-section bg-background" id="method">
        <div className="container">
          <h2 className="font-serif text-heading mb-6 pb-3 border-b border-separator text-accent">Method</h2>
          <dl className="grid grid-cols-1 md:grid-cols-2 gap-x-10 gap-y-5 max-w-5xl">
            {TRACK_METHOD.map((m) => (
              <div key={m.term}>
                <dt className="font-serif text-subheading text-foreground">{m.term}</dt>
                <dd className="font-body text-body text-muted-foreground mt-1">{m.text}</dd>
              </div>
            ))}
          </dl>
          <p className="mt-6 font-body text-small text-muted-foreground">
            The same figures as data: <a href="/data/funds.json" className="underline underline-offset-4">funds.json</a>,{' '}
            <a href="/data/key-numbers.json" className="underline underline-offset-4">key-numbers.json</a> and{' '}
            <a href="/llms-full.txt" className="underline underline-offset-4">llms-full.txt</a>.
          </p>
        </div>
      </section>

      <NumbersSection pageKey="track-record" />
    </>
  );
};

export default TrackRecord;
