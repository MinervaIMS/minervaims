// =====================================================================
// THE WEBSITE'S SEARCH: THE ENGINE (Step 107).
// ---------------------------------------------------------------------
// Pure: documents in, ranked results out, so the ranking can be tested
// on its own (scripts/site-search.test.mjs). What the documents are, and
// what each may show about a person, is site-search-data.ts.
//
// HOW A QUERY IS READ, as a reader expects of a good search box:
//   * case, accents and punctuation do not matter ("Société" = "societe",
//     "M&A" = "ma", "L/S" = "ls");
//   * every word must be found (in the title, the people, the words of the
//     page...), the last one as the beginning of a word, so results appear
//     while typing ("equ res" finds Equity Research);
//   * a mistyped word is still found when it is one letter away (two for a
//     long word): "portfollio", "goldmann", "quantitive";
//   * the usual short forms are understood: IB, PE, VC, ER, PM, LS, FAQ;
//   * small words ("the", "of", "and") are ignored unless they are all
//     there is.
// Where no document holds every word, the documents holding most of them
// are offered instead, marked as such, with a "did you mean" built from
// the words the site actually uses.
//
// RANKING. A word found in the title counts for more than one found in the
// people, which counts for more than one in the description; a title that
// begins with the whole query, or holds it, is lifted; then a small lift
// for what is recent or what is a main page. Fast enough to run on every
// key press over the whole site (well under a millisecond per document).
// =====================================================================

export type SearchKind = 'page' | 'person' | 'report' | 'event' | 'reading';

export interface SearchField {
  text: string;
  /** How much a word found here counts: 3 a title, 2 a name, 1 the body. */
  weight: number;
}

export interface SearchDoc {
  id: string;
  kind: SearchKind;
  title: string;
  /** The line under the title. */
  meta?: string;
  /** A longer text, searched, and shown as a snippet around the words found. */
  body?: string;
  href: string;
  fields: SearchField[];
  /** A small lift in the order (0 to 1): a main page, a recent report. */
  boost?: number;
  /** ISO date, newest first among equals. */
  date?: string | null;
}

export interface SearchHit {
  doc: SearchDoc;
  score: number;
  /** The words of the query this result holds (folded). */
  matched: string[];
  /** A short passage of the body around the first word found, when the title alone does not show why. */
  snippet: string | null;
}

export interface SearchResults {
  query: string;
  /** The words searched for, folded, small words left out. */
  terms: string[];
  hits: SearchHit[];
  /** True when no result held every word and these hold most of them. */
  partial: boolean;
  /** A corrected query built from the site's own words, when nothing was found. */
  suggestion: string | null;
}

interface PreparedField { tokens: string[]; weight: number }
interface PreparedDoc { doc: SearchDoc; fields: PreparedField[]; title: string; body: string }
export interface SearchIndex { docs: PreparedDoc[]; vocab: string[] }

// ---------------------------------------------------------------------
// Words.
// ---------------------------------------------------------------------
const STOP = new Set(['the', 'a', 'an', 'and', 'of', 'in', 'on', 'to', 'for', 'with', 'at', 'by', 'from', 'or', 'is', 'are', 'de', 'di', 'la', 'il']);

/** Lower case, no accents, "&" and "/" between two letters joined ("m&a" is "ma"), anything else a space. */
export function fold(s: string | null | undefined): string {
  return (s ?? '')
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/\b([a-z])\s?[&/]\s?([a-z])\b/g, '$1$2')
    .replace(/[’']/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

export const words = (s: string | null | undefined): string[] => {
  const f = fold(s);
  return f ? f.split(' ') : [];
};

/** The short forms a reader types, and what they stand for. */
const SHORT_FORMS: Record<string, string[]> = {
  ib: ['investment banking'],
  pe: ['private equity'],
  vc: ['venture capital'],
  er: ['equity research'],
  ir: ['investment research'],
  pm: ['portfolio management', 'portfolio manager'],
  qr: ['quantitative research'],
  ls: ['long short'],
  lse: ['long short equity'],
  mago: ['multi asset global opportunities'],
  dps: ['diversified passive selection'],
  pir: ['italian equity pir'],
  faq: ['questions'],
  faqs: ['questions'],
  cv: ['curriculum'],
  aod: ['association on display'],
  ma: ['mergers acquisitions'],
  am: ['asset management'],
  hf: ['hedge fund'],
  ecb: ['european central bank'],
  fed: ['federal reserve'],
};

// ---------------------------------------------------------------------
// The distance between two words, at most `max` (optimal string
// alignment: an exchange of two letters is one mistake). Infinity beyond.
// ---------------------------------------------------------------------
export function editDistance(a: string, b: string, max: number): number {
  if (Math.abs(a.length - b.length) > max) return Infinity;
  if (a === b) return 0;
  const n = b.length;
  let prev2: number[] = new Array(n + 1).fill(0);
  let prev: number[] = Array.from({ length: n + 1 }, (_, j) => j);
  for (let i = 1; i <= a.length; i++) {
    const cur: number[] = new Array(n + 1);
    cur[0] = i;
    let rowMin = cur[0];
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      let v = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + cost);
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) v = Math.min(v, prev2[j - 2] + 1);
      cur[j] = v;
      if (v < rowMin) rowMin = v;
    }
    if (rowMin > max) return Infinity;
    prev2 = prev;
    prev = cur;
  }
  return prev[n] <= max ? prev[n] : Infinity;
}

