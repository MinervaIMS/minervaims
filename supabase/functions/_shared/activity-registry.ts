// =====================================================================
// activity-registry.ts: WHAT THE AUDIT TRAIL RECORDS, in one list.
// ---------------------------------------------------------------------
// Read by `activity.ts` (the wrapper every edge function goes through) and
// by `scripts/check-activity-coverage.mjs`, the test that fails when a
// write path is not recorded. Plain data and two small functions, with no
// imports, so that both Deno and Node can load it.
//
// THE RULE, since Step 90: every create, update and delete in the
// workspace, by anybody, and every sensitive read (exports, candidates'
// documents, Forms answers' files, certificates, the greenbook), produces
// exactly ONE entry: who, with which role, what, on which item, when, and
// where (section and subsection, in the workspace's own words).
//
//   * Edge functions are recorded by the wrapper in activity.ts. Every
//     action a function accepts must be listed here, as a write (MUTATES,
//     with the verb the log prints) or as a read (READS). The coverage
//     test reads each function's source and fails on an action that is in
//     neither, so a new action cannot slip through unrecorded.
//   * The few tables the workspace writes to directly, without a function,
//     are recorded by a database trigger (CLIENT_WRITE_TABLES; migration
//     20261022100200_activity_everyone.sql). The test fails on a direct
//     write to a table that is not listed.
//   * Exports made in the browser are recorded by the download helpers
//     (src/lib/export-log.ts); BROWSER_DOWNLOADS lists every place that
//     saves a file and how it is recorded.
//   * Functions that are not the workspace (sign-in, public pages, email
//     machinery) are listed in NOT_WORKSPACE, with the reason.
// =====================================================================

export interface Place { section: string; subsection: string }

/** Where each function's writes belong, in the workspace's own words. */
export const PLACE: Record<string, Place> = {
  'admin-alumni': { section: 'People', subsection: 'Alumni' },
  'admin-aod': { section: 'Events', subsection: 'Association On Display' },
  'admin-applications': { section: 'Recruiting', subsection: 'Candidates Screening' },
  'admin-auto-emails': { section: 'Operations', subsection: 'Automatic Emails' },
  'admin-calendar': { section: 'General', subsection: 'Calendar' },
  'admin-event-reg': { section: 'Events', subsection: 'Attendance' },
  'admin-event-reminders': { section: 'Events', subsection: 'Registration Forms' },
  'admin-events': { section: 'Events', subsection: 'Event Archive' },
  'admin-fees': { section: 'Operations', subsection: 'Membership Fees' },
  'admin-files': { section: 'Reports', subsection: 'Report Archive' },
  'admin-funds': { section: 'Reports', subsection: 'Fund Performances' },
  'admin-history': { section: 'Website', subsection: 'History' },
  'admin-interviews': { section: 'Recruiting', subsection: 'Interview Calendar' },
  'admin-invites': { section: 'People', subsection: 'Invites' },
  'admin-join-faqs': { section: 'Website', subsection: 'FAQs' },
  'admin-members': { section: 'People', subsection: 'Members' },
  'admin-readings': { section: 'Website', subsection: 'Readings' },
  'admin-resources': { section: 'Workspace', subsection: 'Resources' },
  'admin-settings': { section: 'Recruiting', subsection: 'Application Page' },
  'admin-smm': { section: 'Media & Communication', subsection: 'Editorial Calendar' },
  'admin-team': { section: 'People', subsection: 'Members' },
  'admin-testimonials': { section: 'Website', subsection: 'Testimonials' },
  'admin-treasury': { section: 'Operations', subsection: 'Treasury' },
  'admin-users': { section: 'Settings', subsection: 'Users' },
  'applicant-notify': { section: 'Recruiting', subsection: 'My application' },
  'brand-kit': { section: 'Media & Communication', subsection: 'Design System' },
  'career-brainteasers': { section: 'Career', subsection: 'Brainteasers' },
  'career-files': { section: 'Career', subsection: 'CV & Cover Letter' },
  'internal-forms': { section: 'Operations', subsection: 'Forms' },
  'member-profile': { section: 'General', subsection: 'My Profile' },
  'membership-certificate': { section: 'General', subsection: 'My Profile' },
  'register-event': { section: 'Events', subsection: 'My Events' },
  'submit-application': { section: 'Recruiting', subsection: 'Application form' },
};

