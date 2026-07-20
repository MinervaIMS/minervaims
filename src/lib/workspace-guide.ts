// =====================================================================
// Workspace guide. ONE content source for two features:
//   1. "How to use" (the role-based manual, downloadable)
//   2. Contextual help (the ? icons and the right-hand help panel)
// Each entry describes a subsection: what it is for, what "Interact only"
// users can do, what "Full interact" adds, warnings and consequences, and
// detailed topics for specific controls. Content is filtered by the
// viewer's real access level, so nobody reads instructions for actions
// they cannot perform.
// Editorial rules: no em dashes, no emojis, professional tone.
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
  warnings?: string[];      // consequences and cautions
  topics?: GuideTopic[];    // extra help anchors for specific controls
}

export const GUIDE: GuideEntry[] = [
  {
    key: 'my-role', section: 'General', label: 'My profile',
    purpose: 'Your personal page in one column: your card (name, contacts, role, division and photo) first, then a brief describing what your role covers, closing with the link to the statute. This is what colleagues see about you.',
    view: ['Read your profile, check which role and division you hold, and read your role brief.', 'Open the association statute from the link at the bottom of the page.'],
    manage: ['Update your contact details and photo.'],
    warnings: ['Applicants cannot change personal data after submitting the application form.'],
    topics: [
      { id: 'role-shown', title: 'Where your role comes from', body: 'Your role and division are assigned by the President or Admin in Settings, Users. If something looks wrong, contact them: you cannot change your own role, from any page, and the server enforces this.' },
      { id: 'role-brief', title: 'Your role brief', body: 'Below your card, the brief summarises what your role is responsible for and which parts of the workspace it unlocks. It is generated from the same access rules that drive the workspace, so it always matches reality.' },
    ],
  },
  {
    key: 'dashboard', section: 'General', label: 'Dashboard',
    purpose: 'A performance overview of the association: research output, people and fund performance, always comparing the current semester with the previous one. It is identical for every member, to create transparency and healthy competition between divisions.',
    view: ['Read every metric and open the highlighted call to action.'],
    manage: [],
    warnings: ['Everything updates automatically. Nothing on this page requires manual work from anyone.'],
    topics: [
      { id: 'kpis', title: 'The big numbers', body: 'The key indicators compare the current semester with the previous one. Green means growth; a neutral figure simply shows the distance still to cover. The comparison never blames a team: it exists to show momentum.' },
      { id: 'pages-metric', title: 'Why pages matter', body: 'Counting only the number of reports would reward quantity over substance. The pages metric adds the length dimension, so a division writing fewer but deeper reports is represented fairly.' },
      { id: 'funds-panel', title: 'Fund performance panel', body: 'The Multi Asset Fund and Long Short Fund figures come from the data maintained in Reports, Fund performances. They are shown prominently because they are collective achievements of the association.' },
    ],
  },
  {
    key: 'welcome', section: 'General', label: 'How to use',
    purpose: 'Your personal user manual, generated for your role: how the workspace is organised, what you can access, what each page does, what you can and cannot do, what consequences actions have, and what changed recently.',
    view: ['Read the overview, the recent improvements and the full manual, and download everything as a file. You can also paste it into an AI assistant to have it explained in another format.'],
    manage: [],
    topics: [
      { id: 'download', title: 'Download my manual', body: 'The download produces a Markdown file containing exactly the manual you see, overview included. Many members prefer to upload it to an AI assistant and ask for a summary, a checklist or a step-by-step walkthrough of one specific task.' },
      { id: 'help-tools', title: 'Help, always in place', body: 'Every workspace page carries a floating question mark that opens the sliding help panel for that page, and many controls carry a small circled question mark that opens the panel directly at the matching topic. The panel shows only what your role can actually do.' },
      { id: 'on-mobile', title: 'The workspace on a phone', body: 'On a phone the workspace becomes a compact shell: sections in a drawer, subsections as chips, consultation available everywhere. Subsections that need a full screen are marked with a monitor icon and open on desktop only, and read-only pages carry a ribbon saying editing is available on desktop.' },
      { id: 'deep-links', title: 'Direct links into the workspace', body: 'A link of the form /admin?section=...&sub=... opens the workspace directly on that subsection, provided your role can see it. Some website buttons use these links to bring you to the right place in one click.' },
    ],
  },
  {
    key: 'calendar', section: 'General', label: 'Calendar',
    purpose: 'The shared association calendar: events, Association on Display days, alumni calls, application windows and fee deadlines, month by month.',
    view: ['Browse all months.', 'Click an event with open registration to register.', 'Click an Association on Display day to open its slot registration page.'],
    manage: ['Add, edit and remove custom entries (meetings, deadlines, reminders) visible to the whole team.', 'Define exam session breaks and add CASA Committee meetings.'],
    warnings: ['Custom entries are visible to every workspace user. Keep them professional.', 'During an exam session break, no event can be scheduled anywhere in the workspace.'],
    topics: [
      { id: 'colors', title: 'What the colours mean', body: 'Each colour marks a type of item: association events, Association on Display days, alumni calls, application windows, fee deadlines and custom entries. The legend above the calendar lists them all.' },
      { id: 'register', title: 'Registering from the calendar', body: 'Events with open registration are clickable. A dialog shows the details and a registration button; once registered you will see a confirmation mark next to the event.' },
      { id: 'exam-breaks', title: 'Exam session breaks', body: 'An exam session break is a protected date range: while it lasts, no event, interview slot, Association on Display day, alumni call, meeting or social can be scheduled anywhere in the workspace, so events land when the student community can actually attend. Deadlines and reminders remain possible. Breaks are shaded on the calendar and enforced by the database itself.', requires: 'manage' },
      { id: 'casa', title: 'CASA Committee meetings', body: 'A special entry type visible ONLY to the members of the board of directors and the admin account; other members never see it. Use it for the association\'s CASA committee appointments. The restriction is enforced at database level, not just visually.', requires: 'manage' },
    ],
  },
  {
    key: 'reports-upload', section: 'Reports', label: 'Upload report',
    purpose: 'Publish a new research report to the archive and, when published, to the public website.',
    view: [],
    manage: ['Attach the PDF, fill in title, date and division, then publish or save as a draft.', 'Division-scoped roles upload only for their own division.'],
    warnings: ['Publishing makes the report publicly visible on the website.', 'The number of pages is detected automatically from the PDF. No manual input is needed.'],
    topics: [
      { id: 'draft', title: 'Draft or publish', body: 'Publishing sends the report straight to the archive and the public website. Saving as a draft keeps it internal until a Head approves it from the Report archive.' },
      { id: 'fund-reports', title: 'Fund reports', body: 'For Portfolio Management reports you can attach the report to a fund. Remember to update the corresponding figures in Fund performances so the public fund table stays current.' },
    ],
  },
  {
    key: 'reports-archive', section: 'Reports', label: 'Report archive',
    purpose: 'Every report the association has produced, filterable by division, fund, year and status.',
    view: ['Search, preview and download reports of your division. Heads can switch to other divisions.'],
    manage: ['Approve drafts, edit metadata, block or delete reports.'],
    warnings: ['Deleting a report removes it from the public website too.'],
    topics: [
      { id: 'statuses', title: 'Report statuses', body: 'Published reports are live on the website. Drafts are internal and waiting for review. Blocked reports are withdrawn from the website but kept in the archive.' },
      { id: 'filters', title: 'Filters', body: 'Combine the division, fund, year and search filters to narrow the list. Filters only change what you see; they never change the data.' },
    ],
  },
  {
    key: 'reports-templates', section: 'Reports', label: 'Templates & repositories',
    purpose: 'Reusable division material: templates, code repositories, links and reference texts. Star up to five favourites to pin them on top.',
    view: ['Open, read and download your division\'s material.'],
    manage: ['Add, edit and remove items for your division; pin favourites.'],
    topics: [
      { id: 'favourites', title: 'Favourites', body: 'Starred items stay pinned at the top of the list for everyone in the division. At most five items can be favourites at once, so reserve them for the material used most.' },
      { id: 'scope', title: 'Division scope', body: 'Analysts, senior analysts, team leaders and portfolio managers see their own division\'s material. Heads of Division can switch divisions, and the Head of Asset Management sees everything.' },
    ],
  },
  {
    key: 'reports-funds', section: 'Reports', label: 'Fund performances',
    purpose: 'The Multi Asset Fund and Long Short Fund track record: monthly returns and yearly statistics. This data feeds the public website and the Dashboard.',
    view: ['Consult the full performance history.'],
    manage: ['Insert and correct monthly performance rows and yearly statistics, within the editing window.'],
    warnings: ['These numbers appear on the public website. Double-check before saving.', 'Only the last 15 calendar months are editable. Anything earlier is frozen history and cannot be changed by anyone.'],
    topics: [
      { id: 'yearly', title: 'Yearly statistics', body: 'The yearly figures (ITD, YTD, volatility, Sharpe) are what the public fund table and the Dashboard display. Keep them aligned with the monthly data.' },
      { id: 'editing-window', title: 'The 15-month editing window', body: 'Recent months can be corrected; months older than 15 months are locked, so the published track record cannot be rewritten. Once every month of a year is locked, the whole year freezes, aggregates included, and its row no longer offers the edit or delete actions: it simply reads as frozen history.' },
    ],
  },
  {
    key: 'applications-website', section: 'Recruiting', label: 'Application page',
    purpose: 'Controls the public application window: when applications open and close, and the semester label. Includes a preview of how the Homepage and Join page change.',
    view: ['See the schedule and the public page preview.'],
    manage: ['Set the opening and closing date-times and the semester label.'],
    warnings: ['The website switches automatically at the scheduled times. There is no manual publishing step.'],
    topics: [
      { id: 'preview', title: 'The open and closed previews', body: 'The preview shows exactly what visitors see in each state: the Homepage gains an Apply now button while the window is open, and the Join page switches its hero band between the open and closed message.' },
    ],
  },
  {
    key: 'applications-screening', section: 'Recruiting', label: 'Candidates screening',
    purpose: 'Review this semester\'s applications: profiles, CVs, written answers, shared notes and each candidate\'s status. Previous semesters remain consultable as read-only archives.',
    view: ['Open candidate profiles, preview and download documents.', 'Team Leaders and Portfolio Managers can also add notes, without changing statuses.'],
    manage: ['Change candidate statuses (some statuses email the candidate automatically) and add notes.'],
    warnings: ['Statuses marked "sends an email / action" notify the candidate immediately and cannot be undone.', 'Notes are visible to all reviewers. Keep them technical and appropriate.', 'Archived semesters are read-only: statuses and notes can no longer change.'],
    topics: [
      { id: 'status', title: 'Candidate status dropdown', body: 'A candidacy only moves FORWARD: the dropdown offers only stages later than the current one, and the server refuses any attempt to move a candidate back. Statuses marked "sends an email / action" also email the candidate, for example an interview invitation. A confirmation dialog always appears first. Offer outcomes are managed in Offers, not here.', requires: 'manage' },
      { id: 'transfer', title: 'Considering a candidate for another division', body: 'The one sanctioned exception to forward-only progress: after the interview, the examiners may conclude the candidate fits a different division better. The transfer control re-invites them to interview with the new division (email plus booking access) and records the move in the activity log.', requires: 'manage' },
      { id: 'semester', title: 'Semester selector', body: 'The list shows only the current semester\'s candidates. Pick a past semester to consult its archived candidacies; they are preserved for accountability and cannot be modified.' },
      { id: 'notes', title: 'Shared notes', body: 'Notes are visible to every reviewer with access to this page and are attributed to their author. Write only technical, relevant observations that help evaluate the candidate.' },
      { id: 'documents', title: 'CV and written answer', body: 'Both documents open in the preview panes and can be downloaded. Opening a CV for the first time automatically advances the candidate\'s status to show the application has been seen.' },
    ],
  },
  {
    key: 'applications-interview-calendar', section: 'Recruiting', label: 'Interview calendar',
    purpose: 'Interview slots per division. Invited candidates book themselves into open slots.',
    view: ['See slots and bookings.'],
    manage: ['Open and close slots and manage bookings for your division.'],
    warnings: ['A candidate can only be invited to interview if their division has at least one open slot.'],
    topics: [
      { id: 'slots', title: 'How slots work', body: 'Each slot belongs to a division and holds one candidate. Candidates see only the open slots of the division they were invited for, and book directly from their own restricted workspace.' },
      { id: 'bulk', title: 'Opening several slots at once', body: 'The bulk tool creates a run of slots between a start and an end time on one day, all carrying the same meeting link. Ideal for a full interview afternoon.', requires: 'manage' },
    ],
  },
  {
    key: 'applications-joiners', section: 'Recruiting', label: 'Offers',
    purpose: 'The final step of recruiting: send accepted candidates a formal offer with role and division. The current semester is active; past semesters are read-only records.',
    view: ['Observe the offer pipeline to understand how the process works. All actions are disabled for view-only roles.'],
    manage: ['Send or resend offers; the candidate has three days to accept from their workspace.'],
    warnings: ['Sending an offer emails the candidate immediately and cannot be reversed.', 'When the candidate accepts, their account becomes a member automatically.'],
    topics: [
      { id: 'offer-flow', title: 'The offer lifecycle', body: 'Ready to offer means the candidate passed selection but has not been contacted. Offer sent means they have three days to reply, with an automatic reminder after two. Declined or expired offers can be resent. Joined means the person is now a member.' },
      { id: 'fee-due', title: 'Membership fee due', body: 'The switch decides whether this new member will be asked to pay the membership fee for the current semester. Leave it on unless the board granted an exemption.', requires: 'manage' },
    ],
  },
  {
    key: 'applications-form', section: 'Recruiting', label: 'Form & Questions',
    purpose: 'The application form in one page: its fixed structure first, then the division-specific written questions, which are an integral part of the form.',
    view: ['Read the form structure and the current questions, and preview the public form.'],
    manage: ['Edit the written question of each division you are responsible for. Heads of Division edit their own division\'s question; full-access roles edit all.'],
    warnings: ['Questions are locked while applications are open: from the scheduled opening until the close nobody can edit them, so every applicant answers the same question. The server enforces the lock.'],
    topics: [
      { id: 'questions', title: 'Division questions', body: 'Each division asks applicants one written question, answered with a PDF upload. Candidates answer the question of their first-choice division. Edit questions before the window opens; during an open window they are read-only for everyone.' },
    ]
  },
  {
    key: 'events-create', section: 'Events', label: 'Create event',
    purpose: 'Create a new event of any type (meeting, aperitivo, guest event, online call and more) with schedule, place and poster.',
    view: [],
    manage: ['Create events; they appear on the Calendar, in the archive and, if enabled, on the public website.'],
    topics: [
      { id: 'types', title: 'Event types', body: 'The type describes what the event is (internal meeting, division event, guest event, association-wide gathering). Alumni calls are not created here: they have their own subsection under Events. Internal types default to staying off the public website; you can change that per event in the Event archive.' },
      { id: 'archive-visibility', title: 'Archive and website visibility', body: 'When creating the event you choose whether it enters the public archive. Website visibility can also be changed later, per event, from the Event archive.' },
      { id: 'poster', title: 'Posters', body: 'A poster makes the event stand out in the archive and on the website. JPG, PNG or PDF up to 10 MB; any aspect ratio is accepted.' },
    ],
  },
  {
    key: 'events-forms', section: 'Events', label: 'Registration forms',
    purpose: 'Turn registration on for any event, choose the audience, preview the public form and share the link.',
    view: [],
    manage: ['Enable or disable registration, pick who can register, copy the public link.'],
    warnings: ['Registrations flow into Attendance automatically.'],
    topics: [
      { id: 'audience', title: 'Who can register', body: 'The audience setting decides who may use the registration form: members only, members plus external guests, guests only, or fully public. Pick the narrowest audience that fits the event.', requires: 'manage' },
    ],
  },
  {
    key: 'events-attendance', section: 'Events', label: 'Attendance',
    purpose: 'Who registered and who actually attended each event; add walk-ins.',
    view: ['Consult registration and attendance numbers.'],
    manage: ['Mark attendance and add external attendees.'],
    topics: [
      { id: 'walkins', title: 'Walk-ins', body: 'People who attend without registering can be added on the spot, so the attendance record stays complete.', requires: 'manage' },
    ],
  },
  {
    key: 'events-archive', section: 'Events', label: 'Event archive',
    purpose: 'Every event of every type, with poster, type and website visibility. The single historical record of the association\'s events.',
    view: ['Browse and search all past and upcoming events.'],
    manage: ['Edit or delete events and toggle whether each one appears on the public website.'],
    warnings: ['The website toggle takes effect immediately on the public Events page.'],
    topics: [
      { id: 'website-toggle', title: 'On website / Not on website', body: 'The toggle controls whether the event is listed on the public Events page. Internal events such as meetings and calls are normally kept off the website; outward-facing events stay on.', requires: 'manage' },
    ],
  },
  {
    key: 'events-alumni-calls', section: 'Events', label: 'Alumni calls',
    purpose: 'Organise calls between current members and groups of two to five alumni, searched from the alumni directory.',
    view: ['See planned and past calls.'],
    manage: ['Create and edit calls; invite alumni by name or company.'],
    topics: [
      { id: 'search', title: 'Inviting alumni', body: 'Type a name or a company in the search box and click a result to invite that alumnus. Alumni must exist in the directory first; add missing people in People, Alumni.', requires: 'manage' },
    ],
  },
  {
    key: 'events-on-display', section: 'Events', label: 'Association on Display',
    purpose: 'Stand coverage planning: the stand runs 10:00 to 19:00 in 30-minute slots. A slot is covered once three people register; the page also shows how many divisions each slot covers. Past sessions stay archived semester by semester.',
    view: ['Register for or cancel any open slot.', 'See who is registered and which divisions are covered.'],
    manage: ['Open or close registration days; delete a day.'],
    warnings: ['Registrations close automatically 48 hours before the day.'],
    topics: [
      { id: 'coverage', title: 'Covered and divisions indicators', body: 'A slot turns Covered (green) at three registered people. The divisions counter shows how many different divisions are present in the slot. A well-covered stand represents the whole association, so consider slots where your division is missing.' },
      { id: 'day-controls', title: 'Opening and closing a day', body: 'Senior roles create days and control whether registration is open. Deleting a day removes all its registrations, so use it only for cancelled sessions.', requires: 'manage' },
    ],
  },
  {
    key: 'people-members', section: 'People', label: 'Members',
    purpose: 'The association register: members and advisors, each with THE one role that drives their workspace permissions everywhere. Also holds the semester registers: frozen snapshots of who officially belonged to the association each semester.',
    view: ['Browse the directory and consult past semester registers.', 'Portfolio managers, team leaders, senior analysts and analysts see the people of their own division (names, search and filters).'],
    manage: ['Add, edit, move to alumni or expel members.'],
    warnings: ['Expelling a member removes their access immediately and deletes the account after one month.', 'Semester registers are frozen history and never change.', 'Roles are assigned only by the President and the association account, and nobody can ever change their own role, from any page.'],
    topics: [
      { id: 'registers', title: 'Semester registers', body: 'Each register lists who officially belonged to the association in a given semester. It is created automatically the moment that semester\'s membership fee collection is closed, and preserved unchanged from then on.' },
      { id: 'leave', title: 'Moving a member to alumni', body: 'When someone graduates or leaves on good terms, move them to alumni instead of deleting: their history is preserved and they join the alumni directory. Board members can additionally stay in the workspace as advisors (hidden from the website by default).', requires: 'manage' },
      { id: 'redeem', title: 'How existing members claim their account', body: 'When a person on this register creates a website account with the email stored on their profile, the system links the profile to the account automatically as soon as the email is verified, and applies the role and permissions stored here. No duplicate is created; the link is recorded in the activity log.' },
      { id: 'role-division', title: 'One role for everything', body: 'The role on the member profile is the person\'s ONLY role: workspace permissions mirror it automatically, and Settings > Users edits this same record. President, Vice President, Head of Asset Management and advisors carry no division (the board is not a division); heads of division belong to the board AND to their division; Portfolio Manager is Portfolio Management\'s team leader.', requires: 'manage' },
      { id: 'advisors', title: 'Advisors', body: 'Advisors are appointed alumni who assist the board and keep consulting access to the workspace. They live in this register; the "Show on public Members page" switch on their profile decides whether they appear on the public website (rows marked "hidden" do not). Advisors never enter fee collections or the semester registers.', requires: 'manage' },
    ],
  },
  {
    key: 'people-alumni', section: 'People', label: 'Alumni',
    purpose: 'The alumni directory: who they are, where they work and how to reach them.',
    view: ['Browse and search alumni.'],
    manage: ['Add, edit and remove alumni records.'],
    topics: [
      { id: 'quality', title: 'Keeping the directory current', body: 'Company and role information powers alumni calls and the public alumni highlights, so update records whenever you learn about a move.' },
    ],
  },
  {
    key: 'smm-editorial', section: 'Media & Communication', label: 'Editorial calendar',
    purpose: 'Plan social content: what is published, where and when.',
    view: ['Consult the plan.'], manage: ['Create, move and complete editorial items.'],
    topics: [
      { id: 'planning', title: 'Planning items', body: 'Each item represents one piece of content with its channel and date. Move items as plans change; completing an item records that the content went out.' },
    ]
  },
  { key: 'smm-ig', section: 'Media & Communication', label: 'Instagram', purpose: 'Reusable Instagram material: texts, files and links.', view: ['Open and download material.'], manage: ['Add, edit and remove items; pin favourites.'] },
  { key: 'smm-li', section: 'Media & Communication', label: 'LinkedIn', purpose: 'Reusable LinkedIn material.', view: ['Open and download material.'], manage: ['Add, edit and remove items; pin favourites.'] },
  { key: 'smm-graphics', section: 'Media & Communication', label: 'MIMS Graphics', purpose: 'The association\'s graphic assets: logos, marks and ready-to-use graphic files.', view: ['Open and download the graphic assets.'], manage: ['Add, edit and remove items; pin favourites.'] },
  { key: 'smm-other', section: 'Media & Communication', label: 'Other resources', purpose: 'Other reusable communication material.', view: ['Open and download material.'], manage: ['Add, edit and remove items.'] },
  { key: 'smm-brand', section: 'Media & Communication', label: 'Design System', purpose: 'The association\'s visual identity: fonts, colours, logo usage and design rules.', view: ['Consult the design references.'], manage: ['Maintain the design references.'] },
  {
    key: 'smm-ads', section: 'Media & Communication', label: 'Ads & spending',
    purpose: 'The paid advertising register, organised semester by semester: content, platform, amount, purpose and effectiveness notes. Each amount is posted once to the Treasury.',
    view: ['Consult the register and semester totals.'],
    manage: ['Record new ads. Entries cannot be deleted because the register is an accounting record.'],
    warnings: ['Each recorded amount creates a locked Treasury entry.'],
    topics: [
      { id: 'effectiveness', title: 'Effectiveness notes', body: 'Write what the campaign was meant to achieve and whether it worked. Future teams rely on these notes to decide where advertising money is well spent.', requires: 'manage' },
    ],
  },
  {
    key: 'ops-fee', section: 'Operations', label: 'Membership fees',
    purpose: 'Per-semester membership fee collection: open a period, tick who paid, close it. Closing posts the total to the Treasury and freezes the semester\'s official member register.',
    view: ['See the state of the current collection.'],
    manage: ['Open a collection, mark members as paid, close the collection.'],
    warnings: ['Closing is final: it locks the collection, records the total in the Treasury and takes the official member snapshot for the semester.'],
    topics: [
      { id: 'close', title: 'Close and record', body: 'Closing ends the semester\'s collection. The total is written to the Treasury as a locked entry and the definitive member register for the semester is frozen at that moment. It cannot be reopened, so close only when every payment is ticked.', requires: 'manage' },
      { id: 'deadlines', title: 'The two deadlines', body: 'The first deadline is the standard payment date shown to everyone. The second deadline is a final grace period, shown only to members who have not paid once the first deadline has passed.' },
      { id: 'past', title: 'Past collections', body: 'Below the current collection, every closed semester shows who contributed and who did not, frozen at the moment the collection closed. This record stays consultable even while no collection is open.' },
    ],
  },
  {
    key: 'ops-treasury', section: 'Operations', label: 'Treasury',
    purpose: 'The association\'s cash-flow register, divided by semester because each semester may have a different leadership team.',
    view: ['Consult entries, semester nets and the current balance.'],
    manage: ['Record new entries. Entries can never be edited or deleted; add a correction entry to fix a mistake.'],
    warnings: ['Every entry is permanent and logged. Review the confirmation dialog carefully.'],
    topics: [
      { id: 'immutability', title: 'Why entries cannot be edited', body: 'An append-only register is what makes the Treasury trustworthy across changing leadership teams. If a mistake happens, record a correction entry that offsets it and explains the reason.' },
      { id: 'semester-dividers', title: 'Semester dividers', body: 'Entries are grouped under the semester in which they were executed, with a net amount per semester, so each leadership team\'s period reads separately.' },
    ],
  },
  { key: 'ops-external', section: 'Operations', label: 'External relations', purpose: 'Repository of external relationships: contacts, agreements, files and links.', view: ['Consult the material.'], manage: ['Maintain the material.'] },
  { key: 'ops-docs', section: 'Operations', label: 'Statute & documents', purpose: 'Official documents: the statute, drafts and approval documents.', view: ['Read and download documents.'], manage: ['Maintain the document repository.'],
    topics: [{ id: 'official', title: 'Official documents', body: 'This repository holds the statute and the association\'s formal documents. Keep the latest approved versions pinned as favourites so members always find the current text first.' }] },
  {
    key: 'website-pages', section: 'Website', label: 'Pages',
    purpose: 'Show or hide individual public website pages.',
    view: ['See which pages are visible.'],
    manage: ['Toggle page visibility. Changes take effect immediately for the public.'],
    warnings: ['Hiding a page shows visitors a "Page under update" notice instantly.'],
    topics: [
      { id: 'hide-effect', title: 'What hiding does', body: 'A hidden page stays reachable at its address but visitors see a Page under update notice over a blurred body. The homepage and the legal pages can never be hidden.' },
    ],
  },
  { key: 'website-readings', section: 'Website', label: 'Readings', purpose: 'The reading recommendations shown on the public website.', view: ['Consult the list.'], manage: ['Add, edit and remove readings.'],
    topics: [{ id: 'visibility', title: 'What visitors see', body: 'On the public website the library is drawn as a stylised bookcase with one column per category (academic papers, technical textbooks, free time readings). Every reading added here becomes a book on its shelf, in the order shown in this list, and visitors open it to read the rationale and the attribution. Add a reading only when the reference is complete and correctly attributed.' }] },
  { key: 'website-testimonials', section: 'Website', label: 'Testimonials', purpose: 'The homepage testimonials.', view: ['Read them.'], manage: ['Manage which testimonials appear publicly.'],
    topics: [{ id: 'linking', title: 'Linking to alumni records', body: 'Each testimonial should be linked to its alumni record so the homepage can show the current company automatically. A warning appears when the link or the company is missing.' }] },
  { key: 'ops-newsletter', section: 'Website', label: 'Newsletter', purpose: 'Newsletter subscribers and sending.', view: ['Consult subscribers.'], manage: ['Manage subscribers and sends.'],
    topics: [{ id: 'consent', title: 'Subscriber consent', body: 'Subscribers joined through the website form and consented to updates. Every message must keep the unsubscribe link intact, and unsubscribed addresses are never contacted again.' }] },
  {
    key: 'ops-auto-emails', section: 'Website', label: 'Automatic emails',
    purpose: 'The automatic email templates the system sends (confirmations, invitations, reminders) and their send log.',
    view: ['Read templates and the log.'],
    manage: ['Edit templates.'],
    warnings: ['Template changes affect every future automatic email.'],
    topics: [
      { id: 'log', title: 'The send log', body: 'Every automatic email the system sends is listed with its recipient and outcome, so delivery problems can be spotted quickly.' },
    ],
  },
  {
    key: 'settings-users', section: 'Settings', label: 'Users',
    purpose: 'Who has an account and which role and division each person holds. Roles drive everything else in the workspace.',
    view: ['See every user\'s current role.'],
    manage: ['Assign roles and divisions. Changes are confirmed, logged, and guarded so the last President or Admin can never be removed.'],
    warnings: ['A role change takes effect immediately and is recorded in the Activity log.'],
    topics: [
      { id: 'change-role', title: 'Change role', body: 'Pick the new role; division-based roles then require a division. Portfolio Manager is always the Portfolio division because it is that division\'s team leader. Every change needs confirmation and is written to the Activity log with your identity. Users and People > Members edit the same record, so a change made in either place is immediately visible in the other.', requires: 'manage' },
      { id: 'pending', title: 'Pending approvals', body: 'Accounts that exist but have no workspace role yet. With the current application flow these are rare; assign a role to activate the account or delete accounts that should not exist.', requires: 'manage' },
    ],
  },
  {
    key: 'settings-roles', section: 'Settings', label: 'Role permissions',
    purpose: 'The live table of who can use which parts of the workspace, generated from the real access rules, so it is always accurate.',
    view: ['Consult the table and the special rules.'],
    manage: [],
    topics: [
      { id: 'levels', title: 'Reading the table', body: 'Full means the role can create, edit and remove in that subsection. View means it can open the page and use light actions such as registering or downloading. A dash means the subsection is hidden for that role.' },
    ],
  },
  {
    key: 'settings-activity', section: 'Settings', label: 'Activity log',
    purpose: 'The accountability record: every meaningful action, by whom, with which role at that moment, where, on what, and when.',
    view: ['Filter by action, user, section and date; export to CSV.'],
    manage: [],
    warnings: ['All workspace actions are logged for accountability and security. Entries never change retroactively.'],
    topics: [
      { id: 'role-at-time', title: 'Role at the time of the action', body: 'Each entry stores the role its author held at that exact moment. If the person changes role later, old entries keep the original role, so the record stays historically accurate.' },
      { id: 'filters', title: 'Filtering and export', body: 'Combine the action, user, section and date filters to investigate a specific question, then export the filtered result to CSV if you need to share or archive it.' },
    ],
  },
];

export const guideFor = (key: string): GuideEntry | undefined => GUIDE.find((g) => g.key === key);
