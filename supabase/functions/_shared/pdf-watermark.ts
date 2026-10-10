import {
  PDFArray, PDFDict, PDFDocument, PDFFont, PDFName, PDFRef, StandardFonts, type PDFObject,
} from 'npm:pdf-lib@1.17.1';

// =====================================================================
// A copy of a PDF with the reader's name on every page.
// ---------------------------------------------------------------------
// Used for the greenbook in Career > Brainteasers: each download is the
// original file with a footer on every page ("Issued to ... Not for
// distribution") and a notice on the cover, so a copy that travels says
// whose it was.
//
// THE ORIGINAL IS NOT REWRITTEN. A PDF can be extended by an "incremental
// update": new versions of some objects appended after %%EOF, with their
// own cross-reference section pointing back at the previous one. Every
// reader applies it; the original bytes stay exactly as they were. This
// matters because the book is a 45 MB scan of 213 pages: re-saving it
// whole (pdf-lib's save()) costs about 210 MB of memory and a second of
// CPU, close to an edge function's limits, while the update is a few
// hundred kilobytes written after the untouched original, and the
// response streams the two parts one after the other.
//
// What is appended, per page:
//   * the page's own object again, with two content streams added
//     around its existing ones: "q" before them, and after them "Q"
//     followed by the watermark, so whatever state the page's drawing
//     leaves behind cannot move or hide the footer;
//   * the page's resources with one more font (Helvetica, a standard
//     font every reader has, so nothing is embedded).
// Pages of the same size share one watermark stream.
//
// pdf-lib is used only to READ the file (to find the pages, their boxes,
// resources and contents); nothing is drawn through it.
// =====================================================================

export interface WatermarkText {
  /** One line, printed at the foot of every page. */
  footer: string;
  /** A few lines, printed in a box near the foot of the first page. */
  cover?: string[];
}

export interface WatermarkResult {
  /** The original bytes, then the update: send them one after the other. */
  parts: Uint8Array[];
  length: number;
  pages: number;
}

const FONT_KEY = 'WMFont';
const enc = new TextEncoder();
const latin1 = (s: string) => Uint8Array.from(s, (c) => c.charCodeAt(0) & 0xff);

/** The offset of the last cross-reference section, from the file's tail. */
function lastStartXref(bytes: Uint8Array): number {
  const tail = new TextDecoder('latin1').decode(bytes.subarray(Math.max(0, bytes.length - 4096)));
  const at = tail.lastIndexOf('startxref');
  if (at < 0) throw new Error('This PDF has no cross-reference section.');
  const m = /startxref\s+(\d+)/.exec(tail.slice(at));
  if (!m) throw new Error('This PDF has an unreadable cross-reference offset.');
  return Number(m[1]);
}

/** Whether the section at `offset` is a classic "xref" table (else a stream), and its /Size. */
function sectionAt(bytes: Uint8Array, offset: number): { classic: boolean; size: number } {
  const head = new TextDecoder('latin1').decode(bytes.subarray(offset, Math.min(bytes.length, offset + 65536)));
  const classic = /^\s*xref/.test(head);
  // /Size sits in the trailer after the table, or in the stream's own dict.
  let size = 0;
  const from = classic ? head.indexOf('trailer') : 0;
  if (from >= 0) {
    const m = /\/Size\s+(\d+)/.exec(head.slice(from));
    if (m) size = Number(m[1]);
  }
  return { classic, size };
}

function serialize(obj: PDFObject): Uint8Array {
  const buf = new Uint8Array(obj.sizeInBytes());
  obj.copyBytesInto(buf, 0);
  return buf;
}

