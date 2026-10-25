// =====================================================================
// Access-control matrix — SINGLE SOURCE OF TRUTH
// ---------------------------------------------------------------------
// This module encodes who can do what, where. It is authored from the
// society's role-permissions matrix (roles x subsections) and it is the
// SAME data that (a) enforces access across the workspace and (b) renders
// the "Role access permissions" table in Settings, so the two can never
// drift apart again.
//
//   Levels:   none  <  view  <  edit  <  manage
//     none   — Hidden: the subsection never appears for the role.
//     view   — "Interact only": open + read + light actions (register,
//              preview, download), but no create / edit / delete.
//     manage — "Full interact": everything, incl. create / edit / delete.
//   (`edit` exists for completeness but the matrix only uses none/view/manage.)
//
// Nuances that don't fit a single level are expressed as SPECIAL_RULES and
// as division scoping (see below), mirroring the "Special permissions"
// sheet of the source workbook.
// =====================================================================

import type { AppRole } from '@/lib/roles';
import { normalizeRole } from '@/lib/roles';

export type AccessLevel = 'none' | 'view' | 'edit' | 'manage';

const LEVEL_ORDER: Record<AccessLevel, number> = { none: 0, view: 1, edit: 2, manage: 3 };

export function atLeast(level: AccessLevel, required: AccessLevel): boolean {
  return LEVEL_ORDER[level] >= LEVEL_ORDER[required];
}

function maxLevel(a: AccessLevel, b: AccessLevel): AccessLevel {
  return LEVEL_ORDER[a] >= LEVEL_ORDER[b] ? a : b;
}

// Resource keys mirror the workspace navigation keys in MinervaWorkspace.
export type ResourceKey = string;

// Baseline pages every authorised (non-candidate) user can at least view.
export const BASELINE_RESOURCES: ResourceKey[] = ['my-role', 'welcome', 'dashboard', 'calendar'];

// Candidates may ONLY ever reach these. Enforced here, in the workspace
// route guard, and again in the database via RLS (defence in depth).
// A candidate's profile is READ-ONLY: personal data is captured by the
// application form and cannot be changed afterwards.
export const CANDIDATE_RESOURCES: Record<ResourceKey, AccessLevel> = {
  'my-role': 'view',
  'applications-status': 'view',
  // The applicant's two conditional pages. WHETHER THEY ARE OFFERED is
  // decided by `candidateNav` from the application row (invited to
  // interview / offer sent); whether they may be OPENED at all is decided
  // here. The two are deliberately different questions: a page that has
  // nothing on it yet says so, which is true, rather than refusing the
  // applicant access to their own application, which would not be.
  'applications-interview': 'view',
  // Step 97: the phone call, offered by `candidateNav` once they are invited.
  'applications-call': 'view',
  'applications-offer': 'view',
  // The address the Interview page used to have. Kept so an old link or
  // bookmark still resolves; the workspace redirects it to the new one.
  'applications-interview-calendar': 'view',
  // The admissions FAQ, inside the workspace. Candidate-only by construction:
  // it appears in no other role's grants and in no other navigation, so
  // `canView('applications-faqs')` is false for every member role.
  'applications-faqs': 'view',
};

type RoleGrants = Record<ResourceKey, AccessLevel>;

// '*' grants a level to every resource (used by full-access roles).
const FULL: RoleGrants = { '*': 'manage' };

