import { PDFDocument, PDFFont, PDFPage, rgb, setCharacterSpacing, type RGB } from 'npm:pdf-lib@1.17.1';
import fontkit from 'npm:@pdf-lib/fontkit@1.1.1';
// The encoder only (no file system, no image output): the page draws the
// modules itself, as vector squares.
import QRCode from 'npm:qrcode@1.5.4/lib/core/qrcode.js';
import {
  CARLITO_BOLD, CARLITO_REGULAR, GARAMOND_ITALIC, GARAMOND_MEDIUM, GARAMOND_REGULAR, SEAL_PNG,
} from './assets.ts';

// =====================================================================
// The membership certificate, drawn as one A4 page on the Society's
// letterhead.
// ---------------------------------------------------------------------
//   the seal, the Society's name, a rule
//   Certificate of Membership
//   This is to certify that / NAME / is a member of ... / ROLE
//   what the Society is, in three sentences
//   where and when it was issued
//   the President and the Vice President, on behalf of the Board
//   the certificate number, a QR code and where to verify it
//   the letterhead's foot: independence from Bocconi University
//
// Everything on it comes from the stored certificate row, never from the
// request, so downloading the same certificate twice gives the same page.
// The typefaces are the website's: EB Garamond and Carlito.
// =====================================================================

export interface CertificateSignatory { name: string; title: string }

export interface CertificateData {
  code: string;
  holderName: string;
  roleLabel: string;
  semesterLabel: string;
  issuedAt: Date;
  board: CertificateSignatory[];
  verifyUrl: string;
}

const PURPLE = rgb(0x1f / 255, 0x0f / 255, 0x4d / 255);
const INK = rgb(0x14 / 255, 0x14 / 255, 0x14 / 255);
const MUTED = rgb(0x5c / 255, 0x5c / 255, 0x5c / 255);
const SOFT = rgb(0x8a / 255, 0x8a / 255, 0x8a / 255);
const HAIR = rgb(0xd9 / 255, 0xd6 / 255, 0xe3 / 255);

const A4: [number, number] = [595.28, 841.89];
/** The verification block: the QR code's bottom and top edges. */
const VERIFY_BOTTOM = 108;
const VERIFY_TOP = 166;

function bytes(b64: string): Uint8Array {
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

/**
 * Text the font can actually draw. The fonts carry Latin, Latin-1 and
 * Latin Extended-A; anything else loses its accent, and what is left
 * after that is dropped rather than printed as an empty box.
 */
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
  const base = ink.font.widthOfTextAtSize(text, ink.size);
  return base + (ink.tracking ?? 0) * Math.max(0, [...text].length - 1);
}

function draw(page: PDFPage, text: string, x: number, y: number, ink: Ink) {
  const tracking = ink.tracking ?? 0;
  if (tracking) page.pushOperators(setCharacterSpacing(tracking));
  page.drawText(text, { x, y, size: ink.size, font: ink.font, color: ink.color ?? INK });
  if (tracking) page.pushOperators(setCharacterSpacing(0));
}

function centred(page: PDFPage, text: string, y: number, ink: Ink, cx = A4[0] / 2) {
  draw(page, text, cx - widthOf(text, ink) / 2, y, ink);
}

function wrap(text: string, ink: Ink, max: number): string[] {
  const words = text.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let line = '';
  for (const w of words) {
    const next = line ? `${line} ${w}` : w;
    if (line && widthOf(next, ink) > max) { lines.push(line); line = w; } else line = next;
  }
  if (line) lines.push(line);
  return lines;
}

/** A title made to fit a width, a point at a time, down to a floor. */
function fitted(text: string, ink: Ink, max: number, floor: number): Ink {
  let size = ink.size;
  while (size > floor && widthOf(text, { ...ink, size }) > max) size -= 0.5;
  return { ...ink, size };
}

function longDate(d: Date): string {
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Europe/Rome' });
}

export const SOCIETY_DESCRIPTION =
  'Founded in 2017, Minerva Investment Management Society is a student association at Bocconi University, Milan. '
  + 'Its members research listed companies, macroeconomic themes and quantitative strategies, manage the Society’s '
  + 'virtual portfolios and publish their analysis. Membership is open to students admitted through a competitive '
  + 'selection of written applications and interviews.';

