import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Download, Loader2 } from 'lucide-react';
import { Seo } from '@/components/shared/Seo';
import { PageIntroduction, PageLoader } from '@/components/shared';
import { PdfThumbnail } from '@/components/shared/PdfThumbnail';
import { useImagePreload } from '@/hooks/useImagePreload';
import { useToast } from '@/hooks/use-toast';
import { HERO_OVERLAY_URL } from '@/lib/hero-overlay';
import { openReportInTab } from '@/lib/open-report';
import { downloadTitled } from '@/lib/file-download';
import { SITE_URL, absoluteUrl } from '@/lib/seo/site';
import { reportSchema } from '@/lib/seo/structured-data';
import { pageDataKey, readPageData } from '@/lib/page-data';
import { fetchReportPage, reportStillPublished } from '@/lib/reports-api';
import {
  reportCitation, reportDivisionLabel, reportFundLabel, reportTypeLabel,
} from '@/lib/report-meta';
import {
  reportDate, reportKicker, reportMetaDescription, reportPath, type ReportPageData,
} from '@/lib/reports-public';
import archiveBgAsset from '@/assets/mims-archive.webp.asset.json';
import NotFound from './NotFound';

// =====================================================================
// ONE REPORT, ONE PERMANENT ADDRESS (Step 93).
// ---------------------------------------------------------------------
// /archive/<address>: the address is made from the title and the year
// when the report is first saved, and never changes once it has been
// published (see archive_files_address_guard in the database). So a link
// in a CV, a citation or an answer from an assistant keeps working.
//
// The page states everything a reader citing the report needs: title,
// date, division and fund, the authors (linked to their Members or Alumni
// entry where the website lists them), the summary, the number of pages,
// the type and the tags, the PDF to open or download, the citation in
// full, and the related reports.
//
// A direct visit arrives with the build's static copy of this page and
// its data (lib/page-data.ts), so the first frame already shows the
// report; arriving from inside the site, the report is read live.
// =====================================================================