// Per-role grants by normalised role. Anything not listed = none (Hidden).
// admin/president are association-wide full access; every other role is
// granted explicitly from the matrix. Members, pending and candidates have
// no general grants (candidates are governed by CANDIDATE_RESOURCES).
export const DEFAULT_MATRIX: Partial<Record<AppRole, RoleGrants>> = {
  admin: FULL,
  president: FULL,
  vice_president: { 'my-role': 'manage', 'dashboard': 'view', 'welcome': 'view', 'calendar': 'manage', 'reports-upload': 'manage', 'reports-archive': 'manage', 'reports-templates': 'manage', 'reports-funds': 'manage', 'reports-divisions': 'manage', 'applications-website': 'manage', 'applications-screening': 'manage', 'applications-interview-calendar': 'manage', 'applications-calls': 'manage', 'applications-joiners': 'view', 'applications-form': 'manage', 'events-create': 'manage', 'events-forms': 'manage', 'events-attendance': 'manage', 'events-archive': 'manage', 'events-alumni-calls': 'manage', 'events-on-display': 'manage', 'events-mine': 'view', 'people-members': 'manage', 'people-invites': 'manage', 'people-alumni': 'view', 'people-rosters': 'manage', 'smm-editorial': 'manage', 'smm-ig': 'manage', 'smm-li': 'manage', 'smm-graphics': 'manage', 'smm-other': 'manage', 'smm-brand': 'manage', 'smm-ads': 'manage', 'ops-fee': 'manage', 'ops-treasury': 'manage', 'ops-external': 'manage', 'ops-docs': 'manage', 'website-pages': 'view', 'website-readings': 'manage', 'website-testimonials': 'manage', 'website-history': 'manage', 'website-faqs': 'manage', 'ops-newsletter': 'view', 'ops-auto-emails': 'view', 'settings-users': 'view', 'settings-roles': 'view', 'settings-mobile': 'view', 'settings-activity': 'view', 'settings-certificates': 'manage', 'settings-declarations': 'manage', 'career-cv': 'manage', 'career-cl': 'manage', 'career-linkedin': 'manage', 'career-gpa': 'view', 'career-brainteasers': 'manage', 'career-smart': 'view', 'career-gmat': 'view', 'career-ib': 'view', 'ops-forms': 'manage' },
  head_of_asset_management: { 'my-role': 'manage', 'dashboard': 'view', 'welcome': 'view', 'calendar': 'view', 'reports-upload': 'manage', 'reports-archive': 'manage', 'reports-templates': 'manage', 'reports-funds': 'manage', 'reports-divisions': 'manage', 'applications-screening': 'manage', 'applications-interview-calendar': 'manage', 'applications-joiners': 'view', 'applications-form': 'manage', 'events-attendance': 'view', 'events-archive': 'view', 'events-alumni-calls': 'manage', 'events-on-display': 'view', 'events-mine': 'view', 'people-members': 'view', 'people-alumni': 'view', 'people-rosters': 'view', 'smm-editorial': 'view', 'smm-ig': 'view', 'smm-li': 'view', 'smm-graphics': 'view', 'smm-other': 'view', 'smm-brand': 'view', 'smm-ads': 'view', 'ops-treasury': 'view', 'ops-external': 'view', 'ops-docs': 'view', 'website-readings': 'manage', 'career-cv': 'view', 'career-cl': 'view', 'career-linkedin': 'view', 'career-gpa': 'view', 'career-brainteasers': 'view', 'career-smart': 'view', 'career-gmat': 'view', 'career-ib': 'view' },
  head_of_division: { 'my-role': 'manage', 'dashboard': 'view', 'welcome': 'view', 'calendar': 'view', 'reports-upload': 'manage', 'reports-archive': 'manage', 'reports-templates': 'manage', 'reports-funds': 'manage', 'reports-divisions': 'manage', 'applications-screening': 'manage', 'applications-interview-calendar': 'manage', 'applications-joiners': 'view', 'applications-form': 'manage', 'events-attendance': 'view', 'events-archive': 'view', 'events-alumni-calls': 'manage', 'events-on-display': 'view', 'events-mine': 'view', 'people-members': 'view', 'people-alumni': 'view', 'people-rosters': 'view', 'ops-treasury': 'view', 'ops-external': 'view', 'ops-docs': 'view', 'website-readings': 'manage', 'career-cv': 'view', 'career-cl': 'view', 'career-linkedin': 'view', 'career-gpa': 'view', 'career-brainteasers': 'view', 'career-smart': 'view', 'career-gmat': 'view', 'career-ib': 'view' },
  portfolio_manager: { 'my-role': 'manage', 'dashboard': 'view', 'welcome': 'view', 'calendar': 'view', 'reports-archive': 'view', 'reports-templates': 'manage', 'reports-funds': 'manage', 'applications-screening': 'view', 'applications-interview-calendar': 'view', 'applications-joiners': 'view', 'events-archive': 'view', 'events-on-display': 'view', 'events-mine': 'view', 'people-members': 'view', 'people-alumni': 'view', 'people-rosters': 'view', 'website-readings': 'manage', 'career-cv': 'view', 'career-cl': 'view', 'career-linkedin': 'view', 'career-gpa': 'view', 'career-brainteasers': 'view', 'career-smart': 'view', 'career-gmat': 'view', 'career-ib': 'view' },
  team_leader: { 'my-role': 'manage', 'dashboard': 'view', 'welcome': 'view', 'calendar': 'view', 'reports-archive': 'view', 'reports-templates': 'manage', 'applications-screening': 'view', 'applications-interview-calendar': 'view', 'applications-joiners': 'view', 'events-archive': 'view', 'events-on-display': 'view', 'events-mine': 'view', 'people-members': 'view', 'people-alumni': 'view', 'people-rosters': 'view', 'website-readings': 'manage', 'career-cv': 'view', 'career-cl': 'view', 'career-linkedin': 'view', 'career-gpa': 'view', 'career-brainteasers': 'view', 'career-smart': 'view', 'career-gmat': 'view', 'career-ib': 'view' },
  senior_analyst: { 'my-role': 'manage', 'dashboard': 'view', 'welcome': 'view', 'calendar': 'view', 'reports-archive': 'view', 'reports-templates': 'manage', 'events-on-display': 'view', 'events-mine': 'view', 'people-members': 'view', 'people-alumni': 'view', 'people-rosters': 'view', 'website-readings': 'view', 'career-cv': 'view', 'career-cl': 'view', 'career-linkedin': 'view', 'career-gpa': 'view', 'career-brainteasers': 'view', 'career-smart': 'view', 'career-gmat': 'view', 'career-ib': 'view' },
  analyst: { 'my-role': 'manage', 'dashboard': 'view', 'welcome': 'view', 'calendar': 'view', 'reports-archive': 'view', 'reports-templates': 'view', 'events-on-display': 'view', 'events-mine': 'view', 'people-members': 'view', 'people-alumni': 'view', 'people-rosters': 'view', 'website-readings': 'view', 'career-cv': 'view', 'career-cl': 'view', 'career-linkedin': 'view', 'career-gpa': 'view', 'career-brainteasers': 'view', 'career-smart': 'view', 'career-gmat': 'view', 'career-ib': 'view' },
  // The Head of Media manages External relations and Statute & documents.
  // Those two subsections hold the partnership contacts and the signed
  // agreements the media output is built on: an announcement of a
  // partnership cannot be drafted from a summary of it. The Media Analyst
  // is deliberately NOT granted either - the analyst produces the posts,
  // the Head holds the counterpart relationships and the paperwork.
  // THE HEAD OF MEDIA & COMMUNICATION AND THE HEAD OF OPERATIONS RECRUIT.
  // Their two divisions take candidates as one intake ("Media &
  // Communication and Operations"), and running that intake - screening
  // it, opening its interview slots, inviting and interviewing its
  // candidates - is theirs exactly as a Head of Division runs theirs. The
  // grants below are the Head of Division's recruiting grants, word for
  // word; the calendar and the endpoint scope both of them to the joint
  // intake. Offers stay read-only, as for every Head: sending one is the
  // President's. Mirrored in supabase/functions/_shared/access.ts.
  head_of_media: { 'my-role': 'manage', 'dashboard': 'view', 'welcome': 'view', 'applications-screening': 'manage', 'applications-interview-calendar': 'manage', 'applications-joiners': 'view', 'calendar': 'view', 'events-attendance': 'manage', 'events-archive': 'manage', 'events-alumni-calls': 'view', 'events-on-display': 'view', 'events-mine': 'view', 'smm-editorial': 'manage', 'smm-ig': 'manage', 'smm-li': 'manage', 'smm-graphics': 'manage', 'smm-other': 'manage', 'smm-brand': 'manage', 'smm-ads': 'manage', 'ops-external': 'manage', 'ops-docs': 'manage', 'people-members': 'view', 'people-alumni': 'view', 'people-rosters': 'view', 'career-cv': 'view', 'career-cl': 'view', 'career-linkedin': 'view', 'career-gpa': 'view', 'career-brainteasers': 'view', 'career-smart': 'view', 'career-gmat': 'view', 'career-ib': 'view' },
  media_analyst: { 'my-role': 'manage', 'dashboard': 'view', 'welcome': 'view', 'calendar': 'view', 'events-on-display': 'view', 'events-mine': 'view', 'events-attendance': 'manage', 'smm-editorial': 'manage', 'smm-ig': 'manage', 'smm-li': 'manage', 'smm-graphics': 'manage', 'smm-other': 'manage', 'smm-brand': 'view', 'smm-ads': 'view', 'people-members': 'view', 'people-alumni': 'view', 'people-rosters': 'view', 'career-cv': 'view', 'career-cl': 'view', 'career-linkedin': 'view', 'career-gpa': 'view', 'career-brainteasers': 'view', 'career-smart': 'view', 'career-gmat': 'view', 'career-ib': 'view' },
  // Exactly the Media & Communication Analyst's access, plus the whole of
  // Operations > Forms, which the Operations Analyst runs.
  operations_analyst: { 'my-role': 'manage', 'dashboard': 'view', 'welcome': 'view', 'calendar': 'view', 'events-on-display': 'view', 'events-mine': 'view', 'events-attendance': 'manage', 'smm-editorial': 'manage', 'smm-ig': 'manage', 'smm-li': 'manage', 'smm-graphics': 'manage', 'smm-other': 'manage', 'smm-brand': 'view', 'smm-ads': 'view', 'people-members': 'view', 'people-alumni': 'view', 'people-rosters': 'view', 'career-cv': 'view', 'career-cl': 'view', 'career-linkedin': 'view', 'career-gpa': 'view', 'career-brainteasers': 'view', 'career-smart': 'view', 'career-gmat': 'view', 'career-ib': 'view', 'ops-forms': 'manage' },
  head_of_operations: { 'my-role': 'manage', 'dashboard': 'view', 'welcome': 'view', 'applications-screening': 'manage', 'applications-interview-calendar': 'manage', 'applications-joiners': 'view', 'calendar': 'manage', 'events-create': 'manage', 'events-forms': 'manage', 'events-attendance': 'manage', 'events-archive': 'manage', 'events-alumni-calls': 'manage', 'events-on-display': 'manage', 'events-mine': 'view', 'people-members': 'manage', 'people-alumni': 'view', 'people-rosters': 'view', 'smm-editorial': 'view', 'smm-brand': 'view', 'smm-ads': 'view', 'ops-fee': 'manage', 'ops-treasury': 'manage', 'ops-external': 'manage', 'ops-docs': 'manage', 'website-pages': 'view', 'website-readings': 'view', 'website-testimonials': 'manage', 'website-history': 'manage', 'website-faqs': 'manage', 'ops-newsletter': 'view', 'ops-auto-emails': 'view', 'career-cv': 'manage', 'career-cl': 'manage', 'career-linkedin': 'manage', 'career-gpa': 'view', 'career-brainteasers': 'manage', 'career-smart': 'view', 'career-gmat': 'view', 'career-ib': 'view', 'ops-forms': 'manage' },
  // =================================================================
  // THE ADVISOR SEES EVERYTHING AND CHANGES NOTHING.
  // -----------------------------------------------------------------
  // An advisor is an alumnus appointed to advise the association, and
  // advice given without sight of the work is not worth much: they were
  // limited to the dashboard, the calendar and the two people registers,
  // which left them unable to read the research, the events or the
  // operations they are there to comment on.
  //
  // So the grant is `'*': 'view'` - every section and every subsection,
  // read-only - with two deliberate exceptions:
  //
  //   * SETTINGS IS CLOSED ENTIRELY (see ROLE_DENY below). Users, role
  //     permissions, mobile view and the activity log are the machinery
  //     that decides who may do what; an outside adviser has no business
  //     reading the association's access control or its audit trail.
  //
  //   * MY PROFILE IS THEIRS TO EDIT, because it is their own record.
  //
  // `'*'` also means an advisor sees a NEW subsection the day it is
  // added, without anybody remembering to widen this line.
  // =================================================================
  advisor: { '*': 'view', 'my-role': 'manage' },
  alumni: { 'my-role': 'manage', 'dashboard': 'view', 'welcome': 'view', 'calendar': 'view', 'career-cv': 'view', 'career-cl': 'view', 'career-linkedin': 'view', 'career-gpa': 'view', 'career-brainteasers': 'view', 'career-smart': 'view', 'career-gmat': 'view', 'career-ib': 'view' },
  // member / pending / candidate intentionally have no general grants.
};

