import { PDFDocument, PDFFont, PDFPage, rgb, setCharacterSpacing, type RGB } from 'npm:pdf-lib@1.17.1';
import fontkit from 'npm:@pdf-lib/fontkit@1.1.1';
// The Society's letterhead, as the roster and the membership certificate
// print it: the seal, and the website's two faces (EB Garamond, Carlito).
import { CARLITO_BOLD, CARLITO_REGULAR, GARAMOND_MEDIUM, GARAMOND_REGULAR, SEAL_PNG } from '../membership-certificate/assets.ts';
import type { DoorRow } from './sheet.ts';

// =====================================================================
// THE DOOR LIST TO PRINT (Step 106D), A4.
// ---------------------------------------------------------------------
// The paper copy kept at the door in case the connection, the server or
// the phones fail. Read standing up, ticked with a pen, so it is built for
// that:
//   page 1   the letterhead, the event, a summary (registered, members,
//            guests, already in) with a box for the count at the door,
//            and one line on how to use it;
//   the list everybody registered, alphabetical by surname, one line each:
//            a box to tick, the number, "Surname, Name", member or guest,
//            and room for a note. The letter of the alphabet stands in the
//            margin where it changes, and each page's footer names its
//            first and last surname, as a dictionary does. Whoever was
//            already checked in by scan when it was printed is ticked,
//            with the time;
//   waiting  who is waiting for a place, in order (only if anybody is);
//   walk-ins a ruled page for people who turn up without registering.
// No address, no ticket code: names and member or guest only, and every
// page says the sheet is for the door and is destroyed afterwards.
// =====================================================================

export interface DoorListData {
  title: string;
  /** "Wednesday 19 November 2026". */
  dayLabel: string;
  /** "6:30 pm to 8:00 pm CET". */
  timeLabel: string;
  /** The place, or "Online". */
  place: string | null;
  rows: DoorRow[];
  waitlist: { name: string; kind: string }[];
  capacity: number | null;
  generatedAt: Date;
  /** "17 November 2026, 6:42 pm CET". */
  generatedLabel: string;
}

const PURPLE = rgb(0x1f / 255, 0x0f / 255, 0x4d / 255);
const INK = rgb(0x14 / 255, 0x14 / 255, 0x14 / 255);
const MUTED = rgb(0x5c / 255, 0x5c / 255, 0x5c / 255);
const SOFT = rgb(0x8a / 255, 0x8a / 255, 0x8a / 255);
const HAIR = rgb(0xd9 / 255, 0xd6 / 255, 0xe3 / 255);
const ZEBRA = rgb(0xf6 / 255, 0xf5 / 255, 0xfa / 255);
const PANEL = rgb(0xf1 / 255, 0xef / 255, 0xf7 / 255);
const WHITE = rgb(1, 1, 1);

const A4: [number, number] = [595.28, 841.89];
const [W, H] = A4;
const MARGIN = 48;
const RIGHT = W - MARGIN;
const FOOT = 52;
const ROW = 19.5;

// The columns of the list.
const COL = {
  box: MARGIN,
  no: MARGIN + 44, // right edge of the number
  name: MARGIN + 54,
  kind: MARGIN + 262,
  notes: MARGIN + 418,
};
const BOX = 11;

