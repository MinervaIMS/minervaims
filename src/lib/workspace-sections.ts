import type { ResourceKey } from '@/lib/access/matrix';

// =====================================================================
// The workspace's subsections, as the two Settings tables list them.
// ---------------------------------------------------------------------
// Role permissions and Mobile view describe the same set of pages along
// two different axes - who may open each one, and what each one does on
// a phone - so they read one list rather than each keeping their own.
// The order mirrors the workspace navigation.
//
// It is deliberately NOT derived from `workspace-nav`. That list is what
// a given role can SEE; this one is every subsection that exists,
// including the two applicant-facing pages that appear in no member's
// navigation and which these tables exist to explain.
// =====================================================================

export interface WorkspaceSectionMap { section: string; items: { key: ResourceKey; label: string }[] }

// EXPORTED, because two tables now read it: this one and Settings > Mobile
// View. One list means the two can never disagree about which subsections
// exist, what they are called, or the order they come in.
export const SECTIONS: WorkspaceSectionMap[] = [
  { section: 'General', items: [
    { key: 'my-role', label: 'My profile' }, { key: 'dashboard', label: 'Dashboard' },
    { key: 'welcome', label: 'How to use' }, { key: 'calendar', label: 'Calendar' } ] },
  { section: 'Reports', items: [
    { key: 'reports-upload', label: 'Upload report' }, { key: 'reports-archive', label: 'Report archive' },
    { key: 'reports-templates', label: 'Templates & repositories' }, { key: 'reports-funds', label: 'Fund performances' } ] },
  { section: 'Recruiting', items: [
    { key: 'applications-website', label: 'Application page' }, { key: 'applications-screening', label: 'Candidates screening' },
    { key: 'applications-interview-calendar', label: 'Interview calendar' }, { key: 'applications-joiners', label: 'Offers' },
    { key: 'applications-form', label: 'Form & Questions' },
    // The two applicant-facing pages. They were missing from this table
    // entirely, so the one column the table exists to explain - what an
    // Applicant can reach - was incomplete.
    { key: 'applications-status', label: 'Application status (applicant)' },
    { key: 'applications-faqs', label: 'FAQs (applicant)' } ] },
  { section: 'Events', items: [
    { key: 'events-create', label: 'Create event' }, { key: 'events-forms', label: 'Registration forms' },
    { key: 'events-attendance', label: 'Attendance' }, { key: 'events-archive', label: 'Event archive' },
    { key: 'events-alumni-calls', label: 'Alumni calls' }, { key: 'events-on-display', label: 'Association on Display' } ] },
  { section: 'People', items: [
    { key: 'people-members', label: 'Members' }, { key: 'people-alumni', label: 'Alumni' } ] },
  { section: 'Media & Communication', items: [
    { key: 'smm-editorial', label: 'Editorial calendar' }, { key: 'smm-ig', label: 'Instagram' }, { key: 'smm-li', label: 'LinkedIn' },
    { key: 'smm-graphics', label: 'MIMS Graphics' }, { key: 'smm-other', label: 'Other resources' },
    { key: 'smm-brand', label: 'Design System' }, { key: 'smm-ads', label: 'Ads & spending' } ] },
  { section: 'Operations', items: [
    { key: 'ops-fee', label: 'Membership fees' }, { key: 'ops-treasury', label: 'Treasury' },
    { key: 'ops-external', label: 'External relations' }, { key: 'ops-docs', label: 'Statute & documents' } ] },
  { section: 'Website', items: [
    { key: 'website-pages', label: 'Pages' }, { key: 'website-readings', label: 'Readings' }, { key: 'website-testimonials', label: 'Testimonials' }, { key: 'website-history', label: 'History' }, { key: 'website-faqs', label: 'FAQs' },
    { key: 'ops-newsletter', label: 'Newsletter' }, { key: 'ops-auto-emails', label: 'Automatic emails' } ] },
  { section: 'Settings', items: [
    { key: 'settings-users', label: 'Users' }, { key: 'settings-roles', label: 'Role permissions' }, { key: 'settings-mobile', label: 'Mobile view' }, { key: 'settings-activity', label: 'Activity log' } ] },
];