// =====================================================================
// SPECIAL rules — nuances that a single level cannot express.
// These parallel the "Special permissions" sheet of the source workbook.
// Components consult them; the Settings table lists them under the grid.
// =====================================================================
export type SpecialRule =
  // Offers: open the page READ-ONLY to understand the offer flow; every
  // action is disabled and the page explains why.
  | 'offers_readonly'
  // Candidate screening: sees candidates from EVERY division, regardless of
  // the applicant's division preference.
  | 'candidates_all_divisions'
  // Candidate screening: may view candidates and add notes, but may NOT
  // change a candidate's status.
  | 'candidates_notes_only'
  // Treasury: the register is READABLE in full, but no entry can be added.
  // The two research Heads consult the association's position; recording a
  // movement belongs to the Board and to Operations.
  | 'treasury_readonly'
  // Attendance: the list can be changed until the end of the event's
  // semester; after that only the President and the Vice President can
  // correct it (supabase/functions/_shared/attendance-window.ts).
  | 'attendance_semester_close'
  // My Profile: a former member among the alumni can download a certificate
  // of the last semester they served (membership-certificate).
  | 'alumni_certificate'
  // Alumni calls are events (Step 91): those who plan them without full
  // Create Event create and change alumni calls only.
  | 'alumni_calls_only'
  // Company visits (Step 93B): the President and the Vice President select
  // the participants in Attendance; the others with Attendance see only
  // that the visit selects, and the people invited.
  | 'company_visit_selection'
  | 'company_visit_summary'
  // Rosters (Step 94): members from Analyst up read their own division's
  // rosters, every semester, and nothing else.
  | 'rosters_own_division'
  // Rosters: the internal person code is shown only to the roles that
  // manage people.
  | 'rosters_person_codes'
  // Step 97: the semester commitment of each member, in People > Members,
  // for the Board (the President and the admin account hold it by full access).
  | 'commitment_status';

