import { Fragment, useMemo } from 'react';
import { Info } from 'lucide-react';
import { WorkspacePageHeader } from '@/components/admin/WorkspacePageHeader';
import {
  resolveLevel, specialRulesFor, SPECIAL_RULES, DIVISION_SCOPED_RESOURCES, CANDIDATE_RESOURCES,
  type AccessLevel, type ResourceKey,
} from '@/lib/access/matrix';
import type { AppRole } from '@/lib/roles';

// Presentation metadata — the subsection order mirrors the workspace navigation.
const SECTIONS: { section: string; items: { key: ResourceKey; label: string }[] }[] = [
  { section: 'General', items: [
    { key: 'my-role', label: 'My profile' }, { key: 'dashboard', label: 'Dashboard' },
    { key: 'welcome', label: 'How to use' }, { key: 'calendar', label: 'Calendar' } ] },
  { section: 'Reports', items: [
    { key: 'reports-upload', label: 'Upload report' }, { key: 'reports-archive', label: 'Report archive' },
    { key: 'reports-templates', label: 'Templates & repositories' }, { key: 'reports-funds', label: 'Fund performances' } ] },
  { section: 'Recruiting', items: [
    { key: 'applications-website', label: 'Application page' }, { key: 'applications-screening', label: 'Candidates screening' },
    { key: 'applications-interview-calendar', label: 'Interview calendar' }, { key: 'applications-joiners', label: 'Offers' },
    { key: 'applications-form', label: 'Form & settings' } ] },
  { section: 'Events', items: [
    { key: 'events-create', label: 'Create event' }, { key: 'events-forms', label: 'Registration forms' },
    { key: 'events-attendance', label: 'Attendance' }, { key: 'events-archive', label: 'Event archive' },
    { key: 'events-alumni-calls', label: 'Alumni calls' }, { key: 'events-on-display', label: 'Association on Display' } ] },
  { section: 'People', items: [
    { key: 'people-members', label: 'Members' }, { key: 'people-advisors', label: 'Advisors' }, { key: 'people-alumni', label: 'Alumni' } ] },
  { section: 'Media & Communication', items: [
    { key: 'smm-editorial', label: 'Editorial calendar' }, { key: 'smm-ig', label: 'Instagram' }, { key: 'smm-li', label: 'LinkedIn' },
    { key: 'smm-other', label: 'Other templates' }, { key: 'smm-brand', label: 'Brand & design' }, { key: 'smm-ads', label: 'Ads & spending' } ] },
  { section: 'Operations', items: [
    { key: 'ops-fee', label: 'Membership fees' }, { key: 'ops-treasury', label: 'Treasury' },
    { key: 'ops-external', label: 'External relations' }, { key: 'ops-docs', label: 'Statute & documents' } ] },
  { section: 'Website', items: [
    { key: 'website-pages', label: 'Pages' }, { key: 'website-readings', label: 'Readings' }, { key: 'website-testimonials', label: 'Testimonials' },
    { key: 'ops-newsletter', label: 'Newsletter' }, { key: 'ops-auto-emails', label: 'Automatic emails' } ] },
  { section: 'Settings', items: [
    { key: 'settings-users', label: 'Users' }, { key: 'settings-roles', label: 'Role permissions' }, { key: 'settings-activity', label: 'Activity log' } ] },
];

const ROLES: { key: AppRole; label: string }[] = [
  { key: 'admin', label: 'Admin' }, { key: 'president', label: 'President' }, { key: 'vice_president', label: 'Vice President' },
  { key: 'head_of_asset_management', label: 'Head of Asset Management' }, { key: 'head_of_division', label: 'Head of Division' },
  { key: 'portfolio_manager', label: 'Portfolio Manager' }, { key: 'team_leader', label: 'Team Leader' }, { key: 'senior_analyst', label: 'Senior Analyst' },
  { key: 'analyst', label: 'Analyst' }, { key: 'head_of_media', label: 'Head of Media & Communication' }, { key: 'media_analyst', label: 'Media & Comm. Analyst' },
  { key: 'head_of_operations', label: 'Head of Operations' }, { key: 'advisor', label: 'Advisor' }, { key: 'silent_advisor', label: 'Silent Advisor' },
  { key: 'alumni', label: 'Alumni' }, { key: 'member', label: 'Member' }, { key: 'candidate', label: 'Applicant' }, { key: 'pending', label: 'Pending' },
];

function cellLevel(role: AppRole, resource: ResourceKey): AccessLevel {
  if (role === 'candidate') return CANDIDATE_RESOURCES[resource] ?? 'none';
  return resolveLevel([role], resource);
}

