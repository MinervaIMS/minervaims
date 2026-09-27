import { supabase } from '@/integrations/supabase/client';

// =====================================================================
// Getting started: the new member's checklist on the Dashboard.
// ---------------------------------------------------------------------
// Five steps. Each ticks itself when the workspace can see it done, and
// can always be ticked or unticked by hand:
//
//   profile       a photo and a phone number on My Profile
//   linkedin      a LinkedIn link on My Profile
//   reading       the role brief AND the statute, opened from the list
//   head          manual only: nobody can see a conversation
//   publications  one of the division's latest reports, opened from the list
//
// What the member ticked and opened lives in their own row of
// `onboarding_progress` (row level security: theirs alone). What the
// workspace can see about them comes from `my_onboarding_context()`, which
// also says whether the checklist is for them at all and who heads their
// division. See migration 20260927100200_onboarding_checklist.sql.
// =====================================================================

export type OnboardingStep = 'profile' | 'linkedin' | 'reading' | 'head' | 'publications';

export const ONBOARDING_STEPS: OnboardingStep[] = ['profile', 'linkedin', 'reading', 'head', 'publications'];

/** What the member opened from the checklist. */
export type OnboardingMark = 'opened_role_brief' | 'opened_statute' | 'opened_publication';

export interface DivisionHead { name: string; email: string | null; phone: string | null }

export interface OnboardingContext {
  eligible: boolean;
  division: string | null;
  has_photo: boolean;
  has_phone: boolean;
  has_linkedin: boolean;
  heads: DivisionHead[];
}

export interface OnboardingProgress {
  /** Step or mark -> when it was ticked or opened. */
  items: Record<string, string>;
  hidden_at: string | null;
  completed_at: string | null;
}

export interface LatestReport { id: string; title: string; date: string | null; file_url: string; division: string | null }

// The table and the function are newer than the generated types; the one
// place that says so.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const sb = supabase as unknown as { from: (t: string) => any; rpc: (f: string, a?: Record<string, unknown>) => any };

export async function loadOnboarding(): Promise<{ context: OnboardingContext; progress: OnboardingProgress | null }> {
  const [ctx, row] = await Promise.all([
    sb.rpc('my_onboarding_context'),
    sb.from('onboarding_progress').select('items, hidden_at, completed_at').maybeSingle(),
  ]);
  if (ctx.error) throw new Error(ctx.error.message);
  const c = (ctx.data || {}) as Partial<OnboardingContext>;
  const context: OnboardingContext = {
    eligible: c.eligible === true,
    division: typeof c.division === 'string' ? c.division : null,
    has_photo: c.has_photo === true,
    has_phone: c.has_phone === true,
    has_linkedin: c.has_linkedin === true,
    heads: Array.isArray(c.heads) ? c.heads.filter((h) => h && typeof h.name === 'string') : [],
  };
  const r = row.error ? null : row.data;
  const progress = r ? {
    items: r.items && typeof r.items === 'object' && !Array.isArray(r.items) ? r.items as Record<string, string> : {},
    hidden_at: r.hidden_at ?? null,
    completed_at: r.completed_at ?? null,
  } : null;
  return { context, progress };
}

/** Writes the member's own row, creating it the first time. */
export async function saveOnboarding(userId: string, next: OnboardingProgress): Promise<void> {
  const { error } = await sb.from('onboarding_progress').upsert({
    user_id: userId,
    items: next.items,
    hidden_at: next.hidden_at,
    completed_at: next.completed_at,
  }, { onConflict: 'user_id' });
  if (error) throw new Error(error.message);
}

/** The division's latest published reports; the association's when it has none. */
export async function latestReports(division: string | null): Promise<{ reports: LatestReport[]; ofDivision: boolean }> {
  const base = () => sb.from('archive_files')
    .select('id, title, date, file_url, division')
    .eq('status', 'published')
    .is('deleted_at', null)
    .order('date', { ascending: false })
    .limit(3);
  if (division) {
    const { data } = await base().eq('division', division);
    if (Array.isArray(data) && data.length) return { reports: data as LatestReport[], ofDivision: true };
  }
  const { data } = await base();
  return { reports: Array.isArray(data) ? data as LatestReport[] : [], ofDivision: false };
}

/** Whether a step is done, and whether it was the workspace that saw it. */
export function stepState(step: OnboardingStep, ctx: OnboardingContext, items: Record<string, string>): { done: boolean; auto: boolean } {
  const auto = step === 'profile' ? ctx.has_photo && ctx.has_phone
    : step === 'linkedin' ? ctx.has_linkedin
    : step === 'reading' ? !!items.opened_role_brief && !!items.opened_statute
    : step === 'publications' ? !!items.opened_publication
    : false;
  return { done: auto || !!items[step], auto };
}

/**
 * A WhatsApp link for a phone number, when the number says which country
 * it is in: an international prefix, or an Italian mobile (3xx, 9 or 10
 * digits). Anything else gets no link rather than a wrong one.
 */
export function whatsappLink(phone: string | null): string | null {
  if (!phone) return null;
  const raw = phone.trim();
  const digits = raw.replace(/\D/g, '');
  if (raw.startsWith('+') && digits.length >= 8) return `https://wa.me/${digits}`;
  if (digits.startsWith('00') && digits.length >= 10) return `https://wa.me/${digits.slice(2)}`;
  if (/^3\d{8,9}$/.test(digits)) return `https://wa.me/39${digits}`;
  return null;
}
