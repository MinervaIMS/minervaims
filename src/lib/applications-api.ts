// =====================================================================
// applications-api — typed data access for the Applications pipeline.
// Reviewer access goes through the admin-applications edge function;
// candidates read only their own row (RLS). Contains the cast around the
// not-yet-regenerated Supabase types in one place.
// =====================================================================

import { supabase } from '@/integrations/supabase/client';
import type { Session } from '@supabase/supabase-js';
import type { OrgDivision } from '@/lib/roles';

export type AcademicYear = 'bachelor_1' | 'bachelor_2' | 'bachelor_3' | 'master_1' | 'master_2' | 'exchange';

export type ApplicationStatus =
  | 'received' | 'cv_opened' | 'under_review' | 'to_be_contacted' | 'interview_invitation_sent'
  | 'waiting_interview_confirmation' | 'interview_confirmed' | 'interview_completed'
  | 'accepted' | 'rejected' | 'offer_accepted' | 'offer_declined' | 'joined';

export interface ApplicationRow {
  id: string;
  user_id: string | null;
  semester_label: string;
  first_name: string;
  surname: string;
  bocconi_id: string;
  email: string;
  phone: string;
  linkedin_url: string | null;
  degree_course: string;
  academic_year: AcademicYear;
  cv_path: string | null;
  answer_path: string | null;
  first_choice: OrgDivision;
  second_choice: OrgDivision | null;
  status: ApplicationStatus;
  cv_viewed_at: string | null;
  created_at: string;
  note_count?: number;
}

export interface ApplicationNote {
  id: string;
  application_id: string;
  author_name: string | null;
  body: string;
  created_at: string;
}

export interface ApplicationQuestion {
  division: OrgDivision;
  question: string;
}

export const ACADEMIC_YEAR_LABELS: Record<AcademicYear, string> = {
  bachelor_1: 'Bachelor — Year 1', bachelor_2: 'Bachelor — Year 2', bachelor_3: 'Bachelor — Year 3',
  master_1: 'Master — Year 1', master_2: 'Master — Year 2', exchange: 'Exchange student',
};

// Full internal status list (reviewer-facing), in workflow order.
export const STATUS_FLOW: ApplicationStatus[] = [
  'received', 'cv_opened', 'under_review', 'to_be_contacted', 'interview_invitation_sent',
  'waiting_interview_confirmation', 'interview_confirmed', 'interview_completed',
  'accepted', 'rejected', 'offer_accepted', 'offer_declined', 'joined',
];

export const STATUS_LABELS: Record<ApplicationStatus, string> = {
  received: 'Application received', cv_opened: 'CV opened', under_review: 'Under review',
  to_be_contacted: 'To be contacted', interview_invitation_sent: 'Interview invitation sent',
  waiting_interview_confirmation: 'Waiting for interview confirmation', interview_confirmed: 'Interview confirmed',
  interview_completed: 'Interview completed', accepted: 'Accepted', rejected: 'Rejected',
  offer_accepted: 'Offer accepted', offer_declined: 'Offer declined', joined: 'Joined',
};

// Simplified candidate-facing status (report 10.3).
export function candidateStatus(s: ApplicationStatus): { label: string; step: number } {
  switch (s) {
    case 'received': return { label: 'Application received', step: 1 };
    case 'cv_opened':
    case 'under_review':
    case 'to_be_contacted': return { label: 'Application under review', step: 2 };
    case 'interview_invitation_sent':
    case 'waiting_interview_confirmation':
    case 'interview_confirmed':
    case 'interview_completed': return { label: 'Interview stage', step: 3 };
    case 'accepted':
    case 'offer_accepted':
    case 'joined': return { label: 'Accepted', step: 4 };
    case 'rejected':
    case 'offer_declined': return { label: 'Not selected', step: 5 };
    default: return { label: 'Application received', step: 1 };
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const sb = supabase as unknown as { from: (t: string) => any };

async function invoke(session: Session | null, body: Record<string, unknown>) {
  const { data, error } = await supabase.functions.invoke('admin-applications', {
    body, headers: { Authorization: `Bearer ${session?.access_token}` },
  });
  if (error) throw error;
  if (data?.error) throw new Error(data.error);
  return data;
}

// ── Reviewer ───────────────────────────────────────────────────────────
export async function listApplications(session: Session | null): Promise<ApplicationRow[]> {
  return (await invoke(session, { action: 'list' })).applications as ApplicationRow[];
}
export async function getApplication(session: Session | null, id: string): Promise<{ application: ApplicationRow; notes: ApplicationNote[] }> {
  return await invoke(session, { action: 'get', id });
}
export async function signDocumentUrl(session: Session | null, id: string, kind: 'cv' | 'answer', mode: 'preview' | 'download'): Promise<string> {
  return (await invoke(session, { action: 'sign-url', id, kind, mode })).url as string;
}
export async function bulkDocumentUrls(session: Session | null, ids: string[], kind: 'cv' | 'answer'): Promise<{ name: string; url: string }[]> {
  return (await invoke(session, { action: 'bulk-urls', ids, kind })).files;
}
export async function updateApplicationStatus(session: Session | null, id: string, status: ApplicationStatus) {
  return await invoke(session, { action: 'update-status', id, status });
}
export async function addApplicationNote(session: Session | null, id: string, body: string) {
  return await invoke(session, { action: 'add-note', id, body });
}
export async function setDivisionQuestion(session: Session | null, division: OrgDivision, question: string) {
  return await invoke(session, { action: 'set-question', division, question });
}
export async function convertToMember(session: Session | null, id: string, role: string, division: OrgDivision, feeDue: boolean) {
  return await invoke(session, { action: 'convert-to-member', id, role, division, fee_due: feeDue });
}

// ── Public / candidate ─────────────────────────────────────────────────
export async function listQuestions(): Promise<ApplicationQuestion[]> {
  const { data, error } = await sb.from('application_questions').select('division, question');
  if (error) throw new Error(error.message);
  return (data || []) as ApplicationQuestion[];
}

/** The signed-in candidate's own application (RLS returns only their row). */
export async function getMyApplication(): Promise<ApplicationRow | null> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data, error } = await sb
    .from('applications').select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(1).maybeSingle();
  if (error) throw new Error(error.message);
  return (data as ApplicationRow) ?? null;
}

export async function submitApplication(session: Session | null, form: FormData): Promise<{ id: string }> {
  const { data, error } = await supabase.functions.invoke('submit-application', {
    body: form, headers: { Authorization: `Bearer ${session?.access_token}` },
  });
  if (error) throw error;
  if (data?.error) throw new Error(data.error);
  return data;
}
