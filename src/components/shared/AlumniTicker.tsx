import { useEffect, useRef, useState } from 'react';
import { useIsMobile } from '@/hooks/use-mobile';

// ─────────────────────────────────────────────────────────────────────────────
// SVG files are served from /public/logos/{file}.svg
// All files are normalised to a 250×250 viewBox with transparent backgrounds.
// Missing files are handled gracefully — see LogoItem below.
// Do not apply any CSS filter to the images; use brand colours as-is.
// ─────────────────────────────────────────────────────────────────────────────

// Uniform perceived speed across all rows: duration is derived from the
// MEASURED track width, not the logo count. Pixels per second is constant.
const PIXELS_PER_SECOND_DESKTOP = 55;
const PIXELS_PER_SECOND_MOBILE  = 28;

interface Logo { name: string; file: string; }
interface Row  { id: string; logos: Logo[]; direction: 'left' | 'right'; }

// ─────────────────────────────────────────────────────────────────────────────
// DATA — file names taken directly from manifest files
// ─────────────────────────────────────────────────────────────────────────────
const ROWS: Row[] = [
  {
    id: 'banking',
    direction: 'left',
    logos: [
      { name: 'Goldman Sachs',    file: 'goldman-sachs'    },
      { name: 'Citi',             file: 'citi'             },
      { name: 'J.P. Morgan',      file: 'j-p-morgan'       },
      { name: 'Morgan Stanley',   file: 'morgan-stanley'   },
      { name: 'UBS',              file: 'ubs'              },
      { name: 'Barclays',         file: 'barclays'         },
      { name: 'Bank of America',  file: 'bank-of-america'  },
      { name: 'Deutsche Bank',    file: 'deutsche-bank'    },
      { name: 'BNP Paribas',     file: 'bnp-paribas'     },
      { name: 'HSBC',             file: 'hsbc'             },
      { name: 'Macquarie',        file: 'macquarie'        },
    ],
  },
  {
    id: 'buyside',
    direction: 'right',
    logos: [
      { name: 'BlackRock',          file: 'blackrock'           },
      { name: 'PIMCO',              file: 'pimco'               },
      { name: 'Vanguard',           file: 'vanguard'            },
      { name: 'Citadel',            file: 'citadel'             },
      { name: 'D.E. Shaw & Co.',    file: 'd-e-shaw'            },
      { name: 'Squarepoint Capital', file: 'squarepoint-capital' },
      { name: 'IMC Trading',        file: 'imc'                 },
      { name: 'Ares Management',    file: 'ares-management'     },
      { name: 'Lazard',             file: 'lazard'              },
      { name: 'Rothschild & Co',    file: 'rothschild-and-co'   },
    ],
  },
  {
    id: 'advisory',
    direction: 'left',
    logos: [
      { name: 'McKinsey & Company',       file: 'mckinsey-and-company'       },
      { name: 'BCG',                      file: 'boston-consulting-group'    },
      { name: 'Bain & Company',           file: 'bain-and-company'           },
      { name: 'Oliver Wyman',             file: 'oliver-wyman'               },
      { name: 'KPMG',                     file: 'kpmg'                       },
      { name: 'European Central Bank',    file: 'european-central-bank'      },
      { name: 'International Monetary Fund', file: 'international-monetary-fund' },
      { name: 'European Investment Bank', file: 'european-investment-bank'   },
      { name: "Banca d'Italia",           file: 'banca-d-italia'             },
      { name: 'UniCredit',                file: 'unicredit'                  },
      { name: 'Mediobanca',               file: 'mediobanca'                 },
      { name: 'Equita',                   file: 'equita'                     },
      { name: 'Intesa Sanpaolo',          file: 'intesa-sanpaolo'            },
      { name: 'Generali',                 file: 'generali'                   },
    ],
  },
  {
    id: 'academic',
    direction: 'right',
    logos: [
      { name: 'University of Oxford',         file: 'university-of-oxford'         },
      { name: 'University of Chicago',        file: 'university-of-chicago'        },
      { name: 'Columbia University',          file: 'columbia-university'          },
      { name: 'MIT',                          file: 'mit'                          },
      { name: 'Princeton University',         file: 'princeton-university'         },
      { name: 'London Business School',       file: 'london-business-school'       },
      { name: 'London School of Economics',   file: 'london-school-of-economics'   },
      { name: 'HEC Paris',                    file: 'hec-paris'                    },
      { name: 'Cornell University',           file: 'cornell-university'           },
      { name: 'Bocconi University',           file: 'bocconi-university'           },
      { name: 'Duke University',              file: 'duke-university'              },
      { name: 'ETH Zurich',                   file: 'eth-zurich'                   },
      { name: 'Toulouse School of Economics', file: 'toulouse-school-of-economics' },
    ],
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// ANIMATION
// Injected as a <style> tag — @keyframes cannot be set via Tailwind without
// config changes. Class name is namespaced (mims-) to avoid collisions.
// ─────────────────────────────────────────────────────────────────────────────
const CSS = `
  /* Hide native scrollbar on ticker band — interaction stays available */
  .mims-band {
    scrollbar-width: none;
    -ms-overflow-style: none;
    overflow-anchor: none;
    contain: layout paint;
  }
  .mims-band::-webkit-scrollbar { display: none; width: 0; height: 0; }
`;

// ─────────────────────────────────────────────────────────────────────────────
// LOGO ITEM
//
// Graceful degradation for logos not yet uploaded:
//   onError  → visibility: 'hidden'  keeps the reserved gap so the track
//              width stays stable as files are added incrementally.
//              Do NOT use display:'none' — that collapses the slot and
//              the row appears to jump shorter between uploads.
//   onLoad   → opacity transitions 0 → 1 to avoid a raster flash.
//
// All SVGs share a 250×250 viewBox (from manifests). Some logos have a
// near-1:1 aspect ratio (LSE, LBS, ETH Zurich, ECB). maxHeight controls
// how tall they render; width is always auto to preserve aspect ratio.
// maxWidth prevents very wide wordmarks from dominating.
// ─────────────────────────────────────────────────────────────────────────────
function LogoItem({ logo, isMobile }: { logo: Logo; isMobile: boolean }) {
  const [visible, setVisible] = useState(true);
  const [opacity, setOpacity] = useState(0);

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
        // visibility:hidden preserves the layout slot; the gap stays consistent
        visibility: visible ? 'visible' : 'hidden',
      }}
    >
      <img
        src={`/logos/${logo.file}.svg`}
        alt={logo.name}
        draggable={false}
        loading="eager"           // load immediately — do not lazy-load ticker logos
        decoding="async"
        onLoad={() => setOpacity(1)}
        onError={() => setVisible(false)}
        style={{
          maxHeight: isMobile ? '20px' : '40px',
          maxWidth: isMobile ? '325px' : '650px',
          width: 'auto',
          height: 'auto',
          objectFit: 'contain',
          opacity,
          transition: 'opacity 0.35s ease',
          userSelect: 'none',
          pointerEvents: 'none',
          display: 'block',
        }}
      />
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// TICKER BAND — dual-mode (AUTO via GPU transform, MANUAL via native scroll)
//
// AUTO MODE (default):
//   • The track translates via a Web-Animation `translateX(0) → -period`,
//     iterations Infinity, easing linear. GPU-composited, sub-pixel smooth.
//   • The scroll container's scrollLeft is pinned at 0.
//
// MANUAL MODE (during user interaction):
//   • Animation paused. Current transform offset is folded into scrollLeft,
//     transform is cleared, and the container takes over.
//   • A scroll listener wraps scrollLeft inside [period, 2*period) so the
//     loop is seamless in both directions.
//
// Hand-offs are single-frame and visually invisible because the three logo
// copies are pixel-identical.
// ─────────────────────────────────────────────────────────────────────────────
function TickerBand({
  row,
  isMobile,
}: {
  row: Row;
  isMobile: boolean;
}) {
  const tripled = [...row.logos, ...row.logos, ...row.logos];
  const perSet  = row.logos.length;

  const bandRef          = useRef<HTMLDivElement | null>(null);
  const trackRef         = useRef<HTMLDivElement | null>(null);
  const animationRef     = useRef<Animation | null>(null);
  const periodRef        = useRef<number>(0);
  const modeRef          = useRef<'auto' | 'manual'>('auto');
  const suppressScrollRef = useRef<boolean>(false);
  const wheelIdleTimerRef = useRef<number | null>(null);

  const [period, setPeriod] = useState(0);

  // ── Measure exact period via offsetLeft(child[N]) − offsetLeft(child[0]) ──
  useEffect(() => {
    const track = trackRef.current;
    if (!track) return;

    let frozen = false;
    let ro: ResizeObserver | null = null;
    const offs: Array<() => void> = [];

    const measure = () => {
      if (frozen) return;
      const a = track.children[0] as HTMLElement | undefined;
      const b = track.children[perSet] as HTMLElement | undefined;
      if (!a || !b) return;
      const p = b.offsetLeft - a.offsetLeft;
      if (p <= 0) return;
      periodRef.current = p;
      setPeriod((prev) => (Math.abs(prev - p) > 0.5 ? p : prev));

      const imgs = Array.from(track.querySelectorAll('img'));
      const allReady = imgs.length > 0 && imgs.every((img) => img.complete);
      if (allReady) {
        frozen = true;
        ro?.disconnect();
        offs.forEach((off) => off());
        offs.length = 0;
      }
    };

    measure();

    const imgs = Array.from(track.querySelectorAll('img'));
    imgs.forEach((img) => {
      if (!img.complete) {
        const h = () => measure();
        img.addEventListener('load', h);
        img.addEventListener('error', h);
        offs.push(() => {
          img.removeEventListener('load', h);
          img.removeEventListener('error', h);
        });
      }
    });

    ro = new ResizeObserver(measure);
    ro.observe(track);

    return () => {
      ro?.disconnect();
      offs.forEach((off) => off());
    };
  }, [isMobile, perSet]);

  // ── Build / rebuild the WAAPI translate animation when period changes ────
  useEffect(() => {
    const track = trackRef.current;
    if (!track || period <= 0) return;

    const reduced =
      typeof window !== 'undefined' &&
      window.matchMedia &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduced) return;

    const pps = isMobile ? PIXELS_PER_SECOND_MOBILE : PIXELS_PER_SECOND_DESKTOP;
    const duration = (period / pps) * 1000; // ms
    // direction 'left'  → content moves left  → translateX 0 → -period
    // direction 'right' → content moves right → translateX -period → 0
    const from = row.direction === 'left' ? 0 : -period;
    const to   = row.direction === 'left' ? -period : 0;

    // Cancel previous (if any) and create fresh.
    try { animationRef.current?.cancel(); } catch { /* noop */ }

    const anim = track.animate(
      [
        { transform: `translate3d(${from}px, 0, 0)` },
        { transform: `translate3d(${to}px, 0, 0)` },
      ],
      { duration, iterations: Infinity, easing: 'linear' },
    );
    animationRef.current = anim;

    // If we were already in manual mode, keep the animation paused; the
    // hand-off back to auto will start it.
    if (modeRef.current === 'manual') {
      try { anim.pause(); } catch { /* noop */ }
    }

    return () => {
      try { anim.cancel(); } catch { /* noop */ }
      if (animationRef.current === anim) animationRef.current = null;
    };
  }, [period, isMobile, row.direction]);

  // ── Read the current visible translateX (in px) from the WAAPI animation
  const readTranslateX = (): number => {
    const anim = animationRef.current;
    const p = periodRef.current;
    if (!anim || p <= 0) return 0;
    const dur = typeof anim.effect?.getComputedTiming === 'function'
      ? Number(anim.effect.getComputedTiming().duration) || 1
      : 1;
    const ct = Number(anim.currentTime ?? 0);
    const t = ((ct % dur) + dur) % dur / dur; // progress 0..1
    if (row.direction === 'left') return -p * t;          // 0 → -p
    return -p + p * t;                                     // -p → 0
  };

  // ── Hand-off: AUTO → MANUAL ──────────────────────────────────────────────
  const enterManual = () => {
    if (modeRef.current === 'manual') return;
    const band = bandRef.current;
    const track = trackRef.current;
    const p = periodRef.current;
    if (!band || !track || p <= 0) return;

    const tx = readTranslateX();              // ∈ [-p, 0]
    try { animationRef.current?.pause(); } catch { /* noop */ }

    // Clear the animated transform, set a static one we control.
    track.style.transform = 'translate3d(0, 0, 0)';

    // Park scrollLeft so visible content is unchanged: scrollLeft = p + (-tx).
    suppressScrollRef.current = true;
    band.scrollLeft = p + (-tx);

    modeRef.current = 'manual';
  };

  // ── Hand-off: MANUAL → AUTO ──────────────────────────────────────────────
  const enterAuto = () => {
    if (modeRef.current === 'auto') return;
    const band = bandRef.current;
    const track = trackRef.current;
    const anim = animationRef.current;
    const p = periodRef.current;
    if (!band || !track || !anim || p <= 0) return;

    // Normalise scrollLeft to s ∈ [0, p).
    let s = band.scrollLeft;
    while (s >= p) s -= p;
    while (s < 0) s += p;

    // We want the visible offset to remain at -s. Convert to animation time.
    const dur = typeof anim.effect?.getComputedTiming === 'function'
      ? Number(anim.effect.getComputedTiming().duration) || 1
      : 1;
    const progress = row.direction === 'left'
      ? s / p                 // -s on a 0→-p ramp
      : 1 - s / p;            // -s on a -p→0 ramp
    try { anim.currentTime = progress * dur; } catch { /* noop */ }

    // Clear our static transform so the animation drives it again.
    track.style.transform = '';

    // Reset scrollLeft to 0. Suppress the resulting scroll event.
    suppressScrollRef.current = true;
    band.scrollLeft = 0;

    try { anim.play(); } catch { /* noop */ }
    modeRef.current = 'auto';
  };

  // ── Scroll wrap (manual mode only) ───────────────────────────────────────
  useEffect(() => {
    const band = bandRef.current;
    if (!band) return;
    const onScroll = () => {
      if (suppressScrollRef.current) {
        suppressScrollRef.current = false;
        return;
      }
      if (modeRef.current !== 'manual') return;
      const p = periodRef.current;
      if (p <= 0) return;
      let v = band.scrollLeft;
      let wrapped = false;
      while (v >= 2 * p) { v -= p; wrapped = true; }
      while (v <  p)     { v += p; wrapped = true; }
      if (wrapped) {
        suppressScrollRef.current = true;
        band.scrollLeft = v;
      }
    };
    band.addEventListener('scroll', onScroll, { passive: true });
    return () => band.removeEventListener('scroll', onScroll);
  }, []);

  // ── Event handlers ──────────────────────────────────────────────────────
  const onMouseEnter = () => enterManual();
  const onMouseLeave = () => enterAuto();
  const onTouchStart = () => enterManual();
  const onTouchEnd   = () => enterAuto();
  const onWheel = () => {
    enterManual();
    // After wheel events stop for 250 ms, hand back to auto.
    if (wheelIdleTimerRef.current != null) {
      window.clearTimeout(wheelIdleTimerRef.current);
    }
    wheelIdleTimerRef.current = window.setTimeout(() => {
      wheelIdleTimerRef.current = null;
      // Only auto-resume if the cursor isn't still hovering (mouseenter
      // would have set manual mode independently). The mouseleave handler
      // covers cursor-leave; this covers trackpad wheels that arrived
      // without a mouseenter.
      if (!bandRef.current?.matches(':hover')) enterAuto();
    }, 250);
  };

  // Clean up the wheel-idle timer on unmount
  useEffect(() => () => {
    if (wheelIdleTimerRef.current != null) {
      window.clearTimeout(wheelIdleTimerRef.current);
    }
  }, []);

  return (
    <div
      style={{
        position: 'relative',
        height: isMobile ? '57px' : '114px',
      }}
    >
      {/* Scroll container — user can drag / wheel / swipe horizontally */}
      <div
        ref={bandRef}
        className="mims-band"
        onMouseEnter={onMouseEnter}
        onMouseLeave={onMouseLeave}
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
        onTouchCancel={onTouchEnd}
        onWheel={onWheel}
        style={{
          position: 'absolute',
          inset: 0,
          overflowX: 'auto',
          overflowY: 'hidden',
          WebkitOverflowScrolling: 'touch',
          display: 'flex',
          alignItems: 'center',
          cursor: 'grab',
        }}
      >
        <div
          ref={trackRef}
          className="mims-track"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: isMobile ? '50px' : '100px',
            flexShrink: 0,
            willChange: 'transform',
            backfaceVisibility: 'hidden',
          }}
        >
          {tripled.map((logo, i) => (
            <LogoItem key={`${logo.file}-${i}`} logo={logo} isMobile={isMobile} />
          ))}
        </div>
      </div>

      {/* Edge vignette — above scroll container, doesn't intercept events */}
      <div
        aria-hidden="true"
        style={{
          position: 'absolute',
          inset: 0,
          background:
            'linear-gradient(to right, #ffffff 0%, #ffffff 4%, transparent 18%, transparent 82%, #ffffff 96%, #ffffff 100%)',
          pointerEvents: 'none',
          zIndex: 10,
        }}
      />
    </div>
  );
}


// ─────────────────────────────────────────────────────────────────────────────
// ALUMNI TICKER — main export
// ─────────────────────────────────────────────────────────────────────────────
const AlumniTicker = () => {
  const isMobile = useIsMobile();

  return (
    <section
      aria-label="MIMS alumni network — employers and academic institutions"
      className="bg-background py-section-sm md:py-section"
      style={{ overflow: 'hidden' }}
    >
      <style>{CSS}</style>

      {/* Title — styled as a standard section heading following site conventions */}
      <div className="container">
        <h2 className="font-serif text-heading mb-6 pb-3 border-b border-separator text-accent">
          Our Alumni stand at the Forefront of Global Markets
        </h2>
      </div>

      {/* Four ticker rows */}
      {ROWS.map((row) => (
        <TickerBand key={row.id} row={row} isMobile={isMobile} />
      ))}
    </section>

  );
};

export default AlumniTicker;
