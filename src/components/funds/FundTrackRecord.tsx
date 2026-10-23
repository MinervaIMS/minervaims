import {
  MONTH_SHORT, VIRTUAL_PORTFOLIO_STATEMENT, fmtMonth, fmtPct, fmtRatio, fmtSignedPct, fundNotes, fundStats,
  shownReferences, type FundEntry, type RecordFund,
} from '@/lib/fund-record';

// =====================================================================
// A fund's track record on its page (Step 93): the statement that it is a
// virtual portfolio, the monthly table, the statistics, the market
// references, the method and the downloads. Every figure arrives computed
// by the database (public.fund_track_record); this only lays it out, with
// the formatting the static copy of the page uses too.
// =====================================================================

interface Props {
  fund: RecordFund;
  entry: FundEntry;
  benchmarkNote?: string;
}

export function FundTrackRecord({ fund, entry, benchmarkNote }: Props) {
  const r = entry.record;
  const stats = fundStats(entry);
  const refs = shownReferences(r);
  const methodology = entry.profile?.methodology;
  const rebalancing = entry.profile?.rebalancing_policy;

  return (
    <>
      <section className="pt-0 pb-section-sm md:pb-section bg-background">
        <div className="container">
          <p className="mb-6 p-4 bg-muted border-l-2 border-primary font-body text-body text-muted-foreground" data-fund-statement>
            {VIRTUAL_PORTFOLIO_STATEMENT}
          </p>
          <h2 className="font-serif text-heading mb-6 pb-3 border-b border-separator text-accent">Monthly returns</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm font-body border-collapse min-w-[900px]">
              <caption className="sr-only">Monthly returns in %, with the year-to-date, inception-to-date, volatility and Sharpe ratio of each year</caption>
              <thead>
                <tr className="border-b border-separator bg-accent text-background font-body">
                  <th scope="col" className="text-center py-3 pr-4">Year</th>
                  <th scope="col" className="text-center py-3 px-3 font-semibold">ITD</th>
                  {MONTH_SHORT.map((m) => (
                    <th scope="col" key={m} className="text-center py-3 px-2 font-normal">{m}</th>
                  ))}
                  <th scope="col" className="text-center py-3 px-3 font-semibold">YTD</th>
                  <th scope="col" className="text-center py-3 px-2">Vol</th>
                  <th scope="col" className="text-center py-3 px-2">Sharpe</th>
                </tr>
              </thead>
              <tbody className="text-foreground">
                {r.years.map((y) => (
                  <tr key={y.year} className="border-b border-separator/60">
                    <th scope="row" className="py-3 pr-4 font-body font-normal text-accent text-center">{y.year}</th>
                    <td className="py-3 px-3 font-semibold text-accent bg-muted text-center">{fmtPct(y.itd)}</td>
                    {y.months.map((v, i) => (
                      <td key={i} className="py-3 px-2 whitespace-nowrap text-center">{fmtSignedPct(v)}</td>
                    ))}
                    <td className="py-3 px-3 font-semibold text-accent bg-muted text-center">{fmtSignedPct(y.ytd)}</td>
                    <td className="py-3 px-2 text-center">{fmtPct(y.vol)}</td>
                    <td className="py-3 px-2 text-center">{fmtRatio(y.sharpe)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {benchmarkNote && (
            <p className="mt-6 font-body text-sm text-muted-foreground italic">{benchmarkNote}</p>
          )}
          <ul className="mt-4 font-body text-xs text-muted-foreground space-y-1">
            {fundNotes(entry).map((n) => <li key={n}>{n}</li>)}
          </ul>
        </div>
      </section>

      <section className="pt-0 pb-section-sm md:pb-section bg-background">
        <div className="container">
          <h2 className="font-serif text-heading mb-6 pb-3 border-b border-separator text-accent">Statistics</h2>
          <dl className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-x-8 gap-y-6">
            {stats.map((s) => (
              <div key={s.key} data-fund-stat={s.key}>
                <dt className="font-body text-small text-muted-foreground">{s.label}</dt>
                <dd className="font-serif text-subheading text-accent mt-1">{s.value}</dd>
                {s.note && <dd className="font-body text-xs text-muted-foreground mt-1">{s.note}</dd>}
              </div>
            ))}
          </dl>
        </div>
      </section>

      {refs.length > 0 && (
        <section className="pt-0 pb-section-sm md:pb-section bg-background">
          <div className="container">
            <h2 className="font-serif text-heading mb-6 pb-3 border-b border-separator text-accent">Market references</h2>
            <p className="font-body text-body text-muted-foreground max-w-3xl mb-6">
              How the fund&apos;s monthly returns moved with market indices, over the months both have. These describe co-movement only: none of the indices is the fund&apos;s benchmark.
            </p>
            <div className="overflow-x-auto">
              <table className="w-full text-sm font-body border-collapse min-w-[640px]">
                <thead>
                  <tr className="border-b border-separator bg-accent text-background">
                    <th scope="col" className="text-left py-3 px-3">Index</th>
                    <th scope="col" className="text-left py-3 px-3 font-normal">Series</th>
                    <th scope="col" className="text-center py-3 px-3 font-normal">Months</th>
                    <th scope="col" className="text-center py-3 px-3">Beta</th>
                    <th scope="col" className="text-center py-3 px-3">Correlation</th>
                  </tr>
                </thead>
                <tbody>
                  {refs.map((x) => (
                    <tr key={x.series} className="border-b border-separator/60">
                      <th scope="row" className="text-left py-3 px-3 font-normal text-foreground">{x.label}</th>
                      <td className="py-3 px-3 text-muted-foreground">{x.variant}, {x.currency}</td>
                      <td className="py-3 px-3 text-center">{x.months} ({fmtMonth(x.from)} to {fmtMonth(x.to)})</td>
                      <td className="py-3 px-3 text-center">{fmtRatio(x.beta)}</td>
                      <td className="py-3 px-3 text-center">{fmtRatio(x.correlation)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="mt-4 font-body text-xs text-muted-foreground">
              Beta: the slope of the fund&apos;s monthly returns on the index&apos;s. Correlation: of the same monthly returns. Shown from twelve shared months.
            </p>
          </div>
        </section>
      )}

      {(methodology || rebalancing) && (
        <section className="pt-0 pb-section-sm md:pb-section bg-background">
          <div className="container">
            <h2 className="font-serif text-heading mb-6 pb-3 border-b border-separator text-accent">Method</h2>
            {methodology && <p className="font-body text-body-lg text-muted-foreground max-w-4xl">{methodology}</p>}
            {rebalancing && (
              <p className="font-body text-body-lg text-muted-foreground max-w-4xl mt-4">
                <span className="text-foreground">Rebalancing. </span>{rebalancing}
              </p>
            )}
          </div>
        </section>
      )}

      <section className="pt-0 pb-section-sm md:pb-section bg-background">
        <div className="container">
          <h2 className="font-serif text-heading mb-6 pb-3 border-b border-separator text-accent">Data</h2>
          <ul className="font-body text-body space-y-2">
            <li><a href={`/data/funds-${fund}.csv`} className="text-primary underline underline-offset-4 hover:text-accent" download>Monthly returns (CSV)</a></li>
            <li><a href="/data/funds.json" className="text-primary underline underline-offset-4 hover:text-accent">Every fund&apos;s figures, with their definitions (JSON)</a></li>
            <li><a href="/track-record" className="text-primary underline underline-offset-4 hover:text-accent">Minerva&apos;s track record</a></li>
          </ul>
        </div>
      </section>
    </>
  );
}

export default FundTrackRecord;
