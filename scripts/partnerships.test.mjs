// =====================================================================
// COMPANY RELATIONS AND PARTNERSHIPS (Step 105).
// ---------------------------------------------------------------------
// The company page is "Company relations" at /company-relations (its
// internal key stays "partnerships"); /partnerships lists the agreements
// with student associations and service providers, edited in Website >
// Partnerships; both are reached the same ways and Contacts gives them
// equal weight. This test fails if any of that comes undone.
//
//   node --test scripts/partnerships.test.mjs
// =====================================================================
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(fileURLToPath(import.meta.url), '..', '..');
const read = (p) => readFileSync(join(ROOT, p), 'utf8');

test('two pages, two addresses, the company page keeping its stored key', () => {
  const app = read('src/App.tsx');
  assert.match(app, /<Route path="\/company-relations" element=\{<Suspense fallback=\{<PageLoader \/>\}><PageVisibilityGate pageKey="partnerships"><CompanyRelations \/>/);
  assert.match(app, /<Route path="\/partnerships" element=\{<Suspense fallback=\{<PageLoader \/>\}><PageVisibilityGate pageKey="partners"><Partnerships \/>/);
  const company = read('src/pages/CompanyRelations.tsx');
  assert.match(company, /<PageIntroduction title="Company relations" transparentBackground \/>/);
  assert.match(company, /<Seo page="\/company-relations" \/>/);
  assert.match(company, /<NumbersSection pageKey="partnerships" \/>/);
  const partners = read('src/pages/Partnerships.tsx');
  assert.match(partners, /<PageIntroduction title="Partnerships" transparentBackground \/>/);
  assert.match(partners, /Our current agreements will be listed here\./, 'it starts empty and says so');
  const hide = read('src/lib/hideable-pages.ts');
  assert.match(hide, /\{ key: 'partnerships',\s+label: 'Company relations', path: '\/company-relations'/);
  assert.match(hide, /\{ key: 'partners',\s+label: 'Partnerships', path: '\/partnerships'/);
  assert.match(read('src/lib/key-numbers.ts'), /partnerships: 'Company relations in numbers',/);
});

test('both are reached the same ways, and Contacts gives them equal weight', () => {
  for (const p of ['src/components/layout/Footer.tsx', 'src/pages/Sitemap.tsx']) {
    const s = read(p);
    assert.match(s, /\{ label: 'Company relations', href: '\/company-relations' \},\s*\{ label: 'Partnerships', href: '\/partnerships' \},/, p);
  }
  const routes = read('src/lib/seo/routes.ts');
  assert.match(routes, /'\/company-relations': \{\s*title: 'Company relations',/);
  assert.match(routes, /'\/partnerships': \{\s*title: 'Partnerships',/);
  const llms = read('public/llms.txt');
  assert.match(llms, /- \[Company relations\]\(https:\/\/minervaims\.org\/company-relations\):/);
  assert.match(llms, /- \[Partnerships\]\(https:\/\/minervaims\.org\/partnerships\):/);
  const contacts = read('src/pages/Contacts.tsx');
  for (const [title, href] of [['Company relations', '/company-relations'], ['Partnerships', '/partnerships']]) {
    const re = new RegExp(`<div className="mt-section-sm md:mt-section">\\s*<h2 className="font-serif text-heading mb-6 pb-3 border-b border-separator text-accent">\\s*${title}\\s*</h2>\\s*<div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-6">\\s*<p className="font-body text-body-lg text-muted-foreground max-w-3xl">[^<]+</p>\\s*<Link to="${href}" className="cta-link whitespace-nowrap shrink-0">\\s*Visit ${title}`);
    assert.match(contacts, re, `${title}: the same section as the other`);
  }
  assert.doesNotMatch(contacts, /Partnerships &amp; Collaborations/);
});

test('the table, the bucket and the function: published rows for visitors, writes through the matrix only', () => {
  const sql = read('supabase/migrations/20261109090500_partnerships.sql');
  assert.match(sql, /CHECK \(kind IN \('service_provider', 'student_association'\)\)/);
  assert.match(sql, /CREATE POLICY partnerships_public_read ON public\.partnerships\s*FOR SELECT TO anon, authenticated USING \(published\);/);
  assert.match(sql, /GRANT SELECT ON public\.partnerships TO anon, authenticated;/);
  assert.doesNotMatch(sql, /GRANT (INSERT|UPDATE|DELETE|ALL) ON public\.partnerships TO (anon|authenticated)/);
  assert.match(sql, /VALUES \('partner-logos', 'partner-logos', true, 2097152,/);
  const fn = read('supabase/functions/admin-partnerships/index.ts');
  assert.match(fn, /const RESOURCE = 'website-partnerships';/);
  assert.match(fn, /const canManage = allows\(roles, user\.email, RESOURCE, 'manage'\);/);
  assert.match(fn, /Deno\.serve\(audited\('admin-partnerships',/);
  assert.match(read('supabase/config.toml'), /\[functions\.admin-partnerships\]\s*verify_jwt = false/);
  const reg = read('supabase/functions/_shared/activity-registry.ts');
  assert.match(reg, /'admin-partnerships': \{ section: 'Website', subsection: 'Partnerships' \},/);
});

test('the workspace subsection is wired everywhere a subsection must be', () => {
  assert.match(read('src/lib/workspace-nav.ts'), /\{ key: 'website-partnerships', slug: 'partnerships', label: 'Partnerships', allowed: \(p\) => p\.can\('website-partnerships'\) \}/);
  const ws = read('src/pages/MinervaWorkspace.tsx');
  assert.match(ws, /case 'website-partnerships':\s*return <PartnershipsManagement \/>;/);
  assert.match(read('src/lib/workspace-sections.ts'), /\{ key: 'website-partnerships', label: 'Partnerships' \}/);
  assert.match(read('src/lib/workspace-guide-keys.ts'), /'website-partnerships'/);
  assert.match(read('src/lib/workspace-guide.ts'), /key: 'website-partnerships', section: 'Website', label: 'Partnerships',/);
  assert.match(read('src/lib/workspace-manual.ts'), /'website-partnerships': \{/);
  assert.match(read('src/lib/mobile-policy.ts'), /'website-partnerships',\n\]\);/);
  for (const p of ['src/lib/access/matrix.ts', 'supabase/functions/_shared/access.ts']) {
    assert.equal((read(p).match(/'website-testimonials': 'manage', 'website-partnerships': 'manage',/g) || []).length, 2, p);
  }
  assert.ok(existsSync(join(ROOT, 'src/components/admin/PartnershipsManagement.tsx')));
  const page = read('src/components/admin/PartnershipsManagement.tsx');
  for (const piece of ['<RecordList', '<RecordCard', '<RegisterFrame>', 'useConfirm()', 'ws-form-touch', "destructive: true"]) assert.ok(page.includes(piece), piece);
});
