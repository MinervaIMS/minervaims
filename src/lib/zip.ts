// =====================================================================
// zip — build a .zip in the browser, with no dependency.
// ---------------------------------------------------------------------
// WHY BY HAND. The one thing the workspace needs a zip for is handing a
// reviewer thirty PDFs at once. PDFs are already compressed, so deflating
// them again buys a percent or two for a great deal of work, and every
// library that would do it is between 30 and 100kB in a bundle that
// members download to look at a Dashboard. Storing the entries verbatim
// is the whole of what is required, and it is about a hundred lines.
//
// The format written here is the original PKZIP one: a local header per
// file, the file's bytes, then a central directory and an end record. No
// compression (method 0), no encryption, no ZIP64. Every operating system
// in use opens it by double-clicking, including Windows Explorer and the
// macOS Archive Utility.
//
// LIMITS, STATED. Store-only means the archive is the sum of its files,
// so a hundred 2MB CVs is a 200MB download built in memory; the caller is
// expected to be handing over a filtered set, which is what the screening
// page does. Individual entries and the total must stay under 4GB, which
// is the ZIP64 boundary and is not a limit this workspace can reach.
// Names are written as UTF-8 with the language-encoding flag set, so
// accented surnames survive on every extractor that has existed since
// about 2007.
// =====================================================================

/** One file in the archive. `name` may contain `/` to make folders. */
export interface ZipEntry {
  name: string;
  data: Uint8Array;
}

// --- CRC-32 (IEEE 802.3), the one checksum the format requires --------
const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();

function crc32(bytes: Uint8Array): number {
  let c = 0xFFFFFFFF;
  for (let i = 0; i < bytes.length; i++) c = CRC_TABLE[(c ^ bytes[i]) & 0xFF] ^ (c >>> 8);
  return (c ^ 0xFFFFFFFF) >>> 0;
}

/**
 * A name a zip and every file system will accept.
 *
 * Path separators are kept, because they are how folders are made; the
 * characters Windows refuses in a file name are not. A leading slash or a
 * `..` segment would let a crafted name escape the extraction directory,
 * so both are removed rather than trusted.
 */