const ReportPage = () => {
  const { slug = '' } = useParams<{ slug: string }>();
  const embedded = readPageData<ReportPageData>(pageDataKey.report(slug));
  const [page, setPage] = useState<ReportPageData | null>(embedded);
  const [missing, setMissing] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [copied, setCopied] = useState(false);
  const { toast } = useToast();
  const imagesLoaded = useImagePreload([archiveBgAsset.url, HERO_OVERLAY_URL]);

  useEffect(() => {
    if (page?.report.slug === slug) return;
    let alive = true;
    setMissing(false);
    fetchReportPage(slug)
      .then((p) => {
        if (!alive) return;
        if (p) setPage(p);
        else setMissing(true);
      })
      .catch(() => { if (alive) setMissing(true); });
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug]);

  // The build's copy may be older than a withdrawal: a report blocked or
  // deleted since the last Publish must not stay on the website, so a
  // direct visit asks once whether it is still published. Only a clear
  // "no" removes it; a failed read keeps the page as it is.
  useEffect(() => {
    if (!embedded) return;
    let alive = true;
    reportStillPublished(slug).then((yes) => { if (alive && yes === false) setMissing(true); });
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug]);

  if (missing) return <NotFound />;
  if (!page || page.report.slug !== slug || !imagesLoaded) return <PageLoader />;

  const r = page.report;
  const url = absoluteUrl(reportPath(r.slug));
  const citation = reportCitation(r, SITE_URL);
  const division = reportDivisionLabel(r.division);
  const fund = reportFundLabel(r.fund);
  const paragraphs = String(r.description ?? '').split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean);

  const copyCitation = async () => {
    try {
      await navigator.clipboard.writeText(citation);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2500);
    } catch {
      toast({ title: 'Copy the citation by hand', description: 'Your browser did not allow copying.' });
    }
  };

  const download = async () => {
    if (downloading) return;
    setDownloading(true);
    try {
      await downloadTitled(r.file_url, r.title, 'pdf');
    } catch {
      toast({ title: 'Download failed', description: 'Please try again, or open the PDF and save it from there.', variant: 'destructive' });
    } finally {
      setDownloading(false);
    }
  };

  return (
    <>
      <Seo
        page={reportPath(r.slug)}
        title={r.title}
        description={reportMetaDescription(r)}
        breadcrumbs={[
          { name: 'Archive', path: '/archive' },
          { name: r.title, path: reportPath(r.slug) },
        ]}
        structuredData={[reportSchema(r, url)]}
      />

      <div data-page-hero className="relative">
        <div className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: `url(${archiveBgAsset.url})` }} />
        <div className="absolute inset-0 hero-overlay" />
        <div className="relative z-10">
          <PageIntroduction title={r.title} transparentBackground />
        </div>
      </div>

      <section className="py-section-sm md:py-section bg-background">
        <div className="container">
          <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_18rem] gap-10 lg:gap-16">
            <article className="min-w-0">
              <p className="font-body text-xs uppercase tracking-wider text-primary">{reportKicker(r)}</p>
              <p className="font-body text-small text-muted-foreground mt-2">
                <time dateTime={r.date}>{reportDate(r.date)}</time>
                {' · '}
                <Link to={`/divisions/${r.division}`} className="underline underline-offset-4 hover:text-accent">{division}</Link>
                {fund && r.fund && (
                  <>
                    {' · '}
                    <Link to={`/funds/${r.fund}`} className="underline underline-offset-4 hover:text-accent">{fund}</Link>
                  </>
                )}
              </p>

              {paragraphs.length > 0 && (
                <div className="mt-8">
                  <h2 className="font-serif text-heading mb-6 pb-3 border-b border-separator text-accent">Summary</h2>
                  {paragraphs.map((p, i) => (
                    <p key={i} className="font-body text-body-lg text-muted-foreground mb-4 max-w-3xl">{p}</p>
                  ))}
                </div>
              )}

              {r.authors.length > 0 && (
                <div className="mt-10">
                  <h2 className="font-serif text-heading mb-6 pb-3 border-b border-separator text-accent">Authors</h2>
                  <ul className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-3">
                    {r.authors.map((a) => (
                      <li key={`${a.name}-${a.role ?? ''}`} className="font-body">
                        {a.link ? (
                          <Link to={a.link} className="text-foreground underline underline-offset-4 hover:text-accent">{a.name}</Link>
                        ) : (
                          <span className="text-foreground">{a.name}</span>
                        )}
                        {a.role && <span className="block text-small text-muted-foreground">{a.role}</span>}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {r.tags.length > 0 && (
                <div className="mt-10">
                  <h2 className="font-serif text-heading mb-6 pb-3 border-b border-separator text-accent">Tags</h2>
                  <ul className="flex flex-wrap gap-2">
                    {r.tags.map((t) => (
                      <li key={t} className="font-body text-small border border-separator px-3 py-1 text-foreground">{t}</li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="mt-10">
                <h2 className="font-serif text-heading mb-6 pb-3 border-b border-separator text-accent">Cite this report</h2>
                <p className="font-body text-body bg-muted border-l-2 border-primary p-4 break-words" id="report-citation">{citation}</p>
                <button
                  type="button"
                  onClick={copyCitation}
                  className="mt-3 font-body text-small text-primary underline underline-offset-4 hover:text-accent"
                  aria-describedby="report-citation"
                >
                  {copied ? 'Citation copied' : 'Copy the citation'}
                </button>
              </div>
            </article>

            <aside className="lg:pt-1">
              <button
                type="button"
                className="block w-full cursor-pointer hover:opacity-90 transition-opacity"
                onClick={() => openReportInTab(r.title, r.file_url, r.id)}
                aria-label={`Open the PDF of ${r.title}`}
              >
                <PdfThumbnail url={r.file_url} className="w-full bg-background border border-separator" alt={`First page of ${r.title}`} renderWidth={400} />
              </button>
              <div className="mt-5 flex flex-col gap-3">
                <button type="button" className="cta-link-invert text-center" onClick={() => openReportInTab(r.title, r.file_url, r.id)}>
                  Open the PDF
                </button>
                <button
                  type="button"
                  className="cta-link text-center inline-flex items-center justify-center gap-2 disabled:opacity-60"
                  onClick={download}
                  disabled={downloading}
                >
                  {downloading ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <Download className="h-4 w-4" aria-hidden="true" />}
                  {downloading ? 'Downloading' : 'Download'}
                </button>
              </div>
              <dl className="mt-8 font-body text-small grid grid-cols-[auto_1fr] gap-x-4 gap-y-2">
                <dt className="text-muted-foreground">Published</dt><dd className="text-foreground">{reportDate(r.date)}</dd>
                <dt className="text-muted-foreground">Division</dt><dd className="text-foreground">{division}</dd>
                {fund && (<><dt className="text-muted-foreground">Fund</dt><dd className="text-foreground">{fund}</dd></>)}
                <dt className="text-muted-foreground">Type</dt><dd className="text-foreground">{reportTypeLabel(r.report_type)}</dd>
                {r.page_count != null && (<><dt className="text-muted-foreground">Pages</dt><dd className="text-foreground">{r.page_count}</dd></>)}
                {r.authors.length > 0 && (<><dt className="text-muted-foreground">Authors</dt><dd className="text-foreground">{r.authors.length}</dd></>)}
              </dl>
            </aside>
          </div>
        </div>
      </section>

      {page.related.length > 0 && (
        <section className="pb-section-sm md:pb-section bg-background">
          <div className="container">
            <h2 className="font-serif text-heading mb-6 pb-3 border-b border-separator text-accent">Related reports</h2>
            <ul className="divide-y divide-separator">
              {page.related.map((x) => (
                <li key={x.slug} className="py-4">
                  <p className="font-body text-xs uppercase tracking-wider text-muted-foreground">
                    {reportDate(x.date)} · {reportFundLabel(x.fund) || reportDivisionLabel(x.division)}
                  </p>
                  <Link to={reportPath(x.slug)} className="font-serif text-subheading text-foreground hover:text-accent">{x.title}</Link>
                </li>
              ))}
            </ul>
            <Link to="/archive" className="cta-link mt-8">Browse the full archive</Link>
          </div>
        </section>
      )}
    </>
  );
};

export default ReportPage;
