// =====================================================================
// WHAT THE DATABASE HANDS OUT FOLLOWS THE ROLE MATRIX (Step 106A).
// ---------------------------------------------------------------------
// The workspace hides a page from the roles the access matrix refuses,
// and its edge functions refuse them too. The database has to agree, or
// the page can still be read row by row by asking the data API directly.
// This test fails if:
//   * the lists of roles the database uses (public.ws_view_roles) differ
//     from the matrix, for any page they name;
//   * a table this step narrowed loses its policy;
//   * the workspace starts calling a database function that is not on
//     the list of functions an account may call;
//   * a later migration makes a function that runs with the database's
//     own rights without taking it away from PUBLIC and from visitors.
//
//   node --test scripts/data-access.test.mjs
// =====================================================================
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdirSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { createRequire } from 'node:module';

const ROOT = join(fileURLToPath(import.meta.url), '..', '..');
const read = (p) => readFileSync(join(ROOT, p), 'utf8');
const require = createRequire(import.meta.url);
const { buildSync } = require(join(ROOT, 'node_modules', 'esbuild'));
const CACHE = join(ROOT, 'node_modules', '.cache', 'data-access-test');
mkdirSync(CACHE, { recursive: true });
const load = async (p, name) => {
  const out = join(CACHE, `${name}.mjs`);
  buildSync({
    entryPoints: [join(ROOT, p)], bundle: true, outfile: out, format: 'esm', platform: 'node',
    alias: { '@': join(ROOT, 'src') }, logLevel: 'silent',
  });
  return import(`${pathToFileURL(out).href}?${Date.now()}`);
};

const MIGRATION_NAME = '20261116090000_data_access_follows_matrix.sql';
const MIGRATION = `supabase/migrations/${MIGRATION_NAME}`;
const sql = read(MIGRATION);

// Every name a role can be stored under (the app_role type), legacy names included.
const STORED_ROLES = [
  'admin', 'president', 'vice_president', 'head_of_asset_management', 'head_of_equity', 'head_of_investment',
  'head_of_macro', 'head_of_portfolio', 'head_of_quant', 'head_of_operations', 'head_of_media', 'member',
  'portfolio_manager', 'head_of_division', 'team_leader', 'analyst', 'media_analyst', 'advisor', 'silent_advisor',
  'candidate', 'alumni', 'pending', 'senior_analyst', 'operations_analyst',
];

/** The pages the database knows, each with the stored roles it lets read. */
function sqlViewRoles() {
  const out = {};
  for (const m of sql.matchAll(/WHEN '([a-z-]+)' THEN ARRAY\[([^\]]*)\]/g)) {
    out[m[1]] = [...m[2].matchAll(/'([a-z_]+)'/g)].map((x) => x[1]);
  }
  return out;
}

test('the roles the database lets read a page are the roles the matrix lets open it', async () => {
  const matrix = await load('src/lib/access/matrix.ts', 'matrix');
  const lists = sqlViewRoles();
  const pages = Object.keys(lists);
  assert.ok(pages.length >= 14, 'every page the policies name has a list');
  for (const page of pages) {
    const expected = STORED_ROLES.filter((role) => matrix.atLeast(matrix.resolveLevel([role], page), 'view'));
    assert.deepEqual([...lists[page]].sort(), [...expected].sort(), `${page}: the database and the matrix disagree`);
  }
  // A page nobody listed answers nobody.
  assert.match(sql, /ELSE ARRAY\[\]::text\[\]/);
});

