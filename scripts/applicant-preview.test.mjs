// =====================================================================
// APPLICANT PREVIEW, YOUR FEE AND THE PHONE'S SEARCH (Step 106B).
// ---------------------------------------------------------------------
// Recruiting, Applicant Preview draws an applicant's own pages for a
// staff account with a SAMPLE applicant (Michael Burry). The member's fee
// is read once (my-fee.ts) for My Profile and the Dashboard, and the fee
// emails link to it. The search remembers the last pages, per account.
// This test fails if:
//   * an applicant data function can reach the server while a preview
//     runs, or the preview's bookings and answers stop moving the stage;
//   * the preview's email list and the server's drift apart, or the
//     server's function sends, writes or skips the access check;
//   * the page leaves the navigation, the access matrix, the workspace's
//     rendering cases, the phone list or the read-only exemption;
//   * the fee card, the Dashboard and the emails stop agreeing on the
//     fee, its link (`?show=fee`) or the leave and exchange sentence;
//   * the recent pages are shared between accounts or show more than three;
//   * the notifications slide back under the phone's bar.
//
//   node --test scripts/applicant-preview.test.mjs
// =====================================================================
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, mkdirSync, readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { createRequire } from 'node:module';

const ROOT = join(fileURLToPath(import.meta.url), '..', '..');
const read = (p) => readFileSync(join(ROOT, p), 'utf8');
const require = createRequire(import.meta.url);
const { build } = require(join(ROOT, 'node_modules', 'esbuild'));
const CACHE = join(ROOT, 'node_modules', '.cache', 'applicant-preview-test');
mkdirSync(CACHE, { recursive: true });
const load = async (p, name) => {
  const out = join(CACHE, `${name}.mjs`);
  await build({
    entryPoints: [join(ROOT, p)], bundle: true, outfile: out, format: 'esm', platform: 'node', logLevel: 'silent',
    alias: { '@': join(ROOT, 'src') }, packages: 'external', jsx: 'automatic',
    define: { 'import.meta.env': JSON.stringify({ DEV: false }) },
    // The pure functions are tested here: the database client is a stub.
    plugins: [{
      name: 'no-database',
      setup(b) {
        b.onResolve({ filter: /integrations\/supabase\/client$/ }, () => ({ path: 'client', namespace: 'stub' }));
        b.onLoad({ filter: /.*/, namespace: 'stub' }, () => ({ contents: 'export const supabase = {};', loader: 'js' }));
      },
    }],
  });
  return import(`${pathToFileURL(out).href}?${Date.now()}`);
};

/** The body of `export async function name(...) { ... }`, to its first statements. */
function opening(src, name) {
  const at = src.search(new RegExp(`export async function ${name}\\(`));
  assert.ok(at >= 0, `${name} is still exported`);
  const brace = src.indexOf('{', src.indexOf(')', at));
  return src.slice(brace + 1, brace + 160);
}