function bytes(b64: string): Uint8Array {
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

/** Text the font can draw; an accent it lacks is dropped, never boxed. */
function drawable(font: PDFFont, text: string): string {
  const set = new Set(font.getCharacterSet());
  let out = '';
  for (const ch of (text ?? '').normalize('NFC')) {
    const cp = ch.codePointAt(0)!;
    if (set.has(cp)) { out += ch; continue; }
    const bare = ch.normalize('NFKD').replace(/[̀-ͯ]/g, '');
    out += [...bare].filter((c) => set.has(c.codePointAt(0)!)).join('');
  }
  return out;
}

interface Ink { font: PDFFont; size: number; color?: RGB; tracking?: number }

function widthOf(text: string, ink: Ink): number {
  return ink.font.widthOfTextAtSize(text, ink.size) + (ink.tracking ?? 0) * Math.max(0, [...text].length - 1);
}

function draw(page: PDFPage, text: string, x: number, y: number, ink: Ink) {
  const t = drawable(ink.font, text);
  if (!t) return;
  const tr = ink.tracking ?? 0;
  if (tr) page.pushOperators(setCharacterSpacing(tr));
  page.drawText(t, { x, y, size: ink.size, font: ink.font, color: ink.color ?? INK });
  if (tr) page.pushOperators(setCharacterSpacing(0));
}

/** Shortened with an ellipsis to fit. */
function clipTo(text: string, ink: Ink, max: number): string {
  let t = drawable(ink.font, text);
  if (widthOf(t, ink) <= max) return t;
  while (t.length > 1 && widthOf(`${t}...`, ink) > max) t = t.slice(0, -1);
  return `${t.trimEnd()}...`;
}

/** Words laid into lines no wider than `max`. */
function wrap(text: string, ink: Ink, max: number): string[] {
  const words = drawable(ink.font, text).split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let line = '';
  for (const w of words) {
    const next = line ? `${line} ${w}` : w;
    if (widthOf(next, ink) <= max || !line) line = next;
    else { lines.push(line); line = w; }
  }
  if (line) lines.push(line);
  return lines;
}

function tick(page: PDFPage, x: number, y: number) {
  // A pen-like check mark inside the box.
  page.drawLine({ start: { x: x + 2.2, y: y + 5.6 }, end: { x: x + 4.6, y: y + 2.6 }, thickness: 1.5, color: PURPLE });
  page.drawLine({ start: { x: x + 4.6, y: y + 2.6 }, end: { x: x + 9.2, y: y + 9.0 }, thickness: 1.5, color: PURPLE });
}

export async function renderDoorList(data: DoorListData): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  doc.registerFontkit(fontkit);
  const [garamond, garamondMedium, carlito, carlitoBold] = await Promise.all([
    doc.embedFont(bytes(GARAMOND_REGULAR), { subset: true }),
    doc.embedFont(bytes(GARAMOND_MEDIUM), { subset: true }),
    doc.embedFont(bytes(CARLITO_REGULAR), { subset: true }),
    doc.embedFont(bytes(CARLITO_BOLD), { subset: true }),
  ]);
  const seal = await doc.embedPng(bytes(SEAL_PNG));

  const docTitle = `Door list, ${data.title}, ${data.dayLabel}`;
  doc.setTitle(drawable(carlito, docTitle));
  doc.setAuthor('Minerva Investment Management Society');
  doc.setSubject(drawable(carlito, `Door list of ${data.title} (${data.dayLabel}): everybody registered, alphabetical by surname, to tick by hand. For the door only.`));
  doc.setKeywords(['Minerva Investment Management Society', 'MIMS', 'door list', 'attendance']);
  doc.setCreator('minervaims.org');
  doc.setProducer('Minerva Investment Management Society');
  doc.setCreationDate(data.generatedAt);
  doc.setModificationDate(data.generatedAt);

  const label: Ink = { font: carlitoBold, size: 6.8, color: PURPLE, tracking: 1.1 };
  const surnameInk: Ink = { font: carlitoBold, size: 10.6, color: INK };
  const givenInk: Ink = { font: carlito, size: 10.6, color: INK };
  const numInk: Ink = { font: carlito, size: 8.4, color: SOFT };
  const memberInk: Ink = { font: carlito, size: 8.6, color: PURPLE };
  const guestInk: Ink = { font: carlito, size: 8.6, color: MUTED };
  const noteInk: Ink = { font: carlito, size: 8, color: MUTED };
  const letterInk: Ink = { font: garamondMedium, size: 14, color: PURPLE };

  type Sheet = { page: PDFPage; first: string | null; last: string | null; kind: 'list' | 'walkins' };
  const sheets: Sheet[] = [];
  let sheet!: Sheet;
  let y = 0;

  // Every page after the first: one line saying which event it belongs to.
  const runningHead = (page: PDFPage) => {
    const left = `Door list  ·  ${data.title}  ·  ${data.dayLabel}`;
    draw(page, clipTo(left, { font: carlito, size: 8, color: MUTED }, RIGHT - MARGIN - 70), MARGIN, H - 34, { font: carlito, size: 8, color: MUTED });
    const brand = 'MIMS';
    const bInk: Ink = { font: carlitoBold, size: 8, color: PURPLE, tracking: 1.6 };
    draw(page, brand, RIGHT - widthOf(brand, bInk), H - 34, bInk);
    page.drawLine({ start: { x: MARGIN, y: H - 41 }, end: { x: RIGHT, y: H - 41 }, thickness: 0.5, color: HAIR });
  };

  const tableHead = (cols: { text: string; x: number; right?: boolean }[]) => {
    for (const c of cols) draw(sheet.page, c.text, c.right ? c.x - widthOf(c.text, label) : c.x, y, label);
    y -= 5;
    sheet.page.drawLine({ start: { x: MARGIN, y }, end: { x: RIGHT, y }, thickness: 0.7, color: PURPLE });
    y -= ROW - 5;
  };
  const LIST_COLS = [
    { text: 'IN', x: COL.box },
    { text: 'NO.', x: COL.no, right: true },
    { text: 'SURNAME, NAME', x: COL.name },
    { text: 'MEMBER OR GUEST', x: COL.kind },
    { text: 'NOTES', x: COL.notes },
  ];

  const newPage = (kind: Sheet['kind']) => {
    const page = doc.addPage(A4);
    sheet = { page, first: null, last: null, kind };
    sheets.push(sheet);
    runningHead(page);
    y = H - 64;
  };

  // ── Page 1: the letterhead and the summary ─────────────────────────
  {
    const page = doc.addPage(A4);
    sheet = { page, first: null, last: null, kind: 'list' };
    sheets.push(sheet);
    y = H - 40;
    const sealSize = 46;
    page.drawImage(seal, { x: W / 2 - sealSize / 2, y: y - sealSize, width: sealSize, height: sealSize });
    y -= sealSize + 13;
    const society = 'MINERVA INVESTMENT MANAGEMENT SOCIETY';
    const sInk: Ink = { font: carlitoBold, size: 8, color: PURPLE, tracking: 2 };
    draw(page, society, W / 2 - widthOf(society, sInk) / 2, y, sInk);
    y -= 10;
    page.drawLine({ start: { x: W / 2 - 28, y }, end: { x: W / 2 + 28, y }, thickness: 0.6, color: PURPLE });
    y -= 32;

    draw(page, 'Door list', MARGIN, y, { font: garamond, size: 25, color: PURPLE });
    const printed = `Printed ${data.generatedLabel}`;
    const pInk: Ink = { font: carlito, size: 8, color: SOFT };
    draw(page, printed, RIGHT - widthOf(drawable(carlito, printed), pInk), y + 2, pInk);
    y -= 21;
    const titleInk: Ink = { font: garamondMedium, size: 15.5, color: INK };
    for (const line of wrap(data.title, titleInk, RIGHT - MARGIN).slice(0, 2)) { draw(page, line, MARGIN, y, titleInk); y -= 18; }
    y += 3;
    const meta = [data.dayLabel, data.timeLabel, data.place].filter(Boolean).join('  ·  ');
    const metaInk: Ink = { font: carlito, size: 9.6, color: MUTED };
    for (const line of wrap(meta, metaInk, RIGHT - MARGIN).slice(0, 2)) { draw(page, line, MARGIN, y, metaInk); y -= 12.5; }
    y -= 10;

    // The summary: four figures and a box for the count at the door.
    const members = data.rows.filter((r) => r.member).length;
    const already = data.rows.filter((r) => r.attended).length;
    const figures: [string, string][] = [
      ['REGISTERED', String(data.rows.length)],
      ['MEMBERS', String(members)],
      ['GUESTS', String(data.rows.length - members)],
      ['ALREADY IN', String(already)],
    ];
    if (data.capacity) figures.splice(1, 0, ['PLACES', String(data.capacity)]);
    const panelH = 50;
    page.drawRectangle({ x: MARGIN, y: y - panelH, width: RIGHT - MARGIN, height: panelH, color: PANEL });
    const countW = 128;
    const cellW = (RIGHT - MARGIN - countW) / figures.length;
    figures.forEach(([k, v], i) => {
      const x = MARGIN + 12 + i * cellW;
      draw(page, v, x, y - 26, { font: garamond, size: 20, color: PURPLE });
      draw(page, k, x, y - 40, { ...label, size: 6.4, color: MUTED });
    });
    const cx = RIGHT - countW;
    page.drawRectangle({ x: cx, y: y - panelH, width: countW, height: panelH, color: WHITE, borderColor: PURPLE, borderWidth: 0.8 });
    draw(page, 'COUNT AT THE DOOR', cx + 9, y - 40, { ...label, size: 6.4 });
    page.drawLine({ start: { x: cx + 9, y: y - 28 }, end: { x: RIGHT - 9, y: y - 28 }, thickness: 0.5, color: SOFT });
    y -= panelH + 14;

    const how = 'Tick the box as each person arrives. Anybody already checked in by scan when this list was printed is ticked, with the time. '
      + 'Write people who turn up without registering on the walk-ins page at the end. When the connection is back, enter the ticks and the walk-ins in Events, Attendance.';
    const howInk: Ink = { font: carlito, size: 8.4, color: MUTED };
    for (const line of wrap(how, howInk, RIGHT - MARGIN)) { draw(page, line, MARGIN, y, howInk); y -= 11; }
    y -= 12;
  }

  // ── The list ───────────────────────────────────────────────────────
  tableHead(LIST_COLS);
  let lastLetter = '';
  let lineOnPage = 0;
  const fits = () => y - ROW > FOOT + 6;

  if (!data.rows.length) {
    draw(sheet.page, 'Nobody has registered yet. Use the walk-ins page at the end.', COL.name, y, { font: garamond, size: 12, color: MUTED });
    y -= ROW;
  }

  for (const r of data.rows) {
    if (!fits()) {
      newPage('list');
      tableHead(LIST_COLS);
      lineOnPage = 0;
      lastLetter = '';
    }
    const page = sheet.page;
    // Light stripes, so a line can be followed across the page.
    if (lineOnPage % 2 === 1) page.drawRectangle({ x: MARGIN - 4, y: y - 6, width: RIGHT - MARGIN + 8, height: ROW, color: ZEBRA });
    // The letter, where it changes (and at the top of every page).
    if (r.letter !== lastLetter) {
      if (lastLetter && lineOnPage > 0) page.drawLine({ start: { x: MARGIN - 4, y: y + ROW - 6 }, end: { x: RIGHT + 4, y: y + ROW - 6 }, thickness: 0.6, color: HAIR });
      draw(page, r.letter, MARGIN - 30, y - 1, letterInk);
      lastLetter = r.letter;
    }
    page.drawRectangle({ x: COL.box, y: y - 2.5, width: BOX, height: BOX, color: WHITE, borderColor: INK, borderWidth: 0.9 });
    if (r.attended) tick(page, COL.box, y - 2.5);
    const n = String(r.n);
    draw(page, n, COL.no - widthOf(n, numInk), y, numInk);
    const nameMax = COL.kind - COL.name - 10;
    const sur = clipTo(r.surname, surnameInk, nameMax);
    if (!sur.replace(/[\s.,]/g, '')) {
      // A name in a script these typefaces lack: the address, so the
      // person can still be found.
      draw(page, clipTo(r.fallback ? `(name not printable) ${r.fallback}` : '(name not printable)', guestInk, nameMax), COL.name, y, guestInk);
    } else {
      draw(page, sur, COL.name, y, surnameInk);
      if (r.given) {
        const used = widthOf(sur, surnameInk);
        const rest = nameMax - used - widthOf(', ', givenInk);
        const given = clipTo(r.given, givenInk, Math.max(0, rest));
        if (rest > 12 && given.replace(/[\s.,]/g, '')) draw(page, `, ${given}`, COL.name + used, y, givenInk);
      }
    }
    const kInk = r.member ? memberInk : guestInk;
    draw(page, clipTo(r.kind, kInk, COL.notes - COL.kind - 10), COL.kind, y, kInk);
    if (r.attended) {
      const at = r.checkedInAt ? `In at ${clock(r.checkedInAt)}` : 'Already in';
      draw(page, clipTo(at, noteInk, RIGHT - COL.notes), COL.notes, y, noteInk);
    }
    // The page's first and last surname, for its footer.
    const shown = drawable(surnameInk.font, r.surname).trim() || '#';
    sheet.first ??= shown;
    sheet.last = shown;
    lineOnPage += 1;
    y -= ROW;
  }

  // ── The waiting list, in order ─────────────────────────────────────
  if (data.waitlist.length) {
    if (y - ROW * 4 < FOOT + 6) { newPage('list'); }
    y -= 14;
    draw(sheet.page, `WAITING LIST, IN ORDER (${data.waitlist.length})`, MARGIN, y, { ...label, size: 7.4 });
    y -= 12;
    const note = 'Not on the list above. Admit somebody from here only if a place is free, in this order, and tick them.';
    draw(sheet.page, note, MARGIN, y, { font: carlito, size: 8.2, color: MUTED });
    y -= 9;
    sheet.page.drawLine({ start: { x: MARGIN, y }, end: { x: RIGHT, y }, thickness: 0.7, color: PURPLE });
    y -= ROW - 5;
    data.waitlist.forEach((w, i) => {
      if (!fits()) { newPage('list'); }
      const page = sheet.page;
      page.drawRectangle({ x: COL.box, y: y - 2.5, width: BOX, height: BOX, color: WHITE, borderColor: INK, borderWidth: 0.9 });
      const n = String(i + 1);
      draw(page, n, COL.no - widthOf(n, numInk), y, numInk);
      draw(page, clipTo(w.name, givenInk, COL.kind - COL.name - 10), COL.name, y, givenInk);
      draw(page, clipTo(w.kind, guestInk, COL.notes - COL.kind - 10), COL.kind, y, guestInk);
      y -= ROW;
    });
  }

  // ── Walk-ins: a ruled page to write on ─────────────────────────────
  newPage('walkins');
  {
    const page = sheet.page;
    draw(page, 'Walk-ins', MARGIN, y - 6, { font: garamond, size: 20, color: PURPLE });
    y -= 22;
    const note = 'People who turn up without registering. Write clearly: when the connection is back, add them in Events, Attendance, '
      + 'with Add someone who turned up (a member from the register, a guest with the form).';
    const nInk: Ink = { font: carlito, size: 8.4, color: MUTED };
    for (const line of wrap(note, nInk, RIGHT - MARGIN)) { draw(page, line, MARGIN, y, nInk); y -= 11; }
    y -= 10;
    const wk = { box: MARGIN, name: MARGIN + 22, email: MARGIN + 212, mg: MARGIN + 392, notes: MARGIN + 432 };
    tableHead([
      { text: 'IN', x: wk.box },
      { text: 'NAME AND SURNAME', x: wk.name },
      { text: 'EMAIL (GUESTS)', x: wk.email },
      { text: 'M / G', x: wk.mg },
      { text: 'NOTES', x: wk.notes },
    ]);
    const LINE = 25;
    y -= 4;
    while (y - LINE > FOOT + 4) {
      page.drawRectangle({ x: wk.box, y: y - 2.5, width: BOX, height: BOX, color: WHITE, borderColor: INK, borderWidth: 0.9 });
      page.drawLine({ start: { x: wk.name, y: y - 3 }, end: { x: RIGHT, y: y - 3 }, thickness: 0.5, color: HAIR });
      for (const x of [wk.email, wk.mg, wk.notes]) page.drawLine({ start: { x: x - 6, y: y - 3 }, end: { x: x - 6, y: y + 12 }, thickness: 0.5, color: HAIR });
      y -= LINE;
    }
  }

  // ── Every page: what it is, which names it holds, its number ───────
  const foot: Ink = { font: carlito, size: 7, color: SOFT };
  const footStrong: Ink = { font: carlitoBold, size: 7.6, color: PURPLE };
  sheets.forEach((s, i) => {
    const p = s.page;
    p.drawLine({ start: { x: MARGIN, y: FOOT - 12 }, end: { x: RIGHT, y: FOOT - 12 }, thickness: 0.4, color: HAIR });
    const num = `Page ${i + 1} of ${sheets.length}`;
    draw(p, num, RIGHT - widthOf(num, foot), FOOT - 25, foot);
    let guideW = 0;
    if (s.first && s.last) {
      const guide = s.first === s.last ? s.first : `${s.first} to ${s.last}`;
      const g = clipTo(guide, footStrong, 190);
      guideW = widthOf(g, footStrong) + 16;
      draw(p, g, RIGHT - widthOf(num, foot) - guideW, FOOT - 25, footStrong);
    } else if (s.kind === 'walkins') {
      const g = 'Walk-ins';
      guideW = widthOf(g, footStrong) + 16;
      draw(p, g, RIGHT - widthOf(num, foot) - guideW, FOOT - 25, footStrong);
    }
    const left = 'Minerva Investment Management Society (MIMS)  ·  Personal data, for the door only: destroy once attendance is entered';
    draw(p, clipTo(left, foot, RIGHT - MARGIN - widthOf(num, foot) - guideW - 10), MARGIN, FOOT - 25, foot);
  });

  return await doc.save({ useObjectStreams: true });
}

/** "6:42 pm", Rome time. */
function clock(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const parts = new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/Rome', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(d);
  const h = Number(parts.find((p) => p.type === 'hour')?.value ?? 0) % 24;
  const m = parts.find((p) => p.type === 'minute')?.value ?? '00';
  return `${h % 12 === 0 ? 12 : h % 12}:${m} ${h >= 12 ? 'pm' : 'am'}`;
}
