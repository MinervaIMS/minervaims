/* eslint-disable @typescript-eslint/no-explicit-any */
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';
import { PDFDocument } from 'npm:pdf-lib@1.17.1';
import { estrMonthly, lastCompleteMonth, monthEnd, monthsBetween } from '../_shared/ecb.ts';

// =====================================================================
// key-numbers: the scheduled helper of the key numbers (Step 92).
// ---------------------------------------------------------------------
// Nobody calls this from the workspace. The database calls it:
//
//   { action: 'backfill-pages' }  every ten minutes, while a published
//       report has no page count (public.kn_page_count_tick). It opens
//       each report's PDF, counts its pages, stores the count, and then
//       recomputes the key numbers so "Pages of research published"
//       follows. A PDF it cannot read is noted in key_number_page_scan
//       and left alone for a week.
//   { action: 'refresh' }  recomputes the key numbers now.
//   { action: 'fill-estr' }  every morning, while the last complete month
//       has no €STR (public.estr_fill_tick, Step 93B). It fills, from the
//       ECB, every month from the first year of fund returns that has no
//       value yet (a rate the PM team typed is never replaced), then
//       recomputes the key numbers, so the Sharpe ratios on the website
//       compute themselves. See _shared/ecb.ts.
//
// Only the service role may call it (the gateway checks the token and
// this checks its role), so a visitor can neither trigger the work nor
// write a page count.
// =====================================================================

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

function parseJwtClaims(token: string): Record<string, unknown> | null {
  const parts = token.split('.');
  if (parts.length < 2) return null;
  try {
    const payload = parts[1].replaceAll('-', '+').replaceAll('_', '/').padEnd(Math.ceil(parts[1].length / 4) * 4, '=');
    return JSON.parse(atob(payload)) as Record<string, unknown>;
  } catch {
    return null;
  }
}

/** Reports read per call, and how long a call may work, so it ends well before the platform's limit. */
const BATCH = 12;
const BUDGET_MS = 90_000;
const MAX_BYTES = 80 * 1024 * 1024;
const RETRY_AFTER_MS = 7 * 24 * 60 * 60 * 1000;

