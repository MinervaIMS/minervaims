import { readFileSync } from 'node:fs';
import path from 'node:path';
import type { Plugin } from 'vite';
import {
  formatAsOf, formatKeyNumber, isKeyNumbersSnapshot, KEY_NUMBERS_ELEMENT_ID, type KeyNumbersSnapshot,
} from './src/lib/key-numbers';

// =====================================================================
// THE KEY NUMBERS, WRITTEN INTO THE PAGE AT BUILD TIME (Step 92).
// ---------------------------------------------------------------------
// Part of the ordinary `vite build` Lovable runs on Publish: no extra
// command, no headless browser. It reads the published figures once,
// with the public key, through the same public_key_numbers() the site
// reads, and:
//
//   * embeds them in index.html as <script type="application/json">, so
//     the app has the final values before React's first render (the
//     number rule: no count-up, no zero, no loader for figures);
//   * writes /data/key-numbers.json, the same figures for machines, with
//     each one's text exactly as the pages show it (the parity rule);
//   * writes /snapshot-meta.json: when the build ran and where its
//     figures came from.
//
// THE BUILD NEVER FAILS BECAUSE OF DATA. If the database cannot be
// reached in time, the last committed snapshot is used
// (src/content/public-snapshot.json); if that is empty too, nothing is
// embedded and the site reads the figures live, as before.
// =====================================================================

const TIMEOUT_MS = 8000;

async function readLive(url: string, anonKey: string): Promise<KeyNumbersSnapshot | null> {
  if (!url || !anonKey) return null;
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(`${url.replace(/\/$/, '')}/rest/v1/rpc/public_key_numbers`, {
      method: 'POST',
      headers: { apikey: anonKey, Authorization: `Bearer ${anonKey}`, 'Content-Type': 'application/json' },
      body: '{}',
      signal: ctrl.signal,
    });
    if (!res.ok) return null;
    const data = (await res.json()) as unknown;
    return isKeyNumbersSnapshot(data) && Object.keys(data.numbers).length > 0 ? { ...data, source: 'build' } : null;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

function readCommitted(root: string): KeyNumbersSnapshot | null {
  try {
    const data = JSON.parse(readFileSync(path.join(root, 'src/content/public-snapshot.json'), 'utf8')) as unknown;
    return isKeyNumbersSnapshot(data) && Object.keys(data.numbers).length > 0 ? { ...data, source: 'snapshot' } : null;
  } catch {
    return null;
  }
}

/** JSON that is safe inside a <script> element. */
const scriptJson = (v: unknown) => JSON.stringify(v).replace(/</g, '\\u003c')
  .split(String.fromCharCode(0x2028)).join('\\u2028').split(String.fromCharCode(0x2029)).join('\\u2029');

export function keyNumbersPlugin(env: { url: string; anonKey: string; root: string }): Plugin {
  let snap: KeyNumbersSnapshot | null = null;
  let builtAt = '';
  return {
    name: 'mims-key-numbers',
    apply: 'build',
    async buildStart() {
      builtAt = new Date().toISOString();
      snap = (await readLive(env.url, env.anonKey)) ?? readCommitted(env.root);
      if (snap) snap.built_at = builtAt;
      this.info?.(snap
        ? `key numbers: ${Object.keys(snap.numbers).length} figures from the ${snap.source === 'build' ? 'database' : 'committed snapshot'}`
        : 'key numbers: none available at build time; the site will read them live');
    },
    transformIndexHtml: {
      order: 'post',
      handler(html) {
        if (!snap) return html;
        const tag = `<script type="application/json" id="${KEY_NUMBERS_ELEMENT_ID}">${scriptJson(snap)}</script>`;
        return html.replace('</head>', `    ${tag}\n  </head>`);
      },
    },
    generateBundle() {
      const numbers = snap?.numbers ?? {};
      const machine = {
        name: 'Minerva Investment Management Society: key numbers',
        url: 'https://minervaims.org/numbers',
        description: 'Every figure the website shows about Minerva, computed automatically from the association\'s own records. Fund figures come from virtual (paper) portfolios managed by students for education. The market figures of the homepage monitor (the slugs that begin "mkt_") are official series read each month from the ECB Data Portal, Eurostat and the BIS, each with its source in its definition.',
        built_at: builtAt,
        computed_at: snap?.computed_at ?? null,
        numbers: Object.fromEntries(Object.entries(numbers).map(([slug, n]) => [slug, {
          label: n.label,
          value: n.value,
          text: formatKeyNumber(n),
          kind: n.kind,
          definition: n.definition,
          period: n.period,
          as_of: n.as_of,
          as_of_text: formatAsOf(n.as_of),
          virtual_portfolio: n.virtual_portfolio,
        }])),
        pages: snap?.pages ?? {},
      };
      this.emitFile({ type: 'asset', fileName: 'data/key-numbers.json', source: `${JSON.stringify(machine, null, 2)}\n` });
      this.emitFile({
        type: 'asset',
        fileName: 'snapshot-meta.json',
        source: `${JSON.stringify({
          built_at: builtAt,
          key_numbers: { source: snap?.source ?? 'none', computed_at: snap?.computed_at ?? null, figures: Object.keys(numbers).length },
        }, null, 2)}\n`,
      });
    },
  };
}
