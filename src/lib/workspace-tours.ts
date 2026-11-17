// =====================================================================
// THE GUIDED TOURS OF THE WORKSPACE (Step 106).
// ---------------------------------------------------------------------
// A tour walks a reader through the REAL workspace: it opens the page a
// step is about, dims everything else and points at the thing itself.
// It replaces reading about an interface with being shown it, which is
// how the interface is actually learnt.
//
// THIS FILE IS THE WORDS AND THE PLACES, AND NOTHING ELSE. No component,
// no browser access: `WorkspaceTour` draws it, How To Use lists it, and
// scripts/help-tours.test.mjs reads it as it is.
//
// A TOUR FOLLOWS THE READER'S ROLE. Most roles work in a few parts of the
// workspace, not in all of it, so there are two kinds of tour:
//
//   start   for everybody: finding your way, your own pages, working
//           with a list. Every member is offered them.
//   role    one per area of work (Reports, Recruiting, Events, Social
//           Media, Operations, the Website, the emails, Settings). A role
//           is offered the tour of an area only when it can open a page
//           there, and the tour it is given covers only those pages.
//
// Each step about a page names it (`page`). Before a tour starts it is
// fitted to the reader (`fitTour`):
//
//   * a step about a page the reader cannot open is left out;
//   * a step about changing something (`needs: 'edit'`) is left out for
//     a reader who can only read that page;
//   * a reader who can read a page but not change it is given the step's
//     `readBody`, which says what they can see and who changes it, so a
//     tour never shows somebody a button their role does not have.
//
// The levels are the access matrix's, through the same `canView` and
// `canEdit` the pages use, so a tour and the page it points at can never
// disagree about what this reader may do.
//
// A STEP POINTS AT A PLACE BY A SELECTOR. The shells mark the parts every
// page has (`data-tour`: the sections, the pages of a section and each
// page's name in that list as `page-<key>`, the search, where you are,
// leaving); a page marks its own parts the same way. A step whose place
// is not on screen for this reader is skipped when it is reached, so a
// tour never points at nothing.
//
//   target        where to point on a computer; none means a card in the
//                 middle of the screen
//   mobileTarget  where to point on a phone; left out, the same as
//                 `target`; `null`, a card in the middle
//   go            the page to open before the step is shown, by the
//                 workspace's own keys
// =====================================================================

export interface TourStep {
  id: string;
  title: string;
  /** What the step says to a reader who can change what it describes (or when nothing is changed there). */
  body: string;
  /** What it says instead to a reader who can open the page but not change it. */
  readBody?: string;
  /** The page the step is about: left out for a reader who cannot open it. */
  page?: string;
  /** 'edit': the step is about changing something, and is left out for a reader who can only read the page. */
  needs?: 'edit';
  target?: string;
  mobileTarget?: string | null;
  go?: { section: string; sub?: string | null };
}

export interface Tour {
  id: string;
  title: string;
  /** One line under the title, on its card in How To Use. */
  summary: string;
  /** 'start' tours are for everybody; a 'role' tour covers one area of work. */
  kind: 'start' | 'role';
  audience: 'members' | 'applicants';
  /**
   * The tour is offered when the reader can open at least one of these
   * pages (with `offerTo: 'editors'`, change at least one of them).
   * Left out, the tour is for every reader of its audience.
   */
  pages?: string[];
  offerTo?: 'readers' | 'editors';
  steps: TourStep[];
}

/** A tour fitted to one reader: only the steps they can follow, in their words. */
export interface FittedTour extends Tour {
  /** About how long it takes, in minutes, for the steps this reader is given. */
  minutes: number;
}

/** What a tour needs to know about its reader. `useAccess()` is one. */
export interface TourReader {
  canView: (page: string) => boolean;
  canEdit: (page: string) => boolean;
  isCandidate: boolean;
}

/** Where a page's name is in the list of its section's pages. */
const pageMark = (key: string) => `[data-tour="page-${key}"]`;

/**
 * A step about one page of a section: it opens the page and points at the
 * page's name in the section's list, and it is fitted to the reader's
 * level on that page.
 */
function onPage(section: string, page: string, step: Omit<TourStep, 'page' | 'go'>): TourStep {
  return { target: pageMark(page), ...step, page, go: { section, sub: page } };
}

