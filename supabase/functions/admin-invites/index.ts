/* eslint-disable @typescript-eslint/no-explicit-any */
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';
import { audited } from '../_shared/activity.ts';
import { allows } from '../_shared/access.ts';

// =====================================================================
// admin-invites — accounts for the people who cannot create their own.
// ---------------------------------------------------------------------
// New accounts are restricted to the university's three domains, which is
// right for students and wrong for the two groups the association also
// needs: ADVISORS and ALUMNI, who have left Bocconi and whose address is
// now their own.
//
// THIS DOES NOT BYPASS THE DOMAIN RULE, IT AVOIDS IT. Nobody signs up.
// A role that manages the People register creates the account here, with
// the service key, and the auth server sends its `invite` email — which
// the email hook has always allowed through, because an invitation is
// issued BY the association rather than requested of it. There is no
// token in the browser, no flag on the sign-up form, and no path by which
// an uninvited person reaches the exemption. The sign-up form is not
// touched by this file at all.
//
// WHAT AN INVITATION MAY GRANT is `advisor` or `alumni` and nothing else.
// A staff role is never handed out by invitation: those are granted in
// Settings, to an account that already exists and has been seen. The
// whitelist is enforced here AND by a CHECK constraint on the table, so
// neither a typo nor a crafted request can widen it.
//
// Actions: list · send · resend · revoke
// =====================================================================

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const RESOURCE = 'people-invites';

/** The only two roles an invitation may carry. Mirrors the CHECK constraint. */
const INVITABLE_ROLES = ['advisor', 'alumni'];

/** Where an invited person lands once they have set a password. */
const APP_ORIGIN = 'https://minervaims.org';

const DIVISIONS = [
  'equity', 'investment', 'macro', 'portfolio', 'quant',
  'media', 'operations', 'board', 'none',
];

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

/** A trimmed, lowercased address, or '' if it is not one. */
function cleanEmail(raw: unknown): string {
  const v = String(raw ?? '').trim().toLowerCase();
  // One '@', something either side, and a dot in the domain. Deliberately
  // plain: the auth server is the real judge and will refuse the rest.
  const parts = v.split('@');
  if (parts.length !== 2 || !parts[0] || !parts[1] || !parts[1].includes('.')) return '';
  return v;
}