/** Where one action belongs, when it is not where its function's other writes are. */
export const PLACE_BY_ACTION: Record<string, Place> = {
  'admin-applications:send-offer': { section: 'Recruiting', subsection: 'Offers' },
  'admin-applications:withdraw-offer': { section: 'Recruiting', subsection: 'Offers' },
  'admin-applications:convert-to-member': { section: 'Recruiting', subsection: 'Offers' },
  'admin-applications:set-question': { section: 'Recruiting', subsection: 'Form & Questions' },
  'admin-interviews:book': { section: 'Recruiting', subsection: 'My application' },
  'admin-interviews:cancel': { section: 'Recruiting', subsection: 'My application' },
  'admin-settings:update': { section: 'Recruiting', subsection: 'Application Page' },
  'membership-certificate:withdraw': { section: 'Settings', subsection: 'Certificates' },
  'membership-certificate:restore': { section: 'Settings', subsection: 'Certificates' },
  'internal-forms:submit': { section: 'Operations', subsection: 'Forms (answering)' },
  'internal-forms:upload': { section: 'Operations', subsection: 'Forms (answering)' },
  'career-files:upload': { section: 'Career', subsection: 'CV & Cover Letter' },
  'admin-members:upload-photo': { section: 'People', subsection: 'Members' },
  'admin-files:division-page-save': { section: 'Reports', subsection: 'Division Pages' },
};

/**
 * Actions that CHANGE something (or are a sensitive read), and the verb the
 * log prints for them. The key is `fn:action`, or a bare `action` shared by
 * every function that uses that name.
 */
export const MUTATES: Record<string, string> = {
  // Shared verbs, used the same way by many functions.
  save: 'update', create: 'create', add: 'create', insert: 'create',
  update: 'update', edit: 'update', upsert: 'update', reorder: 'reorder',
  delete: 'delete', remove: 'delete',
  publish: 'update', unpublish: 'update', 'set-published': 'update',
  'set-open': 'update', 'set-visible': 'update', 'set-role': 'update',
  open: 'open', close: 'close',
  upload: 'upload', signup: 'registration', register: 'registration',
  'remove-signup': 'delete',
  approve: 'approval', reject: 'rejection',
  'upload-photo': 'upload',
  // Recruiting.
  'admin-applications:update-status': 'status_change',
  'admin-applications:set-evaluation-division': 'status_change',
  'admin-applications:set-priority': 'update',
  'admin-applications:set-question': 'update',
  'admin-applications:add-note': 'create',
  'admin-applications:send-offer': 'approval',
  'admin-applications:withdraw-offer': 'status_change',
  'admin-applications:convert-to-member': 'status_change',
  // Opening a candidate's CV or written answer: a sensitive read.
  'admin-applications:sign-url': 'download',
  'admin-applications:bulk-urls': 'download',
  'admin-interviews:create-slot': 'create',
  'admin-interviews:bulk-create': 'create',
  'admin-interviews:update-slot': 'update',
  'admin-interviews:delete-slot': 'delete',
  'admin-interviews:clear-division': 'delete',
  'admin-interviews:book': 'registration',
  'admin-interviews:cancel': 'delete',
  'applicant-notify:accept-offer': 'approval',
  'applicant-notify:decline-offer': 'rejection',
  'applicant-notify:withdraw-application': 'status_change',
  'submit-application:submit': 'create',
  // Operations.
  'admin-fees:set-paid': 'update',
  'admin-auto-emails:save-template': 'update',
  'admin-auto-emails:create-template': 'create',
  'internal-forms:duplicate': 'create',
  'internal-forms:set-status': 'status_change',
  'internal-forms:set-paid': 'update',
  'internal-forms:set-note': 'update',
  'internal-forms:delete-response': 'delete',
  'internal-forms:submit': 'registration',
  'internal-forms:test-receipt': 'send',
  // Opening the files people attached to their answers: a sensitive read.
  'internal-forms:sign': 'download',
  // Media & Communication.
  'admin-smm:editorial-save': 'update',
  'admin-smm:editorial-delete': 'delete',
  'admin-smm:ads-save': 'update',
  'admin-smm:ads-delete': 'delete',
  'brand-kit:download': 'download',
  'brand-kit:upload-url': 'upload',
  // Events.
  'admin-aod:create-day': 'create',
  'admin-aod:delete-day': 'delete',
  'admin-event-reg:mark-attended': 'update',
  'admin-event-reg:add-external': 'create',
  'admin-event-reg:add-member': 'create',
  'admin-event-reg:link-member': 'update',
  // The door scanner ticks somebody as present.
  'admin-event-reg:checkin': 'update',
  // An online event's attendance, recorded from the meeting's report.
  'admin-event-reg:import-attendance': 'update',
  'admin-event-reminders:set-paused': 'update',
  'admin-event-reminders:send-test': 'send',
  'register-event:register': 'registration',
  'register-event:cancel': 'delete',
  // People.
  'admin-members:move-to-alumni': 'status_change',
  'admin-invites:send': 'send',
  'admin-invites:resend': 'send',
  'admin-invites:revoke': 'delete',
  // Reports.
  'admin-files:set-status': 'status_change',
  'admin-files:favourite': 'update',
  'admin-files:restore': 'update',
  'admin-files:purge': 'delete',
  'admin-files:purge-expired': 'delete',
  'admin-files:bulk-update': 'update',
  // Writing the report page's details into the stored PDFs (Step 93).
  'admin-files:pdf-metadata-apply': 'update',
  'admin-files:division-page-save': 'update',
  'admin-funds:profile-upsert': 'update',
  'admin-funds:reference-upsert': 'update',
  'admin-funds:reference-delete': 'delete',
  'admin-funds:import-estr': 'update',
  'admin-resources:favourite': 'update',
  // General.
  'member-profile:update': 'update',
  'member-profile:redeem': 'update',
  // Career.
  'career-files:rename': 'update',
  'career-files:download': 'download',
  'career-brainteasers:progress': 'update',
  'career-brainteasers:reveal': 'update',
  'career-brainteasers:reset': 'update',
  'career-brainteasers:greenbook-download': 'download',
  'career-brainteasers:greenbook-commit': 'upload',
  'career-brainteasers:greenbook-remove': 'delete',
  // Certificates: issuing is a read recorded on purpose (who took one,
  // and when); the register's withdraw and restore are changes.
  'membership-certificate:issue': 'download',
  'membership-certificate:withdraw': 'update',
  'membership-certificate:restore': 'update',
};

