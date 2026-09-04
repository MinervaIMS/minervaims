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

// Roles that may OPEN a candidacy: read the application, the personal details,
// the documents and the notes, and add a note of their own. Portfolio managers
// were missing, so every request they made was refused with 403 and the page
// they could see in the menu did not work at all.
const REVIEW_ROLES = ['head_of_division', 'team_leader', 'portfolio_manager'];

// Roles that review but must NEVER MOVE A CANDIDACY. They assess and comment;
// deciding where a candidate sits in the process belongs to the people
// accountable for the decision.
//
// THIS IS THE ENFORCEMENT, NOT THE HIDDEN BUTTON. The workspace already
// declines to draw the status control for these roles, but a hidden control is
// not a permission: the endpoint is reachable with a token. `canProgress` is
// checked below on every action that advances, invites, transfers, offers or
// converts, so the restriction holds however the request is made.
const NOTES_ONLY_ROLES = ['portfolio_manager', 'team_leader'];
const OFFER_ROLES = ['admin', 'president'];

// SENDING AN OFFER IS THE PRESIDENT'S AND THE ADMIN'S, AND NOBODY ELSE'S.
// The workspace has always said so: only `admin` and `president` hold full
// access in the client matrix, the Offers page draws no Send button for
// anyone else and tells them the action is "reserved for the President and
// Admin". The server did not agree. `send-offer` was guarded by
// `canAll || reviewerDivisions.length > 0`, and `canAll` also includes the
// Vice President and the Head of Asset Management, so those two could send
// any offer, and a divisional reviewer could send one for their own
// division, simply by calling the endpoint with their own token.
// `convert-to-member` completes the same act - it turns an applicant into a
// member - so it is held to the same rule.
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

// =====================================================================
// THE DIVISIONS A CANDIDATE MAY BE EVALUATED FOR.
// ---------------------------------------------------------------------
// Wider than the divisions a candidate may RANK on the form, and that is
// deliberate. The applicant ranks the five research divisions, or applies
// once to the joint Media and Operations intake (stored as `media`). An
// examiner may conclude that somebody belongs in Operations proper, or in
// Media, or in a research division nobody named, and this is the list
// that lets them say so. `board` and `none` are not divisions anybody is
// recruited into and are absent on purpose.
//
// Mirrors EVALUATION_DIVISIONS in src/lib/applications-api.ts.
// =====================================================================
const EVALUATION_DIVISIONS = ['equity', 'investment', 'macro', 'portfolio', 'quant', 'media', 'operations'];

