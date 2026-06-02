import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import logoMark from '@/assets/logo-color.svg';
import { PdfThumbnail } from '@/components/shared/PdfThumbnail';

// ---------- Public types ----------
export type ReportChart = 'line' | 'area' | 'bars' | 'scatter';

export interface ReportItem {
  div: string;
  title: string;
  desc: string;
  date: string;
  pdf: string;
  img?: string;
  chart?: ReportChart;
  /** Optional 2-letter abbreviation; auto-derived from `div` if absent. */
  abbr?: string;
}

export interface ReportsSectionProps {
  variant: 'cards' | 'navy';
  heading: string;
  eyebrow?: string;
  archiveHref: string;
  archiveLabel: string;
  reports: ReportItem[];
  /** Optional id for the section heading (a11y). */
  id?: string;
  /** Render the real first-page PDF preview as the cover (instead of generated motif). */
  useRealCover?: boolean;
}

// ---------- Tiny deterministic PRNG so covers are stable per report ----------
function seedOf(s: string) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}
function makeRng(seed: number) {
  let s = seed || 1;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

function pickChart(title: string): ReportChart {
  const types: ReportChart[] = ['line', 'area', 'bars', 'scatter'];
  return types[seedOf(title) % types.length];
}

// ---------- Icons ----------
const IconPlus = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" aria-hidden="true">
    <line x1="12" y1="5" x2="12" y2="19" />
    <line x1="5" y1="12" x2="19" y2="12" />
  </svg>
);
const IconArrowL = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <polyline points="15 18 9 12 15 6" />
  </svg>
);
const IconArrowR = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <polyline points="9 18 15 12 9 6" />
  </svg>
);
const IconArrowUR = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <line x1="7" y1="17" x2="17" y2="7" />
    <polyline points="7 7 17 7 17 17" />
  </svg>
);

// ---------- Chart motif (monochrome, on-brand) ----------
function ChartMotif({ report }: { report: ReportItem }) {
  const type = report.chart || pickChart(report.title);
  const rng = useMemo(() => makeRng(seedOf(report.title)), [report.title]);
  const W = 100,
    H = 58;
  const stroke = 'var(--mims-navy)';

  if (type === 'bars') {
    const n = 11;
    const bars = [];
    for (let i = 0; i < n; i++) {
      const bh = 10 + rng() * 44;
      const x = i * (W / n) + 2;
      bars.push(
        <rect
          key={i}
          x={x.toFixed(1)}
          y={(H - bh).toFixed(1)}
          width={(W / n - 3).toFixed(1)}
          height={bh.toFixed(1)}
          fill={i === n - 2 ? stroke : 'var(--mims-light-purple)'}
        />
      );
    }
    return (
      <svg viewBox="0 0 100 58" preserveAspectRatio="none" className="rc-chart" aria-hidden="true">
        {bars}
      </svg>
    );
  }

  if (type === 'scatter') {
    const n = 22;
    const dots = [];
    for (let j = 0; j < n; j++) {
      const cx = rng() * W;
      const cy = 8 + rng() * (H - 12);
      const r = 0.9 + rng() * 1.8;
      const op = (0.5 + rng() * 0.5).toFixed(2);
      const fill = rng() > 0.6 ? stroke : 'var(--mims-light-purple)';
      dots.push(<circle key={j} cx={cx.toFixed(1)} cy={cy.toFixed(1)} r={r.toFixed(1)} fill={fill} opacity={op} />);
    }
    return (
      <svg viewBox="0 0 100 58" preserveAspectRatio="none" className="rc-chart" aria-hidden="true">
        <line x1="0" y1={H / 2} x2="100" y2={H / 2} stroke="var(--mims-line)" strokeWidth=".5" strokeDasharray="2 2" />
        {dots}
      </svg>
    );
  }

  // line / area
  const n = 14;
  const pts: [string, string][] = [];
  let y = H * 0.55;
  for (let k = 0; k < n; k++) {
    y += (rng() - 0.5) * 16;
    y = Math.max(8, Math.min(H - 8, y));
    pts.push([(k * (W / (n - 1))).toFixed(1), y.toFixed(1)]);
  }
  const d = 'M' + pts.map((p) => p[0] + ',' + p[1]).join(' L');
  return (
    <svg viewBox="0 0 100 58" preserveAspectRatio="none" className="rc-chart" aria-hidden="true">
      {type === 'area' && <path d={`${d} L100,${H} L0,${H} Z`} fill="var(--mims-light-purple)" opacity=".22" />}
      <path d={d} fill="none" stroke={stroke} strokeWidth="1.4" strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  );
}