export interface SpecialEntry {
  rule: SpecialRule;
  resource: ResourceKey;
  roles: AppRole[];
  /** Short human explanation, shown in the table and to affected users. */
  label: string;
}

export const SPECIAL_RULES: SpecialEntry[] = [
  {
    rule: 'offers_readonly',
    resource: 'applications-joiners',
    roles: ['vice_president', 'head_of_asset_management', 'head_of_division', 'head_of_media', 'head_of_operations', 'portfolio_manager', 'team_leader'],
    label: 'View-only: can open Offers to understand the process, but cannot perform any action. Sending, resending and editing an offer is reserved for the President and the Admin, on the server as well as in the interface.',
  },
  {
    rule: 'candidates_all_divisions',
    resource: 'applications-screening',
    roles: ['head_of_asset_management', 'head_of_division', 'head_of_media', 'head_of_operations'],
    label: "Sees candidates from every division, regardless of the applicant's division preference.",
  },
  {
    rule: 'candidates_notes_only',
    resource: 'applications-screening',
    roles: ['portfolio_manager', 'team_leader'],
    label: 'May view candidates and add notes, but cannot change a candidate\'s status.',
  },
  {
    rule: 'treasury_readonly',
    resource: 'ops-treasury',
    roles: ['head_of_asset_management', 'head_of_division'],
    label: 'Reads the whole cash-flow register, including the balance and every semester, but cannot record an entry or export the register. Membership Fees is a separate subsection and is not open to these roles.',
  },
  {
    rule: 'attendance_semester_close',
    resource: 'events-attendance',
    roles: ['head_of_operations', 'operations_analyst', 'head_of_media', 'media_analyst'],
    label: "Can change an event's list until the end of its semester, and never less than two weeks after the event. After that the list is read-only; only the President and the Vice President can still correct it, and each correction is recorded in Activity tracking.",
  },
  {
    rule: 'alumni_certificate',
    resource: 'my-role',
    roles: ['alumni'],
    label: 'Can download a certificate of membership for the last semester they served as a member. It reads "was a member" and stays valid while they are listed among the alumni.',
  },
  {
    rule: 'alumni_calls_only',
    resource: 'events-create',
    roles: ['head_of_asset_management', 'head_of_division'],
    label: 'Create Event opens on alumni calls only: they create alumni calls there and change or delete them in Event Archive, where every other event stays read-only. An alumni call is an event like any other, with no separate page.',
  },
  {
    rule: 'company_visit_selection',
    resource: 'events-attendance',
    roles: ['president', 'vice_president'],
    label: 'Selects the participants of a company visit in Attendance (with the admin account): reads who asked to take part, with their participation record and CV, drafts and sends the decisions, records withdrawals, offers a freed place to a reserve, and downloads the invited CVs for a host that asks for them. The server refuses all of this to every other role.',
  },
  {
    rule: 'company_visit_summary',
    resource: 'events-attendance',
    roles: ['head_of_operations', 'operations_analyst', 'head_of_media', 'media_analyst'],
    label: 'For a company visit, sees that the visit selects its participants and, on the door list, the people invited; not who else asked to take part, their CVs or the decisions.',
  },
  {
    rule: 'rosters_own_division',
    resource: 'people-rosters',
    roles: ['portfolio_manager', 'team_leader', 'senior_analyst', 'analyst', 'media_analyst'],
    label: "Reads the rosters of their own division only, for every semester; the Board and the other divisions are not shown. Enforced by the database.",
  },
  {
    rule: 'rosters_person_codes',
    resource: 'people-rosters',
    roles: ['vice_president', 'head_of_operations'],
    label: "Sees each person's internal code (with the President and the association account). The code is never exported, printed or published. Only the President and the Vice-President can correct a past semester.",
  },
  {
    rule: 'commitment_status',
    resource: 'people-members',
    roles: ['vice_president', 'head_of_asset_management', 'head_of_division', 'head_of_media', 'head_of_operations'],
    label: "Sees each member's semester commitment (Confirmed, Pending, Declined), filters and exports it, and reads the completion by division above the register. Every other member sees only their own, in My Profile.",
  },
];

