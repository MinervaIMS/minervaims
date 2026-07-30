// =====================================================================
// input-zoom-guard — stop iOS magnifying the page when a field is focused.
// ---------------------------------------------------------------------
// Safari zooms into a focused control whenever it decides the text would
// be too small, and it never zooms back out, leaving the reader stranded
// on a magnified fragment. Sizing every control at 16px removes the usual
// trigger, but not all of them: date, time and month pickers, selects
// rendered by the system, and any field whose computed size is changed by
// a parent transform still pull the viewport in.
//
// The only complete cure is to tell the viewport it may not scale while a
// field has focus, and to give scaling straight back the moment focus
// leaves. Pinch zoom therefore stays available for reading the page,
// which is what the accessibility guidance actually asks for; it is only
// suspended during typing, when the browser would have hijacked it
// anyway.
//
// The guard is a no-op away from iOS: every other engine leaves the
// viewport alone on focus.
// =====================================================================

const SCALABLE = 'width=device-width, initial-scale=1.0, viewport-fit=cover';
const LOCKED = 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover';

const FIELD = 'input, textarea, select, [contenteditable="true"]';

function isIOS(): boolean {
  if (typeof navigator === 'undefined') return false;
  const ua = navigator.userAgent || '';
  if (/iPad|iPhone|iPod/.test(ua)) return true;
  return ua.includes('Macintosh') && navigator.maxTouchPoints > 1;
}

/** Controls that never trigger the zoom and must keep pinch available. */
function isTextEntry(el: Element | null): el is HTMLElement {
  if (!el || !(el instanceof HTMLElement)) return false;
  if (!el.matches(FIELD)) return false;
  if (el instanceof HTMLInputElement) {
    return !['checkbox', 'radio', 'range', 'button', 'submit', 'reset', 'file', 'color'].includes(el.type);
  }
  return true;
}

export function installInputZoomGuard(): void {
  if (typeof document === 'undefined' || !isIOS()) return;

  const meta = document.querySelector<HTMLMetaElement>('meta[name="viewport"]');
  if (!meta) return;

  let release: number | undefined;

  const lock = (event: FocusEvent) => {
    if (!isTextEntry(event.target as Element)) return;
    window.clearTimeout(release);
    if (meta.content !== LOCKED) meta.content = LOCKED;
  };

  const unlock = () => {
    // A blur followed immediately by a focus (moving between fields) must
    // not flicker the viewport, so the release waits a frame or two.
    window.clearTimeout(release);
    release = window.setTimeout(() => {
      if (isTextEntry(document.activeElement)) return;
      meta.content = SCALABLE;
    }, 120);
  };

  document.addEventListener('focusin', lock, true);
  document.addEventListener('focusout', unlock, true);
}
