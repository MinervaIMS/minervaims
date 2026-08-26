// =====================================================================
// Structured role guides shown on My Profile (report section 3).
// Each role's duties, responsibilities, rights and hierarchy, drawn from
// the association statute (Artt. 5-24) and the workspace brief.
// Kept as structured data so the page can present it clearly.
// ---------------------------------------------------------------------
// EVERY LINE BELOW WAS CHECKED BACK AGAINST THE STATUTE, article by
// article, and the corrections that pass found are noted where they were
// made. The recurring fault was not invention but drift: a duty the
// statute gives to one office attributed to a neighbouring one, an
// article's list quoted with two of its five items missing, and the
// association's own proper nouns replaced by translations of them.
//
// Where a responsibility comes from the workspace rather than from the
// statute - keeping the public fund table current, for instance - it is
// left in, because it is real, but it is not dressed up with an article
// reference it does not have.
// =====================================================================

import type { AppRole } from '@/lib/roles';
import { normalizeRole } from '@/lib/roles';

export interface RoleGuide {
  summary: string;
  responsibilities: string[];
  reportsTo: string;
  oversees?: string[];
  rights: string[];
  contact: string;
}

export const roleGuides: Partial<Record<AppRole, RoleGuide>> = {
  president: {
    summary: 'The President directs and coordinates the association towards its purposes, and is its legal representative before the University and third parties.',
    responsibilities: [
      'Convene and chair the Assembly and the Board of Directors, in ordinary and extraordinary session, and sign the association’s administrative acts.',
      'Represent the association externally and hold its relations with alumni, other associations, companies and professionals.',
      'Manage the alumni community and supervise the organisation of events with external guests and speakers.',
      // Art. 12.3.e. This was missing entirely: the President, not the Vice
      // President, monitors and controls the work of Media & Communication.
      'Monitor and control the work of the Media & Communication division, which reports directly to you.',
      // The statute's own English text keeps the event's Italian name. It
      // read "Association on Display" here, which is a translation of a
      // proper noun and matches nothing the association is registered under.
      'Manage the university event Associazioni in Mostra jointly with the Vice President.',
      'Keep the association’s treasury and carry ultimate responsibility for the economic and financial statement; the operational management may be delegated to the Head of Operations (Artt. 12, 24).',
      'Renew the association’s CASA registration at the end of the second academic semester. The statute places this obligation on the President exclusively and it cannot be delegated (Art. 12).',
      'With the Vice President and the Head of Asset Management, review any admission where the transparency or correctness of the process is in doubt (Art. 5).',
    ],
    reportsTo: 'The Assembly of members.',
    oversees: ['Vice President', 'Head of Asset Management', 'Heads of Division', 'Head of Operations', 'Head of Media & Communication'],
    rights: [
      'Convene the Board of Directors and the Assembly.',
      'Cast the deciding vote: where the Board ties, the President’s vote prevails (Art. 14).',
      'Propose to the Board that the publication of a report be blocked (Art. 12).',
      'Delegate your functions in writing each semester, with notice to the Board, except control functions, the CASA registration and relations with third parties (Art. 12).',
      'Access every section of the workspace.',
    ],
    contact: 'For association-level questions, you are the final point of reference; coordinate with the Vice President.',
  },
  vice_president: {
    summary: 'The Vice President supports the President in directing the association and assumes their functions in full when they are absent, impeded or resign. The Vice President is also a legal representative of the association.',
    responsibilities: [
      'Supervise and coordinate internal events, videocalls, meetings and assemblies, jointly with the Head of Operations.',
      'Verify that the semestral membership fees have been collected, and raise any non-payment before the Board of Directors (Artt. 7, 13).',
      'Verify that the association’s CASA registration is renewed at the end of the second academic semester; the renewal itself is the President’s duty.',
      'Supervise the Head of Operations, who formally reports to you and to the President (Art. 13).',
      'Assume the functions of the Head of Asset Management whenever that optional office is vacant (Art. 16).',
      'Manage the university event Associazioni in Mostra jointly with the President.',
      'With the President and the Head of Asset Management, review any admission where transparency or correctness is in doubt (Art. 5), and exercise coordinated control over the timeliness, accuracy and quality of the divisions’ work (Art. 15).',
    ],
    reportsTo: 'The President.',
    oversees: ['Head of Asset Management (when vacant)', 'Heads of Division', 'Head of Operations'],
    rights: [
      'Act for the President when they are absent, impeded or have resigned; you are also a legal representative of the association.',
      'Vote freely and unbound in the Board of Directors (Art. 13).',
      'Propose to the Board that the publication of a report be blocked (Art. 13).',
    ],
    contact: 'Refer to the President; you are the second point of reference for members.',
  },
  head_of_asset_management: {
    summary: 'The Head of Asset Management supervises research quality and deadlines across all five core divisions. The office is optional: when it is not covered, the Vice President assumes its functions.',
    responsibilities: [
      'Supervise the timely delivery of reports by all divisions and assess the quality and accuracy of the projects produced.',
      'Collect practical feedback from the Heads of Division (Art. 16).',
      'Monitor the correctness of the admission process, with particular attention to the fair treatment of every candidate, and take an active part in evaluating applications where a Head of Division expressly asks you to.',
      'During onboarding, verify that every application has been properly assessed.',
      // Art. 16.4.g, absent before. It is the one duty that explains why the
      // office sits where it does in the hierarchy.
      'Cover the functions of a Head of Division when that office is absent or vacant, and those of the Vice President where the two are absent at the same time (Art. 16).',
    ],
    reportsTo: 'The Vice President. The office is hierarchically above the Heads of Division (Art. 16).',
    oversees: ['Heads of Division', 'Portfolio Managers', 'Team Leaders', 'Senior Analysts', 'Analysts'],
    rights: [
      'Intervene on reports as to formatting, clarity of presentation and compliance with the association’s standards (Art. 16).',
      'Propose to the Board that the publication of a report be blocked (Art. 16).',
      'Vote in the Board of Directors.',
      'Access all divisions in order to monitor quality.',
    ],
    contact: 'Refer to the Vice President; Heads of Division refer to you on quality matters.',
  },
  head_of_division: {
    summary: 'A Head of Division leads a core division, is responsible for its output, and sits on the Board of Directors with a vote.',
    responsibilities: [
      'Coordinate the development of the division’s projects and distribute tasks among its internal teams.',
      'Be responsible for deadlines and for the correctness of published reports.',
      'Upload the division’s projects to the association’s website (Art. 17).',
      // Art. 17.3.e, absent before.
      'Work with the Media & Communication team on publishing the division’s content to the official channels and social media.',
      'Run the division’s admission process with the support of the Team Leaders. The final decision on each application is yours, and any rejection must be motivated to the candidate in writing (Art. 5).',
      'Agree the number of new members for the semester with the President, the Vice President and the Head of Asset Management. Every division admits at least one new member per semester (Art. 5).',
      'Organise at least one in-person event open to the whole division each semester, and at least one videocall a year with the division’s alumni.',
      'Report a member’s inactivity, or any other ground for expulsion, to the President, the Vice President or the Head of Asset Management (Art. 17).',
    ],
    reportsTo: 'The Head of Asset Management, and through them the Vice President and the President.',
    oversees: ['Team Leaders', 'Senior Analysts', 'Portfolio Managers (where relevant)', 'Analysts in the division'],
    rights: [
      'Take the final admission decision for your division.',
      'Edit the division’s application question.',
      'Publish the division’s reports.',
      // Art. 17.5.a-c. The limit is as much a part of the office as the
      // powers are, and it was not stated anywhere on this page.
      'Where you consider a report unpublishable, report it to the President, the Vice President or the Head of Asset Management. A Head of Division may not put the proposal to block a report to the Board directly (Art. 17).',
    ],
    contact: 'For quality and deadlines, refer to the Head of Asset Management; for association matters, to the Vice President.',
  },
  team_leader: {
    summary: 'A Team Leader leads a team inside a core division. The office is optional, established at the discretion of the Head of Division, with at most four in the same division, and its term follows the Head of Division’s own (Art. 18).',
    responsibilities: [
      'Distribute tasks among the members of your team.',
      // The statute sets a number. Leaving it out turned a requirement into
      // an aspiration.
      'Organise in-person working meetings, not fewer than three per semester (Art. 18).',
      'Draft the team’s project reports in accordance with the association’s guidelines.',
      'Support the Head of Division in evaluating admission applications (Artt. 5, 18).',
      'Report a member’s inactivity, or any other ground for expulsion, to the Head of Division (Art. 18).',
      'Support the leave requests of your team members: a member asking for a semester of leave must discuss it with their Team Leader or Head of Division (Art. 9).',
    ],
    reportsTo: 'The Head of Division.',
    oversees: ['Senior Analysts in the team', 'Analysts in the team'],
    rights: [
      'Organise your team’s work and its meeting schedule.',
      'Contribute to admission evaluations.',
      'Be consulted before a member of your division is expelled (Art. 9).',
    ],
    contact: 'Refer to your Head of Division. The Head of Portfolio Management and the Head of Asset Management may intervene on formatting, reporting standards and team management (Art. 18).',
  },
  // =====================================================================
  // SENIOR ANALYST - the step between Analyst and Team Leader.
  // ---------------------------------------------------------------------
  // A word about what the statute does and does not say, because the two
  // are easy to conflate here. Art. 18 establishes ONE office and gives it
  // two names: "the office of Team Leader, also denominated Senior
  // Analyst". It does not describe a rank between Analyst and Team Leader.
  //
  // The association nevertheless uses Senior Analyst as exactly that: an
  // analyst who has grown into the work, shadows the Team Leader and
  // carries the newer members. That is a real position in the divisions
  // even though it is not a separate office in the statute, and the
  // workspace models it as its own role, ranked between the two.
  //
  // So this guide describes the position as the association uses it, and
  // says plainly where the statute's own wording sits. The duties are an
  // Analyst's - Art. 20 in full - with the shadowing and the teaching set
  // out on top of them, and none of the Team Leader's formal powers,
  // which belong to the office the Head of Division actually confers.
  // =====================================================================
  senior_analyst: {
    summary: 'A Senior Analyst is an experienced Analyst who supports the Team Leader closely and helps the newer members of the team find their way. The work is an Analyst’s work, carried with more responsibility for the team around you.',
    responsibilities: [
      'Carry out analyses, research and content drafting to the standard the division expects, as any Analyst does.',
      'Shadow and support your Team Leader: help plan the team’s work, keep track of where each piece has got to, and step in where something is at risk of slipping.',
      'Teach the newer Analysts their way of working: the division’s method, its templates, its sources and the standard a report has to reach before it is submitted.',
      'Review your team-mates’ work before it reaches the Team Leader, and give the kind of feedback you would want on your own.',
      'Attend your team’s in-person working meetings and help make them useful.',
      'Respect the deadlines set by the Head of Division, and take an active part in the association’s initiatives during the semester (Artt. 8, 20).',
    ],
    reportsTo: 'Your Team Leader or Portfolio Manager, and the Head of Division.',
    oversees: ['The Analysts you are helping to bring on'],
    rights: [
      'Access the division’s templates, materials and past work.',
      'Contribute to and upload reports where authorised.',
      'Be consulted by your Team Leader on how the team’s work is organised.',
    ],
    contact: 'Refer to your Team Leader day to day, and to the Head of Division on anything concerning the division as a whole. In the statute, Art. 18 names the Team Leader’s office and Senior Analyst as alternative denominations of the same office; the association uses Senior Analyst for the step described here.',
  },
  portfolio_manager: {
    summary: 'A Portfolio Manager is responsible for one of the association’s simulated funds. There is one Portfolio Manager for each active portfolio, and the role carries the status of Team Leader with additional responsibilities of its own (Art. 19).',
    responsibilities: [
      'Be responsible for your fund’s performance and for monitoring it (Art. 19).',
      'Act as the final decision-maker on including an asset in the fund or removing one from it.',
      'Produce the fund’s periodic report: performance, the value of the holdings, and the reasoning behind each investment decision.',
      // Art. 19.2 makes a PM a Team Leader; the Team Leader's own duties
      // therefore apply and were not stated here at all.
      'Carry the Team Leader’s duties for your team: distribute the work, hold no fewer than three in-person meetings a semester, and support the Head of Division during admissions (Art. 18).',
      'Update the Funds’ Performances section whenever a portfolio or fund report is published, so the public fund table stays accurate.',
    ],
    reportsTo: 'The Head of Portfolio Management, and the Head of Asset Management.',
    oversees: ['Analysts in your fund’s team'],
    rights: [
      'You have the final say over your fund’s composition, within the agreed mandate.',
      'Organise your team’s work as a Team Leader does.',
    ],
    contact: 'Refer to the Head of Portfolio Management. The Head of Portfolio Management and the Head of Asset Management may intervene on formatting, reporting standards and team management (Artt. 18, 19).',
  },
  analyst: {
    summary: 'An Analyst is a member assigned to a division and to a team within it, and carries out the research and analysis at the heart of the division’s work.',
    responsibilities: [
      'Support your Team Leader or Portfolio Manager in the activities you are assigned (Art. 20).',
      'Carry out analyses, research and content drafting according to the instructions you receive.',
      'Take part in your team’s working meetings.',
      'Respect the deadlines set by the Head of Division.',
      // Art. 20.2.e, and Art. 8.3.d for every member. It was missing.
      'Take an active part in the initiatives the association organises during the semester.',
    ],
    reportsTo: 'Your Team Leader or Portfolio Manager, and the Head of Division.',
    rights: [
      'Access the division’s templates and materials.',
      'Contribute to and upload reports where authorised.',
      'Request one semester of leave, discussed with your Team Leader or Head of Division (Art. 9).',
    ],
    contact: 'For day-to-day questions, refer to your Team Leader; for division matters, to the Head of Division.',
  },
  head_of_media: {
    summary: 'The Head of Media & Communication leads the auxiliary Media & Communication division and carries ultimate responsibility for the tone, style and accuracy of everything the association publishes.',
    responsibilities: [
      'Produce the textual and visual content for the association’s social channels.',
      // Art. 21.3.b, absent before.
      'Produce the posters and graphic material for events with guests.',
      'Communicate the opening and the closing of admission applications.',
      'Publicise events with guests and the association’s activities.',
      'Verify that communication material complies with the rules of Università Bocconi and of the CASA Committee, in particular the CASA Operational Regulation in force.',
      'Carry ultimate responsibility for the tone, style and accuracy of the association’s communications (Art. 21).',
    ],
    // Art. 21.2.a is explicit: the office reports DIRECTLY to the President.
    // It said "the President and Vice President", and the contact line sent
    // the reader to the Vice President.
    reportsTo: 'The President, directly (Art. 21).',
    oversees: ['Media & Communication Analysts'],
    rights: [
      'Draw on the Media Analysts as you consider appropriate (Art. 21).',
      'Manage the editorial calendar and the communication material.',
      'Sit on the Board of Directors, without a vote.',
    ],
    contact: 'Refer to the President, who monitors and controls the division’s work. The office may not be held together with the presidency or with the Head of Asset Management.',
  },
  media_analyst: {
    summary: 'A Media & Communication Analyst is a member of the Media & Communication division, responsible for supporting and assisting the Head in reaching the objectives assigned (Art. 21).',
    responsibilities: [
      'Produce visual and textual content for the association’s channels.',
      'Support the editorial calendar and the publishing schedule across the channels.',
      'Keep material within the University and CASA communication rules the Head is responsible for.',
    ],
    reportsTo: 'The Head of Media & Communication.',
    rights: [
      'Access the communication templates and material.',
      'Request one semester of leave, discussed with your Head of Division (Art. 9).',
    ],
    contact: 'Refer to the Head of Media & Communication.',
  },
  head_of_operations: {
    summary: 'The Head of Operations is the association’s administrative and logistical function. Operations is an auxiliary division of one person rather than a team (Art. 22).',
    responsibilities: [
      'Collect the semestral membership fee from every member (Artt. 7, 22).',
      'Monitor members’ attendance at the association’s initiatives.',
      'Book rooms for assemblies, meetings and association activities.',
      'Submit applications for events, company visits and other initiatives through the CASA Committee’s institutional channels, including the Concept Event platform.',
      'Handle communications with Università Bocconi’s institutional channels for spaces and for the organisation of initiatives.',
      'Keep and safeguard the minutes of the Board of Directors, and make them available to members on request (Artt. 14, 22).',
      'Keep the list of members up to date; it is transmitted annually to the University (Artt. 6, 22).',
      'Verify that the association’s CASA registration is renewed at the end of the second academic semester. The renewal itself is the President’s duty; the verification is yours (Art. 22).',
      'Manage the treasury operationally where the President delegates it, the President retaining ultimate responsibility (Art. 24).',
    ],
    reportsTo: 'The Vice President in operational practice; formally the Vice President and the President (Art. 22).',
    rights: [
      'Manage Operations, attendance, fees and institutional logistics.',
      'Sit on the Board of Directors, without a vote.',
    ],
    contact: 'Refer to the Vice President; the President holds ultimate responsibility for the treasury.',
  },
  advisor: {
    summary: 'An Advisor is a past member who continues to support the association with experience and guidance. Whether an Advisor appears on the public Members page is set on their member profile.',
    responsibilities: [
      'Advise the association where your experience is useful.',
      'Help carry continuity between generations of members (Art. 23).',
    ],
    reportsTo: 'The President.',
    rights: [
      // Art. 23 sets three cumulative conditions and one clear limit. The
      // limit matters as much as the invitation.
      'Where you have completed your studies at Bocconi, held an office on the Board during your tenure, and concluded your university career within the last five academic years, you are invited to attend Board meetings without a vote (Art. 23).',
      'Attendance is optional, and an attending past member exercises no power of the Board and counts towards neither its quorum nor its majorities.',
      'Stay informed about the association’s activity.',
    ],
    contact: 'Refer to the President, who manages the association’s alumni community.',
  },
  candidate: {
    summary: 'As an applicant you can see your own profile and the status of your application, and nothing else.',
    responsibilities: [
      'Keep your contact details up to date so the association can reach you.',
      'Meet the requirements the statute sets for membership: enrolment at Università Bocconi, and payment of the membership fee once admitted (Artt. 6, 7).',
    ],
    reportsTo: 'The Head of Division running your application, supported by the Team Leaders of that division (Artt. 5, 17).',
    rights: [
      'Apply without distinction of race, ethnicity, religion, nationality, sex, gender identity, sexual orientation, disability or personal and social condition (Artt. 4, 5).',
      'Be assessed without regard to your academic performance, which the statute excludes as a criterion for admission (Art. 5).',
      'Receive written reasons if your application is rejected (Art. 5).',
      'See your own profile and application status.',
    ],
    contact: 'For questions about your application, contact the association at as.minerva@unibocconi.it.',
  },
};

