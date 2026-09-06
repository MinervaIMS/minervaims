// =====================================================================
// workspace-manual — the reference material the per-page guide is not.
// ---------------------------------------------------------------------
// `workspace-guide.ts` answers "what is this page and what can I do on
// it". That is the right question when somebody is standing on the page.
// It is the wrong question, and the only question the manual answered,
// for two readers this file exists to serve:
//
//   * A MEMBER WHO IS NEW. They do not have a page open. They have a
//     job to do - collect the fees, run a recruiting round, publish a
//     report - and it crosses four subsections in an order nothing
//     wrote down. Page descriptions cannot teach a sequence.
//
//   * AN AI ASSISTANT, which is how a good part of the association
//     actually reads this: the manual is downloaded and pasted into a
//     model, and the questions put to it are "how do I", "what happens
//     if" and "who decides". A model answers those from the RULES of the
//     system, and the rules were nowhere in the file. A list of pages
//     lets it paraphrase headings; the model then fills the gaps with
//     plausible invention, which is the worst possible failure for a
//     document whose whole purpose is to be authoritative.
//
// So: the concepts the workspace is built on, the sequences that cross
// pages, the vocabulary, what each role is actually for, and the
// questions people ask when something looks wrong. Everything here is
// filtered by role before it is printed, exactly as the per-page guide
// is, so nobody is handed instructions for a page they cannot open.
//
// Editorial rules, as everywhere: no em dashes, no emojis, UK English,
// professional tone, and nothing asserted that the code does not do.
// =====================================================================

import type { AppRole } from '@/lib/roles';

/**
 * A block of the reference section.
 *
 * `requires` is a resource key: the block is printed only for somebody
 * who can at least view it. A block with no `requires` is for everyone,
 * because it describes how the workspace itself behaves rather than what
 * one part of it holds.
 */
export interface ManualConcept {
  id: string;
  title: string;
  /** Paragraphs. Kept as an array so the renderer decides the spacing. */
  body: string[];
  requires?: string;
}

