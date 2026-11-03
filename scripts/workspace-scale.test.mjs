// =====================================================================
// THE WORKSPACE AT 90% ON A COMPUTER, AND THE FEES OF THE OPERATIONS
// ANALYST (Step 103), TESTED.
// ---------------------------------------------------------------------
// The workspace is drawn as after one press of Command + Minus, on the
// computer layout only, with CSS zoom on its frame (lib/workspace-scale.ts
// and the Step 103 block of index.css). What must stay true:
//
//   * only the workspace frame and what it opens are scaled: every rule
//     waits for `.ws-scale` or `html[data-ws-scale]`, which the workspace
//     sets on a computer and removes when it closes;
//   * the scale is set only where the browser measures zoom the standard
//     way, so menus land under their buttons (Safari stays at 100%);
//   * every size tied to the window (vh, vw) that the workspace uses is
//     given back, so a window that takes 92% of the screen still does;
//   * a drag follows the pointer.
//
// And the Operations Analyst runs Membership Fees in full.
//
//   node --test scripts/workspace-scale.test.mjs
// =====================================================================
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(fileURLToPath(import.meta.url), '..', '..');
const read = (p) => readFileSync(join(ROOT, p), 'utf8');
const code = (p) => read(p).replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');

const walk = (dir) => readdirSync(join(ROOT, dir)).flatMap((f) => {
  const p = join(dir, f);
  return statSync(join(ROOT, p)).isDirectory() ? walk(p) : /\.(tsx?|jsx?)$/.test(f) ? [p] : [];
});

// The code drawn inside the workspace, and the form field its form editor
// shares with the public forms.
const WORKSPACE_FILES = [...walk('src/components/admin'), 'src/pages/MinervaWorkspace.tsx', 'src/components/forms/FieldInput.tsx'];

