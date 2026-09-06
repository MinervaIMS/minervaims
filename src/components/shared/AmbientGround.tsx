import { memo } from 'react';

// =====================================================================
// AmbientGround — the background that is always there.
// ---------------------------------------------------------------------
// Every dark page on this site is a canvas over a flat colour: the beams
// behind the sign-in card, the dot field behind /join and the application
// form. The canvas is the good version. The flat colour is what was left
// when the canvas did not arrive, and "did not arrive" happens for four
// separate reasons that have nothing to do with each other:
//
//   * the browser is one of the ones on the lite list, so nothing is
//     mounted on purpose;
//   * the reader has asked for reduced motion, so nothing is mounted on
//     purpose;
//   * the canvas is code-split and mounts a beat after the card, so for
//     the first fraction of a second there is nothing yet;
//   * WebGL is unavailable, or its context is lost, and the canvas is
//     mounted but drawing nothing at all - which fails SILENTLY.
//
// In all four the page went flat, and a page that is sometimes textured
// and sometimes a plain rectangle reads as a page that is sometimes
// broken. That is the report: "beams and dots often do not load at all".
//
// So the composition no longer lives only in the canvas. This layer draws
// the SAME impression in CSS gradients, it is painted underneath every
// one of those backgrounds, and it never fails: there is no context to
// lose, no shader to compile, no module to fetch and nothing to decide.
// The canvas, when it comes, fades in over the top and takes the
// composition from a suggestion to the real thing.
//
// It costs one paint. Both variants are static gradients on a single
// element, so there is no per-frame work and nothing here can be the
// reason a weak browser struggles.
// =====================================================================

/** The two grounds the site actually has. */
export type AmbientKind = 'beams' | 'dots';

/**
 * Diagonal shafts of lavender light on near-black, at the same 30 degrees
 * and in the same colour the beams are given in AuthLayout.
 */
const BEAMS_LAYERS = [
  // Two passes at different pitches so no band repeats predictably, and
  // both faint: the canvas version is light diffusing through a volume,
  // not stripes on a wall, and the fallback is wrong the moment it reads
  // as a pattern rather than as an atmosphere.
  'repeating-linear-gradient(60deg, rgba(175,162,210,0.042) 0px, rgba(175,162,210,0.042) 26px, rgba(175,162,210,0) 26px, rgba(175,162,210,0) 104px)',
  'repeating-linear-gradient(60deg, rgba(175,162,210,0.024) 0px, rgba(175,162,210,0.024) 9px, rgba(175,162,210,0) 9px, rgba(175,162,210,0) 61px)',
  'radial-gradient(120% 80% at 50% 0%, rgba(126,91,194,0.26) 0%, rgba(31,15,77,0.09) 45%, rgba(5,3,15,0) 75%)',
  'linear-gradient(180deg, #0A0619 0%, #05030F 60%, #05030F 100%)',
].join(',');

/**
 * The dot lattice, at the field's own 18px pitch so the CSS version and
 * the canvas version sit on the same grid and the swap is not a jump.
 */
const DOTS_LAYERS = [
  'radial-gradient(circle at center, rgba(160,145,214,0.42) 0.8px, rgba(160,145,214,0) 0.9px)',
  'radial-gradient(115% 75% at 50% 15%, rgba(126,91,194,0.22) 0%, rgba(31,15,77,0.08) 50%, rgba(5,3,15,0) 78%)',
  'linear-gradient(180deg, #070413 0%, #05030F 100%)',
].join(',');

/**
 * The ground beneath an ambient canvas.
 *
 * `aria-hidden` and `pointer-events-none`: it is scenery, and it must
 * never take a click meant for the card sitting on it.
 */
export const AmbientGround = memo(function AmbientGround({ kind }: { kind: AmbientKind }) {
  const dots = kind === 'dots';
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-0"
      style={{
        backgroundImage: dots ? DOTS_LAYERS : BEAMS_LAYERS,
        // The lattice repeats on its own pitch; the two washes under it
        // cover the whole box once.
        backgroundSize: dots ? '18px 18px, 100% 100%, 100% 100%' : undefined,
        backgroundColor: '#05030F',
      }}
    />
  );
});

export default AmbientGround;
