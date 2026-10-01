// =====================================================================
// A one-sheet Excel workbook, written in the browser.
// ---------------------------------------------------------------------
// An .xlsx file is a ZIP of a few XML parts. The workspace already
// writes ZIPs (lib/zip.ts), so a plain sheet needs no library: a header
// row in bold, text kept as text, numbers as numbers, the header frozen
// and the columns sized to what they hold. Opens in Excel, Numbers,
// LibreOffice and Google Sheets.
// =====================================================================

import { createZip } from '@/lib/zip';

export type Cell = string | number | boolean | null | undefined;

const enc = new TextEncoder();

function esc(s: string): string {
  return s
    // Characters XML 1.0 does not allow at all.
    // eslint-disable-next-line no-control-regex
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

/** "A", "B", ... "Z", "AA", ... for a 0-based column. */
function colName(i: number): string {
  let n = i + 1; let s = '';
  while (n > 0) { const r = (n - 1) % 26; s = String.fromCharCode(65 + r) + s; n = Math.floor((n - 1) / 26); }
  return s;
}

function cellXml(ref: string, v: Cell, header: boolean): string {
  const style = header ? ' s="1"' : ' s="2"';
  if (v === null || v === undefined || v === '') return `<c r="${ref}"${style}/>`;
  if (typeof v === 'number' && Number.isFinite(v)) return `<c r="${ref}"${header ? ' s="1"' : ''}><v>${v}</v></c>`;
  if (typeof v === 'boolean') return `<c r="${ref}" t="inlineStr"${style}><is><t>${v ? 'Yes' : 'No'}</t></is></c>`;
  return `<c r="${ref}" t="inlineStr"${style}><is><t xml:space="preserve">${esc(String(v))}</t></is></c>`;
}

/** The workbook as a Blob, ready for downloadBlob. */
export function buildXlsx(sheetName: string, header: string[], rows: Cell[][]): Blob {
  const widths = header.map((h, i) => {
    const longest = Math.max(String(h).length, ...rows.slice(0, 500).map((r) => String(r[i] ?? '').split('\n')[0].length));
    return Math.min(60, Math.max(10, longest + 2));
  });
  const sheetRows = [header, ...rows].map((r, ri) =>
    `<row r="${ri + 1}">${r.map((v, ci) => cellXml(`${colName(ci)}${ri + 1}`, v, ri === 0)).join('')}</row>`,
  ).join('');
  const sheet = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
<sheetViews><sheetView workbookViewId="0"><pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews>
<cols>${widths.map((w, i) => `<col min="${i + 1}" max="${i + 1}" width="${w}" customWidth="1"/>`).join('')}</cols>
<sheetData>${sheetRows}</sheetData>
${header.length ? `<autoFilter ref="A1:${colName(header.length - 1)}${rows.length + 1}"/>` : ''}
</worksheet>`;
  const name = esc(sheetName.replace(/[\\/?*[\]:]/g, ' ').slice(0, 31) || 'Answers');
  const files: [string, string][] = [
    ['[Content_Types].xml', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
<Default Extension="xml" ContentType="application/xml"/>
<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>
<Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>
<Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>
</Types>`],
    ['_rels/.rels', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>
</Relationships>`],
    ['xl/workbook.xml', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
<sheets><sheet name="${name}" sheetId="1" r:id="rId1"/></sheets>
${header.length ? `<definedNames><definedName name="_xlnm._FilterDatabase" localSheetId="0" hidden="1">'${name.replace(/'/g, "''")}'!$A$1:$${colName(header.length - 1)}$${rows.length + 1}</definedName></definedNames>` : ''}
</workbook>`],
    ['xl/_rels/workbook.xml.rels', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/>
<Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>
</Relationships>`],
    ['xl/styles.xml', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
<fonts count="2"><font><sz val="11"/><name val="Calibri"/></font><font><b/><sz val="11"/><name val="Calibri"/></font></fonts>
<fills count="2"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill></fills>
<borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders>
<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>
<cellXfs count="3"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/><xf numFmtId="0" fontId="1" fillId="0" borderId="0" xfId="0" applyFont="1"/><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0" applyAlignment="1"><alignment vertical="top" wrapText="1"/></xf></cellXfs>
</styleSheet>`],
    ['xl/worksheets/sheet1.xml', sheet],
  ];
  return createZip(files.map(([n, x]) => ({ name: n, data: enc.encode(x) })));
}

/** The same table as CSV, with the byte-order mark Excel needs for accents. */
export function buildCsv(header: string[], rows: Cell[][]): Blob {
  const q = (v: Cell) => {
    let s = v === null || v === undefined ? '' : typeof v === 'boolean' ? (v ? 'Yes' : 'No') : String(v);
    // A TYPED ANSWER MUST NOT RUN AS A FORMULA. Text that starts with = + -
    // @ (or a tab or return) is read by spreadsheet programs as a formula,
    // so an answer such as =HYPERLINK(...) would act when an organiser opens
    // the file. A leading apostrophe keeps it as text. Numbers are left
    // alone, and so is text made only of digits and phone punctuation,
    // such as +39 347 123 4567, which cannot be a formula.
    if (typeof v === 'string' && /^[-=+@\t\r]/.test(s) && !/^[-+]?[\d\s().-]+$/.test(s)) s = `'${s}`;
    return /[",\n\r;]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const body = [header, ...rows].map((r) => r.map(q).join(',')).join('\r\n');
  return new Blob(['﻿', body], { type: 'text/csv;charset=utf-8' });
}