export const TOURS: Tour[] = [
  // ---------------------------------------------------------------
  // FOR EVERYBODY
  // ---------------------------------------------------------------
  {
    id: 'basics',
    title: 'Find your way around',
    summary: 'The sections, the pages inside them, the search and the help. Start here.',
    kind: 'start',
    audience: 'members',
    steps: [
      {
        id: 'welcome',
        title: 'The workspace in six steps',
        body: 'This tour points at the real workspace, one part at a time. Press Next to move on, Back to return, and Esc to leave whenever you like. Nothing you see during a tour is changed by it.',
        go: { section: 'dashboard' },
      },
      {
        id: 'sections',
        title: 'The sections',
        body: 'Everything is grouped in sections: your profile, the calendar, reports, events, people and the rest. You only see the sections your role can open, so the list is yours, not everybody\'s.',
        target: '[data-tour="nav"]',
        mobileTarget: '[data-tour="bar-menu"]',
      },
      {
        id: 'pages',
        title: 'The pages of a section',
        body: 'A section holds one or more pages. On a computer they are listed beside the section; on a phone they are the chips under the title. The one you are reading is marked.',
        target: '[data-tour="subnav"]',
        go: { section: 'my-role', sub: 'my-role' },
      },
      {
        id: 'place',
        title: 'Where you are',
        body: 'This line always names the section and the page in front of you. If you were sent a link to a page, this is how you check you landed on it.',
        target: '[data-tour="place"]',
      },
      {
        id: 'search',
        title: 'Search',
        body: 'The quickest way to anything: type two or three letters of a page, a person or a help topic and press Enter. Before you type, it offers the last three pages you opened. On a computer, Ctrl K or the / key opens it from anywhere. It only finds what your role can open.',
        target: '[data-tour="search"]',
      },
      {
        id: 'help',
        title: 'Help for the page you are on',
        body: 'The round ? opens the help for this page: what it is for, what you can do here and how to do it, written for your role. A small ? beside a title or a field explains that one thing. The help stays open beside the page while you work; close it with its cross or with Esc.',
        target: '.ws-help-fab',
      },
      {
        id: 'leave',
        title: 'Leaving',
        body: 'Return to Website takes you to the public site and keeps you signed in; on a phone it is the Website button in the upper right corner. Log Out signs you out on this device; on a phone it is at the foot of the Menu.',
        target: '[data-tour="leave"]',
      },
      {
        id: 'done',
        title: 'That is the whole frame',
        body: 'Every page sits inside what you have just seen. How To Use has a tour of each part of the workspace your role works in, and the ? is on every page when you need it.',
        go: { section: 'welcome' },
      },
    ],
  },
  {
    id: 'mine',
    title: 'Your own pages',
    summary: 'Your profile, your path in the Society, the calendar, your events and the career tools.',
    kind: 'start',
    audience: 'members',
    steps: [
      onPage('my-role', 'my-role', {
        id: 'profile',
        title: 'My Profile: who you are',
        body: 'Your details and picture, and the role you hold with what it covers. The band at the top, on all three pages of My Profile, shows your standing, how long you have been a member, how complete your profile is and the state of your semester commitment.',
      }),
      onPage('my-role', 'my-membership', {
        id: 'membership',
        title: 'Membership: your fee and your path',
        body: 'Where your membership fee stands (paid, or what to pay, by when and how), then the role you held in every semester, the reports that name you among their authors, and your certificate of membership as a PDF.',
      }),
      onPage('my-role', 'my-commitment', {
        id: 'commitment',
        title: 'Commitment: what you have signed',
        body: 'The semester commitment comes first, then every signature you have given, the one-association policy while the Board asks for it, and the Society Statute.',
      }),
      {
        id: 'calendar',
        title: 'The Calendar',
        body: 'What the association has on: events, Association on Display days, alumni calls, application windows and fee deadlines. Open an event to read it and, where registration is open, to register.',
        page: 'calendar',
        target: '[data-tour="place"]',
        go: { section: 'calendar' },
      },
      onPage('events', 'events-mine', {
        id: 'events',
        title: 'My Events',
        body: 'Your own record of the semester\'s events: what you can still register for, what you attended and what you missed, and who to tell if your attendance was not recorded correctly.',
      }),
      onPage('career', 'career-templates', {
        id: 'career',
        title: 'Career',
        body: 'Tools for your own applications: the association\'s CV and cover letter templates, LinkedIn guidance, a GPA converter, and brainteasers and IB questions to train on. What you record there is yours alone.',
      }),
    ],
  },
  {
    id: 'registers',
    title: 'Work with a list',
    summary: 'Searching, filtering and opening a row. Shown on the members register; every list works the same way.',
    kind: 'start',
    audience: 'members',
    pages: ['people-members'],
    steps: [
      {
        id: 'intro',
        title: 'One way of working, on every list',
        body: 'Members, alumni, candidates, reports, fees, events: most pages are a list of records. They all search, filter and open the same way, so what you learn here applies everywhere.',
        go: { section: 'people', sub: 'people-members' },
      },
      {
        id: 'search',
        title: 'Search the list',
        body: 'Type part of a name or an address and the list narrows as you type. Clear the box to see everything again.',
        target: '[data-tour="register-search"]',
      },
      {
        id: 'filters',
        title: 'Filter by a column',
        body: 'On a computer each column heading with a small arrow is a filter: open it and tick the values you want. On a phone the same filters are behind the Filters button. A line above the list names every filter that is on, with a cross to remove it.',
        target: '[data-tour="register-filters"]',
        mobileTarget: '[data-tour="register-filters-phone"]',
      },
      {
        id: 'rows',
        title: 'Open a record',
        body: 'Each row is one record. Click a name to open it. The actions used often are on the row; the rare ones, and anything that removes something, wait under the button with three dots, last and in red, and always ask first.',
        target: '[data-tour="register-rows"]',
        mobileTarget: 'ul[aria-label="Members"]',
      },
      {
        id: 'levels',
        title: 'What you can change',
        body: 'Whether you can add, edit or remove here depends on your role. Where you can only read, the buttons that change things are not shown. The help for each page says which applies to you, at the top.',
        target: '.ws-help-fab',
      },
    ],
  },

  // ---------------------------------------------------------------
  // ONE PER AREA OF WORK, offered to the roles that work there
  // ---------------------------------------------------------------
  {
    id: 'people',
    title: 'People',
    summary: 'The members register, every past semester, the alumni and the invitations.',
    kind: 'role',
    audience: 'members',
    pages: ['people-members', 'people-rosters', 'people-alumni', 'people-invites'],
    steps: [
      onPage('people', 'people-members', {
        id: 'members',
        title: 'Members',
        body: 'The register of the current semester: every member and advisor, each with the one role that decides what they can open in the workspace. Add, edit, move to alumni or remove a member here; roles are assigned only by the President.',
        readBody: 'The register of the current semester: the members and advisors your role can see, with their role and division. Your role reads it; changing it is for the Board.',
      }),
      onPage('people', 'people-rosters', {
        id: 'rosters',
        title: 'Time Machine',
        body: 'Who was in the Society, semester by semester, from Fall 2019: the Board first, then each division by team and role, with the registers frozen when each fee collection closed. Only the President and the Vice President correct a past semester.',
      }),
      onPage('people', 'people-alumni', {
        id: 'alumni',
        title: 'Alumni',
        body: 'The alumni directory: who they are, where they work and how to reach them.',
      }),
      onPage('people', 'people-invites', {
        id: 'invites',
        title: 'Invites',
        body: 'Accounts for advisors and alumni, who no longer hold a university address and so cannot register themselves. Invite one, send an invitation again, or revoke one that has not been accepted.',
        readBody: 'Accounts for advisors and alumni, who cannot register themselves: who has been invited, as what, by whom, and whether they have accepted.',
      }),
    ],
  },
  {
    id: 'reports',
    title: 'Reports and research',
    summary: 'Finding a report, the templates your division works from and, for the roles that publish, the uploads and the fund figures.',
    kind: 'role',
    audience: 'members',
    pages: ['reports-archive', 'reports-upload', 'reports-templates', 'reports-funds', 'reports-divisions'],
    steps: [
      onPage('reports', 'reports-archive', {
        id: 'archive',
        title: 'Report Archive',
        body: 'Every report the association has produced, filtered by division, fund, year and status. Publish, edit, block or delete a report from its row; Delete is under More, last and in red, and a deleted report can be restored for 30 days.',
        readBody: 'Every report the association has produced, filtered by division, fund, year and status. Search, preview and download the reports of your division.',
      }),
      onPage('reports', 'reports-upload', {
        id: 'upload',
        title: 'Upload Report',
        needs: 'edit',
        body: 'Publish a new report: its file, title, division, authors and date. Once published it is in the archive and on the public website, at an address that never changes.',
      }),
      onPage('reports', 'reports-templates', {
        id: 'templates',
        title: 'Templates & Repositories',
        body: 'Your division\'s material: model and report templates, code repositories, links and reference texts, in one library you can search. Add, edit and pin items; general material shows whichever division is chosen.',
        readBody: 'Your division\'s material: model and report templates, code repositories, links and reference texts, in one library you can search and download from. General material shows whichever division is chosen.',
      }),
      onPage('reports', 'reports-funds', {
        id: 'funds',
        title: 'Fund Performances',
        body: 'The four virtual funds\' monthly returns are typed here, once. Every figure on the fund pages, Track Record, the data files and the Dashboard is computed from them, so a return is corrected here and nowhere else.',
        readBody: 'The four virtual funds\' monthly returns, and every figure computed from them: the same numbers the fund pages, Track Record and the Dashboard show.',
      }),
      onPage('reports', 'reports-divisions', {
        id: 'divisions',
        title: 'Division Pages',
        body: 'What each division\'s public page says under How we work, and which three reports it shows as Flagship work.',
      }),
    ],
  },
  {
    id: 'recruiting',
    title: 'Recruiting',
    summary: 'Screening applications, interview slots, phone calls and offers, as far as your role takes part in them.',
    kind: 'role',
    audience: 'members',
    pages: ['applications-screening', 'applications-website', 'applications-interview-calendar', 'applications-calls', 'applications-joiners', 'applications-form'],
    steps: [
      onPage('applications', 'applications-website', {
        id: 'window',
        title: 'Application Page',
        needs: 'edit',
        body: 'When applications open and close, which divisions take applications and the semester\'s label. The preview shows how the Homepage and the Join page change when the window opens.',
      }),
      onPage('applications', 'applications-screening', {
        id: 'screening',
        title: 'Candidates Screening',
        body: 'This semester\'s applications: each profile, CV, written answer and shared note, the division the candidate is evaluated for, and their status. When a change would email the candidate, a window says so before anything is sent.',
        readBody: 'This semester\'s applications: each profile, CV, written answer and shared note, and the candidate\'s status. Your role reads them; deciding on a candidate is for the roles that run the intake.',
      }),
      onPage('applications', 'applications-interview-calendar', {
        id: 'interviews',
        title: 'Interview Calendar',
        body: 'Open interview slots for your division. Invited candidates book one themselves and are sent the confirmation and a reminder by email; a booked slot shows who is coming.',
        readBody: 'The interview slots of each division and who has booked them. Opening and changing slots is for the roles that run the intake.',
      }),
      onPage('applications', 'applications-calls', {
        id: 'calls',
        title: 'Phone Calls',
        body: 'After the interview, the short call with the President or the Vice President, about the Society as a whole rather than markets. Candidates choose a time from the ones offered here.',
        readBody: 'After the interview, the short call with the President or the Vice President, about the Society as a whole rather than markets, and the times offered for it.',
      }),
      onPage('applications', 'applications-joiners', {
        id: 'offers',
        title: 'Offers',
        body: 'The last step: a formal offer with the role and the division, sent from here. The candidate has three days to accept it in their workspace, and accepting makes them a member.',
        readBody: 'Who has received an offer, with the role, the division and the answer. Sending an offer is the President\'s.',
      }),
      onPage('applications', 'applications-form', {
        id: 'form',
        title: 'Form & Questions',
        needs: 'edit',
        body: 'The written question your division asks its applicants, answered with a PDF. The rest of the form is the same for every division; Preview the form shows it as applicants see it.',
      }),
      {
        id: 'candidate-side',
        title: 'What the candidate receives',
        body: 'Each stage sends the candidate an email of its own and opens a page in their workspace: the interview, the phone call, the offer. Their Status page always says where they stand and what comes next.',
      },
      onPage('applications', 'applications-preview', {
        id: 'preview',
        title: 'Applicant Preview',
        body: 'See all of it as an applicant does: a sample applicant at the stage you choose, with their own pages and every email they receive. You can book a slot or answer the offer there as they would; nothing is saved or sent.',
      }),
    ],
  },
  {
    id: 'events',
    title: 'Running events',
    summary: 'Creating an event, its registration form, the door list and the archive, for the roles that organise them.',
    kind: 'role',
    audience: 'members',
    pages: ['events-create', 'events-forms', 'events-attendance', 'events-archive'],
    steps: [
      onPage('events', 'events-create', {
        id: 'create',
        title: 'Create Event',
        needs: 'edit',
        body: 'A new event of any type, from a meeting to an alumni call, with its schedule, place and poster. Whether it appears on the public website is chosen on the event.',
      }),
      onPage('events', 'events-forms', {
        id: 'forms',
        title: 'Registration Forms',
        body: 'Turn registration on for an event, choose who may register, preview the public form and share its link. Registrations and their confirmation emails then arrive by themselves.',
        readBody: 'Which events take registrations, who may register and what the public form asks. Turning registration on is for the roles that organise events.',
      }),
      onPage('events', 'events-attendance', {
        id: 'attendance',
        title: 'Attendance',
        body: 'Who registered and who came. Scan tickets at the door, take an online event\'s attendance from its Teams report, and add walk-ins. A name that matches more than one member waits for you to link it.',
        readBody: 'Who registered for each event and who came, to search and filter. Recording attendance is for the roles that run the door.',
      }),
      onPage('events', 'events-archive', {
        id: 'archive',
        title: 'Event Archive',
        body: 'Every event of every type, alumni calls included, with its poster, its type and whether it is on the website: the association\'s record of what it has done.',
      }),
      onPage('events', 'events-on-display', {
        id: 'display',
        title: 'Association On Display',
        body: 'The stand\'s day in 30-minute slots, from 10:00 am to 7:00 pm. A slot is covered once more than eight people have registered for it, or once all five core divisions are on it.',
      }),
    ],
  },
  {
    id: 'media',
    title: 'Social media',
    summary: 'The editorial plan, the post templates, the graphics, the design system and the advertising register.',
    kind: 'role',
    audience: 'members',
    pages: ['smm-editorial', 'smm-social', 'smm-graphics', 'smm-brand', 'smm-ads'],
    steps: [
      onPage('smm', 'smm-editorial', {
        id: 'editorial',
        title: 'Editorial Calendar',
        body: 'The Media team\'s plan: what is published, where and when, and how far along each piece is. Add an item, then drag it to another day, or to another column of the board to change its status.',
        readBody: 'The Media team\'s plan: what is published, where and when, and how far along each piece is, by month, as a board or as a list.',
      }),
      onPage('smm', 'smm-social', {
        id: 'social',
        title: 'Social Templates',
        body: 'Instagram, LinkedIn and Other Resources as three tabs: the posts with their captions, and everything else the posts draw on. You see the tabs your role may open.',
      }),
      onPage('smm', 'smm-graphics', {
        id: 'graphics',
        title: 'MIMS Graphics',
        body: 'Logos, marks, templates and ready-to-use graphics in a library you can search. Preview one full screen, or download several at once as a ZIP.',
      }),
      onPage('smm', 'smm-brand', {
        id: 'brand',
        title: 'Design System',
        body: 'The association\'s visual identity, chapter by chapter: colours, type, logos, layout and voice, and the whole package to download.',
      }),
      onPage('smm', 'smm-ads', {
        id: 'ads',
        title: 'Ads & Spending',
        body: 'Every paid advertisement, semester by semester: the content, the platform, the amount, the purpose and how well it worked. Each amount is posted once to the Treasury.',
      }),
    ],
  },
  {
    id: 'operations',
    title: 'Operations and money',
    summary: 'The membership fee, the Treasury, forms, external relations and the official documents.',
    kind: 'role',
    audience: 'members',
    pages: ['ops-fee', 'ops-treasury', 'ops-forms', 'ops-external', 'ops-docs'],
    steps: [
      onPage('operations', 'ops-fee', {
        id: 'fee',
        title: 'Membership Fees',
        body: 'The fee, semester by semester: open a collection, tick who has paid, close it. Opening it emails every member who pays; closing it posts the total to the Treasury and freezes the semester\'s official register.',
        readBody: 'Who has paid this semester\'s fee, and every collection before it. Opening a collection and recording payments is for the roles that run it.',
      }),
      onPage('operations', 'ops-treasury', {
        id: 'treasury',
        title: 'Treasury',
        body: 'The association\'s cash-flow register, semester by semester. The fee and the advertising spending arrive here by themselves; everything else is recorded here, once.',
        readBody: 'The association\'s cash-flow register, semester by semester, with the balance. Recording an entry and exporting the register are for the roles that keep it.',
      }),
      onPage('operations', 'ops-forms', {
        id: 'forms',
        title: 'Forms',
        body: 'Forms for members, for guests or for both: a merchandise order, interest in a company visit, a sign-up with preferences. Build it, open it, then read, tick and export the answers in one place.',
      }),
      onPage('operations', 'ops-external', {
        id: 'external',
        title: 'External Relations',
        body: 'The association\'s contacts, agreements, files and links, searchable by name, email or note. Add an entry, or upload several documents at once.',
        readBody: 'The association\'s contacts, agreements, files and links, searchable by name, email or note, to preview or download.',
      }),
      onPage('operations', 'ops-docs', {
        id: 'docs',
        title: 'Statute & Documents',
        body: 'The official documents: the Statute, its drafts and the approval documents. Upload several at once, and pin the ones members look for.',
        readBody: 'The official documents: the Statute, its drafts and the approval documents, to preview or download.',
      }),
    ],
  },
  {
    id: 'website',
    title: 'The public website',
    summary: 'What the public site shows: its pages, readings, testimonials, partners, history, FAQs and the newsletter.',
    kind: 'role',
    audience: 'members',
    pages: ['website-pages', 'website-readings', 'website-testimonials', 'website-partnerships', 'website-history', 'website-faqs', 'ops-newsletter'],
    offerTo: 'editors',
    steps: [
      onPage('website', 'website-pages', {
        id: 'pages',
        title: 'Pages',
        body: 'Show or hide individual pages of the public website.',
        readBody: 'Which pages of the public website are shown at the moment, and which are hidden.',
      }),
      onPage('website', 'website-readings', {
        id: 'readings',
        title: 'Readings',
        body: 'The reading recommendations on the public website. Add one, edit it, or drag it into a new place in the list.',
        readBody: 'The reading recommendations on the public website, in the order they are shown.',
      }),
      onPage('website', 'website-testimonials', {
        id: 'testimonials',
        title: 'Testimonials',
        body: 'The members\' words on the homepage, and which of them are shown.',
      }),
      onPage('website', 'website-partnerships', {
        id: 'partnerships',
        title: 'Partnerships',
        body: 'The student associations the Society has an agreement or a joint initiative with, as the website\'s Partnerships page lists them.',
      }),
      onPage('website', 'website-history', {
        id: 'history',
        title: 'History',
        body: 'The Our History timeline on the About page: one key event per year, from the founding in 2017 to today.',
      }),
      onPage('website', 'website-faqs', {
        id: 'faqs',
        title: 'FAQs',
        body: 'The admissions questions, in four categories, shown on the Join page and on the applicants\' own FAQs page.',
      }),
      onPage('website', 'ops-newsletter', {
        id: 'newsletter',
        title: 'Newsletter',
        body: 'Who subscribes to the newsletter, and the sends.',
      }),
    ],
  },
  {
    id: 'emails',
    title: 'How emails are sent',
    summary: 'Where the automatic emails come from, when they go out and how to check one arrived.',
    kind: 'role',
    audience: 'members',
    pages: ['ops-auto-emails'],
    steps: [
      {
        id: 'intro',
        title: 'Nobody writes these by hand',
        body: 'Confirmations, invitations, reminders and receipts are sent by the workspace itself, when something happens: somebody registers, applies, is invited or pays. This page holds every one of them.',
        page: 'ops-auto-emails',
        go: { section: 'website', sub: 'ops-auto-emails' },
      },
      {
        id: 'templates',
        title: 'One template per email',
        body: 'Each line is one email, with the text it sends. Connected means an action in the workspace sends it; a template that is switched off is never sent. Preview shows it exactly as it arrives.',
        target: '[data-tour="emails-templates"]',
      },
      {
        id: 'asked-first',
        title: 'You are asked before a button sends',
        body: 'When pressing a button would send an email (inviting to an interview, sending an offer, opening a fee collection), a window says so first and names who will receive it. Nothing goes out until you confirm there.',
      },
      {
        id: 'register',
        title: 'What was sent, and what happened to it',
        body: 'Every email sent is listed here with its recipient and outcome. Sent means delivered to the mail server; Bounced, Failed and Suppressed are shown in red with the reason. Search by address to answer "did they get it?".',
        target: '[data-tour="emails-register"]',
      },
      {
        id: 'left-out',
        title: 'Who does not receive one',
        body: 'An address that bounced is not written to again. Somebody who unsubscribed stops receiving the optional emails only (event reminders and thank-you notes); confirmations, entry codes, interviews, offers and the fee still reach them. The same email to the same address within five minutes is sent once.',
      },
    ],
  },
  {
    id: 'settings',
    title: 'Settings and access',
    summary: 'Accounts and roles, the permissions table, what works on a phone, the activity log, certificates and declarations.',
    kind: 'role',
    audience: 'members',
    pages: ['settings-users', 'settings-roles', 'settings-mobile', 'settings-activity', 'settings-certificates', 'settings-declarations'],
    steps: [
      onPage('settings', 'settings-users', {
        id: 'users',
        title: 'Users',
        body: 'Who has an account, and the role and division each person holds. The role decides what each person sees and can do everywhere in the workspace.',
      }),
      onPage('settings', 'settings-roles', {
        id: 'roles',
        title: 'Role Permissions',
        body: 'The live table of which role can open and change which page, generated from the real access rules, so it is always accurate.',
      }),
      onPage('settings', 'settings-mobile', {
        id: 'mobile',
        title: 'Mobile View',
        body: 'What the workspace offers on a phone: every page opens there, within the reader\'s role, and the table shows which pages can already be changed.',
      }),
      onPage('settings', 'settings-activity', {
        id: 'activity',
        title: 'Activity Log',
        body: 'Every change made in the workspace and every sensitive download: by whom, with which role at that moment, on what and when.',
      }),
      onPage('settings', 'settings-certificates', {
        id: 'certificates',
        title: 'Certificates',
        body: 'Every certificate of membership the Society has issued, with its number, holder, role, semester and whether it is still valid.',
      }),
      onPage('settings', 'settings-declarations', {
        id: 'declarations',
        title: 'Declarations',
        body: 'The one-association declaration and the semester commitment: where the declaration is asked for, when the commitment is launched and reminded, and who has signed.',
      }),
    ],
  },

  // ---------------------------------------------------------------
  // FOR APPLICANTS. Each stage's page appears in their navigation only
  // once they are invited to it, so its step is skipped until then.
  // ---------------------------------------------------------------
  {
    id: 'applicant',
    title: 'Your application, step by step',
    summary: 'Where your status is, where each stage appears and where to find answers.',
    kind: 'start',
    audience: 'applicants',
    steps: [
      {
        id: 'status',
        title: 'Your status is always here',
        body: 'This page says where your application stands and what happens next. When something changes you also receive an email, but this page is the one to trust.',
        go: { section: 'applications', sub: 'applications-status' },
      },
      {
        id: 'stages',
        title: 'A page opens for each stage',
        body: 'An interview, a phone call and an offer each get a page of their own, and each appears only once you are invited to it. Booking a slot and answering an offer are done on those pages.',
        target: '[data-tour="subnav"]',
        mobileTarget: '[data-tour="bar"]',
      },
      {
        id: 'interview',
        title: 'Your interview',
        body: 'The division that invited you, the slots it has opened and, once you have booked, the confirmed time and the link to join. You receive a confirmation and a reminder by email.',
        page: 'applications-interview',
        target: pageMark('applications-interview'),
      },
      {
        id: 'call',
        title: 'Your phone call',
        body: 'The times you can choose from for your call with the President or the Vice President and, once you have booked, the confirmed time.',
        page: 'applications-call',
        target: pageMark('applications-call'),
      },
      {
        id: 'offer',
        title: 'Your offer',
        body: 'The role, the division, the date by which you must reply, and the decision itself, given on this page.',
        page: 'applications-offer',
        target: pageMark('applications-offer'),
      },
      {
        id: 'help',
        title: 'Help on every page',
        body: 'The round ? explains the page you are on, in plain words. The FAQs answer the questions applicants ask most.',
        target: '.ws-help-fab',
      },
    ],
  },
];