export async function renderCertificate(data: CertificateData): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  doc.registerFontkit(fontkit);
  const [garamond, garamondItalic, garamondMedium, carlito, carlitoBold] = await Promise.all([
    doc.embedFont(bytes(GARAMOND_REGULAR), { subset: true }),
    doc.embedFont(bytes(GARAMOND_ITALIC), { subset: true }),
    doc.embedFont(bytes(GARAMOND_MEDIUM), { subset: true }),
    doc.embedFont(bytes(CARLITO_REGULAR), { subset: true }),
    doc.embedFont(bytes(CARLITO_BOLD), { subset: true }),
  ]);
  const seal = await doc.embedPng(bytes(SEAL_PNG));

  doc.setTitle(`Certificate of Membership, ${data.semesterLabel}`);
  doc.setAuthor('Minerva Investment Management Society');
  doc.setSubject(`Certificate ${data.code}`);
  doc.setKeywords([data.code, 'Minerva Investment Management Society', 'certificate of membership']);
  doc.setCreator('minervaims.org');
  doc.setProducer('Minerva Investment Management Society');
  doc.setCreationDate(data.issuedAt);
  doc.setModificationDate(data.issuedAt);

  const page = doc.addPage(A4);
  const [W, H] = A4;
  const cx = W / 2;

  // ── The frame: a fine double rule, the one ornament on the page ──────
  page.drawRectangle({ x: 24, y: 24, width: W - 48, height: H - 48, borderColor: PURPLE, borderWidth: 1.1 });
  page.drawRectangle({ x: 29, y: 29, width: W - 58, height: H - 58, borderColor: PURPLE, borderWidth: 0.35 });

  // ── Letterhead ───────────────────────────────────────────────────────
  const sealSize = 88;
  let y = H - 58 - sealSize;
  page.drawImage(seal, { x: cx - sealSize / 2, y, width: sealSize, height: sealSize });
  y -= 22;
  centred(page, 'MINERVA INVESTMENT MANAGEMENT SOCIETY', y, { font: carlitoBold, size: 9, color: PURPLE, tracking: 2.2 });
  y -= 13;
  centred(page, 'Student association at Bocconi University  ·  Milan', y, { font: carlito, size: 8, color: SOFT, tracking: 0.4 });
  y -= 16;
  page.drawLine({ start: { x: cx - 36, y }, end: { x: cx + 36, y }, thickness: 0.6, color: PURPLE });

  // ── The certificate ──────────────────────────────────────────────────
  y -= 44;
  centred(page, 'Certificate of Membership', y, { font: garamond, size: 34, color: PURPLE });
  y -= 36;
  centred(page, 'This is to certify that', y, { font: garamondItalic, size: 14, color: MUTED });

  y -= 40;
  const name = drawable(garamondMedium, data.holderName);
  const nameInk = fitted(name, { font: garamondMedium, size: 30, color: INK }, W - 160, 18);
  centred(page, name, y, nameInk);
  y -= 12;
  const ruleHalf = Math.min(W / 2 - 90, widthOf(name, nameInk) / 2 + 28);
  page.drawLine({ start: { x: cx - ruleHalf, y }, end: { x: cx + ruleHalf, y }, thickness: 0.5, color: HAIR });

  y -= 28;
  centred(page, 'is a member of Minerva Investment Management Society', y, { font: garamond, size: 13.5, color: INK });
  y -= 20;
  centred(page, `in the ${drawable(garamond, data.semesterLabel)} semester, in the role of`, y, { font: garamond, size: 13.5, color: INK });
  y -= 30;
  const role = drawable(garamondMedium, data.roleLabel);
  centred(page, role, y, fitted(role, { font: garamondMedium, size: 20, color: PURPLE }, W - 160, 13));

  // ── What the Society is ──────────────────────────────────────────────
  y -= 32;
  const about: Ink = { font: garamond, size: 10.5, color: MUTED };
  for (const line of wrap(drawable(garamond, SOCIETY_DESCRIPTION), about, 400)) {
    centred(page, line, y, about);
    y -= 14.5;
  }

  y -= 12;
  centred(page, `Issued in Milan on ${longDate(data.issuedAt)}`, y, { font: garamondItalic, size: 11.5, color: INK });

  // ── The Board of Directors, who sign it ──────────────────────────────
  // The President and the Vice President sign, side by side, on behalf of
  // the Board of Directors of the semester. The pair is centred in the
  // space above the verification block.
  const people = data.board.length ? data.board.slice(0, 2) : [{ name: 'The Board of Directors', title: 'Minerva Investment Management Society' }];
  const blockHeight = 70;
  const room = (y - 30) - (VERIFY_TOP + 22);
  y -= 30 + Math.max(0, Math.min(60, (room - blockHeight) / 2)) + 14;
  const colW = 190;
  const titleInk: Ink = { font: carlito, size: 7, color: MUTED, tracking: 0.8 };
  const left = cx - (people.length * colW) / 2;
  people.forEach((p, i) => {
    const mid = left + colW * i + colW / 2;
    const who = drawable(garamondItalic, p.name);
    centred(page, who, y, fitted(who, { font: garamondItalic, size: 15, color: INK }, colW - 24, 10), mid);
    page.drawLine({ start: { x: mid - colW / 2 + 16, y: y - 7 }, end: { x: mid + colW / 2 - 16, y: y - 7 }, thickness: 0.5, color: HAIR });
    centred(page, drawable(carlito, p.title.toUpperCase()), y - 18, titleInk, mid);
  });
  y -= 44;
  centred(page, `On behalf of the Board of Directors of ${drawable(garamondItalic, data.semesterLabel)}`, y, { font: garamondItalic, size: 11.5, color: MUTED });

  // ── Verification ─────────────────────────────────────────────────────
  const qr = QRCode.create(data.verifyUrl, { errorCorrectionLevel: 'M' });
  const n = qr.modules.size;
  const qrSize = VERIFY_TOP - VERIFY_BOTTOM;
  const cell = qrSize / n;
  const boxY = VERIFY_BOTTOM;
  const textW = 322;
  const qrX = cx - (qrSize + 16 + textW) / 2;
  const textX = qrX + qrSize + 16;
  for (let r = 0; r < n; r++) {
    for (let c = 0; c < n; c++) {
      if (qr.modules.get(r, c)) {
        page.drawRectangle({ x: qrX + c * cell, y: boxY + qrSize - (r + 1) * cell, width: cell + 0.02, height: cell + 0.02, color: PURPLE });
      }
    }
  }
  draw(page, 'CERTIFICATE NUMBER', textX, boxY + qrSize - 9, { font: carlitoBold, size: 6.8, color: SOFT, tracking: 1.2 });
  draw(page, data.code, textX, boxY + qrSize - 24, { font: carlitoBold, size: 12.5, color: PURPLE, tracking: 0.8 });
  const verifyInk: Ink = { font: carlito, size: 8.2, color: MUTED };
  const verifyText = `Scan the code, or enter the number at minervaims.org/verify, to confirm this certificate: the page shows the name, the role and the semester as issued, and whether it is still valid.`;
  let vy = boxY + qrSize - 38;
  for (const line of wrap(verifyText, verifyInk, textW)) {
    draw(page, line, textX, vy, verifyInk);
    vy -= 11;
  }

  // ── The letterhead's foot ────────────────────────────────────────────
  page.drawLine({ start: { x: 60, y: 92 }, end: { x: W - 60, y: 92 }, thickness: 0.4, color: HAIR });
  const foot: Ink = { font: carlito, size: 7.2, color: SOFT };
  const independence = 'Minerva Investment Management Society is a student association at Bocconi University and operates independently of it. '
    + 'This certificate is issued by the Society, not by Bocconi University, and attests membership only: it confers no academic credit or qualification.';
  let fy = 79;
  for (const line of wrap(independence, foot, W - 140)) {
    centred(page, line, fy, foot);
    fy -= 9.5;
  }
  centred(page, 'minervaims.org  ·  as.minerva@unibocconi.it', fy - 4, { font: carlitoBold, size: 7.2, color: PURPLE, tracking: 0.6 });

  return await doc.save({ useObjectStreams: true });
}
