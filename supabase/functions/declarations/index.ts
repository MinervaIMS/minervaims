/* eslint-disable @typescript-eslint/no-explicit-any */
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';
import { audited } from '../_shared/activity.ts';
import { readJsonObject, UNREADABLE_BODY, type LooseBody } from '../_shared/request-body.ts';
import { declarationRequired, esc, announceSigned, recordSignature, romeLong, typedNameOk } from '../_shared/declarations.ts';

// =====================================================================
// declarations: the one-association declaration and the semester
// commitment (Step 97).
// ---------------------------------------------------------------------
// Every member, on their own record:
//   mine · sign-commitment
// The President, the Vice President and the admin account:
//   settings · set-settings · list · launch-commitment · send-test
// The Board, for People > Members and its completion by division:
//   commitment-overview
//
// A candidate signs the declaration when accepting an offer, through
// applicant-notify; the shared path is _shared/declarations.ts. Whether
// the declaration is asked for, at an offer or with the commitment, is
// switched on Recruiting > Application Page (admin-settings). The
// signature in the Workspace is the record: no PDF, no countersignature.
// =====================================================================

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};
const ADMIN_EMAIL = 'as.minerva@unibocconi.it';
const MANAGERS = ['admin', 'president', 'vice_president'];
const BOARD = [...MANAGERS, 'head_of_asset_management', 'head_of_division', 'head_of_media', 'head_of_operations'];
const SEMESTER_RE = /^(Spring|Fall) \d{4}$/;

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
}

