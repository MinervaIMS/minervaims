// =====================================================================
// Reading a meeting's attendance report (Microsoft Teams, and the like).
// ---------------------------------------------------------------------
// Teams lets the organiser of a meeting download who joined, as a CSV
// file. This turns that file into a list of people (name, email, how long
// they stayed), to be matched to members and guests in Attendance.
//
// THE FILE IS NOT A FIXED FORMAT, so nothing here depends on a column
// sitting in a given place or a section having a given number:
//
//   * The text is decoded by what it is: UTF-16 (what Teams writes, with
//     or without its byte-order mark), UTF-8, or Windows-1252 as a last
//     resort.
//   * The separator is found, not assumed: tab (Teams), comma or
//     semicolon (the file re-saved by Excel), with quoted cells read as
//     quoted cells.
//   * Header rows are recognised by their names, in English and Italian
//     and with the usual variants ("Name", "Full Name", "Participant";
//     "Email", "Participant ID (UPN)"; "First Join", "Join Time",
//     "Timestamp"), wherever they are in the file. Every table under such
//     a header is read: Teams' Participants list and its In-Meeting
//     Activities (one row per time somebody joined), or the older single
//     list of joins and leaves.
//   * A name split into first name and surname columns is put together.
//   * A person who appears more than once (rejoined, two devices, in two
//     sections) is one person, with their earliest join, latest leave
//     and the time in the meeting the report gives (or the sum of their
//     visits where it gives none).
//   * Names are cleaned: "(Unverified)", "(External)", "(Guest)" and the
//     like are taken off and noted, NAMES IN CAPITALS are written as
//     names, and "Surname, Name" is turned round. An email a guest's
//     account hides as "name_gmail.com#EXT#@tenant" is recovered.
//
// What it cannot read, it says, in words a person can act on. It never
// guesses a person's identity: that is the matching's job, on the server.
// =====================================================================

export interface ReportPerson {
  /** The name to show, cleaned. */
  name: string;
  /** Lower case, or null when the report gives none. */
  email: string | null;
  /** As the report writes them, for display only. */
  firstJoin: string | null;
  lastLeave: string | null;
  /** Time in the meeting, in seconds, when the report says. */
  seconds: number | null;
  /** Organiser, Presenter, Attendee... as the report says. */
  role: string | null;
  /** Teams marked the name as not verified (a guest typing their own name). */
  unverified: boolean;
  /** A phone number dialling in, not a person's name. */
  phone: boolean;
}

export interface ParsedReport {
  /** The meeting as the report describes it. */
  meeting: { title: string | null; start: string | null; end: string | null; attendees: number | null };
  people: ReportPerson[];
  /** Things worth telling the person importing, in plain words. */
  notes: string[];
}

export class ReportError extends Error {}

/** How many people one report may hold. */
export const REPORT_MAX_PEOPLE = 1000;
/** The largest file read, in bytes. */
export const REPORT_MAX_BYTES = 5 * 1024 * 1024;

// ---------------------------------------------------------------------
// Text
// ---------------------------------------------------------------------

/** The file's text, whatever it was written in. */
export function decodeReport(bytes: Uint8Array): string {
  if (bytes.length === 0) throw new ReportError('The file is empty.');
  if (bytes.length > REPORT_MAX_BYTES) throw new ReportError('The file is larger than 5 MB: this is not an attendance report.');
  // A spreadsheet or a zip: not a CSV.
  if (bytes[0] === 0x50 && bytes[1] === 0x4b) {
    throw new ReportError('This is an Excel file. In Teams, download the attendance report as it comes (a .csv file), or in Excel use Save As and choose CSV.');
  }
  if (bytes[0] === 0x25 && bytes[1] === 0x50 && bytes[2] === 0x44 && bytes[3] === 0x46) {
    throw new ReportError('This is a PDF. Download the attendance report from Teams as a .csv file.');
  }
  let encoding = 'utf-8';
  let start = 0;
  if (bytes[0] === 0xff && bytes[1] === 0xfe) { encoding = 'utf-16le'; start = 2; }
  else if (bytes[0] === 0xfe && bytes[1] === 0xff) { encoding = 'utf-16be'; start = 2; }
  else if (bytes[0] === 0xef && bytes[1] === 0xbb && bytes[2] === 0xbf) { encoding = 'utf-8'; start = 3; }
  else {
    // No mark: UTF-16 shows itself as a zero byte in every other place.
    const n = Math.min(bytes.length, 2000);
    let evenZero = 0;
    let oddZero = 0;
    for (let i = 0; i < n; i++) if (bytes[i] === 0) { if (i % 2 === 0) evenZero++; else oddZero++; }
    if (oddZero > n / 4 && evenZero < n / 50) encoding = 'utf-16le';
    else if (evenZero > n / 4 && oddZero < n / 50) encoding = 'utf-16be';
  }
  const body = bytes.subarray(start);
  if (encoding === 'utf-8') {
    try { return new TextDecoder('utf-8', { fatal: true }).decode(body); }
    // Not valid UTF-8: an older Excel on Windows writes Windows-1252.
    catch { return new TextDecoder('windows-1252').decode(body); }
  }
  return new TextDecoder(encoding).decode(body);
}