export function safeZipName(name: string): string {
  return name
    .split('/')
    .map((part) => part.replace(/[\\:*?"<>|]+/g, ' ').replace(/\s+/g, ' ').trim())
    .filter((part) => part.length > 0 && part !== '.' && part !== '..')
    .join('/') || 'file';
}

/** MS-DOS date and time, which is what the format stores. */
function dosDateTime(d: Date): { date: number; time: number } {
  return {
    date: (((d.getFullYear() - 1980) & 0x7F) << 9) | ((d.getMonth() + 1) << 5) | d.getDate(),
    // Two-second resolution: the format has five bits for seconds.
    time: (d.getHours() << 11) | (d.getMinutes() << 5) | (d.getSeconds() >> 1),
  };
}

/**
 * Build the archive.
 *
 * Returns a Blob ready to hand to `downloadAs`. Duplicate names are made
 * unique rather than silently overwriting one another, because a zip with
 * two identical entries is a zip that loses a file on extraction.
 */
export function createZip(entries: ZipEntry[], at: Date = new Date()): Blob {
  const { date, time } = dosDateTime(at);
  const encoder = new TextEncoder();
  const seen = new Set<string>();

  const locals: Uint8Array[] = [];
  const centrals: Uint8Array[] = [];
  let offset = 0;

  for (const entry of entries) {
    let name = safeZipName(entry.name);
    if (seen.has(name)) {
      const dot = name.lastIndexOf('.');
      const stem = dot > 0 ? name.slice(0, dot) : name;
      const ext = dot > 0 ? name.slice(dot) : '';
      let n = 2;
      while (seen.has(`${stem} (${n})${ext}`)) n++;
      name = `${stem} (${n})${ext}`;
    }
    seen.add(name);

    const nameBytes = encoder.encode(name);
    const data = entry.data;
    const crc = crc32(data);

    // Local file header: 30 bytes, then the name, then the data.
    const local = new Uint8Array(30 + nameBytes.length);
    const lv = new DataView(local.buffer);
    lv.setUint32(0, 0x04034b50, true);   // signature
    lv.setUint16(4, 20, true);           // version needed
    lv.setUint16(6, 0x0800, true);       // flags: UTF-8 names
    lv.setUint16(8, 0, true);            // method 0 = stored
    lv.setUint16(10, time, true);
    lv.setUint16(12, date, true);
    lv.setUint32(14, crc, true);
    lv.setUint32(18, data.length, true); // compressed size
    lv.setUint32(22, data.length, true); // uncompressed size
    lv.setUint16(26, nameBytes.length, true);
    lv.setUint16(28, 0, true);           // no extra field
    local.set(nameBytes, 30);
    locals.push(local, data);

    // Central directory entry: 46 bytes, then the name.
    const central = new Uint8Array(46 + nameBytes.length);
    const cv = new DataView(central.buffer);
    cv.setUint32(0, 0x02014b50, true);
    cv.setUint16(4, 20, true);           // version made by
    cv.setUint16(6, 20, true);           // version needed
    cv.setUint16(8, 0x0800, true);
    cv.setUint16(10, 0, true);
    cv.setUint16(12, time, true);
    cv.setUint16(14, date, true);
    cv.setUint32(16, crc, true);
    cv.setUint32(20, data.length, true);
    cv.setUint32(24, data.length, true);
    cv.setUint16(28, nameBytes.length, true);
    cv.setUint16(30, 0, true);           // extra length
    cv.setUint16(32, 0, true);           // comment length
    cv.setUint16(34, 0, true);           // disk number
    cv.setUint16(36, 0, true);           // internal attributes
    cv.setUint32(38, 0, true);           // external attributes
    cv.setUint32(42, offset, true);      // where the local header is
    central.set(nameBytes, 46);
    centrals.push(central);

    offset += local.length + data.length;
  }

  const centralSize = centrals.reduce((n, c) => n + c.length, 0);
  const end = new Uint8Array(22);
  const ev = new DataView(end.buffer);
  ev.setUint32(0, 0x06054b50, true);
  ev.setUint16(4, 0, true);              // this disk
  ev.setUint16(6, 0, true);              // disk with the central directory
  ev.setUint16(8, centrals.length, true);
  ev.setUint16(10, centrals.length, true);
  ev.setUint32(12, centralSize, true);
  ev.setUint32(16, offset, true);
  ev.setUint16(20, 0, true);             // no archive comment

  return new Blob([...locals, ...centrals, end] as BlobPart[], { type: 'application/zip' });
}

/**
 * Fetch a list of URLs and pack them into one archive.
 *
 * Sequential on purpose: these are signed storage URLs and the caller may
 * be asking for fifty of them, which in parallel is fifty simultaneous
 * downloads competing with the workspace itself. `onProgress` is called
 * after each file so the button can say where it has got to.
 *
 * A file that cannot be fetched is REPORTED, NOT SILENTLY DROPPED. An
 * archive that is quietly missing three CVs is worse than one that says
 * which three, because nobody would ever notice.
 */
export async function zipFromUrls(
  files: { name: string; url: string }[],
  onProgress?: (done: number, total: number) => void,
): Promise<{ blob: Blob; failed: string[] }> {
  const entries: ZipEntry[] = [];
  const failed: string[] = [];
  for (let i = 0; i < files.length; i++) {
    const f = files[i];
    try {
      const res = await fetch(f.url, { credentials: 'omit' });
      if (!res.ok) throw new Error(String(res.status));
      entries.push({ name: f.name, data: new Uint8Array(await res.arrayBuffer()) });
    } catch {
      failed.push(f.name);
    }
    onProgress?.(i + 1, files.length);
  }
  return { blob: createZip(entries), failed };
}