// =====================================================================
// HOW THE WORKSPACE WORKS. The model, not the menu.
// =====================================================================
export const HOW_IT_WORKS: ManualConcept[] = [
  {
    id: 'roles',
    title: 'One role, one person, one source of truth',
    body: [
      'Everything you can see and do follows from a single role held in a single record. There is no second list of permissions anywhere, and no page that grants access on its own terms.',
      'The role is assigned by the President or the association account, from either Settings, Users or People, Members. Those two pages edit the SAME record: a change made in one appears in the other immediately, and workspace access follows in the same instant. Nobody can change their own role, from any page, and the server refuses the attempt as well as the interface hiding it.',
      'A role usually carries a division. The five research divisions are Equity Research, Investment Research, Macroeconomic Research, Portfolio Management and Quantitative Research; the two operating areas are Media and Communication, and Operations. Some roles require a division (an analyst is an analyst OF something), some cannot have one, and the pairing is enforced in the same way in both pages that assign roles.',
      'Access has three levels. Hidden means the subsection never appears in your navigation at all. Interact only means you can open it, read everything on it, and use the light actions that change nothing for anybody else: searching, filtering, sorting, opening a record to read it, downloading a document, registering yourself. Full interact adds creating, editing, deleting and publishing.',
      'On a page you may read but not change, the controls that would change something are faded and cannot be pressed, including by keyboard. This is deliberate and it is not a bug: it tells you what your role is before you fill in a form, rather than after. The boundary itself is on the server, which refuses the same actions whatever the interface does.',
    ],
  },
  {
    id: 'semesters',
    title: 'The semester is the unit of everything',
    body: [
      'The association runs on academic semesters, and almost every register in the workspace is divided by them: the fee collection, the Treasury, the candidate archive, the member snapshot, the dashboard comparisons.',
      'A semester is labelled by its months, for example "Sep-Jan 2026" or "Feb-Aug 2026". The dashboard always compares the current semester with the previous one, which is why a figure that looks low in October is not a judgement: it is a semester that has just started.',
      'Each semester may have a different leadership team, and that is the reason several registers are frozen rather than edited. A closed fee collection, a locked Treasury entry and an archived candidate list are all the same idea: the record of what a previous team did is not something a later team can quietly change.',
    ],
  },
  {
    id: 'two-registers',
    title: 'The member register and the public team page',
    body: [
      'There are two lists of people and they are not the same list. People, Members is the association\'s own roster: everybody with a role, their division, their contact details and their membership status. The public Team page on the website is a projection OF that roster, and it is written automatically.',
      'A member appears publicly only if three things are true at once: their profile is marked to show on the website, their membership status is one that is published, and their role is one the public page carries. Change any of the three and the public page follows within moments. Nobody edits the public list directly, which is what stops the two from disagreeing.',
      'This is why a role change can appear to "not reach the website". It has reached the roster; what is holding it is one of the other two conditions, and both are on the member\'s own record in People, Members.',
    ],
    requires: 'people-members',
  },
  {
    id: 'recruiting',
    title: 'The recruiting round, from the form to the offer',
    body: [
      'A round runs in one direction and crosses four subsections. Recruiting, Form and questions defines what applicants are asked. Recruiting, Applications on website opens and closes the window and sets the dates the public /join page announces. Recruiting, Candidates screening is where the applications are read. Recruiting, Interviews is where slots are published and booked. Recruiting, Offers is where a place is offered and accepted.',
      'A candidacy only ever moves forward. The status dropdown offers stages later than the current one and nothing earlier, and the server refuses a backward move even if the request is constructed by hand. Some statuses email the candidate the moment they are set, and those are marked as such; a confirmation dialog always appears first, and the email cannot be recalled.',
      'The division a candidate is EVALUATED FOR is a separate fact from the divisions they asked for. It starts as their first choice, and for most candidates it stays that and nothing about the process differs. It can be changed to any of the five research divisions or to Media or Operations, which is deliberately wider than the form allows an applicant to ask for. Changing it restarts the selection: the candidate returns to "To be invited", any interview slot they were holding is released, and their own workspace tells them which division is now considering them. A candidacy runs in at most two divisions, so after one change the only move left is back.',
      'Applicants have a workspace of their own, with their status, their interview page and their offer, and it is deliberately narrow: an applicant can reach nothing else, and this is enforced in the navigation, in the route guard and again in the database.',
    ],
    requires: 'applications-screening',
  },
  {
    id: 'events',
    title: 'Events, registration and attendance',
    body: [
      'An event is created in Events, Create event, where its type, date, place and description are set, and where registration is turned on or off. A registration form can be attached from Events, Registration forms so that registrants are asked what the event actually needs to know.',
      'Registered members see the event on their Calendar with a confirmation mark. Attendance is taken afterwards in Events, Attendance, and the finished event moves into Events, Event archive, which offers only the event types it actually contains.',
      'No event can be scheduled during an exam session break or on an Italian public holiday. Those dates are shaded on the Calendar and the restriction is enforced by the database, not only by the form, so it holds for every route into the calendar.',
    ],
    requires: 'events-archive',
  },
  {
    id: 'fees',
    title: 'The membership fee cycle',
    body: [
      'A collection is opened for a semester with an amount and up to two deadlines. Every active dues-paying member appears in it, unpaid. Payments are ticked as they arrive. Closing the collection ends it.',
      'Closing does three things at once and none of them can be undone: it locks the collection, it writes the total to the Treasury as a locked entry, and it freezes the official member register for that semester. Close only when every payment that is going to arrive has been ticked.',
      'The first deadline is shown to everyone who owes the fee, on their Calendar. The second is a grace period and is shown only to those who have not paid once the first has passed. Neither is shown to anyone outside the fee.',
      'Advisors are outside the fee entirely: in no collection, no total, no semester register, and with no fee deadline on their Calendar. Appointing a member as advisor part way through a semester removes the fee they had not yet paid. A payment already banked is never deleted, because the association received the money and the Treasury must still record it, and the collection says so where it happens.',
    ],
    requires: 'ops-fee',
  },
  {
    id: 'treasury',
    title: 'Why the Treasury cannot be edited',
    body: [
      'The cash-flow register is append-only. There is no edit and no delete, for anybody, including the association account. A mistake is corrected by recording a second entry that offsets it and explains why.',
      'That is what makes the register trustworthy across changing leadership teams: the history of what was recorded, and when, survives everyone who recorded it. Entries are grouped by the semester they were executed in, with a net per semester, so each team\'s period reads separately.',
      'Some entries write themselves. Closing a fee collection posts the total; recording a social media advertising spend posts the cost. Those arrive locked, because they are the record of something that happened elsewhere in the workspace.',
    ],
    requires: 'ops-treasury',
  },
  {
    id: 'media',
    title: 'How the media plan fits together',
    body: [
      'The editorial calendar is the plan: what is going out, when, where it goes and in what format, who is responsible, its status and whether it is paid. One item can go to several destinations at once, with its own format in each, because a single piece of work is a single record even when it is a reel on Instagram and a post on LinkedIn.',
      'The libraries beside it hold the material: the Instagram, LinkedIn, graphics and other archives, and the brand and design system that says how the association presents itself.',
      'Advertising and spending is a register of paid promotion. Recording a spend there posts the cost to the Treasury automatically, once, on the date it was incurred, so the media budget and the association\'s accounts cannot drift apart. Editing the description of an existing spend never posts a second time.',
    ],
    requires: 'smm-editorial',
  },
  {
    id: 'website',
    title: 'What the workspace publishes to the public site',
    body: [
      'Several parts of the workspace write directly to minervaims.org, and it is worth knowing which, because the change is immediate and public.',
      'Publishing a report puts it in the public archive. A member\'s profile drives their card on the Team page. Testimonials, the Society timeline, the admissions FAQ and the readings all render straight onto the site. The application window decides what /join says about applying, including the dates it announces.',
      'Page visibility controls which public pages exist at all. Turning a page off removes it from the site and from the navigation that points at it.',
    ],
    requires: 'website-pages',
  },
  {
    id: 'emails',
    title: 'When the workspace sends an email',
    body: [
      'The workspace sends email on its own in a small number of clearly marked situations, and never otherwise. Certain candidate statuses notify the applicant immediately. Offers are sent and resent deliberately. Event registration confirmations go to the registrant. Authentication messages go out when somebody signs up, resets a password or confirms an address.',
      'The templates behind those messages are in Operations, Automatic emails, together with a log of what was sent and whether it arrived. Anything marked as sending an email in a confirmation dialog does exactly that, at once, and it cannot be recalled.',
    ],
    requires: 'ops-auto-emails',
  },
  {
    id: 'finding',
    title: 'Finding things, and getting help where you are',
    body: [
      'The search bar in the header, or Ctrl K (Cmd K on a Mac), is the fastest way anywhere. It finds subsections and help topics, and it also searches inside the workspace: members, alumni, events, reports and the resource libraries. Type a person\'s name and you get the person, not the page they are on. Every result is limited to what your role can open, and no search is even sent for a part of the workspace you cannot reach.',
      'Every page carries a floating question mark that opens the sliding help panel for that page. Many individual controls carry a small circled question mark that opens the panel at the matching topic. Everything in the panel is generated from the same source as this manual, filtered to your role.',
      'A link of the form /workspace/section/subsection, or the older /admin?section=...&sub=..., opens the workspace directly on that subsection provided your role can see it. Several buttons on the public website use those links.',
    ],
  },
  {
    id: 'accountability',
    title: 'What is recorded',
    body: [
      'Every meaningful action is written to the activity log with the role you held at that moment. That includes role changes, publishing, deletions, fee and treasury entries, candidate status changes and manual downloads.',
      'The log exists for accountability across leadership teams, not for supervision of individuals. It is visible only to the roles that can open Settings, Activity log, and advisors are deliberately excluded from it.',
    ],
  },
  {
    id: 'mobile',
    title: 'The workspace on a phone',
    body: [
      'On a phone the workspace becomes a compact shell: sections in a drawer, subsections as chips, and consultation available everywhere.',
      'Some subsections need a full screen to be usable and open on desktop only; they are marked with a monitor icon. Pages that are readable but not editable on a phone carry a ribbon saying so. Nothing is hidden from you on a phone that you can see on a desktop.',
    ],
  },
];