/** Rows of cells, quotes respected, for one separator. */
function splitRows(text: string, sep: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = '';
  let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (quoted) {
      if (ch === '"') {
        if (text[i + 1] === '"') { cell += '"'; i++; } else quoted = false;
      } else cell += ch;
      continue;
    }
    if (ch === '"' && cell.trim() === '') { quoted = true; cell = ''; continue; }
    if (ch === sep) { row.push(cell); cell = ''; continue; }
    if (ch === '\r' || ch === '\n') {
      // "\r\n" is one break, and so is "\r\r\n" (a file converted twice).
      if (ch === '\r') { while (text[i + 1] === '\r') i++; if (text[i + 1] === '\n') i++; }
      row.push(cell); rows.push(row); row = []; cell = '';
      continue;
    }
    cell += ch;
  }
  if (cell !== '' || row.length) { row.push(cell); rows.push(row); }
  return rows.map((r) => r.map((c) => c.replace(/\u00a0/g, ' ').trim()));
}

/** The separator the file uses: the one that splits most lines, tab first. */
function findSeparator(text: string): string {
  const lines = text.split(/\r\n|\n|\r/).slice(0, 80).filter((l) => l.trim());
  const score = (sep: string) => lines.filter((l) => l.split(sep).length > 1).length;
  const tab = score('\t');
  if (tab >= Math.max(2, lines.length / 4)) return '\t';
  const semi = score(';');
  const comma = score(',');
  return semi > comma ? ';' : comma > 0 ? ',' : '\t';
}

// ---------------------------------------------------------------------
// Headers
// ---------------------------------------------------------------------

/** A header cell reduced to plain words: "In-Meeting Duration" -> "in meeting duration". */
const headerKey = (s: string) => s.normalize('NFKD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();

type Col = 'name' | 'first' | 'last' | 'email' | 'upn' | 'join' | 'leave' | 'duration' | 'role' | 'action' | 'timestamp';

const HEADERS: Record<Col, string[]> = {
  name: ['name', 'full name', 'participant', 'participant name', 'display name', 'attendee', 'attendee name', 'user', 'user name', 'name original name',
    'nome', 'nome completo', 'nome partecipante', 'partecipante', 'nom', 'nom complet', 'nombre', 'nombre completo', 'teilnehmer', 'vollstandiger name'],
  first: ['first name', 'given name', 'firstname', 'nome di battesimo', 'prenom', 'vorname'],
  last: ['last name', 'surname', 'family name', 'lastname', 'cognome', 'nom de famille', 'apellido', 'apellidos', 'nachname'],
  email: ['email', 'e mail', 'email address', 'e mail address', 'mail', 'user email', 'attendee email', 'participant email', 'indirizzo email', 'indirizzo e mail', 'posta elettronica', 'adresse e mail', 'correo', 'correo electronico'],
  upn: ['participant id upn', 'participant id', 'upn', 'user principal name', 'id partecipante upn', 'id partecipante'],
  join: ['first join', 'first join time', 'join time', 'joined', 'join', 'joined at', 'time joined', 'primo accesso', 'primo ingresso', 'ora di ingresso', 'ora ingresso', 'ingresso', 'entrata'],
  leave: ['last leave', 'last leave time', 'leave time', 'left', 'left at', 'time left', 'ultima uscita', 'ora di uscita', 'ora uscita', 'uscita'],
  duration: ['in meeting duration', 'duration', 'attendance duration', 'time in meeting', 'total duration', 'durata', 'durata nella riunione', 'durata partecipazione', 'duree'],
  role: ['role', 'ruolo', 'rol', 'rolle'],
  action: ['user action', 'action', 'azione utente', 'azione'],
  timestamp: ['timestamp', 'time', 'date time', 'data e ora', 'ora'],
};

/** Which column is which, if this row is a header. A note in brackets ("Duration (Minutes)") is read both with and without. */
function readHeader(row: string[]): Partial<Record<Col, number>> | null {
  const found: Partial<Record<Col, number>> = {};
  row.forEach((cell, i) => {
    const keys = [headerKey(cell), headerKey(cell.replace(/\([^)]*\)/g, ' '))].filter(Boolean);
    if (!keys.length) return;
    for (const col of Object.keys(HEADERS) as Col[]) {
      if (found[col] === undefined && keys.some((k) => HEADERS[col].includes(k))) { found[col] = i; return; }
    }
  });
  const hasName = found.name !== undefined || (found.first !== undefined && found.last !== undefined);
  const support = ['email', 'upn', 'join', 'leave', 'duration', 'role', 'action', 'timestamp'].filter((c) => found[c as Col] !== undefined).length;
  // A name and at least one other column of a people table.
  return hasName && support >= 1 ? found : null;
}

