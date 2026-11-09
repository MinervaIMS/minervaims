import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { Seo } from '@/components/shared/Seo';
import { PageLoader } from '@/components/shared';
import { ApplyBackground } from '@/components/shared/ApplyBackground';
import { PageIndex } from '@/components/shared/PageIndex';
import { KeyFigureValue } from '@/components/numbers/KeyFigureValue';
import '@/components/numbers/numbers.css';
import { supabase } from '@/integrations/supabase/client';
import { ResearchByYearChart } from '@/components/track/ResearchByYearChart';
import { useKeyNumbers } from '@/hooks/useKeyNumbers';
import { formatAsOf } from '@/lib/key-numbers';
import { pageDataKey, readPageData } from '@/lib/page-data';
import { fmtMonth, fmtPct, fmtRatio } from '@/lib/fund-record';
import { reportFundLabel } from '@/lib/report-meta';
import {
  TRACK_DIVISIONS, isTrackRecordData, researchByYear, researchTotals, trackDivisionLabel, trackFunds,
  type TrackRecordData,
} from '@/lib/track-record';
import {
  TRACK_DATA_FILES, TRACK_INDEX, TRACK_INTRO_HEADING, TRACK_PAGE_TITLE, TRACK_TABLE_NOTES, TRACK_TOPICS,
  allTrackFigures, trackAsOf, trackDatasetJsonLd, trackFigures, trackIndexNumber, trackIntroText, trackNoteText, type TrackFigure,
  type TrackTopicId,
} from '@/lib/track-record-page';
import heroLogo from '@/assets/footer-logo.svg';

// =====================================================================
// /track-record: MINERVA'S TRACK RECORD (Steps 93 and 105).
// ---------------------------------------------------------------------
// One page for what were two: "Minerva in Numbers" (/numbers, which now
// sends here) and "Track Record". Organised by topic (People, Research,
// Funds, Events), each with its key figures and then its tables, under the
// dark dot field of /numbers and with the legal pages' index. Every
// figure is the registry's (the number rule: its final text from the first
// frame) and carries a superscript number; the notes at the foot give the
// definitions, so the introduction says only once when the figures are
// true. The structure is src/lib/track-record-page.ts, which the static
// copy for machines (src/lib/static/render.ts) builds from as well.
// =====================================================================

const TABLE = 'w-full border-collapse font-body text-sm';
const HEAD = 'bg-muted/40 text-muted-foreground';
const TH = 'px-3 py-2 text-left font-normal';
const THN = 'px-3 py-2 text-right font-normal';
const TD = 'px-3 py-2 text-right tabular-nums';
const ROW = 'border-t border-separator';

