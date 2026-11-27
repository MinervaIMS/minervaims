// =====================================================================
// STEP 111: People > Network.
// ---------------------------------------------------------------------
// The engine is checked against NetworkX 3.3 (eigenvector_centrality,
// betweenness_centrality, greedy_modularity_communities, modularity) on
// Zachary's karate club and on a network built from groups; the expected
// values below were computed with NetworkX and are kept here so the test
// needs no Python. Then the rules around it: who reads, who manages, the
// nightly job, the person left out, the page, the help and the notice.
//
//   node --test scripts/step111.test.mjs
//   MIMS_PG=<psql connection> node --test scripts/step111.test.mjs
// =====================================================================

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdirSync, readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { createRequire } from 'node:module';
import { execFileSync } from 'node:child_process';

const ROOT = join(fileURLToPath(import.meta.url), '..', '..');
const read = (p) => readFileSync(join(ROOT, p), 'utf8');
const code = (p) => read(p).replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
const PG = process.env.MIMS_PG;
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
const CACHE = join(ROOT, 'node_modules', '.cache', 'step111-test');
mkdirSync(CACHE, { recursive: true });
const load = async (p, name) => {
  const out = join(CACHE, `${name}.mjs`);
  buildSync({ entryPoints: [join(ROOT, p)], bundle: true, outfile: out, format: 'esm', platform: 'node', alias: { '@': join(ROOT, 'src') }, logLevel: 'silent' });
  return import(`${pathToFileURL(out).href}?${Date.now()}`);
};
const ENGINE = 'supabase/functions/_shared/network-engine.ts';

