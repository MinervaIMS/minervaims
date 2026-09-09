// =====================================================================
// staff-notify — the automatic notices sent to the people running
// recruiting, rather than to the candidate.
// ---------------------------------------------------------------------
// TWO DIFFERENT ADDRESSEES, ON PURPOSE:
//
//   * INTERVIEW SLOTS go to the one person who opened the slot. A
//     division may have two or three heads; only the examiner whose
//     calendar is affected needs to know that a slot has been taken or
//     given back, so the recipient is read from the slot record itself
//     (`created_by`) and not from the division's role list.
//
//   * OFFERS go to every head of the offer's division AND to the
//     President in office. Both are resolved from `user_roles` at the
//     moment of sending, so a change of President or of a head is picked
//     up with no code change.
//
// Nothing here may ever break the action that triggered it: every send is
// wrapped, and a failure is logged and swallowed. A booking must succeed
// even if the notice cannot be queued.
//
// The queue call is `enqueue_staff_email`, not `enqueue_app_email`: the
// candidate-side duplicate guard collapses any identical template and
// recipient within five minutes, which is exactly what two candidates
// booking back to back look like. The staff guard adds the application or
// slot reference, so two different events both go out.
// =====================================================================

// deno-lint-ignore no-explicit-any
type Client = any;

export const DIVISION_LABELS: Record<string, string> = {
  equity: 'Equity Research', investment: 'Investment Research', macro: 'Macro Research',
  portfolio: 'Portfolio Management', quant: 'Quantitative Research',
  media: 'Media & Communication', operations: 'Operations', board: 'Board',
};

/** Heads of a division: `head_of_division` plus the two named heads. */
const HEAD_ROLES = ['head_of_division', 'head_of_operations', 'head_of_media'];

export interface StaffRecipient { email: string; first_name: string }

function firstName(fullName: string | null, email: string): string {
  const n = (fullName || '').trim();
  if (n) return n.split(/\s+/)[0];
  return (email.split('@')[0] || 'colleague').replace(/[._-]+/g, ' ').split(' ')[0];
}

/** The member who opened this slot. */
export async function slotOpener(supabase: Client, slot: { created_by?: string | null; examiner_id?: string | null }): Promise<StaffRecipient[]> {
  const id = slot.created_by || slot.examiner_id;
  if (!id) return [];
  const { data } = await supabase.from('profiles').select('email, full_name').eq('id', id).maybeSingle();
  if (!data?.email) return [];
  return [{ email: data.email, first_name: firstName(data.full_name, data.email) }];
}

/** Every head of this division, plus the President in office. */
export async function divisionHeadsAndPresident(supabase: Client, division: string | null): Promise<StaffRecipient[]> {
  const { data: rows } = await supabase
    .from('user_roles')
    .select('role, division, user_id')
    .in('role', [...HEAD_ROLES, 'president']);
  const ids = new Set<string>();
  for (const r of rows || []) {
    if (r.role === 'president') { ids.add(r.user_id); continue; }
    if (division && r.division === division) ids.add(r.user_id);
  }
  if (!ids.size) return [];
  const { data: profiles } = await supabase.from('profiles').select('id, email, full_name').in('id', [...ids]);
  const out: StaffRecipient[] = [];
  const seen = new Set<string>();
  for (const p of profiles || []) {
    const email = (p.email || '').trim();
    if (!email || seen.has(email.toLowerCase())) continue;
    seen.add(email.toLowerCase());
    out.push({ email, first_name: firstName(p.full_name, email) });
  }
  return out;
}

/**
 * Queue one staff notice per recipient.
 * `reference` is the application or slot id: it is what keeps two separate
 * events from being mistaken for one repeated send.
 */
export async function notifyStaff(
  supabase: Client,
  key: string,
  recipients: StaffRecipient[],
  vars: Record<string, string>,
  reference: string,
): Promise<void> {
  for (const r of recipients) {
    try {
      await supabase.rpc('enqueue_staff_email', {
        p_key: key,
        p_to: r.email,
        p_vars: { ...vars, first_name: r.first_name },
        p_dedupe: reference,
      });
    } catch (e) {
      console.error(`staff notice ${key} to ${r.email} failed`, e);
    }
  }
}
