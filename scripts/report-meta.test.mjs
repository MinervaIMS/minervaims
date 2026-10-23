// =====================================================================
// What a report says about itself (Step 93).
//   node --test scripts/report-meta.test.mjs
//
// The page, its static copy, llms-full.txt and the PDF's own metadata are
// all built from src/lib/report-meta.ts, mirrored for the edge functions
// in supabase/functions/_shared/report-meta.ts. The two copies must be
// identical, and the sentences built from them must read as specified.
// =====================================================================

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { transformSync } from 'esbuild';

const ROOT = join(fileURLToPath(import.meta.url), '..', '..');
const read = (p) => readFileSync(join(ROOT, p), 'utf8');
const load = (p) => import(`data:text/javascript;base64,${Buffer.from(transformSync(read(p), { loader: 'ts', format: 'esm' }).code).toString('base64')}`);
const rm = await load('src/lib/report-meta.ts');

test('the browser and the edge functions use the same file', () => {
  assert.equal(read('src/lib/report-meta.ts'), read('supabase/functions/_shared/report-meta.ts'));
});

test('the citation reads "Society (year). Title. Division. URL"', () => {
  const r = { title: 'Monster Beverage Corp - Equity Research', date: '2020-06-26', division: 'equity', slug: 'monster-beverage-corp-equity-research-2020' };
  assert.equal(rm.reportCitation(r, 'https://minervaims.org'),
    'Minerva Investment Management Society (2020). Monster Beverage Corp - Equity Research. Equity Research. https://minervaims.org/archive/monster-beverage-corp-equity-research-2020');
  assert.equal(rm.reportCitation({ ...r, title: 'Is Gold Back?' }, 'https://minervaims.org/').split('. ')[1], 'Is Gold Back? Equity Research');
});

test('the PDF says what the page says', () => {
  const m = rm.reportPdfMetadata({
    title: '  Global   Outlook ', date: '2026-05-01', division: 'investment', fund: null, report_type: 'investment_outlook',
    description: 'First sentence. Second sentence.', tags: ['Rates', 'rates', 'FX'],
    authors: [{ name: 'Ada Lovelace', role: 'Head' }, { name: ' ' }, { name: 'Alan Turing' }],
  });
  assert.deepEqual(m, {
    title: 'Global Outlook',
    author: 'Ada Lovelace, Alan Turing',
    subject: 'First sentence. Second sentence.',
    keywords: 'Rates, FX, Investment Outlook, Investment Research, Minerva Investment Management Society',
    creator: 'Minerva Investment Management Society',
  });
  const bare = rm.reportPdfMetadata({ title: 'X', date: '2021-01-01', division: 'quant', report_type: 'quant_paper' });
  assert.equal(bare.author, 'Minerva Investment Management Society');
  assert.equal(bare.subject, 'Quantitative Research Paper by the Quantitative Research division of the Minerva Investment Management Society (2021).');
  assert.ok(rm.sameMetadata(m, m) && !rm.sameMetadata({ ...m, title: 'Y' }, m) && !rm.sameMetadata(null, m));
});

test('tags and authors are stored clean and bounded', () => {
  assert.deepEqual(rm.normaliseTags([' Banks ', 'banks', '', 'A'.repeat(50)]), ['Banks', 'A'.repeat(40)]);
  assert.equal(rm.normaliseTags(Array.from({ length: 20 }, (_, i) => `t${i}`)).length, 12);
  const a = rm.normaliseAuthors([{ name: ' Ada  Lovelace ', role: ' ', member_id: 'm1', alumni_id: 'a1' }, { name: 'ada lovelace' }, { name: '' }]);
  assert.deepEqual(a, [{ name: 'Ada Lovelace', member_id: 'm1' }]);
});

test('a long summary is cut at a sentence or a word, never inside one', () => {
  const s = `${'word '.repeat(100)}end.`;
  const c = rm.clip(s, 60);
  assert.ok(c.length <= 63 && c.endsWith('...') && !/wor\.\.\.$/.test(c));
  assert.equal(rm.clip('One sentence here. Two three four five six.', 24), 'One sentence here.');
  assert.equal(rm.clip('Short.', 24), 'Short.');
});

test('every division has its default type, and every type a label', () => {
  for (const d of Object.keys(rm.REPORT_DIVISION_LABELS)) assert.ok(rm.REPORT_TYPE_LABELS[rm.DEFAULT_REPORT_TYPE[d]]);
  assert.equal(rm.REPORT_TYPES.length, 5);
});

test('no em dash in what a report says', () => {
  for (const f of ['src/lib/report-meta.ts', 'src/lib/static/render.ts', 'src/lib/fund-record.ts', 'src/lib/track-record.ts', 'src/lib/public-content.ts']) {
    assert.ok(!read(f).includes('\u2014'), f);
  }
});