/** Computed with NetworkX 3.3 (scratch script kept in the Step 111 report). */
const NX = {"karate":{"edges":[["p00","p01"],["p00","p02"],["p00","p03"],["p00","p04"],["p00","p05"],["p00","p06"],["p00","p07"],["p00","p08"],["p00","p10"],["p00","p11"],["p00","p12"],["p00","p13"],["p00","p17"],["p00","p19"],["p00","p21"],["p00","p31"],["p01","p02"],["p01","p03"],["p01","p07"],["p01","p13"],["p01","p17"],["p01","p19"],["p01","p21"],["p01","p30"],["p02","p03"],["p02","p07"],["p02","p08"],["p02","p09"],["p02","p13"],["p02","p27"],["p02","p28"],["p02","p32"],["p03","p07"],["p03","p12"],["p03","p13"],["p04","p06"],["p04","p10"],["p05","p06"],["p05","p10"],["p05","p16"],["p06","p16"],["p08","p30"],["p08","p32"],["p08","p33"],["p09","p33"],["p13","p33"],["p14","p32"],["p14","p33"],["p15","p32"],["p15","p33"],["p18","p32"],["p18","p33"],["p19","p33"],["p20","p32"],["p20","p33"],["p22","p32"],["p22","p33"],["p23","p25"],["p23","p27"],["p23","p29"],["p23","p32"],["p23","p33"],["p24","p25"],["p24","p27"],["p24","p31"],["p25","p31"],["p26","p29"],["p26","p33"],["p27","p33"],["p28","p31"],["p28","p33"],["p29","p32"],["p29","p33"],["p30","p32"],["p30","p33"],["p31","p32"],["p31","p33"],["p32","p33"]],"status":{"p00":0.952132,"p01":0.712335,"p02":0.849554,"p03":0.565614,"p04":0.203471,"p05":0.212884,"p06":0.212884,"p07":0.457891,"p08":0.609068,"p09":0.274998,"p10":0.203471,"p11":0.141566,"p12":0.225664,"p13":0.606574,"p14":0.271594,"p15":0.271594,"p16":0.063305,"p17":0.247479,"p18":0.271594,"p19":0.396162,"p20":0.271594,"p21":0.247479,"p22":0.271594,"p23":0.402071,"p24":0.152807,"p25":0.158576,"p26":0.202429,"p27":0.357499,"p28":0.351073,"p29":0.361473,"p30":0.468065,"p31":0.511656,"p32":0.826659,"p33":1.0},"mediation":{"p00":0.437635,"p01":0.053937,"p02":0.143657,"p03":0.011909,"p04":0.000631,"p05":0.029987,"p06":0.029987,"p07":0.0,"p08":0.055927,"p09":0.000848,"p10":0.000631,"p11":0.0,"p12":0.0,"p13":0.045863,"p14":0.0,"p15":0.0,"p16":0.0,"p17":0.0,"p18":0.0,"p19":0.032475,"p20":0.0,"p21":0.0,"p22":0.0,"p23":0.017614,"p24":0.00221,"p25":0.00384,"p26":0.0,"p27":0.022333,"p28":0.001795,"p29":0.002922,"p30":0.014412,"p31":0.138276,"p32":0.145247,"p33":0.304075},"communities":[["p00","p04","p05","p06","p10","p11","p16","p19"],["p01","p02","p03","p07","p09","p12","p13","p17","p21"],["p08","p14","p15","p18","p20","p22","p23","p24","p25","p26","p27","p28","p29","p30","p31","p32","p33"]],"modularity":0.380671},"groups":{"groups":[["report",["a","b","c"]],["officers",["i","j"]],["lead",["a","i"]],["lead",["a","j"]],["lead",["d","i"]],["lead",["d","j"]],["board",["a","d"]],["division",["c","d","e","f"]],["report",["g","h"]],["division",["b","g","h"]],["division",["a","k","l"]],["interview",["d","e"]],["interview",["d","f"]],["interview",["a","l"]],["report",["k","l"]],["report",["b","i"]]],"weights":{"a-b":1,"a-c":1,"a-d":1,"a-i":1.25,"a-j":1.25,"a-k":0.5,"a-l":1.0,"b-c":1,"b-g":0.5,"b-h":0.5,"b-i":1,"c-d":0.5,"c-e":0.5,"c-f":0.5,"d-e":1.0,"d-f":1.0,"d-i":1.25,"d-j":1.25,"e-f":0.5,"g-h":1.5,"i-j":1.5,"k-l":1.5},"status":{"a":1.0,"b":0.556518,"c":0.504815,"d":0.884694,"e":0.282866,"f":0.282866,"g":0.092141,"h":0.092141,"i":0.91847,"j":0.826024,"k":0.206821,"l":0.289879},"mediation":{"a":0.372727,"b":0.327273,"c":0.0,"d":0.3,"e":0.0,"f":0.0,"g":0.0,"h":0.0,"i":0.218182,"j":0.0,"k":0.0,"l":0.181818},"communities":[["a","d","i","j"],["b","c","e","f"],["g","h"],["k","l"]],"modularity":0.24915}};

const close = (a, b, tol = 2e-6) => Math.abs(a - b) <= tol;
const partition = (scores) => {
  const by = new Map();
  for (const s of scores) if (s.community) by.set(s.community, [...(by.get(s.community) ?? []), s.id]);
  return [...by.values()].map((l) => l.sort()).sort((a, b) => (a.join() < b.join() ? -1 : 1));
};

test('the engine matches NetworkX on the karate club (status, mediation, communities, modularity)', async () => {
  const { analyseNetwork } = await load(ENGINE, 'engine');
  const groups = NX.karate.edges.map(([a, b], i) => ({ kind: 'report', key: `e${i}`, semester: '2025-fall', members: [a, b] }));
  const r = analyseNetwork(groups);
  assert.equal(r.people, 34);
  assert.equal(r.ties, 78);
  for (const s of r.scores) {
    assert.ok(close(s.status, NX.karate.status[s.id]), `status of ${s.id}: ${s.status} vs ${NX.karate.status[s.id]}`);
    assert.ok(close(s.mediation, NX.karate.mediation[s.id]), `mediation of ${s.id}`);
  }
  assert.deepEqual(partition(r.scores), NX.karate.communities);
  assert.ok(close(r.modularity, NX.karate.modularity));
});

