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
// AND THE STAND-IN THEN GETS OUT OF ITS WAY. Drawing both at once is what
// put two dot grids on /join. The dots ground is therefore two elements:
// the wash, which is the page's colour and is always drawn, and the
// lattice, which hands over to the canvas the moment the canvas is
// genuinely painting. See `lattice` below.
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
 * The dots ground, in TWO PIECES, and the split is the whole point.
 *
 * THE WASH IS THE PAGE'S ATMOSPHERE AND IS ALWAYS DRAWN: the purple bloom
 * high in the middle and the deep gradient under it. The canvas has no
 * equivalent - it paints dots on a transparent surface and nothing else -
 * so this is the only thing giving those pages their colour, and it must
 * be there whether or not a canvas ever arrives.
 *
 * THE LATTICE IS A STAND-IN FOR THE CANVAS AND IS DRAWN ONLY UNTIL THE
 * CANVAS IS. Both are on an 18px pitch, but the canvas centres its grid
 * inside the box it measures while CSS anchors its own to the top left,
 * so the two land a pixel or two apart and, painted at the same time,
 * read as two overlapping grids rather than one. That is exactly what was
 * reported on /join: "two layers of dots".
 *
 * They are separate elements rather than one stack of background layers
 * because `background-image` cannot be transitioned. As its own element
 * the lattice can fade out over the same 700ms the canvas fades in, with
 * the same easing, so the two are always complements of each other and
 * the amount of dot on screen never changes: what a reader sees is the
 * grid settling by a pixel, not a layer being removed.
 */
const DOTS_WASH = [
  'radial-gradient(115% 75% at 50% 15%, rgba(126,91,194,0.22) 0%, rgba(31,15,77,0.08) 50%, rgba(5,3,15,0) 78%)',
  'linear-gradient(180deg, #070413 0%, #05030F 100%)',
].join(',');

const DOTS_LATTICE = 'radial-gradient(circle at center, rgba(160,145,214,0.42) 0.8px, rgba(160,145,214,0) 0.9px)';

interface AmbientGroundProps {
  kind: AmbientKind;
  /**
   * Draw the dot lattice. Leave it on (the default) wherever this layer
   * is the whole background; turn it off once a dot canvas is genuinely
   * painting on top, so the page carries one grid instead of two. Ignored
   * by the beams ground, which has no lattice and, in `Beams`, is only
   * ever rendered when its canvas is absent.
   */
  lattice?: boolean;
}

/**
 * The ground beneath an ambient canvas.
 *
 * `aria-hidden` and `pointer-events-none`: it is scenery, and it must
 * never take a click meant for the card sitting on it.
 */
export const AmbientGround = memo(function AmbientGround({ kind, lattice = true }: AmbientGroundProps) {
  if (kind === 'beams') {
    return (
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0"
        style={{ backgroundImage: BEAMS_LAYERS, backgroundColor: '#05030F' }}
      />
    );
  }

  return (
    <>
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0"
        style={{ backgroundImage: DOTS_WASH, backgroundColor: '#05030F' }}
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 transition-opacity duration-700 ease-out"
        style={{
          backgroundImage: DOTS_LATTICE,
          // The lattice repeats on its own pitch; the wash beneath it
          // covers the whole box once.
          backgroundSize: '18px 18px',
          opacity: lattice ? 1 : 0,
        }}
      />
    </>
  );
});

export default AmbientGround;