Deno.serve(audited('declarations', async (req, audit) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });
  try {
    const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) return json({ error: 'Unauthorized' }, 401);
    const { data: { user }, error: authError } = await supabase.auth.getUser(authHeader.split(' ')[1]);
    if (authError || !user) return json({ error: 'Invalid token' }, 401);
    const { data: roleRows } = await supabase.from('user_roles').select('role').eq('user_id', user.id);
    const roles = (roleRows || []).map((r: any) => r.role as string);
    audit.actor(user, roles);
    const isAdmin = user.email === ADMIN_EMAIL;
    const isManager = isAdmin || roles.some((r: string) => MANAGERS.includes(r));
    const isBoard = isAdmin || roles.some((r: string) => BOARD.includes(r));

    const parsed = await readJsonObject(req);
    if (!parsed) return json({ error: UNREADABLE_BODY }, 400);
    const body = parsed as LooseBody;
    const action = typeof body.action === 'string' ? body.action : '';
    audit.request(action, body);

    const myName = async () => {
      const { data } = await supabase.from('profiles').select('full_name').eq('id', user.id).maybeSingle();
      return data?.full_name || user.email || 'The Board of Directors';
    };

    if (['settings', 'set-settings', 'list', 'launch-commitment', 'send-test'].includes(action) && !isManager) {
      return json({ error: 'Declarations are managed by the President and the Vice President.' }, 403);
    }
    if (action === 'commitment-overview' && !isBoard) return json({ error: 'The commitment overview is for the Board.' }, 403);

    // ── The member's own record ──────────────────────────────────────
    if (action === 'mine') {
      // Asked with the commitment? (Recruiting > Application Page.)
      const required = await declarationRequired(supabase, 'commitment');
      const { data: member } = await supabase.from('members').select('id, first_name, surname, email, division, membership_status').eq('user_id', user.id).maybeSingle();
      // The newest open campaign that asks this member.
      let campaign: any = null; let request: any = null;
      if (member) {
        const { data: reqs } = await supabase.from('commitment_requests').select('id, campaign_id, status, responded_at').eq('member_id', member.id);
        if (reqs?.length) {
          const { data: camps } = await supabase.from('commitment_campaigns').select('id, semester_label, launched_at, closed_at').in('id', reqs.map((r: any) => r.campaign_id)).is('closed_at', null).order('launched_at', { ascending: false });
          campaign = camps?.[0] ?? null;
          request = campaign ? reqs.find((r: any) => r.campaign_id === campaign.id) : null;
        }
      }
      const { data: docs } = await supabase.from('signed_documents')
        .select('id, kind, context, semester_label, decision, signed_at, typed_name, text_version')
        .eq('user_id', user.id).order('signed_at', { ascending: false });
      const declarationSigned = !!campaign && (docs || []).some((d: any) => d.kind === 'one_association' && d.semester_label === campaign.semester_label);
      return json({
        required,
        campaign: campaign ? { semester_label: campaign.semester_label, launched_at: campaign.launched_at } : null,
        request: request ? { status: request.status, responded_at: request.responded_at } : null,
        declarationSigned,
        documents: docs || [],
      });
    }

    if (action === 'sign-commitment') {
      const decision = body.decision === 'declined' ? 'declined' : body.decision === 'confirmed' ? 'confirmed' : null;
      if (!decision) return json({ error: 'Choose whether you confirm or decline.' }, 400);
      if (!typedNameOk(body.typed_name) || body.agreed !== true) return json({ error: 'Sign by typing your full name and ticking the box.' }, 400);
      const { data: member } = await supabase.from('members').select('id, first_name, surname, email, division').eq('user_id', user.id).maybeSingle();
      if (!member) return json({ error: 'Only members confirm the semester commitment.' }, 403);
      audit.subject(`${member.first_name} ${member.surname}`, member.id);
      const { data: reqs } = await supabase.from('commitment_requests').select('id, campaign_id, status').eq('member_id', member.id).eq('status', 'pending');
      const { data: camps } = reqs?.length
        ? await supabase.from('commitment_campaigns').select('id, semester_label').in('id', reqs.map((r: any) => r.campaign_id)).is('closed_at', null).order('launched_at', { ascending: false })
        : { data: [] };
      const campaign = camps?.[0];
      const request = campaign ? reqs!.find((r: any) => r.campaign_id === campaign.id) : null;
      if (!campaign || !request) return json({ error: 'There is no commitment waiting for your answer.' }, 409);

      // The declaration, a separate signature, when it is asked for and
      // not already signed for this semester. Checked before anything is written.
      const required = decision === 'confirmed' && await declarationRequired(supabase, 'commitment');
      let needDeclaration = false;
      if (required) {
        const { data: existing } = await supabase.from('signed_documents').select('id')
          .eq('kind', 'one_association').eq('user_id', user.id).eq('semester_label', campaign.semester_label).maybeSingle();
        needDeclaration = !existing;
        if (needDeclaration && (!body.declaration || !typedNameOk(body.declaration.typed_name) || body.declaration.agreed !== true)) {
          return json({ error: 'Sign the one-association declaration too: type your full name and tick its box.' }, 400);
        }
      }
      const person = { userId: user.id, memberId: member.id, personName: `${member.first_name} ${member.surname}`, personEmail: member.email || user.email || '', division: member.division };
      const signed = await recordSignature(supabase, {
        kind: 'commitment', context: 'semester', semesterLabel: campaign.semester_label, ...person,
        decision, typedName: body.typed_name, agreed: true,
      });
      if (signed.error && !signed.duplicate) return json({ error: signed.error }, 400);
      if (needDeclaration) {
        const d = await recordSignature(supabase, {
          kind: 'one_association', context: 'semester', semesterLabel: campaign.semester_label, ...person,
          decision: 'signed', typedName: body.declaration.typed_name, agreed: true,
        });
        if (d.row) await announceSigned(supabase, d.row);
      }
      await supabase.from('commitment_requests').update({ status: decision, responded_at: new Date().toISOString() }).eq('id', request.id).eq('status', 'pending');
      try {
        await supabase.rpc('enqueue_app_email', {
          p_key: 'commitment_recorded', p_to: person.personEmail,
          p_vars: {
            first_name: esc(member.first_name), semester_label: esc(campaign.semester_label),
            decision_label: decision === 'confirmed' ? 'you confirm your commitment' : 'you cannot commit this semester',
            signer_name: esc(String(body.typed_name).trim()), signed_at: romeLong(new Date()),
          },
        });
      } catch (e) { console.error('commitment receipt failed', e); }
      return json({ success: true, status: decision });
    }

    // ── The President, the Vice President and the admin account ─────
    if (action === 'settings') {
      const { data: settings } = await supabase.from('commitment_settings').select('*').eq('id', true).maybeSingle();
      const { data: campaigns } = await supabase.from('commitment_campaigns').select('*').order('launched_at', { ascending: false });
      // The window and the three switches, shown here and changed on Recruiting > Application Page.
      const { data: app } = await supabase.from('application_settings')
        .select('semester_label, start_date, end_date, declaration_at_offer, declaration_at_commitment, declaration_on_join').limit(1).maybeSingle();
      return json({ settings, campaigns: campaigns || [], applications: app || null });
    }

    if (action === 'set-settings') {
      const updates: Record<string, unknown> = { updated_at: new Date().toISOString(), updated_by: user.id };
      if (body.commitment_first_semester !== undefined) {
        if (!SEMESTER_RE.test(String(body.commitment_first_semester))) return json({ error: 'Write the semester as "Spring 2027" or "Fall 2027".' }, 400);
        updates.commitment_first_semester = String(body.commitment_first_semester);
      }
      if (body.commitment_reminder_days !== undefined) {
        const n = Number(body.commitment_reminder_days);
        if (!Number.isInteger(n) || n < 1 || n > 30) return json({ error: 'The reminder goes between 1 and 30 days after the request.' }, 400);
        updates.commitment_reminder_days = n;
      }
      const { error } = await supabase.from('commitment_settings').update(updates).eq('id', true);
      if (error) throw error;
      return json({ success: true });
    }

    if (action === 'list') {
      let q = supabase.from('signed_documents').select('id, kind, context, semester_label, user_id, member_id, application_id, person_name, person_email, division, typed_name, signed_at, text_version')
        .eq('kind', 'one_association').order('signed_at', { ascending: false });
      if (typeof body.semester_label === 'string' && body.semester_label) q = q.eq('semester_label', body.semester_label);
      const { data, error } = await q;
      if (error) throw error;
      return json({ documents: data || [] });
    }

    if (action === 'launch-commitment') {
      const label = String(body.semester_label || '').trim();
      if (!SEMESTER_RE.test(label)) return json({ error: 'Write the semester as "Spring 2027" or "Fall 2027".' }, 400);
      const { data: existing } = await supabase.from('commitment_campaigns').select('id').eq('semester_label', label).maybeSingle();
      if (existing) return json({ error: `The commitment for ${label} has already been launched.` }, 409);
      const { error } = await supabase.rpc('commitment_launch', { p_label: label, p_kind: 'manual', p_by: user.id });
      if (error) throw error;
      const { data: sent } = await supabase.rpc('commitment_send');
      const { data: camp } = await supabase.from('commitment_campaigns').select('id').eq('semester_label', label).maybeSingle();
      const { data: reqs } = camp ? await supabase.from('commitment_requests').select('id').eq('campaign_id', camp.id) : { data: [] };
      return json({ success: true, requests: (reqs || []).length, sent: Number(sent ?? 0) });
    }

    if (action === 'send-test') {
      // The four emails to the caller's own address, with sample details.
      const to = user.email || '';
      const sample = { first_name: esc((await myName()).split(/\s+/)[0]), semester_label: 'Spring 2027', confirm_url: 'https://minervaims.org/workspace/my-profile?commitment=1', declaration_clause: ', and sign the one-association declaration' };
      const signed = { signer_name: 'Jane Doe', signed_at: romeLong(new Date()) };
      const keys: [string, Record<string, string>][] = [
        ['commitment_request', sample], ['commitment_reminder', sample],
        ['commitment_recorded', { ...sample, decision_label: 'you confirm your commitment', signer_name: 'Jane Doe', signed_at: signed.signed_at }],
        ['declaration_signed', { ...sample, ...signed }],
      ];
      for (const [k, vars] of keys) {
        await supabase.rpc('enqueue_staff_email', { p_key: k, p_to: to, p_vars: vars, p_dedupe: `test:${Date.now()}` });
      }
      return json({ success: true, sent: keys.length, to });
    }

    // ── The Board ────────────────────────────────────────────────────
    if (action === 'commitment-overview') {
      const { data: campaigns } = await supabase.from('commitment_campaigns').select('*').order('launched_at', { ascending: false });
      const label = typeof body.semester_label === 'string' && body.semester_label ? body.semester_label : campaigns?.[0]?.semester_label;
      const campaign = (campaigns || []).find((c: any) => c.semester_label === label) || null;
      const { data: requests } = campaign
        ? await supabase.from('commitment_requests').select('member_id, user_id, first_name, division, status, responded_at, request_sent_at, reminder_sent_at').eq('campaign_id', campaign.id)
        : { data: [] };
      return json({ campaigns: (campaigns || []).map((c: any) => ({ semester_label: c.semester_label, launched_at: c.launched_at, launch_kind: c.launch_kind })), campaign, requests: requests || [] });
    }

    return json({ error: 'Invalid action' }, 400);
  } catch (error) {
    console.error('declarations error:', error);
    return json({ error: 'An unexpected error occurred. Please try again.' }, 500);
  }
}));