// =====================================================================
// COMMON TASKS. The sequences that cross pages.
// =====================================================================
export interface ManualTask {
  id: string;
  title: string;
  /** Resource key this task belongs to. */
  requires: string;
  /** 'manage' tasks are printed only for somebody who can perform them. */
  level: 'view' | 'manage';
  steps: string[];
  /** One line on what it costs to get wrong. Optional. */
  caution?: string;
}

export const COMMON_TASKS: ManualTask[] = [
  // The everyday ones first, and deliberately at 'view': a manual whose
  // "common tasks" section is empty for anybody without editing rights
  // has failed exactly the reader who needed it most.
  {
    id: 'find-anything',
    title: 'Find anything in the workspace',
    requires: 'welcome',
    level: 'view',
    steps: [
      'Press Ctrl K, or Cmd K on a Mac, from anywhere in the workspace. The search box in the header does the same thing.',
      'Type what you are looking for. It finds subsections and help topics, and it searches inside the workspace: members, alumni, events, reports and the resource libraries.',
      'Type a person\'s name to get the person rather than the page they are on.',
      'Press Enter on a result to go straight to it. Everything offered is something your role can open.',
    ],
  },
  {
    id: 'get-help',
    title: 'Get help on the page you are on',
    requires: 'welcome',
    level: 'view',
    steps: [
      'Press the floating question mark at the bottom right of any workspace page. The help panel slides in with the guidance for that page.',
      'For a specific control, press the small circled question mark beside it. The panel opens at the matching topic.',
      'Everything in the panel is written for your role, so it never describes a button you do not have.',
    ],
  },
  {
    id: 'check-role',
    title: 'Check what your role covers',
    requires: 'my-role',
    level: 'view',
    steps: [
      'Open General, My profile. Your card shows the role and division you hold.',
      'Below it, the role brief describes what the role is responsible for and which parts of the workspace it opens.',
      'For the full picture, open How to use: it lists every subsection you can reach and whether you can change it.',
      'If the role is wrong, contact the President or the association account. You cannot change your own role from any page.',
    ],
  },
  {
    id: 'register-event',
    title: 'Register for an event',
    requires: 'calendar',
    level: 'view',
    steps: [
      'Open the Calendar and find the event. Hovering it shows the details without opening anything.',
      'Click it. Events with registration open show the details and a registration button.',
      'Register. A confirmation mark then appears next to the event on your Calendar.',
      'For an Association on Display day, clicking opens the slot sign-up page instead. Registration closes 48 hours before the day.',
    ],
  },
  {
    id: 'find-report',
    title: 'Find and read a report',
    requires: 'reports-archive',
    level: 'view',
    steps: [
      'Open Reports, Report archive.',
      'Filter by division, semester or type, or search by title. Clear every filter in one press when you are done.',
      'Open the report to read it, or download it. Both are available whatever your role, because reading the research is the point of the archive.',
    ],
  },
  {
    id: 'publish-material',
    title: 'Add material to a platform library',
    requires: 'smm-ig',
    level: 'manage',
    steps: [
      'Open the library the material belongs to: Instagram, LinkedIn, MIMS Graphics or Other resources.',
      'Upload the file, or add the link, with a title that will still mean something to somebody else in six months.',
      'Star the few that are in active use so they stay at the top of the list.',
      'If the material is going out on a date, add it to the Editorial calendar as well, so the plan and the material agree.',
    ],
  },
  {
    id: 'publish-report',
    title: 'Publish a research report',
    requires: 'reports-upload',
    level: 'manage',
    steps: [
      'Open Reports, Upload report.',
      'Attach the PDF. The page count is read from the file; there is nothing to type.',
      'Fill in the title, the date and the division. Division-scoped roles can only upload for their own division.',
      'For a Portfolio Management report, attach it to its fund.',
      'Publish to send it to the archive and the public website, or save as a draft to keep it internal until a Head approves it from the Report archive.',
      'For a fund report, update Reports, Fund performances so the public fund table matches the report.',
    ],
    caution: 'Publishing makes the report visible on the public website immediately.',
  },
  {
    id: 'run-intake',
    title: 'Open a recruiting round',
    requires: 'applications-website',
    level: 'manage',
    steps: [
      'Check the questions first, in Recruiting, Form and questions. They lock automatically once applications are open, so anything that needs changing must be changed now.',
      'Open Recruiting, Applications on website and set the semester label, the opening date and time and the closing date and time.',
      'Confirm on /join that the public page announces what you expect: before the opening it names the day and hour applications open, and while open it names the closing date and says places may fill sooner.',
      'Publish the interview slots in Recruiting, Interviews before the first invitations go out, so an invited candidate has something to book.',
    ],
    caution: 'The window governs the public page and the form together. There is no separate switch.',
  },
  {
    id: 'screen-candidate',
    title: 'Review a candidate',
    requires: 'applications-screening',
    level: 'view',
    steps: [
      'Open Recruiting, Candidates screening and check the semester selector is on the current round.',
      'Read the profile, the CV and the written answers. Opening a CV for the first time advances the candidate\'s status to record that the application has been seen.',
      'Add notes. They are visible to every reviewer and attributed to you, so keep them technical.',
      'Where your role allows it, set the next status. The dropdown only offers stages later than the current one.',
    ],
    caution: 'Statuses marked as sending an email notify the candidate at once and cannot be undone.',
  },
  {
    id: 'move-division',
    title: 'Move a candidate to another division',
    requires: 'applications-screening',
    level: 'manage',
    steps: [
      'In Recruiting, Candidates screening, change the "Evaluated for" column on the candidate\'s row.',
      'Read the confirmation dialog. It lists what will happen before anything does.',
      'Confirm. The candidate returns to "To be invited", any interview slot they held is released, and their own workspace tells them which division is now considering them.',
      'Send the invitation for the new division when you are ready. That is the message the candidate receives; the move itself sends nothing.',
    ],
    caution: 'A candidacy runs in at most two divisions. After one move the only remaining move is back.',
  },
  {
    id: 'create-event',
    title: 'Create an event and take attendance',
    requires: 'events-create',
    level: 'manage',
    steps: [
      'Open Events, Create event and set the type, date, place and description.',
      'Turn registration on if members or guests should be able to register, and attach a registration form from Events, Registration forms if the event needs specific answers.',
      'Check the Calendar: the date must not fall in an exam session break or on an Italian public holiday, and the calendar will refuse it if it does.',
      'After the event, record who came in Events, Attendance.',
      'The event then reads in Events, Event archive.',
    ],
  },
  {
    id: 'collect-fees',
    title: 'Run a fee collection',
    requires: 'ops-fee',
    level: 'manage',
    steps: [
      'Open Operations, Membership fees and open a collection for the semester, with the amount and the first deadline. Add the second deadline if a grace period is being given.',
      'Tick members as their payments arrive.',
      'Check the note under the header for payments held by somebody no longer on the list, which is what explains any gap between the ticks and the banked total.',
      'Close the collection when every payment that will arrive has been ticked.',
    ],
    caution: 'Closing is final. It locks the collection, posts the total to the Treasury and freezes the semester\'s member register.',
  },
  {
    id: 'record-money',
    title: 'Record a movement in the Treasury',
    requires: 'ops-treasury',
    level: 'manage',
    steps: [
      'Open Operations, Treasury and add an entry with the amount, the direction, the description and the date it was executed.',
      'Read the confirmation dialog. There is no edit and no delete afterwards.',
      'To correct a mistake, record a second entry that offsets it and says why.',
    ],
    caution: 'Every entry is permanent and logged.',
  },
  {
    id: 'plan-post',
    title: 'Plan a post that goes to more than one place',
    requires: 'smm-editorial',
    level: 'manage',
    steps: [
      'Open Media and Communication, Editorial calendar and double-click the day it should go out.',
      'Write what is being promoted.',
      'Under "Where it goes", select every destination it goes to. Instagram and LinkedIn together is one item, not two.',
      'Pick the format for each destination separately. The same piece can be a reel on Instagram and a post on LinkedIn.',
      'Set who is responsible and the status, and mark it as paid advertising if it is.',
    ],
  },
  {
    id: 'change-role',
    title: 'Change somebody\'s role',
    requires: 'settings-users',
    level: 'manage',
    steps: [
      'Open Settings, Users and find the person. The list holds workspace accounts; applicants live in Recruiting, Candidates.',
      'Open the role dialog and choose the new role, and its division where the role needs one.',
      'Save. Workspace access changes immediately, and People, Members shows the same record.',
      'If the person should appear on the public Team page, check their profile in People, Members: showing on the website is a separate flag on their own record.',
    ],
    caution: 'You cannot change your own role. Another President or the association account must do it.',
  },
  {
    id: 'read-manual',
    title: 'Get this manual explained by an AI assistant',
    requires: 'welcome',
    level: 'view',
    steps: [
      'Press "Download my manual" at the top of How to use.',
      'Upload the file to an AI assistant, or paste its contents in.',
      'Ask for what you actually need: a summary of your role, a checklist for one task, or a walkthrough of a page you have not used.',
      'The file is generated for your role, so anything it does not mention is something your role cannot do.',
    ],
  },
];

