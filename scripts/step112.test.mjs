// =====================================================================
// STEP 112.
// ---------------------------------------------------------------------
// People > Network made simpler (one position, divisions as the groups,
// the President's and the Vice-President's ties to every member, Media &
// Operations as one division, no admin account, two scheduled runs and no
// button), the alumni career areas, the Society's acceptance rate on
// /about, the two advisors of Fall 2026, the report pages' note and band,
// the firms where alumni work in words, the Archive's covers, the legal
// pages' band, and the workspace's phone and page polish.
//
//   node --test scripts/step112.test.mjs
//   DIST=<built site> MIMS_PG=<psql connection> node --test scripts/step112.test.mjs
// =====================================================================

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, mkdirSync, readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { createRequire } from 'node:module';
import { execFileSync } from 'node:child_process';

const ROOT = join(fileURLToPath(import.meta.url), '..', '..');
const read = (p) => readFileSync(join(ROOT, p), 'utf8');
const code = (p) => read(p).replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
const PG = process.env.MIMS_PG;
const DIST = process.env.DIST;
const migrationPath = (name) => {
  for (const dir of ['supabase/migrations', 'drizzle/migrations']) {
    let files = [];
    try { files = readdirSync(join(ROOT, dir)); } catch { continue; }
    const f = files.find((x) => x.endsWith(`_${name}.sql`));
    if (f) return `${dir}/${f}`;
  }
  throw new Error(`migration ${name} not found`);
};
const require = createRequire(import.meta.url);
const { buildSync } = require(join(ROOT, 'node_modules', 'esbuild'));
const CACHE = join(ROOT, 'node_modules', '.cache', 'step112-test');
mkdirSync(CACHE, { recursive: true });
const load = async (p, name) => {
  const out = join(CACHE, `${name}.mjs`);
  buildSync({ entryPoints: [join(ROOT, p)], bundle: true, outfile: out, format: 'esm', platform: 'node', alias: { '@': join(ROOT, 'src') }, logLevel: 'silent' });
  return import(`${pathToFileURL(out).href}?${Date.now()}`);
};
const ENGINE = 'supabase/functions/_shared/network-engine.ts';
const close = (a, b, tol = 2e-6) => Math.abs(a - b) <= tol;
const psql = (args, input) => execFileSync('psql', [PG, '-v', 'ON_ERROR_STOP=1', ...args], { encoding: 'utf8', input, stdio: ['pipe', 'pipe', 'pipe'] });

/**
 * A semester with every kind of tie of Step 112, computed with NetworkX 3.3
 * (eigenvector_centrality on the weights, betweenness_centrality on 1/weight,
 * modularity of the divisions): the President p and the Vice-President v as
 * hubs, two heads, an equity and a macro division, and Media & Operations
 * without a head (m1, m2) tied to p and v directly.
 */
const NX = {"groups":[["officers",null,["p","v"]],["lead",null,["p","h1"]],["lead",null,["v","h1"]],["lead",null,["p","h2"]],["lead",null,["v","h2"]],["board",null,["h1","h2"]],["president","p",["h1","h2","a1","a2","a3","b1","b2","m1","m2"]],["vice","v",["h1","h2","a1","a2","a3","b1","b2","m1","m2"]],["direct","p",["m1","m2"]],["direct","v",["m1","m2"]],["division",null,["h1","a1","a2","a3"]],["division",null,["h2","b1","b2"]],["division",null,["m1","m2"]],["report",null,["a1","b1"]],["report",null,["a2","m1"]],["interview",null,["h1","a3"]]],"divisions":{"p":"board","v":"board","h1":"equity","a1":"equity","a2":"equity","a3":"equity","h2":"macro","b1":"macro","b2":"macro","m1":"media_operations","m2":"media_operations"},"weights":{"a1-a2":0.5,"a1-a3":0.5,"a1-b1":1,"a1-h1":0.5,"a1-p":0.1,"a1-v":0.05,"a2-a3":0.5,"a2-h1":0.5,"a2-m1":1,"a2-p":0.1,"a2-v":0.05,"a3-h1":1.0,"a3-p":0.1,"a3-v":0.05,"b1-b2":0.5,"b1-h2":0.5,"b1-p":0.1,"b1-v":0.05,"b2-h2":0.5,"b2-p":0.1,"b2-v":0.05,"h1-h2":1,"h1-p":1.35,"h1-v":1.3,"h2-p":1.35,"h2-v":1.3,"m1-m2":0.5,"m1-p":1.1,"m1-v":1.05,"m2-p":1.1,"m2-v":1.05,"p-v":1.5},"status":{"a1":0.203221,"a2":0.276442,"a3":0.247915,"b1":0.1637,"b2":0.125336,"h1":0.800914,"h2":0.741708,"m1":0.551573,"m2":0.499387,"p":1.0,"v":0.971335},"mediation":{"a1":0.055556,"a2":0.022222,"a3":0.0,"b1":0.033333,"b2":0.0,"h1":0.211111,"h2":0.255556,"m1":0.111111,"m2":0.0,"p":0.333333,"v":0.0},"modularity":0.070677};