/** The tour with this id, as written (not yet fitted to a reader). */
export function tourById(id: string | null | undefined): Tour | undefined {
  return TOURS.find((t) => t.id === id);
}

/** Can this reader follow a step about `page`, at the level the step needs? */
function stepFits(step: TourStep, reader: TourReader): boolean {
  if (!step.page) return true;
  return step.needs === 'edit' ? reader.canEdit(step.page) : reader.canView(step.page);
}

/**
 * The tour as this reader is given it: only the steps about pages they can
 * open, at their level, in the words for their level. Null when the tour
 * is not for them: another audience, an area they do not work in, or
 * fewer than two steps left to show.
 */
export function fitTour(tour: Tour, reader: TourReader): FittedTour | null {
  if ((tour.audience === 'applicants') !== reader.isCandidate) return null;
  if (tour.pages) {
    const can = tour.offerTo === 'editors' ? reader.canEdit : reader.canView;
    if (!tour.pages.some((p) => can(p))) return null;
  }
  const steps = tour.steps
    .filter((s) => stepFits(s, reader))
    .map((s) => (s.page && s.readBody && !reader.canEdit(s.page) ? { ...s, body: s.readBody } : s));
  if (steps.length < 2) return null;
  // A role tour exists to show an area: it needs at least one of its pages.
  if (tour.kind === 'role' && !steps.some((s) => s.page)) return null;
  return { ...tour, steps, minutes: Math.max(1, Math.round((steps.length * 20) / 60)) };
}