// ---------------------------------------------------------------------
// Values
// ---------------------------------------------------------------------

const EMAIL_RE = /^[^\s@,;<>()"]+@[^\s@,;<>()"]+\.[a-z]{2,}$/i;

/** An address as written in a report, or null if it is not one. */
export function cleanEmail(raw: string | null | undefined): string | null {
  let e = (raw || '').trim().replace(/^mailto:/i, '').replace(/^<|>$/g, '').toLowerCase();
  if (!e) return null;
  // A guest's account in another organisation: "name_gmail.com#ext#@tenant.onmicrosoft.com".
  const ext = e.match(/^(.+)#ext#@/i);
  if (ext) {
    const local = ext[1];
    const at = local.lastIndexOf('_');
    e = at > 0 ? `${local.slice(0, at)}@${local.slice(at + 1)}` : '';
  }
  return EMAIL_RE.test(e) ? e : null;
}

/** Tags Teams adds after a name. */
const TAG_RE = /\s*\(([^()]{1,40})\)\s*$/;
const UNVERIFIED_RE = /unverified|non verificat|not verified|no verificad|nicht verifiziert/i;

/** "RICCARDO COLOMBO" -> "Riccardo Colombo"; "D'ANDRILLI" -> "D'Andrilli". Mixed case is left alone. */
function nameCase(s: string): string {
  if (/\p{Ll}/u.test(s)) return s;
  return s.toLowerCase().replace(/(^|[\s'’\-.])(\p{L})/gu, (_m, b: string, c: string) => b + c.toUpperCase());
}

/** A name as written in a report, cleaned; and whether Teams marked it unverified. */
export function cleanName(raw: string | null | undefined): { name: string; unverified: boolean } {
  let s = (raw || '').replace(/\s+/g, ' ').trim();
  let unverified = false;
  // Every trailing tag: "(Unverified)", "(External)", "(Guest)", "(Ospite)".
  for (let i = 0; i < 3; i++) {
    const m = s.match(TAG_RE);
    if (!m || m.index === 0) break;
    if (UNVERIFIED_RE.test(m[1])) unverified = true;
    s = s.slice(0, m.index).trim();
  }
  // "Colombo, Riccardo" -> "Riccardo Colombo".
  const parts = s.split(',');
  if (parts.length === 2 && parts[0].trim() && parts[1].trim()) s = `${parts[1].trim()} ${parts[0].trim()}`;
  return { name: nameCase(s), unverified };
}

/**
 * "1h 2m 51s", "57m 46s", "45s", "01:02:51", "62 min" -> seconds. A bare
 * number is read in the unit its column names ("Duration (Minutes)").
 */
export function durationSeconds(raw: string | null | undefined, unit: 'minutes' | 'seconds' | 'hours' | null = null): number | null {
  const s = (raw || '').trim().toLowerCase();
  if (!s) return null;
  if (/^\d+(?:[.,]\d+)?$/.test(s) && unit) {
    const n = Number(s.replace(',', '.'));
    return Math.round(unit === 'hours' ? n * 3600 : unit === 'minutes' ? n * 60 : n);
  }
  const clock = s.match(/^(\d{1,3}):(\d{2})(?::(\d{2}))?$/);
  if (clock) return clock[3] !== undefined ? Number(clock[1]) * 3600 + Number(clock[2]) * 60 + Number(clock[3]) : Number(clock[1]) * 60 + Number(clock[2]);
  let total = 0;
  let any = false;
  for (const m of s.matchAll(/(\d+(?:[.,]\d+)?)\s*(h|hr|hrs|hour|hours|ora|ore|m|min|mins|minute|minutes|minuto|minuti|s|sec|secs|second|seconds|secondo|secondi)\b/g)) {
    const n = Number(m[1].replace(',', '.'));
    const u = m[2];
    any = true;
    total += u.startsWith('h') || u.startsWith('or') ? n * 3600 : u.startsWith('m') ? n * 60 : n;
  }
  return any ? Math.round(total) : null;
}

/** A name that is really a phone number dialling in. */
const isPhone = (s: string) => /^[+\d][\d\s().\-*x#]{5,}$/.test(s.trim()) && (s.match(/\d/g) || []).length >= 6;

/** The words a name is matched on: accents, case, punctuation and order set aside. */
export function nameKey(s: string): string {
  return s.normalize('NFKD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9\s]/g, ' ').split(/\s+/).filter(Boolean).sort().join(' ');
}

// ---------------------------------------------------------------------
// The report
// ---------------------------------------------------------------------

const SUMMARY: Record<'title' | 'start' | 'end' | 'attendees', string[]> = {
  title: ['meeting title', 'title', 'meeting name', 'titolo riunione', 'titolo della riunione', 'titolo', 'nome riunione'],
  start: ['start time', 'meeting start time', 'start', 'ora di inizio', 'ora inizio', 'inizio', 'inizio riunione'],
  end: ['end time', 'meeting end time', 'end', 'ora di fine', 'ora fine', 'fine', 'fine riunione'],
  attendees: ['attended participants', 'total number of participants', 'participants', 'partecipanti', 'numero di partecipanti', 'partecipanti presenti'],
};

/** A section title such as "2. Participants" (one cell, numbered). */
const isSectionTitle = (row: string[]) => row.filter(Boolean).length === 1 && /^\d+\.\s+\S/.test(row.find(Boolean) || '');

export function parseReport(text: string): ParsedReport {
  const sep = findSeparator(text);
  const rows = splitRows(text, sep);
  const meeting: ParsedReport['meeting'] = { title: null, start: null, end: null, attendees: null };
  const notes: string[] = [];

  // People by key, in the order they first appear.
  const byKey = new Map<string, ReportPerson & { visits: number; summed: number; fromList: boolean }>();
  const order: string[] = [];
  let tables = 0;

  let header: Partial<Record<Col, number>> | null = null;
  let headerIsActivity = false;
  let durUnit: 'minutes' | 'seconds' | 'hours' | null = null;
  for (const row of rows) {
    const cells = row.filter((c) => c !== '');
    if (cells.length === 0 || isSectionTitle(row)) { header = null; continue; }
    const h = readHeader(row);
    if (h) {
      header = h;
      tables++;
      // A list of every join (Teams' In-Meeting Activities, or the older
      // join/leave list), as opposed to one row per person.
      headerIsActivity = h.action !== undefined || (h.join !== undefined && h.leave !== undefined && headerKey(row[h.join] || '').includes('join time'));
      const dk = h.duration !== undefined ? headerKey(row[h.duration] || '') : '';
      durUnit = /minut/.test(dk) ? 'minutes' : /second|secondi/.test(dk) ? 'seconds' : /hour|\bore\b/.test(dk) ? 'hours' : null;
      continue;
    }
    if (!header) {
      // Summary lines: "Meeting title<TAB>...".
      if (cells.length >= 2) {
        const k = headerKey(row[0] || '');
        const v = (row.slice(1).find(Boolean) || '').trim();
        if (SUMMARY.title.includes(k) && !meeting.title) meeting.title = v;
        else if (SUMMARY.start.includes(k) && !meeting.start) meeting.start = v;
        else if (SUMMARY.end.includes(k) && !meeting.end) meeting.end = v;
        else if (SUMMARY.attendees.includes(k) && meeting.attendees === null && /^\d+$/.test(v)) meeting.attendees = Number(v);
      }
      continue;
    }
    const at = (c: Col) => (header![c] !== undefined ? (row[header![c]!] ?? '').trim() : '');
    // The older list says who left as well as who joined: only joins count.
    if (header.action !== undefined && /\b(left|uscit|leave)\b/i.test(at('action'))) continue;
    const rawName = at('name') || [at('first'), at('last')].filter(Boolean).join(' ');
    const { name, unverified } = cleanName(rawName);
    const email = cleanEmail(at('email')) ?? cleanEmail(at('upn'));
    if (!name && !email) continue;
    const phone = !email && isPhone(name);
    const key = email ? `e:${email}` : `n:${nameKey(name)}`;
    const join = at('join') || at('timestamp') || null;
    const leave = at('leave') || null;
    const secs = durationSeconds(at('duration'), durUnit);
    const known = byKey.get(key);
    if (known) {
      known.visits++;
      if (!known.firstJoin && join) known.firstJoin = join;
      if (leave) known.lastLeave = leave;
      if (headerIsActivity) known.summed += secs ?? 0;
      else if (secs !== null) { known.seconds = Math.max(known.seconds ?? 0, secs); known.fromList = true; }
      if (!known.role && at('role')) known.role = at('role');
      if (unverified) known.unverified = true;
      if (!/\p{Ll}/u.test(known.name) && /\p{Ll}/u.test(name)) known.name = name;
      continue;
    }
    byKey.set(key, {
      name: name || email!, email, firstJoin: join, lastLeave: leave,
      seconds: headerIsActivity ? null : secs, role: at('role') || null, unverified, phone,
      visits: 1, summed: headerIsActivity ? secs ?? 0 : 0, fromList: !headerIsActivity && secs !== null,
    });
    order.push(key);
  }

  if (tables === 0) {
    throw new ReportError('No list of participants was found in this file. Use the attendance report Teams gives the organiser of the meeting (in the meeting chat or in the meeting\'s Attendance tab, Download).');
  }

  // Somebody listed once with an address and once without (two devices):
  // one person. Only when the name points at exactly one address.
  const emailByName = new Map<string, string | null>();
  for (const k of order) {
    const p = byKey.get(k)!;
    if (!p.email) continue;
    const n = nameKey(p.name);
    emailByName.set(n, emailByName.has(n) && emailByName.get(n) !== p.email ? null : p.email);
  }
  const people: ReportPerson[] = [];
  for (const k of order) {
    const p = byKey.get(k)!;
    if (!p.email) {
      const e = emailByName.get(nameKey(p.name));
      const twin = e ? byKey.get(`e:${e}`) : undefined;
      if (twin) {
        twin.summed += p.summed;
        if (p.seconds !== null) twin.seconds = Math.max(twin.seconds ?? 0, p.seconds);
        continue;
      }
    }
    const seconds = p.fromList ? p.seconds : p.summed > 0 ? p.summed : p.seconds;
    people.push({ name: p.name, email: p.email, firstJoin: p.firstJoin, lastLeave: p.lastLeave, seconds, role: p.role, unverified: p.unverified, phone: p.phone });
  }

  if (people.length === 0) throw new ReportError('The list of participants in this file is empty.');
  if (people.length > REPORT_MAX_PEOPLE) throw new ReportError(`This report lists more than ${REPORT_MAX_PEOPLE} people, more than one meeting can record at once.`);
  if (meeting.attendees !== null && meeting.attendees !== people.length) {
    notes.push(`The report says ${meeting.attendees} people attended; ${people.length} different people were read from it.`);
  }
  const noEmail = people.filter((p) => !p.email).length;
  if (noEmail) notes.push(`${noEmail} ${noEmail === 1 ? 'person has' : 'people have'} no email in the report (guests who joined from a link, usually): they are matched by name only.`);
  return { meeting, people, notes };
}

/** A file, read as a report. */
export async function readReportFile(file: File): Promise<ParsedReport> {
  if (file.size > REPORT_MAX_BYTES) throw new ReportError('The file is larger than 5 MB: this is not an attendance report.');
  const bytes = new Uint8Array(await file.arrayBuffer());
  return parseReport(decodeReport(bytes));
}

/** "1h 2m", "57m", "45s". */
export function formatSeconds(s: number | null): string {
  if (s === null) return '';
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  if (h) return `${h}h ${m}m`;
  if (m) return `${m}m`;
  return `${s}s`;
}

/**
 * The day a report's start time falls on, as YYYY-MM-DD, if it can be
 * read. Teams writes the date in the organiser's locale ("10/10/26,
 * 2:47:47 PM" or "10/10/2026 14:47"), so only an unambiguous reading is
 * returned: day and month must be told apart by a value over 12, or be
 * equal, or the event's own date must be one of the two readings.
 */
export function reportDay(start: string | null, eventDate?: string | null): string | null {
  const s = (start || '').trim();
  const iso = s.match(/(\d{4})-(\d{2})-(\d{2})/);
  if (iso) return `${iso[1]}-${iso[2]}-${iso[3]}`;
  const m = s.match(/(\d{1,2})[/.-](\d{1,2})[/.-](\d{2,4})/);
  if (!m) return null;
  const a = Number(m[1]);
  const b = Number(m[2]);
  const y = m[3].length === 2 ? 2000 + Number(m[3]) : Number(m[3]);
  const fmt = (mo: number, d: number) => (mo >= 1 && mo <= 12 && d >= 1 && d <= 31 ? `${y}-${String(mo).padStart(2, '0')}-${String(d).padStart(2, '0')}` : null);
  const us = fmt(a, b); // month first
  const eu = fmt(b, a); // day first
  if (us && eu && us !== eu) {
    if (eventDate && (us === eventDate || eu === eventDate)) return eventDate;
    return null;
  }
  return us ?? eu;
}