// =====================================================================
// WHAT EACH ROLE IS FOR. In words, not in a grid.
// ---------------------------------------------------------------------
// The permissions table already says which pages a role opens. It cannot
// say what the role is FOR, and a member reading their own manual is
// usually asking the second question.
// =====================================================================
export const ROLE_BRIEFS: Partial<Record<AppRole, string>> = {
  president:
    'The President holds the association. Every subsection is open at full access, including the ones nothing else reaches: granting and removing roles, the role permissions table, the activity log, and sending an offer to a candidate. The presidency is also the only role that can change another President, and it cannot change its own role.',
  vice_president:
    'The Vice President runs the association alongside the President and can reach almost all of it. The deliberate exceptions are the machinery of access itself, which is readable but not editable, and the sending of offers, which stays with the President. Verification of the fee collection is a Vice President responsibility.',
  head_of_asset_management:
    'The Head of Asset Management leads the research effort across every division: the reports, the templates, the fund performances and the recruiting of researchers. Candidate screening is open for every division regardless of what the applicant asked for, because the Head is choosing where a person fits. The media and operations sections are readable, so the Head can see what is being published and what the association is spending, without editing either.',
  head_of_division:
    'A Head of Division leads one research area. Reports, templates and the archive are managed for that division; candidates are screened for every division, because a Head has to be able to see the whole pool to argue for somebody. The Treasury is readable, because leading an area means knowing the association\'s position, but recording a movement belongs to the Board and to Operations.',
  portfolio_manager:
    'A Portfolio Manager runs a fund. The fund performances are theirs to maintain, and they feed the public fund pages directly. Reports of their own division are read, templates managed, and candidates viewed with notes rather than status changes: a Portfolio Manager contributes to a selection they do not run.',
  team_leader:
    'A Team Leader leads a team inside a division. Templates are managed, the report archive read, and candidates viewed with notes rather than status changes. The public Members page prints Team Leaders as Team Leaders, which is a rank of the association in its own right.',
  senior_analyst:
    'A Senior Analyst writes research and maintains the templates their team works from. Most of the association is readable rather than editable, which is the point: the work is the research.',
  analyst:
    'An Analyst writes research. The archive, the templates, the people registers and the readings are all readable, and the Dashboard shows how the division is doing against the semester before.',
  head_of_media:
    'The Head of Media and Communication owns everything the association says publicly outside its research: the editorial calendar, the platform libraries, the brand and design system, and the paid advertising register. External relations and the statute and documents are managed here too, because an announcement of a partnership cannot be drafted from a summary of it.',
  media_analyst:
    'A Media Analyst produces the material: the Instagram, LinkedIn, graphics and other libraries are theirs to manage. The editorial calendar, the brand system and the advertising register are read rather than edited, because the plan and the budget belong to the Head.',
  head_of_operations:
    'The Head of Operations runs the association\'s machinery: the calendar, the events, the member register, the fee collection, the Treasury, the external relationships and the documents. Several parts of the public website are managed here as well, including the testimonials, the Society timeline and the admissions FAQ.',
  advisor:
    'An Advisor is an alumnus appointed to advise the association. Every section and every subsection is open, read-only, because advice given without sight of the work is not worth much. Two things are deliberately different: Settings is closed entirely, since an outside adviser has no business in the association\'s access control or its audit trail, and the advisor\'s own profile is theirs to edit. Advisors are outside the membership fee in every respect.',
  alumni:
    'An alumnus keeps a profile, the Dashboard and the Calendar. The alumni directory on the public site and the alumni calls are where the relationship with the association continues.',
};

