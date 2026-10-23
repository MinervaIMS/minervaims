import { PDFDict, PDFDocument, PDFHexString, PDFName, PDFRef, PDFString } from 'npm:pdf-lib@1.17.1';
import { lastStartXref, sectionAt, serialize } from './pdf-watermark.ts';
import type { PdfMetadata } from './report-meta.ts';

// =====================================================================
// A report's own metadata, written into its PDF.
// ---------------------------------------------------------------------
// A search engine or an assistant that opens a report's PDF reads its
// Title, Author, Subject and Keywords before any of its pages. Most of
// the archive's files say "PowerPoint Presentation" or nothing at all.
// This writes what the report page says (see report-meta.ts) into both
// places a reader looks: the document information dictionary (/Info) and
// the XMP metadata stream of the catalogue, which newer readers prefer.
//
// THE ORIGINAL IS NOT REWRITTEN, the same way as the greenbook watermark
// (pdf-watermark.ts): the new /Info, a new XMP stream and the catalogue
// pointing at it are appended after %%EOF as an incremental update, with
// a cross-reference section of the same kind as the file's last one. The
// pages, fonts and images are the original bytes. Rewriting the metadata
// again starts from the original once more (the caller keeps it), so a
// file never carries more than one update of ours.
//
// pdf-lib only READS the file; nothing is saved through it.
// =====================================================================

const enc = new TextEncoder();
const xml = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/** "D:20200626120000+02'00'" (or a part of it) as an ISO date, or null. */
function pdfDateToIso(v: string | undefined): string | null {
  const m = /^D?:?(\d{4})(\d{2})?(\d{2})?(\d{2})?(\d{2})?(\d{2})?([Zz+-])?(\d{2})?'?(\d{2})?/.exec(v ?? '');
  if (!m) return null;
  const [, y, mo = '01', d = '01', h = '00', mi = '00', s = '00', tz, th, tm] = m;
  const zone = !tz || tz === 'Z' || tz === 'z' ? 'Z' : `${tz}${th ?? '00'}:${tm ?? '00'}`;
  const iso = `${y}-${mo}-${d}T${h}:${mi}:${s}${zone}`;
  return Number.isNaN(Date.parse(iso)) ? null : iso;
}

function textOf(dict: PDFDict | undefined, key: string): string | undefined {
  const v = dict?.lookup(PDFName.of(key));
  if (v instanceof PDFString || v instanceof PDFHexString) return v.decodeText();
  return undefined;
}

/** The metadata a PDF carries now (its /Info), for the archive's check. */
export async function readPdfMetadata(bytes: Uint8Array): Promise<Partial<PdfMetadata> & { producer?: string }> {
  const doc = await PDFDocument.load(bytes, { updateMetadata: false, ignoreEncryption: true });
  const info = doc.context.lookupMaybe(doc.context.trailerInfo.Info, PDFDict);
  return {
    title: textOf(info, 'Title'), author: textOf(info, 'Author'), subject: textOf(info, 'Subject'),
    keywords: textOf(info, 'Keywords'), creator: textOf(info, 'Creator'), producer: textOf(info, 'Producer'),
  };
}

function xmpPacket(meta: PdfMetadata, producer: string | undefined, created: string | null, now: string): string {
  const li = (v: string) => `<rdf:li>${xml(v)}</rdf:li>`;
  const keywords = meta.keywords.split(',').map((k) => k.trim()).filter(Boolean);
  return `<?xpacket begin="\uFEFF" id="W5M0MpCehiHzreSzNTczkc9d"?>
<x:xmpmeta xmlns:x="adobe:ns:meta/">
 <rdf:RDF xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#">
  <rdf:Description rdf:about=""
    xmlns:dc="http://purl.org/dc/elements/1.1/"
    xmlns:pdf="http://ns.adobe.com/pdf/1.3/"
    xmlns:xmp="http://ns.adobe.com/xap/1.0/">
   <dc:format>application/pdf</dc:format>
   <dc:title><rdf:Alt><rdf:li xml:lang="x-default">${xml(meta.title)}</rdf:li></rdf:Alt></dc:title>
   <dc:creator><rdf:Seq>${meta.author.split(', ').map(li).join('')}</rdf:Seq></dc:creator>
   <dc:description><rdf:Alt><rdf:li xml:lang="x-default">${xml(meta.subject)}</rdf:li></rdf:Alt></dc:description>
   <dc:subject><rdf:Bag>${keywords.map(li).join('')}</rdf:Bag></dc:subject>
   <pdf:Keywords>${xml(meta.keywords)}</pdf:Keywords>
${producer ? `   <pdf:Producer>${xml(producer)}</pdf:Producer>\n` : ''}   <xmp:CreatorTool>${xml(meta.creator)}</xmp:CreatorTool>
${created ? `   <xmp:CreateDate>${created}</xmp:CreateDate>\n` : ''}   <xmp:ModifyDate>${now}</xmp:ModifyDate>
   <xmp:MetadataDate>${now}</xmp:MetadataDate>
  </rdf:Description>
 </rdf:RDF>
</x:xmpmeta>
<?xpacket end="w"?>`;
}

