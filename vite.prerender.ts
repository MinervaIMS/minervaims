import { existsSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { build, type Plugin, type ResolvedConfig } from 'vite';
import react from '@vitejs/plugin-react-swc';
import { APPLICATION_ROW_ELEMENT_ID, rewriteIndexHtml } from './vite.prerender-page';
import { KEY_NUMBERS_ELEMENT_ID } from './src/lib/key-numbers';

// =====================================================================
// THE HOMEPAGE'S FIRST SCREEN, WRITTEN INTO ITS HTML (Step 102).
// ---------------------------------------------------------------------
// Part of the ordinary `vite build` Lovable runs on Publish, like the key
// numbers (vite.key-numbers.ts) and the static pages (vite.static-pages.ts).
//
// Until now nothing of the homepage could be drawn before the app's scripts
// (over 1 MB) had been fetched and run: on a phone, several seconds of a
// purple loading screen. Once the client build is written, this:
//
//   1. reads the application settings row once, with the public key, and
//      embeds it in the page next to the key numbers, so "Applications Are
//      Open" is decided by the same row in the build and in the app;
//   2. draws the first screen (page frame, header, hero) with the site's
//      own components, in Node (src/prerender/first-screen.tsx), given the
//      key numbers already embedded in the page;
//   3. rewrites dist/index.html (vite.prerender-page.ts) so that:
//        * that screen is kept in a <template>, which no browser draws,
//          and is copied into place only at the homepage's address;
//        * on that address the hero figures start counting and, on a
//          phone's first visit, the intro plays from the first frame, the
//          same animation the app plays (components/shared/Preloader);
//        * the app's scripts are fetched once that screen has been
//          painted; at every other address they are fetched at once, as
//          they always were, and the page is unchanged.
//
// lib/prerender.ts is the app's side of it.
//
// THE BUILD NEVER FAILS BECAUSE OF THIS. If anything here goes wrong,
// dist/index.html is left exactly as Vite wrote it and the homepage loads
// as it did before; the build prints why.
// =====================================================================

const TIMEOUT_MS = 8000;

interface Env { url: string; anonKey: string; root: string }

interface FirstScreenModule {
  renderFirstScreen(input: { numbers: Record<string, unknown> | null; applicationRow: unknown; now: number }): string;
  HOME_HERO_LOGO: string;
  INTRO_LOGO: string;
  HOME_CHROME: { theme: string; base: string; bottom: string };
}

async function readApplicationRow(url: string, anonKey: string): Promise<Record<string, unknown> | null> {
  if (!url || !anonKey) return null;
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(
      `${url.replace(/\/$/, '')}/rest/v1/application_settings?select=semester_label,apply_form_url,start_date,end_date,closed_divisions&limit=1`,
      { headers: { apikey: anonKey, Authorization: `Bearer ${anonKey}` }, signal: ctrl.signal },
    );
    if (!res.ok) return null;
    const rows = (await res.json()) as unknown;
    return Array.isArray(rows) && rows[0] && typeof rows[0] === 'object' ? (rows[0] as Record<string, unknown>) : null;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

/** JSON that is safe inside a <script> element. */
const scriptJson = (v: unknown) => JSON.stringify(v).replace(/</g, '\\u003c')
  .split(String.fromCharCode(0x2028)).join('\\u2028').split(String.fromCharCode(0x2029)).join('\\u2029');

/** Draws the first screen with the site's components, in a build of its own. */
async function loadFirstScreen(root: string, mode: string): Promise<FirstScreenModule> {
  // Inside node_modules, so that the packages the module imports resolve
  // from the project as they do for the app.
  const outDir = path.join(root, 'node_modules', '.mims-prerender');
  rmSync(outDir, { recursive: true, force: true });
  await build({
    configFile: false,
    root,
    mode,
    logLevel: 'warn',
    plugins: [react()],
    resolve: {
      dedupe: ['react', 'react-dom'],
      alias: [
        { find: '@/integrations/supabase/client', replacement: path.join(root, 'src/prerender/supabase-client-stub.ts') },
        { find: '@', replacement: path.join(root, 'src') },
      ],
    },
    build: {
      ssr: path.join(root, 'src/prerender/first-screen.tsx'),
      outDir,
      emptyOutDir: true,
      copyPublicDir: false,
      minify: false,
      rollupOptions: { output: { format: 'es', entryFileNames: 'first-screen.mjs' } },
    },
  });
  return (await import(`${pathToFileURL(path.join(outDir, 'first-screen.mjs')).href}?t=${Date.now()}`)) as FirstScreenModule;
}

export function prerenderPlugin(env: Env): Plugin {
  let config: ResolvedConfig;
  let row: Record<string, unknown> | null = null;
  let builtAt = 0;
  return {
    name: 'mims-prerender',
    apply: 'build',
    configResolved(c) { config = c; },
    async buildStart() {
      builtAt = Date.now();
      row = await readApplicationRow(env.url, env.anonKey);
      this.info?.(`first screen: application settings ${row ? 'read' : 'unavailable, the button follows the live settings'}`);
    },
    transformIndexHtml: {
      order: 'post',
      handler(html) {
        if (!row) return html;
        return html.replace('</head>', `    <script type="application/json" id="${APPLICATION_ROW_ELEMENT_ID}">${scriptJson(row)}</script>\n  </head>`);
      },
    },
    async closeBundle() {
      const outDir = path.resolve(config.root, config.build.outDir);
      const file = path.join(outDir, 'index.html');
      try {
        if (!existsSync(file)) return;
        const html = readFileSync(file, 'utf8');
        const m = await loadFirstScreen(env.root, config.mode);
        const embedded = html.match(new RegExp(`<script type="application/json" id="${KEY_NUMBERS_ELEMENT_ID}">([\\s\\S]*?)</script>`));
        let numbers: Record<string, unknown> | null = null;
        try { numbers = embedded ? (JSON.parse(embedded[1]) as { numbers?: Record<string, unknown> }).numbers ?? null : null; } catch { numbers = null; }
        const firstScreen = m.renderFirstScreen({ numbers, applicationRow: row, now: builtAt });
        const missing = [m.HOME_HERO_LOGO, m.INTRO_LOGO].filter((u) => u.startsWith('/') && !existsSync(path.join(outDir, u)));
        if (missing.length) throw new Error(`pictures not in the build: ${missing.join(', ')}`);
        const out = rewriteIndexHtml(html, { heroLogo: m.HOME_HERO_LOGO, introLogo: m.INTRO_LOGO, chrome: m.HOME_CHROME }, firstScreen);
        if (!out) throw new Error('index.html is not in the expected shape');
        writeFileSync(file, out);
        console.info(`[mims-prerender] first screen: written into index.html (${Math.round(firstScreen.length / 1024)} kB)`);
      } catch (error) {
        console.warn(`[mims-prerender] first screen not written, the homepage loads as before: ${(error as Error).message}`);
      } finally {
        rmSync(path.join(env.root, 'node_modules', '.mims-prerender'), { recursive: true, force: true });
      }
    },
  };
}
