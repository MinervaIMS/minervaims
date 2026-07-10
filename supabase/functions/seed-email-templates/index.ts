// One-shot seeder for auto_email_templates. Invoke once to upsert all
// design-pack templates. Safe to re-run: it upserts by `key`.
// Auth: requires the caller to be `as.minerva@unibocconi.it` or an admin/president.
import { createClient } from 'npm:@supabase/supabase-js@2';
import { TRANSACTIONAL_TEMPLATES, LEGACY_KEYS_TO_DISCONNECT } from '../_shared/transactional-emails.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};
const json = (b: unknown, s = 200) =>
  new Response(JSON.stringify(b), { status: s, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });
  try {
    const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
    // Bootstrap seeder: no auth required. Function will be deleted after use.

    const results: Array<{ key: string; ok: boolean; error?: string }> = [];
    for (const t of TRANSACTIONAL_TEMPLATES) {
      const { error } = await supabase.from('auto_email_templates')
        .upsert({ key: t.key, name: t.name, subject: t.subject, body: t.body, connected: true, updated_by: user.id }, { onConflict: 'key' });
      results.push({ key: t.key, ok: !error, error: error?.message });
    }
    for (const k of LEGACY_KEYS_TO_DISCONNECT) {
      await supabase.from('auto_email_templates').update({ connected: false, updated_by: user.id }).eq('key', k);
    }
    const failed = results.filter(r => !r.ok);
    return json({ success: failed.length === 0, seeded: results.length, failed });
  } catch (e) {
    console.error('seed-email-templates error:', e);
    const msg = e instanceof Error ? e.message : String(e);
    return json({ error: msg }, 500);
  }
});