test('each narrowed table is read by the roles of its own page', () => {
  const pairs = {
    treasury_entries: 'ops-treasury', ads_spending: 'smm-ads', account_invites: 'people-invites',
    activity_logs: 'settings-activity', auto_email_templates: 'ops-auto-emails', editorial_items: 'smm-editorial',
    aod_signups: 'events-on-display', application_priorities: 'applications-screening',
    application_email_map: 'applications-screening', interview_slots: 'applications-interview-calendar',
    membership_fees: 'ops-fee', semester_members: 'ops-fee', role_permissions: 'settings-roles',
  };
  const lists = sqlViewRoles();
  for (const [table, page] of Object.entries(pairs)) {
    assert.match(sql, new RegExp(`\\['${table}',\\s+'${page}'\\]`), `${table} follows ${page}`);
    assert.ok(lists[page], `${page} has a list of roles`);
  }
  // Alumni contact details: no policy at all, so the service role only.
  assert.match(sql, /'membership_fees', 'semester_members', 'alumni_contacts',/);
  assert.doesNotMatch(sql, /\['alumni_contacts',/);
  // Registrations: your own, or every one for the organisers.
  assert.match(sql, /USING \(user_id = auth\.uid\(\) OR \(SELECT public\.sees_event_places\(auth\.uid\(\)\)\)\)/);
  // The two restricted libraries, rows and files.
  assert.match(sql, /WHEN 'external_relations' THEN \(SELECT public\.ws_views\(auth\.uid\(\), 'ops-external'\)\)/);
  assert.match(sql, /WHEN 'operations_statuto' THEN \(SELECT public\.ws_views\(auth\.uid\(\), 'ops-docs'\)\)/);
  assert.match(sql, /AND public\.ws_resource_file_open\(auth\.uid\(\), name\)/);
  assert.match(read('supabase/functions/admin-resources/index.ts'), /rpc\('ws_resource_file_open', \{ uid: user\.id, p_path: p \}\)/);
  const resources = read('supabase/functions/admin-resources/index.ts');
  assert.match(resources, /external_relations: 'ops-external',/);
  assert.match(resources, /operations_statuto: 'ops-docs',/);
});

test('the pages still read these tables only for the roles that open them', () => {
  // The workspace reads these directly; each read is the reader's own row
  // or happens on the page whose roles the policy names.
  const calendar = read('src/components/admin/WorkspaceCalendar.tsx');
  assert.match(calendar, /from\('membership_fees'\)\.select\('\*'\)\.eq\('period_id', fee\.id\)\.eq\('member_id', me\.id\)/, 'the Calendar reads the reader\'s own fee row');
  const events = read('src/lib/events-api.ts');
  assert.match(events, /from\('event_registrations'\)\.select\('event_id'\)\.eq\('user_id', uid\)/);
  assert.match(events, /from\('event_waitlist'\)\.select\('event_id'\)\.eq\('user_id', uid\)/);
  // None of the tables served by an edge function is read from the browser.
  const walk = (dir) => readdirSync(join(ROOT, dir)).flatMap((f) => {
    const p = `${dir}/${f}`;
    return statSync(join(ROOT, p)).isDirectory() ? walk(p) : (/\.(ts|tsx)$/.test(f) ? [p] : []);
  });
  const sources = walk('src').filter((p) => !p.endsWith('integrations/supabase/types.ts'));
  for (const table of ['treasury_entries', 'ads_spending', 'account_invites', 'auto_email_templates', 'editorial_items',
    'aod_signups', 'application_priorities', 'application_email_map', 'interview_slots', 'alumni_contacts', 'role_permissions']) {
    for (const p of sources) {
      assert.doesNotMatch(read(p), new RegExp(`from\\(['"]${table}['"]\\)`), `${p} reads ${table} directly: give it the page's roles or an edge function`);
    }
  }
});

test('an entry in the activity log carries the writer\'s own address and role', () => {
  assert.match(sql, /CREATE TRIGGER activity_logs_stamp_identity\s+BEFORE INSERT ON public\.activity_logs/);
  assert.match(sql, /IF v_uid IS NULL OR coalesce\(auth\.role\(\), ''\) = 'service_role' THEN\s+RETURN NEW;/);
  assert.match(sql, /NEW\.user_id\s+:= v_uid;\s+NEW\.user_email\s+:= COALESCE\(v_email, ''\);\s+NEW\.user_role\s+:= COALESCE\(v_role, 'member'\);/);
});

test('a visitor reads only the events the website shows or whose form is open to non-members', () => {
  assert.match(sql, /FOR SELECT TO anon\s+USING \(\s+event_type <> 'alumni_call'\s+AND \(show_on_website OR \(registration_enabled AND registration_audience <> 'members'\)\)/);
  assert.match(sql, /AND \(auth\.uid\(\) IS NOT NULL\s+OR e\.show_on_website\s+OR \(e\.registration_enabled AND e\.registration_audience <> 'members'\)\)/);
  // The registration page asks a visitor to sign in instead of saying "not found".
  const page = read('src/pages/EventRegister.tsx');
  assert.match(page, /if \(!event && !user\) \{/);
  assert.match(page, /Sign in to open this event/);
  assert.match(page, /<Link to="\/auth" state=\{\{ from: `\/events\/\$\{id\}\/register` \}\}>Sign in<\/Link>/);
  assert.match(page, /\}, \[id, user\?\.id\]\);/);
});

test('every database function the website or the workspace calls is on the list of its callers', () => {
  const list = (name) => [...sql.match(new RegExp(`${name} text\\[\\] := ARRAY\\[([\\s\\S]*?)\\];`))[1].matchAll(/'([a-z_]+)'/g)].map((m) => m[1]);
  // A later migration adds a function to a list by granting it there
  // (REVOKE ... FROM PUBLIC, anon ..., then GRANT EXECUTE ... TO anon).
  const later = readdirSync(join(ROOT, 'supabase/migrations')).filter((f) => f.endsWith('.sql') && f > MIGRATION_NAME)
    .map((f) => read(`supabase/migrations/${f}`)).join('\n');
  const grantedTo = (role) => [...later.matchAll(new RegExp(`GRANT EXECUTE ON FUNCTION (?:public\\.)?([a-z0-9_]+)\\([^)]*\\) TO ([^;]+);`, 'gi'))]
    .filter((m) => new RegExp(`\\b${role}\\b`).test(m[2])).map((m) => m[1]);
  const visitors = [...list('for_visitors'), ...grantedTo('anon')];
  const accounts = [...list('for_accounts'), ...grantedTo('authenticated')];
  const walk = (dir) => readdirSync(join(ROOT, dir)).flatMap((f) => {
    const p = `${dir}/${f}`;
    return statSync(join(ROOT, p)).isDirectory() ? walk(p) : (/\.(ts|tsx)$/.test(f) ? [p] : []);
  });
  const called = new Set();
  for (const p of [...walk('src'), 'vite.static-pages.ts', 'vite.key-numbers.ts']) {
    if (p.endsWith('integrations/supabase/types.ts')) continue;
    const text = read(p);
    for (const m of text.matchAll(/rpc\(\s*['"]([a-z0-9_]+)['"]/g)) called.add(m[1]);
    for (const m of text.matchAll(/\/rpc\/([a-z0-9_]+)/g)) called.add(m[1]);
  }
  assert.ok(called.size >= 14, 'the calls were found');
  for (const fn of called) {
    assert.ok(visitors.includes(fn) || accounts.includes(fn), `${fn} is called by the site but is on neither list in ${MIGRATION_NAME}: add it to for_visitors or for_accounts in a new migration`);
  }
  // What the public website and the build read must be open to a visitor.
  for (const fn of ['public_reports', 'public_track_record', 'public_fund_track_records', 'public_key_numbers',
    'public_alumni_directory', 'public_alumni_filter_count', 'public_past_boards', 'public_testimonial_companies', 'event_places']) {
    assert.ok(visitors.includes(fn), `${fn} is read without signing in`);
  }
  // The functions that queue emails are for the database and the edge functions.
  for (const fn of ['enqueue_staff_email', 'enqueue_app_email', 'enqueue_email', 'fee_payment_block', 'process_fee_reminders']) {
    assert.ok(!visitors.includes(fn) && !accounts.includes(fn), `${fn} must not be callable from outside`);
  }
  assert.match(sql, /EXECUTE format\('REVOKE EXECUTE ON FUNCTION %s FROM PUBLIC', f\.sig\);/);
  assert.match(sql, /EXECUTE format\('REVOKE EXECUTE ON FUNCTION %s FROM anon', f\.sig\);/);
  assert.match(sql, /EXECUTE format\('REVOKE EXECUTE ON FUNCTION %s FROM authenticated', f\.sig\);/);
});

test('a later migration that makes a privileged function takes it away from PUBLIC and from visitors', () => {
  const later = readdirSync(join(ROOT, 'supabase/migrations')).filter((f) => f.endsWith('.sql') && f > MIGRATION_NAME);
  for (const f of later) {
    const text = read(`supabase/migrations/${f}`);
    // Each function made with the database's own rights, by name.
    const made = [...text.matchAll(/CREATE\s+(?:OR\s+REPLACE\s+)?FUNCTION\s+(?:public\.)?([a-z0-9_]+)\s*\(([\s\S]*?)\$\$/gi)]
      .filter((m) => /SECURITY\s+DEFINER/i.test(m[2]))
      .map((m) => m[1]);
    for (const name of new Set(made)) {
      const revokes = [...text.matchAll(new RegExp(`REVOKE[^;]*ON\\s+FUNCTION\\s+(?:public\\.)?${name}\\b[^;]*FROM\\s+([^;]+);`, 'gi'))].map((m) => m[1].toLowerCase());
      const all = revokes.join(' ');
      assert.ok(/\bpublic\b/.test(all) && /\banon\b/.test(all),
        `${f}: ${name} runs with the database's own rights; REVOKE ALL ON FUNCTION ... FROM PUBLIC, anon (and authenticated unless an account calls it), then GRANT to its callers`);
    }
  }
});
