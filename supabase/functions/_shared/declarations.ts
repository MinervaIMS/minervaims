/* eslint-disable @typescript-eslint/no-explicit-any */
import { ONE_ASSOCIATION, commitmentText, plainText, typedNameOk, type DeclarationText } from './declaration-text.ts';

// =====================================================================
// Signing (Step 97).
// ---------------------------------------------------------------------
// One path for every signature, whoever signs and wherever: a candidate
// accepting an offer (applicant-notify) and a member answering the
// semester commitment (declarations). Each signature is stored with the
// text it was given (its version and SHA-256), the typed name, the box
// ticked and the time. That record in the Workspace is the signature,
// exactly as for accepting an offer: nothing is printed and nobody
// countersigns. The signer receives one short email confirming that
// their acceptance of the one-association policy was received.
// =====================================================================

export { ONE_ASSOCIATION, commitmentText, plainText, typedNameOk };

export const esc = (s: unknown) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

export async function sha256Hex(text: string): Promise<string> {
  const d = new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text)));
  return Array.from(d).map((b) => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Is the declaration asked for at the moment, and where? The switches are
 * on Recruiting > Application Page (application_settings):
 *   'offer'       a candidate signs it to accept an offer;
 *   'commitment'  members sign it with the semester commitment.
 * A database without the Step 97 columns reads as "not asked".
 */
export async function declarationRequired(supabase: any, where: 'offer' | 'commitment'): Promise<boolean> {
  const column = where === 'offer' ? 'declaration_at_offer' : 'declaration_at_commitment';
  const { data, error } = await supabase.from('application_settings').select(column).limit(1).maybeSingle();
  if (error || !data) return false;
  return data[column] === true;
}

export interface SignatureInput {
  kind: 'one_association' | 'commitment';
  context: 'offer' | 'semester';
  semesterLabel: string;
  userId: string | null;
  memberId?: string | null;
  applicationId?: string | null;
  personName: string;
  personEmail: string;
  division?: string | null;
  decision: 'signed' | 'confirmed' | 'declined';
  typedName: string;
  agreed: boolean;
}

/** The text a signature is given, from what it is. */
export function textFor(input: Pick<SignatureInput, 'kind' | 'semesterLabel' | 'decision'>): DeclarationText {
  return input.kind === 'one_association'
    ? ONE_ASSOCIATION
    : commitmentText(input.semesterLabel, input.decision === 'declined' ? 'declined' : 'confirmed');
}

/** Store one signature. A second one for the same person, kind and semester is refused by the database. */
export async function recordSignature(supabase: any, input: SignatureInput): Promise<{ row?: any; error?: string; duplicate?: boolean }> {
  if (!typedNameOk(input.typedName)) return { error: 'Sign by typing your full name: first name and surname.' };
  if (input.agreed !== true) return { error: 'Tick the box to sign.' };
  const text = textFor(input);
  const { data, error } = await supabase.from('signed_documents').insert({
    kind: input.kind, context: input.context, semester_label: input.semesterLabel,
    user_id: input.userId, member_id: input.memberId ?? null, application_id: input.applicationId ?? null,
    person_name: input.personName, person_email: input.personEmail, division: input.division ?? null,
    decision: input.decision, text_version: text.version, text_sha256: await sha256Hex(plainText(text)),
    typed_name: input.typedName.trim(), agreed: true,
  }).select('*').maybeSingle();
  if (error) {
    if ((error as any).code === '23505') return { duplicate: true, error: 'This is already signed for the semester.' };
    return { error: 'The signature could not be recorded. Please try again.' };
  }
  return { row: data };
}

/** Rome's clock, as the receipts write it: "24 October 2026, 10:55 pm CEST". */
export function romeLong(d: Date): string {
  const date = d.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Europe/Rome' });
  const time = d.toLocaleTimeString('en-GB', { hour: 'numeric', minute: '2-digit', hour12: true, timeZone: 'Europe/Rome' }).replace(/\s?([ap])m$/i, ' $1m').toLowerCase();
  const zone = new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/Rome', timeZoneName: 'short' }).formatToParts(d).find((p) => p.type === 'timeZoneName')?.value ?? '';
  const named = zone === 'GMT+2' ? 'CEST' : zone === 'GMT+1' ? 'CET' : zone;
  return `${date}, ${time} ${named}`;
}

/** The one email once a declaration is signed: the receipt, to the signer. */
export async function announceSigned(supabase: any, row: any): Promise<void> {
  if (row.kind !== 'one_association') return;
  const firstName = String(row.person_name || '').trim().split(/\s+/)[0];
  try {
    await supabase.rpc('enqueue_app_email', {
      p_key: 'declaration_signed', p_to: row.person_email,
      p_vars: { first_name: esc(firstName), semester_label: esc(row.semester_label), signer_name: esc(row.typed_name), signed_at: romeLong(new Date(row.signed_at)) },
    });
  } catch (e) { console.error('declaration_signed email failed', e); }
}
