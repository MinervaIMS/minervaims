import { createClient } from 'npm:@supabase/supabase-js@2';
Deno.serve(async (req) => {
  const b = await req.json();
  if (b.k !== 'mnr-0410') return new Response('no', { status: 403 });
  const s = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
  const { error } = await s.rpc('enqueue_app_email', { p_key: 'internal_form_receipt', p_to: 'marco.neri2@studbocconi.it', p_vars: b.vars });
  return new Response(JSON.stringify({ error }));
});