/** Active special rules for a set of (raw) roles on a resource. */
export function specialRulesFor(roles: AppRole[], resource: ResourceKey): SpecialRule[] {
  const norm = roles.map(normalizeRole);
  return SPECIAL_RULES.filter((s) => s.resource === resource && s.roles.some((r) => norm.includes(r))).map((s) => s.rule);
}

// =====================================================================
// Division scoping — research areas whose DATA is limited to the viewer's
// own division. The section-level matrix decides whether a role can open
// these; this list decides whose data they see inside.
//   - analyst / senior_analyst / team_leader / portfolio_manager: own division, locked.
//   - head_of_division: own division by default, may switch to view others.
//   - head_of_asset_management + full access: all divisions.
// =====================================================================
export const DIVISION_SCOPED_RESOURCES: ResourceKey[] = [
  'reports-upload', 'reports-archive', 'reports-funds', 'reports-templates',
];

// Roles allowed to look beyond their own division on the scoped areas.
export const CROSS_DIVISION_VIEW_ROLES: AppRole[] = ['head_of_division', 'head_of_asset_management'];

// People > Members: these roles open the register in view-only mode limited
// to the people of their OWN division (name lists, search and filters only).
// Managing roles, heads and advisors see the whole register. The database
// enforces the same limit through row-level security.
export const MEMBERS_DIVISION_VIEW_ROLES: AppRole[] = [
  'portfolio_manager', 'team_leader', 'senior_analyst', 'analyst',
];