test('the engine matches NetworkX on a network of every kind of tie, each with its weight', async () => {
  const { analyseNetwork, TIE_WEIGHTS } = await load(ENGINE, 'engine');
  // The weights the President set: President with Vice-President 1.5, a head with either of
  // them 1.25, a report together 1, two heads on the same Board 1, the same division 0.5,
  // the interviewer (a head) with a new joiner of their division 0.5.
  assert.deepEqual({ ...TIE_WEIGHTS }, { officers: 1.5, lead: 1.25, report: 1, board: 1, division: 0.5, interview: 0.5 });
  const groups = NX.groups.groups.map(([kind, m], i) => ({ kind, key: `g${i}`, semester: '2025-fall', members: m }));
  const r = analyseNetwork(groups, { ties: true });
  const w = Object.fromEntries(r.tieList.map((t) => [`${t.a}-${t.b}`, t.weight]));
  assert.deepEqual(Object.keys(w).sort(), Object.keys(NX.groups.weights).sort());
  for (const [k, v] of Object.entries(NX.groups.weights)) assert.ok(close(w[k], v), `weight ${k}`);
  for (const s of r.scores) {
    assert.ok(close(s.status, NX.groups.status[s.id]), `status of ${s.id}`);
    assert.ok(close(s.mediation, NX.groups.mediation[s.id]), `mediation of ${s.id}`);
  }
  assert.deepEqual(partition(r.scores), NX.groups.communities);
  assert.ok(close(r.modularity, NX.groups.modularity));
  const tie = (a, b) => { const t = r.tieList.find((x) => x.a === a && x.b === b); return [t.weight, t.report, t.board, t.division, t.interview]; };
  // Each pair of a Board is in one tier only, with that tier's weight, and counts as one Board.
  assert.deepEqual(tie('i', 'j'), [1.5, 0, 1, 0, 0]);      // President and Vice-President
  assert.deepEqual(tie('a', 'i'), [1.25, 0, 1, 0, 0]);     // a head with the President
  assert.deepEqual(tie('a', 'd'), [1, 0, 1, 0, 0]);        // two heads
  // A report together weighs as much as two heads on a Board, twice a division semester.
  assert.deepEqual(tie('a', 'b'), [1, 1, 0, 0, 0]);
  assert.ok(TIE_WEIGHTS.report === TIE_WEIGHTS.board && TIE_WEIGHTS.report === 2 * TIE_WEIGHTS.division);
  // The interviewer and a new joiner of the division: their division semester and the interview.
  assert.deepEqual(tie('d', 'e'), [1, 0, 0, 1, 1]);
  // Boards are counted per semester: the President sat on one Board, in two tiers' groups.
  const by = Object.fromEntries(r.scores.map((x) => [x.id, x.groups]));
  assert.deepEqual(by.i, { report: 1, board: 1, division: 0, interview: 0 });
  assert.deepEqual(by.d, { report: 0, board: 1, division: 1, interview: 2 });
  assert.equal(r.groups.board, 1);
});

test('the same data always gives the same result, in whatever order it arrives', async () => {
  const { analyseNetwork, inputFingerprint } = await load(ENGINE, 'engine');
  const groups = NX.groups.groups.map(([kind, m], i) => ({ kind, key: `g${i}`, semester: i < 5 ? '2025-spring' : '2025-fall', members: m }));
  const shuffled = [...groups].reverse().map((g) => ({ ...g, members: [...g.members].reverse() }));
  const a = analyseNetwork(groups, { layout: true, ties: true, robustness: true });
  const b = analyseNetwork(shuffled, { layout: true, ties: true, robustness: true });
  assert.deepEqual(a, b);
  assert.equal(inputFingerprint(groups, null), inputFingerprint(shuffled, null));
  // A changed group changes the fingerprint; a later group does not touch an earlier semester.
  const more = [...groups, { kind: 'report', key: 'new', semester: '2025-fall', members: ['a', 'l'] }];
  assert.notEqual(inputFingerprint(more, null), inputFingerprint(groups, null));
  assert.equal(inputFingerprint(more, '2025-spring'), inputFingerprint(groups, '2025-spring'));
  // Until a semester: only its groups and the earlier ones.
  const spring = analyseNetwork(groups, { until: '2025-spring' });
  // (a report, and the spring Board: its officers and three lead pairs, one Board.)
  assert.deepEqual(spring.groups, { report: 1, board: 1, division: 0, interview: 0 });
  // Every person tied has a place on the map, inside the square.
  for (const s of a.scores) if (s.degree) assert.ok(s.x >= 0 && s.x <= 1 && s.y >= 0 && s.y <= 1);
  // Ranks: the overall one reads the three together; ties share a rank.
  const first = a.scores.find((s) => s.rank.overall === 1);
  assert.equal(first.overall, Math.max(...a.scores.map((s) => s.overall)));
  const n = a.scores.length;
  const pct = (r) => 1 - (r - 1) / (n - 1);
  for (const s of a.scores) if (s.degree) assert.ok(close(s.overall, (pct(s.rank.status) + pct(s.rank.mediation) + pct(s.rank.coalition)) / 3, 1e-5));
});

