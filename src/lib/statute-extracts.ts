// =====================================================================
// Structured role guides shown on My Profile (report section 3).
// Each role's duties, responsibilities, rights and hierarchy, drawn from
// the association statute (Artt. 5-22, 24) and the workspace brief.
// Kept as structured data so the page can present it clearly.
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
    summary: 'The President legally represents the association and supervises every division and organ.',
    responsibilities: [
      'Chair the Board and the Assembly and represent the association externally.',
      'Hold ultimate responsibility for the Treasury (operational management may be delegated to the Head of Operations).',
      'Organise events with external guests and manage the alumni community and external relations.',
      'Oversee Association on Display together with the Vice President.',
      'Renew the association’s CASA registration at the end of the second semester — an exclusive, non-delegable duty (Art. 12).',
      'With the Vice President and Head of Asset Management, review any admission where transparency or fairness is in doubt, and propose blocking a report before publication.',
    ],
    reportsTo: 'The Assembly of members.',
    oversees: ['Vice President', 'Head of Asset Management', 'Heads of Division', 'Head of Operations', 'Head of Media & Communication'],
    rights: ['Convene the Board and the Assembly.', 'Access every section of the workspace.', 'Take final decisions on association-level matters within the statute.'],
    contact: 'For association-level questions, you are the final point of reference; coordinate with the Vice President.',
  },
  vice_president: {
    summary: 'The Vice President supports the President and replaces them when absent.',
    responsibilities: [
      'Coordinate internal events, assemblies and meetings together with the Head of Operations.',
      'Verify that the membership-fee collection has been completed and raise any non-payment with the Board.',
      'Supervise the Head of Operations, who reports to you and the President (Art. 13).',
      'Assume the Head of Asset Management’s functions whenever that (optional) role is vacant (Art. 16).',
      'Share oversight of Association on Display and of admissions fairness.',
    ],
    reportsTo: 'The President.',
    oversees: ['Head of Asset Management (when vacant)', 'Heads of Division', 'Head of Operations', 'Head of Media & Communication'],
    rights: ['Act for the President when absent, impeded or delegated (you are also a legal representative).', 'Review admissions where fairness is in doubt.'],
    contact: 'Refer to the President; you are the second point of reference for members.',
  },
  head_of_asset_management: {
    summary: 'The Head of Asset Management supervises research quality and deadlines across all core divisions.',
    responsibilities: [
      'Supervise report deadlines and project quality across the five core divisions.',
      'Intervene on report standards, formatting, clarity and quality.',
      'Monitor the fairness of the selection process and take part when requested.',
      'With the President and Vice President, may propose blocking a report before publication.',
    ],
    reportsTo: 'The President and Vice President.',
    oversees: ['Heads of Division', 'Portfolio Managers', 'Team Leaders', 'Analysts'],
    rights: ['Set and enforce reporting standards.', 'Access all divisions to monitor quality.'],
    contact: 'Refer to the President or Vice President; Heads of Division refer to you on quality matters.',
  },
  head_of_division: {
    summary: 'A Head of Division coordinates their division and is responsible for its output.',
    responsibilities: [
      'Coordinate projects, distribute work and ensure deadlines are respected.',
      'Be responsible for the correctness and publication of the division’s reports.',
      'Upload the division’s projects to the association website (Art. 17).',
      'Run the admission process for the division, with the support of Team Leaders; the final decision is yours.',
      'Agree the number of available places with the President, Vice President and Head of Asset Management.',
      'Organise at least one in-person division event per semester and one annual alumni call.',
      'Report prolonged inactivity or other grounds for expulsion of a member to the President, Vice President or Head of Asset Management (Art. 17).',
    ],
    reportsTo: 'The Head of Asset Management, and the President and Vice President.',
    oversees: ['Team Leaders', 'Portfolio Managers (where relevant)', 'Analysts in the division'],
    rights: ['Take the final admission decision for the division.', 'Edit the division’s application question.', 'Publish the division’s reports.'],
    contact: 'For quality and deadlines, refer to the Head of Asset Management; for association matters, to the Vice President.',
  },
  team_leader: {
    summary: 'A Team Leader (Senior Analyst) leads a team within the division.',
    responsibilities: [
      'Distribute tasks within the team and organise working meetings.',
      'Draft project reports according to the association’s guidelines.',
      'Support the Head of Division in evaluating candidate profiles during admissions.',
    ],
    reportsTo: 'The Head of Division.',
    oversees: ['Analysts in the team'],
    rights: ['Organise the team’s work.', 'Contribute to admission evaluations.'],
    contact: 'Refer to your Head of Division.',
  },
  portfolio_manager: {
    summary: 'A Portfolio Manager is responsible for an assigned simulated fund.',
    responsibilities: [
      'Be responsible for your assigned fund’s performance and its monitoring (Art. 19).',
      'Act as the final decision-maker on including or removing assets from the fund.',
      'Produce the periodic fund report (performance, holdings and the reasoning behind each decision).',
      'Update the Funds’ Performances section whenever a portfolio or fund report is published, so the public fund table stays accurate.',
    ],
    reportsTo: 'The Head of Portfolio Management and the Head of Asset Management.',
    rights: ['You are a Team Leader with final say over your fund’s composition, within the agreed mandate.'],
    contact: 'Refer to the Head of Portfolio Management.',
  },
  analyst: {
    summary: 'An Analyst carries out the research and analysis at the heart of the division.',
    responsibilities: [
      'Support the Team Leader or Portfolio Manager with analysis and research.',
      'Contribute to reports and respect the deadlines set by the division.',
      'Participate in team meetings.',
    ],
    reportsTo: 'Your Team Leader or Portfolio Manager, and the Head of Division.',
    rights: ['Access division templates and materials.', 'Contribute to and upload reports where authorised.'],
    contact: 'For day-to-day questions, refer to your Team Leader; for division matters, to the Head of Division.',
  },
  head_of_media: {
    summary: 'The Head of Media & Communication leads the association’s communication.',
    responsibilities: [
      'Produce textual and visual content and run the social-media channels.',
      'Communicate events, and the opening and closing of applications.',
      'Ensure communication is accurate and compliant with University and CASA rules.',
    ],
    reportsTo: 'The President and Vice President.',
    oversees: ['Media & Communication Analysts'],
    rights: ['Manage the editorial calendar and the communication material.'],
    contact: 'Refer to the Vice President for association communication.',
  },
  media_analyst: {
    summary: 'A Media & Communication Analyst produces and schedules content.',
    responsibilities: [
      'Produce visual and textual content.',
      'Support the editorial calendar and publishing across the channels.',
    ],
    reportsTo: 'The Head of Media & Communication.',
    rights: ['Access communication templates and material.'],
    contact: 'Refer to the Head of Media & Communication.',
  },
  head_of_operations: {
    summary: 'The Head of Operations runs the association’s administrative and logistical functions.',
    responsibilities: [
      'Collect the semester membership fee and monitor member attendance at initiatives.',
      'Handle room bookings and institutional event requests through Bocconi/CASA channels (including Concept Event).',
      'Keep and safeguard the Board of Directors’ minutes and keep the members register up to date (Artt. 6, 14).',
      'Check that the association’s CASA registration is renewed at the end of the second semester (the President carries out the renewal itself).',
      'Support the Treasury when delegated by the President.',
    ],
    reportsTo: 'The Vice President in day-to-day practice, and formally the President and Vice President.',
    rights: ['Manage Operations, attendance, fees and institutional logistics.'],
    contact: 'Refer to the Vice President; the President holds ultimate responsibility for the Treasury.',
  },
  advisor: {
    summary: 'An Advisor supports the association with guidance and experience. Advisors are appointed alumni; whether they appear on the public Members page is decided on their member profile.',
    responsibilities: ['Advise the association where useful.'],
    reportsTo: 'The President.',
    rights: ['Stay informed about the association’s activity.'],
    contact: 'Refer to the President.',
  },
  candidate: {
    summary: 'As an applicant you can view your own profile and the status of your application.',
    responsibilities: ['Keep your contact details up to date.'],
    reportsTo: 'The Head of Division running your application, supported by Team Leaders.',
    rights: ['See your own profile and application status, and nothing else.'],
    contact: 'For questions about your application, contact the association at as.minerva@unibocconi.it.',
  },
};

// Shared rules that apply to every member, shown beneath the role guide.
export const MEMBERSHIP_RULES = {
  duties: [
    'Take part in the division’s activities and respect the deadlines you are given.',
    'Pay the semester membership fee (a minimum of 10 euro per semester).',
    'Follow the statute, the association’s guidelines and the University and CASA rules.',
  ],
  expulsion: [
    'Failure to pay the membership fee is a cause of expulsion.',
    'Serious or repeated breaches of the statute, of the association’s rules, or of University/CASA rules.',
    'Conduct that harms the association, its members or third parties, including any form of discrimination or hazing.',
  ],
  publicationControl:
    'Heads of Division are responsible for the correctness and publication of their division’s reports. The President, Vice President and Head of Asset Management may propose blocking a report before it is published; a blocked report can only be unblocked by those senior roles.',
  hierarchyNote:
    'In general: Analysts refer to their Team Leader or Portfolio Manager; these refer to the Head of Division; Heads of Division refer to the Head of Asset Management and to the Vice President; the Vice President refers to the President.',
};

export function roleGuideFor(role: AppRole): RoleGuide | null {
  return roleGuides[normalizeRole(role)] ?? null;
}
