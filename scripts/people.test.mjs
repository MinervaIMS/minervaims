// =====================================================================
// people.test.mjs: rosters, the Board, person codes and the Society's
// name (Step 94).
// ---------------------------------------------------------------------
//   node --test scripts/people.test.mjs
//
// Pure checks on the sources, no database and no network:
//   * the rosters module is one file in two places, and its Board offices
//     are the database's own list (public.roster_office_rank);
//   * the Members page's structured data is a valid schema.org Person for
//     each Board member shown, and states nothing the page does not;
//   * person codes have one form, from one alphabet;
//   * the migration backs up before it changes, never deletes, imports
//     the history once, and never lists an expelled member;
//   * the Rosters subsection is granted alike in the browser and the
//     server copies of the access matrix;
//   * the Privacy Policy carries the wording the President approved;
//   * the Society is named in exactly three forms, everywhere.
// =====================================================================

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const ROOT = join(fileURLToPath(import.meta.url), '..', '..');
const read = (p) => readFileSync(join(ROOT, p), 'utf8');
const require = createRequire(import.meta.url);
const { transformSync } = require(join(ROOT, 'node_modules', 'esbuild'));
const load = async (p) => import('data:text/javascript;base64,'
  + Buffer.from(transformSync(read(p), { loader: 'ts', format: 'esm' }).code).toString('base64'));

const MIGRATION = 'supabase/migrations/20261025090000_people_rosters.sql';
const rosters = await load('src/lib/rosters.ts');
const board = await load('src/lib/board.ts');

test('the rosters module is the same file for the browser and the edge functions', () => {
  assert.equal(read('supabase/functions/_shared/rosters.ts'), read('src/lib/rosters.ts'));
});

