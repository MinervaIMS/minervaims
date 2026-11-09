// =====================================================================
// A download's name, safe for the Content-Disposition header (Step 105).
// ---------------------------------------------------------------------
// A response header may only carry characters 0 to 255: a report titled
// "Dupire\u2019s Local Volatility Model" put its curly apostrophe (8217)
// into `filename="..."`, the runtime refused the header, and the function
// failed with a server error before sending a single byte of the PDF.
//
// So the plain `filename` is an ASCII rendering of the name (accents
// dropped, curly quotes straightened, anything else left out), and the
// exact name travels in `filename*` (RFC 5987), percent-encoded, which
// every current browser prefers. Relative imports only.
// =====================================================================

/** The name with only printable ASCII: what `filename="..."` may carry. */
export function asciiFileName(name: string): string {
  return String(name ?? '')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[\u2018\u2019\u201A\u201B\u2032]/g, "'")
    .replace(/[\u201C\u201D\u201E\u201F\u2033]/g, '')
    .replace(/[\u2010-\u2015\u2212]/g, '-')
    .replace(/\u2026/g, '...')
    .replace(/[^\x20-\x7E]/g, '')
    .replace(/["\\]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/** RFC 5987 percent-encoding, for `filename*`. */
export function encodeRfc5987(value: string): string {
  return encodeURIComponent(value)
    .replace(/['()*]/g, (c) => '%' + c.charCodeAt(0).toString(16).toUpperCase())
    .replace(/%(7C|60|5E)/g, (_, hex) => String.fromCharCode(parseInt(hex, 16)));
}

/**
 * The whole header value: `inline` or `attachment`, an ASCII `filename`
 * (with `fallback` when nothing of the name is ASCII) and the exact name
 * in `filename*`. Always a valid header value.
 */
export function contentDisposition(kind: 'inline' | 'attachment', name: string, fallback = 'download'): string {
  const exact = String(name ?? '').replace(/[\x00-\x1F\x7F]/g, '').trim() || fallback;
  const dot = exact.lastIndexOf('.');
  const ext = dot > 0 ? asciiFileName(exact.slice(dot)) : '';
  let ascii = asciiFileName(exact);
  if (!ascii || ascii === ext) ascii = `${fallback}${ext}`;
  return `${kind}; filename="${ascii}"; filename*=UTF-8''${encodeRfc5987(exact)}`;
}
