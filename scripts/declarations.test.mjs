// =====================================================================
// declarations.test.mjs: the texts people sign, the phone call and the
// semester commitment (Step 97).
// ---------------------------------------------------------------------
//   node --test scripts/declarations.test.mjs
//
// Pure checks on the sources, no database and no network:
//   * the signed texts are one file in two places, and a change of
//     wording cannot ship without a new version (each signature keeps the
//     version and the SHA-256 of what it was given);
//   * a typed name counts as a signature only with two words;
//   * the reminders keep their once-only markers: the call booking row,
//     the invitation, and the one commitment reminder per request;
//   * the commitment and declaration emails carry no unsubscribe link,
//     because a member needs them;
//   * the declaration is a signature in the Workspace only: no PDF, no
//     storage bucket, no countersignature; one receipt email;
//   * its three switches live with the application settings, off by
//     default, and only the Application Page's managers move them;
//   * signatures are deleted twelve months after membership ends, as the
//     Privacy Policy says, and the migration itself deletes nothing;
//   * the new pages and their grants agree in the browser and the server
//     copies of the access matrix;
//   * no em dash in anything Step 97 added.
// =====================================================================

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import { createHash } from 'node:crypto';

const ROOT = join(fileURLToPath(import.meta.url), '..', '..');
const read = (p) => readFileSync(join(ROOT, p), 'utf8');
const require = createRequire(import.meta.url);
const { transformSync } = require(join(ROOT, 'node_modules', 'esbuild'));
const load = async (p) => import('data:text/javascript;base64,'
  + Buffer.from(transformSync(read(p), { loader: 'ts', format: 'esm' }).code).toString('base64'));
const sha = (s) => createHash('sha256').update(s).digest('hex');

const MIGRATION = 'supabase/migrations/20261026090000_recruiting_2027.sql';
const EMAILS = 'supabase/migrations/20261026090100_recruiting_2027_emails.sql';
const text = await load('src/lib/declaration-text.ts');

test('the signed texts are the same file for the browser and the edge functions', () => {
  assert.equal(read('supabase/functions/_shared/declaration-text.ts'), read('src/lib/declaration-text.ts'));
});

test('a change of wording comes with a new version', () => {
  // When a text changes, give it a new version and update its hash here.
  const pinned = {
    'one-association-2027-1': '7cb08ac334b5a2d20a6335ed92b2758e4eba708e0f26cec7ebab855c50512f6e',
    'semester-commitment-2027-1/confirmed': '5601d1a79ae4b75d499405acb7b0deb9f393f8521ac3322ad13c6d772757ba1f',
    'semester-commitment-2027-1/declined': 'a2347d67726acdfb029354b2ddfa06ed831da52307981aabdad788aa88242f49',
  };
  const one = text.ONE_ASSOCIATION;
  assert.equal(sha(text.plainText(one)), pinned[one.version], `${one.version}: the wording changed, so give it a new version`);
  for (const d of ['confirmed', 'declined']) {
    const t = text.commitmentText('Spring 2027', d);
    assert.equal(sha(text.plainText(t)), pinned[`${t.version}/${d}`], `${t.version} (${d}): the wording changed, so give it a new version`);
  }
});

test('the declaration rests on the Board, not on the Statute, and the commitment cites the Statute', () => {
  assert.match(text.ONE_ASSOCIATION.closing, /condition of membership approved by the Board of Directors/);
  assert.match(text.commitmentText('Fall 2027', 'confirmed').clauses.join(' '), /Article 8/);
  assert.match(text.commitmentText('Fall 2027', 'declined').clauses.join(' '), /Article 9/);
});

test('a typed name is a signature only with a first name and a surname', () => {
  for (const ok of ['Carla Rossi', '  Maria  De Luca ', 'Jean-Luc Picard']) assert.equal(text.typedNameOk(ok), true, ok);
  for (const no of ['', 'Carla', '   ', null, undefined, 42, 'A '.repeat(70)]) assert.equal(text.typedNameOk(no), false, String(no));
});

