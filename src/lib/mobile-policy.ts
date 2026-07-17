// =====================================================================
// Mobile policy — what each workspace subsection offers on a phone.
//   'full' : works on mobile exactly as on desktop (real permissions).
//   'view' : opens on mobile READ-ONLY for everyone, regardless of role;
//            every editing affordance is withheld (useAccess caps levels).
//   'no'   : listed in the navigation but blocked with a card explaining
//            it is available on desktop only.
// The DESKTOP experience is never affected by anything in this file: the
// cap only engages below the desktop breakpoint (1024px), the same
// threshold that switches the workspace shell.
// =====================================================================

export type MobilePolicy = 'full' | 'view' | 'no';

export const MOBILE_POLICY: Record<string, MobilePolicy> = {
  // General
  'dashboard': 'view',
  'my-role': 'view',
  'calendar': 'full',
  'welcome': 'view',
  // Reports
  'reports-upload': 'full',
  'reports-archive': 'view',
  'reports-templates': 'view',
  'reports-funds': 'no',
  // Recruiting
  'applications-website': 'no',
  'applications-screening': 'no',
  'applications-interview-calendar': 'no',
  'applications-joiners': 'no',
  'applications-form': 'no',
  // Events
  'events-create': 'no',
  'events-forms': 'no',
  'events-attendance': 'full',
  'events-archive': 'view',
  'events-alumni-calls': 'view',
  'events-on-display': 'full',
  // People
  'people-members': 'view',
  'people-alumni': 'view',
  // Media & Communication
  'smm-editorial': 'view',
  'smm-ig': 'view',
  'smm-li': 'view',
  'smm-graphics': 'view',
  'smm-other': 'view',
  'smm-brand': 'view',
  'smm-ads': 'no',
  // Operations
  'ops-fee': 'full',
  'ops-treasury': 'no',
  'ops-external': 'view',
  'ops-docs': 'view',
  // Website
  'website-pages': 'full',
  'website-readings': 'view',
  'website-testimonials': 'no',
  'ops-newsletter': 'no',
  'ops-auto-emails': 'no',
  // Settings
  'settings-users': 'no',
  'settings-roles': 'no',
  'settings-activity': 'no',
};

/** Policy for a page key; anything unlisted stays desktop-only. */
export function mobilePolicyFor(key: string | null | undefined): MobilePolicy {
  if (!key) return 'no';
  return MOBILE_POLICY[key] ?? 'no';
}