// Shared rules that apply to every member, shown beneath the role guide.
export const MEMBERSHIP_RULES = {
  duties: [
    'Comply with the statute and with the applicable University regulations.',
    'Perform the work duly assigned to you by the competent bodies of the association.',
    'Take an active part in the initiatives the association organises during the semester.',
    'Pay the membership fee each semester, at the beginning of the semester; the minimum is 10 euro (Art. 7).',
    'Refrain from any initiative in conflict with the association’s purposes, and from any conduct capable of harming another person’s health or dignity (Artt. 4, 8).',
  ],
  // The statute's own list, in the statute's own order. What was here
  // before was close but not the same: it merged the two inactivity
  // grounds into one and dropped unreachability, which is the ground the
  // required phone number on this page exists to prevent.
  expulsion: [
    'Complete and prolonged inactivity.',
    'Prolonged impossibility of reaching you by message or telephone call on the contact details you have given the association.',
    'Failure to pay the semestral membership fee.',
    'Conduct in conflict with the norms of civil coexistence.',
    'Conduct inconsistent with the codes of conduct of Università Bocconi, the CASA General Regulation or the CASA Operational Regulation.',
  ],
  expulsionProcedure:
    'Expulsion follows a warning setting out the conduct objected to, then thirty calendar days in which to correct it, and only then a resolution taken jointly by the President and the Vice President and communicated in writing. Non-payment of the fee is the one exception: there the expulsion is automatic once the deadline passes (Art. 9).',
  publicationControl:
    'Heads of Division are responsible for the correctness and publication of their division’s reports. Only the President, the Vice President and the Head of Asset Management may put a proposal to block a report to the Board of Directors, and blocking it requires three quarters of the voting members (Artt. 14, 17).',
  leave:
    'You may request one semester of leave from associative commitments, for personal reasons or for a study exchange abroad. Discuss it with your Team Leader or Head of Division and it is communicated to the Board, which must accept it where you have been active and correct for the two preceding semesters. The membership fee is still due, the leave cannot be extended, and inactivity during it cannot be held against you (Art. 9).',
  hierarchyNote:
    'In general: Analysts and Senior Analysts refer to their Team Leader or Portfolio Manager; these refer to the Head of Division; Heads of Division refer to the Head of Asset Management and to the Vice President; the Vice President refers to the President.',
};

