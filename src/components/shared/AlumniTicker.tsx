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
  .mims-band { scrollbar-width: none; -ms-overflow-style: none; }
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
// TICKER BAND
//
// SEAMLESS LOOP TECHNIQUE:
//   1. Duplicate logos array exactly once → 2 identical copies in one flex row.
//   2. The inner track's total width = 2 × (one set's width).
//   3. For LEFT:  animate translateX from 0 → -50%.
//      -50% of the container = exactly one set's width.
//      When the animation restarts at 0, the viewport content is identical
//      to what was visible at -50% (both show the start of an identical set).
//      The restart is instantaneous and visually undetectable.
//   4. For RIGHT: animate translateX from -50% → 0. Same logic, reversed.
//   5. timing-function MUST be linear — any ease produces a visible
//      speed-change at the loop point.
//   6. will-change: transform enables GPU compositing, preventing frame drops
//      and any raster blit at the animation boundary.
//   7. The outer div carries overflow:hidden and NO padding. Padding on the
//      outer div shifts the clipping window without affecting the animation.
//      padding on the INNER (scrolling) div would break the -50% math.
// ─────────────────────────────────────────────────────────────────────────────
function TickerBand({
  row,
  isMobile,
}: {
  row: Row;
  isMobile: boolean;
}) {
  // 3 copies of the logo set → the middle copy is always the "anchor".
  // We keep scrollLeft inside [halfWidth, 2*halfWidth) by wrapping on every
  // change. Because all three copies are identical, jumps of exactly
  // halfWidth are visually invisible — this yields a true infinite loop
  // in BOTH directions, whether the auto-scroll is running or the user is
  // dragging / wheeling / swiping the track.
  const tripled = [...row.logos, ...row.logos, ...row.logos];

  const bandRef     = useRef<HTMLDivElement | null>(null);
  const trackRef    = useRef<HTMLDivElement | null>(null);
  const pausedRef   = useRef<boolean>(false);
  const halfRef     = useRef<number>(0);   // width of ONE logo set
  const rafRef      = useRef<number | null>(null);
  const lastTsRef   = useRef<number | null>(null);

  // ── Measure: half = scrollWidth / 3 (we tripled the set) ────────────────
  useEffect(() => {
    const track = trackRef.current;
    const band  = bandRef.current;
    if (!track || !band) return;

    let frozen = false;
    let ro: ResizeObserver | null = null;
    const offs: Array<() => void> = [];

    const measure = () => {
      if (frozen) return;
      const w = track.scrollWidth / 3;
      if (w <= 0) return;
      halfRef.current = w;
      // Park the viewport on the middle copy so the user can scroll either
      // direction without ever hitting a hard edge.
      if (band.scrollLeft < w * 0.5 || band.scrollLeft > w * 2.5) {
        band.scrollLeft = w;
      }
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
  }, [isMobile, row.logos.length]);

  // ── Wrap scrollLeft on every scroll event (auto-driven OR user-driven) ──
  useEffect(() => {
    const band = bandRef.current;
    if (!band) return;
    const onScroll = () => {
      const w = halfRef.current;
      if (w <= 0) return;
      // Keep scrollLeft inside [w, 2w). Both boundaries land on identical
      // pixels of the next/prev copy, so the jump is invisible.
      if (band.scrollLeft >= 2 * w) {
        band.scrollLeft -= w;
      } else if (band.scrollLeft < w) {
        band.scrollLeft += w;
      }
    };
    band.addEventListener('scroll', onScroll, { passive: true });
    return () => band.removeEventListener('scroll', onScroll);
  }, []);

  // ── Auto-scroll via rAF driving scrollLeft (works with manual scroll) ───
  useEffect(() => {
    const band = bandRef.current;
    if (!band) return;

    const reduced =
      typeof window !== 'undefined' &&
      window.matchMedia &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduced) return;

    const pps = isMobile ? PIXELS_PER_SECOND_MOBILE : PIXELS_PER_SECOND_DESKTOP;
    const dir = row.direction === 'left' ? 1 : -1;

    const tick = (ts: number) => {
      if (lastTsRef.current == null) lastTsRef.current = ts;
      const dt = (ts - lastTsRef.current) / 1000;
      lastTsRef.current = ts;
      if (!pausedRef.current && halfRef.current > 0) {
        band.scrollLeft += dir * pps * dt;
      }
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);

    return () => {
      if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
      lastTsRef.current = null;
    };
  }, [isMobile, row.direction]);

  const pause  = () => { pausedRef.current = true;  };
  const resume = () => { pausedRef.current = false; lastTsRef.current = null; };

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
        onMouseEnter={pause}
        onMouseLeave={resume}
        onTouchStart={pause}
        onTouchEnd={resume}
        onTouchCancel={resume}
        onWheel={pause}
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
            transform: 'translateZ(0)',
            backfaceVisibility: 'hidden',
          }}
        >
          {tripled.map((logo, i) => (
            <LogoItem key={`${logo.file}-${i}`} logo={logo} isMobile={isMobile} />
          ))}
        </div>
      </div>

      {/* Edge vignette */}
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
