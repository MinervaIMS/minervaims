// =====================================================================
// ALUMNI CAREER AREAS (Step 107).
// ---------------------------------------------------------------------
// One list of twelve areas, said the same way in four places: the pages
// (src/lib/alumni-careers.ts), the edge functions
// (supabase/functions/_shared/alumni-careers.ts), the database
// (public.alumni_career_keys and public.alumni_career_label) and the
// pages that show it (Minerva's Track Record, its static copy, the
// public and the workspace Alumni pages). The area is worked out by the
// database from the job area and the employer; nothing typed is
// overwritten.
//
// With a Postgres at hand (MIMS_PG=<psql connection string>), the
// classifier itself is run on the roles and employers of the directory.
// =====================================================================
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { createRequire } from 'node:module';

const ROOT = join(fileURLToPath(import.meta.url), '..', '..');
const read = (p) => readFileSync(join(ROOT, p), 'utf8');
const require = createRequire(import.meta.url);
const load = async (rel, name) => {
  const { build } = require('esbuild');
  const outDir = join(ROOT, 'node_modules', '.cache', 'alumni-careers-test');
  mkdirSync(outDir, { recursive: true });
  const out = join(outDir, `${name}.mjs`);
  await build({ entryPoints: [join(ROOT, rel)], bundle: true, format: 'esm', platform: 'node', outfile: out, logLevel: 'silent' });
  return import(`${pathToFileURL(out).href}?${Date.now()}`);
};

const MIGRATION = 'supabase/migrations/20261124090000_alumni_career_areas.sql';
const sql = read(MIGRATION);