/** The tours this reader can follow, fitted to them, in the order they are offered. */
export function toursFor(reader: TourReader): FittedTour[] {
  return TOURS.map((t) => fitTour(t, reader)).filter((t): t is FittedTour => t !== null);
}

/** The fitted tour with this id, if this reader is offered it. */
export function tourFor(id: string | null | undefined, reader: TourReader): FittedTour | undefined {
  const tour = tourById(id);
  return tour ? fitTour(tour, reader) ?? undefined : undefined;
}

/**
 * The tour to suggest from the help of one page: the one that shows that
 * page, otherwise the first tour offered.
 */
export function tourForPage(tours: FittedTour[], page: string | null | undefined): FittedTour | undefined {
  return (page ? tours.find((t) => t.steps.some((s) => s.page === page || s.go?.sub === page)) : undefined) ?? tours[0];
}

/** Where a step points on this screen: a selector, or null for a card in the middle. */
export function stepTarget(step: TourStep, phone: boolean): string | null {
  if (phone && step.mobileTarget !== undefined) return step.mobileTarget;
  return step.target ?? null;
}

/**
 * Every place a step may point at, in order of preference. A step that
 * opens a page also accepts the line naming where you are, for when the
 * list of the section's pages is folded away on a computer.
 */
export function stepTargets(step: TourStep, phone: boolean): string[] {
  const first = stepTarget(step, phone);
  if (!first) return [];
  const fallback = step.go && first !== '[data-tour="place"]' && first.startsWith('[data-tour="page-') ? ['[data-tour="place"]'] : [];
  return [first, ...fallback];
}

/** The event that starts a tour from anywhere in the workspace. */
export const START_TOUR_EVENT = 'minerva:start-tour';

/** Ask the workspace to start a tour. */
export function startTour(id: string): void {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent(START_TOUR_EVENT, { detail: { id } }));
}

const DONE_KEY = 'mims.tours.done';

/** The tours this browser has finished. Never throws: storage can be unavailable. */
export function toursDone(): string[] {
  try {
    const raw = typeof localStorage === 'undefined' ? null : localStorage.getItem(DONE_KEY);
    const list = raw ? JSON.parse(raw) : [];
    return Array.isArray(list) ? list.filter((x): x is string => typeof x === 'string') : [];
  } catch {
    return [];
  }
}

/** Remember that a tour was finished, for the tick on its card. */
export function markTourDone(id: string): void {
  try {
    const next = Array.from(new Set([...toursDone(), id]));
    localStorage.setItem(DONE_KEY, JSON.stringify(next));
  } catch {
    /* a tick that is not kept is not worth an error */
  }
}
