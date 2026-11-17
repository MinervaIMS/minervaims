// =====================================================================
// THE DOORS THAT STAY CLOSED (Step 106A).
// ---------------------------------------------------------------------
// Small rules, each of which closes one way in. This test fails if:
//   * a link whose address would run a script can be clicked again;
//   * the retired sign-in (admin-auth) starts answering again;
//   * one of the two forms anybody can send loses its limit per address,
//     or stops keeping a typed name to plain text;
//   * a secret key is written into the repository.
//
//   node --test scripts/security.test.mjs
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
const CACHE = join(ROOT, 'node_modules', '.cache', 'security-test');
mkdirSync(CACHE, { recursive: true });
const load = async (p, name) => {
  const out = join(CACHE, `${name}.mjs`);
  buildSync({ entryPoints: [join(ROOT, p)], bundle: true, outfile: out, format: 'esm', platform: 'node', logLevel: 'silent' });
  return import(`${pathToFileURL(out).href}?${Date.now()}`);
};

test('a link opens a page and never runs a script', async () => {
  const { isUnsafeHref } = await load('src/lib/link-guard.ts', 'link-guard');
  for (const bad of ['javascript:alert(1)', 'JavaScript:alert(1)', '  javascript:alert(1)', 'java\tscript:alert(1)', 'java\nscript:alert(1)',
    'vbscript:msgbox(1)', 'data:text/html,<script>alert(1)</script>', 'DATA:TEXT/HTML;base64,PHNjcmlwdD4=']) {
    assert.equal(isUnsafeHref(bad), true, JSON.stringify(bad));
  }
  for (const ok of ['https://www.linkedin.com/in/marco-rossi', 'http://example.com', '/workspace/dashboard', '#top', 'mailto:as.minerva@unibocconi.it',
    'tel:+390000000', 'blob:https://minervaims.org/1234', 'data:image/png;base64,AAAA', 'data:text/csv;charset=utf-8,a', '', null, undefined,
    'https://example.com/?q=javascript:1']) {
    assert.equal(isUnsafeHref(ok), false, JSON.stringify(ok));
  }
  const main = read('src/main.tsx');
  assert.match(main, /import \{ installLinkGuard \} from "\.\/lib\/link-guard";/);
  assert.match(main, /\ninstallLinkGuard\(\);/);
  const guard = read('src/lib/link-guard.ts');
  assert.match(guard, /document\.addEventListener\('click', stop, true\);/, 'in the capture phase, before any handler on the page');
  assert.match(guard, /document\.addEventListener\('auxclick', stop, true\);/);
});

test('the retired sign-in answers nobody', () => {
  const fn = read('supabase/functions/admin-auth/index.ts');
  assert.match(fn, /status: 410/);
  assert.doesNotMatch(fn, /createClient|SERVICE_ROLE|verify_admin_credentials|djwt/, 'it reads no secret and touches no table');
  // No page calls it.
  const walk = (dir) => readdirSync(join(ROOT, dir)).flatMap((f) => {
    const p = `${dir}/${f}`;
    return statSync(join(ROOT, p)).isDirectory() ? walk(p) : (/\.(ts|tsx)$/.test(f) ? [p] : []);
  });
  for (const p of walk('src')) {
    assert.doesNotMatch(read(p), /(invoke|callFunction|invokeFunction)\(\s*['"]admin-auth['"]/, `${p} calls the retired sign-in`);
  }
});

test('the two forms anybody can send are limited per address and keep a name plain', async () => {
  const register = read('supabase/functions/register-event/index.ts');
  assert.match(register, /if \(action === 'register' && !userId && await overLimit\(supabase, req, 'register-event', 150, 600\)\) \{\s*return json\(\{ error: TOO_MANY \}, 429\);/);
  assert.match(register, /const name = plainName\(optionalTextOf\(body, 'name'\)\) \|\| undefined;/);
  const apply = read('supabase/functions/submit-application/index.ts');
  assert.match(apply, /if \(await overLimit\(supabase, req, 'submit-application', 60, 600\)\) \{\s*return json\(\{ error: TOO_MANY \}, 429\);/);
  assert.ok(apply.indexOf("overLimit(supabase, req, 'submit-application'") < apply.indexOf('await req.formData()'), 'counted before the upload is read');
  assert.match(apply, /first_name: plainName\(get\('first_name'\)\), surname: plainName\(get\('surname'\)\)/);
  // The limit never stops a request it could not count.
  const limit = read('supabase/functions/_shared/rate-limit.ts');
  assert.match(limit, /if \(error\) return false;\s*return data === false;\s*\} catch \{\s*return false;/);
  const { plainName } = await load('supabase/functions/_shared/plain-text.ts', 'plain-text');
  assert.equal(plainName('  Marco   Rossi '), 'Marco Rossi');
  assert.equal(plainName("Anne-Sophie O'Neil D’Angelo"), "Anne-Sophie O'Neil D’Angelo");
  assert.equal(plainName('<a href="https://example.com">Click</a>'), 'a href="https://example.com"Click/a');
  assert.equal(plainName(null), '');
  assert.equal(plainName('x'.repeat(500)).length, 120);
  const sql = read('supabase/migrations/20261116090000_data_access_follows_matrix.sql');
  assert.match(sql, /CREATE OR REPLACE FUNCTION public\.request_rate_check\(/);
  assert.match(sql, /REVOKE ALL ON FUNCTION public\.request_rate_check\(text, text, integer, integer\) FROM PUBLIC, anon, authenticated;/);
});

test('no secret key is written into the repository', () => {
  // The public key is meant to be public: every page of the website carries
  // it. Anything else that looks like a key must not be here.
  const roleOf = (jwt) => { try { return JSON.parse(Buffer.from(jwt.split('.')[1], 'base64').toString()).role; } catch { return null; } };
  const skip = /^(node_modules|dist|\.git|\.verify|\.vite-cache)$/;
  const walk = (dir) => readdirSync(join(ROOT, dir)).flatMap((f) => {
    if (skip.test(f)) return [];
    const p = dir === '.' ? f : `${dir}/${f}`;
    const st = statSync(join(ROOT, p));
    if (st.isDirectory()) return walk(p);
    return st.size < 2_000_000 && /\.(ts|tsx|js|mjs|cjs|json|sql|toml|env|html|md|yml|yaml)$|^\.env/.test(f) ? [p] : [];
  });
  for (const p of walk('.')) {
    if (p === 'package-lock.json') continue;
    const text = read(p);
    for (const m of text.matchAll(/eyJ[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{10,}/g)) {
      assert.notEqual(roleOf(m[0]), 'service_role', `${p} holds a service role key`);
    }
    assert.doesNotMatch(text, /-----BEGIN (RSA |EC )?PRIVATE KEY-----/, `${p} holds a private key`);
  }
});
