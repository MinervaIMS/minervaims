/* eslint-disable @typescript-eslint/no-explicit-any */
// Temporary: seeds auto_email_templates rows for templates that exist in code
// but have no row yet. Deleted right after use.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';
import { TRANSACTIONAL_TEMPLATES } from '../_shared/transactional-emails.ts';

Deno.serve(async () => {
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  );
  const { data: rows } = await supabase.from('auto_email_templates').select('key');
  const have = new Set((rows || []).map((r: any) => r.key));
  const added: string[] = [];
  for (const t of TRANSACTIONAL_TEMPLATES as any[]) {
    if (have.has(t.key)) continue;
    const { error } = await supabase.from('auto_email_templates').insert({
      key: t.key, name: t.name, subject: t.subject, body: t.body,
      connected: true,
    });
    if (error) return new Response(JSON.stringify({ error: error.message, key: t.key }), { status: 500 });
    added.push(t.key);
  }
  return new Response(JSON.stringify({ added }), { headers: { 'Content-Type': 'application/json' } });
});