/**
 * Resolve the effective access level for a set of (normalised) roles on a
 * given resource. Candidate isolation is handled by the caller (useAccess)
 * before this is consulted.
 */
// =====================================================================
// Carve-outs from a wildcard grant.
// ---------------------------------------------------------------------
// A role granted `'*'` needs a way to say "everything EXCEPT". Listing
// the forty-odd subsections an advisor may see, in order to omit four,
// would be a list that silently goes stale the next time a subsection is
// added: the whole point of the wildcard is that it does not.
//
// A denial is scoped to the ROLE that carries it, not to the person. If
// somebody holds two roles and the other one grants the resource, they
// keep it: the deny removes what this role would have given, and nothing
// more. That is what stops an advisor appointment quietly stripping
// access from a president who is also listed as one.
// =====================================================================
const ROLE_DENY: Partial<Record<AppRole, ResourceKey[]>> = {
  // Forms holds members' and guests' answers, files and payments: it is run by
  // the President, the Vice President and Operations, and an advisor's
  // read-everything grant does not reach it.
  advisor: ['settings-users', 'settings-roles', 'settings-mobile', 'settings-activity', 'settings-certificates', 'ops-forms'],
};

/** Is this resource explicitly withheld from this role? */
export function isDeniedForRole(role: AppRole, resource: ResourceKey): boolean {
  return ROLE_DENY[normalizeRole(role)]?.includes(resource) ?? false;
}

