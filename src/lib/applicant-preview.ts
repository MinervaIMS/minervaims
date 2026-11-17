// =====================================================================
// APPLICANT PREVIEW: A SAMPLE APPLICANT, IN THE BROWSER ONLY (Step 106).
// ---------------------------------------------------------------------
// Recruiting, Applicant Preview draws the applicant's REAL pages (Status,
// Interview, Phone Call, Offer, Profile, FAQs) for a sample applicant, so
// the recruiting roles can see exactly what an applicant sees at each
// stage. Those pages read their data through a few functions
// (getMyApplication, the interview and call contexts, the documents) and
// write through a few others (booking a slot, answering the offer,
// withdrawing). While the preview is open, each of them asks
// `applicantPreview()` first and, if a preview is running, answers from
// here instead of the server.
//
// NOTHING LEAVES THE BROWSER. Booking a slot, accepting the offer or
// withdrawing in the preview changes only the sample below, so the page
// moves on as it would for a real applicant; no request is sent, no email
// goes out and no row is written. The preview is switched on by the page
// while it is open and off when it closes (`startApplicantPreview`,
// `stopApplicantPreview`), and only a page that can open Candidates
// Screening ever switches it on.
//
// THE SAMPLE IS "MICHAEL BURRY" (the association's choice of example name),
// with an example.com address, made-up numbers and two sample documents
// (/preview/*.pdf) written for the preview and marked as samples. Nothing
// about a real person is read or shown: it is a name on a mock application.
// =====================================================================
import type { ApplicationRow, ApplicationStatus } from '@/lib/applications-api';
import type { AvailableSlot, CandidateContext } from '@/lib/interviews-api';
import type { AvailableCallSlot, MyCallContext } from '@/lib/calls-api';

/** The stages of the journey the preview can be set to, in order. */
export const PREVIEW_STAGES = [
  { id: 'received', label: 'Application received', note: 'Submitted, and being read by the division.' },
  { id: 'interview-invited', label: 'Invited to interview', note: 'A division invited them: the Interview page opens with its slots.' },
  { id: 'interview-booked', label: 'Interview booked', note: 'They chose a slot: the time, the link and Add to calendar.' },
  { id: 'call-invited', label: 'Invited to the phone call', note: 'After the interview: the Phone Call page opens with its times.' },
  { id: 'call-booked', label: 'Phone call booked', note: 'They chose a time: the numbers and Add to calendar.' },
  { id: 'offer', label: 'Offer', note: 'The Offer page opens: the role, the division and the date to reply by.' },
  { id: 'joined', label: 'Offer accepted', note: 'They accepted: the account becomes a member the next time they sign in.' },
  { id: 'not-selected', label: 'Not selected', note: 'The outcome when the division does not go ahead.' },
] as const;
export type PreviewStage = (typeof PREVIEW_STAGES)[number]['id'];

/**
 * The emails an applicant receives, by the stage they are sent at. The
 * keys are the templates' (auto_email_templates); the `applicant-preview`
 * function fills the stored copy of each with the sample applicant.
 * Mirrors APPLICANT_EMAIL_KEYS in supabase/functions/_shared/applicant-preview.ts.
 */
export const APPLICANT_EMAILS: { stage: PreviewStage | 'other'; key: string; when: string }[] = [
  { stage: 'received', key: 'application_received', when: 'At once, when the application is submitted.' },
  { stage: 'interview-invited', key: 'interview_invitation', when: 'When a division invites them to interview.' },
  { stage: 'interview-invited', key: 'interview_booking_reminder_48h', when: 'If no slot is booked 48 hours after the invitation.' },
  { stage: 'interview-invited', key: 'interview_booking_reminder_24h', when: 'If still no slot is booked, 24 hours before the deadline to book.' },
  { stage: 'interview-booked', key: 'interview_booking_confirmation', when: 'At once, when they book a slot (and again if they change it).' },
  { stage: 'interview-booked', key: 'interview_reminder_30m', when: '30 minutes before the interview.' },
  { stage: 'call-invited', key: 'call_invitation', when: 'When the President or the Vice President invites them to the call.' },
  { stage: 'call-invited', key: 'call_booking_reminder', when: 'If no time is booked 24 hours after the invitation.' },
  { stage: 'call-booked', key: 'call_booking_confirmation', when: 'At once, when they book a time.' },
  { stage: 'call-booked', key: 'call_reminder_30m', when: '30 minutes before the call.' },
  { stage: 'offer', key: 'offer_to_join', when: 'When the President sends the offer.' },
  { stage: 'offer', key: 'acceptance_reminder', when: 'If they have not answered as the deadline approaches.' },
  { stage: 'joined', key: 'acceptance_received', when: 'At once, when they accept.' },
  { stage: 'joined', key: 'declaration_signed', when: 'At once, when they sign the one-association declaration with the acceptance (only while the Board asks for it).' },
  { stage: 'not-selected', key: 'rejection_pre_interview', when: 'When the division does not invite them to interview.' },
  { stage: 'not-selected', key: 'rejection_post_interview', when: 'When the division does not go ahead after the interview.' },
  { stage: 'other', key: 'division_reassignment', when: 'When another division takes over their evaluation.' },
  { stage: 'other', key: 'offer_expired', when: 'When the deadline to answer the offer passes without an answer.' },
  { stage: 'other', key: 'offer_withdrawn', when: 'When the association withdraws an offer.' },
  { stage: 'other', key: 'application_withdrawn', when: 'When they withdraw their own application.' },
];

