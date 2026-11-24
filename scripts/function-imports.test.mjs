// =====================================================================
// EVERY EDGE FUNCTION CAN BE DEPLOYED (Step 107).
// ---------------------------------------------------------------------
// A function is deployed with its own folder and _shared, nothing else:
// an import from another function's folder works on a computer and fails
// on deployment (the roster PDF of People > Time Machine did, importing
// the certificate's letterhead). So every import of every function is
// relative to its own folder, to _shared, or a package.
// =====================================================================
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(fileURLToPath(import.meta.url), '..', '..');
const FUNCTIONS = join(ROOT, 'supabase', 'functions');

function filesIn(dir) {
  const out = [];
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) out.push(...filesIn(p));
    else if (/\.(ts|tsx|js|mjs)$/.test(name)) out.push(p);
  }
  return out;
}

test('no function imports another function\'s folder', () => {
  const bad = [];
  for (const fn of readdirSync(FUNCTIONS)) {
    const dir = join(FUNCTIONS, fn);
    if (!statSync(dir).isDirectory() || fn === '_shared') continue;
    for (const file of filesIn(dir)) {
      const src = readFileSync(file, 'utf8');
      for (const m of src.matchAll(/(?:^|\n)\s*(?:import|export)[^'"\n]*?\sfrom\s+['"]([^'"]+)['"]|(?:^|\n)\s*import\s+['"]([^'"]+)['"]/g)) {
        const from = m[1] || m[2];
        if (!from.startsWith('.')) continue;
        const target = join(file, '..', from);
        const rel = relative(FUNCTIONS, target).split(sep);
        if (rel[0] !== fn && rel[0] !== '_shared') bad.push(`${relative(ROOT, file)} imports ${from}`);
      }
    }
  }
  assert.deepEqual(bad, [], 'a function is deployed with its own folder and _shared only');
});

test('the roster PDF prints on the shared letterhead', () => {
  const src = readFileSync(join(FUNCTIONS, 'admin-rosters', 'pdf.ts'), 'utf8');
  assert.match(src, /from '\.\.\/_shared\/letterhead\.ts'/);
  assert.doesNotMatch(src, /membership-certificate/);
});
