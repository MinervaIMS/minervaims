import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';
import { TRANSACTIONAL_TEMPLATES } from '../_shared/transactional-emails.ts';
import { normalizeEmailSubject } from '../_shared/email-subjects.ts';
import { normalizeEmailLinks } from '../_shared/email-links.ts';
import { withResponsiveShell } from '../_shared/email-responsive.ts';

Deno.serve(async () => {
  const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
  const updated: string[] = [];
  const { data: rows } = await supabase.from('auto_email_templates').select('key, subject, body');
  const stored = new Map((rows || []).map((r: any) => [r.key, r]));
  for (const t of TRANSACTIONAL_TEMPLATES) {
    const row = stored.get(t.key) as any | undefined;
    if (!row) continue;
    const subject = normalizeEmailSubject(t.subject);
    const body = withResponsiveShell(normalizeEmailLinks(t.body));
    if (row.subject === subject && row.body === body) continue;
    const { error } = await supabase.from('auto_email_templates')
      .update({ name: t.name, subject, body }).eq('key', t.key);
    if (!error) updated.push(t.key);
  }
  return new Response(JSON.stringify({ updated }), { headers: { 'Content-Type': 'application/json' } });
});