test('one list: the pages, the edge functions and the database say the same', async () => {
  const lib = await load('src/lib/alumni-careers.ts', 'lib');
  const shared = await load('supabase/functions/_shared/alumni-careers.ts', 'shared');
  assert.equal(lib.ALUMNI_CAREER_KEYS.length, 12);
  assert.deepEqual([...shared.ALUMNI_CAREER_KEYS], [...lib.ALUMNI_CAREER_KEYS], 'the edge functions keep the same keys, in order');
  assert.deepEqual(lib.ALUMNI_CAREERS.map((c) => c.key), [...lib.ALUMNI_CAREER_KEYS], 'every key has its label, in order');
  const dbKeys = [...sql.match(/alumni_career_keys\(\)[\s\S]*?ARRAY\[([\s\S]*?)\]::text\[\]/)[1].matchAll(/'([a-z_]+)'/g)].map((m) => m[1]);
  assert.deepEqual(dbKeys, [...lib.ALUMNI_CAREER_KEYS], 'the database keeps the same keys, in order');
  const labelFn = sql.slice(sql.indexOf('FUNCTION public.alumni_career_label'), sql.indexOf('FUNCTION public.alumni_employer_sector'));
  const dbLabels = Object.fromEntries([...labelFn.matchAll(/WHEN '([a-z_]+)'\s+THEN '([^']+)'/g)].map((m) => [m[1], m[2]]));
  assert.equal(Object.keys(dbLabels).length, 12);
  for (const c of lib.ALUMNI_CAREERS) {
    assert.equal(dbLabels[c.key], c.label, `${c.key} reads the same in the database`);
    assert.ok(c.covers.length > 20 && c.covers.endsWith('.'), `${c.key} says what it covers`);
  }
  assert.equal(lib.ALUMNI_CAREERS.at(-1).key, 'other', 'Other is last');
  assert.equal(lib.alumniCareerLabel('markets'), 'Sales & Trading');
  assert.equal(lib.alumniCareerLabel('nonsense'), '');
  assert.equal(lib.alumniCareerCovers('Private Markets'), lib.alumniCareerCovers('private_markets'), 'found by label or by key');
  const all = read('src/lib/alumni-careers.ts') + read('supabase/functions/_shared/alumni-careers.ts') + sql;
  assert.ok(!all.includes('\u2014'), 'no em dash');
});

test('the migration adds, and overwrites nothing it did not create', () => {
  assert.match(sql, /ALTER TABLE public\.alumni ADD COLUMN IF NOT EXISTS career_area text;/);
  assert.match(sql, /ALTER TABLE public\.alumni ADD COLUMN IF NOT EXISTS career_area_manual boolean NOT NULL DEFAULT false;/);
  assert.match(sql, /IF NOT EXISTS \(SELECT 1 FROM pg_constraint WHERE conname = 'alumni_career_area_check'\)/);
  assert.doesNotMatch(sql, /\bDELETE\s+FROM\b|\bDROP\s+TABLE\b|\bTRUNCATE\b|\bDROP\s+COLUMN\b/i);
  // The only rows written: the area, where it is automatic and differs.
  const updates = [...sql.matchAll(/^UPDATE public\.alumni\s+SET ([\s\S]*?);/gm)];
  assert.equal(updates.length, 1);
  assert.match(updates[0][1], /^career_area = public\.alumni_career_area\(job_area, company\)\s+WHERE NOT career_area_manual\s+AND career_area IS DISTINCT FROM public\.alumni_career_area\(job_area, company\)$/);
  assert.doesNotMatch(sql, /SET\s+job_area\b|NEW\.job_area\s*:=|NEW\.company\s*:=/, 'the job area and the employer stay as typed');
  // A hand-set area is kept by the trigger.
  assert.match(sql, /IF NEW\.career_area_manual AND NEW\.career_area IS NOT NULL THEN\s+RETURN NEW;/);
  assert.match(sql, /BEFORE INSERT OR UPDATE OF job_area, company, career_area, career_area_manual ON public\.alumni/);
});

test('the public reads show nobody more than before', () => {
  const dir = sql.slice(sql.indexOf('FUNCTION public.public_alumni_directory()'));
  assert.match(dir, /SELECT id, name, surname, graduation_year, company, city, job_area, career_area, linkedin_url\s+FROM public\.alumni\s+ORDER BY graduation_year DESC, surname ASC, name ASC\s+LIMIT 100/, 'the same 100, with their area only');
  assert.match(sql, /REVOKE ALL ON FUNCTION public\.public_alumni_match_count\(text, text, text\) FROM PUBLIC, anon, authenticated;\s+GRANT EXECUTE ON FUNCTION public\.public_alumni_match_count\(text, text, text\) TO anon, authenticated;/);
  // The function the open pages still call is not changed.
  assert.doesNotMatch(sql, /FUNCTION public\.public_alumni_filter_count/);
  // Track Record: the same field, the career areas in it, Other last.
  assert.match(sql, /'alumni_areas', COALESCE\(\(SELECT jsonb_agg\(jsonb_build_object\('area', public\.alumni_career_label\(k\), 'key', k, 'alumni', n\)\s+ORDER BY \(k = 'other'\), n DESC/);
  assert.match(sql, /'alumni_without_area', \(SELECT count\(\*\)::int FROM public\.alumni WHERE career_area IS NULL\)/);
});

test('the pages read the areas, and say the same', () => {
  const track = read('src/pages/TrackRecord.tsx');
  const stat = read('src/lib/static/render.ts');
  for (const [name, src] of [['page', track], ['static copy', stat]]) {
    assert.match(src, /WHERE_ALUMNI_WORK\.heading/, name);
    assert.match(src, /WHERE_ALUMNI_WORK\.intro/, name);
    assert.match(src, /WHERE_ALUMNI_WORK\.without\(/, name);
    assert.match(src, /alumniCareerCovers\(a\.key \?\? a\.area\)/, name);
    assert.doesNotMatch(src, /have not recorded a job area/, name);
  }
  const pub = read('src/pages/Alumni.tsx');
  assert.match(pub, /rpc\('public_alumni_match_count', \{\s+p_career_area:/);
  assert.match(pub, /<option value="all">All career areas<\/option>/);
  assert.match(pub, /alumnus\.career_area === careerFilter/);
  assert.doesNotMatch(pub, /All Job Areas/);
  const ws = read('src/components/admin/AlumniManagement.tsx');
  assert.match(ws, /<Label htmlFor="career_area" className="font-body">Career area<\/Label>/);
  assert.match(ws, /career_area: formData\.career_area === AUTOMATIC \? null : formData\.career_area/);
  assert.match(ws, /label: 'Career area', options: careerOptions/);
  assert.match(ws, /\{ key: 'career', header: 'Career Area' \}/);
  assert.match(ws, /label: 'Not recorded'/, 'the alumni to complete can be found');
  const fn = read('supabase/functions/admin-alumni/index.ts');
  assert.match(fn, /import \{ ALUMNI_CAREER_KEYS \} from '\.\.\/_shared\/alumni-careers\.ts';/);
  assert.match(fn, /z\.enum\(ALUMNI_CAREER_KEYS\)\.nullable\(\)\.optional\(\)/);
  assert.match(fn, /a\.career_area === undefined \? \{\} : \{ career_area: a\.career_area, career_area_manual: a\.career_area !== null \}/, 'an older page leaves the area alone');
  assert.equal((fn.match(/\.\.\.careerFields\(alumni\)/g) || []).length, 2, 'on create and on update');
});

// The classifier, run by the database itself.
const PG = process.env.MIMS_PG;
test('the classifier places the directory\'s roles and employers as a careers office would', { skip: !PG && 'set MIMS_PG to run it on a Postgres' }, () => {
  const cases = [
    ['M&A', 'KPMG', 'investment_banking'], ['Valuation & M&A', null, 'investment_banking'], ['Corporate Coverage', null, 'investment_banking'],
    ['Investment Banking', 'Goldman Sachs', 'investment_banking'], ['Corporate Finance', null, 'investment_banking'], ['Corporate Finance', 'Terna SpA', 'corporate'],
    ['Markets', 'Barclays', 'markets'], ['Markets (Structuring)', null, 'markets'], ['Strategic Equity Derivatives', null, 'markets'], ['Clearing', 'Eurex', 'markets'],
    ['Markets', 'Garda Capital Partners', 'hedge_funds'], ['Quant', 'Squarepoint', 'hedge_funds'], ['L/S equity', null, 'hedge_funds'],
    ['Investments', 'Eurizon', 'asset_management'], ['Investments', 'Target Global', 'private_markets'], ['Wealth Management', 'Goldman Sachs', 'asset_management'],
    ['Asset Management (Sales)', null, 'asset_management'], ['Private Banking', null, 'asset_management'],
    ['Private Equity', 'McKinsey&Co', 'consulting'], ['Private Equity (Credit)', null, 'private_markets'], ['Real Estate Private Equity', null, 'private_markets'],
    ['Research', 'IMF', 'research'], ['Research', 'Bocconi University', 'academia'], ['Equity Research', 'Morgan Stanley', 'research'], ['Corporate Finance (Ratings)', null, 'research'],
    ['Risk', 'Unicredit', 'risk_quant'], ['Risk', 'KPMG', 'consulting'], ['Data Analyst', null, 'risk_quant'],
    ['Business Analyst', 'Value Partners', 'consulting'], ['Economics Consulting', null, 'consulting'],
    ['Marketing', null, 'corporate'], ['Business (Energy)', null, 'corporate'], ['Insurance', 'Groupe Covea', 'corporate'],
    ['Startup', 'START Milan', 'entrepreneurship'], ['Financial Services', 'Stealth Startup', 'entrepreneurship'], ['PhD', 'Oxford', 'academia'],
    [null, 'Blackrock', 'asset_management'], [null, 'European Commission', 'research'], [null, 'Goldman Sachs', null], [null, null, null],
    ['Financial Intermediaries', null, 'other'],
  ];
  const q = (v) => (v === null ? 'NULL' : `'${v.replace(/'/g, "''")}'`);
  const select = cases.map(([a, c]) => `SELECT coalesce(public.alumni_career_area(${q(a)}, ${q(c)}), '-')`).join(' UNION ALL ');
  const out = execFileSync('psql', [PG, '-At', '-c', select], { encoding: 'utf8' }).trim().split('\n');
  cases.forEach(([a, c, want], i) => assert.equal(out[i], want ?? '-', `${a} at ${c}`));
});
