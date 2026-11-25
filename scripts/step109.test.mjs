// =====================================================================
// STEP 109: each fund's own drawdown threshold, and the Career books
// beside the page's title with their covers.
// ---------------------------------------------------------------------
//   node --test scripts/step109.test.mjs
//   MIMS_PG=<psql connection> node --test scripts/step109.test.mjs
//
// The link previews have their own file (scripts/share-previews.test.mjs).
// =====================================================================

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';

const ROOT = join(fileURLToPath(import.meta.url), '..', '..');
const read = (p) => readFileSync(join(ROOT, p), 'utf8');

/**
 * A migration by its name, wherever the project keeps it: as delivered
 * (supabase/migrations/<time>_<name>.sql) or as Lovable applies it
 * (drizzle/migrations/<nnnn>_<step>_<name>.sql, since Step 108).
 */
const migrationPath = (name) => {
  for (const dir of ['supabase/migrations', 'drizzle/migrations']) {
    let files = [];
    try { files = readdirSync(join(ROOT, dir)); } catch { continue; }
    const f = files.find((x) => x.endsWith(`_${name}.sql`));
    if (f) return `${dir}/${f}`;
  }
  throw new Error(`migration ${name} not found`);
};
const code = (p) => read(p).replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
const PG = process.env.MIMS_PG;

test('each fund is read against its own drawdown threshold: 3% Long Short, 5% Multi Asset', () => {
  const chart = code('src/components/shared/FundPerformanceChart.tsx');
  assert.match(chart, /export const DRAWDOWN_THRESHOLD: Record<ActiveFund, number> = \{\s*'long-short': 3,\s*'multi-asset': 5,\s*\};/);
  assert.match(chart, /if \(spell\.depth > -DRAWDOWN_THRESHOLD\[fund\]\) continue;/, 'a spell is listed and shaded from its own fund\'s threshold');
  assert.doesNotMatch(chart, /DRAWDOWN_SHOWN/, 'no single threshold left');
  assert.match(chart, /`Drawdowns of \$\{thresholdText\(shown\[0\]\)\} or more in this period`/);
  assert.match(chart, /data-dd-threshold/, 'the reason is given beside the table');
  assert.match(chart, /market neutral/);
  // The strip still shows every month, whatever its depth: it is not filtered.
  assert.match(chart, /depthByOrder\.set\(o, \{ \.\.\.\(depthByOrder\.get\(o\) \?\? \{\}\), \[fund\]: m\.drawdown \}\);/);
});

test('the thresholds keep the right spells of the recorded history', () => {
  const fx = JSON.parse(read('scripts/fixtures/fund-track-record.json')).records;
  const kept = (fund, t) => fx[fund].drawdowns.filter((s) => s.depth <= -t).map((s) => Math.round(s.depth * 10) / 10);
  assert.deepEqual(kept('long-short', 3), [-20.9, -3.7, -4.1, -5.7, -3.5]);
  assert.deepEqual(kept('multi-asset', 5), [-10.6, -14.3]);
});