test("the Board's offices are the database's own list", () => {
  const sql = read(MIGRATION);
  const fn = sql.slice(sql.indexOf('FUNCTION public.roster_office_rank'), sql.indexOf('AS o (label, rank)'));
  const fromSql = [...fn.matchAll(/\('([^']+)', (\d+)\)/g)].map((m) => [m[1], Number(m[2])]);
  assert.ok(fromSql.length >= 20, `found ${fromSql.length} offices in the migration`);
  assert.deepEqual(fromSql, rosters.OFFICES);
  // Officers come before heads, and the heads follow the Statute's order.
  const rank = (label) => rosters.officeRank(label);
  assert.ok(rank('President') < rank('Vice President') && rank('Vice President') < rank('Head of Asset Management'));
  assert.ok(rank('Head of Asset Management') < 50 && rank('Head of Equity Research') >= 50);
  const statute = ['Head of Equity Research', 'Head of Investment Research', 'Head of Macro Research',
    'Head of Portfolio Management', 'Head of Quantitative Research', 'Head of Media & Communication', 'Head of Operations'];
  statute.reduce((prev, label) => { assert.ok(rank(label) > prev, `${label} out of order`); return rank(label); }, 0);
  assert.equal(rank('Advisor'), null);
  assert.equal(rank('Board Advisor'), null);
  assert.equal(rank('Head of Fixed Income'), null, 'a desk head is not on the Board');
});

test('the public Board and the roster agree on who is an officer and the order of heads', () => {
  const pairs = [['President', 'President'], ['Vice President', 'Vice President'], ['Head of Asset Management', 'Head of Asset Management'],
    ['Head of Equity Research', 'Head of Equity Research'], ['Head of Quantitative Research', 'Head of Quantitative Research'],
    ['Head of Media', 'Head of Media & Communication'], ['Head of Operations', 'Head of Operations']];
  let last = 0;
  for (const [position, office] of pairs) {
    assert.equal(board.officeLabel(position), office);
    assert.equal(board.officeRank(position) < 50, rosters.isOfficer(office), position);
    assert.ok(board.officeRank(position) > last, `${position} out of order`);
    last = board.officeRank(position);
  }
});

const MEMBERS = [
  { id: 'a1', name: 'Riccardo', surname: 'Colombo', position: 'President', linkedinUrl: 'https://www.linkedin.com/in/example-one/' },
  { id: 'a2', name: 'Michele', surname: 'Rinaldi', position: 'Vice President' },
  { id: 'a3', name: 'Anna', surname: 'Proturo', position: 'Head of Equity Research', linkedinUrl: 'https://it.linkedin.com/in/example-two' },
  { id: 'a4', name: 'Ops', surname: 'Head', position: 'Head of Operations', linkedinUrl: 'http://linkedin.com/in/not-https' },
  { id: 'a5', name: 'Media', surname: 'Head', position: 'Head of Media', linkedinUrl: 'https://example.com/not-linkedin' },
  { id: 'a6', name: 'An', surname: 'Advisor', position: 'Advisor', linkedinUrl: 'https://www.linkedin.com/in/advisor/' },
  { id: 'a7', name: 'An', surname: 'Analyst', position: 'Analyst' },
];
const OPTS = { siteUrl: 'https://minervaims.org', organizationId: 'https://minervaims.org/#organization', pagePath: '/people/members' };

test('JSON-LD: one valid schema.org Person per Board member shown, and nothing else', () => {
  const people = board.boardPersonsJsonLd(MEMBERS, OPTS);
  JSON.parse(JSON.stringify(people));
  assert.deepEqual(people.map((p) => p.name), ['Riccardo Colombo', 'Michele Rinaldi', 'Anna Proturo', 'Media Head', 'Ops Head']);
  const allowed = new Set(['@type', '@id', 'name', 'givenName', 'familyName', 'jobTitle', 'memberOf', 'sameAs']);
  const ids = new Set();
  for (const p of people) {
    assert.equal(p['@type'], 'Person');
    for (const k of Object.keys(p)) assert.ok(allowed.has(k), `unexpected property ${k}`);
    for (const k of ['image', 'email', 'telephone', 'address', 'birthDate']) assert.equal(p[k], undefined);
    assert.ok(typeof p.name === 'string' && p.name.length > 2 && p.name === `${p.givenName} ${p.familyName}`);
    assert.ok(typeof p.jobTitle === 'string' && p.jobTitle.length > 0);
    assert.deepEqual(p.memberOf, { '@id': OPTS.organizationId });
    assert.match(p['@id'], /^https:\/\/minervaims\.org\/people\/members#person-[a-z0-9]+$/);
    assert.ok(!ids.has(p['@id']), 'duplicate @id');
    ids.add(p['@id']);
    if (p.sameAs) {
      assert.ok(Array.isArray(p.sameAs) && p.sameAs.length === 1);
      assert.match(p.sameAs[0], /^https:\/\/([a-z0-9-]+\.)*linkedin\.com\//);
    }
  }
  // The office as the Statute names it, and LinkedIn only when it is a real https profile.
  assert.equal(people.find((p) => p.name === 'Media Head').jobTitle, 'Head of Media & Communication');
  assert.equal(people.find((p) => p.name === 'Ops Head').sameAs, undefined);
  assert.equal(people.find((p) => p.name === 'Media Head').sameAs, undefined);
  assert.equal(people.find((p) => p.name === 'Michele Rinaldi').sameAs, undefined);
  assert.equal(people.find((p) => p.name === 'Anna Proturo').sameAs[0], 'https://it.linkedin.com/in/example-two');
});

test('Board office ordering keeps advisors outside formal Board offices', () => {
  const g = board.boardGroups(MEMBERS);
  assert.deepEqual(g.officers.map((m) => m.surname), ['Colombo', 'Rinaldi']);
  assert.deepEqual(g.heads.map((m) => m.position), ['Head of Equity Research', 'Head of Media', 'Head of Operations']);
  assert.deepEqual(g.advisors.map((m) => m.surname), ['Advisor']);
});

test('person codes: one form, one alphabet with no I, L, O or U', () => {
  const sql = read(MIGRATION);
  const alphabet = sql.match(/v_alphabet constant text := '([0-9A-Z]+)'/)[1];
  assert.equal(alphabet.length, 32);
  assert.equal(new Set(alphabet).size, 32);
  for (const c of 'ILOU') assert.ok(!alphabet.includes(c), `the alphabet has ${c}`);
  const check = new RegExp(sql.match(/code ~ '(\^P-\[[^']+\]\{6\}\$)'/)[1]);
  for (const c of alphabet) assert.match(`P-${c.repeat(6)}`, check);
  for (const c of 'ILOU') assert.doesNotMatch(`P-${c.repeat(6)}`, check);
});

test('the migration backs up first, never deletes, imports the history once, and never lists an expelled member', () => {
  const sql = read(MIGRATION);
  const backup = sql.indexOf('CREATE TABLE IF NOT EXISTS public.alumni_backup_step94 AS TABLE public.alumni');
  const change = sql.indexOf('UPDATE public.alumni SET');
  assert.ok(backup > 0 && change > backup, 'the alumni directory is copied before it is changed');
  assert.doesNotMatch(sql, /DELETE FROM public\.(alumni|members|semester_members|people)\b/);
  assert.doesNotMatch(sql, /DROP TABLE/i);
  assert.match(sql, /IF NOT EXISTS \(SELECT 1 FROM public\.roster_entries WHERE source = 'history'\) THEN/);
  assert.match(sql, /ON CONFLICT \(person_id\) DO NOTHING/);
  assert.match(sql, /m\.membership_status = 'expelled'/);
  // Nobody may create or match a person through the API.
  for (const fn of ['person_create(text, text)', 'person_match(text, text, text)', 'person_for_member(uuid)', 'person_for_alumni(uuid)'])
    assert.ok(sql.includes(`REVOKE ALL ON FUNCTION public.${fn} FROM PUBLIC, anon, authenticated`), fn);
  // The tables are closed: every read goes through a function that checks the caller.
  for (const t of ['people', 'person_records', 'roster_entries', 'alumni_pending', 'alumni_backup_step94'])
    assert.ok(sql.includes(`REVOKE ALL ON public.${t} FROM anon, authenticated`), t);
});

test('Rosters is granted alike in the browser and server copies of the access matrix', () => {
  const browser = read('src/lib/access/matrix.ts');
  const server = read('supabase/functions/_shared/access.ts');
  // Each role's grants run from "  role: {" to the next role.
  const grants = (src) => {
    const out = {};
    const starts = [...src.matchAll(/^ {2}([a-z_]+): \{/gm)];
    starts.forEach((m, i) => {
      const block = src.slice(m.index, i + 1 < starts.length ? starts[i + 1].index : src.length);
      const g = block.match(/'people-rosters': '(\w+)'/);
      if (g) out[m[1]] = g[1];
    });
    return out;
  };
  const b = grants(browser);
  assert.deepEqual(grants(server), b);
  assert.equal(b.vice_president, 'manage');
  for (const role of ['analyst', 'senior_analyst', 'team_leader', 'portfolio_manager', 'head_of_division', 'head_of_operations', 'operations_analyst'])
    assert.equal(b[role], 'view', role);
  assert.equal(b.alumni, undefined, 'alumni do not open the rosters');
});

test('the Privacy Policy carries the approved wording (sections 8, 9 and 11)', () => {
  const policy = read('src/pages/PrivacyPolicy.tsx').replace(/\s+/g, ' ');
  for (const s of [
    'The Workspace keeps the roster of each semester since Fall 2019: name, role, division and team or fund.',
    'Each person who is or was a member receives a random internal code that links their membership, roster, alumni and certificate records',
    "Adding them is optional, and doing so is the member's consent to their publication (article 6(1)(a) GDPR).",
    'The same information is also published in the machine-readable form that search engines read (structured data), for the same people and with nothing added.',
    'For semester rosters from before the Workspace existed: the reports the association published and its internal records (member lists, organisation charts and board minutes).',
  ]) assert.ok(policy.includes(s), s);
});

// ---------------------------------------------------------------------
// THE NAME. "Minerva Investment Management Society", "MIMS" and
// "Minerva IMS", and no other form, in what the site, the emails, the
// PDFs, the structured data, llms.txt and the manifest say.
// ---------------------------------------------------------------------
const SCANNED = ['src', 'public', 'supabase/functions', 'index.html', 'vite.static-pages.ts', 'vite.key-numbers.ts'];
const TEXT = /\.(tsx?|mjs|js|html|txt|json|xml|md|webmanifest)$/;
function files(p) {
  const abs = join(ROOT, p);
  if (statSync(abs).isFile()) return [abs];
  return readdirSync(abs).flatMap((f) => (f === 'node_modules' ? [] : files(join(p, f))));
}
const WRONG = [
  [/Minerva Investment Management(?! Society)(?![-\w])/, 'the full name without "Society"'],
  // Not: a quoted truncation ("Minerva Investment...") or the email
  // header fragment the email code matches on, which ends at a backtick.
  [/Minerva Investments?\b(?! Management)(?!\.\.\.)(?!`)/, '"Minerva Investment(s)" alone'],
  [/Minerva Society\b/, '"Minerva Society"'],
  [/\bMIMS Society\b/, '"MIMS Society"'],
  [/Minerva I\.M\.S/, '"Minerva I.M.S."'],
  [/Minerva-IMS\b/, '"Minerva-IMS"'],
  [/Minerva Ims\b/, '"Minerva Ims"'],
  [/\bM\.I\.M\.S\b/, '"M.I.M.S."'],
  [/MinervaIMS(?!\/minervaims)/, '"MinervaIMS" outside the repository address'],
  [/Minerva IMS \| Minerva IMS/, 'the short name twice'],
];

test('the Society is named in exactly three forms, everywhere', () => {
  const problems = [];
  for (const f of SCANNED.flatMap(files).filter((f) => TEXT.test(f))) {
    // The name is often set on two lines (an email header's <br />, a
    // wrapped comment or JSX text): read it as one line before judging it.
    const text = readFileSync(f, 'utf8')
      .replace(/<br\s*\/?>/gi, ' ')
      .replace(/\s*\n\s*(?:\*(?!\/)|\/\/)?\s*/g, ' ');
    for (const [re, what] of WRONG) {
      const hits = text.match(new RegExp(re.source, 'g')) || [];
      if (hits.length) problems.push(`${relative(ROOT, f)}: ${what} (${hits.length})`);
    }
  }
  assert.deepEqual(problems, []);
});

test('the places the name is stated all state it the same way', () => {
  const site = read('src/lib/seo/site.ts');
  assert.match(site, /SITE_NAME = 'Minerva Investment Management Society'/);
  assert.match(site, /SITE_SHORT_NAME = 'MIMS'/);
  assert.match(site, /SITE_ALT_NAME = 'Minerva IMS'/);
  const manifest = JSON.parse(read('public/manifest.json'));
  assert.equal(manifest.name, 'Minerva Investment Management Society');
  assert.equal(manifest.short_name, 'MIMS');
  const sd = read('src/lib/seo/structured-data.ts');
  assert.equal((sd.match(/alternateName: \[SITE_SHORT_NAME, SITE_ALT_NAME\]/g) || []).length, 2, 'Organization and WebSite');
  const llms = read('public/llms.txt');
  assert.ok(llms.startsWith('# Minerva Investment Management Society'));
  assert.match(llms, /abbreviated MIMS, and also referred to as Minerva IMS/);
  assert.match(read('src/components/layout/Footer.tsx'), /Minerva Investment Management Society \(MIMS\)/);
  assert.match(read('src/lib/report-meta.ts'), /SOCIETY = 'Minerva Investment Management Society'/);
  assert.match(read('index.html'), /<title>Minerva Investment Management Society \| MIMS<\/title>/);
  assert.match(read('index.html'), /og:site_name" content="Minerva Investment Management Society"/);
  for (const pdf of ['supabase/functions/membership-certificate/pdf.ts', 'supabase/functions/admin-rosters/pdf.ts'])
    assert.match(read(pdf), /setAuthor\('Minerva Investment Management Society'\)/, pdf);
  assert.match(read('supabase/functions/_shared/email-subjects.ts'), /Minerva IMS/);
});
