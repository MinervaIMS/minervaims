/* eslint-disable @typescript-eslint/no-explicit-any */
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';

// =====================================================================
// admin-applications — reviewer backend for the Applications pipeline.
// All reviewer access to applications goes through here (service role),
// scoped by division. Candidates never reach this function.
//
// Actions: list · get · sign-url · update-status · add-note · bulk-urls
//          · set-question · convert-to-member
// =====================================================================

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const FULL_ACCESS = ['admin', 'president', 'vice_president', 'head_of_asset_management'];
const REVIEW_ROLES = ['head_of_division', 'team_leader'];
const STATUSES = [
  'received', 'cv_opened', 'under_review', 'to_be_contacted', 'interview_invitation_sent',
  'waiting_interview_confirmation', 'interview_confirmed', 'interview_completed',
  'accepted', 'rejected', 'offer_accepted', 'offer_declined', 'joined',
];
const PUBLIC_ROLES = new Set([
  'president', 'vice_president', 'head_of_asset_management', 'head_of_division',
  'team_leader', 'portfolio_manager', 'analyst', 'head_of_media', 'media_analyst',
  'head_of_operations', 'advisor',
]);

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) return json({ error: 'Unauthorized' }, 401);
    const { data: { user }, error: authError } = await supabase.auth.getUser(authHeader.split(' ')[1]);
    if (authError || !user) return json({ error: 'Invalid token' }, 401);

    const { data: roleRows } = await supabase.from('user_roles').select('role, division').eq('user_id', user.id);
    const roles = (roleRows || []) as Array<{ role: string; division: string | null }>;
    const roleNames = roles.map((r) => r.role);
    const isAdminEmail = user.email === 'as.minerva@unibocconi.it';
    const canAll = isAdminEmail || roleNames.some((r) => FULL_ACCESS.includes(r));
    const reviewerDivisions = roles.filter((r) => REVIEW_ROLES.includes(r.role) && r.division).map((r) => r.division as string);
    const isReviewer = canAll || reviewerDivisions.length > 0;
    if (!isReviewer) return json({ error: 'Access denied' }, 403);

    const primaryRole = roleNames[0] || 'member';
    const inScope = (app: { first_choice: string; second_choice: string | null }) =>
      canAll || reviewerDivisions.includes(app.first_choice) || (app.second_choice ? reviewerDivisions.includes(app.second_choice) : false);

    const body = await req.json().catch(() => ({}));
    const action = body.action as string;

    // ── list ───────────────────────────────────────────────────────────────
    if (action === 'list') {
      let q = supabase.from('applications').select('*').order('created_at', { ascending: false });
      if (!canAll) q = q.or(`first_choice.in.(${reviewerDivisions.join(',')}),second_choice.in.(${reviewerDivisions.join(',')})`);
      const { data, error } = await q;
      if (error) throw error;
      // note counts
      const ids = (data || []).map((a: any) => a.id);
      const counts: Record<string, number> = {};
      if (ids.length) {
        const { data: notes } = await supabase.from('application_notes').select('application_id').in('application_id', ids);
        for (const n of notes || []) counts[n.application_id] = (counts[n.application_id] || 0) + 1;
      }
      return json({ applications: (data || []).map((a: any) => ({ ...a, note_count: counts[a.id] || 0 })) });
    }

    // ── get (single + notes) ────────────────────────────────────────────────
    if (action === 'get') {
      const { data: app } = await supabase.from('applications').select('*').eq('id', body.id).maybeSingle();
      if (!app || !inScope(app)) return json({ error: 'Not found' }, 404);
      const { data: notes } = await supabase.from('application_notes')
        .select('*').eq('application_id', app.id).order('created_at', { ascending: true });
      return json({ application: app, notes: notes || [] });
    }

    // ── sign-url (preview/download a document) ───────────────────────────────
    if (action === 'sign-url') {
      const { data: app } = await supabase.from('applications').select('*').eq('id', body.id).maybeSingle();
      if (!app || !inScope(app)) return json({ error: 'Not found' }, 404);
      const path = body.kind === 'answer' ? app.answer_path : app.cv_path;
      if (!path) return json({ error: 'Document not available' }, 404);

      // Opening the CV for the first time advances the status (report 10.3).
      if (body.kind === 'cv' && !app.cv_viewed_at) {
        await supabase.from('applications').update({
          cv_viewed_at: new Date().toISOString(), cv_viewed_by: user.id,
          status: app.status === 'received' ? 'cv_opened' : app.status,
        }).eq('id', app.id);
      }

      const opts = body.mode === 'download'
        ? { download: `${app.surname}_${app.first_name}_${body.kind}.pdf` }
        : undefined;
      const { data: signed, error } = await supabase.storage.from('applications').createSignedUrl(path, 300, opts);
      if (error) throw error;
      return json({ url: signed.signedUrl });
    }

    // ── bulk-urls (download all docs for a filtered set) ─────────────────────
    if (action === 'bulk-urls') {
      const ids: string[] = Array.isArray(body.ids) ? body.ids : [];
      const kind = body.kind === 'answer' ? 'answer' : 'cv';
      const { data: apps } = await supabase.from('applications').select('*').in('id', ids);
      const out: { name: string; url: string }[] = [];
      for (const app of apps || []) {
        if (!inScope(app)) continue;
        const path = kind === 'answer' ? app.answer_path : app.cv_path;
        if (!path) continue;
        const { data: signed } = await supabase.storage.from('applications')
          .createSignedUrl(path, 600, { download: `${app.surname}_${app.first_name}_${kind}.pdf` });
        if (signed) out.push({ name: `${app.surname}_${app.first_name}_${kind}.pdf`, url: signed.signedUrl });
      }
      return json({ files: out });
    }

    // ── update-status ────────────────────────────────────────────────────────
    if (action === 'update-status') {
      if (!STATUSES.includes(body.status)) return json({ error: 'Invalid status' }, 400);
      const { data: app } = await supabase.from('applications').select('first_choice, second_choice').eq('id', body.id).maybeSingle();
      if (!app || !inScope(app)) return json({ error: 'Not found' }, 404);
      const { error } = await supabase.from('applications').update({ status: body.status }).eq('id', body.id);
      if (error) throw error;
      return json({ success: true });
    }

    // ── add-note ───────────────────────────────────────────────────────────
    if (action === 'add-note') {
      if (!body.body?.trim()) return json({ error: 'Empty note' }, 400);
      const { data: app } = await supabase.from('applications').select('first_choice, second_choice').eq('id', body.id).maybeSingle();
      if (!app || !inScope(app)) return json({ error: 'Not found' }, 404);
      const { data: profile } = await supabase.from('profiles').select('full_name').eq('id', user.id).maybeSingle();
      const { error } = await supabase.from('application_notes').insert({
        application_id: body.id, author_id: user.id,
        author_name: profile?.full_name || user.email, body: body.body.trim(),
      });
      if (error) throw error;
      return json({ success: true });
    }

    // ── set-question (division head edits their division's question) ─────────
    if (action === 'set-question') {
      const division = body.division as string;
      if (!canAll && !reviewerDivisions.includes(division)) return json({ error: 'Out of scope' }, 403);
      const { error } = await supabase.from('application_questions')
        .upsert({ division, question: body.question ?? '', updated_at: new Date().toISOString(), updated_by: user.id });
      if (error) throw error;
      return json({ success: true });
    }

    // ── convert-to-member (New Joiners, report 10.5) ─────────────────────────
    if (action === 'convert-to-member') {
      if (!canAll && reviewerDivisions.length === 0) return json({ error: 'Access denied' }, 403);
      const { data: app } = await supabase.from('applications').select('*').eq('id', body.id).maybeSingle();
      if (!app || !inScope(app)) return json({ error: 'Not found' }, 404);
      const role = body.role as string;
      const division = body.division as string;
      if (!role || !division) return json({ error: 'Role and division are required' }, 400);
      if (!canAll && !reviewerDivisions.includes(division)) return json({ error: 'You can only assign your own division' }, 403);

      // Create / update the member record linked to the applicant's account.
      const memberPayload = {
        user_id: app.user_id, first_name: app.first_name, surname: app.surname,
        email: app.email, phone: app.phone, linkedin_url: app.linkedin_url,
        division, role, account_status: 'approved', membership_status: 'active',
        fee_status: body.fee_due === false ? 'exempt' : 'unpaid',
        is_public: PUBLIC_ROLES.has(role),
      };
      const { data: existingMember } = await supabase.from('members').select('id').eq('user_id', app.user_id).maybeSingle();
      if (existingMember) {
        await supabase.from('members').update(memberPayload).eq('id', existingMember.id);
      } else {
        await supabase.from('members').insert(memberPayload);
      }

      // Promote the account from candidate to the assigned role.
      if (app.user_id) {
        await supabase.from('user_roles').delete().eq('user_id', app.user_id);
        await supabase.from('user_roles').insert({ user_id: app.user_id, role, division });
      }
      await supabase.from('applications').update({ status: 'joined' }).eq('id', app.id);
      return json({ success: true });
    }

    return json({ error: 'Invalid action' }, 400);
  } catch (error) {
    console.error('admin-applications error:', error);
    return json({ error: 'An unexpected error occurred. Please try again.' }, 500);
  }
});
