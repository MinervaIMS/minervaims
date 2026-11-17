// =====================================================================
// Reading a QR code from the camera or from a photo.
// ---------------------------------------------------------------------
// The browser's own reader (BarcodeDetector: Chrome on Android, and
// others as they add it) is used where it exists, because it is fast and
// reads a code at an angle or in poor light. Everywhere else, iPhones
// included, jsQR does the same job in the page; it is loaded only when the
// scanner opens.
// =====================================================================

type Detector = { detect: (src: CanvasImageSource) => Promise<{ rawValue: string }[]> };
type DetectorCtor = { new (opts: { formats: string[] }): Detector; getSupportedFormats?: () => Promise<string[]> };
export type JsQR = (data: Uint8ClampedArray, w: number, h: number, opts?: { inversionAttempts?: 'dontInvert' | 'onlyInvert' | 'attemptBoth' | 'invertFirst' }) => { data: string } | null;

export interface QrReader {
  /** The text of a QR code in the image, or null. */
  read: (src: HTMLVideoElement | HTMLImageElement | HTMLCanvasElement, width: number, height: number) => Promise<string | null>;
}

async function nativeDetector(): Promise<Detector | null> {
  const Ctor = (globalThis as unknown as { BarcodeDetector?: DetectorCtor }).BarcodeDetector;
  if (!Ctor) return null;
  try {
    const formats = (await Ctor.getSupportedFormats?.()) ?? ['qr_code'];
    return formats.includes('qr_code') ? new Ctor({ formats: ['qr_code'] }) : null;
  } catch {
    return null;
  }
}

// =====================================================================
// A LIGHT SMOOTHING BEFORE jsQR (Step 106C).
// ---------------------------------------------------------------------
// jsQR decides black or white in small blocks of the image; the grain of
// a phone camera in a dim room turns the white of a ticket into speckle,
// and it then missed the code and spent a third of a second (on a
// computer; well over a second on a phone) failing, frame after frame.
// A 3 x 3 weighted average ([1 2 1] each way) removes the grain and keeps
// the modules of a code held at arm's length. Measured on tickets drawn as
// the emails draw them: everything read before still reads, the dim and
// grainy cases read too, and a frame with no code fails in about 30 ms
// instead of about 400. The browser's own reader (Android) is untouched.
//
// A CODE FAR FROM THE CAMERA keeps modules of barely two pixels, which the
// smoothing would blur away. So when the smoothed frame holds no code and
// the picture is clean (little grain), the frame is read once more as it
// is: on a clean picture that second reading is quick, and it is skipped
// exactly where it would stall the phone. Every condition the reader
// managed before still reads (scripts/attendance-door.test.mjs).
// =====================================================================
let greyBuf: Float32Array | null = null;
let rowBuf: Float32Array | null = null;
let smoothBuf: Uint8ClampedArray | null = null;
/** The frame smoothed into a buffer of its own, and how grainy it was (share of pixels the smoothing moved by a few levels). */
function smoothed(px: Uint8ClampedArray, w: number, h: number): { data: Uint8ClampedArray; grain: number } {
  const n = w * h;
  if (!greyBuf || greyBuf.length < n) { greyBuf = new Float32Array(n); rowBuf = new Float32Array(n); }
  if (!smoothBuf || smoothBuf.length !== n * 4) smoothBuf = new Uint8ClampedArray(n * 4);
  const g = greyBuf, t = rowBuf!, out = smoothBuf;
  for (let i = 0, j = 0; i < n; i++, j += 4) g[i] = 0.299 * px[j] + 0.587 * px[j + 1] + 0.114 * px[j + 2];
  for (let y = 0; y < h; y++) {
    const r = y * w;
    for (let x = 0; x < w; x++) {
      const l = g[r + (x > 0 ? x - 1 : 0)], c = g[r + x], rt = g[r + (x < w - 1 ? x + 1 : x)];
      t[r + x] = (l + 2 * c + rt) * 0.25;
    }
  }
  let grainy = 0;
  for (let y = 0; y < h; y++) {
    const up = (y > 0 ? y - 1 : 0) * w, r = y * w, dn = (y < h - 1 ? y + 1 : y) * w;
    for (let x = 0; x < w; x++) {
      const v = (t[up + x] + 2 * t[r + x] + t[dn + x]) * 0.25;
      // Grain moves a pixel by a few levels; an edge of the code by far more.
      const d = Math.abs(g[r + x] - v);
      if (d > 3 && d < 30) grainy++;
      const j = (r + x) * 4;
      out[j] = v; out[j + 1] = v; out[j + 2] = v; out[j + 3] = 255;
    }
  }
  return { data: out, grain: grainy / n };
}
// Below this share of grainy pixels the picture counts as clean.
const CLEAN = 0.05;

/** Read a frame's pixels: smoothed first, then as it is when the picture is clean. Pure, for the tests. */
export function decodePixels(jsQR: JsQR, data: Uint8ClampedArray, w: number, h: number, invert = false): string | null {
  const opts = { inversionAttempts: invert ? 'attemptBoth' as const : 'dontInvert' as const };
  const smooth = smoothed(data, w, h);
  const found = jsQR(smooth.data, w, h, opts) ?? (smooth.grain < CLEAN ? jsQR(data, w, h, opts) : null);
  return found?.data || null;
}

export async function createQrReader(): Promise<QrReader> {
  const native = await nativeDetector();
  const jsQR = (await import('jsqr')).default as unknown as JsQR;
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d', { willReadFrequently: true });

  const withJsQr = (src: CanvasImageSource, width: number, height: number, invert: boolean): string | null => {
    if (!ctx || !width || !height) return null;
    // At most 800 pixels across for the camera: plenty for a code held up
    // to it, and fast enough to read several times a second on an older
    // phone. A photo is read once, larger, since the code may be small in it.
    const scale = Math.min(1, (invert ? 1600 : 800) / width);
    const w = Math.max(1, Math.round(width * scale));
    const h = Math.max(1, Math.round(height * scale));
    canvas.width = w; canvas.height = h;
    ctx.drawImage(src, 0, 0, w, h);
    return decodePixels(jsQR, ctx.getImageData(0, 0, w, h).data, w, h, invert);
  };

  return {
    read: async (src, width, height) => {
      if (native) {
        try {
          const codes = await native.detect(src);
          if (codes[0]?.rawValue) return codes[0].rawValue;
        } catch { /* fall through to jsQR */ }
      }
      // A still photo is read once, so it can afford both polarities.
      return withJsQr(src, width, height, src instanceof HTMLImageElement);
    },
  };
}

/** Reads the QR code in a photo taken with the phone's camera app. */
export async function readQrFromFile(file: File, reader: QrReader): Promise<string | null> {
  const url = URL.createObjectURL(file);
  try {
    const img = new Image();
    img.decoding = 'async';
    img.src = url;
    await img.decode().catch(() => new Promise<void>((res, rej) => { img.onload = () => res(); img.onerror = () => rej(new Error('unreadable')); }));
    return await reader.read(img, img.naturalWidth, img.naturalHeight);
  } finally {
    URL.revokeObjectURL(url);
  }
}