/** WinAnsi-safe text: what Helvetica cannot draw is folded to plain letters, or replaced. */
// The standard Helvetica of a PDF writes Western European text (WinAnsi):
// accents such as è, ü, ñ, ç print as they are. Other letters are written
// the way their owners write them in Latin letters: Ł as L, Ελένη as Eleni,
// Иван as Ivan. What has no Latin form (Chinese, an emoji) is left out
// rather than printed as "?"; a name left with no letters at all is
// replaced by its owner's email (see career-brainteasers).
const WINANSI_EXTRA = '€‚ƒ„…†‡ˆ‰Š‹ŒŽ‘’“”•–\u2014˜™š›œžŸ';
const inWinAnsi = (ch: string) => {
  const c = ch.codePointAt(0)!;
  return (c >= 0x20 && c <= 0x7e) || (c >= 0xa0 && c <= 0xff) || WINANSI_EXTRA.includes(ch);
};
const LATIN: Record<string, string> = {
  'Ł': 'L', 'ł': 'l', 'Đ': 'D', 'đ': 'd', 'Ħ': 'H', 'ħ': 'h', 'ı': 'i', 'Ŋ': 'N', 'ŋ': 'n', 'Ŧ': 'T', 'ŧ': 't', 'ſ': 's', 'ĸ': 'k',
  // Greek
  'Α': 'A', 'Β': 'V', 'Γ': 'G', 'Δ': 'D', 'Ε': 'E', 'Ζ': 'Z', 'Η': 'I', 'Θ': 'Th', 'Ι': 'I', 'Κ': 'K', 'Λ': 'L', 'Μ': 'M',
  'Ν': 'N', 'Ξ': 'X', 'Ο': 'O', 'Π': 'P', 'Ρ': 'R', 'Σ': 'S', 'Τ': 'T', 'Υ': 'Y', 'Φ': 'F', 'Χ': 'Ch', 'Ψ': 'Ps', 'Ω': 'O',
  'α': 'a', 'β': 'v', 'γ': 'g', 'δ': 'd', 'ε': 'e', 'ζ': 'z', 'η': 'i', 'θ': 'th', 'ι': 'i', 'κ': 'k', 'λ': 'l', 'μ': 'm',
  'ν': 'n', 'ξ': 'x', 'ο': 'o', 'π': 'p', 'ρ': 'r', 'σ': 's', 'ς': 's', 'τ': 't', 'υ': 'y', 'φ': 'f', 'χ': 'ch', 'ψ': 'ps', 'ω': 'o',
  // Cyrillic
  'А': 'A', 'Б': 'B', 'В': 'V', 'Г': 'G', 'Ґ': 'G', 'Д': 'D', 'Е': 'E', 'Ё': 'Yo', 'Є': 'Ye', 'Ж': 'Zh', 'З': 'Z', 'И': 'I',
  'І': 'I', 'Ї': 'Yi', 'Й': 'Y', 'К': 'K', 'Л': 'L', 'М': 'M', 'Н': 'N', 'О': 'O', 'П': 'P', 'Р': 'R', 'С': 'S', 'Т': 'T',
  'У': 'U', 'Ф': 'F', 'Х': 'Kh', 'Ц': 'Ts', 'Ч': 'Ch', 'Ш': 'Sh', 'Щ': 'Shch', 'Ъ': '', 'Ы': 'Y', 'Ь': '', 'Э': 'E', 'Ю': 'Yu', 'Я': 'Ya',
  'а': 'a', 'б': 'b', 'в': 'v', 'г': 'g', 'ґ': 'g', 'д': 'd', 'е': 'e', 'ё': 'yo', 'є': 'ye', 'ж': 'zh', 'з': 'z', 'и': 'i',
  'і': 'i', 'ї': 'yi', 'й': 'y', 'к': 'k', 'л': 'l', 'м': 'm', 'н': 'n', 'о': 'o', 'п': 'p', 'р': 'r', 'с': 's', 'т': 't',
  'у': 'u', 'ф': 'f', 'х': 'kh', 'ц': 'ts', 'ч': 'ch', 'ш': 'sh', 'щ': 'shch', 'ъ': '', 'ы': 'y', 'ь': '', 'э': 'e', 'ю': 'yu', 'я': 'ya',
};

/** The text as the PDF's standard font can print it (see above). */
export function printable(s: string): string {
  let out = '';
  // Greek "ου" is written "ou" (Papadopoulou), not letter by letter.
  const text = s.normalize('NFC').replace(/[οΟ][υΥύ]/g, (m) => (m[0] === 'Ο' ? 'O' : 'o') + (m[1] === 'Υ' ? 'U' : 'u'));
  for (const ch of text) {
    if (inWinAnsi(ch)) { out += ch; continue; }
    if (ch in LATIN) { out += LATIN[ch]; continue; }
    const base = ch.normalize('NFKD').replace(/[̀-ͯ]/g, '');
    if (base && [...base].every(inWinAnsi)) { out += base; continue; }
    if (base in LATIN) { out += LATIN[base]; continue; }
    // No Latin form: left out.
  }
  return out.replace(/\s+/g, ' ').replace(/\(\s+/g, '(').replace(/\s+\)/g, ')');
}

function safeText(font: PDFFont, s: string): string {
  const fits = (ch: string) => { try { font.encodeText(ch); return true; } catch { return false; } };
  return [...printable(s)].filter(fits).join('');
}

/** Can this file be watermarked? Throws, with a sentence, if not. */
export async function inspectPdf(bytes: Uint8Array): Promise<{ pages: number }> {
  if (bytes.length < 8 || new TextDecoder('latin1').decode(bytes.subarray(0, 1024)).indexOf('%PDF-') < 0) {
    throw new Error('This file is not a PDF.');
  }
  lastStartXref(bytes);
  const doc = await PDFDocument.load(bytes, { updateMetadata: false, ignoreEncryption: true });
  if (doc.isEncrypted) throw new Error('This PDF is password-protected or encrypted. Upload an unprotected copy.');
  const pages = doc.getPageCount();
  if (!pages) throw new Error('This PDF has no pages.');
  return { pages };
}