/**
 * The original bytes followed by an update that gives the file `meta` as
 * its Title, Author, Subject, Keywords and Creator. Throws, with a
 * sentence, for a file that is not a PDF or is encrypted.
 */
export async function stampPdfMetadata(original: Uint8Array, meta: PdfMetadata, when = new Date()): Promise<Uint8Array> {
  if (original.length < 8 || new TextDecoder('latin1').decode(original.subarray(0, 1024)).indexOf('%PDF-') < 0) {
    throw new Error('This file is not a PDF.');
  }
  const prevXref = lastStartXref(original);
  const prev = sectionAt(original, prevXref);
  const doc = await PDFDocument.load(original, { updateMetadata: false, ignoreEncryption: true });
  // An encrypted file's strings are encrypted too: writing plain ones
  // would leave it unreadable. Such a file is reported, not changed.
  if (doc.isEncrypted) throw new Error('This PDF is encrypted, so its details cannot be written.');
  const context = doc.context;
  const { Root, Info, ID } = context.trailerInfo;
  if (!(Root instanceof PDFRef)) throw new Error('This PDF has no document catalogue.');
  const catalog = context.lookup(Root);
  if (!(catalog instanceof PDFDict)) throw new Error('This PDF has an unreadable document catalogue.');

  let nextNumber = Math.max(context.largestObjectNumber + 1, prev.size);
  const newRef = () => PDFRef.of(nextNumber++, 0);
  const objects: { ref: PDFRef; bytes: Uint8Array }[] = [];

  // /Info: everything it had (Producer, CreationDate...), then ours.
  const oldInfo = context.lookupMaybe(Info, PDFDict);
  const info = context.obj({}) as PDFDict;
  if (oldInfo) for (const [k, v] of oldInfo.entries()) info.set(k, v);
  const text = (s: string) => PDFHexString.fromText(s);
  info.set(PDFName.of('Title'), text(meta.title));
  info.set(PDFName.of('Author'), text(meta.author));
  info.set(PDFName.of('Subject'), text(meta.subject));
  info.set(PDFName.of('Keywords'), text(meta.keywords));
  info.set(PDFName.of('Creator'), text(meta.creator));
  info.set(PDFName.of('ModDate'), PDFString.fromDate(when));
  const infoRef = Info instanceof PDFRef ? Info : newRef();
  objects.push({ ref: infoRef, bytes: serialize(info) });

  // The XMP stream, uncompressed (a reader may scan for it), and the
  // catalogue again, now pointing at it.
  const producer = textOf(oldInfo, 'Producer');
  const created = pdfDateToIso(textOf(oldInfo, 'CreationDate'));
  const packet = enc.encode(xmpPacket(meta, producer, created, when.toISOString().replace(/\.\d{3}Z$/, 'Z')));
  const xmpRef = newRef();
  const head = enc.encode(`<< /Type /Metadata /Subtype /XML /Length ${packet.length} >>\nstream\n`);
  const foot = enc.encode('\nendstream');
  const xmp = new Uint8Array(head.length + packet.length + foot.length);
  xmp.set(head, 0); xmp.set(packet, head.length); xmp.set(foot, head.length + packet.length);
  objects.push({ ref: xmpRef, bytes: xmp });

  const cat = context.obj({}) as PDFDict;
  for (const [k, v] of catalog.entries()) cat.set(k, v);
  cat.set(PDFName.of('Metadata'), xmpRef);
  objects.push({ ref: Root, bytes: serialize(cat) });

  // ── The update (the same writer as pdf-watermark.ts) ───────────────
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

  const trailerBits = `/Root ${Root.toString()} /Info ${infoRef.toString()}`
    + (ID ? ` /ID ${ID.toString()}` : '')
    + ` /Prev ${prevXref}`;

  if (prev.classic) {
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
    push(enc.encode(`${table}trailer\n<< /Size ${nextNumber} ${trailerBits} >>\nstartxref\n${xrefAt}\n%%EOF\n`));
  } else {
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

  const out = new Uint8Array(original.length + chunks.reduce((a, c) => a + c.length, 0));
  out.set(original, 0);
  let p = original.length;
  for (const c of chunks) { out.set(c, p); p += c.length; }
  return out;
}