test('the engine matches NetworkX with hubs, the direct ties and the divisions as the groups', async () => {
  const { analyseNetwork, TIE_WEIGHTS } = await load(ENGINE, 'engine');
  assert.deepEqual({ ...TIE_WEIGHTS }, { officers: 1.5, lead: 1.25, report: 1, board: 1, direct: 1, division: 0.5, interview: 0.5, president: 0.1, vice: 0.05 });
  const groups = NX.groups.map(([kind, hub, members], i) => ({ kind, key: `g${i}`, semester: '2026-fall', members, ...(hub ? { hub } : {}) }));
  const r = analyseNetwork(groups, { ties: true, divisions: NX.divisions });
  const w = Object.fromEntries(r.tieList.map((t) => [`${t.a}-${t.b}`, t.weight]));
  assert.deepEqual(Object.keys(w).sort(), Object.keys(NX.weights).sort(), 'a hub is tied to each member, the members not to each other through it');
  for (const [k, v] of Object.entries(NX.weights)) assert.ok(close(w[k], v), `weight ${k}: ${w[k]} vs ${v}`);
  for (const s of r.scores) {
    assert.ok(close(s.status, NX.status[s.id]), `status of ${s.id}: ${s.status} vs ${NX.status[s.id]}`);
    assert.ok(close(s.mediation, NX.mediation[s.id]), `mediation of ${s.id}`);
    assert.equal(s.division, NX.divisions[s.id], `the division of ${s.id}`);
  }
  assert.ok(close(r.modularity, NX.modularity), `modularity of the divisions: ${r.modularity} vs ${NX.modularity}`);
  // The groups are the divisions: one community each, and each division's centrality.
  assert.equal(r.communities, 4);
  assert.deepEqual(r.divisions.map((d) => d.key).sort(), ['board', 'equity', 'macro', 'media_operations']);
  for (let i = 1; i < r.divisions.length; i++) assert.ok(r.divisions[i - 1].centrality >= r.divisions[i].centrality, 'most central first');
  // Two analysts of Media & Operations without a head: each tied to the President and the Vice-President (1),
  // never to the heads through it; the hub ties are counted as the officers' ties.
  const tie = (a, b) => r.tieList.find((x) => x.a === a && x.b === b);
  assert.ok(close(tie('m1', 'p').weight, 1 + 0.1));
  assert.ok(close(tie('m1', 'v').weight, 1 + 0.05));
  assert.equal(tie('h1', 'm1'), undefined);
  assert.equal(tie('m1', 'p').officer, 2);
  // One overall position, read from the three factors.
  const n = r.scores.length;
  const pct = (k) => 1 - (k - 1) / (n - 1);
  for (const s of r.scores) assert.ok(close(s.overall, (pct(s.rank.status) + pct(s.rank.mediation) + pct(s.rank.coalition)) / 3, 1e-5), s.id);
});

