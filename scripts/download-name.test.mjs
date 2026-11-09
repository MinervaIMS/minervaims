// =====================================================================
// A DOWNLOAD'S NAME, SAFE FOR THE HEADER (Step 105), TESTED.
// ---------------------------------------------------------------------
// "Dupire\u2019s Local Volatility Model and Its Use on FX Exotic Desks" made
// the report-file function fail: its curly apostrophe is above 255, and a
// header may only carry 0 to 255. The header is now built by one helper
// (supabase/functions/_shared/download-name.ts); here it is run, on the
// titles that matter, through a real Headers object.
//
//   node --test scripts/download-name.test.mjs
// =====================================================================
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { transformSync } from 'esbuild';

const ROOT = join(fileURLToPath(import.meta.url), '..', '..');
const read = (p) => readFileSync(join(ROOT, p), 'utf8');
const src = transformSync(read('supabase/functions/_shared/download-name.ts'), { loader: 'ts', format: 'esm' }).code;
const mod = await import(`data:text/javascript;base64,${Buffer.from(src).toString('base64')}`);

const TITLES = [
  'Dupire\u2019s Local Volatility Model and Its Use on FX Exotic Desks',
  '\u00C7isem Almal\u0131: Rendimenti e volatilit\u00E0',
  'Macro \u2014 \u201CThe Fed\u201D and the \u20AC curve\u2026',
  '\u65E5\u672C\u306E\u682A\u5F0F',
  'Plain title',
];

test('every title gives a header value the runtime accepts', () => {
  for (const t of TITLES) {
    for (const kind of ['inline', 'attachment']) {
      const value = mod.contentDisposition(kind, `${t}.pdf`, 'Report');
      assert.doesNotThrow(() => new Headers().set('Content-Disposition', value), t);
      assert.match(value, new RegExp(`^${kind}; filename="[\\x20-\\x7E]+\\.pdf"; filename\\*=UTF-8''`));
    }
  }
});

test('the exact title travels in filename*, the plain one is readable', () => {
  const v = mod.contentDisposition('inline', `${TITLES[0]}.pdf`, 'Report');
  const star = /filename\*=UTF-8''(.+)$/.exec(v)[1];
  assert.equal(decodeURIComponent(star), `${TITLES[0]}.pdf`);
  assert.ok(v.includes(`filename="Dupire's Local Volatility Model and Its Use on FX Exotic Desks.pdf"`));
  // A name with nothing ASCII still has a usable plain name.
  assert.ok(mod.contentDisposition('inline', `${TITLES[3]}.pdf`, 'Report').includes('filename="Report.pdf"'));
});

test('report-file builds its header with the helper, not by hand', () => {
  const fn = read('supabase/functions/report-file/index.ts');
  assert.match(fn, /import \{ contentDisposition \} from '\.\.\/_shared\/download-name\.ts';/);
  assert.match(fn, /headers\.set\('Content-Disposition', disposition\);/);
  assert.doesNotMatch(fn, /filename="\$\{/);
});

test('no literal character above 127 in the helper', () => {
  assert.doesNotMatch(read('supabase/functions/_shared/download-name.ts'), /[^\x00-\x7F]/);
});