const allowedMistakes = (w: string) => (w.length >= 8 ? 2 : w.length >= 4 ? 1 : 0);

/** How well one query word is found in one word of a document (0 to 1). */
function wordScore(q: string, w: string, last: boolean, fuzzy: boolean): number {
  if (w === q) return 1;
  if (w.startsWith(q)) {
    // A word being typed is a beginning; a finished one needs two letters.
    if (q.length >= 2 || last) return 0.72 + 0.2 * (q.length / w.length);
    return 0;
  }
  if (/^\d+$/.test(q)) return 0; // a year or a number is exact, or a beginning
  if (q.length >= 4 && w.includes(q)) return 0.45;
  const max = allowedMistakes(q);
  // A mistake is looked for only in the words that matter (a title, a
  // name), and where the word starts the same way: a slip of the finger
  // rarely changes both of the first two letters.
  if (fuzzy && max > 0 && w.length >= 3 && (w[0] === q[0] || w[1] === q[1])) {
    const d = editDistance(q, w, max);
    if (d !== Infinity) return 0.62 - 0.12 * d;
    // A mistyped beginning: "portfol" for "portfolio" is a beginning, "potrfol" a mistyped one.
    if (last && w.length > q.length) {
      const d2 = editDistance(q, w.slice(0, q.length), 1);
      if (d2 !== Infinity) return 0.5;
    }
  }
  return 0;
}

/** The best score of one query word in a document, with the weight of the field it was found in. */
function termScore(q: string, d: PreparedDoc, last: boolean, exact = false): number {
  let best = 0;
  for (const f of d.fields) {
    for (const w of f.tokens) {
      const s = exact ? (w === q ? 1 : 0) : wordScore(q, w, last, f.weight >= 1);
      if (s > 0 && s * f.weight > best) best = s * f.weight;
      if (s === 1) break;
    }
  }
  return best;
}

/** The score of a query word, its short forms included (all the words of one form must be there). */
function termScoreWithForms(q: string, d: PreparedDoc, last: boolean, exact: boolean): number {
  let best = termScore(q, d, last, exact);
  for (const form of SHORT_FORMS[q] ?? []) {
    const parts = form.split(' ');
    let min = Infinity;
    for (const p of parts) {
      const s = termScore(p, d, false);
      if (s === 0) { min = 0; break; }
      if (s < min) min = s;
    }
    if (min !== Infinity && min * 0.95 > best) best = min * 0.95;
  }
  return best;
}

// ---------------------------------------------------------------------
// The index.
// ---------------------------------------------------------------------
export function buildIndex(docs: SearchDoc[]): SearchIndex {
  const vocab = new Set<string>();
  const prepared = docs.map((doc) => {
    const fields = doc.fields
      .filter((f) => f.text && f.weight > 0)
      .map((f) => {
        const tokens = [...new Set(words(f.text))];
        for (const t of tokens) if (t.length >= 3 && !/^\d+$/.test(t)) vocab.add(t);
        return { tokens, weight: f.weight };
      });
    return { doc, fields, title: fold(doc.title), body: doc.body ?? '' };
  });
  return { docs: prepared, vocab: [...vocab] };
}

/** The query's words, folded, the small ones left out unless they are all there is. */
export function queryTerms(query: string): string[] {
  const all = words(query);
  const kept = all.filter((w) => !STOP.has(w));
  return kept.length ? kept : all;
}

/** A passage of the body around the first query word found in it, about `size` characters. */
export function snippetOf(body: string, terms: string[], size = 150): string | null {
  if (!body || !terms.length) return null;
  const re = /[\p{L}\p{N}]+/gu;
  let m: RegExpExecArray | null;
  while ((m = re.exec(body))) {
    const w = fold(m[0]);
    if (terms.some((t) => w.startsWith(t) || (t.length >= 4 && editDistance(t, w, allowedMistakes(t)) !== Infinity))) {
      const start = Math.max(0, m.index - Math.floor(size / 3));
      let from = start === 0 ? 0 : body.indexOf(' ', start) + 1 || start;
      if (from > m.index) from = m.index;
      const end = Math.min(body.length, from + size);
      let to = end === body.length ? end : body.lastIndexOf(' ', end);
      if (to <= m.index) to = end;
      return `${from > 0 ? '…' : ''}${body.slice(from, to).replace(/\s+/g, ' ').trim()}${to < body.length ? '…' : ''}`;
    }
  }
  return null;
}

/**
 * Where to mark the query in a text: the ranges of the words that begin
 * with a query word (or are one mistake from it). Indexes into `text`.
 */