test('the Career books are beside the title, always in view, and no longer a view of their own', () => {
  const page = code('src/components/admin/career/CareerPage.tsx');
  assert.match(page, /<WorkspacePageHeader title=\{title\} description=\{description\} actions=\{aside\} actionColumns="row" \/>/);
  const bt = code('src/components/admin/career/brainteasers/Brainteasers.tsx');
  assert.match(bt, /type View = 'questions' \| 'progress';/);
  assert.doesNotMatch(bt, /value: 'greenbook'/);
  assert.match(bt, /aside=\{data \? \(\s*<BookShelf/);
  assert.match(bt, /view: s\.view === 'progress' \? s\.view : 'questions',/, 'a saved "greenbook" view opens on the questions');
  const ib = code('src/components/admin/career/ib/IbQuestions.tsx');
  assert.match(ib, /type View = 'questions' \| 'practice' \| 'progress';/);
  assert.doesNotMatch(ib, /value: 'guide'/);
  assert.match(ib, /items=\{IB_BANKS\.map\(/, 'both guides, whichever bank is on screen');
  const shelf = code('src/components/admin/career/BookShelf.tsx');
  assert.match(shelf, /useBookDownload\(\)/, 'the same download as the book view: the reader\'s own copy');
  assert.match(shelf, /if \(!canReplace\) return;/, 'only the President and the admin account draw a cover');
  assert.match(shelf, /max-h-\[90vh\] max-w-\[min\(96vw,64rem\)\]/, 'sizes the workspace at 90% already gives back');
  assert.match(code('src/components/admin/career/BookView.tsx'), /<BookCover book=\{book\} name=\{copy\.name\} \/>/);
});

test('a cover is drawn once, small, from the first page alone, and kept with the book', () => {
  const lib = code('src/lib/book-cover.ts');
  assert.match(lib, /export const COVER_WIDTH = 200;/);
  assert.match(lib, /lib\.getDocument\(\{ data: await pdf\.arrayBuffer\(\) \}\)/);
  assert.match(lib, /canvas\.toDataURL\('image\/webp', quality\)/);
  const shared = code('supabase/functions/_shared/career-book.ts');
  assert.match(shared, /const \[page\] = await out\.copyPages\(src, \[0\]\);/, 'the first page alone, never a reader\'s copy');
  assert.match(shared, /export const COVER_MAX_CHARS = 120000;/);
  assert.match(shared, /'RIFF'/, 'a WebP is checked to be one');
  assert.match(shared, /if \(!g \|\| g\.id !== input\.book_id\) return \{ status: 409/, 'a cover drawn from a book since replaced is refused');
  for (const [fn, prefix] of [['career-ib', 'guide'], ['career-brainteasers', 'greenbook']]) {
    const src = code(`supabase/functions/${fn}/index.ts`);
    assert.match(src, new RegExp(`action === '${prefix}-cover-source'`), fn);
    assert.match(src, new RegExp(`action === '${prefix}-cover'`), fn);
    // Both come after the check that only the President and the admin account may change the book.
    const guard = src.indexOf(fn === 'career-ib' ? "if (!canReplace) return json({ error: 'Only the President and the admin account can change the guides.' }, 403);" : "if (!canReplace) return json({ error: 'Only the President and the admin account can change the greenbook.' }, 403);");
    assert.ok(guard > 0 && guard < src.indexOf(`action === '${prefix}-cover-source'`), `${fn}: the cover is the President's and the admin account's`);
    assert.match(src, /coverOf\(supabase, /, `${fn}: the stored cover comes with the page's data`);
  }
  const reg = read('supabase/functions/_shared/activity-registry.ts');
  assert.match(reg, /'career-brainteasers:greenbook-cover': 'update',/);
  assert.match(reg, /'career-ib:guide-cover': 'update',/);
  assert.match(reg, /'greenbook-cover-source'\]/);
  assert.match(reg, /'guide-cover-source'\]/);
  const m = read(migrationPath('career_book_covers'));
  assert.match(m, /CREATE TABLE IF NOT EXISTS public\.career_book_covers/);
  assert.match(m, /REFERENCES public\.career_files\(id\) ON DELETE CASCADE/);
  assert.match(m, /REVOKE ALL ON public\.career_book_covers FROM anon, authenticated;/);
  assert.doesNotMatch(m.replace(/--.*$/gm, '').replace(/ON DELETE CASCADE/g, ''), /\b(DROP|DELETE|TRUNCATE|UPDATE)\b/i, 'adds a table; changes nothing');
});

test('the covers table keeps only small pictures, goes with its book, and is closed to clients', { skip: !PG && 'MIMS_PG not set' }, () => {
  const sql = (q) => execFileSync('psql', [PG, '-At', '-v', 'ON_ERROR_STOP=0', '-c', q], { encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] }).trim();
  const out = sql(`begin;
    delete from career_files where kind = 'greenbook';
    with f as (insert into career_files (kind, label, file_path, file_name, mime_type, size_bytes, width) values ('greenbook', 'T', 'greenbook/1-aaaaaaaa.pdf', '1.pdf', 'application/pdf', 1, 1) returning id)
    insert into career_book_covers (file_id, cover) select id, 'data:image/webp;base64,UklGRiQAAABXRUJQ' from f;
    delete from career_files where kind = 'greenbook';
    select 'left ' || count(*) from career_book_covers;
    rollback;`);
  assert.match(out, /left 0/, 'the cover goes with its book');
  assert.equal(sql("select has_table_privilege('authenticated', 'public.career_book_covers', 'select')"), 'f');
  assert.equal(sql("select pg_get_constraintdef(oid) like '%webp|jpeg%' from pg_constraint where conname = 'career_book_covers_cover_format'"), 't');
});

test('nothing added carries an em dash', () => {
  for (const f of [
    'scripts/step109.test.mjs', 'src/lib/book-cover.ts', 'src/components/admin/career/BookShelf.tsx', 'src/components/admin/career/BookView.tsx',
    'src/components/admin/career/CareerPage.tsx', 'src/components/admin/career/brainteasers/Brainteasers.tsx', 'src/components/admin/career/brainteasers/GreenbookView.tsx',
    'src/components/admin/career/ib/IbQuestions.tsx', 'supabase/functions/_shared/career-book.ts', 'supabase/functions/career-ib/index.ts',
    'supabase/functions/career-brainteasers/index.ts', migrationPath('career_book_covers'), 'src/components/shared/FundPerformanceChart.tsx',
    'src/lib/form-share.ts', 'src/lib/event-share.ts', 'src/lib/seo/share-cards.ts', 'src/lib/seo/head-tags.ts', 'vite.static-pages.ts',
    'scripts/make-share-images.mjs', 'scripts/share-previews.test.mjs', 'public/robots.txt', migrationPath('share_links'),
    'src/components/events/EventCardShell.tsx', 'src/pages/EventRegister.tsx', 'src/pages/InternalFormPage.tsx', 'src/components/shared/Seo.tsx',
  ]) assert.doesNotMatch(read(f), /\u2014/, f);
});
