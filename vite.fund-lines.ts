import type { Plugin } from 'vite';
import { isFundsSnapshot } from './src/lib/fund-record';
import { FUND_LINES_ELEMENT_ID, linesFromRecords, type FundLinesSnapshot } from './src/lib/fund-lines';

// =====================================================================
// THE FUNDS' OFFICIAL LINES, WRITTEN INTO THE PAGE AT BUILD TIME (93B).
// ---------------------------------------------------------------------
// Part of the ordinary `vite build`, like the key numbers: it reads the
// records once through public_fund_track_records(), keeps the two active
// funds' cumulative returns month by month (computed by the database,
// never here) and embeds them in index.html, so the homepage hero and
// the performance charts draw the official line from the first render
// without asking the database for it.
//
// THE BUILD NEVER FAILS BECAUSE OF DATA. If the database cannot be
// reached in time, nothing is embedded and the site reads the records
// live, as before.
// =====================================================================

const TIMEOUT_MS = 8000;

async function readLive(url: string, anonKey: string): Promise<FundLinesSnapshot | null> {
  if (!url || !anonKey) return null;
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(`${url.replace(/\/$/, '')}/rest/v1/rpc/public_fund_track_records`, {
      method: 'POST',
      headers: { apikey: anonKey, Authorization: `Bearer ${anonKey}`, 'Content-Type': 'application/json' },
      body: '{}',
      signal: ctrl.signal,
    });
    if (!res.ok) return null;
    const data = (await res.json()) as unknown;
    if (!isFundsSnapshot(data)) return null;
    const lines = linesFromRecords(data);
    return Object.keys(lines.lines).length ? lines : null;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

/** JSON that is safe inside a <script> element. */
const scriptJson = (v: unknown) => JSON.stringify(v).replace(/</g, '\\u003c')
  .split(String.fromCharCode(0x2028)).join('\\u2028').split(String.fromCharCode(0x2029)).join('\\u2029');

export function fundLinesPlugin(env: { url: string; anonKey: string }): Plugin {
  let snap: FundLinesSnapshot | null = null;
  return {
    name: 'mims-fund-lines',
    apply: 'build',
    async buildStart() {
      snap = await readLive(env.url, env.anonKey);
      if (snap) snap.built_at = new Date().toISOString();
      this.info?.(snap
        ? `fund lines: ${Object.keys(snap.lines).join(', ')} from the database`
        : 'fund lines: not available at build time; the site will read them live');
    },
    transformIndexHtml: {
      order: 'post',
      handler(html) {
        if (!snap) return html;
        const tag = `<script type="application/json" id="${FUND_LINES_ELEMENT_ID}">${scriptJson(snap)}</script>`;
        return html.replace('</head>', `    ${tag}\n  </head>`);
      },
    },
  };
}
