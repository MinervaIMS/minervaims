/* eslint-disable @typescript-eslint/no-explicit-any */
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';

// =====================================================================
// applicant-notify — sends the "application received" email once, after the
// applicant has confirmed their email (report items 6 & 18.1). Called by the
// application success screen. Idempotent: guarded by applications.received_
// email_sent_at so it can never send twice.
// =====================================================================

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};
const STATUS_URL = 'https://minervaims.org/admin';

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });
  try {
    const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);

    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) return json({ error: 'Unauthorized' }, 401);
    const { data: { user }, error: authError } = await supabase.auth.getUser(authHeader.split(' ')[1]);
    if (authError || !user) return json({ error: 'Invalid token' }, 401);

    const { data: app } = await supabase.from('applications')
      .select('id, first_name, email, received_email_sent_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (!app) return json({ success: true, skipped: 'no_application' });
    if (app.received_email_sent_at) return json({ success: true, skipped: 'already_sent' });

    // Mark first (idempotency), then enqueue. A failed enqueue leaves the
    // timestamp set; the reviewer can resend from the Auto emails register.
    await supabase.from('applications').update({ received_email_sent_at: new Date().toISOString() }).eq('id', app.id);
    await supabase.rpc('enqueue_app_email', {
      p_key: 'application_received', p_to: app.email,
      p_vars: { first_name: app.first_name, status_url: STATUS_URL },
    });

    return json({ success: true });
  } catch (error) {
    console.error('applicant-notify error:', error);
    return json({ error: 'An unexpected error occurred.' }, 500);
  }
});
