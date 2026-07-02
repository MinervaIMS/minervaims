// =====================================================================
// members-api — typed data access for the canonical roster (public.members).
// ---------------------------------------------------------------------
// The `members` / `role_permissions` tables and `user_roles.division` are
// added by the Phase 0/1 migrations and will appear in the generated
// Supabase types once they are regenerated in Lovable. Until then this is
// the single place that casts around the not-yet-regenerated types, so the
// rest of the app stays fully typed against MemberRow.
// =====================================================================

import { supabase } from '@/integrations/supabase/client';
import type { Session } from '@supabase/supabase-js';
import type { AppRole, OrgDivision } from '@/lib/roles';

export type MembershipStatus = 'active' | 'on_exchange' | 'one_semester_pause' | 'alumni' | 'expelled' | 'silent_advisor';

export const MEMBERSHIP_STATUS_LABELS: Record<MembershipStatus, string> = {
  active: 'Active', on_exchange: 'On Exchange', one_semester_pause: '1-semester Pause',
  alumni: 'Alumni', expelled: 'Expelled', silent_advisor: 'Silent Advisor',
};
export type AccountStatus = 'approved' | 'pending' | 'to_redeem';
export type FeeStatus = 'paid' | 'unpaid' | 'exempt';

export interface MemberRow {
  id: string;
  user_id: string | null;
  first_name: string;
  surname: string;
  email: string | null;
  phone: string | null;
  photo_url: string | null;
  linkedin_url: string | null;
  division: OrgDivision;
  role: AppRole;
  membership_status: MembershipStatus;
  account_status: AccountStatus;
  fee_status: FeeStatus;
  is_public: boolean;
  display_order: number;
  created_at: string;
  updated_at: string;
}

export interface MemberInput {
  id?: string;
  first_name: string;
  surname: string;
  email?: string | null;
  phone?: string | null;
  photo_url?: string | null;
  linkedin_url?: string | null;
  division: OrgDivision;
  role: AppRole;
  membership_status?: MembershipStatus;
  account_status?: AccountStatus;
  fee_status?: FeeStatus;
  is_public?: boolean;
}

// Contained cast: remove once the generated types include `members`.
const db = supabase as unknown as {
  from: (table: string) => {
    select: (cols?: string) => { order: (c: string, o?: { ascending?: boolean }) => Promise<{ data: MemberRow[] | null; error: { message: string } | null }> };
  };
};

/** Read the full roster (RLS allows staff to see all rows). */
export async function listMembers(): Promise<MemberRow[]> {
  const { data, error } = await db.from('members').select('*').order('first_name', { ascending: true });
  if (error) throw new Error(error.message);
  return data || [];
}

async function invokeAdminMembers(session: Session | null, payload: Record<string, unknown>) {
  const { data, error } = await supabase.functions.invoke('admin-members', {
    body: payload,
    headers: { Authorization: `Bearer ${session?.access_token}` },
  });
  if (error) throw error;
  if (data?.error) throw new Error(data.error);
  return data;
}

export function saveMember(session: Session | null, member: MemberInput) {
  return invokeAdminMembers(session, { action: member.id ? 'update' : 'create', member });
}

export function deleteMember(session: Session | null, id: string) {
  return invokeAdminMembers(session, { action: 'delete', member: { id } });
}

export interface MoveToAlumniInput {
  id: string;
  graduation_year: number;
  company: string;
  city?: string | null;
  /** Board members can additionally stay in the workspace as a silent advisor. */
  keep_as_silent_advisor?: boolean;
}

/** Move a member to the alumni directory, retaining phone/email privately. */
export function moveMemberToAlumni(session: Session | null, input: MoveToAlumniInput) {
  return invokeAdminMembers(session, { action: 'move-to-alumni', ...input });
}

/** Staff photo upload for a managed member. Returns the public URL. */
export async function uploadMemberPhoto(session: Session | null, file: File): Promise<string> {
  const form = new FormData();
  form.append('file', file);
  const { data, error } = await supabase.functions.invoke('admin-members', {
    body: form,
    headers: { Authorization: `Bearer ${session?.access_token}` },
  });
  if (error) throw error;
  if (data?.error) throw new Error(data.error);
  return data.photo_url as string;
}

// ── Self-service (My Profile) ────────────────────────────────────────

export interface MyProfileResult {
  member: MemberRow | null;
  isCandidate?: boolean;
  isAdmin?: boolean;
}

export async function getMyMember(session: Session | null): Promise<MyProfileResult> {
  const { data, error } = await supabase.functions.invoke('member-profile', {
    body: { action: 'get' },
    headers: { Authorization: `Bearer ${session?.access_token}` },
  });
  if (error) throw error;
  if (data?.error) throw new Error(data.error);
  return data as MyProfileResult;
}

export async function updateMyProfile(
  session: Session | null,
  input: { phone: string; photo_url?: string | null },
): Promise<MemberRow> {
  const { data, error } = await supabase.functions.invoke('member-profile', {
    body: { action: 'update', ...input },
    headers: { Authorization: `Bearer ${session?.access_token}` },
  });
  if (error) throw error;
  if (data?.error) throw new Error(data.error);
  return data.member as MemberRow;
}

export async function uploadMyPhoto(session: Session | null, file: File): Promise<string> {
  const form = new FormData();
  form.append('file', file);
  const { data, error } = await supabase.functions.invoke('member-profile', {
    body: form,
    headers: { Authorization: `Bearer ${session?.access_token}` },
  });
  if (error) throw error;
  if (data?.error) throw new Error(data.error);
  return data.photo_url as string;
}