/**
 * Actions that only READ, and are therefore not recorded, per function.
 * Listing them is what lets the coverage test tell a read from a write
 * somebody forgot.
 */
export const READS: Record<string, string[]> = {
  'admin-alumni': [],
  'admin-aod': ['list'],
  'admin-applications': ['get', 'list'],
  'admin-auto-emails': ['list', 'sign'],
  'admin-calendar': ['list'],
  'admin-event-reg': ['list', 'members', 'door-status', 'member-attendance', 'my-events', 'import-preview'],
  'admin-event-reminders': ['status'],
  'admin-events': ['join-links'],
  'admin-fees': ['current', 'history'],
  'admin-files': ['pdf-metadata-check'],
  'admin-funds': ['list', 'reference-list'],
  'admin-history': ['list'],
  'admin-interviews': ['list', 'list-available', 'my-context'],
  'admin-invites': ['list'],
  'admin-join-faqs': ['list'],
  'admin-members': [],
  'admin-readings': [],
  'admin-resources': ['sign'],
  'admin-settings': ['get'],
  'admin-smm': ['editorial-list', 'ads-list'],
  'admin-team': [],
  'admin-testimonials': ['list'],
  'admin-treasury': ['list'],
  'admin-users': ['list'],
  // notify-received: the "application received" email the system sends once;
  // sign-own-doc: an applicant opening their OWN document.
  'applicant-notify': ['notify-received', 'sign-own-doc'],
  'brand-kit': ['status'],
  // greenbook-upload-url only prepares an upload; greenbook-commit records it.
  'career-brainteasers': ['list', 'greenbook-register', 'greenbook-upload-url'],
  'career-files': ['list'],
  // guest-get / guest-submit: a guest without an account (no workspace user).
  'internal-forms': ['list', 'get', 'fill-get', 'my-forms', 'guest-get', 'guest-submit'],
  'member-profile': ['get'],
  // verify: the public verification page; preview / register / status: reading.
  'membership-certificate': ['status', 'preview', 'register', 'verify'],
  'register-event': ['lookup'],
  'submit-application': [],
};

/** Edge functions that are not part of the workspace's audited surface. */
export const NOT_WORKSPACE: Record<string, string> = {
  'admin-auth': 'The legacy sign-in check: it signs nobody in to anything that changes data.',
  'auth-email-hook': 'Called by the authentication service to send sign-in emails.',
  'auth-link-status': 'Reports whether a sign-in link was already used; reads only.',
  'checkin-qr': 'Draws the QR code of a ticket; reads only.',
  'event-ics': 'The public "Add to calendar" file; reads only.',
  'key-numbers': 'The scheduled page counter and recomputation of the key numbers (Step 92); called by the database, no person involved.',
  'macro-monitor': 'The monthly refresh of the market figures from the ECB, Eurostat and BIS (Step 93B); called by the database, no person involved.',
  'handle-email-suppression': 'Called by the email provider for bounces and complaints, not by a person in the workspace.',
  'handle-email-unsubscribe': 'The public unsubscribe link in emails; no workspace account involved.',
  'preview-transactional-email': 'Renders an email preview; reads only.',
  'pricing-engine': 'The public Payoff Lab calculator; computes and stores nothing.',
  'process-email-queue': 'The scheduled sender of queued emails; no person involved.',
  'report-file': 'Serves published reports to the public; reads only.',
  'send-auth-email': 'Sends authentication emails for the authentication service.',
  'send-transactional-email': 'Queues emails on behalf of other functions, which record the action themselves.',
};

