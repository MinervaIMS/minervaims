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
  'team_leader', 'senior_analyst', 'portfolio_manager', 'analyst', 'head_of_media',
  'media_analyst', 'head_of_operations', 'advisor',
]);

const DIV_LABELS: Record<string, string> = {
  equity: 'Equity Research', investment: 'Investment Research', macro: 'Macro Research',
  portfolio: 'Portfolio Management', quant: 'Quantitative Research',
  media: 'Media & Communication', operations: 'Operations', board: 'Board', none: '',
};
const STATUS_URL = 'https://minervaims.org/admin';
// Roles a new joiner may be given. Hard whitelist: the offer flow can never
// hand out leadership or admin access.
const JOIN_ROLES = new Set(['analyst', 'senior_analyst', 'team_leader', 'portfolio_manager', 'media_analyst']);
function joinRoleDivisionError(role: string, division: string): string | null {
  if (!JOIN_ROLES.has(role)) return 'Invalid role for a new joiner.';
  if (role === 'media_analyst') return division === 'media' ? null : 'Media & Communication analysts always belong to the Media division.';
  if (role === 'portfolio_manager') return division === 'portfolio' ? null : 'Portfolio Manager always belongs to Portfolio Management.';
  const core = ['equity', 'investment', 'macro', 'portfolio', 'quant'];
  if (role === 'team_leader' && division === 'portfolio') return "Portfolio Management's team leader is the Portfolio Manager role.";
  return core.includes(division) ? null : 'Choose one of the five research divisions.';
}
const INTERVIEW_STAGES = ['interview_invitation_sent', 'waiting_interview_confirmation', 'interview_confirmed', 'interview_completed'];

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
      const { data: app } = await supabase.from('applications')
        .select('first_choice, second_choice, first_name, email, interview_division, status')
        .eq('id', body.id).maybeSingle();
      if (!app || !inScope(app)) return json({ error: 'Not found' }, 404);

      const previousStatus = app.status as string;
      // A candidacy only ever moves FORWARD. Once a stage is reached it can
      // never be taken back; the only sanctioned way to redo the interview
      // stage is the explicit division-transfer process below.
      if (STATUSES.indexOf(body.status) <= STATUSES.indexOf(previousStatus)) {
        return json({
          error: 'A candidate\'s progress cannot be moved back to an earlier stage. If, after the interview, the candidate fits another division better, use "Consider for another division" instead.',
        }, 400);
      }
      const updates: Record<string, unknown> = { status: body.status };
      let invitedDivision: string | null = app.interview_division;
      // Inviting to interview locks the candidate to one division's calendar.
      // A scoped reviewer invites for their own division; a full-access role
      // may pass an explicit division and otherwise defaults to first choice.
      if (body.status === 'interview_invitation_sent') {
        // The examiner may explicitly choose one of the candidate's two
        // preferred divisions; it must be a candidate choice and within the
        // examiner's scope. Otherwise fall back to a sensible default.
        const requested = typeof body.interview_division === 'string' ? body.interview_division : null;
        const isCandidateChoice = !!requested && (requested === app.first_choice || requested === app.second_choice);
        const withinScope = canAll || (requested ? reviewerDivisions.includes(requested) : false);
        if (requested && isCandidateChoice && withinScope) {
          invitedDivision = requested;
        } else if (canAll) {
          invitedDivision = app.first_choice;
        } else if (reviewerDivisions.includes(app.first_choice)) {
          invitedDivision = app.first_choice;
        } else if (app.second_choice && reviewerDivisions.includes(app.second_choice)) {
          invitedDivision = app.second_choice;
        } else {
          invitedDivision = reviewerDivisions[0] ?? app.first_choice;
        }
        updates.interview_division = invitedDivision;
      }

      const { error } = await supabase.from('applications').update(updates).eq('id', body.id);
      if (error) throw error;

      // Automatic emails (report item 18). The confirmation prompt is shown in
      // the workspace UI before this action is called.
      try {
        if (body.status === 'interview_invitation_sent' && previousStatus !== 'interview_invitation_sent') {
          await supabase.rpc('enqueue_app_email', {
            p_key: 'interview_invitation', p_to: app.email,
            p_vars: { first_name: app.first_name, division: DIV_LABELS[invitedDivision || ''] || '', status_url: STATUS_URL },
          });
        } else if (body.status === 'rejected' && previousStatus !== 'rejected') {
          const afterInterview = INTERVIEW_STAGES.includes(previousStatus) || !!app.interview_division;
          await supabase.rpc('enqueue_app_email', {
            p_key: afterInterview ? 'rejection_after_interview' : 'rejection_no_interview',
            p_to: app.email, p_vars: { first_name: app.first_name },
          });
        } else if (body.status === 'offer_accepted' && previousStatus !== 'offer_accepted') {
          await supabase.rpc('enqueue_app_email', {
            p_key: 'offer_accepted_confirmation', p_to: app.email,
            p_vars: { first_name: app.first_name, status_url: STATUS_URL },
          });
        }
      } catch (e) { console.error('status email enqueue failed', e); }

      return json({ success: true });
    }

    // ── transfer-division ────────────────────────────────────────────────────
    // The one sanctioned exception to forward-only progress: after the
    // interview, the examiners may conclude the candidate fits a DIFFERENT
    // division better. The transfer re-opens the interview stage in the target
    // division: the candidate is re-invited (email + booking access) for the
    // new division, and the move is recorded in the activity log.
    if (action === 'transfer-division') {
      if (!canAll && reviewerDivisions.length === 0) return json({ error: 'Access denied' }, 403);
      const target = typeof body.division === 'string' ? body.division : null;
      if (!target || !['equity', 'investment', 'macro', 'portfolio', 'quant'].includes(target)) {
        return json({ error: 'Choose a valid target division' }, 400);
      }
      const { data: app } = await supabase.from('applications')
        .select('id, first_choice, second_choice, first_name, surname, email, interview_division, status')
        .eq('id', body.id).maybeSingle();
      if (!app || !inScope(app)) return json({ error: 'Not found' }, 404);
      if (!['interview_completed', 'accepted'].includes(app.status)) {
        return json({ error: 'A division transfer is only possible after the interview has been completed.' }, 400);
      }
      const current = app.interview_division || app.first_choice;
      if (target === current) return json({ error: 'The candidate is already in this division.' }, 400);
      // The target division must have at least one open slot so the candidate
      // can actually book the new interview.
      const { data: slots } = await supabase.from('interview_slots')
        .select('id').eq('division', target).eq('is_active', true).eq('is_booked', false).limit(1);
      if (!slots || slots.length === 0) {
        return json({ error: `Open at least one interview slot for ${DIV_LABELS[target]} before transferring this candidate.` }, 400);
      }

      const { error } = await supabase.from('applications')
        .update({ status: 'interview_invitation_sent', interview_division: target })
        .eq('id', app.id);
      if (error) throw error;

      try {
        await supabase.rpc('enqueue_app_email', {
          p_key: 'interview_invitation', p_to: app.email,
          p_vars: { first_name: app.first_name, division: DIV_LABELS[target] || '', status_url: STATUS_URL },
        });
      } catch (e) { console.error('transfer email enqueue failed', e); }

      try {
        await supabase.from('activity_logs').insert({
          user_id: user.id, user_email: user.email || 'unknown', user_role: primaryRole,
          action: 'status_change', entity_type: 'application', entity_id: app.id,
          entity_name: `${app.first_name} ${app.surname}`,
          section: 'Recruiting', subsection: 'Candidates screening',
          details: { event: 'division_transfer', from: current, to: target, previous_status: app.status },
        });
      } catch (e) { console.error('transfer log failed', e); }

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

    // ── send-offer (New Joiners): extend an offer to join with a 3-day window ─
    if (action === 'send-offer') {
      if (!canAll && reviewerDivisions.length === 0) return json({ error: 'Access denied' }, 403);
      const { data: app } = await supabase.from('applications').select('*').eq('id', body.id).maybeSingle();
      if (!app || !inScope(app)) return json({ error: 'Not found' }, 404);
      const role = body.role as string;
      const division = body.division as string;
      if (!role || !division) return json({ error: 'Role and division are required' }, 400);
      const pairError = joinRoleDivisionError(role, division);
      if (pairError) return json({ error: pairError }, 400);
      if (!canAll && !reviewerDivisions.includes(division)) return json({ error: 'You can only offer your own division' }, 403);

      const now = new Date();
      const deadline = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);
      const { error } = await supabase.from('applications').update({
        status: 'accepted',
        offer_sent_at: now.toISOString(),
        offer_deadline: deadline.toISOString(),
        offer_reminder_sent_at: null,
        offer_role: role,
        offer_division: division,
        offer_fee_due: body.fee_due !== false,
      }).eq('id', app.id);
      if (error) throw error;

      const deadlineLabel = deadline.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
      try {
        await supabase.rpc('enqueue_app_email', {
          p_key: 'offer_to_join', p_to: app.email,
          p_vars: { first_name: app.first_name, division: DIV_LABELS[division] || '', status_url: STATUS_URL, deadline: deadlineLabel },
        });
      } catch (e) { console.error('offer email enqueue failed', e); }
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
      const pairError = joinRoleDivisionError(role, division);
      if (pairError) return json({ error: pairError }, 400);
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

      // Welcome / "offer accepted" email: the candidate joins as an analyst and
      // is prompted to complete their member profile (report item 18.6).
      try {
        await supabase.rpc('enqueue_app_email', {
          p_key: 'offer_accepted_confirmation', p_to: app.email,
          p_vars: { first_name: app.first_name, status_url: STATUS_URL },
        });
      } catch (e) { console.error('welcome email enqueue failed', e); }

      return json({ success: true });
    }

    return json({ error: 'Invalid action' }, 400);
  } catch (error) {
    console.error('admin-applications error:', error);
    return json({ error: 'An unexpected error occurred. Please try again.' }, 500);
  }
});