/** The sample documents, written for the preview (public/preview). */
export const PREVIEW_DOCUMENTS = {
  cv: '/preview/sample-cv.pdf',
  answer: '/preview/sample-written-answer.pdf',
} as const;

const DAY = 86_400_000;
const isoDay = (n: number) => new Date(Date.now() + n * DAY).toISOString().slice(0, 10);
const stamp = (n: number) => new Date(Date.now() + n * DAY).toISOString();

const SLOTS: AvailableSlot[] = [
  { id: 'preview-slot-1', division: 'equity', slot_date: isoDay(6), start_time: '17:00', end_time: '17:30', examiner_name: 'Head of Equity Research', meeting_link: 'https://teams.microsoft.com/' },
  { id: 'preview-slot-2', division: 'equity', slot_date: isoDay(6), start_time: '17:30', end_time: '18:00', examiner_name: 'Head of Equity Research', meeting_link: 'https://teams.microsoft.com/' },
  { id: 'preview-slot-3', division: 'equity', slot_date: isoDay(7), start_time: '18:00', end_time: '18:30', examiner_name: 'Head of Equity Research', meeting_link: 'https://teams.microsoft.com/' },
];
const CALL_SLOTS: AvailableCallSlot[] = [
  { id: 'preview-call-1', slot_date: isoDay(12), start_time: '18:00', end_time: '18:15', caller_name: 'Vice President' },
  { id: 'preview-call-2', slot_date: isoDay(12), start_time: '18:15', end_time: '18:30', caller_name: 'Vice President' },
  { id: 'preview-call-3', slot_date: isoDay(13), start_time: '13:00', end_time: '13:15', caller_name: 'President' },
];
const CALLER_PHONE = '+39 300 000 0001';

interface State {
  stage: PreviewStage;
  interviewSlot: string | null;
  callSlot: string | null;
  /** Set by the applicant's own answer in the preview. */
  answer: 'accepted' | 'declined' | 'withdrawn' | null;
}

let state: State | null = null;
const listeners = new Set<() => void>();
const emit = () => { for (const l of listeners) l(); };

/** Is a preview running? Read by the applicant's data functions. */
export function applicantPreview(): PreviewController | null {
  return state ? controller : null;
}

/** Switch the preview on, at a stage. */
export function startApplicantPreview(stage: PreviewStage = 'received'): void {
  state = { stage, interviewSlot: null, callSlot: null, answer: null };
  setPreviewStage(stage);
}

/** Switch it off: every data function goes back to the server. */
export function stopApplicantPreview(): void {
  state = null;
  emit();
}

/** Move the sample applicant to a stage, as the recruiting team would. */
export function setPreviewStage(stage: PreviewStage): void {
  if (!state) return;
  const order = PREVIEW_STAGES.map((s) => s.id);
  const at = order.indexOf(stage);
  state.stage = stage;
  state.answer = stage === 'joined' ? 'accepted' : null;
  // A booking exists from the stage it is made at, and on every stage after.
  state.interviewSlot = at >= order.indexOf('interview-booked') && stage !== 'not-selected' ? SLOTS[1].id : null;
  state.callSlot = at >= order.indexOf('call-booked') && stage !== 'not-selected' ? CALL_SLOTS[0].id : null;
  emit();
}

/** The stage the preview is at, or null when it is off. */
export function previewStage(): PreviewStage | null {
  return state?.stage ?? null;
}

/** Follow the preview's changes (a booking made in the preview moves the stage). */
export function subscribeApplicantPreview(fn: () => void): () => void {
  listeners.add(fn);
  return () => { listeners.delete(fn); };
}

function statusOf(s: State): ApplicationStatus {
  if (s.answer === 'withdrawn') return 'withdrawn';
  if (s.answer === 'declined') return 'offer_declined';
  switch (s.stage) {
    case 'received': return 'under_review';
    case 'interview-invited': return 'interview_invitation_sent';
    case 'interview-booked': return 'interview_confirmed';
    case 'call-invited': return 'call_invitation_sent';
    case 'call-booked': return 'call_confirmed';
    case 'offer': return 'accepted';
    case 'joined': return 'offer_accepted';
    default: return 'rejected';
  }
}

