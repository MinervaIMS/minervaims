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
}
function Cover({ report, className = '' }: CoverProps) {
  const label = `${report.div} report: ${report.title}`;
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

// ---------- Preview lightbox ----------
function PreviewLightbox({ report, onClose }: { report: ReportItem; onClose: () => void }) {
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const prev = document.documentElement.style.overflow;
    document.documentElement.style.overflow = 'hidden';
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    // Focus the close button so Esc/tabbing works naturally
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
      <div className="rprev-dialog" role="dialog" aria-modal="true" aria-label={report.title} ref={dialogRef}>
        <button className="rprev-x" aria-label="Close preview" onClick={onClose}>
          ×
        </button>
        <div className="rprev-stage">
          <div className="rprev-deck">
            <div className="rprev-ghost rprev-ghost-2" />
            <div className="rprev-ghost rprev-ghost-1" />
            <Cover report={report} className="rcover--lg" />
          </div>
        </div>
        <div className="rprev-info">
          <div className="rprev-eyebrow">{report.div}</div>
          <h3 className="rprev-title">{report.title}</h3>
          {report.desc ? <p className="rprev-desc">{report.desc}</p> : null}
          <div className="rprev-meta">
            <span>{report.date}</span>
            <span className="dot">·</span>
            <span>PDF · Research Report</span>
          </div>
          <div className="rprev-actions">
            <a className="rbtn rbtn--primary" href={report.pdf || '#'} target="_blank" rel="noopener noreferrer">
              Open full report (PDF)
            </a>
          </div>
        </div>
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
}: Omit<ReportsSectionProps, 'variant'> & { onPreview: (r: ReportItem) => void }) {
  const featured = reports[0];
  const rest = reports.slice(1);
  const railRef = useRef<HTMLDivElement>(null);
  const [activeDot, setActiveDot] = useState(0);

  const step = () => {
    const rail = railRef.current;
    if (!rail) return 0;
    const first = rail.querySelector<HTMLElement>('.v2-card');
    const gap = parseFloat(getComputedStyle(rail).columnGap || '18');
    return (first?.offsetWidth || 120) + (isNaN(gap) ? 18 : gap);
  };

  const onScroll = () => {
    const rail = railRef.current;
    if (!rail) return;
    const s = step() || 1;
    const idx = Math.min(rest.length - 1, Math.max(0, Math.round(rail.scrollLeft / s)));
    setActiveDot(idx);
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
            <a className="rbtn" href={archiveHref}>
              {archiveLabel}
              <span className="rarw">
                <IconArrowUR />
              </span>
            </a>
          </div>
          <p className="v2-desc">No reports available yet.</p>
        </div>
      </section>
    );
  }

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
          <a className="rbtn" href={archiveHref}>
            {archiveLabel}
            <span className="rarw">
              <IconArrowUR />
            </span>
          </a>
        </div>

        <div className="v2-feature">
          <div className="v2-cover">
            <Cover report={featured} />
            <button className="rplus" aria-label={`Preview report: ${featured.title}`} onClick={() => onPreview(featured)}>
              <IconPlus />
            </button>
          </div>
          <div className="v2-info">
            <div className="reyebrow">{featured.div}</div>
            <h3>{featured.title}</h3>
            {featured.desc ? <p className="v2-desc">{featured.desc}</p> : null}
            <div className="v2-meta">
              <span>{featured.date}</span>
              <span className="dot">·</span>
              <span>Research Report · PDF</span>
            </div>
            <div className="v2-actions">
              <a
                className="rbtn rbtn--primary"
                style={{ background: '#fff', color: 'hsl(var(--accent))', borderColor: '#fff' }}
                href={featured.pdf || '#'}
                target="_blank"
                rel="noopener noreferrer"
              >
                Open report
              </a>
              <button className="rbtn" onClick={() => onPreview(featured)}>
                Quick preview
              </button>
            </div>
          </div>
        </div>

        {rest.length > 0 && (
          <div className="v2-strip">
            <div className="v2-striphead">
              <span className="lbl">Recently published</span>
              <div className="rnav">
                <button
                  className="rarrow"
                  aria-label="Previous"
                  onClick={() => railRef.current?.scrollBy({ left: -step() * 2, behavior: 'smooth' })}
                >
                  <IconArrowL />
                </button>
                <button
                  className="rarrow"
                  aria-label="Next"
                  onClick={() => railRef.current?.scrollBy({ left: step() * 2, behavior: 'smooth' })}
                >
                  <IconArrowR />
                </button>
              </div>
            </div>
            <div className="rrail-wrap">
              <div className="rrail" ref={railRef} onScroll={onScroll}>
                {rest.map((rep, i) => (
                  <button
                    key={i}
                    className="v2-card"
                    onClick={() => onPreview(rep)}
                    aria-label={`Preview report: ${rep.title}`}
                  >
                    <Cover report={rep} />
                    <div className="t">{rep.title}</div>
                    <div className="dt">
                      {rep.div} · {rep.date}
                    </div>
                  </button>
                ))}
              </div>
            </div>
            <div className="v2-foot">
              <div className="rdots" aria-hidden="true">
                {rest.map((_, i) => (
                  <span key={i} className={`rdot${i === activeDot ? ' is-active' : ''}`} />
                ))}
              </div>
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
      {preview && <PreviewLightbox report={preview} onClose={onClose} />}
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