test('every applicant data function answers from the preview before the server', () => {
  const files = {
    'src/lib/applications-api.ts': ['getMyApplication', 'signMyDocument', 'acceptOffer', 'declineOffer', 'withdrawApplication'],
    'src/lib/interviews-api.ts': ['getInterviewContext', 'listAvailableSlots', 'bookSlot', 'cancelBooking'],
    'src/lib/calls-api.ts': ['myCallContext', 'availableCallSlots', 'bookCall', 'cancelCall'],
  };
  for (const [file, names] of Object.entries(files)) {
    const src = read(file);
    assert.match(src, /import \{ applicantPreview \} from '@\/lib\/applicant-preview';/, `${file} reads the preview`);
    for (const name of names) {
      const body = opening(src, name);
      assert.match(body, /^\s*const preview = applicantPreview\(\);\s*if \(preview\) return preview\.\w+\(/, `${file}: ${name} asks the preview first`);
    }
  }
});

test('the preview is a sample applicant whose bookings and answers move the stage, and nothing else', async () => {
  const P = await load('src/lib/applicant-preview.ts', 'preview');
  assert.equal(P.applicantPreview(), null, 'off until the page starts it');
  let changes = 0;
  const stop = P.subscribeApplicantPreview(() => { changes += 1; });

  P.startApplicantPreview('received');
  const c = P.applicantPreview();
  assert.ok(c, 'on once started');
  const app = c.application();
  assert.equal(`${app.first_name} ${app.surname}`, 'Michael Burry');
  assert.match(app.email, /@example\.com$/, 'an address nobody reads');
  assert.equal(app.status, 'under_review');
  assert.equal(c.interviewContext().invited, false);

  P.setPreviewStage('interview-invited');
  assert.equal(c.application().status, 'interview_invitation_sent');
  assert.equal(c.interviewContext().booking, null);
  const slots = c.interviewSlots();
  assert.ok(slots.length >= 2, 'slots to choose from');
  c.bookInterview(slots[0].id);
  assert.equal(P.previewStage(), 'interview-booked', 'booking moves the stage on');
  assert.equal(c.interviewContext().booking.slot_id, slots[0].id);
  assert.deepEqual(c.interviewSlots(), [], 'no slots offered once booked');
  c.cancelInterview();
  assert.equal(P.previewStage(), 'interview-invited', 'cancelling moves it back');

  P.setPreviewStage('call-booked');
  assert.ok(c.interviewContext().booking, 'the interview stays booked on later stages');
  assert.ok(c.callContext().booking, 'the call is booked at this stage');
  c.cancelCall();
  assert.equal(P.previewStage(), 'call-invited');
  c.bookCall(c.callSlots()[0].id);
  assert.equal(P.previewStage(), 'call-booked');

  P.setPreviewStage('offer');
  assert.equal(c.application().status, 'accepted');
  assert.ok(c.application().offer_deadline, 'an offer has a deadline');
  c.answerOffer('accepted');
  assert.equal(P.previewStage(), 'joined');
  assert.equal(c.application().status, 'offer_accepted');

  P.setPreviewStage('not-selected');
  assert.equal(c.application().status, 'rejected');
  assert.equal(c.interviewContext().booking, null, 'no booking is shown to a candidate not selected');
  c.withdraw();
  assert.equal(c.application().status, 'withdrawn');

  assert.match(c.documentUrl('cv'), /\/preview\/sample-cv\.pdf$/);
  assert.match(c.documentUrl('answer'), /\/preview\/sample-written-answer\.pdf$/);
  assert.ok(changes > 5, 'the page is told about every change');

  P.stopApplicantPreview();
  assert.equal(P.applicantPreview(), null, 'off again: every function goes back to the server');
  stop();
});

test('the sample documents exist and say they are samples', () => {
  for (const f of ['sample-cv.pdf', 'sample-written-answer.pdf']) {
    const p = join(ROOT, 'public', 'preview', f);
    assert.ok(existsSync(p), `${f} is shipped`);
    assert.equal(readFileSync(p).subarray(0, 5).toString('latin1'), '%PDF-', `${f} is a PDF`);
  }
  const src = read('src/lib/applicant-preview.ts');
  assert.match(src, /cv: '\/preview\/sample-cv\.pdf'/);
  assert.match(src, /answer: '\/preview\/sample-written-answer\.pdf'/);
});

test('the preview shows the same emails as the server fills, and the server sends and writes nothing', async () => {
  const shared = read('supabase/functions/_shared/applicant-preview.ts');
  const block = shared.slice(shared.indexOf('APPLICANT_EMAIL_KEYS = ['), shared.indexOf('] as const;'));
  const serverKeys = [...block.matchAll(/'([a-z0-9_]+)'/g)].map((m) => m[1]);
  assert.ok(serverKeys.length >= 15, 'the server lists the applicant emails');
  const P = await load('src/lib/applicant-preview.ts', 'preview-keys');
  const clientKeys = P.APPLICANT_EMAILS.map((e) => e.key);
  assert.deepEqual([...clientKeys].sort(), [...serverKeys].sort(), 'the page and the function list the same emails');
  assert.equal(new Set(clientKeys).size, clientKeys.length, 'each email once');
  const stages = new Set(P.PREVIEW_STAGES.map((s) => s.id));
  for (const e of P.APPLICANT_EMAILS) {
    assert.ok(e.stage === 'other' || stages.has(e.stage), `${e.key} belongs to a stage`);
    assert.ok(e.when && !/\u2014/.test(e.when), `${e.key} says when it is sent, without an em dash`);
  }
  const registry = read('supabase/functions/_shared/transactional-emails.ts');
  for (const k of serverKeys) assert.ok(registry.includes(`t('${k}',`) || registry.includes(`bookingReminder('${k}',`), `${k} is an email the source defines`);
  assert.match(shared, /first_name: 'Michael',\s*surname: 'Burry',\s*email: 'michael\.burry@example\.com'/);

  const fn = read('supabase/functions/applicant-preview/index.ts');
  const check = fn.indexOf("allows(rolesOf(roleRows), user.email, 'applications-screening', 'view')");
  assert.ok(check > 0, 'open only to the roles that can open Candidates Screening');
  assert.ok(check < fn.indexOf("from('auto_email_templates')"), 'the check comes before any email is read');
  for (const verb of ['.insert(', '.update(', '.upsert(', '.delete(', '.rpc(', 'enqueue', 'sendEmail', 'fetch(']) {
    assert.ok(!fn.includes(verb), `the function never ${verb}`);
  }
  assert.match(read('supabase/config.toml'), /\[functions\.applicant-preview\]\s*\n\s*verify_jwt = false/);
});

test('Applicant Preview is a Recruiting page for the roles that open Candidates Screening', () => {
  assert.match(read('src/lib/workspace-nav.ts'), /key: 'applications-preview', slug: 'applicant-preview', label: 'Applicant Preview', allowed: \(p\) => p\.can\('applications-preview'\)/);
  assert.match(read('src/lib/access/matrix.ts'), /'applications-preview': 'applications-screening',/);
  const ws = read('src/pages/MinervaWorkspace.tsx');
  assert.match(ws, /case 'applications-preview':\s*(\/\/[^\n]*\s*)*return <ApplicantPreview \/>;/);
  assert.match(ws, /'applications-preview': \(\) => import\('@\/components\/admin\/recruiting\/ApplicantPreview'\)/);
  assert.match(read('src/lib/mobile-policy.ts'), /'applications-preview',/);
  assert.match(read('src/components/admin/ReadOnlyRegion.tsx'), /EXEMPT_RESOURCES = new Set\(\[[^\]]*'applications-preview'/);
  assert.match(read('src/lib/workspace-guide.ts'), /key: 'applications-preview', section: 'Recruiting'/);
  assert.match(read('src/lib/workspace-sections.ts'), /\{ key: 'applications-preview', label: 'Applicant preview' \}/, 'the role access matrix in Settings lists it');
  assert.match(read('src/lib/workspace-manual.ts'), /Applicant Preview/);
  assert.match(read('src/components/admin/HowToUse.tsx'), /Applicant Preview/);
  assert.match(read('src/lib/workspace-tours.ts'), /onPage\('applications', 'applications-preview'/);

  const page = read('src/components/admin/recruiting/ApplicantPreview.tsx');
  assert.match(page, /startApplicantPreview\(/, 'the page starts the preview');
  assert.match(page, /stopApplicantPreview\(\)/, 'and stops it when it is left');
  assert.match(page, /sandbox=""/, 'an email is drawn in a frame that runs nothing');
  assert.match(page, /invokeFunction\('applicant-preview'/);
  assert.ok(!/\u2014/.test(page), 'no em dash');
});

test('the fee is read once and said the same way everywhere', async () => {
  const F = await load('src/lib/my-fee.ts', 'my-fee');
  assert.equal(F.FEE_QUERY, 'show=fee');
  const period = (o = {}) => ({
    semester_label: 'Autumn 2026', fee_amount: '30', closed: false, first_deadline: '2026-11-10', second_deadline: '2026-11-30',
    created_at: '2026-10-01T09:00:00Z', payment_method: 'Bank transfer', payment_account_holder: 'Minerva', payment_iban: 'it60x0542811101000000123456',
    payment_reference: 'FEE', payment_notes: null, ...o,
  });
  const fees = F.toMyFees([
    { id: 'old', period_id: 'p0', paid: true, amount: null, collected_at: '2026-03-02', exempt: false, fee_periods: period({ semester_label: 'Spring 2026', closed: true, created_at: '2026-02-01T09:00:00Z' }) },
    { id: 'now', period_id: 'p1', paid: false, amount: null, collected_at: null, exempt: false, fee_periods: period() },
    { id: 'gone', period_id: 'p2', paid: false, amount: null, collected_at: null, exempt: false, fee_periods: null },
  ]);
  assert.deepEqual(fees.map((f) => f.id), ['now', 'old'], 'newest first, a row without its collection left out');
  const now = F.currentFee(fees);
  assert.equal(now.id, 'now', 'the open collection is the one to talk about');
  assert.equal(now.amount, 30);
  assert.equal(F.feeState(now, new Date('2026-11-17T12:00:00')), 'due');
  assert.equal(F.nextDeadline(now, new Date('2026-11-17T12:00:00')), '2026-11-30');
  assert.equal(F.feeState(now, new Date('2026-12-02T12:00:00')), 'overdue');
  assert.equal(F.feeState({ ...now, paid: true }), 'paid');
  assert.equal(F.feeState({ ...now, exempt: true, paid: false }), 'exempt');
  assert.equal(F.feeState({ ...now, open: false }), 'unpaid');
  assert.equal(F.feeNeedsAction({ ...now, paid: true }), false, 'a paid fee asks nothing');
  assert.equal(F.feeNeedsAction(null), false);
  assert.equal(F.feeAmountLabel(30), 'EUR 30.00');
  assert.equal(F.ibanGroups('it60x0542811101000000123456'), 'IT60 X054 2811 1010 0000 0123 456');

  const emails = read('supabase/functions/_shared/transactional-emails.ts');
  const sentence = emails.match(/const LEAVE_AND_EXCHANGE = '([^']+)';/)[1];
  assert.equal(F.LEAVE_AND_EXCHANGE_NOTE, sentence, 'the card and the emails say the same sentence');
  assert.match(emails, /const FEE_STATUS = `\$\{SITE\}\/workspace\/my-profile\/membership\?show=fee`;/);
  for (const key of ['ws_fee_collection', 'ws_membership_reminder', 'ws_fee_payment_received']) {
    const at = emails.indexOf(`t('${key}',`);
    assert.ok(at > 0, `${key} is defined`);
    const body = emails.slice(at, emails.indexOf('\n  t(', at + 4));
    assert.match(body, /LEAVE_AND_EXCHANGE/, `${key} mentions leave and exchange`);
    assert.match(body, /FEE_STATUS/, `${key} links to the fee status`);
  }

  const mig = read('supabase/migrations/20261117090000_fee_emails_leave_and_exchange.sql');
  for (const key of ['ws_fee_collection', 'ws_membership_reminder', 'ws_fee_payment_received']) assert.ok(mig.includes(`'${key}'`), `the migration writes ${key}`);
  assert.ok(mig.includes(sentence), 'the stored copies carry the sentence');
  assert.ok(mig.includes('/workspace/my-profile/membership?show=fee'), 'and the link');
  assert.match(mig, /ON CONFLICT \(key\) DO UPDATE/i, 'safe to run twice');
  assert.ok(!/\b(DELETE FROM|TRUNCATE|DROP TABLE)\b/i.test(mig), 'it deletes nothing');
  const backup = mig.indexOf('INSERT INTO public.auto_email_templates_backup');
  assert.ok(backup > 0 && backup < mig.indexOf('INSERT INTO public.auto_email_templates ('), 'each stored copy is backed up before it is changed');
  assert.match(mig, /ON CONFLICT \(key, reason\) DO NOTHING/, 'a second run keeps the first backup');
  assert.match(mig, /REVOKE ALL ON public\.auto_email_templates_backup FROM PUBLIC, anon, authenticated;/, 'nobody reads the backup through the data API');

  const card = read('src/components/admin/profile/FeeStatusCard.tsx');
  assert.match(card, /id="fee"/, 'the card is where ?show=fee lands');
  assert.match(card, /LEAVE_AND_EXCHANGE_NOTE/);
  assert.match(read('src/components/admin/profile/MembershipPage.tsx'), /<MyFeeSection \/>/);
  const dash = read('src/components/admin/dashboard/CurrentUpdateBlock.tsx');
  assert.match(dash, /\$\{workspacePath\('my-role', 'my-membership'\)\}\?\$\{FEE_QUERY\}/, 'the Dashboard links to the same place');
  assert.match(dash, /data-dashboard-report/, 'with the latest report beside the fee');
  assert.match(read('src/components/admin/dashboard/useDashboardData.ts'), /feeNeedsAction\(mine\)/, 'and the fee card only while something is to do');

  const R = await load('src/lib/return-path.ts', 'return-path');
  assert.equal(R.safeReturnPath('/workspace/my-profile/membership?show=fee'), '/workspace/my-profile/membership?show=fee', 'a reader who signs in first lands on the fee');
});

test('the search remembers three pages per account, and the phone opens its keyboard in the tap', async () => {
  const store = new Map();
  globalThis.localStorage = { getItem: (k) => (store.has(k) ? store.get(k) : null), setItem: (k, v) => store.set(k, String(v)), removeItem: (k) => store.delete(k) };
  const R = await load('src/lib/recent-pages.ts', 'recent');
  assert.equal(R.RECENT_SHOWN, 3);
  for (const p of ['dashboard', 'people-members', 'events-mine', 'my-role', 'reports-archive']) R.rememberPage('anna', p);
  R.rememberPage('anna', 'events-mine');
  const kept = R.recentPages('anna');
  assert.equal(kept[0], 'events-mine', 'newest first, once');
  assert.equal(new Set(kept).size, kept.length);
  assert.deepEqual(R.pagesToOffer(kept, 'events-mine'), kept.filter((p) => p !== 'events-mine').slice(0, 3), 'the page being read is not offered');
  assert.ok(R.pagesToOffer(kept, null).length <= 3, 'at most three');
  assert.deepEqual(R.recentPages('marco'), [], "another account never sees anna's pages");
  assert.deepEqual(R.recentPages(null), [], 'nobody signed in, nothing kept');
  R.rememberPage(null, 'dashboard');
  assert.ok(![...store.keys()].some((k) => k.endsWith('.null') || k.endsWith('.undefined')));
  store.set('mims.recent-pages.anna', '{not json');
  assert.deepEqual(R.recentPages('anna'), [], 'a broken entry reads as nothing');
  globalThis.localStorage = { getItem: () => { throw new Error('blocked'); }, setItem: () => { throw new Error('blocked'); } };
  assert.doesNotThrow(() => R.rememberPage('anna', 'dashboard'));
  assert.deepEqual(R.recentPages('anna'), []);
  delete globalThis.localStorage;

  const search = read('src/components/admin/WorkspaceSearch.tsx');
  assert.match(search, /import \{ flushSync \} from 'react-dom';/);
  assert.match(search, /flushSync\(\(\) => setOpen\(true\)\);\s*inputRef\.current\?\.focus\(/, 'the box is drawn and focused inside the tap');
  assert.match(search, /Recently visited/);
  assert.match(read('src/pages/MinervaWorkspace.tsx'), /rememberPage\(user\?\.id,/, 'remembered per account');
});

test('on a phone: four buttons, the website at the top, notifications above the bar, no ribbon and no welcome toast', () => {
  const bar = read('src/lib/mobile-bar.ts');
  for (const label of ['Menu', 'My Profile', 'My Events', 'Search']) assert.ok(bar.includes(`'${label}'`), `the bar has ${label}`);
  const shell = read('src/components/admin/MobileWorkspaceShell.tsx');
  assert.match(shell, /aria-label="Back to website"/);
  assert.match(shell, /data-ws-dock/);
  assert.ok(!/read online|Mobile version/i.test(shell), 'the read-only ribbon is gone');
  assert.match(read('src/components/ui/toast.tsx'), /ws-toast-viewport/);
  const css = read('src/index.css');
  assert.match(css, /html\[data-ws-dock\] \.ws-toast-viewport \{ bottom: calc\(4rem \+ env\(safe-area-inset-bottom\)/);
  assert.match(css, /html\[data-ws-dock\] \[data-sonner-toaster\]\[data-y-position="bottom"\]/);
  assert.ok(!/title: ['"]Welcome back/.test(read('src/pages/Auth.tsx')), 'no welcome toast after signing in');
  assert.match(read('src/components/admin/WorkspaceCalendar.tsx'), /className="relative -mx-4 flex gap-1\.5 overflow-x-auto/, "the calendar's chips stay in their row");
});

test('no em dash in the files this step added', () => {
  const files = [
    'src/lib/applicant-preview.ts', 'src/lib/my-fee.ts', 'src/lib/recent-pages.ts',
    'src/components/admin/recruiting/ApplicantPreview.tsx', 'src/components/admin/profile/ApplicantProfile.tsx',
    'src/components/admin/profile/FeeStatusCard.tsx', 'supabase/functions/_shared/applicant-preview.ts',
    'supabase/functions/applicant-preview/index.ts', 'supabase/migrations/20261117090000_fee_emails_leave_and_exchange.sql',
  ];
  for (const f of files) assert.ok(!/\u2014/.test(read(f)), `${f} has no em dash`);
  assert.ok(readdirSync(join(ROOT, 'public', 'preview')).every((f) => f.endsWith('.pdf')), 'only the two sample PDFs are in public/preview');
});