// ---------- Cover ----------
function trim(s: string, n: number) {
  if (!s) return '';
  return s.length > n ? s.slice(0, n - 1).replace(/\s+\S*$/, '') + '\u2026' : s;
}

interface CoverProps {
  report: ReportItem;
  className?: string;
  useRealCover?: boolean;
  renderWidth?: number;
}
function Cover({ report, className = '', useRealCover = false, renderWidth }: CoverProps) {
  const label = `${report.div} report: ${report.title}`;
  if (useRealCover && report.pdf) {
    return (
      <div className={`rcover rcover--pdf ${className}`.trim()} role="img" aria-label={label}>
        <PdfThumbnail url={report.pdf} alt={report.title} renderWidth={renderWidth} className="w-full h-full" />
      </div>
    );
  }
  if (report.img) {
    return (
      <div className={`rcover rcover--photo ${className}`.trim()} role="img" aria-label={label}>
        <img src={report.img} alt={report.title} className="rcover-img" loading="lazy" />
      </div>
    );
  }
  return (
    <div className={`rcover ${className}`.trim()} role="img" aria-label={label}>
      <div className="rc-page">
        <div className="rc-top">
          <img className="rc-mark" src={logoMark} alt="" aria-hidden="true" />
          <div className="rc-org">
            Minerva Investment
            <br />
            Management Society
          </div>
        </div>
        <div className="rc-eyebrow">{report.div}</div>
        <div className="rc-rule" />
        <h3 className="rc-title">{report.title}</h3>
        {report.desc ? <p className="rc-abstract">{trim(report.desc, 168)}</p> : null}
        <div className="rc-chartwrap">
          <ChartMotif report={report} />
        </div>
        <div className="rc-foot">
          <span>Research Report</span>
          <span>{report.date}</span>
        </div>
      </div>
    </div>
  );
}

// ---------- Open PDF in new tab with custom title ----------
function openReportInTab(title: string, url: string) {
  if (!url) return;
  const w = window.open('', '_blank', 'noopener,noreferrer');
  if (!w) {
    // popup blocked → fallback
    window.open(url, '_blank', 'noopener,noreferrer');
    return;
  }
  const safeTitle = String(title || 'Report').replace(/[<>&"']/g, (c) => ({
    '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;', "'": '&#39;'
  }[c]!));
  const safeUrl = String(url).replace(/"/g, '&quot;');
  w.document.open();
  w.document.write(
    `<!doctype html><html><head><meta charset="utf-8"><title>${safeTitle}</title>` +
    `<style>html,body{margin:0;height:100%;background:#1F0F4D;}iframe{border:0;width:100%;height:100%;display:block;}</style>` +
    `</head><body><iframe src="${safeUrl}" title="${safeTitle}" allow="fullscreen"></iframe>` +
    `<script>document.title=${JSON.stringify(title || 'Report')};</script>` +
    `</body></html>`
  );
  w.document.close();
}