/** The status a re-evaluated candidacy returns to: "To be invited". */
const REEVALUATION_STATUS = 'to_be_contacted';

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

    // May this caller change where a candidate sits in the process?
    const canProgress = canAll || roleNames.some((r) => REVIEW_ROLES.includes(r) && !NOTES_ONLY_ROLES.includes(r));
    const canOffer = isAdminEmail || roleNames.some((r) => OFFER_ROLES.includes(r));
    const OFFER_DENIED = 'Sending an offer is reserved for the President and the Admin.';
    const PROGRESS_DENIED = 'Your role can review candidates and add notes, but not change a candidate\'s progression. Ask the President, Vice President or a Head to move this candidacy.';

    const primaryRole = roleNames[0] || 'member';
    // =====================================================================
    // SCOPE FOLLOWS THE EVALUATION, NOT ONLY THE PREFERENCES.
    // ---------------------------------------------------------------------
    // A candidate can now be moved to a division they never named, which
    // is the whole point of the evaluation division. If scope were still
    // read from the two choices alone, the head who is actually assessing
    // them would be unable to open them, and the head who is not would
    // still see them. Both halves matter, so both are here: the two
    // preferences (a reviewer may look at anyone who asked for their
    // division) and the evaluation division (a reviewer must be able to
    // see whoever has been handed to them).
    // =====================================================================
    const inScope = (app: { first_choice: string; second_choice: string | null; evaluation_division?: string | null }) =>
      canAll
      || reviewerDivisions.includes(app.first_choice)
      || (app.second_choice ? reviewerDivisions.includes(app.second_choice) : false)
      || (app.evaluation_division ? reviewerDivisions.includes(app.evaluation_division) : false);

    /** The division assessing this candidate right now. */
    const evaluationOf = (app: { evaluation_division?: string | null; interview_division?: string | null; first_choice: string }) =>
      app.evaluation_division || app.interview_division || app.first_choice;

    const body = await req.json().catch(() => ({}));
    const action = body.action as string;

    // ── list ───────────────────────────────────────────────────────────────
    if (action === 'list') {
      let q = supabase.from('applications').select('*').order('created_at', { ascending: false });
      if (!canAll) q = q.or(`first_choice.in.(${reviewerDivisions.join(',')}),second_choice.in.(${reviewerDivisions.join(',')}),evaluation_division.in.(${reviewerDivisions.join(',')})`);
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
      if (!canProgress) return json({ error: PROGRESS_DENIED }, 403);
      if (!STATUSES.includes(body.status)) return json({ error: 'Invalid status' }, 400);
      const { data: app } = await supabase.from('applications')
        .select('first_choice, second_choice, first_name, email, interview_division, evaluation_division, offer_division, status')
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
      // WHICH DIVISION THIS CANDIDACY IS ABOUT. One answer, used for the
      // invitation, for the booking calendar and for every email below.
      let evaluation: string = evaluationOf(app);
      if (body.status === 'interview_invitation_sent') {
        // The examiner may still name the division at the moment of the
        // invitation, which is the same control as before. What has
        // changed is what it may be set to: the evaluation division is no
        // longer confined to the candidate's own two preferences, because
        // an examiner is now allowed to conclude that somebody belongs in
        // a division they never asked for. It must still be a real
        // division and still within the examiner's own scope.
        const requested = typeof body.interview_division === 'string' ? body.interview_division : null;
        const isRealDivision = !!requested && EVALUATION_DIVISIONS.includes(requested);
        const withinScope = canAll || (requested ? reviewerDivisions.includes(requested) : false);
        if (requested && isRealDivision && withinScope) {
          evaluation = requested;
        } else if (!canAll && !reviewerDivisions.includes(evaluation)) {
          // A scoped reviewer inviting somebody whose evaluation sits
          // outside their divisions invites for one of their own.
          evaluation = reviewerDivisions.includes(app.first_choice) ? app.first_choice
            : (app.second_choice && reviewerDivisions.includes(app.second_choice)) ? app.second_choice
            : (reviewerDivisions[0] ?? evaluation);
        }
        // The invitation is the moment the two fields converge: the
        // division that invited is the division that is assessing.
        updates.interview_division = evaluation;
        updates.evaluation_division = evaluation;
      }
      const invitedDivision = evaluation;

      const { error } = await supabase.from('applications').update(updates).eq('id', body.id);
      if (error) throw error;

      // Automatic emails (report item 18). The confirmation prompt is shown in
      // the workspace UI before this action is called.
      try {
        if (body.status === 'interview_invitation_sent' && previousStatus !== 'interview_invitation_sent') {
          await supabase.rpc('enqueue_app_email', {
            p_key: 'interview_invitation', p_to: app.email,
            p_vars: {
              first_name: app.first_name,
              division_name: DIV_LABELS[invitedDivision || ''] || '',
              division_slug: invitedDivision || '',
              status_url: STATUS_URL,
            },
          });
        } else if (body.status === 'rejected' && previousStatus !== 'rejected') {
          const afterInterview = INTERVIEW_STAGES.includes(previousStatus) || !!app.interview_division;
          await supabase.rpc('enqueue_app_email', {
            p_key: afterInterview ? 'rejection_post_interview' : 'rejection_pre_interview',
            p_to: app.email,
            p_vars: {
              first_name: app.first_name,
              division_name: DIV_LABELS[evaluation] || '',
            },
          });
        } else if (body.status === 'offer_accepted' && previousStatus !== 'offer_accepted') {
          await supabase.rpc('enqueue_app_email', {
            p_key: 'acceptance_received', p_to: app.email,
            p_vars: {
              first_name: app.first_name,
              division_name: DIV_LABELS[(app.offer_division || evaluation) as string] || '',
              status_url: STATUS_URL,
            },
          });
        }
      } catch (e) { console.error('status email enqueue failed', e); }

      return json({ success: true });
    }

    // ── set-evaluation-division ──────────────────────────────────────────────
    // =====================================================================
    // MOVING A CANDIDACY TO A DIFFERENT DIVISION.
    // ---------------------------------------------------------------------
    // The one sanctioned exception to forward-only progress, and the only
    // way a candidacy ever revisits an earlier stage. It replaces the old
    // `transfer-division`, which could only run after the interview and
    // only between the five research divisions; both limits were wrong.
    // An examiner reading a CV can already see that somebody belongs in
    // Operations, and having to interview them for the wrong division
    // first, in order to be allowed to say so, helped nobody.
    //
    // What happens, and why each part is here:
    //
    //   · the candidacy RETURNS TO "To be invited", because it is starting
    //     again with a different set of examiners. A candidate who had
    //     been invited, or interviewed, by the old division has not been
    //     invited or interviewed by the new one.
    //   · `interview_division` is CLEARED, so the applicant's own
    //     workspace stops offering the old division's calendar, and any
    //     booking they held is released rather than left occupying a slot
    //     the old division could give to somebody else.
    //   · `evaluation_division_previous` remembers where they came from,
    //     which is what caps this at TWO PROCESSES: once it is set, the
    //     only move on offer is back.
    //
    // No email is sent by this action. The move alone is not news the
    // candidate can act on; the invitation that follows is, and it is sent
    // by `update-status` in the ordinary way, naming the new division.
    // =====================================================================
    if (action === 'set-evaluation-division') {
      if (!canProgress) return json({ error: PROGRESS_DENIED }, 403);
      if (!canAll && reviewerDivisions.length === 0) return json({ error: 'Access denied' }, 403);
      const target = typeof body.division === 'string' ? body.division : null;
      if (!target || !EVALUATION_DIVISIONS.includes(target)) {
        return json({ error: 'Choose a valid division to evaluate this candidate for.' }, 400);
      }
      const { data: app } = await supabase.from('applications')
        .select('id, first_choice, second_choice, first_name, surname, email, interview_division, evaluation_division, evaluation_division_previous, status, user_id')
        .eq('id', body.id).maybeSingle();
      if (!app || !inScope(app)) return json({ error: 'Not found' }, 404);

      // An outcome the candidate has already been told about, or acted on,
      // is not something to reopen from here.
      if (['offer_accepted', 'offer_declined', 'joined'].includes(app.status)) {
        return json({ error: 'This candidacy has reached its final outcome and its division can no longer be changed.' }, 400);
      }

      const current = evaluationOf(app);
      if (target === current) return json({ error: 'This candidate is already being evaluated for this division.' }, 400);

      // THE TWO-PROCESS CAP. Once a candidacy has been moved once, the
      // pair of divisions is fixed and the only move left is between them.
      const previous = app.evaluation_division_previous as string | null;
      if (previous && target !== previous) {
        return json({
          error: `This candidate has already been moved once. They can only be evaluated for ${DIV_LABELS[current]} or ${DIV_LABELS[previous]}; a candidacy is never opened in a third division.`,
        }, 400);
      }

      const { error } = await supabase.from('applications')
        .update({
          evaluation_division: target,
          evaluation_division_previous: current,
          // Starting again with new examiners: the invitation and the
          // stage that followed it belonged to the old division.
          interview_division: null,
          status: STATUSES.indexOf(app.status) > STATUSES.indexOf(REEVALUATION_STATUS)
            ? REEVALUATION_STATUS
            : app.status,
        })
        .eq('id', app.id);
      if (error) throw error;

      // Release any interview slot held for the division they are leaving,
      // so it goes back to that division rather than being held by a
      // candidate who is no longer theirs to interview. Freeing the slot
      // itself is the `interview_booking_delete` trigger's job, so the
      // booking is simply deleted and the slot follows.
      try {
        await supabase.from('interview_bookings').delete().eq('application_id', app.id);
      } catch (e) { console.error('releasing the old interview booking failed', e); }

      try {
        await supabase.from('activity_logs').insert({
          user_id: user.id, user_email: user.email || 'unknown', user_role: primaryRole,
          action: 'status_change', entity_type: 'application', entity_id: app.id,
          entity_name: `${app.first_name} ${app.surname}`,
          section: 'Recruiting', subsection: 'Candidates screening',
          details: { event: 'evaluation_division_change', from: current, to: target, previous_status: app.status },
        });
      } catch (e) { console.error('evaluation division log failed', e); }

      return json({ success: true, evaluation_division: target, evaluation_division_previous: current });
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
      // Questions freeze while applications are open: from the scheduled
      // opening until the close no question can change, so every applicant
      // answers the same question.
      const { data: aset } = await supabase.from('application_settings')
        .select('start_date, end_date').limit(1).maybeSingle();
      if (aset?.start_date && aset?.end_date) {
        const now = Date.now();
        const openFrom = new Date(aset.start_date).getTime();
        const openTo = new Date(aset.end_date).getTime();
        if (now >= openFrom && now <= openTo) {
          return json({ error: 'Questions are locked while applications are open. They can be edited again once the application window closes.' }, 403);
        }
      }
      const { error } = await supabase.from('application_questions')
        .upsert({ division, question: body.question ?? '', updated_at: new Date().toISOString(), updated_by: user.id });
      if (error) throw error;
      return json({ success: true });
    }

    // ── send-offer (New Joiners): extend an offer to join with a 3-day window ─
    if (action === 'send-offer') {
      if (!canOffer) return json({ error: OFFER_DENIED }, 403);
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
          p_vars: {
            first_name: app.first_name,
            division_name: DIV_LABELS[division] || '',
            acceptance_deadline: deadlineLabel,
            status_url: STATUS_URL,
            deadline: deadlineLabel,
          },
        });
      } catch (e) { console.error('offer email enqueue failed', e); }
      return json({ success: true });
    }

    // ── convert-to-member (New Joiners, report 10.5) ─────────────────────────
    if (action === 'convert-to-member') {
      if (!canOffer) return json({ error: OFFER_DENIED }, 403);
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
          p_key: 'acceptance_received', p_to: app.email,
          p_vars: {
            first_name: app.first_name,
            division_name: DIV_LABELS[(app.offer_division || app.interview_division || app.first_choice) as string] || '',
            status_url: STATUS_URL,
          },
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
