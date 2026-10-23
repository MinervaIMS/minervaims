// =====================================================================
// An alumni call being edited in the workspace (Step 91): the draft the
// form holds, what stops it being saved, and the shape the server takes.
// Used by Events > Create and by the call's window in Event Archive.
// =====================================================================

import { ALUMNI_CALL_MAX, ALUMNI_CALL_MIN, type AlumniCallStatus, type AlumniGuest } from '@/lib/alumni-call';
import type { AlumniCallInput, AlumniCallPlan } from '@/lib/events-api';

export interface AlumniCallDraft {
  status: AlumniCallStatus;
  responsible_person: string;
  notes: string;
  participants: AlumniGuest[];
}

export const emptyAlumniDraft = (): AlumniCallDraft => ({ status: 'planned', responsible_person: '', notes: '', participants: [] });

/** What stops the call being saved, in the organisers' words; null when it can be. */
export function alumniDraftProblem(d: AlumniCallDraft): string | null {
  const named = d.participants.filter((p) => p.name.trim());
  if (named.length !== d.participants.length) return 'Give every alumnus a name, or remove the empty row.';
  if (named.length < ALUMNI_CALL_MIN) return `An alumni call needs at least ${ALUMNI_CALL_MIN} alumni.`;
  if (named.length > ALUMNI_CALL_MAX) return `An alumni call can have at most ${ALUMNI_CALL_MAX} alumni.`;
  return null;
}

/** The draft as the server takes it. */
export function alumniDraftPayload(d: AlumniCallDraft, dateTbc: boolean): AlumniCallInput {
  const trim = (v: string | null | undefined) => (v ?? '').trim() || null;
  return {
    status: d.status,
    responsible_person: trim(d.responsible_person),
    notes: trim(d.notes),
    date_tbc: dateTbc,
    participants: d.participants.map((p) => ({
      alumni_id: p.alumni_id ?? null,
      name: p.name.trim(),
      company: trim(p.company),
      position: trim(p.position),
      former_role: trim(p.former_role),
      former_division: p.former_division || null,
      headline: trim(p.headline),
    })),
  };
}

/** A saved call's planning, as the form edits it. */
export function draftFromPlan(plan: AlumniCallPlan | null | undefined): AlumniCallDraft {
  if (!plan) return emptyAlumniDraft();
  return {
    status: plan.status,
    responsible_person: plan.responsible_person ?? '',
    notes: plan.notes ?? '',
    participants: plan.participants.map((p) => ({ ...p })),
  };
}
