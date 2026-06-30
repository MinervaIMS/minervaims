// =====================================================================
// Role-specific statute / role-description extracts shown on My Profile
// (report section 3). Keyed by normalised AppRole. Sourced from the
// association statute (Artt. 12-22) and the responsibilities in the report.
// =====================================================================

import type { AppRole } from '@/lib/roles';
import { normalizeRole } from '@/lib/roles';

export const statuteExtracts: Partial<Record<AppRole, string>> = {
  president:
    'The President legally represents the association, supervises all divisions and organs, chairs the Board, has ultimate responsibility for the Treasury (which may be delegated to the Head of Operations), organises events with external guests, manages the alumni community and external relations, and — together with the Vice President — oversees Association on Display. With the Vice President and Head of Asset Management, may review any admission where transparency or fairness is in doubt.',
  vice_president:
    'The Vice President supports the President, replaces them when absent, and — together with the Head of Operations — coordinates internal events, assemblies and meetings. The Vice President verifies that the membership-fee collection has been completed and intervenes in cases of non-payment, and shares oversight of Association on Display and admissions fairness.',
  head_of_asset_management:
    'The Head of Asset Management supervises report deadlines and project quality across all core divisions, may intervene on report standards, formatting, clarity and quality, monitors the fairness of selection processes, and — with the President and Vice President — may propose blocking the publication of a report and may review admissions where fairness is in doubt.',
  head_of_division:
    'A Head of Division coordinates their division’s projects, distributes work, ensures deadlines are respected, manages report correctness and publication, runs the admission process for the division (final decision rests with them), agrees available places with the President, Vice President and Head of Asset Management, and organises at least one in-person division event per semester and one annual alumni call.',
  team_leader:
    'A Team Leader / Senior Analyst distributes tasks within the team, organises working meetings, drafts project reports according to association guidelines, and supports the Head of Division in evaluating candidate profiles during admissions.',
  portfolio_manager:
    'A Portfolio Manager is responsible for fund monitoring, investment decisions and periodic fund reporting. Remember to update the Funds’ Performances section whenever a portfolio/fund report is published, so the public fund tables stay accurate.',
  analyst:
    'An Analyst supports the Team Leader or Portfolio Manager, carries out analysis and research, contributes to reports, participates in team meetings and respects deadlines.',
  head_of_media:
    'The Head of Media & Communication is responsible for social media, event communication, application opening/closing communication, textual and visual content, and ensuring all communication is accurate and compliant with University/CASA rules.',
  media_analyst:
    'A Media & Communication Analyst produces visual and textual content and supports the Head of Media & Communication in planning and publishing across the association’s channels.',
  head_of_operations:
    'The Head of Operations collects the semester membership fee, monitors member attendance at initiatives, handles room bookings and institutional event requests through Bocconi/CASA channels, maintains the members register and administrative records, and supports the Treasury when delegated.',
  advisor:
    'An Advisor supports the association with guidance and experience and appears on the public Members page. Access is mainly to stay informed and to advise where useful.',
  silent_advisor:
    'A Silent Advisor retains workspace access mainly to stay informed about the association’s activity. Silent Advisors are not shown on the public Members page and operate in a largely read-only capacity.',
  alumni:
    'As an alumnus/alumna you remain part of the Minerva community. You may be invited to alumni calls and kept informed about the association’s activity.',
  candidate:
    'As a candidate you can view your own profile and the status of your application. The review is run by the relevant Head of Division with the support of Team Leaders.',
  admin:
    'Administrator access. Full oversight of the workspace for maintenance and configuration.',
};

export function statuteExtractFor(role: AppRole): string | null {
  return statuteExtracts[normalizeRole(role)] ?? null;
}
