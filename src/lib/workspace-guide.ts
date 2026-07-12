// =====================================================================
// Workspace guide — ONE content source for two features:
//   1. "How to use" (Settings-quality role-based manual, downloadable)
//   2. Contextual help (the ? icons + right-hand help panel on each page)
// Each entry describes a subsection: what it is for, what "Interact only"
// users can do, what "Full interact" adds, and warnings/consequences.
// Content is filtered by the viewer's real access level, so nobody reads
// instructions for actions they cannot perform.
// =====================================================================

export interface GuideTopic {
  id: string;               // anchor id inside the help panel
  title: string;
  body: string;
  requires?: 'view' | 'manage';  // hide from users below this level
}

export interface GuideEntry {
  key: string;              // resource key (= nav key)
  section: string;          // nav section label
  label: string;            // subsection label
  purpose: string;          // what this page is for
  view: string[];           // what an "Interact only" user can do
  manage: string[];         // what "Full interact" adds
  warnings?: string[];      // consequences / cautions
  topics?: GuideTopic[];    // extra help anchors for specific controls
}

export const GUIDE: GuideEntry[] = [
  {
    key: 'my-role', section: 'General', label: 'My profile',
    purpose: 'Your personal card: name, contacts, role, division and photo. This is what colleagues see about you.',
    view: ['Read your profile and check which role and division you hold.'],
    manage: ['Update your contact details and photo.'],
    warnings: ['Applicants cannot change personal data after submitting the application form.'],
  },
  {
    key: 'dashboard', section: 'General', label: 'Dashboard',
    purpose: 'A performance overview of the association: reports, members, alumni and fund performance, always comparing the current semester with the previous one. It is the same for everyone, to create transparency and healthy competitiveness between divisions.',
    view: ['Read every metric and open the promotional cards (latest report, upcoming initiatives).'],
    manage: [],
    warnings: ['Metrics update automatically — nothing on this page requires manual work.'],
  },
  {
    key: 'welcome', section: 'General', label: 'How to use',
    purpose: 'Your personal user manual, generated for YOUR role: what you can access, what each page does, what you can and cannot do, and what consequences actions have.',
    view: ['Read the manual and download it as a file (you can also paste it into an AI assistant to have it explained differently).'],
    manage: [],
  },
  {
    key: 'calendar', section: 'General', label: 'Calendar',
    purpose: 'The shared association calendar: events, Association on Display days, alumni calls, application windows and fee deadlines, month by month.',
    view: ['Browse all months.', 'Click an event with open registration to register.', 'Click an Association on Display day to open its slot-registration page.'],
    manage: ['Add, edit and remove custom entries (meetings, deadlines, reminders) visible to the whole team.'],
    warnings: ['Custom entries are visible to every workspace user — keep them professional.'],
  },
  {
    key: 'reports-upload', section: 'Reports', label: 'Upload report',
    purpose: 'Publish a new research report to the archive (and, when published, to the public website).',
    view: [],
    manage: ['Attach the PDF, fill title, date, division and pages (auto-counted, editable), then publish or save as draft.', 'Division-scoped roles upload only for their own division.'],
    warnings: ['Publishing makes the report publicly visible on the website.', 'The page count feeds the Dashboard\'s report-length metric — check it before saving.'],
    topics: [{ id: 'pages', title: 'The “Pages” field', body: 'The number of pages is read automatically from the PDF when you attach it. Correct it if the automatic count looks wrong: the Dashboard uses it to measure each division\'s output fairly (quantity AND substance).' }],
  },
  {
    key: 'reports-archive', section: 'Reports', label: 'Report archive',
    purpose: 'Every report the association has produced, filterable by division, fund, year and status.',
    view: ['Search, preview and download reports of your division (Heads can view other divisions).'],
    manage: ['Approve drafts, edit metadata, block or delete reports.'],
    warnings: ['Deleting a report removes it from the public website too.'],
  },
  {
    key: 'reports-templates', section: 'Reports', label: 'Templates & repositories',
    purpose: 'Reusable division material: templates, code repositories, links and reference texts. Star up to five favourites.',
    view: ['Open, read and download your division\'s material.'],
    manage: ['Add, edit and remove items for your division; pin favourites.'],
  },
  {
    key: 'reports-funds', section: 'Reports', label: 'Fund performances',
    purpose: 'The Multi Asset Fund and Long Short Fund track record (monthly returns, NAV, yearly statistics) that feeds the public website and the Dashboard.',
    view: ['Consult the full performance history.'],
    manage: ['Insert and correct monthly performance rows and yearly statistics.'],
    warnings: ['These numbers appear on the public website — double-check before saving.'],
  },
  {
    key: 'applications-website', section: 'Recruiting', label: 'Application page',
    purpose: 'Controls the public application window: when applications open and close, and the semester label. Includes a preview of how the Homepage and Join page change.',
    view: ['See the schedule and the public-page preview.'],
    manage: ['Set the opening/closing date-times and the semester label.'],
    warnings: ['The website switches automatically at the scheduled times — no manual publishing.'],
  },
  {
    key: 'applications-screening', section: 'Recruiting', label: 'Candidates screening',
    purpose: 'Review this semester\'s applications: profiles, CVs, written answers, shared notes and each candidate\'s status. Previous semesters remain consultable as read-only archives.',
    view: ['Open candidate profiles, preview and download documents.', 'Team Leaders and Portfolio Managers can also add notes (no status changes).'],
    manage: ['Change candidate statuses (some statuses email the candidate automatically) and add notes.'],
    warnings: ['Statuses marked “sends an email / action” notify the candidate immediately and cannot be undone.', 'Notes are visible to all reviewers — keep them technical and appropriate.', 'Archived semesters are read-only: statuses and notes can no longer change.'],
    topics: [
      { id: 'status', title: 'Candidate status dropdown', body: 'Changing a status updates what the candidate sees; statuses marked “sends an email / action” also email them (e.g. an interview invitation). A confirmation dialog always appears first. Offer outcomes are managed in Offers, not here.', requires: 'manage' },
      { id: 'semester', title: 'Semester selector', body: 'The list shows only the current semester\'s candidates. Pick a past semester to consult its archived candidacies — they are preserved for accountability and cannot be modified.' },
    ],
  },
  {
    key: 'applications-interview-calendar', section: 'Recruiting', label: 'Interview calendar',
    purpose: 'Interview slots per division; invited candidates book themselves into open slots.',
    view: ['See slots and bookings.'],
    manage: ['Open and close slots; manage bookings for your division.'],
    warnings: ['A candidate can only be invited to interview if their division has at least one open slot.'],
  },
  {
    key: 'applications-joiners', section: 'Recruiting', label: 'Offers',
    purpose: 'The final step of recruiting: send accepted candidates a formal offer with role and division. The current semester is active; past semesters are read-only records.',
    view: ['Observe the offer pipeline to understand how the process works — all actions are disabled for view-only roles.'],
    manage: ['Send (or resend) offers; the candidate has three days to accept from their workspace.'],
    warnings: ['Sending an offer emails the candidate immediately and cannot be reversed.', 'When the candidate accepts, their account becomes a member automatically.'],
  },
  {
    key: 'applications-form', section: 'Recruiting', label: 'Form & settings',
    purpose: 'The application form configuration and the division-specific written questions.',
    view: ['Read the current questions and settings.'],
    manage: ['Edit form settings and each division\'s written question.'],
    warnings: ['Changing questions mid-window means candidates answer different questions in the same round.'],
  },
  {
    key: 'events-create', section: 'Events', label: 'Create event',
    purpose: 'Create a new event of any type (meeting, aperitivo, guest event, online call, …) with schedule, place and poster.',
    view: [],
    manage: ['Create events; they appear on the Calendar, in the archive, and (if enabled) on the public website.'],
  },
  {
    key: 'events-forms', section: 'Events', label: 'Registration forms',
    purpose: 'Turn registration on for any event, choose the audience, preview the public form and share the link.',
    view: [],
    manage: ['Enable/disable registration, pick who can register, copy the public link.'],
    warnings: ['Registrations flow into Attendance automatically.'],
  },
  {
    key: 'events-attendance', section: 'Events', label: 'Attendance',
    purpose: 'Who registered and who actually attended each event; add walk-ins.',
    view: ['Consult registration and attendance numbers.'],
    manage: ['Mark attendance and add external attendees.'],
  },
  {
    key: 'events-archive', section: 'Events', label: 'Event archive',
    purpose: 'Every event of every type, with poster, type and website visibility. The single historical record of the association\'s events.',
    view: ['Browse and search all past and upcoming events.'],
    manage: ['Edit or delete events and toggle whether each one appears on the public website.'],
    warnings: ['The website toggle takes effect immediately on the public Events page.'],
  },
  {
    key: 'events-alumni-calls', section: 'Events', label: 'Alumni calls',
    purpose: 'Organise calls between current members and groups of 2–5 alumni, searched from the alumni directory.',
    view: ['See planned and past calls.'],
    manage: ['Create and edit calls; invite alumni by name or company.'],
  },
  {
    key: 'events-on-display', section: 'Events', label: 'Association on Display',
    purpose: 'Stand-coverage planning: the stand runs 10:00–19:00 in 30-minute slots. A slot is covered once 3 people register; the page also shows how many divisions each slot covers. Past sessions stay archived semester by semester.',
    view: ['Register for (or cancel) any open slot.', 'See who is registered and which divisions are covered.'],
    manage: ['Open or close registration days; delete a day.'],
    warnings: ['Registrations close automatically 48 hours before the day.'],
    topics: [{ id: 'coverage', title: 'Covered / divisions indicators', body: 'A slot turns “Covered” (green) at 3 registered people. The divisions counter shows how many DIFFERENT divisions are present in the slot — a well-covered stand represents the whole association, so spread across slots where your division is missing.' }],
  },
  {
    key: 'people-members', section: 'People', label: 'Members',
    purpose: 'The live member directory, plus the semester registers: frozen snapshots of who officially belonged to the association each semester (taken when that semester\'s fee collection closes).',
    view: ['Browse the directory and consult past semester registers.'],
    manage: ['Add, edit, move to alumni, or expel members.'],
    warnings: ['Expelling a member removes their access immediately and deletes the account after one month.', 'Semester registers are frozen history — they never change.'],
  },
  {
    key: 'people-advisors', section: 'People', label: 'Advisors',
    purpose: 'The advisors and silent advisors directory (silent advisors are identical but hidden from the public website).',
    view: ['Browse advisors.'],
    manage: ['Add and edit advisors.'],
  },
  {
    key: 'people-alumni', section: 'People', label: 'Alumni',
    purpose: 'The alumni directory: who they are, where they work, how to reach them.',
    view: ['Browse and search alumni.'],
    manage: ['Add, edit and remove alumni records.'],
  },
  {
    key: 'smm-editorial', section: 'Media & Communication', label: 'Editorial calendar',
    purpose: 'Plan social content: what is published, where and when.',
    view: ['Consult the plan.'], manage: ['Create, move and complete editorial items.'],
  },
  { key: 'smm-ig', section: 'Media & Communication', label: 'Instagram', purpose: 'Reusable Instagram material (texts, files, links).', view: ['Open and download material.'], manage: ['Add, edit and remove items; pin favourites.'] },
  { key: 'smm-li', section: 'Media & Communication', label: 'LinkedIn', purpose: 'Reusable LinkedIn material.', view: ['Open and download material.'], manage: ['Add, edit and remove items; pin favourites.'] },
  { key: 'smm-other', section: 'Media & Communication', label: 'Other templates', purpose: 'Other reusable communication material.', view: ['Open and download material.'], manage: ['Add, edit and remove items.'] },
  { key: 'smm-brand', section: 'Media & Communication', label: 'Brand & design', purpose: 'The association\'s visual identity: fonts, colours, logo usage and design rules.', view: ['Consult the brand references.'], manage: ['Maintain the brand references.'] },
  {
    key: 'smm-ads', section: 'Media & Communication', label: 'Ads & spending',
    purpose: 'The paid-advertising register, organised semester by semester: content, platform, amount, purpose and effectiveness notes. Each amount is posted once to the Treasury.',
    view: ['Consult the register and semester totals.'],
    manage: ['Record new ads (entries cannot be deleted — the register is an accounting record).'],
    warnings: ['Each recorded amount creates a locked Treasury entry.'],
  },
  {
    key: 'ops-fee', section: 'Operations', label: 'Membership fees',
    purpose: 'Per-semester membership fee collection: open a period, tick who paid, close it. Closing posts the total to the Treasury and freezes the semester\'s official member register.',
    view: ['See the state of the current collection.'],
    manage: ['Open a collection, mark members as paid, close the collection.'],
    warnings: ['Closing is final: it locks the collection, records the total in the Treasury, and takes the official member snapshot for the semester.'],
    topics: [{ id: 'close', title: 'Close & record', body: 'Closing ends the semester\'s collection: the total is written to the Treasury as a locked entry and the definitive member register for the semester is frozen at that moment. It cannot be re-opened, so close only when every payment is ticked.', requires: 'manage' }],
  },
  {
    key: 'ops-treasury', section: 'Operations', label: 'Treasury',
    purpose: 'The association\'s cash-flow register, divided by semester because each semester may have a different leadership team.',
    view: ['Consult entries, semester nets and the current balance.'],
    manage: ['Record new entries (they can never be edited or deleted — add a correction entry to fix a mistake).'],
    warnings: ['Every entry is permanent and logged. Review the confirmation dialog carefully.'],
  },
  { key: 'ops-external', section: 'Operations', label: 'External relations', purpose: 'Repository of external relationships: contacts, agreements, files and links.', view: ['Consult the material.'], manage: ['Maintain the material.'] },
  { key: 'ops-docs', section: 'Operations', label: 'Statute & documents', purpose: 'Official documents: the statute, drafts, approval documents.', view: ['Read and download documents.'], manage: ['Maintain the document repository.'] },
  { key: 'website-pages', section: 'Website', label: 'Pages', purpose: 'Show or hide individual public website pages.', view: ['See which pages are visible.'], manage: ['Toggle page visibility (takes effect immediately for the public).'], warnings: ['Hiding a page shows visitors a “Page under update” notice instantly.'] },
  { key: 'website-readings', section: 'Website', label: 'Readings', purpose: 'The public readings list.', view: ['Consult it.'], manage: ['Add, edit and remove readings.'] },
  { key: 'website-testimonials', section: 'Website', label: 'Testimonials', purpose: 'The homepage testimonials.', view: ['Read them.'], manage: ['Manage which testimonials appear publicly.'] },
  { key: 'ops-newsletter', section: 'Website', label: 'Newsletter', purpose: 'Newsletter subscribers and sending.', view: ['Consult subscribers.'], manage: ['Manage subscribers and sends.'] },
  { key: 'ops-auto-emails', section: 'Website', label: 'Automatic emails', purpose: 'The automatic email templates the system sends (confirmations, invitations, reminders) and their send log.', view: ['Read templates and the log.'], manage: ['Edit templates.'], warnings: ['Template changes affect every future automatic email.'] },
  {
    key: 'settings-users', section: 'Settings', label: 'Users',
    purpose: 'Who has an account and which role (and division) each person holds. Roles drive everything else in the workspace.',
    view: ['See every user\'s current role.'],
    manage: ['Assign roles and divisions (confirmed, logged, and guarded so the last President/Admin can never be removed).'],
    warnings: ['A role change takes effect immediately and is recorded in the Activity log.'],
    topics: [{ id: 'change-role', title: 'Change role', body: 'Pick the new role; division-based roles then require a division (Portfolio Manager is always Portfolio — it IS that division\'s team leader). Every change needs confirmation and is written to the Activity log with your identity.', requires: 'manage' }],
  },
  { key: 'settings-roles', section: 'Settings', label: 'Role permissions', purpose: 'The live table of who can use which parts of the workspace — generated from the real access rules, so it is always accurate.', view: ['Consult the table and the special rules.'], manage: [] },
  {
    key: 'settings-activity', section: 'Settings', label: 'Activity log',
    purpose: 'The accountability record: every meaningful action, by whom, with which role at that moment, where, on what, and when.',
    view: ['Filter by action, user, section and date; export to CSV.'],
    manage: [],
    warnings: ['All workspace actions are logged for accountability and security. Entries never change retroactively.'],
  },
];

export const guideFor = (key: string): GuideEntry | undefined => GUIDE.find((g) => g.key === key);
