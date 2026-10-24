import { PDFDocument, PDFFont, PDFPage, rgb, setCharacterSpacing, type RGB } from 'npm:pdf-lib@1.17.1';
import fontkit from 'npm:@pdf-lib/fontkit@1.1.1';
// The certificate's typefaces and seal: the roster is printed on the same
// letterhead, in the website's faces (EB Garamond and Carlito).
import { CARLITO_BOLD, CARLITO_REGULAR, GARAMOND_MEDIUM, GARAMOND_REGULAR, SEAL_PNG } from '../membership-certificate/assets.ts';
import { ROSTER_DIVISIONS, isOfficer, rosterTeamShort } from '../_shared/rosters.ts';

// =====================================================================
// A semester's roster as an A4 document (Step 94).
// ---------------------------------------------------------------------
//   the seal, the Society's name, a rule
//   Roster, <semester>, and what it covers (every division, or one)
//   the Board of Directors: officers, then heads
//   each division in turn: name, role, team
//   on every page: the page number and "for the Society's internal use"
//
// It carries names and roles only: no person code, no contact detail.
// =====================================================================

export interface RosterPdfRow {
  first_name: string;
  surname: string;
  role: string;
  division: string;
  team: string | null;
  office_rank: number | null;
}

export interface RosterPdfData {
  semesterLabel: string;
  /** "All divisions", or the division a member from Analyst up may see. */
  scopeLabel: string;
  live: boolean;
  rows: RosterPdfRow[];
  generatedAt: Date;
}

const PURPLE = rgb(0x1f / 255, 0x0f / 255, 0x4d / 255);
const INK = rgb(0x14 / 255, 0x14 / 255, 0x14 / 255);
const MUTED = rgb(0x5c / 255, 0x5c / 255, 0x5c / 255);
const SOFT = rgb(0x8a / 255, 0x8a / 255, 0x8a / 255);
const HAIR = rgb(0xd9 / 255, 0xd6 / 255, 0xe3 / 255);

const A4: [number, number] = [595.28, 841.89];
const MARGIN = 56;
const FOOT = 64;
const ROW = 15;

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
  for (const ch of text.normalize('NFC')) {
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
  const t = ink.tracking ?? 0;
  if (t) page.pushOperators(setCharacterSpacing(t));
  page.drawText(text, { x, y, size: ink.size, font: ink.font, color: ink.color ?? INK });
  if (t) page.pushOperators(setCharacterSpacing(0));
}

/** Shortened with an ellipsis to fit a column. */
function clipTo(text: string, ink: Ink, max: number): string {
  if (widthOf(text, ink) <= max) return text;
  let t = text;
  while (t.length > 1 && widthOf(`${t}...`, ink) > max) t = t.slice(0, -1);
  return `${t.trimEnd()}...`;
}

function longDate(d: Date): string {
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Europe/Rome' });
}

