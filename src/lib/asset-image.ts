// =====================================================================
// PICTURES UPLOADED TO THE PROJECT, AT THE SIZE AND IN THE FORMAT THE
// BROWSER CAN USE (Step 102).
// ---------------------------------------------------------------------
// A picture added through Lovable is stored once and served from
// /__l5e/assets-v1/... (its `.asset.json` holds that address). The host
// resizes it when asked for a width (`?w=`) and, for a browser that says
// it accepts them, answers in AVIF or WebP at the same resolution: the
// division photographs, stored as 0.5 to 3 MB PNGs, come back at 16 to
// 250 kB, indistinguishable at their full 1920 px.
//
// Without a width the host returns the stored file untouched, which is
// why every picture drawn as a page background goes through here.
//
// Only addresses of that host are changed; anything else (a local file,
// another site) is returned as it was, so a call can never break a picture.
// =====================================================================

const HOSTED = /^\/__l5e\/assets-v1\//;

/**
 * The loading mark (65 x 48 on screen) at three times that width, enough for
 * the sharpest phone screen. index.html preloads the same `?w=196` address,
 * so the mark it shows first and the one the loaders draw are one download
 * (scripts/page-speed.test.mjs).
 */
export const LOADER_LOGO_WIDTH = 196;

/** The picture at `width` pixels wide (never larger than the original). */
export function sizedAsset(url: string, width: number): string {
  if (!url || !HOSTED.test(url)) return url;
  const [path] = url.split('?');
  return `${path}?w=${Math.round(width)}`;
}

/** A `srcset` of the picture at each of `widths`. */
export function assetSrcSet(url: string, widths: number[]): string | undefined {
  if (!url || !HOSTED.test(url)) return undefined;
  return widths.map((w) => `${sizedAsset(url, w)} ${Math.round(w)}w`).join(', ');
}
