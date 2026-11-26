// =====================================================================
// STEP 110: the activity log, rebuilt. Every action the workspace
// records has its own sentence, written into the entry as it happens;
// the workspace's own actions are marked automatic and recorded only
// when they change something; older entries read from the same words.
// ---------------------------------------------------------------------
//   node --test scripts/activity-log.test.mjs
// =====================================================================

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';
import { createRequire } from 'node:module';

const ROOT = join(fileURLToPath(import.meta.url), '..', '..');
const read = (p) => readFileSync(join(ROOT, p), 'utf8');
const require = createRequire(import.meta.url);
const { transformSync } = require(join(ROOT, 'node_modules', 'esbuild'));
const load = async (p) => import('data:text/javascript;base64,' + Buffer.from(transformSync(read(p), { loader: 'ts', format: 'esm' }).code).toString('base64'));

test('one file of sentences, mirrored byte for byte for the workspace', () => {
  assert.equal(read('src/lib/activity-sentences.ts'), read('supabase/functions/_shared/activity-sentences.ts'));
});

test('every action the workspace records has a sentence of its own', async () => {
  const S = await load('supabase/functions/_shared/activity-sentences.ts');
  const list = execFileSync('node', [join(ROOT, 'scripts/check-activity-coverage.mjs'), '--list'], { encoding: 'utf8' });
  const missing = [];
  for (const line of list.split('\n')) {
    const m = /^(\S+)\s+(\S+)\s+(\S+)\s+/.exec(line);
    if (!m || m[1] === 'Edge' || m[1] === 'Recorded' || m[1] === 'No') continue;
    if (m[1] === 'table') {
      for (const v of ['create', 'update', 'delete']) {
        if (m[2] === 'onboarding_progress' || m[2] === 'gpa_calculations' || m[2] === 'page_visibility' || m[2] === 'newsletter_subscribers' || m[2] === 'calendar_entries' || m[2] === 'exam_sessions' || m[2] === 'report_deadlines') {
          if (!S.hasSentence(`table:${m[2]}:${v}`) && !(m[2] === 'page_visibility' && v === 'delete')) missing.push(`table:${m[2]}:${v}`);
        }
      }
      continue;
    }
    if (!S.hasSentence(`${m[1]}:${m[2]}`)) missing.push(`${m[1]}:${m[2]}`);
  }
  assert.deepEqual(missing, [], 'actions worded only by the generic fallback');
});

test('the sentences say what happened, naming what was touched', async () => {
  const S = await load('supabase/functions/_shared/activity-sentences.ts');
  const say = (fn, action, name, details = {}, verb = 'update') => S.activitySentence({ fn, action, verb, name, details });
  assert.equal(say('admin-files', 'delete', 'Global Outlook'), 'Moved the report “Global Outlook” to the bin (recoverable for 30 days)');
  assert.equal(say('admin-files', 'set-status', 'Global Outlook', { to: 'published' }), 'Published the report “Global Outlook”');
  assert.equal(say('admin-applications', 'sign-url', 'Anna Rossi', { document: 'cv', mode: 'view' }), 'Opened the CV of Anna Rossi');
  assert.equal(say('admin-applications', 'update-status', 'Anna Rossi', { to: 'rejected' }), 'Rejected Anna Rossi');
  assert.equal(say('admin-rosters', 'match-decide', 'Elena Broggini and Elena Sofia Broggini', { decision: 'the same person' }), 'Joined Elena Broggini and Elena Sofia Broggini as one person');
  assert.equal(say('career-ib', 'guide-cover', 'The 400 Questions'), 'Stored the cover of the guide “The 400 Questions”');
  assert.ok(S.isAutomatic('admin-files', 'purge-expired'));
  assert.ok(S.isAutomatic('career-ib', 'guide-cover'));
  assert.ok(!S.isAutomatic('admin-files', 'delete'), 'a person\'s deletion is never automatic');
  assert.equal(S.functionOfEntry('files'), 'admin-files', 'an older entry finds its function from what it kept');
  assert.equal(S.functionOfEntry('career-ib'), 'career-ib');
});

test('the archive\'s clean-up is recorded only when it removed something, as automatic', () => {
  const files = read('supabase/functions/admin-files/index.ts');
  const purge = files.slice(files.indexOf("case 'purge-expired': {"), files.indexOf("case 'bulk-update': {"));
  assert.match(purge, /if \(purged === 0\) audit\.skip\(\)/);
  assert.match(purge, /audit\.note\(\{ purged, automatic: true \}\)/);
  const wrapper = read('supabase/functions/_shared/activity.ts');
  assert.match(wrapper, /if \(s\.skip && ok\) return;/, 'a refused attempt is still recorded');
  assert.match(wrapper, /summary, \.\.\.\(automatic \? \{ automatic: true \} : \{\}\)/, 'each entry keeps its sentence');
  const page = read('src/components/admin/ActivityManagement.tsx');
  assert.match(page, /if \(!showAutomatic && isAutomaticEntry\(activity\)\) return false;/, 'the workspace\'s own actions are hidden unless asked for');
  assert.match(page, /if \(typeof d\.summary === 'string' && d\.summary\.trim\(\)\) return d\.summary;/);
});

test('the report actions and the candidate documents name what they touched', () => {
  const files = read('supabase/functions/admin-files/index.ts');
  const status = files.slice(files.indexOf("case 'set-status': {"), files.indexOf("case 'delete': {"));
  assert.match(status, /audit\.subject\(existing\?\.title \|\| 'Unknown file', parsed\.data\.id\)/);
  const apps = read('supabase/functions/admin-applications/index.ts');
  const sign = apps.slice(apps.indexOf("if (action === 'sign-url')"), apps.indexOf("if (action === 'bulk-urls')"));
  assert.match(sign, /audit\.subject\(`\$\{app\.first_name\} \$\{app\.surname\}`, app\.id\);/);
});

test('nothing added carries an em dash', () => {
  for (const f of ['supabase/functions/_shared/activity-sentences.ts', 'src/components/admin/ActivityManagement.tsx', 'scripts/activity-log.test.mjs']) {
    assert.doesNotMatch(read(f), /\u2014/, f);
  }
});
