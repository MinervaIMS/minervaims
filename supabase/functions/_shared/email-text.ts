// =====================================================================
// email-text: the plain-text part of an email, written from its HTML.
// ---------------------------------------------------------------------
// Every email goes out as HTML and text. The text used to be the HTML with
// its tags removed: no line breaks where they belong, every link lost, and
// entity codes left in. Mail filters read a text part that does not match
// its HTML as a warning sign, and readers who see the text see nonsense.
//
// This reads the layout's own hooks (email-layout.ts): the preview line is
// dropped, a key fact reads "When: Thursday...", the button reads
// "Add to calendar: https://...", a link reads "label (address)", and the
// paragraphs keep their breaks. public.email_html_to_text in the database
// is the same function step for step (Step 96 migration), and a test keeps
// the two identical; change both together.
// =====================================================================

const A_END = '\u0001';
const C_END = '\u0002';
const S_END = '\u0003';

const ENTITIES: Array<[string, string]> = [
  ['&nbsp;', ' '], ['&#8199;', ''], ['&#65279;', ''], ['&#847;', ''], ['&zwnj;', ''],
  ['&rsquo;', "'"], ['&lsquo;', "'"], ['&#39;', "'"], ['&ldquo;', '"'], ['&rdquo;', '"'], ['&quot;', '"'],
  ['&middot;', '·'], ['&rarr;', '→'], ['&times;', '×'], ['&euro;', '€'], ['&hellip;', '...'],
  ['&ndash;', '-'], ['&mdash;', '-'], ['&#10003;', '✓'], ['&copy;', '©'], ['&lt;', '<'], ['&gt;', '>'],
  ['&amp;', '&'],
];

export function emailText(html: string): string {
  let s = String(html ?? '');
  const open = s.indexOf('<body');
  if (open >= 0) s = s.slice(s.indexOf('>', open) + 1);
  const close = s.indexOf('</body>');
  if (close >= 0) s = s.slice(0, close);
  s = s.split('-->').join(C_END).replace(new RegExp(`<!--[^${C_END}]*${C_END}`, 'g'), '');
  s = s.split('</style>').join(S_END).replace(new RegExp(`<style[^>]*>[^${S_END}]*${S_END}`, 'g'), '');
  s = s.replace(/<div class="m-pre"[^>]*>[^<]*<\/div>/g, '');
  s = s.split('</a>').join(A_END);
  s = s.replace(new RegExp(`<a class="m-btn-a" href="([^"]*)"[^>]*>([^${A_END}]*)${A_END}`, 'g'), '\n$2: $1\n');
  s = s.replace(new RegExp(`<a [^>]*href="mailto:([^"]*)"[^>]*>([^${A_END}]*)${A_END}`, 'g'), '$2 ($1)');
  s = s.replace(new RegExp(`<a [^>]*href="([^"]*)"[^>]*>([^${A_END}]*)${A_END}`, 'g'), '$2 ($1)');
  s = s.split(A_END).join('');
  s = s.replace(/([^ \t\n()]+) \(\1\)/g, '$1');
  s = s.replace(/<td class="m-kv-l[^"]*"[^>]*>([^<]*)<\/td>/g, '$1: ');
  s = s.split('</td>').join(' ');
  s = s.replace(/<br[^>]*>/g, '\n');
  s = s.replace(/<\/(p|h1|h2|h3|tr|li|div|table)>/g, '\n');
  s = s.replace(/<[^>]+>/g, '');
  for (const [from, to] of ENTITIES) s = s.split(from).join(to);
  s = s.split('\r').join('');
  s = s.replace(/[ \t\u00a0]+/g, ' ');
  s = s.replace(/ *\n */g, '\n');
  s = s.replace(/\n{3,}/g, '\n\n');
  return s.trim();
}