test('a change of division or of hub changes the fingerprint; the order of arrival does not', async () => {
  const { inputFingerprint, analyseNetwork } = await load(ENGINE, 'engine');
  const groups = NX.groups.map(([kind, hub, members], i) => ({ kind, key: `g${i}`, semester: '2026-fall', members, ...(hub ? { hub } : {}) }));
  const shuffled = [...groups].reverse().map((g) => ({ ...g, members: [...g.members].reverse() }));
  assert.equal(inputFingerprint(groups, null, NX.divisions), inputFingerprint(shuffled, null, NX.divisions));
  assert.notEqual(inputFingerprint(groups, null, NX.divisions), inputFingerprint(groups, null, { ...NX.divisions, a1: 'macro' }));
  const moved = groups.map((g) => (g.kind === 'direct' && g.hub === 'v' ? { ...g, hub: 'h1' } : g));
  assert.notEqual(inputFingerprint(moved, null, NX.divisions), inputFingerprint(groups, null, NX.divisions));
  assert.deepEqual(analyseNetwork(groups, { divisions: NX.divisions, layout: true }), analyseNetwork(shuffled, { divisions: NX.divisions, layout: true }));
});

test('the network migration: the groups of Step 112, no admin, two scheduled runs, safe to run twice', () => {
  const m = read(migrationPath('step112_people_network'));
  assert.match(m, /ALTER TABLE public\.network_scores ADD COLUMN IF NOT EXISTS division text;/);
  assert.match(m, /ALTER TABLE public\.network_ties ADD COLUMN IF NOT EXISTS officer integer/);
  assert.match(m, /'media_operations'/);
  assert.match(m, /'website admin'/i);
  for (const k of ["'direct'", "'president'", "'vice'"]) assert.ok(m.includes(k), k);
  assert.match(m, /'50 4 1,15 2-6,9-12 \*'/);
  assert.match(m, /'50 4 1 1,7,8 \*'/);
  assert.doesNotMatch(m, /\bDROP TABLE\b|\bTRUNCATE\b|\bDELETE FROM public\.(?!network_)/);
});

test('the function: no button, light requests, the rest chained to the next tick', () => {
  const f = code('supabase/functions/people-network/index.ts');
  assert.doesNotMatch(f, /action === 'recompute'/);
  assert.match(f, /const MAX_HOPS = 12;/);
  assert.match(f, /carryOn\(url, serviceKey, \{ action: 'tick', continue: true, hop: hop \+ 1 \}\)/);
  assert.match(f, /carryOn\(url, serviceKey, \{ action: 'tick', force: true \}\)/);
  assert.match(f, /if \(!canManage\) return json\(\{ error: 'Only the President and the Vice-President leave someone out of the analysis\.' \}, 403\);/);
  assert.doesNotMatch(read('supabase/functions/_shared/activity-registry.ts'), /'people-network:recompute'/);
  assert.match(read('src/lib/people-network-api.ts'), /allSemesters\?/);
  assert.doesNotMatch(read('src/lib/people-network-api.ts'), /recomputeNetwork|weeks/);
});