// =====================================================================
// THE WORDS THE WORKSPACE USES.
// =====================================================================
export interface GlossaryTerm { term: string; definition: string; requires?: string }

export const GLOSSARY: GlossaryTerm[] = [
  { term: 'Subsection', definition: 'One page of the workspace. The navigation is sections holding subsections, and access is granted per subsection, not per section.' },
  { term: 'Interact only', definition: 'You can open the page, read all of it and use the actions that change nothing for anybody else: search, filter, sort, open a record, download, register yourself. Everything that would change something is faded and inert.' },
  { term: 'Full interact', definition: 'Interact only, plus creating, editing, deleting and publishing on that page.' },
  { term: 'Division', definition: 'One of the five research areas (Equity, Investment, Macroeconomic, Portfolio Management, Quantitative) or one of the two operating areas (Media and Communication, Operations).' },
  { term: 'Division scoping', definition: 'On the report pages, several roles see only their own division\'s data. Heads of Division and the Head of Asset Management can look across divisions; analysts, senior analysts, team leaders and portfolio managers see their own.' },
  { term: 'Membership status', definition: 'Whether a person is an active member, and one of the three conditions that decide whether they appear on the public Team page.', requires: 'people-members' },
  { term: 'Evaluated for', definition: 'The division actually assessing a candidate, as opposed to the two divisions the candidate asked for. It decides which emails they receive, which interview calendar they can book and which division sends an offer.', requires: 'applications-screening' },
  { term: 'Semester label', definition: 'The name of an academic semester, such as "Sep-Jan 2026". It groups the fee collection, the Treasury, the candidate archive and the member snapshot.' },
  { term: 'Exam session break', definition: 'A protected date range during which no event, interview slot, Association on Display day, alumni call, meeting or social can be scheduled anywhere in the workspace. Deadlines and reminders remain possible.', requires: 'calendar' },
  { term: 'Association on Display', definition: 'The recurring day on which the association presents itself, with time slots members sign up for. Registration closes 48 hours before the day.', requires: 'events-on-display' },
  { term: 'Locked entry', definition: 'A Treasury entry written by the workspace itself, from a fee collection closing or an advertising spend being recorded. It is the record of something that happened elsewhere and cannot be altered here.', requires: 'ops-treasury' },
  { term: 'Advisor', definition: 'An alumnus appointed to advise the association. Reads everything, changes nothing but their own profile, has no access to Settings, and is outside the membership fee entirely.' },
  { term: 'Activity log', definition: 'The record of every meaningful action with the role held at that moment. It exists for accountability across leadership teams.' },
  { term: 'Deep link', definition: 'A link that opens the workspace on a specific subsection, provided your role can see it.' },
];

