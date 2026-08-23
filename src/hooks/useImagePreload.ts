import { useState, useEffect } from 'react';

/**
 * True once every image in the list has loaded, failed, or run out of time.
 *
 * A FAILED IMAGE HAS NEVER BLOCKED THIS, and a SLOW ONE NO LONGER CAN.
 * `onerror` already counted towards completion, so a missing asset resolved
 * immediately. A request that simply never answers - a stalled connection, a
 * captive portal, a CDN having a bad minute - fired neither handler, so the
 * caller waited for ever. Now that pages gate their first paint on this, that
 * would strand the reader on a loader, so the whole list gives up together
 * after `timeoutMs` and the page renders with whatever arrived.
 *
 * The cap is a backstop, not a budget: on any ordinary connection every image
 * is decoded long before it, and it never delays anything, because it only
 * ever ends a wait early.
 */
export function useImagePreload(imageSrcs: string[], timeoutMs = 5000): boolean {
  const [imagesLoaded, setImagesLoaded] = useState(false);

  useEffect(() => {
    if (imageSrcs.length === 0) {
      setImagesLoaded(true);
      return;
    }

    let active = true;
    let loadedCount = 0;
    const totalImages = imageSrcs.length;

    const finish = () => {
      if (!active) return;
      active = false;
      window.clearTimeout(cap);
      setImagesLoaded(true);
    };

    const checkAllLoaded = () => {
      loadedCount += 1;
      if (loadedCount >= totalImages) finish();
    };

    const cap = window.setTimeout(finish, timeoutMs);

    imageSrcs.forEach((src) => {
      const img = new Image();
      img.onload = checkAllLoaded;
      img.onerror = checkAllLoaded; // Don't block on errors
      img.src = src;
    });

    return () => {
      active = false;
      window.clearTimeout(cap);
    };
    // The list is compared by value: a new array of the same URLs is the
    // same request and must not restart the wait.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [imageSrcs.join(','), timeoutMs]);

  return imagesLoaded;
}