// =====================================================================
// Role progression, drawn from the statute and from nowhere else.
// ---------------------------------------------------------------------
// Every criterion below is a prerequisite the statute states for the
// office it leads to: Artt. 12 and 13 (President, Vice President),
// Art. 16 (Head of Asset Management), Art. 17 (Head of Division),
// Art. 18 (Team Leader, also called Senior Analyst) and Art. 21 (Head of
// Media & Communication). Nothing here is a rule invented for the
// workspace: where the statute sets no requirement for an office, this
// says so rather than filling the gap.
//
// MERIT IS STATED SEPARATELY, and deliberately so. The criteria are the
// formal gate; passing it makes a member ELIGIBLE TO BE CONSIDERED, not
// promoted. That distinction is the whole point of the card.
// =====================================================================

export interface PromotionPath {
  /** The office or offices this role can progress to. */
  next: string;
  /** The statute's own prerequisites for that office. */
  criteria: string[];
  /** How the appointment is actually decided. */
  appointment?: string;
  /** The articles this is drawn from, quoted for the reader. */
  articles: string;
}

/** The one sentence about merit, shown under every path. */
export const MERIT_NOTE =
  'Meeting these requirements makes you eligible to be considered. It does not make a promotion automatic: once the statute’s criteria are met, progression is decided on merit.';