export async function renderRoster(data: RosterPdfData): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  doc.registerFontkit(fontkit);
  const [garamond, garamondMedium, carlito, carlitoBold] = await Promise.all([
    doc.embedFont(bytes(GARAMOND_REGULAR), { subset: true }),
    doc.embedFont(bytes(GARAMOND_MEDIUM), { subset: true }),
    doc.embedFont(bytes(CARLITO_REGULAR), { subset: true }),
    doc.embedFont(bytes(CARLITO_BOLD), { subset: true }),
  ]);
  const seal = await doc.embedPng(bytes(SEAL_PNG));

  doc.setTitle(`Roster, ${data.semesterLabel}`);
  doc.setAuthor('Minerva Investment Management Society');
  doc.setSubject(`Roster of Minerva Investment Management Society, ${data.semesterLabel}: ${data.scopeLabel}. For the Society's internal use.`);
  doc.setKeywords(['Minerva Investment Management Society', 'MIMS', 'roster', data.semesterLabel]);
  doc.setCreator('minervaims.org');
  doc.setProducer('Minerva Investment Management Society');
  doc.setCreationDate(data.generatedAt);
  doc.setModificationDate(data.generatedAt);

  const [W, H] = A4;
  const nameInk: Ink = { font: garamondMedium, size: 10.5, color: INK };
  const roleInk: Ink = { font: carlito, size: 9, color: MUTED };
  const teamInk: Ink = { font: carlito, size: 9, color: SOFT };
  const headInk: Ink = { font: carlitoBold, size: 7.6, color: PURPLE, tracking: 1.4 };
  const colName = MARGIN;
  const colRole = MARGIN + 180;
  const colTeam = MARGIN + 360;

  const pages: PDFPage[] = [];
  let page!: PDFPage;
  let y = 0;

  const newPage = (first: boolean) => {
    page = doc.addPage(A4);
    pages.push(page);
    y = H - MARGIN;
    if (first) {
      const sealSize = 54;
      page.drawImage(seal, { x: W / 2 - sealSize / 2, y: y - sealSize, width: sealSize, height: sealSize });
      y -= sealSize + 16;
      const society = 'MINERVA INVESTMENT MANAGEMENT SOCIETY';
      const sInk: Ink = { font: carlitoBold, size: 8.5, color: PURPLE, tracking: 2 };
      draw(page, society, W / 2 - widthOf(society, sInk) / 2, y, sInk);
      y -= 12;
      page.drawLine({ start: { x: W / 2 - 30, y }, end: { x: W / 2 + 30, y }, thickness: 0.6, color: PURPLE });
      y -= 34;
      const title = `Roster, ${drawable(garamond, data.semesterLabel)}`;
      draw(page, title, MARGIN, y, { font: garamond, size: 26, color: PURPLE });
      y -= 18;
      const sub = `${data.scopeLabel}${data.live ? ', as the member register stands today' : ''}. Prepared on ${longDate(data.generatedAt)}.`;
      draw(page, drawable(carlito, sub), MARGIN, y, { font: carlito, size: 9, color: MUTED });
      y -= 24;
    } else {
      y -= 8;
    }
  };

  const ensure = (needed: number) => {
    if (y - needed < FOOT + 10) newPage(false);
  };

  const section = (title: string) => {
    ensure(ROW * 3);
    y -= 10;
    draw(page, title.toUpperCase(), MARGIN, y, headInk);
    y -= 6;
    page.drawLine({ start: { x: MARGIN, y }, end: { x: W - MARGIN, y }, thickness: 0.5, color: HAIR });
    y -= ROW - 2;
  };

  const line = (r: RosterPdfRow, withTeam: boolean) => {
    ensure(ROW);
    const name = drawable(garamondMedium, `${r.first_name} ${r.surname}`);
    draw(page, clipTo(name, nameInk, colRole - colName - 10), colName, y, nameInk);
    draw(page, clipTo(drawable(carlito, r.role), roleInk, (withTeam ? colTeam : W - MARGIN) - colRole - 10), colRole, y, roleInk);
    const team = withTeam ? rosterTeamShort(r.team) : null;
    if (team) draw(page, clipTo(drawable(carlito, team), teamInk, W - MARGIN - colTeam), colTeam, y, teamInk);
    y -= ROW;
  };

  newPage(true);

  const byName = (a: RosterPdfRow, b: RosterPdfRow) =>
    a.surname.localeCompare(b.surname, 'en') || a.first_name.localeCompare(b.first_name, 'en');

  // The Board: officers, then heads. Its members also appear in their
  // division below, as they do on the Members page.
  const board = data.rows.filter((r) => r.office_rank !== null)
    .sort((a, b) => (a.office_rank! - b.office_rank!) || byName(a, b));
  if (board.length) {
    const officers = board.filter((r) => isOfficer(r.role));
    const heads = board.filter((r) => !isOfficer(r.role));
    if (officers.length) { section('Board of Directors: officers'); officers.forEach((r) => line(r, false)); }
    if (heads.length) { section('Board of Directors: heads'); heads.forEach((r) => line(r, false)); }
  }

  for (const d of ROSTER_DIVISIONS) {
    if (d.key === 'board') continue;
    const rows = data.rows.filter((r) => r.division === d.key)
      .sort((a, b) => ((a.office_rank ?? 99) - (b.office_rank ?? 99)) || a.role.localeCompare(b.role, 'en')
        || (a.team ?? '').localeCompare(b.team ?? '', 'en') || byName(a, b));
    if (!rows.length) continue;
    section(`${d.label} (${rows.length})`);
    rows.forEach((r) => line(r, true));
  }

  if (!data.rows.length) {
    draw(page, 'Nobody is recorded for this semester.', MARGIN, y, { font: garamond, size: 12, color: MUTED });
  }

  // Every page: the number, and what the document is for.
  const foot: Ink = { font: carlito, size: 7.2, color: SOFT };
  pages.forEach((p, i) => {
    p.drawLine({ start: { x: MARGIN, y: FOOT - 14 }, end: { x: W - MARGIN, y: FOOT - 14 }, thickness: 0.4, color: HAIR });
    draw(p, `Minerva Investment Management Society (MIMS)  ·  Roster, ${drawable(carlito, data.semesterLabel)}  ·  For the Society's internal use`,
      MARGIN, FOOT - 28, foot);
    const n = `Page ${i + 1} of ${pages.length}`;
    draw(p, n, W - MARGIN - widthOf(n, foot), FOOT - 28, foot);
  });

  return await doc.save({ useObjectStreams: true });
}
