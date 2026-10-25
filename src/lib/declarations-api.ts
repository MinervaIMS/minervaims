// =====================================================================
// declarations-api: the one-association declaration and the semester
// commitment (Step 97). Signing, the register and the commitment go
// through the `declarations` edge function; the texts are in
// declaration-text.ts, the server's copy. The declaration's three
// switches live with the application settings (Recruiting > Application
// Page), readable by anybody, changed through `admin-settings`.
// =====================================================================

import type { Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { invokeFunction } from '@/lib/errors';

export interface SignedDocument {
  id: string;
  kind: 'one_association' | 'commitment';
  context: 'offer' | 'semester';
  semester_label: string;
  decision: 'signed' | 'confirmed' | 'declined';
  signed_at: string;
  typed_name: string;
  text_version: string;
  person_name?: string;
  person_email?: string;
  division?: string | null;
  application_id?: string | null;
  member_id?: string | null;
}

export interface MyDeclarations {
  required: boolean;
  campaign: { semester_label: string; launched_at: string } | null;
  request: { status: 'pending' | 'confirmed' | 'declined'; responded_at: string | null } | null;
  declarationSigned: boolean;
  documents: SignedDocument[];
}

export interface CommitmentSettings {
  commitment_first_semester: string;
  commitment_reminder_days: number;
  updated_at: string;
}

export interface CommitmentCampaign { id?: string; semester_label: string; launched_at: string; launch_kind: 'auto' | 'manual'; reminder_after?: string; closed_at?: string | null }

export interface CommitmentRequestRow {
  member_id: string;
  user_id: string | null;
  first_name: string | null;
  division: string | null;
  status: 'pending' | 'confirmed' | 'declined';
  responded_at: string | null;
  request_sent_at: string | null;
  reminder_sent_at: string | null;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function invoke(session: Session | null, body: Record<string, unknown>): Promise<any> {
  return invokeFunction('declarations', { body, session });
}

/** The declaration's three switches (Recruiting > Application Page). */
export interface DeclarationSwitches {
  declaration_at_offer: boolean;
  declaration_at_commitment: boolean;
  declaration_on_join: boolean;
}
const SWITCHES_OFF: DeclarationSwitches = { declaration_at_offer: false, declaration_at_commitment: false, declaration_on_join: false };

/**
 * The switches as they stand, readable without signing in (the Join page
 * reads them). Asked on its own, so a database without the Step 97 columns
 * answers "all off" and nothing else on the page is affected.
 */
export async function declarationSwitches(): Promise<DeclarationSwitches> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any).from('application_settings')
    .select('declaration_at_offer, declaration_at_commitment, declaration_on_join').limit(1).maybeSingle();
  if (error || !data) return SWITCHES_OFF;
  return {
    declaration_at_offer: data.declaration_at_offer === true,
    declaration_at_commitment: data.declaration_at_commitment === true,
    declaration_on_join: data.declaration_on_join === true,
  };
}

/** Is the declaration signed to accept an offer at the moment? */
export async function declarationRequired(): Promise<boolean> {
  return (await declarationSwitches()).declaration_at_offer;
}

/** Turn one switch on or off (the President, the Admin and the Vice President). */
export async function saveDeclarationSwitch(session: Session | null, key: keyof DeclarationSwitches, on: boolean) {
  return await invokeFunction('admin-settings', { body: { action: 'update', settings: { [key]: on } }, session });
}

export async function myDeclarations(session: Session | null): Promise<MyDeclarations> {
  return await invoke(session, { action: 'mine' });
}
export async function signCommitment(
  session: Session | null,
  answer: { decision: 'confirmed' | 'declined'; typed_name: string; agreed: boolean; declaration?: { typed_name: string; agreed: boolean } },
) {
  return await invoke(session, { action: 'sign-commitment', ...answer });
}

// ── The President, the Vice President and the admin account ─────────
export async function declarationSettings(session: Session | null): Promise<{
  settings: CommitmentSettings; campaigns: CommitmentCampaign[];
  applications: ({ semester_label: string; start_date: string | null; end_date: string | null } & Partial<DeclarationSwitches>) | null;
}> {
  return await invoke(session, { action: 'settings' });
}
export async function saveCommitmentSettings(session: Session | null, updates: Partial<Pick<CommitmentSettings, 'commitment_first_semester' | 'commitment_reminder_days'>>) {
  return await invoke(session, { action: 'set-settings', ...updates });
}
export async function listDeclarations(session: Session | null, semesterLabel?: string): Promise<SignedDocument[]> {
  return (await invoke(session, { action: 'list', semester_label: semesterLabel ?? null })).documents as SignedDocument[];
}
export async function launchCommitment(session: Session | null, semesterLabel: string): Promise<{ requests: number; sent: number }> {
  return await invoke(session, { action: 'launch-commitment', semester_label: semesterLabel });
}
export async function sendDeclarationTests(session: Session | null): Promise<{ sent: number; to: string }> {
  return await invoke(session, { action: 'send-test' });
}

// ── The Board ────────────────────────────────────────────────────────
export async function commitmentOverview(session: Session | null, semesterLabel?: string): Promise<{
  campaigns: CommitmentCampaign[]; campaign: CommitmentCampaign | null; requests: CommitmentRequestRow[];
}> {
  return await invoke(session, { action: 'commitment-overview', semester_label: semesterLabel ?? null });
}

/** A typed name counts as a signature when it has two words (declaration-text.ts). */
export { typedNameOk, ONE_ASSOCIATION, commitmentText, textOfSignature } from '@/lib/declaration-text';
