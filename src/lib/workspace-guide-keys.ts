// =====================================================================
// workspace-guide-keys — which pages have help, without the help itself.
// ---------------------------------------------------------------------
// `workspace-guide.ts` is 60kB of prose and `workspace-manual.ts` is
// another 57kB. Together they were nearly half of the chunk the workspace
// downloads before it can draw anything, and none of it is read until
// somebody opens the help panel: the shell needed those modules for ONE
// question, asked on every page, on every load.
//
//   "Does this page have help, so should the ? be drawn at all?"
//
// Not every page does - thirty-eight of them do - so the question is real
// and the button cannot simply be drawn everywhere: it would open an
// empty panel. This module answers it in a few hundred bytes, the prose
// is fetched only when the panel is opened, and the workspace opens with
// 120kB less to download and parse.
//
// THE LIST IS A COPY, AND THE COPY IS CHECKED. `GUIDE` remains the single
// source of truth; the moment the real module is loaded it compares its
// own keys against this list and complains in development if they have
// drifted. A key missing from here costs its page the help button, which
// is why the check exists; a key here with no entry behind it is caught
// by the same comparison.
// =====================================================================

/** Every `key` in GUIDE. Kept in step by the check in workspace-guide.ts. */
export const GUIDE_KEYS: ReadonlySet<string> = new Set([
  'my-role', 'dashboard', 'welcome', 'calendar',
  'reports-upload', 'reports-archive', 'reports-templates', 'reports-funds',
  'applications-website', 'applications-screening', 'applications-interview-calendar',
  'applications-joiners', 'applications-form',
  'events-create', 'events-forms', 'events-attendance', 'events-archive',
  'events-alumni-calls', 'events-on-display',
  'people-members', 'people-alumni',
  'smm-editorial', 'smm-ads',
  'ops-fee', 'ops-treasury', 'ops-auto-emails',
  'website-pages', 'website-history', 'website-faqs',
  'settings-users', 'settings-roles', 'settings-mobile', 'settings-activity',
  // The applicant's four pages.
  'candidate-my-role', 'applications-status', 'applications-interview',
  'applications-offer', 'applications-faqs',
]);

/**
 * An applicant reading My Profile is not a member reading My Profile, so
 * the same page key has to resolve to a different entry for them.
 */
const CANDIDATE_GUIDE_KEYS: Record<string, string> = {
  'my-role': 'candidate-my-role',
  // The address the Interview page used to occupy, so the help panel is
  // right even in the tick before the workspace redirects it.
  'applications-interview-calendar': 'applications-interview',
};

/** The guide entry a page key maps to, for this kind of reader. */
export function helpPageKey(pageKey: string, isCandidate: boolean): string {
  if (!isCandidate) return pageKey;
  return CANDIDATE_GUIDE_KEYS[pageKey] ?? pageKey;
}

/** Is there a help entry for this page? Answers without loading the prose. */
export const hasGuide = (key: string): boolean => GUIDE_KEYS.has(key);