Deno.serve(audited('admin-invites', async (req, audit) => {
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

    const { data: roleRows } = await supabase.from('user_roles').select('role').eq('user_id', user.id);
    const roles = (roleRows || []).map((r: { role: string }) => r.role);
    audit.actor(user, roles);

    const canView = allows(roles, user.email, RESOURCE, 'view');
    const canManage = allows(roles, user.email, RESOURCE, 'manage');
    if (!canView) return json({ error: 'Your role does not include invitations.' }, 403);

    const body = await req.json().catch(() => ({}));
    const action = String(body.action || 'list');
    audit.request(action, body);

    // Reading the register is a 'view'. Everything else changes who can
    // sign in to the workspace, and needs 'manage'.
    if (action !== 'list' && !canManage) {
      return json({ error: 'Your role can read the invitations but not send them.' }, 403);
    }

    // ── list ───────────────────────────────────────────────────────────────
    if (action === 'list') {
      const { data, error } = await supabase.from('account_invites')
        .select('*').order('created_at', { ascending: false });
      if (error) throw error;

      // WHETHER AN INVITATION HAS BEEN TAKEN UP is a fact about the ACCOUNT,
      // not about this table: the person confirms with the auth server,
      // which knows nothing about the register. It is resolved here on every
      // read, and written back when it changes, so the register is correct
      // even though nothing calls it at the moment the person accepts.
      const rows = data || [];
      const pending = rows.filter((r: any) => !r.accepted_at && !r.revoked_at && r.user_id);
      for (const r of pending) {
        try {
          const { data: got } = await supabase.auth.admin.getUserById(r.user_id);
          const confirmedAt = got?.user?.email_confirmed_at || got?.user?.last_sign_in_at;
          if (confirmedAt) {
            await supabase.from('account_invites')
              .update({ accepted_at: confirmedAt }).eq('id', r.id);
            r.accepted_at = confirmedAt;
          }
        } catch (e) {
          console.error('invite acceptance check failed', e);
        }
      }
      return json({ invites: rows, canManage });
    }

    // ── send ───────────────────────────────────────────────────────────────
    if (action === 'send') {
      const email = cleanEmail(body.email);
      const fullName = String(body.full_name ?? '').trim();
      const role = String(body.role ?? '');
      const rawDivision = String(body.division ?? '');
      const division = DIVISIONS.includes(rawDivision) ? rawDivision : null;
      const note = String(body.note ?? '').trim() || null;

      if (!email) return json({ error: 'Enter a valid email address.' }, 400);
      if (!fullName) return json({ error: 'Enter the full name of the person being invited.' }, 400);
      if (!INVITABLE_ROLES.includes(role)) {
        return json({ error: 'An invitation can only be issued as an advisor or an alumnus.' }, 400);
      }

      // Already invited? The register holds one row per address, so this is
      // answered before anything is created.
      const { data: existing } = await supabase.from('account_invites')
        .select('id, accepted_at, revoked_at').ilike('email', email).maybeSingle();
      if (existing && !existing.revoked_at) {
        return json({
          error: existing.accepted_at
            ? 'This address has already accepted an invitation and has an account.'
            : 'This address has already been invited. Use Resend to send the invitation again.',
        }, 409);
      }

      // Already has an account? Then this is a role change, not an
      // invitation, and it belongs in Settings where a person is looked at
      // before their access changes.
      const { data: profile } = await supabase.from('profiles')
        .select('id').ilike('email', email).maybeSingle();
      if (profile?.id) {
        return json({
          error: 'This address already has an account. Change what it can do in Settings, Users, rather than inviting it again.',
        }, 409);
      }

      // THE ACCOUNT IS CREATED BY THE AUTH SERVER, which sends the branded
      // invitation through the same email hook as everything else.
      const { data: invited, error: inviteError } = await supabase.auth.admin.inviteUserByEmail(email, {
        data: { full_name: fullName, invited_as: role },
        redirectTo: `${APP_ORIGIN}/workspace`,
      });
      if (inviteError || !invited?.user) {
        console.error('invite failed', inviteError);
        return json({ error: 'The invitation could not be sent. Please check the address and try again.' }, 400);
      }
      const invitedId = invited.user.id;

      // The role is granted NOW, not when they accept: nothing runs at the
      // moment somebody confirms an email, so an account whose role waited
      // for that moment would arrive in the workspace with no access at all.
      // Until they confirm, the account cannot be signed in to, so the grant
      // is inert.
      try {
        await supabase.from('user_roles').delete().eq('user_id', invitedId);
        await supabase.from('user_roles').insert({
          user_id: invitedId, role, division: division ?? 'none',
        });
      } catch (e) {
        console.error('role grant on invite failed', e);
      }

      const inviterName = (await supabase.from('profiles').select('full_name').eq('id', user.id).maybeSingle())
        .data?.full_name || user.email || null;

      const row = {
        email, full_name: fullName, role, division, note,
        user_id: invitedId, invited_by: user.id, invited_name: inviterName,
        last_sent_at: new Date().toISOString(), send_count: 1,
        accepted_at: null, revoked_at: null,
      };
      // `upsert` on the address, so re-inviting a revoked one reuses its row
      // rather than failing on the unique index.
      const { data: saved, error: saveError } = await supabase.from('account_invites')
        .upsert(row, { onConflict: 'email' }).select().single();
      if (saveError) {
        console.error('invite row failed', saveError);
        // The account exists and the email has gone; the register is the
        // only casualty, so this is reported rather than pretended away.
        return json({ error: 'The invitation was sent but could not be recorded. Please tell the Admin.' }, 500);
      }
      return json({ success: true, invite: saved });
    }

    // ── resend ─────────────────────────────────────────────────────────────
    if (action === 'resend') {
      const { data: row } = await supabase.from('account_invites')
        .select('*').eq('id', body.id).maybeSingle();
      if (!row) return json({ error: 'Not found' }, 404);
      if (row.accepted_at) return json({ error: 'This invitation has already been accepted.' }, 400);
      if (row.revoked_at) return json({ error: 'This invitation has been revoked. Send a new one instead.' }, 400);

      const { error: sendError } = await supabase.auth.admin.inviteUserByEmail(row.email, {
        data: { full_name: row.full_name, invited_as: row.role },
        redirectTo: `${APP_ORIGIN}/workspace`,
      });
      if (sendError) {
        console.error('resend failed', sendError);
        return json({ error: 'The invitation could not be sent again.' }, 400);
      }
      await supabase.from('account_invites').update({
        last_sent_at: new Date().toISOString(),
        send_count: Number(row.send_count ?? 1) + 1,
      }).eq('id', row.id);
      return json({ success: true });
    }

    // ── revoke ─────────────────────────────────────────────────────────────
    // An invitation that should not have been sent, or one that has gone
    // unanswered long enough to be tidied away.
    //
    // THE ROLE IS WITHDRAWN AND THE ROW IS KEPT. Deleting the account would
    // erase the record of who invited whom, which is the reason the register
    // exists. An invitation already ACCEPTED is not revoked here: that person
    // has an account and a history, and taking their access away is a
    // decision for Settings, Users, where the whole account is in view.
    if (action === 'revoke') {
      const { data: row } = await supabase.from('account_invites')
        .select('*').eq('id', body.id).maybeSingle();
      if (!row) return json({ error: 'Not found' }, 404);
      if (row.accepted_at) {
        return json({
          error: 'This person has already accepted and has an account. Change or remove their access in Settings, Users.',
        }, 400);
      }
      if (row.user_id) {
        try {
          await supabase.from('user_roles').delete().eq('user_id', row.user_id);
        } catch (e) { console.error('role removal on revoke failed', e); }
      }
      const { error } = await supabase.from('account_invites')
        .update({ revoked_at: new Date().toISOString() }).eq('id', row.id);
      if (error) throw error;
      return json({ success: true });
    }

    return json({ error: 'Invalid action' }, 400);
  } catch (error) {
    console.error('admin-invites error:', error);
    return json({ error: 'An unexpected error occurred. Please try again.' }, 500);
  }
}));