function Figures({ figures }: { figures: TrackFigure[] }) {
  if (!figures.length) return null;
  return (
    <div className="kn-rules kn-rules-rows mt-8" style={{ ['--kn-rule' as string]: 'hsl(var(--separator))' }}>
      <dl className="grid grid-cols-2 lg:grid-cols-3">
        {figures.map((f) => (
          <div key={f.slug} className="flex min-w-0 flex-col py-6 pr-3 sm:px-6 md:py-8">
            <dt className="order-2 mt-3 font-body text-xs uppercase tracking-wider text-muted-foreground md:text-sm">
              {f.label}
              <sup className="ml-0.5 normal-case tracking-normal">
                <a href={`#note-${f.note}`} id={`ref-${f.note}`} className="!text-accent no-underline hover:underline" aria-label={`Note ${f.note}`}>{f.note}</a>
              </sup>
            </dt>
            <dd className="order-1 whitespace-nowrap font-serif text-[2.5rem] leading-none text-primary sm:text-5xl md:text-[3.5rem]">
              <KeyFigureValue figure={f} />
            </dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

function Topic({ id, title, intro, children }: { id: string; title: string; intro?: string; children: ReactNode }) {
  return (
    <section id={id} aria-labelledby={`${id}-heading`} className={`scroll-mt-[120px] py-10 md:py-14 ${id === TRACK_INDEX[0].id ? 'pt-0 md:pt-0' : 'border-t border-separator'}`}>
      <p className="font-serif text-2xl leading-none" style={{ color: 'var(--mims-light-purple)' }} aria-hidden="true">{trackIndexNumber(id)}</p>
      <h2 id={`${id}-heading`} className="mt-3 mb-4 font-serif text-heading text-accent">{title}</h2>
      {intro && <p className="max-w-3xl font-body text-body text-muted-foreground">{intro}</p>}
      {children}
    </section>
  );
}

/**
 * The topic's one button, to the page of the site it leads on to. The
 * colours are marked important because the legal pages' scope, which the
 * index needs, sets every link to its parent's colour.
 */
function TopicLink({ id }: { id: TrackTopicId }) {
  const t = TRACK_TOPICS.find((x) => x.id === id);
  if (!t) return null;
  return <div className="mt-8"><Link to={t.link.href} className="cta-link !text-accent hover:!text-background">{t.link.label}</Link></div>;
}

const TrackRecord = () => {
  const embedded = readPageData<TrackRecordData>(pageDataKey.trackRecord());
  const [data, setData] = useState<TrackRecordData | null>(embedded);
  const [failed, setFailed] = useState(false);
  const snap = useKeyNumbers();

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

  const figures = useMemo(() => trackFigures(snap), [snap]);
  const all = allTrackFigures(figures);
  const asOfIso = trackAsOf(figures);
  const asOf = formatAsOf(asOfIso);

  if (!data && !failed) return <PageLoader />;

  const years = data ? researchByYear(data.research) : [];
  const totals = researchTotals(years);
  const funds = data ? trackFunds(data) : [];
  const events = data?.events ?? [];
  const semesters = data?.semesters ?? [];
  const topic = (id: TrackTopicId) => TRACK_TOPICS.find((t) => t.id === id)!;

  return (
    <>
      <Seo
        page="/track-record"
        structuredData={[trackDatasetJsonLd(all, asOfIso)]}
        breadcrumbs={[{ name: 'About', path: '/about' }, { name: TRACK_PAGE_TITLE, path: '/track-record' }]}
      />

      {/* The dark dot field of /numbers, under a clear header (Header's
          hero routes), with the full logo on the right of the title as on
          the legal pages: the white one, as in the footer, on the dark. */}
      <div data-page-hero className="relative overflow-hidden" style={{ backgroundColor: '#05030F' }}>
        <ApplyBackground />
        <div className="relative z-10 mx-auto flex min-h-[320px] max-w-[1280px] items-center justify-between gap-10 px-6 pb-12 pt-[calc(84px+2.5rem+env(safe-area-inset-top))] md:min-h-[420px] md:px-10 md:pb-16">
          <h1 className="min-w-0 font-serif text-[2.5rem] leading-[1.05] text-background text-balance sm:text-hero md:text-[4.5rem]">
            {TRACK_PAGE_TITLE}
          </h1>
          <img src={heroLogo} alt="" aria-hidden="true" className="hidden w-[152px] shrink-0 select-none sm:block lg:w-[208px]" />
        </div>
      </div>

      <div className="legal-doc">
        <PageIndex sections={TRACK_INDEX}>
          <Topic id="overview" title={TRACK_INTRO_HEADING}>
            <p className="max-w-3xl font-body text-body-lg text-muted-foreground">{trackIntroText(asOf)}</p>
            {failed && (
              <p className="mt-6 border-l-2 border-primary bg-muted p-4 font-body text-body text-muted-foreground">
                The tables could not be loaded just now. Please try again later, or browse the <Link to="/archive" className="underline">archive</Link>.
              </p>
            )}
          </Topic>

          <Topic id="people" title={topic('people').title} intro={topic('people').intro}>
            <Figures figures={figures.people} />
            {semesters.length > 0 && (
              <>
                <h3 className="mt-10 mb-4 font-serif text-subheading text-foreground">Members and alumni by semester</h3>
                <div className="max-w-xl overflow-x-auto border border-separator">
                  <table className={TABLE}>
                    <caption className="sr-only">Members and alumni in every past semester</caption>
                    <thead className={HEAD}><tr><th scope="col" className={TH}>Semester</th><th scope="col" className={THN}>Members</th><th scope="col" className={THN}>Alumni</th></tr></thead>
                    <tbody>
                      {semesters.map((s) => (
                        <tr key={s.key} className={ROW}>
                          <th scope="row" className={`${TH} text-foreground`}>{s.label}</th>
                          <td className={TD}>{s.members}</td>
                          <td className={TD}>{s.alumni}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}
            {(data?.alumni_areas.length ?? 0) > 0 && (
              <>
                <h3 className="mt-10 mb-4 font-serif text-subheading text-foreground">Where alumni work</h3>
                <ul className="grid max-w-5xl grid-cols-1 gap-x-8 font-body text-body sm:grid-cols-2 lg:grid-cols-3">
                  {data!.alumni_areas.map((a) => (
                    <li key={a.area} className="flex justify-between gap-4 border-b border-separator py-2">
                      <span className="text-foreground">{a.area}</span>
                      <span className="tabular-nums text-muted-foreground">{a.alumni}</span>
                    </li>
                  ))}
                </ul>
                {data!.alumni_without_area > 0 && (
                  <p className="mt-3 font-body text-xs text-muted-foreground">{data!.alumni_without_area} alumni in the directory have not recorded a job area.</p>
                )}
              </>
            )}
            <TopicLink id="people" />
          </Topic>

          <Topic id="research" title={topic('research').title} intro={topic('research').intro}>
            <Figures figures={figures.research} />
            {years.length > 0 && (
              <>
                <div className="mt-10"><ResearchByYearChart years={years} /></div>
                <div className="mt-8 overflow-x-auto border border-separator">
                  <table className={`${TABLE} min-w-[720px]`}>
                    <caption className="sr-only">Reports published per year and division, with their pages</caption>
                    <thead className={HEAD}>
                      <tr>
                        <th scope="col" className={TH}>Year</th>
                        {TRACK_DIVISIONS.map((d) => <th key={d} scope="col" className={THN}>{trackDivisionLabel(d)}</th>)}
                        <th scope="col" className={THN}>Reports</th>
                        <th scope="col" className={THN}>Pages</th>
                      </tr>
                    </thead>
                    <tbody>
                      {years.map((y) => (
                        <tr key={y.year} className={ROW}>
                          <th scope="row" className={`${TH} text-foreground`}>{y.year}</th>
                          {TRACK_DIVISIONS.map((d) => <td key={d} className={TD}>{y.byDivision[d]}</td>)}
                          <td className={`${TD} text-foreground`}>{y.total}</td>
                          <td className={TD}>{y.pagesKnown ? y.pages : ''}</td>
                        </tr>
                      ))}
                      <tr className={`${ROW} bg-muted/40`}>
                        <th scope="row" className={`${TH} font-medium text-foreground`}>Total</th>
                        {TRACK_DIVISIONS.map((d) => <td key={d} className={`${TD} font-medium`}>{totals.byDivision[d]}</td>)}
                        <td className={`${TD} font-medium text-foreground`}>{totals.total}</td>
                        <td className={`${TD} font-medium`}>{totals.pagesKnown ? totals.pages : ''}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
                {totals.pagesKnown < totals.total && (
                  <p className="mt-3 font-body text-xs text-muted-foreground">Pages are counted for the {totals.pagesKnown} of {totals.total} reports whose PDF has been counted so far.</p>
                )}
              </>
            )}
            <TopicLink id="research" />
          </Topic>

          <Topic id="funds" title={topic('funds').title} intro={topic('funds').intro}>
            <Figures figures={figures.funds} />
            {funds.length > 0 && (
              <div className="mt-10 overflow-x-auto border border-separator">
                <table className={`${TABLE} min-w-[860px]`}>
                  <caption className="sr-only">The funds' records</caption>
                  <thead className={HEAD}>
                    <tr>
                      <th scope="col" className={TH}>Fund</th>
                      <th scope="col" className={TH}>Record</th>
                      <th scope="col" className={THN}>Since inception</th>
                      <th scope="col" className={THN}>Annualised return</th>
                      <th scope="col" className={THN}>Annualised volatility</th>
                      <th scope="col" className={THN}>Sharpe (&euro;STR)</th>
                      <th scope="col" className={THN}>Maximum drawdown</th>
                    </tr>
                  </thead>
                  <tbody>
                    {funds.map(([key, f]) => (
                      <tr key={key} className={ROW}>
                        <th scope="row" className={TH}>
                          <Link to={`/funds/${key}`} className="text-foreground underline underline-offset-4 hover:text-accent">{reportFundLabel(key)}</Link>
                          {f.status === 'closed' && <span className="block text-xs text-muted-foreground">Closed</span>}
                        </th>
                        <td className="px-3 py-2 text-muted-foreground">{f.record.months_count} months, {fmtMonth(f.record.first_month)} to {fmtMonth(f.record.last_month)}</td>
                        <td className={TD}>{fmtPct(f.record.itd)}</td>
                        <td className={TD}>{fmtPct(f.record.ann_return)}</td>
                        <td className={TD}>{fmtPct(f.record.ann_vol)}</td>
                        <td className={TD}>{fmtRatio(f.record.sharpe)}</td>
                        <td className={TD}>{fmtPct(f.record.max_drawdown)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            <TopicLink id="funds" />
          </Topic>

          <Topic id="events" title={topic('events').title} intro={topic('events').intro}>
            <Figures figures={figures.events} />
            {events.length > 0 && (
              <div className="mt-10 overflow-x-auto border border-separator">
                <table className={`${TABLE} min-w-[640px]`}>
                  <caption className="sr-only">Events and speakers per year</caption>
                  <thead className={HEAD}>
                    <tr>
                      <th scope="col" className={TH}>Year</th>
                      <th scope="col" className={THN}>Events held</th>
                      <th scope="col" className={THN}>With guest speakers</th>
                      <th scope="col" className={THN}>Speakers</th>
                      <th scope="col" className={THN}>Alumni calls</th>
                      <th scope="col" className={THN}>Company visits</th>
                    </tr>
                  </thead>
                  <tbody>
                    {events.map((e) => (
                      <tr key={e.year} className={ROW}>
                        <th scope="row" className={`${TH} text-foreground`}>{e.year}</th>
                        <td className={TD}>{e.events}</td>
                        <td className={TD}>{e.with_guests}</td>
                        <td className={TD}>{e.speakers}</td>
                        <td className={TD}>{e.alumni_calls}</td>
                        <td className={TD}>{e.company_visits}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            {(data?.company_visits_before_archive ?? 0) > 0 && (
              <p className="mt-3 font-body text-xs text-muted-foreground">{data!.company_visits_before_archive} company visits took place before the events archive begins; they are not shown by year.</p>
            )}
            <TopicLink id="events" />
          </Topic>

          <Topic id="notes" title="Notes and method">
            {all.length > 0 && (
              <ol className="mt-2 max-w-3xl space-y-3 font-body text-sm text-muted-foreground" aria-label="Notes on the figures">
                {all.map((f) => (
                  <li key={f.slug} id={`note-${f.note}`} className="grid scroll-mt-[120px] grid-cols-[2rem_1fr] gap-2">
                    <a href={`#ref-${f.note}`} className="tabular-nums !text-accent no-underline hover:underline" aria-label={`Back to ${f.label}`}>{f.note}</a>
                    <span><span className="text-foreground">{f.label}.</span> {trackNoteText(f, asOfIso)}</span>
                  </li>
                ))}
              </ol>
            )}
            <h3 className="mt-10 mb-4 font-serif text-subheading text-foreground">The tables</h3>
            <dl className="grid max-w-5xl grid-cols-1 gap-x-10 gap-y-5 md:grid-cols-2">
              {TRACK_TABLE_NOTES.map((m) => (
                <div key={m.term}>
                  <dt className="font-body text-sm text-foreground">{m.term}</dt>
                  <dd className="mt-1 font-body text-sm text-muted-foreground">{m.text}</dd>
                </div>
              ))}
            </dl>
            <p className="mt-8 font-body text-sm text-muted-foreground">
              The same figures as data:{' '}
              {TRACK_DATA_FILES.map((f, i) => (
                <span key={f.href}>
                  {i > 0 && (i === TRACK_DATA_FILES.length - 1 ? ' and ' : ', ')}
                  <a href={f.href} className="!text-accent underline underline-offset-4">{f.label}</a>
                </span>
              ))}.
            </p>
          </Topic>
        </PageIndex>
      </div>
    </>
  );
};

export default TrackRecord;