// ---------- "Read More" featured info block (shared by featured + lightbox) ----------
function FeaturedInfo({
  report,
  archiveHref,
  archiveLabel,
  matchHeightTo,
}: {
  report: ReportItem;
  archiveHref?: string;
  archiveLabel?: string;
  /** Optional ref to an element whose height the info column should match (desktop only). */
  matchHeightTo?: React.RefObject<HTMLElement>;
}) {
  const [expanded, setExpanded] = useState(false);
  const [overflowing, setOverflowing] = useState(false);
  const descRef = useRef<HTMLParagraphElement>(null);
  const infoRef = useRef<HTMLDivElement>(null);

  // Sync info column max-height to the cover height (desktop only) so the
  // description area is bounded by the cover and can trigger "Read more".
  useLayoutEffect(() => {
    const info = infoRef.current;
    const target = matchHeightTo?.current;
    if (!info) return;

    const mq = window.matchMedia('(min-width: 761px)');
    const apply = () => {
      if (!target || !mq.matches || expanded) {
        info.style.maxHeight = '';
        info.style.minHeight = '';
        info.style.height = '';
        return;
      }
      const h = target.getBoundingClientRect().height;
      if (h > 0) {
        info.style.height = `${h}px`;
        info.style.maxHeight = `${h}px`;
        info.style.minHeight = `${h}px`;
      }
    };

    apply();
    const ro = target ? new ResizeObserver(apply) : null;
    if (target && ro) ro.observe(target);
    window.addEventListener('resize', apply);
    mq.addEventListener('change', apply);
    return () => {
      ro?.disconnect();
      window.removeEventListener('resize', apply);
      mq.removeEventListener('change', apply);
    };
  }, [matchHeightTo, expanded]);

  useLayoutEffect(() => {
    const el = descRef.current;
    if (!el) return;
    const check = () => {
      if (!expanded) setOverflowing(el.scrollHeight - el.clientHeight > 2);
    };
    check();
    const ro = new ResizeObserver(check);
    ro.observe(el);
    window.addEventListener('resize', check);
    return () => {
      ro.disconnect();
      window.removeEventListener('resize', check);
    };
  }, [expanded, report.desc]);

  return (
    <div className="v2-info" ref={infoRef}>
      <h3 className="v2-info-title">{report.title}</h3>
      <div className={`v2-desc-wrap${expanded ? ' is-expanded' : ''}`}>
        {report.desc ? (
          <p ref={descRef} className="v2-desc">
            {report.desc}
          </p>
        ) : null}
        {overflowing || expanded ? (
          <button
            type="button"
            className="v2-readmore"
            onClick={() => setExpanded((v) => !v)}
          >
            {expanded ? 'Read less' : 'Read more'}
          </button>
        ) : null}
      </div>
      <div className="v2-actions">
        <button
          type="button"
          className="rbtn rbtn--onnavy"
          onClick={() => openReportInTab(report.title, report.pdf)}
        >
          Open Report
        </button>
        {archiveHref ? (
          <a className="rbtn rbtn--onnavy-ghost" href={archiveHref}>
            {archiveLabel}
            <span className="rarw">
              <IconArrowUR />
            </span>
          </a>
        ) : null}
      </div>
    </div>
  );
}

// ---------- Preview lightbox ----------
function PreviewLightbox({ report, onClose, useRealCover = false }: { report: ReportItem; onClose: () => void; useRealCover?: boolean }) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const deckRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const prev = document.documentElement.style.overflow;
    document.documentElement.style.overflow = 'hidden';
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    const id = window.setTimeout(() => {
      dialogRef.current?.querySelector<HTMLButtonElement>('.rprev-x')?.focus();
    }, 0);
    return () => {
      document.documentElement.style.overflow = prev;
      document.removeEventListener('keydown', onKey);
      window.clearTimeout(id);
    };
  }, [onClose]);

  return createPortal(
    <div className="rprev is-open" onMouseDown={(e) => {
      if ((e.target as HTMLElement).hasAttribute('data-close')) onClose();
    }}>
      <div className="rprev-backdrop" data-close />
      <div className={`rprev-dialog rprev-dialog--navy${useRealCover ? ' rprev-dialog--lg' : ''}`} role="dialog" aria-modal="true" aria-label={report.title} ref={dialogRef}>
        <button className="rprev-x" aria-label="Close preview" onClick={onClose}>
          ×
        </button>
        <div className="rprev-stage">
          <div className="rprev-deck" ref={deckRef}>
            {!useRealCover && <div className="rprev-ghost rprev-ghost-2" />}
            {!useRealCover && <div className="rprev-ghost rprev-ghost-1" />}
            <button
              type="button"
              className="rcover-link"
              onClick={() => openReportInTab(report.title, report.pdf)}
              aria-label={`Open report: ${report.title}`}
            >
              <Cover report={report} className="rcover--lg" useRealCover={useRealCover} renderWidth={useRealCover ? 700 : undefined} />
            </button>
          </div>
        </div>
        <FeaturedInfo report={report} matchHeightTo={deckRef} />
      </div>
    </div>,
    document.body
  );
}