test('each reminder is sent once, from a stored marker', () => {
  const sql = read(MIGRATION);
  // The call: the booking row marks the reminder before the call, and a
  // cancelled booking takes its marker with it (AGENTS.md).
  assert.match(sql, /reminder_sent_at\s+timestamptz/);
  assert.match(sql, /UPDATE public\.call_bookings[\s\S]{0,400}reminder_sent_at = now\(\)/);
  assert.match(sql, /call_reminder_sent_at/);
  // The commitment: the request once, the reminder once, each marked.
  assert.match(sql, /SET request_sent_at = now\(\)[\s\S]{0,400}q\.request_sent_at IS NULL/);
  assert.match(sql, /SET reminder_sent_at = now\(\)[\s\S]{0,400}q\.reminder_sent_at IS NULL/);
  // The reminder delay is copied at launch, so a later change cannot add one.
  assert.match(sql, /reminder_after\s+interval NOT NULL/);
});

test('the commitment asks every active member except Advisors and the admin account', () => {
  const sql = read(MIGRATION);
  assert.match(sql, /m\.membership_status = 'active'/);
  assert.match(sql, /m\.role::text <> 'advisor'/);
  assert.match(sql, /<> 'as\.minerva@unibocconi\.it'/);
});

test('running the migrations deletes nothing', () => {
  // Only the statements the migration runs, not the bodies of the
  // functions it defines (the retention job and the call release delete
  // by design, later, under their own rules).
  for (const f of [MIGRATION, EMAILS]) {
    const sql = read(f).replace(/--.*$/gm, '').replace(/\$(\w*)\$[\s\S]*?\$\1\$/g, '');
    assert.doesNotMatch(sql, /\bDELETE\s+FROM\b/i, f);
    assert.doesNotMatch(sql, /\bTRUNCATE\b/i, f);
    assert.doesNotMatch(sql, /\bDROP\s+TABLE\b/i, f);
  }
});

