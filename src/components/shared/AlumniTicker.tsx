import { useEffect, useRef, useState } from 'react';
import { useIsMobile } from '@/hooks/use-mobile';

// ─────────────────────────────────────────────────────────────────────────────
// SVG files are served from /public/logos/{file}.svg
// All files are normalised to a 250×250 viewBox with transparent backgrounds.
// Missing files are handled gracefully — see LogoItem below.
// Do not apply any CSS filter to the images; use brand colours as-is.
// ─────────────────────────────────────────────────────────────────────────────

// Uniform perceived speed across all rows.
const PIXELS_PER_SECOND_DESKTOP = 55;
const PIXELS_PER_SECOND_MOBILE  = 28;

// After a manual interaction stops, hold auto-scroll off this long so any
// native momentum (touch / trackpad) can play out without auto-velocity on top.
const INTERACTION_IDLE_MS = 900;

interface Logo { name: string; file: string; }
interface Row  { id: string; logos: Logo[]; direction: 'left' | 'right'; }

// ─────────────────────────────────────────────────────────────────────────────
// DATA
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
      { name: 'BNP Paribas',      file: 'bnp-paribas'      },
      { name: 'HSBC',             file: 'hsbc'             },
      { name: 'Macquarie',        file: 'macquarie'        },
    ],
  },
  {
    id: 'buyside',
    direction: 'right',
    logos: [
      { name: 'BlackRock',           file: 'blackrock'           },
      { name: 'PIMCO',               file: 'pimco'               },
      { name: 'Vanguard',            file: 'vanguard'            },
      { name: 'Citadel',             file: 'citadel'             },
      { name: 'D.E. Shaw & Co.',     file: 'd-e-shaw'            },
      { name: 'Squarepoint Capital', file: 'squarepoint-capital' },
      { name: 'IMC Trading',         file: 'imc'                 },
      { name: 'Ares Management',     file: 'ares-management'     },
      { name: 'Lazard',              file: 'lazard'              },
      { name: 'Rothschild & Co',     file: 'rothschild-and-co'   },
    ],
  },
  {
    id: 'advisory',
    direction: 'left',
    logos: [
      { name: 'McKinsey & Company',          file: 'mckinsey-and-company'        },
      { name: 'BCG',                         file: 'boston-consulting-group'     },
      { name: 'Bain & Company',              file: 'bain-and-company'            },
      { name: 'Oliver Wyman',                file: 'oliver-wyman'                },
      { name: 'KPMG',                        file: 'kpmg'                        },
      { name: 'European Central Bank',       file: 'european-central-bank'       },
      { name: 'International Monetary Fund', file: 'international-monetary-fund' },
      { name: 'European Investment Bank',    file: 'european-investment-bank'    },
      { name: "Banca d'Italia",              file: 'banca-d-italia'              },
      { name: 'UniCredit',                   file: 'unicredit'                   },
      { name: 'Mediobanca',                  file: 'mediobanca'                  },
      { name: 'Equita',                      file: 'equita'                      },
      { name: 'Intesa Sanpaolo',             file: 'intesa-sanpaolo'             },
      { name: 'Generali',                    file: 'generali'                    },
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
// CSS — hide native scrollbar; the row stays scrollable.
// ─────────────────────────────────────────────────────────────────────────────
const CSS = `
  .mims-band {
    scrollbar-width: none;
    -ms-overflow-style: none;
  }
  .mims-band::-webkit-scrollbar { display: none; width: 0; height: 0; }
`;

// ─────────────────────────────────────────────────────────────────────────────
// LOGO ITEM — graceful degradation for missing files (visibility:hidden keeps
// layout stable so the row width doesn't jump as files are added).
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
        visibility: visible ? 'visible' : 'hidden',
      }}
    >
      <img
        src={`/logos/${logo.file}.svg`}
        alt={logo.name}
        draggable={false}
        loading="eager"
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
// TICKER BAND — single position channel (native scrollLeft).
//
// Auto-scroll: rAF loop nudges scrollLeft by PPS × dt each frame.
// Manual: native overflow-x:scroll handles wheel / trackpad / touch swipe;
//   custom pointer handlers handle mouse drag.
// Pause: pausedRef = true → loop skips the nudge → position untouched.
// Idle hold: bumpInteraction() postpones auto for INTERACTION_IDLE_MS after
//   the last user input, so touch momentum can settle without overlap.
// Wrap: scrollLeft is kept inside [setWidth, 2*setWidth); the tripled logo
//   strip means the wrap is invisible.
// ─────────────────────────────────────────────────────────────────────────────
function TickerBand({ row, isMobile }: { row: Row; isMobile: boolean }) {
  const tripled = [...row.logos, ...row.logos, ...row.logos];
  const perSet  = row.logos.length;

  const bandRef  = useRef<HTMLDivElement | null>(null);
  const trackRef = useRef<HTMLDivElement | null>(null);

  const setWidthRef       = useRef<number>(0);
  const pausedRef         = useRef<boolean>(false);
  const interactionUntilRef = useRef<number>(0);
  const rafRef            = useRef<number | null>(null);
  const lastTsRef         = useRef<number | null>(null);
  const draggingRef       = useRef<boolean>(false);
  const dragStartXRef     = useRef<number>(0);
  const dragStartScrollRef= useRef<number>(0);
  const activePointerRef  = useRef<number | null>(null);

  // Measure one-set width via offsetLeft(child[perSet]) − offsetLeft(child[0]).
  const measure = () => {
    const track = trackRef.current;
    const band  = bandRef.current;
    if (!track || !band) return;
    const a = track.children[0] as HTMLElement | undefined;
    const b = track.children[perSet] as HTMLElement | undefined;
    if (!a || !b) return;
    const w = b.offsetLeft - a.offsetLeft;
    if (w <= 0) return;
    const prev = setWidthRef.current;
    setWidthRef.current = w;
    // If we were already running, keep the visible offset stable: re-centre
    // scrollLeft to the middle copy preserving the in-copy fractional offset.
    if (prev > 0) {
      const frac = ((band.scrollLeft - prev) % w + w) % w;
      band.scrollLeft = w + frac;
    } else {
      band.scrollLeft = w; // start at the middle copy
    }
  };

  // Measure on mount + when images load + on resize.
  useEffect(() => {
    const track = trackRef.current;
    if (!track) return;

    measure();

    const imgs = Array.from(track.querySelectorAll('img'));
    const offs: Array<() => void> = [];
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

    const ro = new ResizeObserver(measure);
    ro.observe(track);

    return () => {
      ro.disconnect();
      offs.forEach((off) => off());
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isMobile, perSet]);

  // rAF loop.
  useEffect(() => {
    const reduced =
      typeof window !== 'undefined' &&
      window.matchMedia &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    const pps = isMobile ? PIXELS_PER_SECOND_MOBILE : PIXELS_PER_SECOND_DESKTOP;
    const dir = row.direction === 'left' ? 1 : -1; // +1 = scrollLeft increases

    const tick = (ts: number) => {
      const band = bandRef.current;
      const w = setWidthRef.current;
      if (!band || w <= 0) {
        lastTsRef.current = ts;
        rafRef.current = requestAnimationFrame(tick);
        return;
      }

      const last = lastTsRef.current ?? ts;
      let dt = (ts - last) / 1000;
      if (dt > 0.05) dt = 0.05; // clamp tab-stall / jank
      lastTsRef.current = ts;

      const now = performance.now();
      const idle = now >= interactionUntilRef.current;
      const auto = !reduced && !pausedRef.current && !draggingRef.current && idle;

      if (auto) {
        band.scrollLeft += dir * pps * dt;
      }

      // Wrap into [w, 2w) — invisible because copies are identical.
      let s = band.scrollLeft;
      if (s >= 2 * w) {
        s -= w;
        band.scrollLeft = s;
      } else if (s < w) {
        s += w;
        band.scrollLeft = s;
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

  const bumpInteraction = () => {
    interactionUntilRef.current = performance.now() + INTERACTION_IDLE_MS;
  };

  // ── Hover pause (mouse only) ────────────────────────────────────────────
  const onMouseEnter = () => { pausedRef.current = true; };
  const onMouseLeave = () => { pausedRef.current = false; };

  // ── Mouse drag (custom; touch handled natively) ─────────────────────────
  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.pointerType !== 'mouse') {
      // For touch / pen, just yield auto-scroll; let native scroll do the work.
      bumpInteraction();
      return;
    }
    const band = bandRef.current;
    if (!band) return;
    draggingRef.current = true;
    activePointerRef.current = e.pointerId;
    dragStartXRef.current = e.clientX;
    dragStartScrollRef.current = band.scrollLeft;
    try { band.setPointerCapture(e.pointerId); } catch { /* noop */ }
    band.style.cursor = 'grabbing';
    bumpInteraction();
  };

  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!draggingRef.current || e.pointerId !== activePointerRef.current) return;
    const band = bandRef.current;
    if (!band) return;
    const dx = e.clientX - dragStartXRef.current;
    band.scrollLeft = dragStartScrollRef.current - dx;
    bumpInteraction();
  };

  const endDrag = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!draggingRef.current || e.pointerId !== activePointerRef.current) return;
    draggingRef.current = false;
    activePointerRef.current = null;
    const band = bandRef.current;
    if (band) {
      try { band.releasePointerCapture(e.pointerId); } catch { /* noop */ }
      band.style.cursor = 'grab';
    }
    bumpInteraction();
  };

  // ── Wheel / native scroll: just yield ───────────────────────────────────
  const onWheel = () => { bumpInteraction(); };
  const onTouchStart = () => { bumpInteraction(); };
  const onTouchMove  = () => { bumpInteraction(); };
  const onTouchEnd   = () => { bumpInteraction(); };
  const onScroll     = () => { /* wrap handled in rAF */ };

  return (
    <div
      style={{
        position: 'relative',
        height: isMobile ? '57px' : '114px',
      }}
    >
      <div
        ref={bandRef}
        className="mims-band"
        onMouseEnter={onMouseEnter}
        onMouseLeave={onMouseLeave}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        onWheel={onWheel}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
        onTouchCancel={onTouchEnd}
        onScroll={onScroll}
        style={{
          position: 'absolute',
          inset: 0,
          overflowX: 'auto',
          overflowY: 'hidden',
          WebkitOverflowScrolling: 'touch',
          display: 'flex',
          alignItems: 'center',
          cursor: 'grab',
          touchAction: 'pan-x',
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

      <div className="container">
        <h2 className="font-serif text-heading mb-6 pb-3 border-b border-separator text-accent">
          Our Alumni stand at the Forefront of Global Markets
        </h2>
      </div>

      {ROWS.map((row) => (
        <TickerBand key={row.id} row={row} isMobile={isMobile} />
      ))}
    </section>
  );
};

export default AlumniTicker;
