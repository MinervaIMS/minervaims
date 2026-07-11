/* eslint-disable @typescript-eslint/no-explicit-any */
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';

// =====================================================================
// applicant-notify — candidate self-service backend.
//   (no action) → send the "application received" email once (report 6 & 18.1)
//   accept-offer → accept a live offer to join; converts to a member and sends
//                  the welcome email (report 18.5/18.6)
//   decline-offer → decline a live offer
// All actions act ONLY on the caller's own application.
// =====================================================================

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};
const STATUS_URL = 'https://minervaims.org/admin';
const PUBLIC_ROLES = new Set([
  'president', 'vice_president', 'head_of_asset_management', 'head_of_division',
  'team_leader', 'portfolio_manager', 'analyst', 'head_of_media', 'media_analyst',
  'head_of_operations', 'advisor',
]);

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

    const body = await req.json().catch(() => ({}));
    const action = (body.action as string | undefined) ?? 'notify-received';

    const { data: app } = await supabase.from('applications')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    // ── accept-offer ─────────────────────────────────────────────────────────
    if (action === 'accept-offer') {
      if (!app) return json({ error: 'No application found' }, 404);
      const offerLive = app.status === 'accepted' && app.offer_sent_at
        && (!app.offer_deadline || new Date(app.offer_deadline) > new Date());
      if (!offerLive) return json({ error: 'No active offer to accept' }, 400);
      const role = app.offer_role as string | null;
      const division = app.offer_division as string | null;
      if (!role || !division) return json({ error: 'This offer is incomplete. Please contact the association.' }, 400);

      // Create / update the member record and promote the account.
      const memberPayload = {
        user_id: app.user_id, first_name: app.first_name, surname: app.surname,
        email: app.email, phone: app.phone, linkedin_url: app.linkedin_url,
        division, role, account_status: 'approved', membership_status: 'active',
        fee_status: app.offer_fee_due === false ? 'exempt' : 'unpaid',
        is_public: PUBLIC_ROLES.has(role),
      };
      const { data: existingMember } = await supabase.from('members').select('id').eq('user_id', app.user_id).maybeSingle();
      if (existingMember) await supabase.from('members').update(memberPayload).eq('id', existingMember.id);
      else await supabase.from('members').insert(memberPayload);

      await supabase.from('user_roles').delete().eq('user_id', app.user_id);
      await supabase.from('user_roles').insert({ user_id: app.user_id, role, division });
      await supabase.from('applications').update({ status: 'joined' }).eq('id', app.id);

      try {
        await supabase.rpc('enqueue_app_email', {
          p_key: 'offer_accepted_confirmation', p_to: app.email,
          p_vars: { first_name: app.first_name, status_url: STATUS_URL },
        });
      } catch (e) { console.error('welcome email enqueue failed', e); }
      return json({ success: true });
    }

    // ── sign-own-doc ───────────────────────────────────────────────────────────
    // Read-only: a short-lived signed URL for the CALLER'S OWN CV / written
    // answer, so applicants can preview or download what they submitted. This
    // never allows changing the documents — it only reads the stored file.
    if (action === 'sign-own-doc') {
      if (!app) return json({ error: 'No application found' }, 404);
      const kind = body.kind === 'answer' ? 'answer' : 'cv';
      const path = (kind === 'answer' ? app.answer_path : app.cv_path) as string | null;
      if (!path) return json({ error: 'No document on file' }, 404);
      const download = body.mode === 'download';
      const { data, error } = await supabase.storage.from('applications')
        .createSignedUrl(path, 60 * 10, download ? { download: true } : undefined);
      if (error || !data) return json({ error: 'Could not open the document' }, 500);
      return json({ url: data.signedUrl });
    }

    // ── decline-offer ────────────────────────────────────────────────────────
    if (action === 'decline-offer') {
      if (!app) return json({ error: 'No application found' }, 404);
      if (app.status !== 'accepted' || !app.offer_sent_at) return json({ error: 'No active offer to decline' }, 400);
      await supabase.from('applications').update({ status: 'offer_declined' }).eq('id', app.id);
      return json({ success: true });
    }

    // ── notify-received (default) ──────────────────────────────────────────────
    if (!app) return json({ success: true, skipped: 'no_application' });
    if (app.received_email_sent_at) return json({ success: true, skipped: 'already_sent' });
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