const css = read('src/index.css');
const start = css.indexOf('THE WORKSPACE AT 90%, ON A COMPUTER (Step 103)');
const block = (() => {
  assert.ok(start > 0, 'index.css has the Step 103 block');
  const from = css.lastIndexOf('/*', start);
  const end = css.indexOf('/* End of the workspace at 90% (Step 103). */', start);
  assert.ok(end > start, 'index.css closes the Step 103 block');
  return css.slice(from, end);
})();
const rules = block.replace(/\/\*[\s\S]*?\*\//g, '');

test('the scale is one number, in the code and in the stylesheet', () => {
  const ts = Number(/export const WORKSPACE_SCALE = ([0-9.]+);/.exec(read('src/lib/workspace-scale.ts'))[1]);
  const cs = Number(/--ws-scale:\s*([0-9.]+)/.exec(rules)[1]);
  assert.equal(ts, 0.9);
  assert.equal(cs, ts);
});

test('the frame is zoomed and still reaches the bottom of the window', () => {
  assert.match(rules, /\.ws-flat\.ws-scale\s*\{\s*zoom:\s*var\(--ws-scale\);\s*height:\s*calc\(100vh \/ var\(--ws-scale\)\);\s*\}/);
});

test('every rule waits for the workspace: nothing reaches the website', () => {
  const selectors = rules
    .replace(/@media[^{]*\{/g, '')
    .split('}')
    .map((s) => s.split('{')[0].trim())
    .filter(Boolean)
    // Split a selector list on its commas, not on those inside a class name.
    .flatMap((s) => s.split(/,(?![^\[]*\])/).map((x) => x.trim()))
    .filter(Boolean);
  assert.ok(selectors.length > 30, `found ${selectors.length} selectors`);
  for (const s of selectors) {
    assert.ok(/^html\[data-ws-scale\]/.test(s) || /^\.ws-flat\.ws-scale$/.test(s) || /^\.ws-scale$/.test(s), `unscoped rule: ${s}`);
  }
});

test('what opens outside the frame is scaled, and placed in the unzoomed page', () => {
  for (const s of [
    "html[data-ws-scale] [data-radix-popper-content-wrapper] > *",
    "html[data-ws-scale] body > [role='dialog']",
    "html[data-ws-scale] body > [role='alertdialog']",
    "html[data-ws-scale] [data-sonner-toaster]",
    "html[data-ws-scale] [role='region'][aria-label^='Notifications'] > ol",
  ]) assert.ok(rules.includes(s), `missing: ${s}`);
  // The positioning wrapper itself is never zoomed: its position is
  // measured on screen and must be applied in screen pixels.
  assert.doesNotMatch(rules, /\[data-radix-popper-content-wrapper\]\s*\{/);
  assert.match(rules, /\[data-radix-select-viewport\]\s*\{\s*min-width:\s*calc\(var\(--radix-select-trigger-width\) \/ var\(--ws-scale\)\);/);
});

// A Tailwind class with a window unit: "max-h-[90vh]", "sm:pt-[11vh]",
// "w-[min(96vw,48rem)]", "xl:min-h-[clamp(210px,25vh,300px)]".
const VIEWPORT_CLASS = /(?<![\w\[\]:-])((?:[a-z0-9]+:)*-?[a-z][a-z-]*?-\[[^\]\s'"`]*\d(?:d|s)?v[hw][^\]\s'"`]*\])(?![\w\[\]-])/g;

test('every size tied to the window that the workspace uses is given back', () => {
  const used = new Map();
  for (const f of WORKSPACE_FILES) {
    for (const m of code(f).matchAll(VIEWPORT_CLASS)) {
      if (!used.has(m[1])) used.set(m[1], f);
    }
  }
  assert.ok(used.size >= 30, `found ${used.size} classes`);
  const missing = [...used].filter(([cls]) => !rules.includes(`[class~="${cls}"]`));
  assert.deepEqual(missing.map(([cls, f]) => `${cls} (${relative(ROOT, join(ROOT, f))})`), [],
    'a class with vh or vw in the workspace needs its line in the Step 103 block of index.css');
});

test('each given-back size divides every window unit by the scale, and nothing else', () => {
  const decls = [...rules.matchAll(/\[class~="([^"]+)"\][^{]*\{\s*([a-z-]+):\s*([^;]+);/g)];
  assert.ok(decls.length >= 30);
  const PROPS = { h: 'height', 'max-h': 'max-height', 'min-h': 'min-height', w: 'width', 'max-w': 'max-width', pt: 'padding-top', 'auto-rows': 'grid-auto-rows' };
  for (const [, cls, prop, value] of decls) {
    const base = cls.split(':').pop();
    const key = /^(-?[a-z-]+?)-\[/.exec(base)[1];
    assert.equal(prop, PROPS[key], `${cls}: property`);
    const units = value.match(/\d+(?:\.\d+)?(?:d|s)?v[hw]/g) || [];
    const original = base.slice(key.length + 2, -1).match(/\d+(?:\.\d+)?(?:d|s)?v[hw]/g) || [];
    assert.deepEqual(units, original, `${cls}: the same window units`);
    for (const u of units) assert.ok(value.includes(`calc(${u} / var(--ws-scale))`), `${cls}: ${u} is divided by the scale`);
  }
  // A breakpoint beyond the computer layout's (1024 px) waits for it.
  for (const m of rules.matchAll(/\[class~="(xl|2xl):[^"]+"\]/g)) {
    const at = rules.lastIndexOf('@media', m.index);
    const min = { xl: 1280, '2xl': 1536 }[m[1]];
    assert.ok(at >= 0 && rules.slice(at, m.index).includes(`(min-width: ${min}px)`), `${m[0]} sits in its media query`);
  }
});

test('the browser is asked first, and only the computer layout is scaled', () => {
  const lib = code('src/lib/workspace-scale.ts');
  assert.match(lib, /CSS\.supports\('zoom', '0\.5'\)/);
  assert.match(lib, /verdict = drawnWidth && scaledVh;/, 'both the drawn size and vh must answer the standard way');
  assert.match(lib, /const scaled = enabled && zoomMeasuresAsDrawn\(\);/);
  assert.match(lib, /root\.setAttribute\('data-ws-scale', ''\);\s*return \(\) => root\.removeAttribute\('data-ws-scale'\);/);
  const ws = code('src/pages/MinervaWorkspace.tsx');
  assert.match(ws, /const isDesktop = useIsDesktop\(\);[\s\S]{0,40}const scaled = useWorkspaceScale\(isDesktop\);/);
  assert.match(ws, /<div className=\{`ws-flat \$\{shellHeight\} w-full flex bg-background overflow-hidden\$\{scaled \? ' ws-scale' : ''\}`\}>/);
  // The phone shell is returned before the frame and never carries it.
  const phone = ws.indexOf('if (!isDesktop) {');
  const frame = ws.indexOf("${scaled ? ' ws-scale' : ''}");
  assert.ok(phone > 0 && frame > phone);
  assert.ok(!ws.slice(phone, frame).includes('ws-scale'));
});

test('a dragged row follows the pointer', () => {
  // TeamManagement is not rendered by any workspace page.
  const NOT_RENDERED = ['src/components/admin/TeamManagement.tsx'];
  for (const f of WORKSPACE_FILES.filter((x) => !NOT_RENDERED.includes(x.replace(/\\/g, '/')))) {
    for (const m of code(f).matchAll(/CSS\.Transform\.toString\(([^)]*\)?)\)/g)) {
      assert.match(m[1], /^unscaleTransform\(/, `${f}: a drag transform goes through unscaleTransform`);
    }
  }
  assert.ok(!code('src/pages/MinervaWorkspace.tsx').includes('TeamManagement'), 'TeamManagement is still not rendered');
});

test('no em dash in the Step 103 code', () => {
  assert.ok(!read('src/lib/workspace-scale.ts').includes('\u2014'));
  assert.ok(!block.includes('\u2014'));
});

test('the Operations Analyst runs Membership Fees in full, on the page and on the server', () => {
  const matrix = code('src/lib/access/matrix.ts');
  const row = /operations_analyst: \{([^}]*)\}/.exec(matrix)[1];
  assert.match(row, /'ops-fee': 'manage'/);
  const mirror = code('supabase/functions/_shared/access.ts');
  const mrow = /operations_analyst: \{([^}]*)\}/.exec(mirror)[1];
  assert.match(mrow, /'ops-fee': 'manage'/);
  const fees = code('supabase/functions/admin-fees/index.ts');
  const manage = /const MANAGE = \[([^\]]*)\]/.exec(fees)[1];
  for (const r of ['admin', 'president', 'vice_president', 'head_of_operations', 'operations_analyst']) {
    assert.ok(manage.includes(`'${r}'`), `${r} manages the fees`);
  }
  // Nobody else gained it: the Media Analyst, the nearest role, still has no fee access.
  assert.doesNotMatch(/media_analyst: \{([^}]*)\}/.exec(matrix)[1], /'ops-fee'/);
  assert.ok(!manage.includes("'media_analyst'"));
});
