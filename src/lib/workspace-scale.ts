import { useIsomorphicLayoutEffect } from '@/hooks/use-isomorphic-layout-effect';

// =====================================================================
// THE WORKSPACE AT 90%, ON A COMPUTER (Step 103).
// ---------------------------------------------------------------------
// On a computer the workspace is drawn as it looks after one press of
// Command + Minus in Chrome, Edge or Firefox: everything at 90%, the
// layout unchanged. The rest of the website keeps its own size.
//
// HOW. CSS `zoom` on the workspace frame (`.ws-flat.ws-scale` in
// index.css), not on the page: the browser's own zoom stays the reader's,
// and multiplies with this one as it always does. What the workspace opens
// outside its frame (menus, lists, tooltips, windows, side panels,
// notifications) is scaled by the same rules while `<html>` carries
// `data-ws-scale`, so a window is the size it would be with browser zoom.
//
// WHY NOT ON THE WHOLE PAGE. The menus and lists are placed by measuring
// their button, and the placing code knows nothing of `zoom`: with the
// whole page zoomed they opened 30 to 90 px away from it. With only the
// frame zoomed, they are placed in the unzoomed page from the button's
// real position on screen, and land exactly under it.
//
// ONLY WHERE THE BROWSER MEASURES THE STANDARD WAY. Chrome and Edge (from
// 128) and Firefox (from 126) report a zoomed element's size as it is
// drawn, and scale `vh` and `vw` inside it. Safari has long reported the
// size before zoom, which would put every menu in the wrong place. So the
// browser is asked once, with an invisible test box: if it does not answer
// the standard way, the workspace stays at 100%, exactly as before, and
// scales as soon as an updated browser answers correctly.
//
// ONLY ON A COMPUTER. The phone and tablet workspace (under 1024 px) keeps
// its size: its touch targets are 44 px (Step 98) and would fall below it.
// =====================================================================

/** The workspace's size on a computer, as a fraction of the website's. */
export const WORKSPACE_SCALE = 0.9;

let verdict: boolean | undefined;

/**
 * Does this browser report a zoomed element's size as drawn, and scale
 * `vh` inside it? Measured once, on an invisible box, and remembered.
 */
export function zoomMeasuresAsDrawn(): boolean {
  if (verdict !== undefined) return verdict;
  if (typeof document === 'undefined' || !document.body) return false;
  try {
    if (typeof CSS === 'undefined' || !CSS.supports('zoom', '0.5')) return (verdict = false);
    const outer = document.createElement('div');
    outer.setAttribute('aria-hidden', 'true');
    outer.style.cssText = 'position:absolute;left:-10000px;top:0;visibility:hidden;pointer-events:none;zoom:0.5';
    const inner = document.createElement('div');
    inner.style.cssText = 'width:100px;height:50vh';
    outer.appendChild(inner);
    document.body.appendChild(outer);
    const r = inner.getBoundingClientRect();
    outer.remove();
    const drawnWidth = Math.abs(r.width - 50) < 1;
    const scaledVh = Math.abs(r.height - window.innerHeight * 0.25) < 2;
    verdict = drawnWidth && scaledVh;
  } catch {
    verdict = false;
  }
  return verdict;
}

/** The scale the workspace is drawn at right now: 0.9, or 1. */
export function currentWorkspaceScale(): number {
  if (typeof document === 'undefined') return 1;
  return document.documentElement.hasAttribute('data-ws-scale') ? WORKSPACE_SCALE : 1;
}

/**
 * A drag offset measured on screen, as the CSS pixels that draw it inside
 * the scaled workspace. A drag library measures the pointer on screen,
 * and the row it moves is drawn at 90%: without this, a dragged row
 * travelled 90% as far as the pointer.
 */
export function unscaleTransform<T extends { x: number; y: number }>(t: T | null): T | null {
  const s = currentWorkspaceScale();
  if (!t || s === 1) return t;
  return { ...t, x: t.x / s, y: t.y / s };
}

/**
 * Scale the workspace when `enabled` (the computer layout) and the browser
 * measures the standard way. Returns whether it is scaled, for the frame's
 * class; `<html>` carries `data-ws-scale` for what opens outside the frame.
 * Both change in the same frame, before it is painted.
 */
export function useWorkspaceScale(enabled: boolean): boolean {
  // The test box is drawn once, the first time a computer layout asks.
  const scaled = enabled && zoomMeasuresAsDrawn();
  useIsomorphicLayoutEffect(() => {
    if (!scaled) return undefined;
    const root = document.documentElement;
    root.setAttribute('data-ws-scale', '');
    return () => root.removeAttribute('data-ws-scale');
  }, [scaled]);
  return scaled;
}
