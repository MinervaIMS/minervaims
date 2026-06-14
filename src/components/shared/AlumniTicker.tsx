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

  // One source of truth: float offset in pixels. Positive = track is moved
  // left by `offset` px (i.e. content appears to move right→left).
  const offsetRef = useRef(0);
  // Cached set width (scrollWidth / 3). Re-measured only on init/resize/image-load.
  const setWidthRef = useRef(0);

  const pausedRef          = useRef(false);
  const draggingRef        = useRef(false);
  const lastInteractionRef = useRef(0);

  useEffect(() => {
    const band  = bandRef.current;
    const track = trackRef.current;
    if (!band || !track) return;

    // direction: 'left'  → content moves leftward  → offset increases
    // direction: 'right' → content moves rightward → offset decreases
    const directionSign = row.direction === 'left' ? 1 : -1;
    const targetPps     = isMobile ? PIXELS_PER_SECOND_MOBILE : PIXELS_PER_SECOND_DESKTOP;
    const reducedMotion =
      typeof window !== 'undefined' &&
      window.matchMedia &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    const measure = () => {
      const sw = track.scrollWidth / 3;
      if (sw > 0) setWidthRef.current = sw;
    };
    measure();

    const wrap = (v: number) => {
      const sw = setWidthRef.current;
      if (sw <= 0) return v;
      // Keep offset in [0, sw); supports negative accumulation too.
      let next = v % sw;
      if (next < 0) next += sw;
      return next;
    };

    const apply = () => {
      // translate negative offset so content visually moves in expected dir.
      track.style.transform = `translate3d(${-offsetRef.current}px, 0, 0)`;
    };
    apply();

    let lastTime = performance.now();
    let rafId    = 0;

    const tick = (now: number) => {
      const dt = Math.min((now - lastTime) / 1000, 0.05);
      lastTime = now;

      if (setWidthRef.current === 0) measure();

      const idleFor = now - lastInteractionRef.current;
      const canAutoScroll =
        !reducedMotion &&
        !pausedRef.current &&
        !draggingRef.current &&
        idleFor > RESUME_DELAY_MS &&
        setWidthRef.current > 0;

      if (canAutoScroll) {
        offsetRef.current = wrap(offsetRef.current + directionSign * targetPps * dt);
        apply();
      }
      rafId = requestAnimationFrame(tick);
    };
    rafId = requestAnimationFrame(tick);

    // -------- Mouse drag (1:1 scrub) --------
    let dragStartX      = 0;
    let dragStartOffset = 0;

    const onPointerDown = (e: PointerEvent) => {
      if (e.pointerType !== 'mouse') return;
      e.preventDefault();
      draggingRef.current = true;
      dragStartX      = e.clientX;
      dragStartOffset = offsetRef.current;
      try { band.setPointerCapture(e.pointerId); } catch { /* noop */ }
      lastInteractionRef.current = performance.now();
      band.style.cursor = 'grabbing';
    };
    const onPointerMove = (e: PointerEvent) => {
      if (!draggingRef.current) return;
      // Drag right (clientX increases) → content moves right → offset decreases.
      const dx = e.clientX - dragStartX;
      offsetRef.current = wrap(dragStartOffset - dx);
      apply();
      lastInteractionRef.current = performance.now();
    };
    const stopDrag = (e: PointerEvent) => {
      if (!draggingRef.current) return;
      draggingRef.current = false;
      try { band.releasePointerCapture(e.pointerId); } catch { /* noop */ }
      lastInteractionRef.current = performance.now();
      band.style.cursor = 'grab';
    };

    band.addEventListener('pointerdown',   onPointerDown);
    band.addEventListener('pointermove',   onPointerMove);
    band.addEventListener('pointerup',     stopDrag);
    band.addEventListener('pointercancel', stopDrag);
    band.addEventListener('pointerleave',  stopDrag);

    // -------- Touch (horizontal scrub; vertical → page scroll) --------
    let touchStartX     = 0;
    let touchStartY     = 0;
    let touchStartOff   = 0;
    let touchAxis: 'h' | 'v' | null = null;

    const onTouchStart = (e: TouchEvent) => {
      if (e.touches.length !== 1) return;
      touchStartX   = e.touches[0].clientX;
      touchStartY   = e.touches[0].clientY;
      touchStartOff = offsetRef.current;
      touchAxis     = null;
      lastInteractionRef.current = performance.now();
    };
    const onTouchMove = (e: TouchEvent) => {
      if (e.touches.length !== 1) return;
      const dx = e.touches[0].clientX - touchStartX;
      const dy = e.touches[0].clientY - touchStartY;
      if (touchAxis === null) {
        if (Math.abs(dx) > 8 || Math.abs(dy) > 8) {
          touchAxis = Math.abs(dx) > Math.abs(dy) ? 'h' : 'v';
        } else {
          return;
        }
      }
      if (touchAxis === 'h') {
        if (e.cancelable) e.preventDefault();
        offsetRef.current = wrap(touchStartOff - dx);
        apply();
        lastInteractionRef.current = performance.now();
      }
      // 'v' → let the page scroll; do nothing.
    };
    const onTouchEnd = () => {
      touchAxis = null;
      lastInteractionRef.current = performance.now();
    };
    band.addEventListener('touchstart', onTouchStart, { passive: true });
    band.addEventListener('touchmove',  onTouchMove,  { passive: false });
    band.addEventListener('touchend',   onTouchEnd,   { passive: true });
    band.addEventListener('touchcancel',onTouchEnd,   { passive: true });

    // -------- Wheel / trackpad (horizontal scrub; vertical → page) --------
    const onWheel = (e: WheelEvent) => {
      const ax = Math.abs(e.deltaX);
      const ay = Math.abs(e.deltaY);
      if (ax > ay && ax > 0) {
        e.preventDefault();
        offsetRef.current = wrap(offsetRef.current + e.deltaX);
        apply();
        lastInteractionRef.current = performance.now();
      }
      // else: vertical wheel → page scroll, untouched.
    };
    band.addEventListener('wheel', onWheel, { passive: false });

    // -------- Re-measure on resize and on image loads --------
    const ro = new ResizeObserver(() => {
      measure();
      offsetRef.current = wrap(offsetRef.current);
      apply();
    });
    ro.observe(track);

    const imgs = Array.from(track.querySelectorAll('img'));
    const onImgLoad = () => {
      measure();
      offsetRef.current = wrap(offsetRef.current);
      apply();
    };
    imgs.forEach((img) => img.addEventListener('load', onImgLoad));

    return () => {
      cancelAnimationFrame(rafId);
      band.removeEventListener('pointerdown',   onPointerDown);
      band.removeEventListener('pointermove',   onPointerMove);
      band.removeEventListener('pointerup',     stopDrag);
      band.removeEventListener('pointercancel', stopDrag);
      band.removeEventListener('pointerleave',  stopDrag);
      band.removeEventListener('touchstart',    onTouchStart);
      band.removeEventListener('touchmove',     onTouchMove);
      band.removeEventListener('touchend',      onTouchEnd);
      band.removeEventListener('touchcancel',   onTouchEnd);
      band.removeEventListener('wheel',         onWheel);
      ro.disconnect();
      imgs.forEach((img) => img.removeEventListener('load', onImgLoad));
    };
  }, [isMobile, row.direction, row.logos.length]);

  return (
    <div style={{ position: 'relative', height: isMobile ? '57px' : '114px' }}>
      <div
        ref={bandRef}
        onMouseEnter={() => { pausedRef.current = true; }}
        onMouseLeave={() => { pausedRef.current = false; }}
        style={{
          height: '100%',
          overflow: 'hidden',
          // Horizontal gestures scrub; vertical still scrolls the page.
          touchAction: 'pan-y',
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
            willChange: 'transform',
            transform: 'translate3d(0,0,0)',
            backfaceVisibility: 'hidden',
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