export function highlightRanges(text: string, terms: string[]): [number, number][] {
  const out: [number, number][] = [];
  if (!text || !terms.length) return out;
  const re = /[\p{L}\p{N}]+/gu;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text))) {
    const w = fold(m[0]);
    if (!w) continue;
    let len = 0;
    for (const t of terms) {
      if (w === t || w.startsWith(t)) len = Math.max(len, Math.min(m[0].length, t.length));
      else if (t.length >= 4 && editDistance(t, w, allowedMistakes(t)) !== Infinity) len = m[0].length;
    }
    if (len > 0) out.push([m.index, m.index + (len >= w.length ? m[0].length : len)]);
  }
  return out;
}

/** The query with each word not found anywhere replaced by the nearest word the site uses. */
function suggest(terms: string[], index: SearchIndex): string | null {
  let changed = false;
  const out = terms.map((t) => {
    if (t.length < 3 || /^\d+$/.test(t)) return t;
    if (index.vocab.some((v) => v.startsWith(t))) return t;
    let best: string | null = null;
    let bestD = Infinity;
    const max = t.length >= 6 ? 2 : 1;
    for (const v of index.vocab) {
      const d = editDistance(t, v, max);
      if (d < bestD || (d === bestD && best && v.length < best.length)) { best = v; bestD = d; }
    }
    if (best && bestD !== Infinity) { changed = true; return best; }
    return t;
  });
  return changed ? out.join(' ') : null;
}

/** The words typed as two letters joined by "&" or "/" ("M&A", "L/S"): found only as they are. */
export function exactTerms(query: string): Set<string> {
  return new Set([...query.matchAll(/(?:^|[^\p{L}\p{N}])([a-z])\s?[&/]\s?([a-z])(?![\p{L}\p{N}])/giu)].map((m) => `${m[1]}${m[2]}`.toLowerCase()));
}

/** Search the index. `limit` caps the hits returned (all kinds together). */
export function search(index: SearchIndex, query: string, limit = 60): SearchResults {
  const terms = queryTerms(query);
  const exact = exactTerms(query);
  const empty: SearchResults = { query, terms, hits: [], partial: false, suggestion: null };
  if (!terms.length) return empty;
  const phrase = terms.join(' ');
  const lastWordIsTyped = !/\s$/.test(query);

  const score = (d: PreparedDoc, needAll: boolean): SearchHit | null => {
    let total = 0;
    const matched: string[] = [];
    terms.forEach((t, i) => {
      const s = termScoreWithForms(t, d, lastWordIsTyped && i === terms.length - 1, exact.has(t));
      if (s > 0) { total += s; matched.push(t); }
    });
    const need = needAll ? terms.length : Math.max(1, Math.ceil(terms.length / 2));
    if (matched.length < need) return null;
    if (d.title === phrase) total += 4;
    else if (d.title.startsWith(phrase)) total += 2.5;
    else if (phrase.length >= 3 && ` ${d.title} `.includes(` ${phrase}`)) total += 1.5;
    total += (d.doc.boost ?? 0);
    if (!needAll) total *= 0.6;
    // A snippet when a word was found only in the body.
    const inTitle = matched.every((t) => words(d.doc.title).some((w) => w.startsWith(t)));
    return { doc: d.doc, score: total, matched, snippet: inTitle ? null : snippetOf(d.body, matched) };
  };

  const rank = (hits: SearchHit[]) => hits.sort((a, b) =>
    b.score - a.score || (b.doc.date ?? '').localeCompare(a.doc.date ?? '') || a.doc.title.localeCompare(b.doc.title));

  let hits = rank(index.docs.map((d) => score(d, true)).filter((h): h is SearchHit => h !== null));
  let partial = false;
  if (hits.length === 0 && terms.length > 1) {
    hits = rank(index.docs.map((d) => score(d, false)).filter((h): h is SearchHit => h !== null));
    partial = hits.length > 0;
  }
  const suggestion = hits.length === 0 || partial ? suggest(terms, index) : null;
  return { query, terms, hits: hits.slice(0, limit), partial, suggestion: suggestion && suggestion !== phrase ? suggestion : null };
}

/** The order the groups are shown in when their best results tie. */
export const KIND_ORDER: SearchKind[] = ['page', 'person', 'report', 'event', 'reading'];
export const KIND_LABELS: Record<SearchKind, string> = {
  page: 'Pages', person: 'People', report: 'Reports', event: 'Events', reading: 'Readings',
};

/** The results in groups, the group with the best result first. */
export function groupHits(hits: SearchHit[]): { kind: SearchKind; hits: SearchHit[] }[] {
  const groups = new Map<SearchKind, SearchHit[]>();
  for (const h of hits) {
    const g = groups.get(h.doc.kind) ?? [];
    g.push(h);
    groups.set(h.doc.kind, g);
  }
  return [...groups.entries()]
    .map(([kind, list]) => ({ kind, hits: list }))
    .sort((a, b) => b.hits[0].score - a.hits[0].score || KIND_ORDER.indexOf(a.kind) - KIND_ORDER.indexOf(b.kind));
}