/** What merit means here, in the association’s own terms. */
export const MERIT_FACTORS = [
  'The commitment you have shown in your current role.',
  'Your availability and your contribution to the association.',
  'The quality and the correctness of the work you deliver.',
];

const TO_HEAD: PromotionPath = {
  next: 'Head of Division, or Head of Asset Management',
  criteria: [
    'At least one year of active participation in the association.',
    'At least one semester of experience as Portfolio Manager or as Team Leader.',
    'Offices are assigned to people present on campus for the greater part of the semester.',
  ],
  appointment:
    'A Head of Division is chosen by their predecessor, on the opinion of the Vice President and the Head of Asset Management, with final approval by the President. The Head of Asset Management is chosen jointly by the incoming President and Vice President, on the proposal of the outgoing Heads of Division.',
  articles: 'Artt. 16, 17',
};

const TO_PRESIDENCY: PromotionPath = {
  next: 'President, or Vice President',
  criteria: [
    'At least two years of active participation in the association.',
    'At least one semester of experience as Head of Division of a core division, or as Head of Asset Management.',
  ],
  appointment:
    'The term lasts one academic semester and may be renewed consecutively only once, for a maximum of one academic year.',
  articles: 'Artt. 12, 13',
};

export const PROMOTION_PATHS: Partial<Record<AppRole, PromotionPath>> = {
  analyst: {
    next: 'Senior Analyst, and then Team Leader',
    criteria: [
      'Senior Analyst is the association’s own step between Analyst and Team Leader: the analyst’s work, with the team around you to support and the newer members to bring on.',
      'The office of Team Leader is optional: it exists in a division only if the Head of Division establishes it.',
      'At most four Team Leaders may serve in the same division.',
      'The term follows the term of the Head of Division.',
    ],
    appointment: 'Established and assigned by the Head of Division of your division.',
    articles: 'Art. 18',
  },
  // Not TO_HEAD. A Senior Analyst's next step is the Team Leader's office,
  // not a Head's: the statute's prerequisite for a Head is a semester spent
  // as Portfolio Manager or Team Leader, which a Senior Analyst has yet to
  // serve.
  senior_analyst: {
    next: 'Team Leader',
    criteria: [
      'The office is optional: it exists in a division only if the Head of Division establishes it.',
      'At most four Team Leaders may serve in the same division.',
      'The term follows the term of the Head of Division.',
      'A semester served as Team Leader is itself the statute’s prerequisite for a Head of Division or Head of Asset Management later on (Artt. 16, 17).',
    ],
    appointment: 'Established and assigned by the Head of Division of your division.',
    articles: 'Art. 18',
  },
  team_leader: TO_HEAD,
  portfolio_manager: TO_HEAD,
  head_of_division: TO_PRESIDENCY,
  head_of_asset_management: TO_PRESIDENCY,
  media_analyst: {
    next: 'Head of Media & Communication',
    criteria: [
      'At least one semester of participated activity in the Media & Communication team of the association.',
    ],
    appointment:
      'The Head of Media & Communication reports directly to the President and sits on the Board of Directors without a vote. The office may not be held together with the presidency or with the Head of Asset Management.',
    articles: 'Art. 21',
  },
};

/**
 * The progression open to a role, or null where the statute defines none.
 * Null is a real answer here: the presidency is the top of the structure,
 * and the auxiliary heads have no office above them in the statute.
 */
export function promotionFor(role: AppRole): PromotionPath | null {
  return PROMOTION_PATHS[normalizeRole(role)] ?? null;
}

export function roleGuideFor(role: AppRole): RoleGuide | null {
  return roleGuides[normalizeRole(role)] ?? null;
}