/** The page count of a PDF: pdf-lib first, a plain count of page objects if the file will not parse. */
async function countPages(bytes: Uint8Array): Promise<number> {
  try {
    const doc = await PDFDocument.load(bytes, { ignoreEncryption: true, updateMetadata: false });
    return doc.getPageCount();
  } catch {
    const text = new TextDecoder('latin1').decode(bytes);
    return (text.match(/\/Type\s*\/Page(?![s\w])/g) || []).length;
  }
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);
  const url = Deno.env.get('SUPABASE_URL');
  const key = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!url || !key) return json({ error: 'Server configuration error' }, 500);

  const auth = req.headers.get('Authorization') || '';
  const token = auth.startsWith('Bearer ') ? auth.slice('Bearer '.length).trim() : '';
  if (parseJwtClaims(token)?.role !== 'service_role') return json({ error: 'Forbidden' }, 403);

  let body: any = {};
  try { body = await req.json(); } catch { /* an empty body is a missing action */ }
  const action = typeof body?.action === 'string' ? body.action : '';
  const sb = createClient(url, key, { auth: { persistSession: false } });

  if (action === 'refresh') {
    const { data, error } = await sb.rpc('refresh_key_numbers');
    if (error) { console.error('refresh_key_numbers', error.message); return json({ error: 'Could not recompute the key numbers' }, 500); }
    return json({ published: data });
  }

  if (action === 'fill-estr') {
    const { data: years, error: yErr } = await sb.from('fund_performance_years').select('year');
    if (yErr) { console.error('fill-estr years', yErr.message); return json({ error: 'Could not read the fund returns' }, 500); }
    const now = new Date();
    const { month: to, lastDay } = lastCompleteMonth(now);
    if (!(years || []).length) return json({ filled: 0, kept: 0, from: null, to });
    const from = `${Math.min(...(years || []).map((y: any) => Number(y.year)))}-01`;
    const { data: have, error: hErr } = await sb.from('fund_reference_series').select('month').eq('series', 'estr');
    if (hErr) { console.error('fill-estr series', hErr.message); return json({ error: 'Could not read the €STR' }, 500); }
    const stored = new Set((have || []).map((h: any) => String(h.month).slice(0, 7)));
    const missing = monthsBetween(from, to).filter((m) => !stored.has(m));
    if (!missing.length) return json({ filled: 0, kept: stored.size, from, to });
    let monthly: Map<string, { value: number; source: string }>;
    try {
      const last = missing[missing.length - 1];
      monthly = await estrMonthly(missing[0], last, last === to ? lastDay : monthEnd(last));
    } catch (e) {
      console.error('fill-estr ECB', (e as Error)?.message || e);
      return json({ error: `The ECB Data Portal could not be read (${(e as Error)?.message || e}). Nothing was changed.` }, 502);
    }
    const asOf = now.toISOString().slice(0, 10);
    const rows = missing.filter((m) => monthly.has(m))
      .map((m) => ({ series: 'estr', month: `${m}-01`, value: monthly.get(m)!.value, source: monthly.get(m)!.source, as_of: asOf, updated_at: now.toISOString() }));
    if (rows.length) {
      const { error } = await sb.from('fund_reference_series').upsert(rows, { onConflict: 'series,month', ignoreDuplicates: true });
      if (error) { console.error('fill-estr write', error.message); return json({ error: 'Could not store the €STR' }, 500); }
      const { error: kErr } = await sb.rpc('refresh_key_numbers');
      if (kErr) console.error('refresh_key_numbers', kErr.message);
    }
    console.log(`€STR: ${rows.length} months filled (${from} to ${to}), ${stored.size} already stored.`);
    return json({ filled: rows.length, kept: stored.size, from, to });
  }

  if (action === 'backfill-pages') {
    const started = Date.now();
    const since = new Date(started - RETRY_AFTER_MS).toISOString();
    const [{ data: files, error: filesErr }, { data: scans, error: scansErr }] = await Promise.all([
      sb.from('archive_files').select('id, file_url')
        .eq('status', 'published').is('deleted_at', null).is('page_count', null).not('file_url', 'is', null)
        .order('date', { ascending: false }).limit(500),
      sb.from('key_number_page_scan').select('file_id').gt('tried_at', since),
    ]);
    if (filesErr || scansErr) {
      console.error('backfill-pages read', filesErr?.message || scansErr?.message);
      return json({ error: 'Could not read the reports' }, 500);
    }
    const recent = new Set((scans || []).map((s: any) => s.file_id));
    const todo = (files || []).filter((f: any) => !recent.has(f.id)).slice(0, BATCH);

    let filled = 0;
    let failed = 0;
    for (const f of todo as { id: string; file_url: string }[]) {
      if (Date.now() - started > BUDGET_MS) break;
      const triedAt = new Date().toISOString();
      try {
        const res = await fetch(f.file_url);
        if (!res.ok) throw new Error(`the file answered ${res.status}`);
        const bytes = new Uint8Array(await res.arrayBuffer());
        if (bytes.byteLength > MAX_BYTES) throw new Error('the file is too large to read here');
        const pages = await countPages(bytes);
        if (!(pages > 0 && pages <= 5000)) throw new Error('no pages found in the file');
        const { error: upErr } = await sb.from('archive_files').update({ page_count: pages }).eq('id', f.id).is('page_count', null);
        if (upErr) throw new Error(upErr.message);
        await sb.from('key_number_page_scan').upsert({ file_id: f.id, tried_at: triedAt, ok: true, pages, error: null });
        filled++;
      } catch (e) {
        failed++;
        await sb.from('key_number_page_scan').upsert({
          file_id: f.id, tried_at: triedAt, ok: false, pages: null, error: String((e as Error)?.message || e).slice(0, 300),
        });
      }
    }

    const [{ count: total }, { count: known }] = await Promise.all([
      sb.from('archive_files').select('id', { count: 'exact', head: true }).eq('status', 'published').is('deleted_at', null),
      sb.from('archive_files').select('id', { count: 'exact', head: true }).eq('status', 'published').is('deleted_at', null).not('page_count', 'is', null),
    ]);
    if (filled > 0) {
      const { error } = await sb.rpc('refresh_key_numbers');
      if (error) console.error('refresh_key_numbers', error.message);
    }
    console.log(`Page counts: ${filled} read, ${failed} could not be read; ${known ?? '?'} of ${total ?? '?'} published reports have one.`);
    return json({ filled, failed, coverage: { known: known ?? null, total: total ?? null } });
  }

  return json({ error: 'Unknown action' }, 400);
});
