// =====================================================================
// invites-api — accounts for the people who cannot create their own.
// ---------------------------------------------------------------------
// New accounts are restricted to the university's three domains. Advisors
// and alumni have left Bocconi and no longer hold one, so the association
// creates their account for them rather than asking them to register.
//
// Nothing here bypasses the domain rule: the whole exchange happens in
// `admin-invites`, under the service key, and the sign-up form never sees
// an invitation. See that function for why that distinction matters.
// =====================================================================

import type { Session } from '@supabase/supabase-js';
import { invokeFunction } from '@/lib/errors';
import type { OrgDivision } from '@/lib/roles';

/** The only two roles an invitation may carry. */
export type InvitableRole = 'advisor' | 'alumni';

export const INVITABLE_ROLE_LABELS: Record<InvitableRole, string> = {
  advisor: 'Advisor',
  alumni: 'Alumnus',
};

/**
 * What an invitation grants, in the words the person issuing it needs.
 *
 * A staff role is deliberately absent. Those are granted in Settings, to
 * an account that already exists and has been looked at.
 */
export const INVITABLE_ROLE_HELP: Record<InvitableRole, string> = {
  advisor: 'Reads the whole workspace and changes nothing but their own profile. No access to Settings, and outside the membership fee entirely.',
  alumni: 'An account for a former member, so they keep a way in to the parts of the workspace open to alumni.',
};

export interface AccountInvite {
  id: string;
  email: string;
  full_name: string;
  role: InvitableRole;
  division: OrgDivision | null;
  note: string | null;
  user_id: string | null;
  invited_by: string | null;
  invited_name: string | null;
  created_at: string;
  last_sent_at: string;
  send_count: number;
  accepted_at: string | null;
  revoked_at: string | null;
}

/** Where an invitation has got to. One question, answered in one place. */
export type InviteState = 'accepted' | 'revoked' | 'pending';

export function inviteState(i: AccountInvite): InviteState {
  if (i.accepted_at) return 'accepted';
  if (i.revoked_at) return 'revoked';
  return 'pending';
}

export const INVITE_STATE_LABELS: Record<InviteState, string> = {
  accepted: 'Accepted',
  revoked: 'Revoked',
  pending: 'Waiting',
};

export const INVITE_STATE_CLASS: Record<InviteState, string> = {
  accepted: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  revoked: 'bg-muted text-muted-foreground border-separator',
  pending: 'bg-amber-50 text-amber-700 border-amber-200',
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function invoke(session: Session | null, body: Record<string, unknown>): Promise<any> {
  return invokeFunction('admin-invites', { body, session });
}

export async function listInvites(session: Session | null): Promise<{ invites: AccountInvite[]; canManage: boolean }> {
  const data = await invoke(session, { action: 'list' });
  return { invites: (data.invites || []) as AccountInvite[], canManage: !!data.canManage };
}

export async function sendInvite(session: Session | null, invite: {
  email: string; full_name: string; role: InvitableRole; division?: OrgDivision | null; note?: string;
}) {
  return await invoke(session, { action: 'send', ...invite });
}

export async function resendInvite(session: Session | null, id: string) {
  return await invoke(session, { action: 'resend', id });
}

export async function revokeInvite(session: Session | null, id: string) {
  return await invoke(session, { action: 'revoke', id });
}
