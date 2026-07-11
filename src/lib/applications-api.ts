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
  /** Division the candidate was invited to interview for (set on invitation). */
  interview_division: OrgDivision | null;
  cv_viewed_at: string | null;
  created_at: string;
  note_count?: number;
  // Offer to join (set when New Joiners sends an offer).
  offer_sent_at?: string | null;
  offer_deadline?: string | null;
  offer_role?: string | null;
  offer_division?: OrgDivision | null;
  offer_fee_due?: boolean | null;
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
  bachelor_1: 'Bachelor, 1st year', bachelor_2: 'Bachelor, 2nd year', bachelor_3: 'Bachelor, 3rd year',
  master_1: 'Master, 1st year', master_2: 'Master, 2nd year', exchange: 'Exchange student',
};

// Colour classes per status for the reviewer table / detail (report item 15).
// Grouped: neutral (early), amber (interview in progress / caution), green
// (positive outcomes), red (negative outcomes).
export const STATUS_COLORS: Record<ApplicationStatus, string> = {
  received: 'bg-muted text-muted-foreground border-separator',
  cv_opened: 'bg-muted text-muted-foreground border-separator',
  under_review: 'bg-sky-50 text-sky-700 border-sky-200',
  to_be_contacted: 'bg-sky-50 text-sky-700 border-sky-200',
  interview_invitation_sent: 'bg-amber-50 text-amber-700 border-amber-200',
  waiting_interview_confirmation: 'bg-amber-50 text-amber-700 border-amber-200',
  interview_confirmed: 'bg-indigo-50 text-indigo-700 border-indigo-200',
  interview_completed: 'bg-indigo-50 text-indigo-700 border-indigo-200',
  accepted: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  offer_accepted: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  joined: 'bg-emerald-100 text-emerald-800 border-emerald-300',
  rejected: 'bg-red-50 text-red-700 border-red-200',
  offer_declined: 'bg-orange-50 text-orange-700 border-orange-200',
};

/** Small status pill used in the reviewer table and detail view. */
export function statusBadgeClass(status: ApplicationStatus): string {
  return STATUS_COLORS[status] ?? 'bg-muted text-muted-foreground border-separator';
}

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
export async function updateApplicationStatus(session: Session | null, id: string, status: ApplicationStatus, interviewDivision?: OrgDivision | null) {
  return await invoke(session, { action: 'update-status', id, status, interview_division: interviewDivision ?? undefined });
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
/** New Joiners: extend an offer to join (3-day window, 2-day reminder). */
export async function sendOffer(session: Session | null, id: string, role: string, division: OrgDivision, feeDue: boolean) {
  return await invoke(session, { action: 'send-offer', id, role, division, fee_due: feeDue });
}

// ── Candidate offer actions (self-service via applicant-notify) ─────────────
async function invokeNotify(session: Session | null, body: Record<string, unknown>) {
  const { data, error } = await supabase.functions.invoke('applicant-notify', {
    body, headers: { Authorization: `Bearer ${session?.access_token}` },
  });
  if (error) throw error;
  if (data?.error) throw new Error(data.error);
  return data;
}
export async function acceptOffer(session: Session | null) {
  return await invokeNotify(session, { action: 'accept-offer' });
}
export async function declineOffer(session: Session | null) {
  return await invokeNotify(session, { action: 'decline-offer' });
}

// ── Public / candidate ─────────────────────────────────────────────────
export async function listQuestions(): Promise<ApplicationQuestion[]> {
  const { data, error } = await sb.from('application_questions').select('division, question');
  if (error) throw new Error(error.message);
  return (data || []) as ApplicationQuestion[];
}

/** The signed-in candidate's own application (RLS returns only their row). */
export async function getMyApplication(): Promise<ApplicationRow | null> {
  const { data, error } = await sb.from('applications').select('*').limit(1).maybeSingle();
  if (error) throw new Error(error.message);
  return (data as ApplicationRow) ?? null;
}

// Public: the applicant creates their account (client-side auth.signUp) and
// then submits this form with the returned user id. No prior session needed.
export async function submitApplication(form: FormData): Promise<{ id: string; verified?: boolean; already?: boolean }> {
  const { data, error } = await supabase.functions.invoke('submit-application', { body: form });
  if (error) throw error;
  if (data?.error) throw new Error(data.error);
  return data;
}