const LEVEL_STYLE: Record<AccessLevel, { text: string; cls: string }> = {
  none: { text: '—', cls: 'text-muted-foreground/50' },
  view: { text: 'View', cls: 'bg-amber-50 text-amber-700' },
  edit: { text: 'Edit', cls: 'bg-sky-50 text-sky-700' },
  manage: { text: 'Full', cls: 'bg-emerald-50 text-emerald-700' },
};

export default function RolePermissionsTable() {
  // Precompute the grid once.
  const grid = useMemo(() =>
    SECTIONS.map((sec) => ({
      ...sec,
      items: sec.items.map((it) => ({
        ...it,
        scoped: DIVISION_SCOPED_RESOURCES.includes(it.key),
        cells: ROLES.map((r) => ({
          role: r.key,
          level: cellLevel(r.key, it.key),
          special: specialRulesFor([r.key], it.key).length > 0,
        })),
      })),
    })), []);

  return (
    <div>
      <WorkspacePageHeader
        title="Role permissions"
        description="Who can use which parts of the workspace. This prospect is generated from the workspace's live access rules, so it always reflects what each role can actually do."
      />

      {/* Legend */}
      <div className="flex flex-wrap items-center gap-4 mb-4 font-body text-xs text-muted-foreground">
        <span className="inline-flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-emerald-100 inline-block" /> Full — interact + create/edit/remove</span>
        <span className="inline-flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-amber-100 inline-block" /> View — open + light actions (register, preview…)</span>
        <span className="inline-flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-muted inline-block" /> — Hidden</span>
        <span className="inline-flex items-center gap-1.5"><span className="text-accent">✦</span> special rule (see below)</span>
        <span className="inline-flex items-center gap-1.5"><span className="text-accent">÷</span> own-division data only</span>
      </div>

      <div className="overflow-x-auto border border-separator">
        <table className="border-collapse font-body text-xs">
          <thead>
            <tr>
              <th className="sticky left-0 z-20 bg-muted text-left px-3 py-2 font-serif text-sm border-b border-r border-separator min-w-[210px]">Subsection</th>
              {ROLES.map((r) => (
                <th key={r.key} className="bg-muted px-2 py-2 border-b border-separator align-bottom">
                  <div className="whitespace-nowrap text-[11px] font-normal text-muted-foreground [writing-mode:vertical-rl] rotate-180 h-28 mx-auto">{r.label}</div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {grid.map((sec) => (
              <Fragment key={sec.section}>
                <tr>
                  <td colSpan={ROLES.length + 1} className="bg-accent/5 text-accent font-serif px-3 py-1.5 border-b border-separator uppercase tracking-wider text-[11px]">{sec.section}</td>
                </tr>
                {sec.items.map((it) => (
                  <tr key={it.key} className="hover:bg-muted/30">
                    <th className="sticky left-0 z-10 bg-background text-left font-normal px-3 py-1.5 border-b border-r border-separator">
                      {it.label}{it.scoped && <span className="text-accent ml-1" title="Data limited to the viewer's own division">÷</span>}
                    </th>
                    {it.cells.map((c) => {
                      const s = LEVEL_STYLE[c.level];
                      return (
                        <td key={c.role} className={`text-center px-2 py-1.5 border-b border-separator ${s.cls}`}>
                          <span className="whitespace-nowrap">{s.text}{c.special && <span className="text-accent align-super text-[9px]">✦</span>}</span>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </Fragment>
            ))}
          </tbody>
        </table>
      </div>

      {/* Special rules */}
      <div className="mt-6 max-w-3xl font-body">
        <div className="flex items-center gap-2 mb-2">
          <Info className="h-4 w-4 text-accent" />
          <span className="font-serif text-heading text-accent">Special rules</span>
        </div>
        <ul className="space-y-2 text-sm text-muted-foreground">
          {SPECIAL_RULES.map((s, i) => (
            <li key={i} className="flex gap-2">
              <span className="text-accent mt-0.5">✦</span>
              <span><span className="text-foreground">{s.roles.map((r) => ROLES.find((x) => x.key === r)?.label ?? r).join(', ')}</span> — {s.label}</span>
            </li>
          ))}
          <li className="flex gap-2">
            <span className="text-accent mt-0.5">÷</span>
            <span>On Reports and Templates, analysts, senior analysts, team leaders and portfolio managers see only their <span className="text-foreground">own division's</span> material; a Head of Division sees their own by default and can switch to view other divisions; the Head of Asset Management sees all divisions.</span>
          </li>
        </ul>
      </div>
    </div>
  );
}
