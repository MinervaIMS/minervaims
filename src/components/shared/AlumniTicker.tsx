import { useEffect, useRef, useState } from 'react';
import { useIsMobile } from '@/hooks/use-mobile';

const PIXELS_PER_SECOND_DESKTOP = 55;
const PIXELS_PER_SECOND_MOBILE  = 28;
const RESUME_DELAY_MS = 900;

interface Logo { name: string; file: string; }
interface Row  { id: string; logos: Logo[]; direction: 'left' | 'right'; }

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

const CSS = `
  .mims-band { -ms-overflow-style: none; scrollbar-width: none; }
  .mims-band::-webkit-scrollbar { display: none; height: 0; width: 0; }
`;

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
          maxWidth:  isMobile ? '325px' : '650px',
          width: 'auto', height: 'auto', objectFit: 'contain',
          opacity, transition: 'opacity 0.35s ease',
          userSelect: 'none', pointerEvents: 'none', display: 'block',
        }}
      />
    </div>
  );
}

function TickerBand({ row, isMobile }: { row: Row; isMobile: boolean }) {
  const tripled = [...row.logos, ...row.logos, ...row.logos];
  const bandRef  = useRef<HTMLDivElement | null>(null);
  const trackRef = useRef<HTMLDivElement | null>(null);
  const pausedRef          = useRef(false);
  const draggingRef        = useRef(false);
  const lastInteractionRef = useRef(0);
  const initializedRef     = useRef(false);
  // Float-precision scroll position. WebKit (Safari, iOS WebView) rounds
  // Element.scrollLeft to integer pixels: a per-frame delta of ~0.92px
  // (= 55 pps × 16.7ms at 60Hz) gets floored to 0 for the positive
  // direction, freezing left-direction rows. We keep the true float
  // here and always write the accumulated value, so the fractional
  // component is never lost.
  const scrollPosRef = useRef(0);

  useEffect(() => {
    const band  = bandRef.current;
    const track = trackRef.current;
    if (!band || !track) return;

    const directionSign = row.direction === 'left' ? 1 : -1;
    const targetPps     = isMobile ? PIXELS_PER_SECOND_MOBILE : PIXELS_PER_SECOND_DESKTOP;
    const reducedMotion =
      typeof window !== 'undefined' &&
      window.matchMedia &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    const setWidth = () => track.scrollWidth / 3;

    const tryInit = () => {
      if (initializedRef.current) return;
      const sw = setWidth();
      if (sw > 0) {
        scrollPosRef.current = sw * 1.5;
        band.scrollLeft      = scrollPosRef.current;
        initializedRef.current = true;
      }
    };
    tryInit();

    let lastTime = performance.now();
    let rafId    = 0;

    const tick = (now: number) => {
      tryInit();
      const dt = Math.min((now - lastTime) / 1000, 0.05);
      lastTime = now;
      const sw = setWidth();
      if (sw === 0) { rafId = requestAnimationFrame(tick); return; }

      // Reconcile with any external scroll change (user drag/wheel/touch
      // wrote to scrollLeft outside our control). If the actual scroll
      // position drifts from our float by more than the typical browser
      // rounding tolerance (~1px), trust the actual position.
      const actualSl = band.scrollLeft;
      if (Math.abs(actualSl - scrollPosRef.current) > 2) {
        scrollPosRef.current = actualSl;
      }

      const idleFor = now - lastInteractionRef.current;
      const canAutoScroll =
        !reducedMotion && !pausedRef.current && !draggingRef.current && idleFor > RESUME_DELAY_MS;

      let pos = scrollPosRef.current;
      if (canAutoScroll) {
        // Accumulate velocity on OUR float, not on scrollLeft (which
        // WebKit floors to integer pixels and would drop sub-pixel deltas
        // in the positive direction — see scrollPosRef doc).
        pos += directionSign * targetPps * dt;
      }

      if      (pos < sw)     pos += sw;
      else if (pos > sw * 2) pos -= sw;

      scrollPosRef.current = pos;
      band.scrollLeft      = pos;

      rafId = requestAnimationFrame(tick);
    };
    rafId = requestAnimationFrame(tick);

    let dragStartX  = 0;
    let dragStartSL = 0;
    const onPointerDown = (e: PointerEvent) => {
      if (e.pointerType !== 'mouse') return;
      e.preventDefault();
      draggingRef.current = true;
      dragStartX  = e.clientX;
      dragStartSL = band.scrollLeft;
      try { band.setPointerCapture(e.pointerId); } catch { /* noop */ }
      lastInteractionRef.current = performance.now();
      band.style.cursor = 'grabbing';
    };
    const onPointerMove = (e: PointerEvent) => {
      if (!draggingRef.current) return;
      band.scrollLeft = dragStartSL - (e.clientX - dragStartX);
      lastInteractionRef.current = performance.now();
    };
    const stopDrag = (e: PointerEvent) => {
      if (!draggingRef.current) return;
      draggingRef.current = false;
      try { band.releasePointerCapture(e.pointerId); } catch { /* noop */ }
      lastInteractionRef.current = performance.now();
      band.style.cursor = 'grab';
    };
    const bumpInteraction = () => { lastInteractionRef.current = performance.now(); };

    band.addEventListener('pointerdown',   onPointerDown);
    band.addEventListener('pointermove',   onPointerMove);
    band.addEventListener('pointerup',     stopDrag);
    band.addEventListener('pointercancel', stopDrag);
    band.addEventListener('pointerleave',  stopDrag);
    band.addEventListener('touchstart',    bumpInteraction, { passive: true });
    band.addEventListener('touchmove',     bumpInteraction, { passive: true });
    band.addEventListener('touchend',      bumpInteraction, { passive: true });
    band.addEventListener('wheel',         bumpInteraction, { passive: true });

    const ro = new ResizeObserver(() => {
      const sw = setWidth();
      if (sw === 0) return;
      if      (band.scrollLeft < sw)     band.scrollLeft += sw;
      else if (band.scrollLeft > sw * 2) band.scrollLeft -= sw;
    });
    ro.observe(track);

    return () => {
      cancelAnimationFrame(rafId);
      band.removeEventListener('pointerdown',   onPointerDown);
      band.removeEventListener('pointermove',   onPointerMove);
      band.removeEventListener('pointerup',     stopDrag);
      band.removeEventListener('pointercancel', stopDrag);
      band.removeEventListener('pointerleave',  stopDrag);
      band.removeEventListener('touchstart',    bumpInteraction);
      band.removeEventListener('touchmove',     bumpInteraction);
      band.removeEventListener('touchend',      bumpInteraction);
      band.removeEventListener('wheel',         bumpInteraction);
      ro.disconnect();
    };
  }, [isMobile, row.direction, row.logos.length]);

  return (
    <div style={{ position: 'relative', height: isMobile ? '57px' : '114px' }}>
      <div
        ref={bandRef}
        className="mims-band"
        onMouseEnter={() => { pausedRef.current = true; }}
        onMouseLeave={() => { pausedRef.current = false; }}
        style={{
          height: '100%',
          overflowX: 'scroll',
          overflowY: 'hidden',
          touchAction: 'pan-x',
          cursor: 'grab',
        }}
      >
        <div
          ref={trackRef}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: isMobile ? '50px' : '100px',
            height: '100%',
          }}
        >
          {tripled.map((logo, i) => (
            <LogoItem key={`${logo.file}-${i}`} logo={logo} isMobile={isMobile} />
          ))}
        </div>
      </div>

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
