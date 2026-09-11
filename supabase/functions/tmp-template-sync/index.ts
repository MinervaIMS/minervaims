/* eslint-disable @typescript-eslint/no-explicit-any */
// TEMPORARY: syncs code templates into auto_email_templates and can enqueue a
// test send. Deleted immediately after use.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';
import { TRANSACTIONAL_TEMPLATES } from '../_shared/transactional-emails.ts';
import { normalizeEmailSubject } from '../_shared/email-subjects.ts';
import { normalizeEmailLinks } from '../_shared/email-links.ts';
import { withResponsiveShell } from '../_shared/email-responsive.ts';

const cors = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': '*', 'Access-Control-Allow-Methods': 'POST, OPTIONS' };

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: cors });
  const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
  const body = await req.json().catch(() => ({} as any));
  const out: any = { synced: [], sent: [] };

  const keys: string[] = body.keys || [];
  for (const t of TRANSACTIONAL_TEMPLATES) {
    if (keys.length && !keys.includes(t.key)) continue;
    const subject = normalizeEmailSubject(t.subject);
    const html = withResponsiveShell(normalizeEmailLinks(t.body));
    const { data: row } = await supabase.from('auto_email_templates').select('id').eq('key', t.key).maybeSingle();
    if (row) {
      await supabase.from('auto_email_templates').update({ name: t.name, subject, body: html, connected: true }).eq('key', t.key);
    } else {
      await supabase.from('auto_email_templates').insert({ key: t.key, name: t.name, subject, body: html, connected: true });
    }
    out.synced.push(t.key);
  }

  for (const s of (body.sends || [])) {
    const { error } = await supabase.rpc('enqueue_app_email', { p_key: s.key, p_to: s.to, p_vars: s.vars || {} });
    out.sent.push({ key: s.key, error: error?.message || null });
  }
  if (body.dispatch) {
    const { error } = await supabase.rpc('email_queue_dispatch');
    out.dispatch = error?.message || 'ok';
  }
  return new Response(JSON.stringify(out), { headers: { ...cors, 'Content-Type': 'application/json' } });
});
