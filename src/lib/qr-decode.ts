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
type JsQR = (data: Uint8ClampedArray, w: number, h: number, opts?: { inversionAttempts?: 'dontInvert' | 'onlyInvert' | 'attemptBoth' | 'invertFirst' }) => { data: string } | null;

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
    const found = jsQR(ctx.getImageData(0, 0, w, h).data, w, h, { inversionAttempts: invert ? 'attemptBoth' : 'dontInvert' });
    return found?.data || null;
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