// =====================================================================
// WHEN SOMETHING LOOKS WRONG.
// ---------------------------------------------------------------------
// Every one of these is a question the association has actually asked.
// The answers are the real mechanism, not a suggestion to try again.
// =====================================================================
export interface ManualAnswer { question: string; answer: string; requires?: string }

export const TROUBLESHOOTING: ManualAnswer[] = [
  {
    question: 'A page opens but there is nothing on it.',
    answer: 'If the page is one your role can only read, it is probably empty because it genuinely is. If you believe there should be data, say which page and which role: the workspace decides what you may open and what data you may load from one shared table of permissions, so the two cannot disagree, and a page that opens with no data is worth reporting rather than working around.',
  },
  {
    question: 'A button is faded and will not respond.',
    answer: 'Your role can read that page but not change it. This is the intended behaviour and it is deliberate: the alternative is a button that looks live, a form you fill in, and a refusal at the end. Everything that only changes what you see stays live, including search, filters, downloads and opening a record.',
  },
  {
    question: 'I changed a role and the public website has not caught up.',
    answer: 'The role has changed; the public Team page has three conditions, not one. The person must be marked to show on the website, their membership status must be one that is published, and their role must be one the public page carries. All three are on their record in People, Members.',
    requires: 'people-members',
  },
  {
    question: 'I cannot change my own role.',
    answer: 'Correct, and there is no page anywhere that will let you. Another President or the association account has to do it. The rule is enforced on the server as well as in the interface.',
  },
  {
    question: 'The calendar refuses a date.',
    answer: 'It falls in an exam session break or on an Italian public holiday. Both are shaded on the Calendar, and the restriction is enforced by the database, so no route into the calendar accepts one.',
    requires: 'calendar',
  },
  {
    question: 'I recorded a Treasury entry with the wrong amount.',
    answer: 'Record a second entry that offsets it and explains the correction. There is no edit and no delete, for anybody, and that is what makes the register worth trusting.',
    requires: 'ops-treasury',
  },
  {
    question: 'A candidate was moved to the wrong division.',
    answer: 'Move them back. That is always available. A third division is not offered, because a candidacy runs in at most two selection processes, and both moves are recorded in the activity log.',
    requires: 'applications-screening',
  },
  {
    question: 'An error message says something went wrong but not what.',
    answer: 'Report the exact wording. The workspace shows the reason a server gives rather than a status code, so a message that explains nothing is a fault worth fixing rather than something to live with.',
  },
];