export async function watermarkPdf(original: Uint8Array, text: WatermarkText): Promise<WatermarkResult> {
  const prevXref = lastStartXref(original);
  const prev = sectionAt(original, prevXref);
  const doc = await PDFDocument.load(original, { updateMetadata: false, ignoreEncryption: true });
  if (doc.isEncrypted) throw new Error('This PDF is encrypted.');
  const context = doc.context;
  const { Root, Info, ID } = context.trailerInfo;
  if (!(Root instanceof PDFRef)) throw new Error('This PDF has no document catalogue.');

  // Measuring only: the font object written below is our own dictionary,
  // under the number pdf-lib reserved for it.
  const font = await doc.embedFont(StandardFonts.Helvetica);
  let nextNumber = Math.max(context.largestObjectNumber + 1, prev.size);
  const newRef = () => PDFRef.of(nextNumber++, 0);

  const objects: { ref: PDFRef; bytes: Uint8Array }[] = [];
  const fontRef = newRef();
  objects.push({ ref: fontRef, bytes: enc.encode('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>') });

  const stream = (body: string) => {
    const content = latin1(body);
    const head = enc.encode(`<< /Length ${content.length} >>\nstream\n`);
    const foot = enc.encode('\nendstream');
    const out = new Uint8Array(head.length + content.length + foot.length);
    out.set(head, 0); out.set(content, head.length); out.set(foot, head.length + content.length);
    return out;
  };

  const openRef = newRef();
  objects.push({ ref: openRef, bytes: stream('q') });

  const footer = safeText(font, text.footer);
  const cover = (text.cover ?? []).map((l) => safeText(font, l)).filter(Boolean);
  const hex = (s: string) => font.encodeText(s).toString();
  const n = (v: number) => (Math.round(v * 100) / 100).toString();

  // One watermark stream per distinct page box (and one for the cover).
  const streams = new Map<string, PDFRef>();
  const watermarkFor = (x: number, y: number, w: number, first: boolean): PDFRef => {
    const key = `${x}|${y}|${w}|${first ? 1 : 0}`;
    const have = streams.get(key);
    if (have) return have;
    let size = 6.5;
    const width = font.widthOfTextAtSize(footer, size);
    if (width > w - 24) size = Math.max(3.5, size * (w - 24) / width);
    const tw = font.widthOfTextAtSize(footer, size);
    const tx = x + Math.max(6, (w - tw) / 2);
    const ty = y + 6;
    let body = 'Q\nq\n'
      // A white band under the line, so it reads over a scanned page.
      + `1 1 1 rg ${n(tx - 4)} ${n(ty - 2.5)} ${n(tw + 8)} ${n(size + 4)} re f\n`
      + `BT /${FONT_KEY} ${n(size)} Tf 0.3 0.3 0.3 rg 1 0 0 1 ${n(tx)} ${n(ty)} Tm ${hex(footer)} Tj ET\n`;
    if (first && cover.length) {
      const cs = 8;
      const lead = cs * 1.45;
      const widest = Math.max(...cover.map((l) => font.widthOfTextAtSize(l, cs)));
      const scale = widest > w - 48 ? (w - 48) / widest : 1;
      const size2 = cs * scale;
      const boxW = Math.min(w - 32, widest * scale + 20);
      const boxH = cover.length * lead * scale + 12;
      const bx = x + (w - boxW) / 2;
      const by = ty + size + 10;
      body += `1 1 1 rg 0.12 0.06 0.3 RG 0.8 w ${n(bx)} ${n(by)} ${n(boxW)} ${n(boxH)} re B\n`;
      cover.forEach((line, i) => {
        const lw = font.widthOfTextAtSize(line, size2);
        const lx = bx + (boxW - lw) / 2;
        const ly = by + boxH - 6 - (i + 1) * lead * scale + (lead * scale - size2) / 2;
        body += `BT /${FONT_KEY} ${n(size2)} Tf 0.12 0.06 0.3 rg 1 0 0 1 ${n(lx)} ${n(ly)} Tm ${hex(line)} Tj ET\n`;
      });
    }
    body += 'Q';
    const ref = newRef();
    objects.push({ ref, bytes: stream(body) });
    streams.set(key, ref);
    return ref;
  };

  const pages = doc.getPages();
  pages.forEach((page, index) => {
    const node = page.node;
    const box = page.getCropBox();
    const wm = watermarkFor(box.x, box.y, box.width, index === 0);

    const dict = context.obj({}) as PDFDict;
    for (const [k, v] of node.entries()) dict.set(k, v);

    // Contents: q, the page's own streams, then Q and the watermark.
    const own: PDFObject[] = [];
    const contents = node.get(PDFName.of('Contents'));
    if (contents instanceof PDFArray) own.push(...contents.asArray());
    else if (contents instanceof PDFRef) {
      const target = context.lookup(contents);
      if (target instanceof PDFArray) own.push(...target.asArray());
      else own.push(contents);
    }
    dict.set(PDFName.of('Contents'), context.obj([openRef, ...own, wm]));

    // Resources: the page's own (or inherited) ones, plus the font.
    const resources = context.obj({}) as PDFDict;
    const had = node.Resources();
    if (had) for (const [k, v] of had.entries()) resources.set(k, v);
    const fonts = context.obj({}) as PDFDict;
    const hadFonts = had ? had.lookupMaybe(PDFName.of('Font'), PDFDict) : undefined;
    if (hadFonts) for (const [k, v] of hadFonts.entries()) fonts.set(k, v);
    fonts.set(PDFName.of(FONT_KEY), fontRef);
    resources.set(PDFName.of('Font'), fonts);
    dict.set(PDFName.of('Resources'), resources);

    objects.push({ ref: page.ref, bytes: serialize(dict) });
  });

  // ── The update ─────────────────────────────────────────────────────
  const chunks: Uint8Array[] = [];
  let offset = original.length;
  const push = (b: Uint8Array) => { chunks.push(b); offset += b.length; };
  const lastByte = original[original.length - 1];
  if (lastByte !== 0x0a && lastByte !== 0x0d) push(enc.encode('\n'));

  const at = new Map<number, { offset: number; gen: number }>();
  for (const o of objects) {
    at.set(o.ref.objectNumber, { offset, gen: o.ref.generationNumber });
    push(enc.encode(`${o.ref.objectNumber} ${o.ref.generationNumber} obj\n`));
    push(o.bytes);
    push(enc.encode('\nendobj\n'));
  }

  const trailerBits = `/Root ${Root.toString()}`
    + (Info ? ` /Info ${Info.toString()}` : '')
    + (ID ? ` /ID ${ID.toString()}` : '')
    + ` /Prev ${prevXref}`;

  if (prev.classic) {
    const size = nextNumber;
    const nums = [...at.keys()].sort((a, b) => a - b);
    let table = 'xref\n';
    for (let i = 0; i < nums.length;) {
      let j = i;
      while (j + 1 < nums.length && nums[j + 1] === nums[j] + 1) j++;
      table += `${nums[i]} ${j - i + 1}\n`;
      for (let k = i; k <= j; k++) {
        const e = at.get(nums[k])!;
        table += `${String(e.offset).padStart(10, '0')} ${String(e.gen).padStart(5, '0')} n \n`;
      }
      i = j + 1;
    }
    const xrefAt = offset;
    push(enc.encode(`${table}trailer\n<< /Size ${size} ${trailerBits} >>\nstartxref\n${xrefAt}\n%%EOF\n`));
  } else {
    // The previous section is a cross-reference STREAM: so is this one.
    const xrefRef = newRef();
    const xrefAt = offset;
    at.set(xrefRef.objectNumber, { offset: xrefAt, gen: 0 });
    const nums = [...at.keys()].sort((a, b) => a - b);
    const rows = new Uint8Array(nums.length * 7);
    nums.forEach((num, i) => {
      const e = at.get(num)!;
      rows[i * 7] = 1;
      rows[i * 7 + 1] = (e.offset >>> 24) & 0xff; rows[i * 7 + 2] = (e.offset >>> 16) & 0xff;
      rows[i * 7 + 3] = (e.offset >>> 8) & 0xff; rows[i * 7 + 4] = e.offset & 0xff;
      rows[i * 7 + 5] = (e.gen >>> 8) & 0xff; rows[i * 7 + 6] = e.gen & 0xff;
    });
    const index = nums.map((num) => `${num} 1`).join(' ');
    push(enc.encode(`${xrefRef.objectNumber} 0 obj\n<< /Type /XRef /Size ${nextNumber} /W [1 4 2] /Index [${index}] ${trailerBits} /Length ${rows.length} >>\nstream\n`));
    push(rows);
    push(enc.encode(`\nendstream\nendobj\nstartxref\n${xrefAt}\n%%EOF\n`));
  }

  const update = new Uint8Array(chunks.reduce((a, c) => a + c.length, 0));
  let p = 0;
  for (const c of chunks) { update.set(c, p); p += c.length; }
  return { parts: [original, update], length: original.length + update.length, pages: pages.length };
}
