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
      'After the interview, the President or the Vice President may hold a short phone call with the candidate, in Recruiting, Phone calls: about knowing the Society as a whole, never a technical conversation about markets. The invitation, the booking and the outcome move the candidate on by themselves (Phone call invitation sent, Phone call booked, On hold after phone call); Pass selects the candidate for an offer, Hold keeps them waiting, Decline rejects them with the post-interview email. Article 5 of the Statute gives the decision on an application to the Head of Division, so a Decline is best agreed with the Head of the division that interviewed the candidate.',
      'While "Before accepting an offer" is switched on (Recruiting, Application Page), accepting an offer also means signing the one-association declaration, as a separate signature with the typed name, recorded with the time. The signer receives a short email confirming it; there is no PDF and no countersignature.',
      'Applicants have a workspace of their own, with their status, their interview page, their phone call page and their offer, and it is deliberately narrow: an applicant can reach nothing else, and this is enforced in the navigation, in the route guard and again in the database.',
    ],
    requires: 'applications-screening',
  },
  {
    id: 'commitment',
    title: 'The semester commitment and the one-association declaration',
    body: [
      'Every semester, once the application window opens, every active member except Advisors is asked whether they can commit to the Society for that semester: active participation, as Article 8 of the Statute asks of every member. The request arrives by email and waits on My Profile, Commitment (which also works on a phone), with a line on the Dashboard, until it is answered. The answer is a signature: the text, a box ticked and the full name typed, with the time recorded and a copy emailed. Somebody who has not answered after a few days receives one reminder, and only one; both emails are marked on the request as they go, so neither is ever sent twice. A member who cannot commit is contacted by the Board about what it means, for example a semester of leave (Article 9).',
      'The one-association declaration says that a member is not a member of another Bocconi student association in the categories Management, Finance, or Economics and Social Sciences of Bocconi\'s list of student associations, as the list stands at the time. The list is Bocconi\'s own and the declaration links to it, so an association created later is covered once Bocconi lists it. It is not in the Statute: it is a condition of membership approved by the Board of Directors. Three switches on Recruiting, Application Page decide where it is asked for: before accepting an offer, with the semester commitment, and whether the Join page explains it. All three are off until somebody turns them on. Each time it is a separate signature in the Workspace, exactly like accepting an offer, and the signer receives a short email confirming it. Nothing is printed and nobody countersigns.',
      'Every signature keeps the version of the text it was given and its SHA-256 fingerprint, so a signature can never be read against words it was not given. The Board (the President, the Vice President, the Head of Asset Management, the Heads of Division, the Head of Media and Communication and the Head of Operations) sees each member\u2019s answer in People, Members, with the completion by division.',
    ],
  },
  {
    id: 'events',
    title: 'Events, registration and attendance',
    body: [
      'An event is created in Events, Create event, where its type, date, place and description are set, and where registration is turned on or off. A registration form can be attached from Events, Registration forms so that registrants are asked what the event actually needs to know.',
      'Registered members see the event on their Calendar with a confirmation mark. Attendance is taken afterwards in Events, Attendance, and the finished event moves into Events, Event archive, which offers only the event types it actually contains.',
      'An online event\'s meeting link is private. It is typed where the place goes, but kept apart from the event: only the people holding a place receive it, in their confirmation email, again in the "See you tomorrow" email the day before, and as a Join button on their Dashboard, in My events and in the Calendar. Everybody else, in the workspace and on the public website, sees "Online", so the way in is to register.',
      'Each member follows their own record in Events, My events: the events open for registration, registered for or cancelled in one click, and the semester\'s events held so far with attendance taken, each attended or missed, counted exactly as People, Members counts them.',
      'A company visit with registration on gives its places by selection. Until its interest form closes, members and alumni register their interest with their CV; the President and the Vice President then choose who goes, in Events, Attendance, solely on each person\'s active participation in the Society\'s activities (counted from the attendance lists) and their demonstrated interest in the topic of the visit. The CV plays no part in the selection; only the CVs of the members invited may be sent to the host, when the host asks, and every CV is deleted six months after the visit. Everybody is told at once: the invited receive their entry code, the others are kept as reserves, and a place that opens up can be offered to a reserve.',
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
    id: 'internal-forms',
    title: 'How forms work',
    body: [
      'A form collects something from the Society\'s active members, from guests outside the Society, or from both: an order, a sign-up, interest in a company visit. It is built in Operations, Forms by the President, the Vice President, the Head of Operations or the Operations Analyst, from a blank page or from a starter, with any of twelve kinds of question, photos and documents included. A cover picture, pictures between questions and a picture on each choice show people what they are ordering.',
      'Who can answer is set on each form. Members only: active members answer from their account. Guests only: anyone with the link answers with their full name and email, no account needed; the form is not listed anywhere on the site. Members and guests: both. A guest answers once per email address and receives a receipt with a private link, the only way back to their answer; guests never see questions that ask for a file, and a hidden check with a limit per connection keeps automated spam out. Guests\' details are used only for the form and its receipt.',
      'A form can let one answer hold more than one item, up to five: under the questions, "Want another one?" asks the questions again for a second hoodie, a third, each with its own answers. The organisers choose which questions are asked again for each item (all but agreements, to start with). A fixed amount counts for each item, and priced choices for each item that picks them.',
      'A choice question can ask how many of each, by size if sizes are listed, and each choice can carry a price: the member sees the total as they answer, and their answer keeps what it came to. Any question can be shown only for some answers to a question above it; while hidden it is never required.',
      'A form is a draft until it is opened, and only organisers can see a draft. Once open, every active member who has not answered a form for members finds it on their Dashboard, in the place of Research by division (several forms make a stack to swipe through), and its link opens it after signing in; a form for guests opens from its link straight away. A deadline closes it by itself; the organisers can close and reopen it at any time. Of the Society\'s accounts, active members and advisors can answer a form for members; candidates, pending accounts, alumni and members on temporary leave cannot.',
      'Each person answers once and receives a receipt email with a copy of their answers. If the form allows it, they can change their answers while it is open. Where the form collects a payment, people see the amount and how to pay, and organisers tick each payment as it arrives; the Treasury is not changed by those ticks.',
      'The answers are read in a summary that counts every choice (every item of every answer) and totals every number, or in a table with search, a payment filter and a choice of columns, where an answer with several items lists each one on its own numbered line. They are exported as Excel or CSV with exactly the answers and columns chosen, one row per answer or one row per item, the attached files alongside as a ZIP. Answers and files are kept until the form is deleted.',
    ],
    requires: 'ops-forms',
  },
  {
    id: 'media',
    title: 'How the media plan fits together',
    body: [
      'The editorial calendar is the plan: what is going out, when, where it goes and in what format, who is responsible, its status and whether it is paid. One item can go to several destinations at once, with its own format in each, because a single piece of work is a single record even when it is a reel on Instagram and a post on LinkedIn.',
      'The libraries beside it hold the material. Social Templates brings together the Instagram, LinkedIn and Other Resources libraries as three tabs of one page; MIMS Graphics holds the Society\'s graphic assets; and the Design System says how the association presents itself. Every library works the same way: search, type filters, pictures shown as pictures, bulk upload and ZIP downloads.',
      'Advertising and spending is a register of paid promotion. Recording a spend there posts the cost to the Treasury automatically, once, on the date it was incurred, so the media budget and the association\'s accounts cannot drift apart. Editing the description of an existing spend never posts a second time.',
    ],
    requires: 'smm-editorial',
  },
  {
    id: 'website',
    title: 'What the workspace publishes to the public site',
    body: [
      'Several parts of the workspace write directly to minervaims.org, and it is worth knowing which, because the change is immediate and public.',
      'Publishing a report puts it in the public archive and gives it its own permanent page; the fund returns typed in Fund performances drive the fund pages and /track-record. A member\'s profile drives their card on the Team page. Testimonials, the Society timeline, the admissions FAQ and the readings all render straight onto the site. The application window decides what /join says about applying, including the dates it announces.',
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
      'Every email follows one layout, in light and dark mode and on any screen: the key facts in one block and one button for what the reader will most likely do next. Only the optional ones (reminders to register for an event, the thank-you after one) can be unsubscribed from, and doing so stops those alone.',
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
      'Every change made in the workspace, by anybody, is written to the activity log with the role you held at that moment: creating, editing and deleting anything, ticking attendance, saving your own GPA comparisons or calendar entries, an applicant\'s application and offer answer. So are the downloads that matter: CSV and spreadsheet exports, candidates\' CVs and written answers, files attached to Forms answers, certificates and the greenbook. Each is recorded once, by the server where it happens. Entries are kept for ninety days.',
      'The log exists for accountability across leadership teams, not for supervision of individuals. It is visible only to the roles that can open Settings, Activity log, and advisors are deliberately excluded from it.',
    ],
  },
  {
    id: 'mobile',
    title: 'The workspace on a phone',
    body: [
      'On a phone the workspace becomes a compact shell: sections in a drawer, subsections as chips, and every page your role can open available to read.',
      'Nothing is withheld on a phone that you can see on a computer, and nothing can be edited from one, with four exceptions done away from a desk: Events, Attendance, taken at the door; Career, GPA converter and Brainteasers, whose saved averages and training record are your own; and My Profile, Commitment, where you answer the semester commitment from the email that asks for it. Everywhere else every editing control is put beyond reach, for every role. Reading, searching, filtering, previewing a document and downloading keep working, and a ribbon at the top of each page says so. Pages built for a wide screen keep all their columns and are dragged sideways rather than trimmed.',
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
    id: 'career-cv',
    title: 'Prepare your CV with the Minerva template',
    requires: 'career-cv',
    level: 'view',
    steps: [
      'Open Career, CV & Cover Letter, on the CV tab, and read the template in the preview on the right.',
      'Press Download the CV template and open the .docx in Word, Pages or Google Docs.',
      'Follow the guidance in the document, remove every bracket, keep the GDPR line in the footer, and export a one-page PDF named Name_Surname_CV.pdf.',
      'For the cover letter, switch to the Cover letter tab on the same page and do the same with its template.',
    ],
    caution: 'The templates are for Minerva members only: do not forward them or publish them.',
  },
  {
    id: 'alumni-call',
    title: 'Plan and run an alumni call',
    requires: 'events-alumni-calls',
    level: 'manage',
    steps: [
      'In Events, Create Event, choose the type Alumni call (the Heads of Division and the Head of Asset Management see only this type).',
      'Choose who organises it, a research division or the Board; the title follows unless you type your own.',
      'Add two to five alumni: search the alumni directory by name or company, or type somebody who is not in it and press Add by hand. Fill in their current position and company, and their role and division at Minerva; the line under each shows how the website will introduce them.',
      'Set the status (Planned, Invited, Accepted), the responsible person and any internal notes.',
      'If the date is not fixed yet, switch on Date to be confirmed: the call is saved as a plan, off the website and out of the Calendar. Otherwise set the start, and the meeting link for an online call.',
      'Add the poster, open registration if members should register, and choose whether it is listed on the website. Create the alumni call.',
      'As the call moves on, open it from Events, Event Archive (filter by Alumni call) and update it: the status, the alumni, and the date once it is fixed. After the call, mark it Completed and take its attendance in Events, Attendance (from the Teams report, for an online call).',
    ],
    caution: 'The date, the time and the meeting link of an alumni call are internal: the website lists the call without them. Keep them out of the description.',
  },
  {
    id: 'teams-attendance',
    title: 'Record an online event\'s attendance from Teams',
    requires: 'events-attendance',
    level: 'manage',
    steps: [
      'After the call, the organiser of the Teams meeting opens it in the Teams Calendar (or its chat), goes to Attendance and presses Download: a .csv file is saved.',
      'In Events, Attendance, choose the online event and press Attendance from Teams. Choose the file, or drop it on the box.',
      'Check the list: members recognised by email are certain, by name in amber are worth a glance; guests are everyone else. Untick anybody who should not count, or choose a shortest stay in Count.',
      'Press Record. Members on the list are ticked, the others added; guests are added without being put on the newsletter.',
    ],
    caution: 'Only for online events, and only while the list is open (until the end of the semester). If the page says the report is for another day, check you chose the right event.',
  },
  {
    id: 'career-about',
    title: 'Write your LinkedIn About section',
    requires: 'career-linkedin',
    level: 'view',
    steps: [
      'Open Career, LinkedIn and press Copy prompt on the About Section card.',
      'Open an AI chat, attach your CV as a PDF, paste the prompt and send it.',
      'Correct anything that is not true or does not sound like you, then paste it into About on LinkedIn.',
    ],
    caution: 'What you attach is sent to the AI service you use. Choose one you trust.',
  },
  {
    id: 'career-brainteasers',
    title: 'Train on brainteasers',
    requires: 'career-brainteasers',
    level: 'view',
    steps: [
      'Open Career, Brainteasers. Narrow the list by type, by firm and by where you stand, or search it.',
      'Open a question and try it on paper first; then press Show the solution and compare.',
      'Say how it went: Solved on my own, or Needed the solution. Flag it as hard to come back to it, and keep a note if it helps.',
      'Press Random for a question from the list you have not done yet; check My progress to see which types and firms need work.',
    ],
    caution: 'Solutions open one at a time, up to 40 new ones an hour. The greenbook is the only download, and every copy carries your name.',
  },
  {
    id: 'career-average',
    title: 'Work out your average and what the next exam needs',
    requires: 'career-gpa',
    level: 'view',
    steps: [
      'Open Career, GPA Converter and choose Weighted average.',
      'Enter each course with its credits and its grade, adding rows as needed.',
      'Under The next exam, enter its credits and the average you are aiming for: the page tells you the grade you need and what every other grade would do.',
      'Name the calculation and press Save to keep it in your account; compare it later under Saved.',
    ],
  },
  {
    id: 'career-files',
    title: 'Update a Career template, the portrait background or the wallpapers',
    requires: 'career-linkedin',
    level: 'manage',
    steps: [
      'From a computer, open the Career page concerned: CV & Cover Letter (on the tab of the template to change) or LinkedIn.',
      'For a template, use the Replace panel at the foot of the left column. For the portrait background or the wallpapers, press Manage on the card: upload a new background, or add, rename and remove wallpapers.',
      'The change reaches every member at once. Check the preview afterwards.',
    ],
    caution: 'A replaced file is gone for everybody: keep your own copy of the previous version.',
  },
  {
    id: 'check-role',
    title: 'Check what your role covers',
    requires: 'my-role',
    level: 'view',
    steps: [
      'Open My Profile, Personal Information. The band at the top shows the role and division you hold.',
      'The card named after your role describes what it is responsible for, who you report to and your rights; Promotion, under it, says where the role leads and what the Statute requires.',
      'For the full picture, open How to use: it lists every subsection you can reach and whether you can change it.',
      'If the role is wrong, contact the President or the association account. You cannot change your own role from any page.',
    ],
  },
  {
    id: 'membership-certificate',
    title: 'Download your certificate of membership',
    requires: 'my-role',
    level: 'view',
    steps: [
      'Open My Profile, Membership. Active members see the Membership certificate card, and so do former members listed among the alumni; anybody else reads there why they cannot download one.',
      'Press Download PDF. The certificate states your name, your current role and the semester, and is signed by the President and the Vice President on behalf of the Board of Directors. For an alumnus, it states the role held in the last semester served, and that you were a member.',
      'Share the PDF. Whoever receives it can check its number or scan its QR code at minervaims.org/verify, without an account.',
    ],
    caution: 'A member\'s certificate is for the role held now, this semester: after a change of role, download it again. A certificate stays valid while its holder is a member or an alumnus.',
  },
  {
    id: 'commitment-answer',
    title: 'Answer the semester commitment',
    requires: 'my-role',
    level: 'view',
    steps: [
      'Open the email\u2019s button, or My Profile, Commitment: the commitment waits at the top of the page, and as a line on your Dashboard. It works on a phone too.',
      'Choose I confirm my commitment for this semester, or I cannot commit this semester, and read the text that appears.',
      'Tick the box and sign by writing your full name, first name and surname.',
      'If the Board asks for the one-association declaration, confirming shows it beside the commitment: read it, tick its own box and write your name again. It is a separate signature.',
      'Press Sign and send. A short receipt arrives by email (a second one if you also signed the declaration), and what you signed is listed under What you have signed, on the same page, where Read shows the text.',
    ],
    caution: 'An answer cannot be changed from the workspace. If your situation changes during the semester, write to the Board.',
  },
  {
    id: 'withdraw-certificate',
    title: 'Withdraw a certificate of membership',
    requires: 'settings-certificates',
    level: 'manage',
    steps: [
      'Open Settings, Certificates and find the certificate by its number or the holder\'s name. Filter by semester or status to narrow the list.',
      'Press Withdraw and write the reason: it is recorded with your name and shown to the holder on their profile.',
      'Confirm. Anybody who checks the number at minervaims.org/verify now reads that it is no longer valid, and the holder cannot download a new one for that role and semester.',
      'If it was a mistake, press Restore on the same row: the certificate is valid again, with the same number.',
    ],
    caution: 'Withdrawing takes effect publicly at once. Both actions are recorded in the activity log.',
  },
  {
    id: 'register-event',
    title: 'Register for an event',
    requires: 'calendar',
    level: 'view',
    steps: [
      'Open the Calendar. "Register for events", at the top, lists every upcoming event you can still sign up for, soonest first, with the day, the time, the place, who it is open to and the places left.',
      'Press Register beside the event. That is all: your details come from your account. Press the event\'s name first if you want to read the details.',
      'Your confirmation email arrives with your entry code (a QR code) and Add to calendar. The event moves to "Your upcoming events" and shows a green tick on the calendar.',
      'If the event is full the button reads Join the waiting list: you are registered and emailed at once if a place opens up.',
      'For an online event, once you hold a place a Join button appears on the event, on your Dashboard and in Events, My events; the link is also in your confirmation email and in the day-before email. Nobody without a place sees it.',
      'Events, My events offers the same Register and Can\'t make it buttons, beside your record of the semester\'s events.',
      'Can\'t make it? Open the event and press Cancel, so your place goes to somebody else. "How registration works" explains the four steps from the button to the door.',
      'For an Association on Display day, its panel opens the slot sign-up page instead. Registration closes 24 hours before the day.',
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
    requires: 'smm-social',
    level: 'manage',
    steps: [
      'Open the library the material belongs to: Social Media, Social Templates (the Instagram, LinkedIn or Other Resources tab), or MIMS Graphics.',
      'Drop the files anywhere on the page, or press Upload files and choose them: several at once is fine. Each is listed with a title read from its name; change any title that would not mean something to somebody else in six months.',
      'Press Upload. Each file shows its own progress and becomes its own item; one that fails keeps its place with the reason and Retry.',
      'For a caption, a link or a post that needs its text beside its pictures, use New item instead, or open an item and Edit it to add the caption.',
      'Pin the few that are in active use so they stay at the top of the library.',
      'If the material is going out on a date, add it to the Editorial calendar as well, so the plan and the material agree.',
    ],
  },
  {
    id: 'find-file',
    title: 'Find a file and take it with you',
    requires: 'reports-templates',
    level: 'view',
    steps: [
      'Open the library: Reports, Templates & repositories (or any other library, they all work the same way).',
      'Type part of its title, its file name or who added it into the search. Narrow with a type chip, such as Spreadsheets, or a division.',
      'Open the item to preview the file full screen, copy its text or open its link.',
      'Download it from the row, or tick several items and press Download as ZIP to take them all at once.',
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
    id: 'report-details',
    title: 'Give a report its authors, tags and type',
    requires: 'reports-archive',
    level: 'manage',
    steps: [
      'Open Reports, Report archive. To find reports that need it, choose No authors, No summary or No type under Missing details.',
      'Press the pencil on a report.',
      'Choose the type, or leave it to follow the division. Add tags, pressing Enter after each.',
      'Add the authors in the order of the cover: type part of a name and pick the person from Members or Alumni to link them, or add the name as typed. Write each role, for example Lead Analyst.',
      'Update the file. The details are written into the PDF and show at once on the report page reached from the archive; the copy that opens from a link or a search result, which search engines and AI tools read, follows at the next Publish of the website.',
      'To give several reports the same type or tags, tick them, press Edit selected, and apply.',
    ],
    caution: 'Names and roles only: never copy an email address or a phone number from a cover.',
  },
  {
    id: 'pdf-details',
    title: 'Bring the PDFs\' own details up to date',
    requires: 'reports-archive',
    level: 'manage',
    steps: [
      'Open Reports, Report archive, and press Check the PDFs under PDF details.',
      'Read the result: how many PDFs are up to date, how many differ from their report page, and any stored elsewhere that cannot be changed.',
      'Press Update, read what will happen, and confirm. The PDFs are updated a few at a time, with a progress bar.',
      'Any PDF that could not be updated is listed with the reason; the rest carry their page\'s title, authors, summary and tags.',
    ],
    caution: 'The pages of each PDF are not changed, and the file exactly as it was uploaded is kept in a private copy.',
  },
  {
    id: 'fund-month',
    title: 'Add a month of fund returns',
    requires: 'reports-funds',
    level: 'manage',
    steps: [
      'Open Reports, Fund performances, on Monthly returns.',
      'Press the pencil on the current year of the fund (or Add year in January).',
      'Type the month\'s return, net, in %, and save.',
      'Check the shaded columns: the year to date, the inception to date, the volatility and, for a full year, the Sharpe ratio are recomputed from the months.',
      'Nothing to do for the €STR: it fills itself from the ECB every morning, so the Sharpe ratio has its risk-free rate for every complete month. If a month is missing, press Fill the €STR from the ECB now in References.',
    ],
    caution: 'Inside the site the fund pages and /track-record show the new figures at once; the copy that opens from a link or a search result, which search engines and AI tools read, follows at the next Publish of the website.',
  },
  {
    id: 'division-page',
    title: 'Write your division\'s page',
    requires: 'reports-divisions',
    level: 'manage',
    steps: [
      'Open Reports, Division pages, and choose the division if you can edit more than one.',
      'Write Standards, Review and Tools and data in plain sentences. Leave a part empty to hide it.',
      'Tick up to three published reports for Flagship work, in the order they should appear.',
      'Save. Inside the site the division page shows the blocks at once; the copy that opens from a link or a search result follows at the next Publish of the website.',
    ],
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
    id: 'phone-call',
    title: 'Hold the phone calls after the interviews',
    requires: 'applications-calls',
    level: 'manage',
    steps: [
      'In Recruiting, Phone calls, open your slots under Open call slots: the day, the time you have, the length of each call (15 minutes unless you choose otherwise), how many candidates per slot, and the number you will call from. The number is shown to the candidate with their booking.',
      'Under To invite, press Invite to a call beside each candidate whose interview has been held. They receive the invitation and have 72 hours to book; a reminder goes after 24 hours if they have not.',
      'Booked calls appear under Upcoming calls, by day, with each candidate\u2019s number. You receive an email for each booking, with Add to calendar links; the candidate receives a reminder 30 minutes before.',
      'Call the candidate at the time booked, on the number in their application.',
      'Press Record outcome: Pass selects them for an offer, Hold keeps them waiting, Decline rejects them with the post-interview email. Your notes go into the candidate\u2019s notes.',
      'Send the offers from Recruiting, Offers.',
    ],
    caution: 'Decline sends the rejection at once and cannot be recalled. Article 5 of the Statute gives the decision on an application to the Head of Division: agree a Decline with the Head who interviewed the candidate first.',
  },
  {
    id: 'declaration-switches',
    title: 'Ask for the one-association declaration',
    requires: 'applications-website',
    level: 'manage',
    steps: [
      'Open Recruiting, Application Page. Under One-association declaration there are three switches, all off to begin with.',
      'Before accepting an offer: switch it on to make the declaration part of accepting an offer. Confirm in the dialog. From then on Recruiting, Offers shows each new joiner as Signed, or Missing if they joined without it.',
      'With the semester commitment: switch it on to have members sign it when they confirm their commitment. Confirm in the dialog; the commitment emails then mention it.',
      'Explained on the Join page: switch it on to add the section One association at a time to /join. The preview under the switches shows exactly what it will say.',
      'Read who has signed in Settings, Declarations.',
    ],
    caution: 'Each switch takes effect at once. Switching one off never deletes a signature already given.',
  },
  {
    id: 'commitment-launch',
    title: 'Run the semester commitment',
    requires: 'settings-declarations',
    level: 'manage',
    steps: [
      'In Settings, Declarations, check "Launch with the application window from" (the first semester the commitment runs in) and the days before "The one reminder". Press Save if you change them.',
      'Decide whether members sign the one-association declaration with the commitment: the switch With the semester commitment is on Recruiting, Application Page. While it is on, confirming the commitment signs the declaration too, as a separate signature.',
      'Press Send me a test of the emails to read the four emails in your own inbox.',
      'Open the application window in Recruiting, Application page. Within the hour every active member except Advisors receives the request. To start earlier, press Launch the commitment now.',
      'Follow the answers in People, Members: the Commitment column and the completion by division. The one reminder goes by itself to those who have not answered.',
    ],
    caution: 'A semester\u2019s commitment is launched once and emails every active member at once. It cannot be recalled.',
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
      'Type the start and end on Rome\'s clock: the event is shown everywhere as, for example, 6:30 pm to 8:00 pm CEST.',
      'After the event, record who came in Events, Attendance.',
      'The event then reads in Events, Event archive.',
    ],
  },
  {
    id: 'company-visit',
    title: 'Run a company visit',
    requires: 'events-create',
    level: 'manage',
    steps: [
      'In Events, Create Event choose the type Company visit, set the start and the place, switch on Collect expressions of interest, and set the places to what the host can welcome.',
      'Check when the interest form closes: the suggestion is 11:59 pm a week before the visit, the latest that leaves time to choose and to tell everyone. It can be changed later in Events, Registration forms.',
      'Share the visit\'s page: members and alumni sign in and attach their CV. Each receives an email saying their interest has arrived.',
      'President or Vice President: in Events, Attendance choose the visit. Selection lists everyone interested with their participation record; mark each one Invite, Not this time or Undecided. Nothing is sent yet.',
      'Once the form has closed (or after Close the form now), press Send decisions: the invited receive their invitation and entry code and appear on the door list; the others receive a kind "not this time" and are kept as reserves.',
      'If an invited member writes to say they cannot come, press Record a withdrawal on their row, then Offer a place on a reserve: they are emailed "A place has opened up".',
      'If the host asks for the CVs, download Invited CVs (ZIP) and send them to the host only. On the day, check people in as for any event.',
    ],
    caution: 'Participants are selected solely on their active participation in the Society\'s activities and their demonstrated interest in the topic of the visit; the CV plays no part. The CVs of the people not selected are never shared, and every CV is deleted automatically six months after the visit.',
  },
  {
    id: 'company-visit-interest',
    title: 'Ask to take part in a company visit',
    requires: 'events-mine',
    level: 'view',
    steps: [
      'Open the visit from the website, the Calendar or Events, My events, and press Register your interest.',
      'Attach your CV (PDF, up to 10 MB), confirm you have read how participants are selected, and send it. An email confirms that your interest has arrived: it is not yet a place. You can replace the CV while the form is open.',
      'After the form closes everybody is told at the same time: Invited, with your entry code, or Reserve, if there were more requests than places. A reserve is emailed at once if a place opens up.',
      'Invited and can no longer come? Write to as.minerva@unibocconi.it as soon as possible, so that your place can go to another member.',
    ],
    caution: 'Your CV does not count towards the selection, which looks at your participation in the Society\'s activities and your interest in the topic of the visit. Forfeiting a place and not attending is a severe offence towards the other interested members.',
  },
  {
    id: 'stop-event-reminders',
    title: 'Stop the reminders to register for events',
    requires: 'events-mine',
    level: 'view',
    steps: [
      'At the foot of any reminder to register for an event, press Unsubscribe from these emails.',
      'On the page that opens, press Stop event reminders. The thank-you notes after events stop too.',
      'Everything you need still arrives: the confirmation and entry code of an event you register for, and every email about your application, your forms and your membership fee.',
    ],
    caution: 'Stop every email from the Society instead is offered on the same page, and stops all of them, the confirmations included.',
  },
  {
    id: 'event-places',
    title: 'Limit the places of an event',
    requires: 'events-forms',
    level: 'manage',
    steps: [
      'Open Events, Registration forms. With registration on, type the number of places next to Places and press Save (or set it in Create event).',
      'Once it is full, the registration page offers Join the waiting list, and each person who joins receives an email with their position.',
      'When somebody cancels from the link in their email, or you remove a row in Attendance, the first person waiting is registered and emailed their ticket at once.',
      'To remove the limit, empty the field and press Save: everybody waiting is given a place.',
      'Use Test the registration emails to see the four emails in your own inbox before the event.',
    ],
    caution: 'Leave Places empty for no limit: that is the default, and nothing changes for such an event. Nothing moves once the event has started.',
  },
  {
    id: 'scan-tickets',
    title: 'Check people in at the door',
    requires: 'events-attendance',
    level: 'manage',
    steps: [
      'Open Events, Attendance on a phone or a laptop and choose the event.',
      'Press Scan tickets: the scanner fills the screen and asks for the camera; allow it. Everybody registered has an entry code in their confirmation email and in the reminder the day before.',
      'Hold each code inside the frame: the panel turns green with the name and the person is ticked as present, with the time. Amber means they were already checked in; red means the code is for another event or is not a ticket. The panel clears itself for the next person.',
      'If the camera will not open, follow the steps the scanner shows (on an iPhone: Safari, page menu, Website Settings, Camera, Allow), or press Take a photo: it opens the phone\'s camera app and reads the photo instead.',
      'Several people can scan the same event at once, each on their own phone: the count at the foot is shared and updates every few seconds. A ticket scanned on two phones is checked in once; the second shows it as already checked in.',
      'No signal: keep scanning. Each ticket is saved on the phone with the time it was read and sent by itself when the connection returns. If you close the scanner first, Attendance shows the tickets still waiting, with Send now.',
      'For anybody without their code, find them in the list and tick the box by hand; add walk-ins with "Add someone who turned up".',
    ],
    caution: 'Guests ticked as present who are not members receive the thank-you the next morning, so check people in on the day.',
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
    id: 'run-form',
    title: 'Run a form',
    requires: 'ops-forms',
    level: 'manage',
    steps: [
      'Open Operations, Forms and press New form. Start from a blank form or from a starter such as a merchandise order.',
      'In Questions, add a cover picture, give the form its title and introduction and write the questions; the column on the right shows what people will see. For an order, turn on Ask how many of each, list the sizes and add a picture and a price to each choice. Press Save.',
      'In Settings, choose who can answer (members, guests from the link, or both), the deadline, whether people can change their answers, whether one answer can hold more than one item (and what one is called), the payment (amount and how to pay) and the message they read after sending. With more than one item, go back to Questions and check Ask again for each extra item on each card.',
      'Still in Settings, Send me a test receipt emails you the receipt the form sends, with sample answers, so you can read it as people will.',
      'Press Preview to see the form as people will, then Open the form. Copy link to share it; members also find a form for members on their Dashboard, and guests answer from the link.',
      'In Answers, read the summary, tick payments in the table as they arrive, and press Export for exactly the answers and columns needed (with several items per answer, One row per item gives the supplier\'s list).',
      'Close the form when it is done, and delete it once its purpose is over: its answers and files go with it.',
    ],
    caution: 'Opening a form for members puts it on every active member\'s Dashboard at once; a form for guests can be answered by anyone with the link. Deleting a form deletes its answers for good, so export them first.',
  },
  {
    id: 'answer-form',
    title: 'Answer a form',
    requires: 'dashboard',
    level: 'view',
    steps: [
      'On the Dashboard, the card in the place of Research by division, beside the latest update, shows the form waiting for you: press Answer. With several forms, swipe or scroll the card, or press its dots, to see the others. A link shared by the organisers opens the same page.',
      'For an order, tick each item you want, then set how many of each size; the total updates as you go.',
      'Answer the questions; those marked Required must be answered. Files upload as soon as they are chosen. If the form offers Want another one?, press it to add a second item (a second hoodie) with its own answers; Remove takes it out again.',
      'Press Send my answers. A receipt with a copy of your answers reaches your inbox.',
      'To change your answers while the form is open, press Open the form in your receipt email, then Change my answers, if the form allows it.',
    ],
    caution: 'Forms for members are for active members and advisors: candidates, alumni and members on temporary leave do not receive them. A form for guests is answered from its link, with a name and an email.',
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
    id: 'design-package',
    title: 'Download or update the design system package',
    requires: 'smm-brand',
    level: 'view',
    steps: [
      'Open Social Media, Design System.',
      'Press Download the ZIP: the whole design system, with the guide, logos, templates and fonts. The link works for one minute and the download is recorded.',
      'To publish a new edition (Head of Media and Communication, President, Vice President), press Replace the package and choose the new ZIP, up to 50 MB.',
    ],
    caution: 'The package contains licensed fonts and the Society\'s artwork: keep it inside Minerva.',
  },
  {
    id: 'plan-post',
    title: 'Plan a post that goes to more than one place',
    requires: 'smm-editorial',
    level: 'manage',
    steps: [
      'Open Media and Communication, Editorial calendar and press New item, or the "+" on the day it should go out (double-clicking the day works too).',
      'Write what is being promoted.',
      'Under "Where it goes", select every destination it goes to. Instagram and LinkedIn together is one item, not two.',
      'Pick the format for each destination separately. The same piece can be a reel on Instagram and a post on LinkedIn.',
      'Set who is responsible and the status, and mark it as paid advertising if it is. If it promotes an event, choose the event under "For an event".',
    ],
  },
  {
    id: 'move-post',
    title: 'Reschedule a post or move it along',
    requires: 'smm-editorial',
    level: 'manage',
    steps: [
      'On a computer, drag the item to another day of the month, or into Unscheduled to take its date away.',
      'In Board, drag a card to another column to change its status: Idea, Scheduled, In progress, Published or Cancelled.',
      'Without dragging: open the item and change its date or status, then Save changes.',
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
    'The President holds the association. Every subsection is open at full access, including the ones nothing else reaches: granting and removing roles, the role permissions table, the activity log, and sending an offer to a candidate. With the Vice President, the President holds the phone calls after the interviews, decides where the one-association declaration is asked for and runs the semester commitment (Recruiting, Phone calls and Application Page; Settings, Declarations). The presidency is also the only role that can change another President, and it cannot change its own role.',
  vice_president:
    'The Vice President runs the association alongside the President and can reach almost all of it. The deliberate exceptions are the machinery of access itself, which is readable but not editable, and the sending of offers, which stays with the President. Verification of the fee collection is a Vice President responsibility, and so, with the President, are the invitations to advisors and alumni, the register of certificates of membership, the phone calls after the interviews, and the one-association declaration and semester commitment (Recruiting, Application Page; Settings, Declarations).',
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
    'The Head of Media and Communication owns everything the association says publicly outside its research: the editorial calendar, the platform libraries, the brand and design system with its downloadable package, and the paid advertising register. External relations and the statute and documents are managed here too, because an announcement of a partnership cannot be drafted from a summary of it. The member register and the alumni directory are readable, so member and alumni features and event communications start from the real record.',
  media_analyst:
    'A Media Analyst produces the material: the Instagram, LinkedIn, graphics and other libraries are theirs to manage, and so is the editorial calendar, the plan they work to every week. The brand system and the advertising register are read rather than edited, because the identity and the budget belong to the Head. At events, a Media Analyst can take attendance and scan tickets at the door alongside Operations, and the member register and alumni directory are readable for features and communications.',
  operations_analyst:
    'An Operations Analyst runs the association\'s forms, from the hoodie order to the interest list for a company visit: building each form, setting its deadline, following the answers and the payments, and exporting what is needed. Beyond that, the access is the Media Analyst\'s: the Social Templates, graphics and editorial calendar, attendance and ticket scanning at events, and the member register and alumni directory, readable.',
  head_of_operations:
    'The Head of Operations runs the association\'s machinery: the calendar, the events, the member register, the fee collection, the Treasury, the forms, the external relationships and the documents. Several parts of the public website are managed here as well, including the testimonials, the Society timeline and the admissions FAQ. Invitations to advisors and alumni are sent by the President and the Vice President.',
  advisor:
    'An Advisor is an alumnus appointed to advise the association. Every section and every subsection is open, read-only, because advice given without sight of the work is not worth much. Two things are deliberately different: Settings is closed entirely, since an outside adviser has no business in the association\'s access control or its audit trail, and the advisor\'s own profile is theirs to edit. Advisors are outside the membership fee in every respect.',
  alumni:
    'An alumnus keeps a profile, the Dashboard, the Calendar and the Career section: the CV and cover letter templates, the LinkedIn kit, the GPA converter and Brainteasers, with the greenbook. The alumni directory on the public site and the alumni calls are where the relationship with the association continues.',
};

// =====================================================================
// THE WORDS THE WORKSPACE USES.
// =====================================================================
export interface GlossaryTerm { term: string; definition: string; requires?: string }

export const GLOSSARY: GlossaryTerm[] = [
  { term: 'Alumni call', definition: 'An event of its own type, created in Events, Create Event: an online or in-person meeting between members and two to five alumni, organised by a division or the Board. Beside the event it keeps where it stands (planned, invited, accepted, completed, declined), the responsible person and internal notes. Its date, time and link are internal and never shown on the website.' },
  { term: 'Minerva in Numbers', definition: 'The public page /numbers and the stats section at the foot of the website pages. Every figure (members, alumni, events, reports, fund statistics) is computed automatically every night from the workspace records, with a definition and the date it is true at; nobody types them. Visitors see the new figures from their next visit after the nightly update; the copy built into the pages for search engines and AI tools is renewed at each Publish. A company visit counts once it is an event of type Company visit; a report counts once it is published.' },
  { term: 'Company visit selection', definition: 'How a company visit with a closing date gives its places: members and alumni register their interest with their CV, and the President and the Vice President choose, in Events, Attendance, on participation in the Society\'s activities and interest in the topic of the visit, never on the CV. Decisions are drafted and sent to everybody at once.' },
  { term: 'Reserve', definition: 'Somebody who asked to join a company visit and was told "not this time". If a place opens up before the visit, the President or the Vice President can offer it to them, and they are emailed at once.' },
  { term: 'Date to be confirmed', definition: 'An alumni call saved before its date is known. It is a plan: kept in Event Archive only, off the website, out of the Calendar, the Dashboard, Attendance and every count, and without registrations until the date is set.' },
  { term: 'Subsection', definition: 'One page of the workspace. The navigation is sections holding subsections, and access is granted per subsection, not per section.' },
  { term: 'Interact only', definition: 'You can open the page, read all of it and use the actions that change nothing for anybody else: search, filter, sort, open a record, download, register yourself. Everything that would change something is faded and inert.' },
  { term: 'Full interact', definition: 'Interact only, plus creating, editing, deleting and publishing on that page.' },
  { term: 'Division', definition: 'One of the five research areas (Equity, Investment, Macroeconomic, Portfolio Management, Quantitative) or one of the two operating areas (Media and Communication, Operations).' },
  { term: 'Division scoping', definition: 'On the report pages, several roles see only their own division\'s data. Heads of Division and the Head of Asset Management can look across divisions; analysts, senior analysts, team leaders and portfolio managers see their own.' },
  { term: 'Membership status', definition: 'Whether a person is an active member, and one of the three conditions that decide whether they appear on the public Team page.', requires: 'people-members' },
  { term: 'Evaluated for', definition: 'The division actually assessing a candidate, as opposed to the two divisions the candidate asked for. It decides which emails they receive, which interview calendar they can book and which division sends an offer.', requires: 'applications-screening' },
  { term: 'Semester label', definition: 'The name of an academic semester, such as "Sep-Jan 2026". It groups the fee collection, the Treasury, the candidate archive and the member snapshot.' },
  { term: 'Exam session break', definition: 'A protected date range during which no event, interview slot, Association on Display day, alumni call, meeting or social can be scheduled anywhere in the workspace. Deadlines and reminders remain possible.', requires: 'calendar' },
  { term: 'Association on Display', definition: 'The recurring day on which the association presents itself, with time slots members sign up for. Registration closes 24 hours before the day.', requires: 'events-on-display' },
  { term: 'Locked entry', definition: 'A Treasury entry written by the workspace itself, from a fee collection closing or an advertising spend being recorded. It is the record of something that happened elsewhere and cannot be altered here.', requires: 'ops-treasury' },
  { term: 'Greenbook', definition: 'A Practical Guide to Quantitative Finance Interviews, the book offered in Career, Brainteasers. Each download is a copy with the reader\'s name, email and the date on every page, for their own study.', requires: 'career-brainteasers' },
  { term: 'Needed the solution', definition: 'In Brainteasers, a question you could not solve without its solution: listed apart, so it can be tried again later.', requires: 'career-brainteasers' },
  { term: 'Equivalence bands', definition: 'The default method of the GPA converter: grades that mean the same thing (pass, good, very good, excellent, top) are matched between two systems, and a grade in between is read at the same position. Indicative, like every conversion.', requires: 'career-gpa' },
  { term: 'Degree mark base', definition: 'On the Bocconi /30 scale, the weighted average times 110 divided by 30: the starting point of the final degree mark, before the points the commission adds.', requires: 'career-gpa' },
  { term: 'Advisor', definition: 'An alumnus appointed to advise the association. Reads everything, changes nothing but their own profile, has no access to Settings, and is outside the membership fee entirely.' },
  { term: 'Places', definition: 'The number of people an event can take, set in Events, Registration forms. Empty means no limit, which is the default.', requires: 'events-forms' },
  { term: 'My events', definition: 'A member\'s own page in Events: the events open for registration, and the semester\'s events held so far, each attended or missed.', requires: 'events-mine' },
  { term: 'Waiting list', definition: 'The queue for an event whose places are taken. When a place frees up, the first person waiting is registered and emailed their ticket at once. Never once the event has started.', requires: 'events-attendance' },
  { term: 'Entry code', definition: 'The QR code in an event confirmation email and in the reminder the day before. It identifies one registration, carries no personal data, and is scanned at the door in Events, Attendance to tick the person as present.', requires: 'events-attendance' },
  { term: 'Rome time', definition: 'The clock every time in the workspace is written on, with its zone named: CET in winter, CEST in summer, as in 6:30 pm CEST. What you type is read on the same clock, wherever you are.' },
  { term: 'Withdrawn certificate', definition: 'A certificate of membership the President or the Vice President has withdrawn, with a reason, in Settings, Certificates. Its number reads as no longer valid at minervaims.org/verify until it is restored.', requires: 'settings-certificates' },
  { term: 'Certificate number', definition: 'The number printed on a certificate of membership, such as MIMS-26F-7K3Q-9D2X: the Society, the semester (26F is Fall 2026) and eight random characters. It is what minervaims.org/verify checks.' },
  { term: 'Getting started', definition: 'The five-step checklist a member starting out sees on the Dashboard in the place of Research by division, until the steps are done or the card is hidden.' },
  { term: 'Attendance report', definition: 'The .csv file Microsoft Teams gives the organiser of a meeting, listing who joined and for how long. In Events, Attendance it records who attended an online event.', requires: 'events-attendance' },
  { term: 'Thank-you to guests', definition: 'The email the President sends, the morning after an event, to the guests marked as attended who are not members.', requires: 'events-attendance' },
  { term: 'Form', definition: 'A form for the Society\'s active members, for guests or for both, built in Operations, Forms: an order, a sign-up, interest in a visit. Open forms for members waiting for a member\'s answer appear on their Dashboard.' },
  { term: 'Guest (forms)', definition: 'Someone outside the Society who answers a form from its link with their name and email. Their receipt carries a private link back to their answer.', requires: 'ops-forms' },
  { term: 'Want another one?', definition: 'The button under a form\'s questions that adds a second item to the same answer (a second hoodie), with the questions asked again, up to the form\'s limit of at most five.' },
  { term: 'Order question', definition: 'A choice question that asks how many of each choice, by size when sizes are listed, with a price per choice if the form collects a payment.', requires: 'ops-forms' },
  { term: 'Show-if rule', definition: 'A question, heading or picture of a form shown only when a question above it has one of the chosen answers.', requires: 'ops-forms' },
  { term: 'Starter', definition: 'A ready-made form to begin from in Forms, such as a merchandise order with a payment; a draft to change freely.', requires: 'ops-forms' },
  { term: 'Operations Analyst', definition: 'The member who assists the Head of Operations and runs the forms. Beyond the forms, the access is the Media Analyst\'s.' },
  { term: 'Activity log', definition: 'The record of every change made in the workspace, and of every sensitive download, with the role held at that moment. Kept for ninety days. It exists for accountability across leadership teams.' },
  { term: 'Needs linking', definition: 'An attendance row whose name matches more than one member. It counts for nobody until somebody presses it in Events, Attendance and chooses the member.' },
  { term: 'Phone call', definition: 'The short call with the President or the Vice President after the interview and before the offer, about knowing the Society as a whole and never technical on markets. Run in Recruiting, Phone calls; the candidate books it on their Phone Call page.' },
  { term: 'One-association declaration', definition: 'The statement, signed by a candidate accepting an offer and by members confirming the semester commitment while the Board asks for it, that they are not a member of another Bocconi student association in the categories Management, Finance, or Economics and Social Sciences of Bocconi\'s list of student associations, as the list stands at the time. A condition of membership approved by the Board, not a rule of the Statute.' },
  { term: 'Signed (declaration)', definition: 'A one-association declaration given in the Workspace with a typed name, a ticked box and the time, exactly like accepting an offer. Nothing is printed and nobody countersigns; the signer receives a short email confirming it.' },
  { term: 'Semester commitment', definition: 'The answer every active member except Advisors gives once a semester, on My Profile, Commitment: I confirm my commitment, or I cannot commit. Asked when the application window opens, with one reminder.' },
  { term: 'Division Fit', definition: 'The short public test at /join/division-fit that suggests which research division or fund may suit a student. It needs no account, stores nothing, and its suggestion is preselected, and can be changed, on the application form.' },
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
    question: 'A member no longer receives the reminders to register for events.',
    answer: 'They pressed Unsubscribe at the foot of a reminder: that stops the reminders to register and the thank-you notes after events, and nothing else. In Operations, Automatic emails the register lists those emails as Suppressed, with "Recipient unsubscribed from events emails". For now only the website administrator can undo it, on the member\'s request.',
    requires: 'ops-auto-emails',
  },
  {
    question: 'A link to an event or a form asked me to sign in, and I lost the page.',
    answer: 'After signing in you are taken back to the page the link opened: the event\'s registration, a company visit\'s interest form, a form, or a page of the workspace. This also works after Forgot password, as long as you sign in within half an hour. If you still land on the Dashboard, open the link again: you are signed in now, so it opens at once.',
  },
  {
    question: 'Somebody invited to a company visit can no longer come.',
    answer: 'There is no Can\'t make it link for a company visit: they write to as.minerva@unibocconi.it. The President or the Vice President then opens the visit in Events, Attendance and presses Record a withdrawal on their row, which removes them from the door list and frees the place, and Offer a place on a reserve, who is emailed at once. Removing their row from the door list directly is refused, so the count of invitations stays right.',
    requires: 'events-attendance',
  },
  {
    question: 'A member cannot find the link to an online event.',
    answer: 'The link is private: only somebody holding a place has it. If they are registered, it is in their confirmation email, in the "See you tomorrow" email the day before, and on the Join button of their Dashboard, of Events, My events and of the event in the Calendar. On the waiting list they do not have it yet; it arrives with the email that gives them a place. If nobody has it, the event was probably saved as "Online" without a link: open it in Calendar or Event archive and paste the link where the place goes.',
    requires: 'events-create',
  },
  {
    question: 'A member says their attendance is wrong.',
    answer: 'They see their own record in Events, My events, and you see the same in People, Members by pressing their number in the Events column. If they were present but show as missed, tick them in Events, Attendance, or link their row if it reads Needs linking: the list can be corrected until the end of the semester, and the count follows at once.',
    requires: 'events-attendance',
  },
  {
    question: 'A member says they cannot see a form.',
    answer: 'Three things decide it. The form must be open, not a draft, and its deadline must not have passed: the list in Forms shows both. It must be a form for members (or for members and guests): a form for guests only never appears on the Dashboard. The member must be ACTIVE, or an advisor: candidates, pending accounts, alumni and members on temporary leave cannot answer. And they must be signed in with the account linked to their member record. If all three hold, and they have not answered yet, the form is on their Dashboard in the place of Research by division, and its link opens it.',
    requires: 'ops-forms',
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
    question: 'I cannot invite a candidate to a phone call.',
    answer: 'Two things decide it. The candidate must have had their interview recorded as held (Interview completed), or be On hold post interview or Plausible offer; and at least one call slot must be free, because an invitation asks the candidate to book. Open a slot under Open call slots, then invite.',
    requires: 'applications-calls',
  },
  {
    question: 'A candidate cannot accept their offer.',
    answer: 'While the one-association declaration is asked for, accepting needs both signatures: the acceptance and the declaration, each with the full name typed and the box ticked. Their offer page shows the declaration under the acceptance. If the offer\u2019s three days have passed, resend it from Offers.',
    requires: 'applications-joiners',
  },
  {
    question: 'A member says they were never asked for the semester commitment.',
    answer: 'The request goes to every active member except Advisors at the moment the semester\u2019s commitment is launched. Somebody who joined later, or whose membership was not active then, shows as Not asked in People, Members and has nothing waiting. The register in Operations, Automatic emails shows whether the request reached the others.',
    requires: 'settings-declarations',
  },
  {
    question: 'The preview of a Career template looks slightly different from Word.',
    answer: 'The preview is drawn by the browser from the same file, with the fonts your device has. Line breaks can shift by a word where a font is missing. The downloaded file is the reference: open it in Word to see it exactly as it prints.',
    requires: 'career-cv',
  },
  {
    question: 'Copy prompt did nothing.',
    answer: 'Your browser refused access to the clipboard, and the page says so. Allow clipboard access for the workspace in the browser settings, or use another browser. The prompts are copied, not shown on the page.',
    requires: 'career-linkedin',
  },
  {
    question: 'The page says I have opened too many solutions.',
    answer: 'Brainteasers gives out up to 40 new solutions an hour and 150 a day, so the set is studied rather than copied out. Solutions you have already opened stay available, and the message says from when you can open new ones.',
    requires: 'career-brainteasers',
  },
  {
    question: 'A formula in a solution is cut off on my phone.',
    answer: 'It is not cut off: a formula wider than the screen is first drawn smaller to fit, and the few still wider scroll sideways inside their own box, with a fade at the edge to show there is more. Swipe the formula itself sideways to read the rest; on a computer every formula fits.',
    requires: 'career-brainteasers',
  },
  {
    question: 'A member cannot download the greenbook.',
    answer: 'Three things decide it. A greenbook must have been uploaded (the Greenbook view says so if not). The member must have Career, Brainteasers in their role: applicants and accounts without a role do not. And each person can download it up to three times in 24 hours; after that the message asks them to use the copy they already have.',
    requires: 'career-brainteasers',
  },
  {
    question: 'My saved averages are missing on another device.',
    answer: 'Saved averages are in your account and follow you to any device; the calculation you had not saved yet stays in the browser where you typed it. Press Save to keep it everywhere.',
    requires: 'career-gpa',
  },
  {
    question: 'An error message says something went wrong but not what.',
    answer: 'Report the exact wording. The workspace shows the reason a server gives rather than a status code, so a message that explains nothing is a fault worth fixing rather than something to live with.',
  },
];

// =====================================================================
// WHAT EACH PAGE'S SUBTITLE USED TO SAY, AND MORE.
// ---------------------------------------------------------------------
// Every subsection carried a paragraph beneath its title, explaining its
// rules, its consequences and the things worth knowing before touching
// it. That is the right material in the wrong place: it is read once and
// then competes with the page for the reader's attention on every visit
// afterwards, and on a page like the Calendar it pushed the grid most of
// a screen down.
//
// The subtitles are one sentence now, saying what the page gives you.
// This is where the rest went: the help panel shows it on request, and
// the manual prints it in full. Nothing was discarded in the move, and
// several entries say more than the subtitle ever did.
//
// `related` names the subsections a page is part of a sequence with. It
// is filtered by the reader's own access before it is shown, so a page
// never points at something they cannot open.
// =====================================================================

export interface PageDetail {
  detail: string[];
  related: string[];
}

export const PAGE_DETAIL: Record<string, PageDetail> = {
  'calendar': {
    detail: [
      "Register for events comes first: every upcoming event still open to you, with its Register button, beside the events you are already registered or waiting for. How registration works lays out the four steps from the button to the door.",
      "Below it, the calendar: one month, three months (the current one and the two after it) or an agenda (a list by day, which a phone shows first), with Today and the arrows to move. The chips above it are both the filters and the key: Events, Association on Display, Alumni calls, Deadlines and Team entries, each with its colour and icon. A ticket marks an event open to register, a green tick one you are registered for, an hourglass one you are waiting for.",
      "Any item opens a panel with its details and what you can do: register, join the waiting list, add it to your own calendar or cancel. Roles that edit the calendar also find Edit details there, and add their own entries with Add entry or the + on a day.",
      "No event can be scheduled during an exam session break or on an Italian public holiday. Both are shaded, and the restriction is enforced by the database, so it holds however the entry is created.",
    ],
    related: ['events-create', 'events-on-display', 'events-archive'],
  },
  'smm-editorial': {
    detail: [
      "The Media team's plan: what is going out, when, where it goes and in what format, who is responsible, its status and whether it is paid advertising.",
      "Four views of the same plan: Month (the dates, with the association's own events shown faintly on their days), 3 months (the current month and the two after it), Board (one column per status, from Idea to Published) and List (everything in date order, the easiest read on a phone). Items without a date wait in Unscheduled.",
      "Each item shows its status by its style and icon, and where it goes by the platform icons. One item can go to several destinations, each with its own format, and can be linked to the event it promotes.",
      "On a computer the Media team drags items to reschedule them or to change their status; the same can be done from the item itself. Other roles, and every role on a phone, read the plan without changing it.",
    ],
    related: ['smm-social', 'smm-graphics', 'smm-ads', 'events-create'],
  },
  'smm-ads': {
    detail: [
      "Every piece of paid promotion the association buys: the content, the platform, the date, the amount, what it was for and whether it worked.",
      "Recording a spend posts its cost to the Treasury automatically, once, on the date it was incurred, so the media budget and the association's accounts cannot drift apart. Editing the description of an entry that already exists never posts a second time.",
      "Entries can be added but not deleted, for the same reason the Treasury cannot be edited: the register has to be worth trusting after the people who wrote it have left.",
    ],
    related: ['ops-treasury', 'smm-editorial'],
  },
  'ops-treasury': {
    detail: [
      "The association's cash-flow register, grouped by the semester each movement was executed in, with a net per semester and a running balance.",
      "It is append-only. There is no edit and no delete, for anybody, including the association account: a mistake is corrected by recording a second entry that offsets it and says why. That is what makes the register trustworthy across changing leadership teams.",
      "Some entries write themselves and arrive locked, because they are the record of something that happened elsewhere: closing a fee collection posts its total, and recording an advertising spend posts its cost.",
    ],
    related: ['ops-fee', 'smm-ads'],
  },
  'ops-forms': {
    detail: [
      "Forms for the Society's active members, whatever needs collecting this time: merchandise orders, interest in a company visit, a sign-up with preferences. The list shows the open forms first, with their deadline, their answers and their payments, then the drafts, then the closed ones.",
      "A form has three tabs, in the order the work is done. Questions holds the title, the introduction and the questions, with the member's view beside them. Settings holds the deadline, whether answers can be changed, the payment and the message members read after sending. Answers holds the summary, the table and the export.",
      "Edits are kept on the page until Save, in a bar that stays in view. Opening, closing and reopening a form say what will happen to members before they happen. A form that already has answers can still be changed: what was answered stays as it was sent, and a removed question keeps its answers in the export.",
      "Every answer can be opened in full beside the table, with its files, a Paid switch that records who ticked it and when, and a note for the team that the member never sees.",
      "An order question is summed up as a table of each choice by size with the totals and the amounts, and exported with one number column per choice and size, so the sheet goes straight to the supplier. Each answer keeps the amount it came to when it was sent.",
      "Answers and attached files are kept until the form is deleted, and only organisers can read them.",
    ],
    related: ['ops-fee', 'ops-treasury'],
  },
  'ops-fee': {
    detail: [
      "The semester's membership fee collection: who owes it, who has paid, and the deadlines they were given.",
      "The first deadline is shown to everyone who owes the fee, on their own Calendar. The second is a grace period and is shown only to those who have not paid once the first has passed. Neither is shown to anybody outside the fee.",
      "Closing a collection does three things at once and none of them can be undone: it locks the collection, it writes the total to the Treasury as a locked entry, and it freezes the official member register for that semester.",
      "Advisors are outside the fee entirely: in no collection, no total and no semester register. Appointing a member as advisor part way through a semester removes the fee they had not yet paid, while a payment already banked is never deleted, and the collection says so where it happens.",
    ],
    related: ['ops-treasury', 'people-members'],
  },
  'applications-screening': {
    detail: [
      "This semester's applications, with each candidate's profile, their CV, their written answer, the shared notes and the division actually assessing them.",
      "Everybody who can open this page sees every application in the semester, whatever their own division: a selection round is judged as a whole. What each role may do differs. Team Leaders and Portfolio Managers read and add notes. The roles that manage the page can move any candidate to a different division, which is what reassignment is for, while advancing, inviting and rejecting stay with the division that is assessing them.",
      "A candidacy only ever moves forward. The status dropdown offers stages later than the current one and nothing earlier, and the server refuses a backward move even when the request is built by hand.",
      "Statuses marked as sending an email notify the candidate the moment they are set, and cannot be recalled. A confirmation dialog always appears first.",
      "Notes are visible to every reviewer with access to this page and are attributed to their author. Previous semesters remain consultable as read-only archives.",
    ],
    related: ['applications-form', 'applications-interview-calendar', 'applications-joiners', 'applications-website'],
  },
  'applications-website': {
    detail: [
      "The recruitment window. Applications open and close automatically on the dates set here, and the public Join page announces them: before the opening it names the day and the hour, and while open it names the closing date and says places may fill sooner.",
      "Check the division questions before opening a round. They lock automatically while applications are open, so anything that needs changing has to change first.",
      "The one-association declaration has three switches here, all off until turned on: before accepting an offer, with the semester commitment, and its explanation on the Join page. The President, the Vice President and the association account move them, and each takes effect at once.",
    ],
    related: ['applications-form', 'applications-screening', 'settings-declarations'],
  },
  'applications-form': {
    detail: [
      "The written question each division asks its applicants, answered with a PDF upload. Changes appear immediately on the public Join page and inside the application form.",
      "The rest of the form is fixed, deliberately, so that applications stay comparable across semesters and divisions. Use Preview the form to see it exactly as an applicant does.",
      "Heads of Division edit their own division's question only. Questions lock automatically while applications are open.",
    ],
    related: ['applications-website', 'applications-screening'],
  },
  'applications-joiners': {
    detail: [
      "Candidates who passed the selection, and the offers made to them.",
      "An offer names a role and a division. The candidate has three days to accept from their own workspace, with a reminder sent after two; accepting turns their account into a member automatically.",
      "Sending, resending and editing an offer is reserved for the President and the association account, on the server as well as in the interface.",
      "While the one-association declaration is asked before accepting an offer (Recruiting, Application Page), the Declaration column shows whether each joiner signed it (Signed) or joined without it while it was asked (Missing). Who has signed is listed in Settings, Declarations.",
    ],
    related: ['applications-calls', 'applications-screening', 'people-members', 'settings-declarations'],
  },
  'applications-calls': {
    detail: [
      "The phone call with the President or the Vice President, after the interview and before the offer. It is about knowing the Society as a whole: how it works, what membership asks, why the candidate wants to join. It is never a technical conversation about markets.",
      "Open call slots with smart planning: the day, the time you have, the length of each call (15 minutes unless you choose otherwise), the candidates per slot and the number you call from. Invite the candidates whose interview has been held; they book from their own Phone Call page within 72 hours, can move the call once up to an hour before, and are reminded 30 minutes before it.",
      "Record outcome closes the call: Pass selects the candidate for an offer, Hold keeps them waiting, Decline rejects them with the post-interview email. The notes go into the candidate's notes for every reviewer.",
      "Only the President, the Vice President and the association account open this page.",
    ],
    related: ['applications-interview-calendar', 'applications-screening', 'applications-joiners'],
  },
  'settings-declarations': {
    detail: [
      "The one-association declaration and the semester commitment. Where the declaration is asked for is shown here and switched in Recruiting, Application Page: before accepting an offer, with the semester commitment, and its explanation on the Join page.",
      "Signed declarations lists who has signed, when, where and which version of the text. The signature in the Workspace is the record: there is no PDF and nobody countersigns. Signatures are kept while the person is a member and twelve months after, then deleted automatically.",
      "The commitment is launched by itself when the application window opens, from the semester set here onwards, with one reminder after the days set here. It can also be launched by hand, once per semester, and the four emails can be sent to your own address as a test.",
      "Only the President, the Vice President and the association account open this page. The declaration is a condition of membership approved by the Board of Directors; it is not in the Statute.",
    ],
    related: ['applications-website', 'applications-joiners', 'people-members', 'my-commitment'],
  },
  'people-members': {
    detail: [
      "The association register: every member and advisor, with the one role each of them holds. That role drives their workspace permissions everywhere, and Settings, Users edits the same record.",
      "The public Team page is written from this register automatically. A person appears there only if three things are true at once: their profile is marked to show on the website, their membership status is one that is published, and their role is one the public page carries.",
      "Only the President and the association account can assign or change a role. Nobody can change their own, from any page.",
      "Advisors are appointed alumni. The switch in their profile decides whether they appear on the public website; it does not change what they can reach in the workspace.",
      "The Head of Media and Communication, the Media Analyst and the Operations Analyst read the whole register, without changing it, so member features and event communications start from the real record.",
      "For the roles with full access, the Events column shows how many of this semester's events each member attended, out of those held so far with attendance taken. Association on Display days count as events. Press the number to see which events: each attended, registered but not present, or not registered.",
      "For the Board, the Commitment column shows each member's answer to the semester commitment: Confirmed, Pending, Declined or Not asked, with a filter in its header and a column in the CSV export. Above the register, the completion by division counts who was asked, who answered and who received the one reminder.",
      "One person, one record. For the readers who see every division, Since shows the first semester the Society's records show each member, and Reports how many published reports carry their name. The name opens the person's record, the same from Members, Alumni and the Time Machine: career in Minerva semester by semester with each promotion, every report, and for alumni where they went. An internal person code keeps it together when a member becomes an alumnus; it is shown only to the President, the Vice-President and the Head of Operations.",
    ],
    related: ['settings-users', 'people-alumni', 'people-rosters', 'ops-fee', 'settings-declarations'],
  },
  'people-rosters': {
    detail: [
      "The Time Machine: who was in the Society in every past semester from Fall 2019, newest first. Each semester opens on its Board of Directors, officers and then heads as the Statute lists them, and then each division by team and role.",
      "It joins two records that used to live apart: the history reconstructed from the reports, the old Drive and the President's lists, and the official registers frozen when each membership fee collection closed (until now shown in People, Members). Everybody in a register is in their semester; \"Only the official register\" shows the register alone.",
      "The current semester is People, Members. On the semester's last day it joins the Time Machine with the roles as they stand.",
      "Find a person or a role in every semester at once. The CSV holds what is on screen, every semester included; the PDF holds one semester on the Society's letterhead. Neither contains a person code or any contact detail.",
      "The Board, the heads, Operations and the advisors read every division and open each person's record; members from Analyst up read their own division in every past semester. Both limits are enforced by the database, not only by the page.",
      "Only the President and the Vice-President correct a past semester, and every correction is recorded in the activity log.",
    ],
    related: ['people-members', 'people-alumni', 'settings-activity'],
  },
  'people-alumni': {
    detail: [
      "The complete alumni directory: every former member, with graduation year, current company, job area and city.",
      "The public website shows only the first hundred entries. This register always holds them all, and every place an alumnus's employer appears, including on alumni calls, reads it live from here rather than from a copy.",
      "Former members with a role who are not yet in the directory wait under \"To complete\" for the President and the Vice-President: adding one asks for the graduation year, and the new entry keeps the person's history.",
    ],
    related: ['events-create', 'people-members', 'people-rosters'],
  },
  'events-attendance': {
    detail: [
      "For an event with a limited number of places, the line above the list shows the places taken and the people waiting, and the waiting list is shown under the register, in order. A place freed here goes to the first person waiting at once.",
      "Who registered for each event and who actually came. Every registration carries an entry code, sent as a QR code in the confirmation email and again the day before; Scan tickets reads it with the camera of a phone or a laptop and ticks the person as present, with the time.",
      "Ticking by hand works exactly as before and can be mixed with scanning: somebody without their code is found in the list and ticked. Online events have no door, so they have no code and no scanner.",
      "Several phones can scan the same event together and share one live count. Without signal the scanner keeps working: tickets are saved on the phone with the time of the scan and sent as soon as the connection returns.",
      "The Media Analyst and the Operations Analyst can take attendance and scan alongside Operations. The list stays open until the end of the event's semester (never less than two weeks); after that it is the record, can still be exported, and only the President and the Vice President can correct it.",
      "A name two members share reads Needs linking and counts for nobody until somebody presses it and chooses the member, or marks it as not a member. The choice is kept on the row, and the events-attended count in People, Members follows it.",
      "For a company visit, the President and the Vice President select the participants here, in Selection above the door list: everybody interested with their participation record, drafts (Invite, Not this time, Undecided), Send decisions once the interest form has closed, the count of invites sent out of the places, Record a withdrawal and Offer a place to a reserve, each CV and the invited CVs as a ZIP for the host. Everybody else sees that the visit selects, and the people invited on the door list.",
    ],
    related: ['events-forms', 'events-create', 'events-archive'],
  },
  'smm-social': {
    detail: [
      "Instagram, LinkedIn and Other Resources, which used to be three separate pages, are the three tabs of this one. Each tab keeps its own access: you see the tabs your role may open, and what you may change is decided tab by tab. The tab is part of the address, and the old addresses of the three pages open the matching tab.",
      "The Instagram and LinkedIn tabs are libraries of material ready to post: pictures, videos, captions and links. Captions can be copied in one press and show their length against the platform's limit (2,200 characters on Instagram, 3,000 on LinkedIn). Other Resources holds what the posts draw on: press material, photography, mentions.",
    ],
    related: ['smm-editorial', 'smm-graphics', 'smm-brand'],
  },
  'smm-brand': {
    detail: [
      "The design system of the Society, as the package itself describes it: the guide inside the package is shown here chapter by chapter, with the logos, the type scale, the colours and the shadows drawn live beside the text.",
      "Download the ZIP gives the whole package: the guide, every logo, the tokens, the templates and the font files. It stays inside Minerva because it contains the Society's artwork and licensed fonts, and every download is recorded.",
      "A new edition is published by uploading its ZIP, which replaces the previous one for everybody at once.",
    ],
    related: ['smm-graphics', 'smm-social', 'smm-editorial'],
  },
  'smm-graphics': {
    detail: [
      "The Society's graphic assets as a picture library: every image shows as itself, and every other file as a tile with its type written on it. Search, filter by type, preview full screen, and download one file or several at once as a ZIP.",
      "The Media team adds assets by dropping many files at once; each becomes its own item, titled from its name. Put the editable file next to the export whenever there is one.",
    ],
    related: ['smm-social', 'smm-brand', 'smm-editorial'],
  },
  'reports-templates': {
    detail: [
      "Your division's working material in one searchable library: model and report templates, code repositories, links and reference notes. General material, meant for every division, stays in view whichever division is chosen.",
      "Search by title, file name or author, narrow by type (Spreadsheets, Presentations, Links...), open an item to preview its file, and download one item or several at once as a ZIP. Those who manage the library upload many files at once, each becoming its own item in the chosen division.",
    ],
    related: ['reports-upload', 'reports-archive'],
  },
  'ops-external': {
    detail: [
      "Every partner, sponsor and institution the Society deals with: the contacts, the agreements and the links that go with each, so a relationship survives the change of board.",
      "Search by name, address or note. A telephone number calls and an address writes in one tap, and the button on each row copies the address. Agreements and documents are previewed and downloaded from the entry itself.",
    ],
    related: ['ops-docs', 'ops-treasury'],
  },
  'events-create': {
    detail: [
      "Where a new event is set up: its type, its date, its place, its description and whether registration is open.",
      "Attach a registration form from Events, Registration forms when the event needs to ask registrants something specific. Registrations feed straight into Attendance.",
      "Alumni calls are created here too, as the type Alumni call: who organises it (a research division or the Board), the two to five alumni taking part (from the alumni directory, or typed by hand) with their current position and company and their role at Minerva, where the call stands, the responsible person and internal notes. A call whose date is not fixed yet can be saved with Date to be confirmed. The Heads of Division and the Head of Asset Management create alumni calls only.",
      "Every event appears in the Event archive; whether it is also listed on the public website is chosen when it is created (internal meetings and online calls start unlisted) and can be changed from the archive. An alumni call listed on the website appears without its date, its time or its link, which are internal.",
      "Start and end are typed on Rome's clock, wherever you are, and every page and email then shows them the same way, as 6:30 pm to 8:00 pm CEST.",
      "A company visit with registration on selects its participants: set when its interest form closes (11:59 pm a week before is suggested) and its places. Members and alumni register their interest with their CV, and the President and the Vice President choose who goes in Attendance.",
    ],
    related: ['events-forms', 'events-attendance', 'events-archive'],
  },
  'events-archive': {
    detail: [
      "Every event of every type, including internal meetings, alumni calls and each Association on Display day.",
      "An alumni call opens in its own window, with its alumni, its status, the responsible person and the notes, beside everything any event has. The line under each call shows its status, or Date to be confirmed. The Heads of Division and the Head of Asset Management can change alumni calls here, while every other event stays read-only for them. The old Alumni Calls address opens this page filtered to alumni calls.",
      "The Public website switch on each row decides whether that event is listed on the public Events page: Listed means anybody visiting the website sees it, Not listed means it stays in the workspace only. It changes nothing else: registration, reminders and attendance work the same either way. On the public website, an event without a poster shows the full Minerva logo instead. Deleting an event is permanent; Association on Display days are managed from their own page.",
      "The filter offers only the event types the archive actually contains, so every option leads somewhere.",
    ],
    related: ['events-create', 'events-attendance'],
  },
  'events-mine': {
    detail: [
      "Your own record of the semester's events. Coming up lists the events whose registration is open, from today on: Register signs you up with your account in one click, or puts you on the waiting list when the event is full, and the confirmation email follows at once. The events you hold a place at come first, with Can't make it to give the place back.",
      "An online event you hold a place at shows a Join button: its link is private, and reaches only the people registered.",
      "A company visit shows Register your interest instead of Register: its places are given by selection, and the row then says where your interest stands (received, invited, reserve). Received is not yet a place: the time, the place and the entry code come with the invitation. Once invited there is no Can't make it: write to as.minerva@unibocconi.it if you cannot come.",
      "This semester lists the events held so far where attendance was taken, Association on Display days included, each Attended, Registered but not present, or Not registered, with the totals above. They are the same events, counted the same way, as the Events column of People, Members.",
      "If you were at an event that shows as missed, tell the Head of Operations on WhatsApp or write to as.minerva@unibocconi.it with the event's name and date: attendance can be corrected until the end of the semester.",
    ],
    related: ['calendar', 'events-on-display'],
  },
  'events-on-display': {
    detail: [
      "The days on which the association presents itself, and the slots members have signed up for. The stand runs 10:00 am to 7:00 pm, Rome time, in half-hour slots, and each slot covers its whole half hour: the 6:30 pm slot runs to 7:00 pm.",
      "As many people as want to can take the same slot. Covered is a floor and not a ceiling, so a green slot is still open and still worth joining.",
      "Senior roles open and close a day. Everybody else registers and de-registers themselves, up to 24 hours before it.",
    ],
    related: ['calendar', 'events-create'],
  },
  'reports-upload': {
    detail: [
      "Where a report is published. Attach the PDF, fill in the title, the date and the division, and either publish it or save it as a draft.",
      "The page count is read from the file itself, so there is nothing to type. Publishing sends the report to the archive and to the public website at once.",
      "Division-scoped roles upload for their own division only. A Portfolio Management report can be attached to a fund; remember to type the new monthly returns in Fund performances so the public fund table matches it.",
      "The type (from the division unless you choose another), the tags and the authors appear on the report's own page and are written into the PDF's own details. Authors picked from Members or Alumni link to their entry; names and roles only.",
    ],
    related: ['reports-archive', 'reports-funds', 'reports-templates'],
  },
  'reports-archive': {
    detail: [
      "Every published report, searchable by title, summary, tag and author, and filterable by division, year, fund and status.",
      "Opening and downloading a report is available to every role that can see this page, because reading the research is what the archive is for. Downloads follow the filters that are active.",
      "Each report has a permanent page at minervaims.org/archive/ followed by words from its title and its year: made automatically, fixed for ever once the report is published. The page carries its summary, authors, tags, PDF, a ready-made citation and related reports, and old links that pointed at a report in the archive now open its page.",
      "Editing a report sets its type, tags and authors as well as its title, date and summary, and writes those details into the PDF. Missing details lists the reports without authors, a summary or a type; Edit selected changes the type or the tags of several reports at once; PDF details checks and updates what the PDFs say about themselves, keeping every original in a private copy.",
    ],
    related: ['reports-upload', 'reports-templates'],
  },
  'reports-funds': {
    detail: [
      "The monthly returns of the four virtual funds, typed here. Everything else the website shows about the funds (year to date, inception to date, volatility, Sharpe ratio on the €STR, maximum drawdown, best and worst month, beta and correlation to market indices) is computed from them by one function, so the fund pages, /track-record, the data files and the Dashboard always agree.",
      "Type each month as a percentage, for example +1.2 or -0.4. An active fund's months older than fifteen months are frozen; a closed fund's history can be typed in full, and its page shows the table once its start and end dates are set in Profiles.",
      "References holds the market indices (net total return, EUR) and the €STR, typed month by month with their source. The €STR fills itself from the ECB every morning; Fill the €STR from the ECB now fills any missing month at once. Neither replaces a value typed here.",
    ],
    related: ['reports-upload', 'reports-archive'],
  },
  'reports-divisions': {
    detail: [
      "What each division's public page says under How we work (the standards its reports meet, how they are reviewed, the tools and data they draw on) and the three reports it shows as Flagship work.",
      "A Head edits their own division's page; the President, the Vice President and the Head of Asset Management can edit any. A part left empty is hidden on the website, and Flagship work stays hidden until a report is chosen.",
    ],
    related: ['reports-archive', 'reports-upload'],
  },
  'settings-users': {
    detail: [
      "The accounts connected to the workspace, and the role each of them holds.",
      "Assigning a role here writes the person's member profile, which People, Members shows identically; permissions follow it everywhere, immediately.",
      "Role changes are confirmed, recorded in the activity log, and reserved for the President and the association account. Nobody can change their own role.",
      "Applicants are not here. They live in Recruiting, Candidates screening until they accept an offer.",
    ],
    related: ['people-members', 'settings-roles', 'settings-activity'],
  },
  'settings-certificates': {
    detail: [
      "Preview on each row shows the certificate exactly as its holder downloads it, with a Download PDF button.",
      "Every certificate of membership the Society has issued, with its number, the holder, the role and semester it certifies, the day it was issued and whether it is still valid.",
      "The President and the Vice President can withdraw a certificate, with a reason, and restore it. A withdrawn certificate reads as no longer valid to anybody who checks the number, at once; a certificate whose holder has been expelled, or who is neither among the members nor among the alumni any more, reads the same way on its own.",
    ],
    related: ['my-membership', 'people-members', 'settings-activity'],
  },
  'settings-activity': {
    detail: [
      "The record of what has been done in the workspace: who, what, where, when, and with which role at that exact moment.",
      "Entries are written by the server as each action is carried out, so the trail does not depend on any page remembering to record itself. The outcome is part of the entry: an attempt that was refused is recorded as refused, which is exactly what a security log is for.",
      "Entries never change retroactively. A later role change does not rewrite what somebody did before it.",
    ],
    related: ['settings-users', 'settings-roles'],
  },
  'settings-roles': {
    detail: [
      "Who can use which parts of the workspace, as one table of roles against subsections.",
      "It is generated from the workspace's live access rules rather than maintained by hand, so it always reflects what each role can actually do. The special rules under the grid are the nuances a single level cannot express.",
    ],
    related: ['settings-users', 'settings-mobile'],
  },
  'settings-mobile': {
    detail: [
      "What each part of the workspace offers on a phone.",
      "There is one rule and this page states it: every page opens, within your role, and nothing can be edited, apart from the three pages ticked in the table, Attendance, the GPA converter and Brainteasers. The list of what it covers is generated from the live navigation, so it cannot fall behind the workspace it describes.",
    ],
    related: ['settings-roles'],
  },
  'website-faqs': {
    detail: [
      "The admissions questions, in the four categories the Join page groups them by.",
      "Everything here appears in two places at once: at the foot of the public Join page, and in an applicant's own FAQs page inside the workspace. A question that is not published stays here and disappears from both.",
      "Order is per category, so moving a question renumbers its category rather than one row at a time.",
    ],
    related: ['applications-website', 'website-pages'],
  },
  'website-testimonials': {
    detail: [
      "The quotes in the homepage carousel, each linked to the alumnus who gave it.",
      "Reorder to change the sequence on the homepage. Unpublish hides one without deleting it. The alumnus's current company is read live from the alumni directory, so it never goes stale.",
    ],
    related: ['people-alumni', 'website-pages'],
  },
  'website-history': {
    detail: [
      "The timeline shown in Our History on the About page: one key event per year.",
      "A year with no event stays on the rail as a quiet marker, so the story never skips a step.",
    ],
    related: ['website-pages'],
  },
  'website-pages': {
    detail: [
      "Which public pages are switched on.",
      "When a page is hidden its address stays reachable, but a visitor sees a Page Under Update notice over a blurred body rather than a dead link. The homepage and the legal pages cannot be hidden.",
    ],
    related: ['website-faqs', 'website-history'],
  },
  'website-readings': {
    detail: [
      "The books, papers and resources shown on the public Readings page.",
    ],
    related: ['reports-archive'],
  },
  'ops-auto-emails': {
    detail: [
      "Every automatic email the workspace can send, with its layout, its subject line, when it fires and who receives it, together with the log of what was actually sent.",
      "The templates are maintained in code; this page is where they are read and their delivery checked.",
      "Every email shares one layout: a greeting by first name, two or three short sentences, the key facts in one block, one button for the likely next step and other links as plain text, then the Society's name, the Privacy Policy, a contact link and the disclaimer. Each goes out as HTML and as plain text written from the same content.",
      "In dark mode the background turns dark, the logo and the text white and the button a lighter purple where the mail app allows it; where it does not, the logo keeps a thin white outline, so it is always visible.",
      "Only the reminders to register for an event and the thank-you note after one carry an unsubscribe link, and it stops those two kinds only. An email not sent for that reason is listed in the register as Suppressed.",
      "Eleven templates that nothing sent are kept switched off, with their text, at the end of the list.",
      "The thank-you to guests goes out the morning after an event to the attendees who are not members. Switching its template off here stops it.",
      "The roles Member and Advisor receive no reminders about upcoming events and no reminder to complete their profile. The confirmation and entry code of an event they register for still reach them.",
      "Interview booking emails give times in the 12-hour format with the time zone and carry Add to calendar links, for the candidate and for the examiner.",
    ],
    related: ['applications-screening', 'ops-newsletter'],
  },
  'ops-newsletter': {
    detail: [
      "The people who subscribed through the public newsletter form.",
    ],
    related: ['ops-auto-emails'],
  },
  'welcome': {
    detail: [
      "Your manual, generated for your role from the same rules that run the workspace, so it never describes a page you cannot open.",
      "It covers how the workspace works, every page you can reach, the tasks that cross more than one of them, the vocabulary, and what to do when something looks wrong.",
      "The download is the same document as a file. Many members upload it to an AI assistant and ask for a summary of their role or a walkthrough of one task.",
    ],
    related: ['my-role', 'settings-roles'],
  },
  'my-role': {
    detail: [
      "My Profile is three pages: Personal Information, Membership and Commitment, each in the navigation and each with its own address. A band at the top of all three shows who you are (picture, name, role, standing, member since), how complete your profile is and the state of your semester commitment, each a way to the page that deals with it.",
      "Personal Information is your details (name and email from the register; phone number, LinkedIn link and picture, which you change from a computer, one at a time with Change), the brief of your role, and your promotion path with what the Statute requires.",
      "Your role and division are assigned by the President or the association account. You cannot change your own role from any page, and the server enforces that as well as the interface.",
      "A profile without a photo or a phone number receives a reminder on a Monday at 9:00 am that lists what is missing and explains how to make a professional photo with Career, LinkedIn. At most twice a semester, two weeks apart; never to the roles Member and Advisor.",
    ],
    related: ['my-membership', 'my-commitment', 'welcome'],
  },
  'my-membership': {
    detail: [
      "Your path through the Society: the semester you joined, the semesters served and your published reports, then your career semester by semester, grouped by academic year, with the current one marked Now.",
      "The semesters come from the Time Machine (the current one from the register); the President or the Vice President corrects a wrong one in People, Time Machine. Your projects are the reports whose authors include you, matched as the report pages match them, each opening on its page in the research archive.",
      "Active members also find their certificate of membership here: a PDF of the current role and semester, signed by the President and the Vice President on behalf of the Board, with a number anybody can check at minervaims.org/verify. Former members listed among the alumni find one for the last semester they served.",
    ],
    related: ['my-role', 'people-rosters', 'reports-archive'],
  },
  'my-commitment': {
    detail: [
      "Once a semester, when the application window opens, the semester commitment leads this page until you answer it; then the page shows your answer and its date. It works on a phone, where the email is usually read.",
      "What you have signed lists every commitment and declaration, newest first; Read shows the exact words of the version you signed, with your typed name and the date.",
      "While the Board asks for it, One association at a time explains the policy (no other Bocconi student association in the categories Management, Finance, or Economics and Social Sciences of Bocconi's list), says whether you have signed, links to the list and opens the declaration. The Society Statute card opens the Statute and what it asks of every member.",
    ],
    related: ['my-role', 'settings-declarations'],
  },
  'dashboard': {
    detail: [
      "A summary of the association's semester, identical for every member: research output, people, and fund performance, always against the semester before.",
      "Nothing here needs maintaining. Every figure is computed from the registers the workspace already holds.",
      "A member starting out in an analyst, media analyst, operations analyst, senior analyst, team leader or portfolio manager role sees Getting started in the place of Research by division: five steps that tick themselves as they are done and can be ticked by hand. Once all are done, or the card is hidden, the chart returns.",
    ],
    related: ['reports-archive', 'people-members', 'reports-funds'],
  },
  'people-invites': {
    detail: [
      "Accounts for advisors and alumni, who have left Bocconi and cannot register themselves because new accounts are restricted to the university's three domains.",
      "An invitation is not a way round that rule. The association creates the account itself and emails a link to set a password; the sign-up form is never involved.",
      "Once somebody accepts, they are an ordinary account and their access is managed in Settings, Users. This page keeps the record of who invited whom, as what, and when.",
      "Only the President and the Vice President open this page and send invitations; advisors can read it.",
    ],
    related: ['people-members', 'people-alumni', 'settings-users'],
  },
  'applications-status': {
    detail: [
      "Where your application has got to, and what happens next.",
      "The five stages are the association's whole selection process: received, under review, interview, phone call and outcome. Only the ones your application has reached are lit.",
      "It is also where you can withdraw, if you no longer wish to be considered. You sign by writing your name, exactly as you would to accept an offer, and we confirm it by email.",
      "What you submitted, including your documents, is in My Profile. It is not repeated here.",
    ],
    related: ['my-role', 'applications-faqs'],
  },
  'applications-call': {
    detail: [
      "Your phone call with the President or the Vice President, a short conversation about knowing the Society as a whole. It is not a technical conversation about markets, and there is nothing to prepare.",
      "Choose one of the times on offer within 72 hours of the invitation. You can move it once, up to an hour before it starts. We call you on the number in your application; the number we call from is shown with your booking.",
    ],
    related: ['applications-status'],
  },
  'applications-faqs': {
    detail: [
      "The questions applicants ask most, with the association's answers.",
      "These are the same answers published at the foot of the public Join page, so nothing here is written for one audience and hidden from the other.",
    ],
    related: ['applications-status'],
  },
  'career-templates': {
    detail: [
      "The association's one-page CV template and its cover letter template, one page with a tab each: CV and Cover letter. The tab is in the address, and the old addresses of the two pages open the right tab.",
      "On each tab, the left half says what the template is, that it stays inside Minerva, and the disclaimer in full, with the download. The right half is the document itself, page by page, scrolling on its own; on a phone the two stack, download first.",
      "The preview is drawn in the workspace from the same file you download, so nothing is sent to an outside viewer. The downloaded file is always the reference. Both files are read when the page opens, so switching tab is immediate.",
      "The page fits the screen: the left column and the preview scroll on their own. Downloads are recorded in the activity log, which is why the page says they are tracked.",
    ],
    related: ['career-linkedin', 'career-gpa'],
  },
  'career-linkedin': {
    detail: [
      "Three cards of equal width, one per part of a profile: the About section, the profile picture and the banner.",
      "Each card has the same four rows at the same heights: what goes in and what comes out, one line on what it needs, the steps, and the buttons that do the association's half of the work: a prompt to copy, a background to download, a wallpaper to choose.",
      "The wallpapers are shown whole, at their own proportions, because LinkedIn crops them itself when they are uploaded.",
    ],
    related: ['career-templates', 'my-role'],
  },
  'career-brainteasers': {
    detail: [
      "Three views: Questions, My progress and Greenbook. Questions lists the set beside the question on screen; the filters (type, firm, where you stand, search) stay above the list, and only the list and the question scroll.",
      "Each solution opens on request, up to 40 new ones an hour and 150 a day, and cannot be selected or printed from the page. What you mark, flag and note is yours alone.",
      "The greenbook is the only download: a copy with your name, email and the date on every page, recorded, for your own study. The President and the admin account replace it; the President, the Vice President and the Head of Operations correct and add questions.",
    ],
    related: ['career-gpa', 'career-templates'],
  },
  'career-gpa': {
    detail: [
      "Three views of one tool: Convert a grade, Weighted average and Saved.",
      "Conversions use equivalence bands by default, or the German linear formula on request, across twenty-two grading systems in Italy, the UK and Ireland, North America and the rest of Europe.",
      "Saved averages belong to you alone: they are stored in your account, readable by nobody else, and work from a phone as well as a computer.",
    ],
    related: ['career-templates'],
  },
};

