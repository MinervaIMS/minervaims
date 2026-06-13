import { useState } from 'react';

// ─────────────────────────────────────────────────────────────────────────────
// SVG files are served from /public/logos/{file}.svg
// All files are normalised to a 250×250 viewBox with transparent backgrounds.
// Missing files are handled gracefully — see LogoItem below.
// Do not apply any CSS filter to the images; use brand colours as-is.
// ─────────────────────────────────────────────────────────────────────────────

const DURATION = 40; // seconds — uniform across all rows

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
  @keyframes mimsLeft {
    from { transform: translateX(0); }
    to   { transform: translateX(-50%); }
  }
  @keyframes mimsRight {
    from { transform: translateX(-50%); }
    to   { transform: translateX(0); }
  }
  @media (prefers-reduced-motion: reduce) {
    .mims-track { animation-play-state: paused !important; }
  }
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
function LogoItem({ logo }: { logo: Logo }) {
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
          maxHeight: '116px',   // 1:1 logos render at 116×116 (66 × 1.75)
          maxWidth: '368px',    // wide wordmarks capped here (210 × 1.75)
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
  paused,
  onEnter,
  onLeave,
}: {
  row: Row;
  paused: boolean;
  onEnter: () => void;
  onLeave: () => void;
}) {
  const doubled = [...row.logos, ...row.logos]; // 2 identical copies
  const anim    = row.direction === 'left' ? 'mimsLeft' : 'mimsRight';

  return (
    <div
      onMouseEnter={onEnter}
      onMouseLeave={onLeave}
      style={{
        position: 'relative',
        overflow: 'hidden',          // clips the scrolling track
        height: '252px',             // tall enough for scaled logos + breathing room (144 × 1.75)
        display: 'flex',
        alignItems: 'center',
      }}
    >
      {/* ── Scrolling track ── */}
      <div
        className="mims-track"
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '120px',              // inter-logo spacing (150% of original 80px)
          animation: `${anim} ${DURATION}s linear infinite`,
          animationPlayState: paused ? 'paused' : 'running',
          willChange: 'transform',
          // NO padding here — padding breaks the -50% calculation.
          // The fade overlay handles visual edge treatment.
        }}
      >
        {doubled.map((logo, i) => (
          <LogoItem key={`${logo.file}-${i}`} logo={logo} />
        ))}
      </div>

      {/* ── Edge vignette ──
          Must sit INSIDE the overflow:hidden container so it doesn't scroll.
          Position absolute + inset:0 makes it span the full band.
          The colour (#ffffff) must match the page background exactly.
          If the page background resolves to something other than #ffffff,
          update both colour stops accordingly.
          The 9% fade zone ≈ 170px at 1920px viewport — enough to feel
          organic without hiding the logos prematurely.
          pointer-events:none is mandatory so the overlay never intercepts
          mouse events (hover-pause must still trigger on the band below).  ──  */}
      <div
        aria-hidden="true"
        style={{
          position: 'absolute',
          inset: 0,
          background:
            'linear-gradient(to right, #ffffff 0%, transparent 9%, transparent 91%, #ffffff 100%)',
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
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  return (
    <section
      aria-label="MIMS alumni network — employers and academic institutions"
      className="bg-background"
      style={{ overflow: 'hidden' }}
    >
      <style>{CSS}</style>

      {/* Title — styled as a standard section heading following site conventions */}
      <div className="container" style={{ paddingTop: '60px' }}>
        <h2 className="font-serif text-heading mb-6 pb-3 border-b border-separator text-accent">
          Our alumni stand at the forefront of global markets
        </h2>
      </div>

      {/* Four ticker rows */}
      {ROWS.map((row) => (
        <TickerBand
          key={row.id}
          row={row}
          paused={hoveredId === row.id}
          onEnter={() => setHoveredId(row.id)}
          onLeave={() => setHoveredId(null)}
        />
      ))}

      {/* Bottom spacing */}
      <div style={{ paddingBottom: '60px' }} />
    </section>
  );
};

export default AlumniTicker;