test('the page: one position, divisions, a search to add, every semester, no button', async () => {
  const page = code('src/components/admin/people/PeopleNetwork.tsx');
  assert.match(page, /const \[picked, setPicked\] = useState<string\[\]>\(\[\]\);/, 'nobody is chosen for the reader');
  assert.equal((page.match(/<PersonSearch/g) || []).length, 2, 'on the map and in Over time');
  assert.match(page, /data-network-trend-empty/);
  assert.match(page, /data-network-moving-up/);
  assert.match(page, /\{allSemesters\.map\(\(p\) => \{/);
  assert.match(page, /Being analysed/);
  assert.doesNotMatch(page, /Recalculate|recomputeNetwork|\bweeks?\b|weekly/i);
  const view = await load('src/components/admin/people/network/network-view.ts', 'view');
  assert.deepEqual(view.FACTORS.map((f) => f.label), ['Tied to the well connected', 'A bridge between groups', 'A circle of their own, and reach']);
  assert.equal(view.divisionLabel('media_operations'), 'Media & Operations');
  assert.equal(view.fold('Niccolò'), 'niccolo');
  const panel = read('src/components/admin/people/network/PersonPanel.tsx');
  assert.match(panel, /data-network-factors/);
  assert.match(panel, /className="ws-network max-h-\[88vh\] max-w-2xl overflow-y-auto"/);
});

test('the network migration on a database: no admin account, one Media & Operations, hubs on the officers', { skip: !PG && 'MIMS_PG not set' }, () => {
  for (const name of ['step111_people_network', 'step112_people_network', 'step112_people_network']) psql(['-q', '-f', join(ROOT, migrationPath(name))]);
  const input = JSON.parse(psql(['-At', '-c', 'select public.network_input()']).trim());
  assert.ok(input.groups.length > 0 && input.people.length > 0);
  assert.ok(!input.people.some((p) => /website admin/i.test(p.name ?? '')), 'the association account is not a person');
  const kinds = new Set(input.groups.map((g) => g.kind));
  for (const k of ['president', 'vice']) assert.ok(kinds.has(k), k);
  for (const g of input.groups) if (['president', 'vice', 'direct'].includes(g.kind)) assert.ok(g.hub && !g.members.includes(g.hub), g.key);
  const divs = new Set(input.people.map((p) => p.division).filter(Boolean));
  assert.ok(!divs.has('media') && !divs.has('operations'), 'Media and Operations are one division');
  const r = JSON.parse(psql(['-At', '-c', 'select public.network_read()']).trim());
  assert.deepEqual(r.weeks ?? [], []);
});

test('Ianina Tarca and Volodymyr Pavliv become advisors this semester, with a backup and the fee as tracked', { skip: !PG && 'MIMS_PG not set' }, () => {
  const file = join(ROOT, migrationPath('step112_advisors_fall_2026'));
  const out = psql(['-qAt'], `
    BEGIN;
    INSERT INTO public.members (first_name, surname, role, division, membership_status, fee_status)
      VALUES ('Ianina', 'Tarca', 'head_of_division', 'quant', 'active', 'paid'),
             ('Volodymyr', 'Pavliv', 'head_of_division', 'investment', 'active', 'unpaid');
    \\i ${file}
    \\i ${file}
    SELECT string_agg(role::text || '/' || division::text || '/' || fee_status, ',' ORDER BY surname) FROM public.members WHERE surname IN ('Tarca', 'Pavliv');
    SELECT count(*) FROM public.role_fix_backup_step112 WHERE source_table = 'members';
    SELECT string_agg(DISTINCT tgenabled::text, ',') FROM pg_trigger WHERE tgrelid = 'public.members'::regclass AND tgname IN ('members_fee_status_follows_role', 'members_leave_open_fee_when_exempt');
    ROLLBACK;`).trim().split('\n').filter(Boolean);
  assert.deepEqual(out, ['advisor/none/unpaid,advisor/none/paid', '2', 'O']);
  const m = read(migrationPath('step112_advisors_fall_2026'));
  assert.doesNotMatch(m, /\bDELETE\b|\bTRUNCATE\b|\bDROP\b/);
  assert.match(m, /ON CONFLICT \(source_table, row_id\) DO NOTHING/);
});

test('the Society\'s acceptance rate on /about is the five division rates added together', () => {
  const m = read(migrationPath('step112_society_acceptance_rate'));
  assert.match(m, /'acceptance_rate_society', 'Acceptance rate'/);
  assert.match(m, /slug IN \('join_rate_equity', 'join_rate_investment', 'join_rate_macro', 'join_rate_portfolio', 'join_rate_quant'\)/);
  assert.match(m, /WHERE page_key = 'about' AND slug = 'acceptance_rate'/);
  assert.match(m, /ON CONFLICT \(slug\) DO NOTHING/);
  assert.doesNotMatch(m, /\bDELETE\b|\bTRUNCATE\b|\bDROP TABLE\b/);
});

test('the acceptance rate on a database: written with the round, the sum of the five', { skip: !PG && 'MIMS_PG not set' }, () => {
  const file = join(ROOT, migrationPath('step112_society_acceptance_rate'));
  const out = psql(['-qAt'], `
    BEGIN;
    \\i ${file}
    \\i ${file}
    SELECT public.kn_put('join_rate_equity', 1.2, current_date, 'Fall 2026', '{}'::jsonb, true) IS NULL;
    SELECT public.kn_put('join_rate_investment', 1.5, current_date, 'Fall 2026', '{}'::jsonb, true) IS NULL;
    SELECT public.kn_put('join_rate_macro', 1.0, current_date, 'Fall 2026', '{}'::jsonb, true) IS NULL;
    SELECT public.kn_put('join_rate_portfolio', 2.0, current_date, 'Fall 2026', '{}'::jsonb, true) IS NULL;
    SELECT public.kn_put('join_rate_quant', 1.0, current_date, 'Fall 2026', '{}'::jsonb, true) IS NULL;
    SELECT public.kn_put('acceptance_rate', 1.0, current_date, 'Fall 2026', '{}'::jsonb, true) IS NULL;
    SELECT value FROM public.key_numbers WHERE slug = 'acceptance_rate_society';
    SELECT count(*) FROM public.key_number_pages WHERE page_key = 'about' AND slug = 'acceptance_rate_society';
    ROLLBACK;`).trim().split('\n').filter(Boolean);
  assert.equal(Number(out.at(-2)), 6.7);
  assert.equal(out.at(-1), '1');
});

test('a report page ends with the note and its related reports in the grey band, the same words in its static copy', async () => {
  const { REPORT_DISCLAIMER } = await load('src/lib/report-disclaimer.ts', 'disclaimer');
  assert.equal(REPORT_DISCLAIMER.heading, 'Important information');
  assert.match(REPORT_DISCLAIMER.paragraphs[0], /independent from Università Bocconi/);
  assert.match(REPORT_DISCLAIMER.paragraphs[1], /not investment advice/);
  assert.deepEqual(REPORT_DISCLAIMER.more.links.map((l) => l.href), ['/disclaimer', '/terms-of-use']);
  // Each link is read as "the <label>": the closing line says "More in the Disclaimer, the Terms of Use ...".
  const closing = REPORT_DISCLAIMER.more.before + REPORT_DISCLAIMER.more.links.map((l, i) => `${i > 0 ? ', the ' : 'the '}${l.label}`).join('') + REPORT_DISCLAIMER.more.after;
  assert.equal(closing, 'More in the Disclaimer, the Terms of Use and the other legal pages.');
  const page = read('src/pages/ReportPage.tsx');
  // After Cite this report, at the end of the white part; then the grey band of the related reports.
  assert.match(page, /<section className="bg-muted py-section-sm md:py-section" data-report-band>/);
  assert.ok(page.indexOf('Cite this report') < page.indexOf('data-report-disclaimer'));
  assert.ok(page.indexOf('data-report-disclaimer') < page.indexOf('data-report-band'));
  const band = page.slice(page.indexOf('data-report-band'));
  assert.doesNotMatch(band, /REPORT_DISCLAIMER/, 'the grey band holds the related reports only');
  const render = read('src/lib/static/render.ts');
  assert.match(render, /import \{ REPORT_DISCLAIMER \} from '\.\.\/report-disclaimer';/);
  if (DIST && existsSync(join(DIST, 'archive'))) {
    const pages = readdirSync(join(DIST, 'archive')).filter((d) => existsSync(join(DIST, 'archive', d, 'index.html')));
    assert.ok(pages.length > 0);
    for (const d of pages) {
      const html = readFileSync(join(DIST, 'archive', d, 'index.html'), 'utf8');
      assert.ok(html.includes('Important information') && html.includes('independent from Università Bocconi'), d);
      assert.ok(!/More in the the /.test(html), d);
      const note = html.indexOf('Important information');
      assert.ok(html.indexOf('Cite this report') < note, d);
      if (html.includes('>Related reports<')) assert.ok(note < html.indexOf('>Related reports<'), d);
    }
  }
});

test('the firms where alumni work are in words, for people and machines alike; the Archive cover opens the report page', () => {
  const ticker = read('src/components/shared/AlumniTicker.tsx');
  assert.match(ticker, /data-alumni-names/);
  assert.match(ticker, /export const ALUMNI_TICKER_NAMES/);
  assert.match(read('src/pages/TrackRecord.tsx'), /data-alumni-firms/);
  assert.match(read('vite.static-pages.ts'), /alumni_firms: alumniFirmNames\(/);
  assert.match(read('public/llms.txt'), /firm/i);
  if (DIST && existsSync(join(DIST, 'track-record', 'index.html'))) {
    assert.match(readFileSync(join(DIST, 'track-record', 'index.html'), 'utf8'), /Firms where alumni work/);
    assert.match(readFileSync(join(DIST, 'llms-full.txt'), 'utf8'), /## Firms where alumni work/);
  }
  const list = read('src/components/shared/ArchiveFilesList.tsx');
  assert.match(list, /data-archive-cover/);
  assert.match(list, /to=\{`\/archive\/\$\{/);
});

test('the legal pages: no line above the grey band, the current page not in bold', () => {
  const css = read('src/styles/legal-system.css');
  const related = css.slice(css.indexOf('.legal-doc .lp-related {'), css.indexOf('}', css.indexOf('.legal-doc .lp-related {')));
  assert.doesNotMatch(related, /border-top/);
  const current = css.slice(css.indexOf('.legal-doc .lp-related a[aria-current="page"]'), css.indexOf('/* RESPONSIVE */'));
  assert.ok(current.length > 0);
  assert.doesNotMatch(current, /font-weight:\s*(600|700|bold)/);
});

test('the phone: a purple top, the page under the browser bar, a glass dock, a name without the email', () => {
  const shell = read('src/components/admin/MobileWorkspaceShell.tsx');
  assert.match(shell, /className="ws-shell-tall fixed inset-0 z-\[40\] flex flex-col bg-accent overflow-hidden"/);
  assert.match(shell, /width: 'min\(18\.5rem, calc\(100% - 3rem\)\)'/);
  const css = read('src/index.css');
  assert.match(css, /@supports \(height: 100lvh\) \{\s+\.ws-shell-tall \{ height: 100lvh !important; --ws-toolbar: calc\(100lvh - 100dvh\); \}\s+\}/);
  assert.match(css, /\.ws-help-fab[\s\S]{0,400}0 4px 14px hsl\(0 0% 0% \/ 0\.28\)/);
  const ident = read('src/components/admin/WorkspaceIdentity.tsx');
  assert.match(ident, /data-drawer-identity/);
  const activity = read('src/components/admin/ActivityManagement.tsx');
  assert.match(activity, /data-activity-compact/);
  assert.match(activity, /const REWORDED = new Set\(\['career-ib:answer'\]\);/);
  for (const p of ['src/lib/activity-sentences.ts', 'supabase/functions/_shared/activity-sentences.ts']) {
    assert.match(read(p), /'career-ib:answer': \['Answered the IB question \{n\}', 'Answered an IB question'\]/, p);
  }
  assert.equal(read('src/lib/activity-sentences.ts'), read('supabase/functions/_shared/activity-sentences.ts'), 'one file, mirrored');
});

test('Sent Emails opens on Sent; Role Permissions scrolls once; the Time Machine is a light page with a dark machine', () => {
  const mail = read('src/components/admin/AutoEmails.tsx');
  assert.match(mail, /const DEFAULT_REGISTER_STATUS = \['sent'\];/);
  assert.match(mail, /const defaultStatus = view === 'register' \? DEFAULT_REGISTER_STATUS : NO_STATUS;/);
  assert.match(mail, /setStatusFilter\(defaultStatus\)/);
  assert.match(mail, /data-register-default/);
  const roles = read('src/components/admin/RolePermissionsTable.tsx');
  assert.doesNotMatch(roles, /max-h-\[calc\(100dvh-16rem\)\]/);
  assert.match(roles, /<RegisterPage>/);
  assert.match(roles, /max-lg:overflow-x-auto/);
  const tm = read('src/components/admin/TimeMachine.tsx');
  assert.match(tm, /className="tm-root relative isolate bg-background font-body text-foreground"/);
  assert.match(tm, /className="dark tm-veil pointer-events-none absolute inset-0 z-\[1\] bg-background"/);
  assert.doesNotMatch(tm, /className="dark tm-root/);
  assert.match(read('src/components/admin/TimeMachineConsole.tsx'), /className="dark tm-console relative z-\[3\]/);
  const css = read('src/index.css');
  assert.match(css, /\.tm-root\[data-phase="charging"\] \.tm-veil,\s+\.tm-root\[data-phase="travelling"\] \.tm-veil,\s+\.tm-root\[data-phase="flash"\] \.tm-veil \{ opacity: 1;/);
});

test('help, manual, How To Use and the rules describe Step 112', () => {
  const guide = read('src/lib/workspace-guide.ts');
  assert.match(guide, /The President with every member|every member of a semester with its President 0\.1/);
  assert.match(guide, /Why it opens on Sent/);
  assert.match(guide, /Joined, Time in Minerva, Reports and the person record/);
  const manual = read('src/lib/workspace-manual.ts');
  assert.match(manual, /title: 'See who is well connected in the network of the Society'/);
  assert.match(manual, /Overall position \(People, Network\)/);
  assert.doesNotMatch(manual, /Status, Mediation, Coalition building/);
  const how = read('src/components/admin/HowToUse.tsx');
  assert.match(how, /'People, Network is simpler:/);
  assert.match(how, /Important information note/);
  assert.match(read('supabase/AGENTS.md'), /Steps 111 and 112 rules for People > Network\./);
});

test('nothing added carries an em dash', () => {
  for (const f of [
    'scripts/step112.test.mjs', ENGINE, 'supabase/functions/people-network/index.ts',
    migrationPath('step112_people_network'), migrationPath('step112_alumni_career_areas'),
    migrationPath('step112_society_acceptance_rate'), migrationPath('step112_advisors_fall_2026'),
    'src/components/admin/people/PeopleNetwork.tsx', 'src/components/admin/people/network/PersonPanel.tsx',
    'src/components/admin/people/network/PersonSearch.tsx', 'src/components/admin/people/network/NetworkMap.tsx',
    'src/components/admin/people/network/network-view.ts', 'src/lib/report-disclaimer.ts', 'src/pages/ReportPage.tsx',
    'src/lib/static/render.ts', 'src/components/shared/AlumniTicker.tsx', 'src/pages/TrackRecord.tsx',
    'src/components/admin/AlumniManagement.tsx', 'src/components/admin/PendingAlumni.tsx', 'src/components/admin/AutoEmails.tsx',
    'src/components/admin/RolePermissionsTable.tsx', 'src/components/admin/TimeMachine.tsx', 'src/components/admin/TimeMachineConsole.tsx',
    'src/components/admin/MobileWorkspaceShell.tsx', 'src/components/admin/WorkspaceIdentity.tsx', 'src/components/admin/ActivityManagement.tsx',
    'src/lib/workspace-guide.ts', 'src/lib/workspace-manual.ts', 'src/components/admin/HowToUse.tsx',
    'src/lib/alumni-careers.ts', 'supabase/AGENTS.md',
  ]) assert.ok(!read(f).includes('\u2014'), f);
  // The stylesheets carried em dashes in comments before Step 112: its own blocks carry none.
  const css = read('src/index.css');
  for (const [from, to] of [['/* THE TIME MACHINE (Step 110)', '.tm-rail'], ['.ws-dock {', '.ws-shell-tall {']]) {
    const block = css.slice(css.indexOf(from), css.indexOf(to, css.indexOf(from)));
    assert.ok(block.length > 0 && !block.includes('\u2014'), from);
  }
  const legal = read('src/styles/legal-system.css');
  assert.ok(!legal.slice(legal.indexOf('.legal-doc .lp-related {'), legal.indexOf('/* RESPONSIVE */')).includes('\u2014'));
});