test('semesters: Fall runs from September to January, Spring from February to August', async () => {
  const { semesterOf, semesterOrdinal, semesterLabel } = await load(ENGINE, 'engine');
  assert.equal(semesterOf('2025-09-01'), '2025-fall');
  assert.equal(semesterOf('2026-01-31'), '2025-fall');
  assert.equal(semesterOf('2026-02-01'), '2026-spring');
  assert.equal(semesterOf('2026-08-31'), '2026-spring');
  assert.ok(semesterOrdinal('2025-fall') < semesterOrdinal('2026-spring'));
  assert.equal(semesterLabel('2019-fall'), 'Fall 2019');
  // The database counts a report's semester the same way.
  const m = read(migrationPath('step111_people_network'));
  assert.match(m, /WHEN extract\(month FROM f\.date\) >= 9 THEN extract\(year FROM f\.date\)::int \|\| '-fall'/);
  assert.match(m, /WHEN extract\(month FROM f\.date\) = 1 THEN \(extract\(year FROM f\.date\)::int - 1\) \|\| '-fall'/);
});

test('the database: closed to the browser, built from the rosters, the live register and the matched report authors', () => {
  const m = read(migrationPath('step111_people_network'));
  for (const t of ['network_runs', 'network_scores', 'network_ties', 'network_exclusions']) {
    assert.match(m, new RegExp(`CREATE TABLE IF NOT EXISTS public\\.${t} \\(`));
    assert.match(m, new RegExp(`ALTER TABLE public\\.${t}\\s+ENABLE ROW LEVEL SECURITY;`));
  }
  assert.match(m, /REVOKE ALL ON public\.network_runs, public\.network_scores, public\.network_ties, public\.network_exclusions FROM PUBLIC, anon, authenticated;/);
  for (const f of ['network_input\\(\\)', 'network_store\\(jsonb\\)', 'network_read\\(\\)', 'network_set_excluded\\(text, text, text, uuid, boolean\\)', 'people_network_tick\\(\\)']) {
    assert.match(m, new RegExp(`REVOKE ALL ON FUNCTION public\\.${f} FROM PUBLIC, anon, authenticated;`));
    assert.match(m, new RegExp(`GRANT EXECUTE ON FUNCTION public\\.${f} TO service_role;`));
  }
  // The groups: the Board by office rank in three tiers (each member once, at their highest
  // office), divisions without the Board's own key, interviews, reports by matched author.
  assert.match(m, /SELECT node, semester_key, min\(public\.roster_office_rank\(role_label\)\) AS rank\s+FROM ros WHERE public\.roster_office_rank\(role_label\) IS NOT NULL\s+GROUP BY node, semester_key/);
  assert.match(m, /SELECT 'officers' AS kind, 'officers:' \|\| semester_key AS key, semester_key AS semester,\s+array_agg\(DISTINCT node ORDER BY node\) AS members\s+FROM bm WHERE rank < 30 GROUP BY semester_key/);
  assert.match(m, /FROM bm o JOIN bm h ON h\.semester_key = o\.semester_key AND h\.rank >= 30\s+WHERE o\.rank < 30/);
  assert.match(m, /SELECT 'board', 'board:' \|\| semester_key, semester_key, array_agg\(DISTINCT node ORDER BY node\)\s+FROM bm WHERE rank >= 30 GROUP BY semester_key/);
  assert.match(m, /FROM ros WHERE division_key NOT IN \('board', 'none'\)/);
  // The interviewer: a head of the joiner's division, in the joiner's first semester, never the first on record.
  assert.match(m, /JOIN firsts f ON f\.node = j\.node AND f\.o = public\.semester_ordinal\(j\.semester_key\)\s+JOIN ros h ON h\.semester_key = j\.semester_key AND h\.division_key = j\.division_key AND h\.node <> j\.node\s+AND public\.roster_office_rank\(h\.role_label\) IS NOT NULL/);
  assert.match(m, /AND public\.roster_office_rank\(j\.role_label\) IS NULL\s+AND f\.o > \(SELECT o FROM origin\)/);
  assert.doesNotMatch(m, /'team'/);
  assert.match(m, /FROM public\.report_authorships\(\) x/);
  assert.match(m, /FROM public\.roster_live\(\) l/);
  assert.match(m, /WHERE public\.semester_ordinal\(e\.semester_key\) < public\.semester_ordinal\(now_key\.k\)/);
  // A person left out is removed first, by person or by member record, and their stored results go at once.
  assert.match(m, /WHERE r\.node NOT IN \(SELECT node FROM out_nodes\)/);
  assert.match(m, /WHERE x\.person_id::text NOT IN \(SELECT node FROM out_nodes\)/);
  assert.match(m, /DELETE FROM public\.network_scores WHERE node = p_node;\s+DELETE FROM public\.network_ties WHERE a = p_node OR b = p_node;/);
  // The nightly job, with its own token, as every scheduled job.
  assert.match(m, /INSERT INTO public\.scheduled_job_tokens \(job, token\)\s+VALUES \('people_network'/);
  assert.match(m, /public\.scheduled_job_headers\('people_network'\)/);
  assert.match(m, /PERFORM cron\.schedule\('people_network', '50 4 \* \* \*'/);
  // Safe to run twice; nothing existing deleted (a run replaces only its own kind's earlier run).
  assert.doesNotMatch(m, /DROP TABLE|TRUNCATE/);
});

test("the function: the page's row of the matrix decides, the job has its own token, the work fits the runtime", () => {
  const f = code('supabase/functions/people-network/index.ts');
  assert.match(f, /const RESOURCE = 'people-network';/);
  assert.match(f, /if \(!allows\(roles, user\.email, RESOURCE, 'view'\)\)/);
  assert.match(f, /const canManage = allows\(roles, user\.email, RESOURCE, 'manage'\);/);
  assert.match(f, /if \(!canManage\) return json\(\{ error: 'Only the President and the Vice-President run the analysis or leave someone out\.' \}, 403\);/);
  assert.match(f, /await isScheduledJob\(supabase, req, 'people_network'\)/);
  assert.match(f, /excluded: canManage \? \(v\.excluded \?\? \[\]\) : \[\],/);
  assert.match(f, /const BUDGET_MS = 900;/);
  assert.match(f, /if \(spent >= budgetMs\) break;/);
  for (const imp of f.matchAll(/from '(\.\.?\/[^']+)'/g)) assert.match(imp[1], /^\.\.\/_shared\//, imp[1]);
  assert.match(read('supabase/config.toml'), /\[functions\.people-network\]\s+verify_jwt = false/);
  // Recorded in the activity log, with a sentence each; the reads are not.
  const reg = read('supabase/functions/_shared/activity-registry.ts');
  assert.match(reg, /'people-network': \['read'\],/);
  for (const a of ['recompute', 'exclude', 'include', 'tick']) {
    assert.match(reg, new RegExp(`'people-network:${a}': '`));
    assert.match(read('src/lib/activity-sentences.ts'), new RegExp(`'people-network:${a}':`));
  }
  // The browser never receives the engine.
  const walk = (dir) => readdirSync(join(ROOT, dir), { withFileTypes: true }).flatMap((d) => (d.isDirectory() ? walk(`${dir}/${d.name}`) : [`${dir}/${d.name}`]));
  for (const p of walk('src')) assert.doesNotMatch(read(p), /(?:from|import\()\s*['"][^'"]*network-engine/, p);
});

test('who opens it: the Board, alumni and advisors; the President and the Vice-President manage it', async () => {
  const { permissionsForRoles } = await load('src/lib/access/matrix.ts', 'matrix').catch(() => ({}));
  const matrix = read('src/lib/access/matrix.ts');
  const server = read('supabase/functions/_shared/access.ts');
  const level = (src, role) => {
    const m = new RegExp(`\\n  ${role}: \\{[\\s\\S]*?'people-network': '([a-z]+)'`).exec(src);
    return m && !/\n  [a-z_]+: \{/.test(src.slice(m.index + 1, m.index + m[0].length)) ? m[1] : null;
  };
  for (const src of [matrix, server]) {
    assert.equal(level(src, 'vice_president'), 'manage');
    for (const r of ['head_of_asset_management', 'head_of_division', 'head_of_media', 'head_of_operations', 'alumni']) assert.equal(level(src, r), 'view', r);
    for (const r of ['analyst', 'senior_analyst', 'team_leader', 'portfolio_manager', 'media_analyst', 'operations_analyst']) assert.equal(level(src, r), null, r);
  }
  assert.match(matrix, /advisor: \{ '\*': 'view', 'my-role': 'manage' \},/);
  void permissionsForRoles;
  // In the navigation after the Time Machine, drawn by the workspace, open on a phone.
  assert.match(read('src/lib/workspace-nav.ts'), /\{ key: 'people-rosters', slug: 'time-machine'[^\n]*\n\s+\{ key: 'people-network', slug: 'network', label: 'Network', allowed: \(p\) => p\.can\('people-network'\) \},/);
  assert.match(read('src/pages/MinervaWorkspace.tsx'), /case 'people-network':\s+return <PeopleNetwork \/>;/);
  assert.match(read('src/lib/mobile-policy.ts'), /'people-network',/);
  assert.match(read('src/lib/seo/share-cards.ts'), /\['network', 'Network'\]/);
});

test("the page: read controls keep working for readers; the colours are the design system's", () => {
  const page = read('src/components/admin/people/PeopleNetwork.tsx');
  assert.match(page, /<div className="mb-6" data-ro>\s+<Segmented<View>/);
  assert.match(page, /<Input data-ro value=\{query\}/);
  assert.match(page, /onLeaveOut=\{data\.canManage \? /);
  assert.match(page, /<RegisterFrame>/);
  assert.match(page, /<RecordList label="Ranking">/);
  const css = read('src/index.css');
  const pl = read('src/components/payofflab/payofflab.css');
  for (const hex of ['#1f0f4d', '#0072b2', '#e69f00', '#009e73', '#cc79a7', '#56b4e9', '#d55e00', '#6e5aa6']) {
    assert.ok(pl.includes(hex), `${hex} comes from the Payoff Lab palette`);
    assert.ok(css.includes(hex));
  }
  const map = read('src/components/admin/people/network/NetworkMap.tsx');
  // A pointer is read as a share of the drawn box, so the 90% scale cannot move it.
  assert.match(map, /x: \(\(clientX - rect\.left\) \/ rect\.width\) \* width, y: \(\(clientY - rect\.top\) \/ rect\.height\) \* height/);
  // Zoom and pan stay open to readers; the wheel only zooms with a pinch or Ctrl, so the page still scrolls.
  for (const label of ['Zoom in', 'Zoom out', 'Show the whole network']) assert.ok(map.includes(`aria-label="${label}"`), label);
  assert.match(map, /addEventListener\('wheel', [^)]*\{ passive: false \}\)/);
  assert.match(map, /if \(!e\.ctrlKey\) return;/);
  // Everyone or this semester's members; a community picked on the map; strong ties only.
  assert.match(page, /\{ value: 'all', label: 'Everyone' \},\s+\{ value: 'now', label: 'In the Society now' \},/);
  assert.match(page, /who === 'now' \? people\.filter\(\(p\) => p\.is_current\) : people/);
  assert.match(page, /<Switch checked=\{strongOnly\} onCheckedChange=\{setStrongOnly\}/);
  assert.match(page, /community=\{community\} strongOnly=\{strongOnly\}/);
  assert.match(page, /onShowOnMap=\{\(i\) => \{ setOpen\(null\); setSelected\(i\); setCommunity\(null\); setView\('map'\); setReveal\(\(n\) => n \+ 1\); \}\}/);
  assert.match(page, /aria-sort=\{measure === m \? 'ascending' : 'none'\}/);
});

test('the weights shown on the page are the weights the engine applies', async () => {
  const { TIE_WEIGHTS } = await load(ENGINE, 'engine');
  const { TIE_TABLE } = await load('src/components/admin/people/network/network-view.ts', 'view');
  const shown = Object.fromEntries(TIE_TABLE.map((t) => [t.label, Number(t.weight)]));
  assert.deepEqual(shown, {
    'President and Vice-President of the same semester': TIE_WEIGHTS.officers,
    'A head of division with the President or the Vice-President, same semester': TIE_WEIGHTS.lead,
    'A report written together': TIE_WEIGHTS.report,
    'Two heads on the same Board, same semester': TIE_WEIGHTS.board,
    'The same division, same semester': TIE_WEIGHTS.division,
    'Interviewer and new joiner: the head of the division a member joined, in the semester they got in': TIE_WEIGHTS.interview,
  });
  const panel = read('src/components/admin/people/network/PersonPanel.tsx');
  assert.match(panel, /1\.5 for President and Vice-President, 1\.25 for a head with either of them, 1 for a report together or two heads on the same Board, 0\.5 for a semester in the same division, and 0\.5 for the head and a new joiner of their division\./);
  assert.match(read('src/components/admin/people/PeopleNetwork.tsx'), /\{TIE_TABLE\.map\(\(t\) =>/);
});

test('help, manual, How To Use, tour and the Privacy Policy describe it', () => {
  assert.match(read('src/lib/workspace-guide.ts'), /key: 'people-network', section: 'People', label: 'Network',/);
  assert.match(read('src/lib/workspace-guide-keys.ts'), /'people-network'/);
  const manual = read('src/lib/workspace-manual.ts');
  assert.match(manual, /'people-network': \{\s+detail: \[/);
  assert.match(manual, /id: 'network-leave-out',/);
  assert.match(read('src/components/admin/HowToUse.tsx'), /'People, Network is new:/);
  assert.match(read('src/lib/workspace-tours.ts'), /onPage\('people', 'people-network', \{/);
  const policy = read('src/pages/PrivacyPolicy.tsx').replace(/\s+/g, ' ');
  assert.match(policy, /<strong>Analysis of the community\.<\/strong> To understand how the Society&apos;s community of members and alumni develops over time, the Workspace analyses the records it already keeps about participation in the Society&apos;s activities and computes statistical indicators of how people are connected, updated regularly\. The results are visible only to persons the association authorises, are never published, and no decision about anyone is taken by automated means on their basis\. The legal basis is the association&apos;s legitimate interest in understanding and strengthening its community, article 6\(1\)\(f\) GDPR\. Anyone may object at any time \(section 17\) and is then left out of the analysis\./);
  assert.match(policy, /lastUpdated="November 27th, 2026"/);
});

test('the migration runs twice; input, store, read and leaving out work on the database', { skip: !PG && 'MIMS_PG not set' }, () => {
  const file = join(ROOT, migrationPath('step111_people_network'));
  const sqlRun = (args) => execFileSync('psql', [PG, '-v', 'ON_ERROR_STOP=1', '-q', ...args], { encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] });
  sqlRun(['-f', file]);
  sqlRun(['-f', file]);
  const sql = (q) => execFileSync('psql', [PG, '-At', '-c', q], { encoding: 'utf8' }).trim();
  for (const t of ['network_runs', 'network_scores', 'network_ties', 'network_exclusions']) {
    assert.equal(sql(`select has_table_privilege('authenticated', 'public.${t}', 'select')`), 'f', t);
    assert.equal(sql(`select has_table_privilege('anon', 'public.${t}', 'select')`), 'f', t);
  }
  assert.equal(sql("select has_function_privilege('authenticated', 'public.network_read()', 'execute')"), 'f');
  const input = JSON.parse(sql('select public.network_input()'));
  assert.ok(Array.isArray(input.groups) && Array.isArray(input.people));
  // Pairs are pairs; a Board member is in one tier of a semester only.
  for (const g of input.groups) if (g.kind === 'lead' || g.kind === 'interview') assert.equal(g.members.length, 2, g.key);
  const officers = new Map(input.groups.filter((g) => g.kind === 'officers').map((g) => [g.semester, new Set(g.members)]));
  for (const g of input.groups.filter((x) => x.kind === 'board')) for (const x of g.members) assert.ok(!officers.get(g.semester)?.has(x), g.key);
  assert.ok(!input.groups.some((g) => g.kind === 'team'));
  // A run stored, read back, then a person left out: everything about them goes, in one rolled-back transaction.
  const out = execFileSync('psql', [PG, '-qAt', '-v', 'ON_ERROR_STOP=1'], { encoding: 'utf8', input: `
    BEGIN;
    SELECT public.network_store('{"kind":"update","semester":"2026-fall","week":"2026-W01","fingerprint":"t","summary":{},
      "scores":[{"node":"n-a","name":"A","degree":1,"strength":1,"status":1,"mediation":0,"coalition":0.5,"cohesion":1,"ego":1,"reach":0,"community":1,"overall":1,"rank_status":1,"rank_mediation":1,"rank_coalition":1,"rank_overall":1,"groups":{}},
                {"node":"n-b","name":"B","degree":1,"strength":1,"status":1,"mediation":0,"coalition":0.5,"cohesion":1,"ego":1,"reach":0,"community":1,"overall":1,"rank_status":1,"rank_mediation":1,"rank_coalition":1,"rank_overall":1,"groups":{}}],
      "ties":[{"a":"n-a","b":"n-b","weight":1,"report":1,"board":0,"division":0,"interview":0}]}'::jsonb) IS NOT NULL;
    SELECT jsonb_array_length(public.network_read()->'latest'->'ties');
    SELECT public.network_set_excluded('n-a', 'A', 'asked', NULL, true);
    SELECT count(*) FROM public.network_scores WHERE node = 'n-a';
    SELECT count(*) FROM public.network_ties WHERE a = 'n-a' OR b = 'n-a';
    SELECT jsonb_array_length(public.network_read()->'excluded') >= 1;
    ROLLBACK;` }).trim().split('\n').filter(Boolean);
  // Stored; one tie read back; then nothing left about the person, who is listed as left out.
  assert.deepEqual(out, ['t', '1', '0', '0', 't']);
});

test('nothing added carries an em dash', () => {
  for (const f of [
    'scripts/step111.test.mjs', ENGINE, 'supabase/functions/people-network/index.ts', migrationPath('step111_people_network'),
    'src/lib/people-network-api.ts', 'src/components/admin/people/PeopleNetwork.tsx', 'src/components/admin/people/network/NetworkMap.tsx',
    'src/components/admin/people/network/NetworkTrend.tsx', 'src/components/admin/people/network/PersonPanel.tsx',
    'src/components/admin/people/network/network-view.ts', 'src/lib/workspace-guide.ts', 'src/lib/workspace-manual.ts',
    'src/components/admin/HowToUse.tsx', 'src/pages/PrivacyPolicy.tsx', 'src/lib/activity-sentences.ts',
  ]) assert.doesNotMatch(read(f), /\u2014/, f);
});
