// =====================================================================
// The camera, for the ticket scanner at the door.
// ---------------------------------------------------------------------
// ASKED FOR IN THE TAP ITSELF. `requestCamera` calls getUserMedia at once,
// synchronously, from inside the click handler of "Scan tickets" (and of
// "Try again"). Browsers tie the permission prompt to the tap that caused
// it: asked a moment later, from an effect after the scanner has drawn,
// iPhones in particular may refuse without ever showing the prompt. So the
// page asks first and the scanner receives the answer.
//
// When the answer is no, `CameraProblem` says which no it is, so the
// scanner can say what to do about it: allow the camera for the site, open
// the page in Safari or Chrome instead of an app's built-in browser, close
// another app using the camera, or take a photo of the ticket instead.
// =====================================================================

export type CameraProblemKind = 'denied' | 'in-app' | 'no-camera' | 'in-use' | 'insecure' | 'unsupported' | 'unknown';

export class CameraProblem extends Error {
  kind: CameraProblemKind;
  constructor(kind: CameraProblemKind, message?: string) {
    super(message ?? kind);
    this.kind = kind;
    this.name = 'CameraProblem';
  }
}

export type Platform = 'ios' | 'android' | 'desktop';

export function platform(): Platform {
  const ua = navigator.userAgent || '';
  // iPadOS reports itself as a Mac; a touch screen gives it away.
  if (/iPhone|iPad|iPod/.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1)) return 'ios';
  if (/Android/.test(ua)) return 'android';
  return 'desktop';
}

/** Browsers built into other apps (Instagram, LinkedIn, Facebook, Gmail's Google app): most do not share the camera. */
export function isInAppBrowser(): boolean {
  return /Instagram|FBAN|FBAV|FB_IAB|LinkedInApp|Line\/|GSA\/|Snapchat|TikTok|Twitter/i.test(navigator.userAgent || '');
}

/** Chrome, Firefox or Edge on an iPhone: the camera permission lives in the iPhone's Settings. */
export function isIosNonSafari(): boolean {
  return platform() === 'ios' && /CriOS|FxiOS|EdgiOS/.test(navigator.userAgent || '');
}

function classify(e: unknown): CameraProblem {
  if (e instanceof CameraProblem) return e;
  const name = e instanceof Error || (typeof e === 'object' && e && 'name' in e) ? String((e as { name: string }).name) : '';
  if (name === 'NotAllowedError' || name === 'PermissionDeniedError' || name === 'SecurityError') {
    return new CameraProblem(isInAppBrowser() ? 'in-app' : 'denied');
  }
  if (name === 'NotFoundError' || name === 'DevicesNotFoundError' || name === 'OverconstrainedError') return new CameraProblem('no-camera');
  if (name === 'NotReadableError' || name === 'TrackStartError' || name === 'AbortError') return new CameraProblem('in-use');
  return new CameraProblem('unknown', e instanceof Error ? e.message : undefined);
}

/**
 * The back camera, asked for NOW. Call it directly inside a click handler,
 * before any `await`, so the browser shows its permission prompt.
 */
export function requestCamera(): Promise<MediaStream> {
  if (typeof window === 'undefined') return Promise.reject(new CameraProblem('unsupported'));
  if (!window.isSecureContext) return Promise.reject(new CameraProblem('insecure'));
  const md = navigator.mediaDevices;
  if (!md || typeof md.getUserMedia !== 'function') {
    return Promise.reject(new CameraProblem(isInAppBrowser() ? 'in-app' : 'unsupported'));
  }
  const ask = md.getUserMedia({
    audio: false,
    video: { facingMode: { ideal: 'environment' }, width: { ideal: 1280 }, height: { ideal: 720 } },
  });
  return ask
    // A camera that cannot meet the preferred size is asked again, plainly.
    .catch((e) => (e && (e as { name?: string }).name === 'OverconstrainedError'
      ? md.getUserMedia({ audio: false, video: true })
      : Promise.reject(e)))
    .catch((e) => Promise.reject(classify(e)));
}

/** What the browser remembers about the camera for this site, where it says. */
export async function cameraPermissionState(): Promise<'granted' | 'denied' | 'prompt' | 'unknown'> {
  try {
    const status = await navigator.permissions?.query({ name: 'camera' as PermissionName });
    return status?.state ?? 'unknown';
  } catch {
    return 'unknown';
  }
}

export function stopStream(stream: MediaStream | null | undefined) {
  stream?.getTracks().forEach((t) => t.stop());
}