test('the declaration is a signature in the Workspace: no PDF, no countersignature, one receipt', () => {
  const sql = read(MIGRATION);
  assert.doesNotMatch(sql, /storage\.buckets/, 'no storage bucket');
  assert.doesNotMatch(sql.replace(/--.*$/gm, ''), /countersign|pdf_path/i, 'no countersignature or PDF column');
  for (const f of ['supabase/functions/_shared/declarations.ts', 'supabase/functions/declarations/index.ts', 'supabase/functions/applicant-notify/index.ts']) {
    const src = read(f).replace(/\/\/.*$/gm, '');
    assert.doesNotMatch(src, /pdf-lib|renderDeclaration|storeDeclarationPdf|countersign\(/, f);
  }
  // No signed link to a document either (applicant-notify keeps its own, for the candidate's CV).
  for (const f of ['supabase/functions/_shared/declarations.ts', 'supabase/functions/declarations/index.ts']) {
    assert.doesNotMatch(read(f), /createSignedUrl|storage\.from/, f);
  }
  assert.doesNotMatch(read('supabase/functions/declarations/index.ts'), /action === 'pdf-url'|action === 'countersign'/);
  const emails = read('supabase/functions/_shared/transactional-emails.ts');
  assert.doesNotMatch(emails, /declaration_countersign/, 'the countersignature emails are gone');
  assert.match(emails, /received your acceptance of the one-association policy/, 'the receipt says what it confirms');
  // An earlier draft's two emails are switched off, never deleted.
  assert.match(read(EMAILS), /UPDATE public\.auto_email_templates SET connected = false\s+WHERE key IN \('declaration_countersign_request', 'declaration_countersigned'\)/);
});

test('the three switches live with the application settings, off by default', () => {
  const sql = read(MIGRATION);
  for (const k of ['declaration_at_offer', 'declaration_at_commitment', 'declaration_on_join']) {
    assert.match(sql, new RegExp(`ALTER TABLE public\\.application_settings ADD COLUMN IF NOT EXISTS ${k} boolean NOT NULL DEFAULT false`), k);
  }
  const fn = read('supabase/functions/admin-settings/index.ts');
  assert.match(fn, /DECLARATION_SWITCHES = \['declaration_at_offer', 'declaration_at_commitment', 'declaration_on_join'\]/);
  // Moved only by those who manage the Application Page (as closing a division).
  assert.match(fn, /const switches = DECLARATION_SWITCHES[\s\S]{0,200}if \(!canCloseDivisions\)/);
  // The server asks the right switch for each place.
  assert.match(read('supabase/functions/applicant-notify/index.ts'), /declarationRequired\(supabase, 'offer'\)/);
  assert.match(read('supabase/functions/declarations/index.ts'), /declarationRequired\(supabase, 'commitment'\)/);
  // The Join page shows the text people sign, from the same file.
  const notice = read('src/components/join/DeclarationNotice.tsx');
  assert.match(notice, /from '@\/lib\/declaration-text'/);
  assert.match(notice, /declaration_on_join/);
});

test('signatures are kept for membership and twelve months after, as the Privacy Policy says', () => {
  const sql = read(MIGRATION);
  assert.match(sql, /DELETE FROM public\.signed_documents WHERE membership_ended_at < now\(\) - interval '12 months'/);
  assert.match(sql, /DELETE FROM public\.commitment_requests WHERE membership_ended_at < now\(\) - interval '12 months'/);
  assert.match(sql, /membership_status IN \('alumni', 'expelled'\)/);
  assert.match(sql, /DELETE FROM public\.signed_documents WHERE application_id = OLD\.id AND member_id IS NULL/);
  assert.match(sql, /cron\.schedule\('declaration_retention'/);
  const policy = read('src/pages/PrivacyPolicy.tsx').replace(/\s+/g, ' ');
  assert.match(policy, /Signed declarations and semester commitments:<\/strong> for the duration of membership and twelve months after it ends, then deleted/);
  assert.doesNotMatch(policy, /PDF copy|countersign/i, 'the policy promises no PDF and no countersignature');
});

test('the emails a member or candidate needs carry no unsubscribe link', () => {
  const sql = read(EMAILS);
  const keys = ['call_invitation', 'call_booking_reminder', 'call_booking_confirmation', 'call_reminder_30m',
    'staff_call_booked', 'staff_call_released', 'declaration_signed',
    'commitment_request', 'commitment_reminder', 'commitment_recorded'];
  const src = read('supabase/functions/_shared/transactional-emails.ts');
  for (const k of keys) {
    assert.match(src, new RegExp(`t\\('${k}',`), `${k} in transactional-emails.ts`);
    const at = sql.indexOf(`'${k}'`);
    assert.ok(at > 0, `${k} in the email migration`);
    const values = sql.slice(at, sql.indexOf('ON CONFLICT', at));
    assert.doesNotMatch(values, /unsubscribe_url/, `${k} has no unsubscribe link`);
  }
  // Each new row is inserted with a NULL optout_topic (after the body: connected, optout_topic).
  const topics = [...sql.matchAll(/<\/html>\$r[0-9a-z]+\$, (true|false), (NULL|'[^']*'),/g)];
  assert.equal(topics.length, keys.length, 'one row per template');
  for (const [, , topic] of topics) assert.equal(topic, 'NULL', 'not optional');
});

test('the new pages are granted alike in the browser and on the server', () => {
  const browser = read('src/lib/access/matrix.ts');
  const server = read('supabase/functions/_shared/access.ts');
  for (const key of ['applications-calls', 'settings-declarations']) {
    assert.match(browser, new RegExp(`vice_president: \\{[^}]*'${key}': 'manage'`), `${key}, browser`);
    assert.match(server, new RegExp(`'${key}': 'manage'`), `${key}, server`);
  }
  assert.match(browser, /'applications-call'/, 'the candidate page');
});

test('no em dash in anything Step 97 added', () => {
  const files = [
    'src/lib/declaration-text.ts', 'src/lib/declarations-api.ts', 'src/lib/calls-api.ts', 'src/lib/division-fit.ts',
    'src/components/admin/CallCandidate.tsx', 'src/components/admin/PhoneCalls.tsx', 'src/components/admin/CommitmentBoard.tsx',
    'src/components/admin/CommitmentPanel.tsx', 'src/components/admin/SettingsDeclarations.tsx',
    'src/components/admin/dashboard/CommitmentBanner.tsx', 'src/components/join/DivisionFitInvite.tsx', 'src/pages/DivisionFit.tsx',
    'src/components/join/DeclarationNotice.tsx', 'supabase/functions/_shared/declarations.ts',
    'supabase/functions/declarations/index.ts', 'supabase/functions/recruiting-calls/index.ts',
    'supabase/functions/division-fit/index.ts', 'supabase/functions/division-fit/engine.js', MIGRATION, EMAILS,
  ];
  for (const f of files) assert.doesNotMatch(read(f), /—/, f);
});