// ---------- V3 — cards carousel (light bg) ----------
function CardsVariant({
  heading,
  eyebrow,
  archiveHref,
  archiveLabel,
  reports,
  onPreview,
  id,
}: Omit<ReportsSectionProps, 'variant'> & { onPreview: (r: ReportItem) => void }) {
  const railRef = useRef<HTMLDivElement>(null);
  const fillRef = useRef<HTMLElement>(null);
  const prevRef = useRef<HTMLButtonElement>(null);
  const nextRef = useRef<HTMLButtonElement>(null);

  const update = useCallback(() => {
    const rail = railRef.current;
    const fill = fillRef.current;
    if (!rail || !fill) return;
    const max = rail.scrollWidth - rail.clientWidth;
    const vis = rail.clientWidth / Math.max(rail.scrollWidth, 1);
    const fillPct = Math.max(12, vis * 100);
    fill.style.width = fillPct + '%';
    fill.style.left = (max > 0 ? (rail.scrollLeft / max) * (100 - fillPct) : 0) + '%';
    if (prevRef.current) prevRef.current.disabled = rail.scrollLeft < 8;
    if (nextRef.current) nextRef.current.disabled = rail.scrollLeft >= max - 8;
  }, []);

  useLayoutEffect(() => {
    update();
    const onResize = () => update();
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, [update, reports.length]);

  const step = () => {
    const rail = railRef.current;
    if (!rail) return 0;
    const first = rail.querySelector<HTMLElement>('.v3-card');
    const gap = parseFloat(getComputedStyle(rail).columnGap || '16');
    return (first?.offsetWidth || 280) + (isNaN(gap) ? 16 : gap);
  };

  return (
    <section className="rsec rsec--light" aria-labelledby={id}>
      <div className="rwrap">
        <div className="rhead">
          <div>
            {eyebrow ? <div className="reyebrow">{eyebrow}</div> : null}
            <h2 className="rtitle" id={id}>
              {heading}
            </h2>
          </div>
          <a className="rbtn" href={archiveHref}>
            {archiveLabel}
            <span className="rarw">
              <IconArrowUR />
            </span>
          </a>
        </div>

        <div className="rrail-wrap">
          <div className="v3-rail" ref={railRef} onScroll={update}>
            {reports.map((rep, i) => (
              <div
                key={i}
                className="v3-card"
                role="button"
                tabIndex={0}
                onClick={() => onPreview(rep)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    onPreview(rep);
                  }
                }}
              >
                <div className="d">{rep.div}</div>
                <div className="t">{rep.title}</div>
                <div className="v3-coverhold">
                  <Cover report={rep} />
                </div>
                <button
                  className="rplus"
                  aria-label={`Preview report: ${rep.title}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    onPreview(rep);
                  }}
                >
                  <IconPlus />
                </button>
              </div>
            ))}
          </div>
        </div>

        <div className="v3-foot">
          <div className="v3-bar">
            <i ref={fillRef} />
          </div>
          <div className="rnav">
            <button
              ref={prevRef}
              className="rarrow"
              aria-label="Previous"
              onClick={() => railRef.current?.scrollBy({ left: -step(), behavior: 'smooth' })}
            >
              <IconArrowL />
            </button>
            <button
              ref={nextRef}
              className="rarrow"
              aria-label="Next"
              onClick={() => railRef.current?.scrollBy({ left: step(), behavior: 'smooth' })}
            >
              <IconArrowR />
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}

// ---------- V2 — navy stage (one featured + strip) ----------
function NavyVariant({
  heading,
  eyebrow,
  archiveHref,
  archiveLabel,
  reports,
  onPreview,
  id,
  useRealCover = false,
}: Omit<ReportsSectionProps, 'variant'> & { onPreview: (r: ReportItem) => void }) {
  const featured = reports[0];
  // Show up to 5 reports in the "Recently published" strip
  const rest = reports.slice(1, 6);
  const railRef = useRef<HTMLDivElement>(null);
  const coverRef = useRef<HTMLDivElement>(null);
  const [activeIdx, setActiveIdx] = useState(0);
  const [showDots, setShowDots] = useState(false);

  useLayoutEffect(() => {
    const rail = railRef.current;
    if (!rail) return;
    const update = () => {
      const overflowing = rail.scrollWidth - rail.clientWidth > 4;
      setShowDots(overflowing);
      const cardW = rail.scrollWidth / Math.max(rest.length, 1);
      setActiveIdx(Math.round(rail.scrollLeft / Math.max(cardW, 1)));
    };
    update();
    rail.addEventListener('scroll', update, { passive: true });
    window.addEventListener('resize', update);
    return () => {
      rail.removeEventListener('scroll', update);
      window.removeEventListener('resize', update);
    };
  }, [rest.length]);

  const scrollToIdx = (i: number) => {
    const rail = railRef.current;
    if (!rail) return;
    const cardW = rail.scrollWidth / Math.max(rest.length, 1);
    rail.scrollTo({ left: cardW * i, behavior: 'smooth' });
  };

  if (!featured) {
    return (
      <section className="rsec rsec--navy" aria-labelledby={id}>
        <div className="rwrap">
          <div className="rhead">
            <div>
              {eyebrow ? <div className="reyebrow">{eyebrow}</div> : null}
              <h2 className="rtitle" id={id}>
                {heading}
              </h2>
            </div>
          </div>
          <p className="v2-desc">No reports available yet.</p>
        </div>
      </section>
    );
  }

  return (
    <section className={`rsec rsec--navy${useRealCover ? ' rsec--navy-lg' : ''}`} aria-labelledby={id}>
      <div className="rwrap">
        <div className="rhead rhead--noarchive">
          <div>
            {eyebrow ? <div className="reyebrow">{eyebrow}</div> : null}
            <h2 className="rtitle" id={id}>
              {heading}
            </h2>
          </div>
        </div>

        <div className="v2-feature">
          <div className="v2-cover" ref={coverRef}>
            <button
              type="button"
              className="rcover-link"
              onClick={() => openReportInTab(featured.title, featured.pdf)}
              aria-label={`Open report: ${featured.title}`}
            >
              <Cover report={featured} useRealCover={useRealCover} renderWidth={useRealCover ? 900 : undefined} />
            </button>
          </div>
          <FeaturedInfo report={featured} archiveHref={archiveHref} archiveLabel={archiveLabel} matchHeightTo={coverRef} />
        </div>

        {rest.length > 0 && (
          <div className="v2-strip">
            <div className="v2-striphead">
              <span className="lbl">Recently published</span>
            </div>
            <div className="rrail-wrap">
              <div className="v2-strip-rail" ref={railRef}>
                {rest.map((rep, i) => (
                  <button
                    key={i}
                    className="v2-card"
                    onClick={() => onPreview(rep)}
                    aria-label={`Preview report: ${rep.title}`}
                  >
                    <Cover report={rep} useRealCover={useRealCover} renderWidth={useRealCover ? 420 : undefined} />
                    <div className="t">{rep.title}</div>
                  </button>
                ))}
              </div>
              {showDots && (
                <div className="v2-strip-dots" role="tablist" aria-label="Reports pagination">
                  {rest.map((_, i) => (
                    <button
                      key={i}
                      type="button"
                      role="tab"
                      aria-selected={i === activeIdx}
                      aria-label={`Go to report ${i + 1}`}
                      className={`rdot${i === activeIdx ? ' is-active' : ''}`}
                      onClick={() => scrollToIdx(i)}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}


// ---------- Public component ----------
export function ReportsSection(props: ReportsSectionProps) {
  const [preview, setPreview] = useState<ReportItem | null>(null);
  const onPreview = useCallback((r: ReportItem) => setPreview(r), []);
  const onClose = useCallback(() => setPreview(null), []);

  const id = props.id || 'reports-section-heading';

  return (
    <>
      {props.variant === 'navy' ? (
        <NavyVariant {...props} id={id} onPreview={onPreview} />
      ) : (
        <CardsVariant {...props} id={id} onPreview={onPreview} />
      )}
      {preview && <PreviewLightbox report={preview} onClose={onClose} useRealCover={props.useRealCover} />}
    </>
  );
}

// ---------- Helper: adapt archive_files row -> ReportItem ----------
export interface ArchiveFileRow {
  title: string;
  description?: string | null;
  date: string; // ISO date
  division?: string | null;
  fund?: string | null;
  file_url: string;
}

const DIVISION_LABELS: Record<string, string> = {
  equity: 'Equity Research',
  investment: 'Investment Research',
  macro: 'Macro Research',
  portfolio: 'Portfolio Management',
  quant: 'Quantitative Research',
};

const FUND_LABELS: Record<string, string> = {
  'multi-asset': 'Multi Asset Global Opportunities Fund',
  'long-short': 'Long Short Equity Fund',
  dps: 'Diversified Passive Selection Fund',
  pir: 'Italian Equity PIR Fund',
};

function formatMonthYear(iso: string) {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  return d.toLocaleString('en-US', { month: 'short', year: 'numeric' });
}

export function archiveFilesToReports(rows: ArchiveFileRow[]): ReportItem[] {
  return rows.map((r) => {
    const divLabel =
      (r.fund && FUND_LABELS[r.fund]) ||
      (r.division && (DIVISION_LABELS[r.division] || r.division)) ||
      'Research';
    return {
      div: divLabel,
      title: r.title,
      desc: r.description || '',
      date: formatMonthYear(r.date),
      pdf: r.file_url,
      chart: pickChart(r.title),
    };
  });
}
