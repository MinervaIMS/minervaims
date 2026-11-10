// =====================================================================
// WHO CAN REGISTER: MEMBERS, THE BOCCONI COMMUNITY, OR THE PUBLIC (Step 105B).
// ---------------------------------------------------------------------
// Three choices, the same in Events > Create event and in Registration
// forms. "Bocconi community only" (stored as `members_external`, so no
// event changes) admits members and anybody else with a Bocconi address
// on the one list that also decides who can sign up. The form says so and
// checks it; register-event refuses anything else, because a form can be
// bypassed. This test fails if any of that comes undone.
//
//   node --test scripts/event-audience.test.mjs
// =====================================================================
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { createRequire } from 'node:module';

const ROOT = join(fileURLToPath(import.meta.url), '..', '..');
const read = (p) => readFileSync(join(ROOT, p), 'utf8');
const require = createRequire(import.meta.url);
const { buildSync } = require(join(ROOT, 'node_modules', 'esbuild'));
const CACHE = join(ROOT, 'node_modules', '.cache', 'event-audience-test');
mkdirSync(CACHE, { recursive: true });
const load = async (p, name) => {
  const out = join(CACHE, `${name}.mjs`);
  buildSync({ entryPoints: [join(ROOT, p)], bundle: true, outfile: out, format: 'esm', platform: 'node', logLevel: 'silent' });
  return import(`${pathToFileURL(out).href}?${Date.now()}`);
};

test('three choices, the middle one the Bocconi community, the stored keys unchanged', () => {
  const api = read('src/lib/events-api.ts');
  assert.match(api, /export type RegistrationAudience = 'members' \| 'members_external' \| 'public';/);
  assert.match(api, /members: 'Members only', members_external: 'Bocconi community only', public: 'Public',/);
  assert.doesNotMatch(api, /Members & other students/);
});

test('the same selector, with its (?), when creating an event and in Registration forms', () => {
  assert.match(read('src/components/admin/EventCreate.tsx'), /<Label className="inline-flex items-center gap-1\.5">Who can register <HelpDot page="events-create" topic="audience" \/><\/Label>\s*<Select value=\{form\.registration_audience\}/);
  assert.match(read('src/components/admin/events/AlumniCallDialog.tsx'), /Who can register <HelpDot page="events-create" topic="audience" \/>/);
  assert.match(read('src/components/admin/EventForms.tsx'), /Who <HelpDot page="events-forms" topic="audience" \/>/);
  for (const p of ['src/components/admin/EventCreate.tsx', 'src/components/admin/EventForms.tsx', 'src/components/admin/events/AlumniCallDialog.tsx']) {
    assert.match(read(p), /\(Object\.keys\(AUDIENCE_LABELS\) as RegistrationAudience\[\]\)\.map/, `${p}: the three labels from one place`);
  }
  const guide = read('src/lib/workspace-guide.ts');
  assert.equal((guide.match(/\{ id: 'audience', title: 'Who can register', body: 'Three choices, the same in Create event and in Registration forms\./g) || []).length, 2, 'one help topic, on both pages');
});

test('the server refuses an address outside the Bocconi list for the Bocconi community', () => {
  const fn = read('supabase/functions/register-event/index.ts');
  assert.match(fn, /import \{ ALLOWED_DOMAINS_SENTENCE, isAllowedBocconiEmail \} from '\.\.\/_shared\/bocconi-email\.ts';/);
  assert.match(fn, /if \(audience === 'members_external' && !isMember && !isAllowedBocconiEmail\(email\)\) \{/);
  // After the address is known to be one, and before anything is written.
  assert.ok(fn.indexOf("isAllowedBocconiEmail(email)") > fn.indexOf("if (!isValidEmail(email))"));
  assert.ok(fn.indexOf("isAllowedBocconiEmail(email)") < fn.indexOf("from('event_registrations').insert"));
  assert.ok(fn.indexOf("isAllowedBocconiEmail(email)") < fn.indexOf("from('event_waitlist').insert"));
});

test('the form says so and checks the same list', () => {
  const page = read('src/pages/EventRegister.tsx');
  assert.match(page, /import \{ ALLOWED_DOMAINS_SENTENCE, EMAIL_PLACEHOLDER, isAllowedBocconiEmail \} from '@\/lib\/bocconi-email';/);
  assert.match(page, /const bocconiOnly = event\.registration_audience === 'members_external';/);
  assert.match(page, /if \(event\?\.registration_audience === 'members_external' && !isAllowedBocconiEmail\(email\)\) \{/);
  assert.match(page, /\{bocconiOnly && \(\s*<p className="[^"]*">\s*Open to the Bocconi community: please register with your Bocconi email address\.\s*<\/p>/, 'said before the first field');
  assert.match(page, /<Label>\{bocconiOnly \? 'Bocconi email \*' : 'Email \*'\}<\/Label>/);
  assert.match(page, /Use \{ALLOWED_DOMAINS_SENTENCE\}\. Your ticket is sent to this address\./);
});

test('one list on both sides, and it says yes and no to the right addresses', async () => {
  const domains = (p) => read(p).match(/export const ALLOWED_EMAIL_DOMAINS = \[([\s\S]*?)\] as const;/)[1].replace(/\s+/g, '');
  assert.equal(domains('src/lib/bocconi-email.ts'), domains('supabase/functions/_shared/bocconi-email.ts'));
  const { isAllowedBocconiEmail } = await load('src/lib/bocconi-email.ts', 'bocconi-email');
  for (const ok of ['marco.rossi@studbocconi.it', 'Marco.Rossi@STUDBOCCONI.IT', 'anna.bianchi@unibocconi.it', 'luca.verdi@master.unibocconi.it']) {
    assert.equal(isAllowedBocconiEmail(ok), true, ok);
  }
  for (const no of ['marco@gmail.com', 'x@notunibocconi.it', 'x@studbocconi.it.evil.com', 'someone@example.com?x=@unibocconi.it', 'studbocconi.it', '']) {
    assert.equal(isAllowedBocconiEmail(no), false, no);
  }
});