// =====================================================================
// Pages made of other subsections.
// ---------------------------------------------------------------------
// Social Templates is one page with three tabs, Instagram, LinkedIn and
// Other Resources, and each tab keeps its own row in the matrix: those rows
// are what the Role permissions table shows and what the server enforces.
// The page itself opens for anybody who may open at least one of them, at
// the highest level they hold on any, and each tab then applies its own.
// It grants nothing a role did not already have. CV & Cover Letter, in
// Career, is built the same way from its two tabs.
// =====================================================================
export const COMBINED_RESOURCES: Record<ResourceKey, ResourceKey[]> = {
  'smm-social': ['smm-ig', 'smm-li', 'smm-other'],
  'career-templates': ['career-cv', 'career-cl'],
};

// =====================================================================
// Pages that share another page's permission (Step 97B).
// ---------------------------------------------------------------------
// My Profile is three pages now: Personal Information keeps the key
// `my-role`, and Membership and Commitment are the same record, the
// member's own, so they open for exactly the roles that open My Profile,
// at the same level. They grant nothing `my-role` does not. Applicants
// are not covered: their access comes from CANDIDATE_RESOURCES alone, and
// their profile stays one page.
// =====================================================================
export const SHARED_RESOURCES: Record<ResourceKey, ResourceKey> = {
  'my-membership': 'my-role',
  'my-commitment': 'my-role',
};

export function resolveLevel(roles: AppRole[], resource: ResourceKey): AccessLevel {
  const shared = SHARED_RESOURCES[resource];
  if (shared) return resolveLevel(roles, shared);
  const parts = COMBINED_RESOURCES[resource];
  if (parts) return parts.reduce<AccessLevel>((lvl, part) => maxLevel(lvl, resolveLevel(roles, part)), 'none');
  let level: AccessLevel = 'none';
  for (const raw of roles) {
    const role = normalizeRole(raw);
    const grants = DEFAULT_MATRIX[role];
    if (!grants) continue;
    // This role contributes nothing at all on a resource it is denied,
    // wildcard included. Another role the same person holds still can.
    if (isDeniedForRole(role, resource)) continue;
    if (grants['*']) level = maxLevel(level, grants['*']);
    if (grants[resource]) level = maxLevel(level, grants[resource]);
  }
  // Baseline view for any role that has at least one grant somewhere.
  if (level === 'none' && BASELINE_RESOURCES.includes(resource)) {
    const hasAnyGrant = roles.some((r) => {
      const g = DEFAULT_MATRIX[normalizeRole(r)];
      return g && Object.keys(g).length > 0;
    });
    if (hasAnyGrant) return 'view';
  }
  return level;
}
