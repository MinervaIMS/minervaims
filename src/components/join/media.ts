// =====================================================================
// /join media registry.
//
// Every asset is referenced through its .asset.json manifest, the same
// convention every other page on the site uses, so a re-upload changes
// one JSON file and nothing else. The manifests declare the real encoding
// of each file: the mismatch between a .webp name and PNG bytes is what
// used to make the old hero block first paint.
// =====================================================================

import heroStillAvif from '@/assets/join-hero-still.avif.asset.json';
import heroStillWebp from '@/assets/join-hero-still.webp.asset.json';
import markGlb from '@/assets/join-minerva-mark.glb.asset.json';

import equityLoop from '@/assets/join-equity-loop.mp4.asset.json';
import equityPosterAvif from '@/assets/join-equity-poster.avif.asset.json';
import equityPosterWebp from '@/assets/join-equity-poster.webp.asset.json';

import investmentLoop from '@/assets/join-investment-loop.mp4.asset.json';
import investmentPosterAvif from '@/assets/join-investment-poster.avif.asset.json';
import investmentPosterWebp from '@/assets/join-investment-poster.webp.asset.json';

import macroLoop from '@/assets/join-macro-loop.mp4.asset.json';
import macroPosterAvif from '@/assets/join-macro-poster.avif.asset.json';
import macroPosterWebp from '@/assets/join-macro-poster.webp.asset.json';

import portfolioLoop from '@/assets/join-portfolio-loop.mp4.asset.json';
import portfolioPosterAvif from '@/assets/join-portfolio-poster.avif.asset.json';
import portfolioPosterWebp from '@/assets/join-portfolio-poster.webp.asset.json';

import quantLoop from '@/assets/join-quant-loop.mp4.asset.json';
import quantPosterAvif from '@/assets/join-quant-poster.avif.asset.json';
import quantPosterWebp from '@/assets/join-quant-poster.webp.asset.json';

export const heroMedia = {
  stillAvif: heroStillAvif.url,
  stillWebp: heroStillWebp.url,
  markUrl: markGlb.url,
  width: 1600,
  height: 900,
};

/** Intrinsic size of every division backdrop, for reserved space. */
export const ROW_MEDIA_WIDTH = 1600;
export const ROW_MEDIA_HEIGHT = 750;

export interface DivisionMedia {
  loop: string | null;
  posterAvif: string;
  posterWebp: string;
}

export const divisionMedia: Record<string, DivisionMedia> = {
  equity: { loop: equityLoop.url, posterAvif: equityPosterAvif.url, posterWebp: equityPosterWebp.url },
  investment: { loop: investmentLoop.url, posterAvif: investmentPosterAvif.url, posterWebp: investmentPosterWebp.url },
  macro: { loop: macroLoop.url, posterAvif: macroPosterAvif.url, posterWebp: macroPosterWebp.url },
  // Portfolio Management ships its poster only: the generated loop drifted
  // across the whole frame, which would have re-rendered the carved NYSE
  // lettering. Set `loop` to portfolioLoop.url once a clean loop exists.
  portfolio: { loop: null, posterAvif: portfolioPosterAvif.url, posterWebp: portfolioPosterWebp.url },
  quant: { loop: quantLoop.url, posterAvif: quantPosterAvif.url, posterWebp: quantPosterWebp.url },
};

export { portfolioLoop };
