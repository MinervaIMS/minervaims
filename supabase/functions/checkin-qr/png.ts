// The encoder only (no file system, no image output of its own).
import QRCode from 'npm:qrcode@1.5.4/lib/core/qrcode.js';

// =====================================================================
// A QR code as a PNG, for email: most mail apps show no SVG, so the
// ticket has to be a bitmap. Two colours (white and the Society's purple),
// eight pixels a module and the standard four-module quiet zone, which
// is what a phone camera at a door reads best.
// =====================================================================

const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();

function crc32(bytes: Uint8Array): number {
  let c = 0xffffffff;
  for (let i = 0; i < bytes.length; i++) c = CRC_TABLE[(c ^ bytes[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type: string, data: Uint8Array): Uint8Array {
  const out = new Uint8Array(12 + data.length);
  const view = new DataView(out.buffer);
  view.setUint32(0, data.length);
  for (let i = 0; i < 4; i++) out[4 + i] = type.charCodeAt(i);
  out.set(data, 8);
  view.setUint32(8 + data.length, crc32(out.subarray(4, 8 + data.length)));
  return out;
}

async function zlib(data: Uint8Array): Promise<Uint8Array> {
  const stream = new Blob([data]).stream().pipeThrough(new CompressionStream('deflate'));
  return new Uint8Array(await new Response(stream).arrayBuffer());
}

export async function qrPng(text: string, scale = 8, margin = 4): Promise<Uint8Array> {
  const qr = QRCode.create(text, { errorCorrectionLevel: 'M' });
  const n: number = qr.modules.size;
  const size = (n + margin * 2) * scale;
  const raw = new Uint8Array(size * (size + 1));
  for (let y = 0; y < size; y++) {
    const row = y * (size + 1);
    raw[row] = 0; // no filter
    const my = Math.floor(y / scale) - margin;
    for (let x = 0; x < size; x++) {
      const mx = Math.floor(x / scale) - margin;
      const dark = my >= 0 && my < n && mx >= 0 && mx < n && qr.modules.get(my, mx);
      raw[row + 1 + x] = dark ? 1 : 0;
    }
  }
  const ihdr = new Uint8Array(13);
  const v = new DataView(ihdr.buffer);
  v.setUint32(0, size); v.setUint32(4, size);
  ihdr[8] = 8; ihdr[9] = 3; ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0; // 8-bit, palette
  const plte = new Uint8Array([0xff, 0xff, 0xff, 0x1f, 0x0f, 0x4d]);
  const parts = [
    new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr), chunk('PLTE', plte), chunk('IDAT', await zlib(raw)), chunk('IEND', new Uint8Array(0)),
  ];
  const out = new Uint8Array(parts.reduce((s, p) => s + p.length, 0));
  let o = 0;
  for (const p of parts) { out.set(p, o); o += p.length; }
  return out;
}