/**
 * Tables the workspace writes to directly (not through a function). Each
 * one has the audit trigger of migration 20261022100200, which records the
 * write with the signed-in person's identity and role. Writes made by the
 * functions (the service role) are not recorded twice: the trigger skips
 * them, and the function's wrapper records them.
 */
export const CLIENT_WRITE_TABLES: Record<string, Place & { label: string }> = {
  calendar_entries: { section: 'General', subsection: 'Calendar', label: 'calendar entry' },
  exam_sessions: { section: 'General', subsection: 'Calendar', label: 'exam session' },
  gpa_calculations: { section: 'Career', subsection: 'GPA Converter', label: 'GPA comparison' },
  newsletter_subscribers: { section: 'Website', subsection: 'Newsletter', label: 'newsletter subscriber' },
  onboarding_progress: { section: 'General', subsection: 'Dashboard', label: 'onboarding step' },
  page_visibility: { section: 'Website', subsection: 'Pages', label: 'page' },
  report_deadlines: { section: 'Reports', subsection: 'Deadlines', label: 'report deadline' },
  // Written by public.claim_member_account, which a pending user calls.
  members: { section: 'People', subsection: 'Members', label: 'member' },
};

/**
 * Database functions the workspace calls directly that WRITE, and the table
 * whose trigger records them.
 */
export const CLIENT_WRITE_RPCS: Record<string, string> = {
  claim_member_account: 'members',
  log_activity: '(writes the log itself)',
};

/** Database functions the workspace calls directly that only READ. */
export const CLIENT_READ_RPCS: string[] = [
  'event_places', 'my_event_registrations', 'my_onboarding_context', 'public_alumni_classes',
  'public_alumni_directory', 'public_alumni_filter_count', 'public_key_numbers', 'public_testimonial_companies', 'workspace_member_count',
];

/** Files the workspace uploads straight to storage, and what records them. */
export const CLIENT_STORAGE_UPLOADS: Record<string, string> = {
  'event-posters': 'An event poster is uploaded just before the event is saved; the save (admin-events, admin-aod) records it.',
};

/**
 * Every place in the interface that saves a file, and how it is recorded:
 *   export  the helper records it (src/lib/export-log.ts);
 *   server  the function that hands out the file records it;
 *   exempt  public or the person's own material, with the reason.
 */
export const BROWSER_DOWNLOADS: Record<string, string> = {
  'src/lib/download-utils.ts': 'export: downloadCSV and downloadFile record every CSV export',
  'src/components/admin/forms/ExportDialog.tsx': 'export: the answers sheet is recorded; the files zip is recorded by internal-forms:sign',
  'src/components/admin/CandidatesManagement.tsx': 'server: admin-applications:bulk-urls',
  'src/components/admin/recruiting/CandidateProfile.tsx': 'server: admin-applications:sign-url',
  'src/components/admin/CertificateRegister.tsx': 'exempt: previewing a certificate already in the register',
  'src/lib/certificate-api.ts': 'server: membership-certificate:issue',
  'src/components/admin/career/brainteasers/GreenbookView.tsx': 'server: career-brainteasers:greenbook-download',
  'src/components/admin/HowToUse.tsx': 'export: the manual download is recorded where it happens',
  'src/components/admin/MyProfile.tsx': 'exempt: the member saving their own photo',
  'src/components/admin/ResourceManager.tsx': 'exempt: workspace resources, not personal data',
  'src/components/admin/FileManagement.tsx': 'exempt: published reports, public on the website',
  'src/lib/file-download.ts': 'helper: callers are listed here one by one',
  'src/components/payofflab/ExportPanel.tsx': 'exempt: the public Payoff Lab',
  'src/components/admin/library/UploadDialog.tsx': 'exempt: a local preview of a file being uploaded',
  'src/lib/career-api.ts': 'exempt: reads an image size before upload',
  'src/lib/qr-decode.ts': 'exempt: reads a photo of a ticket in the browser',
};

/**
 * What a write is called in the log, or null when it is a read. A read
 * declared for a function wins over a shared verb of the same name (the
 * certificate register's `register` is reading the register, not
 * registering for anything).
 */
export function verbFor(fn: string, action: string): string | null {
  if ((READS[fn] || []).includes(action)) return null;
  return MUTATES[`${fn}:${action}`] ?? MUTATES[action] ?? null;
}

/** Where an action belongs in the workspace. */
export function placeFor(fn: string, action: string): Place {
  return PLACE_BY_ACTION[`${fn}:${action}`] ?? PLACE[fn] ?? { section: 'Workspace', subsection: fn };
}