function application(s: State): ApplicationRow {
  const order = PREVIEW_STAGES.map((x) => x.id);
  const at = order.indexOf(s.stage);
  const past = (id: PreviewStage) => s.stage !== 'not-selected' && at >= order.indexOf(id);
  return {
    id: 'preview-application',
    user_id: null,
    semester_label: 'Spring 2027',
    first_name: 'Michael',
    surname: 'Burry',
    bocconi_id: '3000000',
    email: 'michael.burry@example.com',
    phone: '+39 300 000 0000',
    linkedin_url: null,
    degree_course: 'BSc in Economics and Finance',
    academic_year: 'bachelor_2',
    cv_path: 'preview/sample-cv.pdf',
    answer_path: 'preview/sample-written-answer.pdf',
    first_choice: 'equity',
    second_choice: 'macro',
    status: statusOf(s),
    interview_division: past('interview-invited') || s.stage === 'not-selected' ? 'equity' : null,
    evaluation_division: 'equity',
    cv_viewed_at: stamp(-9),
    created_at: stamp(-12),
    interview_bookings_made: s.interviewSlot ? 1 : 0,
    call_invited_at: past('call-invited') ? stamp(-2) : null,
    call_outcome: past('offer') ? 'pass' : null,
    call_bookings_made: s.callSlot ? 1 : 0,
    offer_sent_at: past('offer') ? stamp(-1) : null,
    offer_deadline: past('offer') ? stamp(16) : null,
    offer_role: past('offer') ? 'analyst' : null,
    offer_division: past('offer') ? 'equity' : null,
    selected_at: past('offer') ? stamp(-1) : null,
    withdrawn_at: s.answer === 'withdrawn' ? stamp(0) : null,
  };
}

export interface PreviewController {
  application(): ApplicationRow;
  interviewContext(): CandidateContext;
  interviewSlots(): AvailableSlot[];
  bookInterview(slotId: string): { success: true };
  cancelInterview(): { success: true };
  callContext(): MyCallContext;
  callSlots(): AvailableCallSlot[];
  bookCall(slotId: string): { success: true };
  cancelCall(): { success: true };
  answerOffer(answer: 'accepted' | 'declined'): { success: true };
  withdraw(): { success: true };
  documentUrl(kind: 'cv' | 'answer'): string;
}

const controller: PreviewController = {
  application: () => application(state!),
  interviewContext: () => {
    const s = state!;
    const app = application(s);
    const slot = SLOTS.find((x) => x.id === s.interviewSlot) ?? null;
    return {
      invited: !!app.interview_division,
      withdrawn: s.answer === 'withdrawn',
      bookingsMade: slot ? 1 : 0,
      changesLeft: 1,
      division: app.interview_division,
      status: app.status,
      booking: slot ? {
        id: 'sample', slot_id: slot.id, division: slot.division,
        slot: { ...slot, examiner_id: null, is_active: true, is_booked: true },
      } : null,
    };
  },
  interviewSlots: () => (state!.interviewSlot ? [] : SLOTS),
  bookInterview: (slotId) => {
    state!.interviewSlot = slotId;
    if (state!.stage === 'interview-invited') state!.stage = 'interview-booked';
    emit();
    return { success: true };
  },
  cancelInterview: () => {
    state!.interviewSlot = null;
    if (state!.stage === 'interview-booked') state!.stage = 'interview-invited';
    emit();
    return { success: true };
  },
  callContext: () => {
    const s = state!;
    const app = application(s);
    const slot = CALL_SLOTS.find((x) => x.id === s.callSlot) ?? null;
    return {
      invited: !!app.call_invited_at,
      withdrawn: s.answer === 'withdrawn',
      done: ['offer', 'joined'].includes(s.stage),
      status: app.status,
      phone: app.phone,
      bookBy: isoDay(3),
      booking: slot ? { id: 'sample', slot: { slot_date: slot.slot_date, start_time: slot.start_time, end_time: slot.end_time, caller_name: slot.caller_name, caller_phone: CALLER_PHONE } } : null,
      changesLeft: 1,
    };
  },
  callSlots: () => (state!.callSlot ? [] : CALL_SLOTS),
  bookCall: (slotId) => {
    state!.callSlot = slotId;
    if (state!.stage === 'call-invited') state!.stage = 'call-booked';
    emit();
    return { success: true };
  },
  cancelCall: () => {
    state!.callSlot = null;
    if (state!.stage === 'call-booked') state!.stage = 'call-invited';
    emit();
    return { success: true };
  },
  answerOffer: (answer) => {
    state!.answer = answer;
    if (answer === 'accepted') state!.stage = 'joined';
    emit();
    return { success: true };
  },
  withdraw: () => {
    state!.answer = 'withdrawn';
    emit();
    return { success: true };
  },
  documentUrl: (kind) => `${typeof window !== 'undefined' ? window.location.origin : ''}${PREVIEW_DOCUMENTS[kind]}`,
};
