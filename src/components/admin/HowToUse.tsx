// =====================================================================
// How to use — a role-based user manual generated from the same guide
// content and access matrix that run the workspace, so it always matches
// what THIS user can actually see and do. Downloadable as Markdown.
// =====================================================================
import { useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Download, Sparkles, ShieldCheck, BookOpen } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useAccess } from '@/hooks/useAccess';
import { WorkspacePageHeader } from '@/components/admin/WorkspacePageHeader';
import { GUIDE, type GuideEntry } from '@/lib/workspace-guide';
import { roleLabel, divisionLabels } from '@/lib/roles';
import { logActivity } from '@/lib/activity-log';

interface ManualSection { section: string; entries: (GuideEntry & { canManage: boolean })[] }

// How the workspace is organised, independent of role.
const AT_A_GLANCE = [
  'The navigation is organised in sections, each holding subsections. You only ever see the pages your role can access, so nothing in your menu is off limits.',
  'The fastest way anywhere is the search bar in the header, or Ctrl K (Cmd K on a Mac). It finds subsections and help topics, and it also searches INSIDE the workspace: members, alumni, events, reports and the resource libraries. Type a person\'s name and you get the person, not just the page they are on. Every result is limited to what your role can open, and no search is even sent for a part of the workspace you cannot reach.',
  'One role drives everything. It is assigned by the President or Admin in Settings, Users, which edits the same record as People, Members: a change made in either place appears in both immediately. Nobody can change their own role.',
  'Help lives where you work: the floating question mark on every page opens the sliding help panel for that page, and the small circled question marks next to specific controls open the panel directly at the matching topic. Everything you read there is generated from the same source as this manual, for your role only.',
  'On a phone the workspace becomes a compact shell: sections in a drawer, subsections as chips, consultation available everywhere. Subsections that need a full screen are marked with a monitor icon and open on desktop only; read-only pages carry a ribbon.',
  'Links of the form /admin?section=...&sub=... open the workspace directly on a subsection, provided your role can see it. Some website buttons use them to bring you to the right place in one click.',
  'Every meaningful action is recorded in Settings, Activity log, together with the role you held at that moment.',
];

// What changed recently, so returning members catch up at a glance.
// Newest first. Kept to what a person would actually notice: a change
// nobody can see from a page does not belong in a manual about pages.
const RECENT_IMPROVEMENTS = [
  'Recruiting, Candidates screening has a new first column: "Evaluated for", the division actually assessing a candidate, kept apart from the two divisions they asked for. It starts as their first choice and can be changed to any research division or to Media or Operations, including one the candidate never named. Changing it returns them to "To be invited", releases the interview slot they were holding, and tells them in their own workspace which division is now considering them. A candidacy runs in at most two divisions: after one move, the only way left is back. The circled question mark beside the column explains the whole process.',
  'Advisors are outside the membership fee entirely. They appear in no collection, count towards no total, receive no fee deadline on their Calendar or Dashboard, and enter no semester member register. Appointing a member as advisor part way through a semester removes the fee they had not yet paid; a payment already banked is never deleted, and the fee page says so where it happens.',
  'Advisors can now read the whole workspace and change none of it, apart from their own profile. Settings stays closed to them: an outside adviser has no business in the association\'s access control or its audit trail.',
  'Team leaders are published as Team Leaders. The public Members page had been printing them as Senior Analysts, which is a different rank of the association, and several older head-of-division roles were appearing as plain analysts. Both are fixed for every division.',
  'Investment Research members can carry a desk, Equities, Fixed Income or FX & Commodities, shown after their position on the public site exactly as Portfolio Management already showed its funds. Assign it in People, Members.',
  'Moving a member to alumni asks only for their surname and graduation year. The current company is optional and can be filled in later; wherever an alumnus\'s employer is shown, including on alumni calls, it is now read live from the alumni register rather than copied once and left to go stale.',
  'Events, Event archive offers only the event types it actually contains, so every option in the filter leads somewhere, and registered alumni calls now appear in it.',
  'A candidate accepts their offer by writing their name in full and submitting it, rather than pressing a confirmation button.',
  'Every filtered list can be cleared in one press. The button appears only when something is filtered and says how many filters are on.',
  'Fund performances feed the charts on the public fund pages and on the Portfolio Management page, and protect the published track record: only the last 15 calendar months are editable, and once every month of a year is locked the whole year freezes, aggregates included.',
  'Recruiting, Form & Questions is one unified page: the division questions, with the fixed form inspected through "Preview the form". Heads of Division edit their own division only, and questions lock automatically while applications are open.',
  'Roles stay in step everywhere: People, Members and Settings, Users edit the same record, and workspace permissions follow instantly.',
  'This manual and the sliding help panel are generated from the same guide, so both already reflect all of the above, for your role only.',
];

export default function HowToUse() {
  const { session } = useAuth();
  const access = useAccess();

  const roleName = access.primaryRole ? roleLabel(access.primaryRole, access.primaryDivision) : 'Member';
  const divisionName = access.primaryDivision && access.primaryDivision !== 'none' ? divisionLabels[access.primaryDivision] : null;

  // Only the subsections this user can at least view, with their real level.
  const manual = useMemo<ManualSection[]>(() => {
    const bySection = new Map<string, ManualSection>();
    for (const g of GUIDE) {
      if (!access.canView(g.key)) continue;
      const s = bySection.get(g.section) ?? { section: g.section, entries: [] };
      s.entries.push({ ...g, canManage: access.canManage(g.key) });
      bySection.set(g.section, s);
    }
    return [...bySection.values()];
  }, [access]);

  const buildMarkdown = () => {
    const lines: string[] = [];
    lines.push(`# Minerva workspace user manual for ${roleName}`);
    lines.push('');
    lines.push(`Generated for your role${divisionName ? ` (${divisionName})` : ''} on ${new Date().toLocaleDateString()}. It covers exactly the pages you can access and what you can do on each.`);
    lines.push('');
    lines.push('> Tip: paste this manual into an AI assistant and ask it to explain any part in the way you prefer: step by step, as a checklist, or with examples.');
    lines.push('');
    lines.push('## The workspace at a glance');
    AT_A_GLANCE.forEach((p) => lines.push(`- ${p}`));
    lines.push('');
    lines.push('## Recent improvements');
    RECENT_IMPROVEMENTS.forEach((p) => lines.push(`- ${p}`));
    lines.push('');
    for (const sec of manual) {
      lines.push(`## ${sec.section}`);
      for (const e of sec.entries) {
        lines.push(`### ${e.label}`);
        lines.push(e.purpose);
        const can = [...e.view, ...(e.canManage ? e.manage : [])];
        if (can.length) { lines.push('', '**You can:**'); can.forEach((c) => lines.push(`- ${c}`)); }
        if (!e.canManage && e.manage.length) { lines.push('', '**You cannot** (reserved for managing roles):'); e.manage.forEach((c) => lines.push(`- ${c}`)); }
        if (e.warnings?.length) { lines.push('', '**Good to know:**'); e.warnings.forEach((w) => lines.push(`- ${w}`)); }
        lines.push('');
      }
    }
    lines.push('---');
    lines.push('All actions in the workspace are logged for accountability and security.');
    return lines.join('\n');
  };

  const download = () => {
    const blob = new Blob([buildMarkdown()], { type: 'text/markdown;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `minerva-workspace-manual-${(access.primaryRole ?? 'member')}.md`;
    document.body.appendChild(a); a.click(); a.remove();
    URL.revokeObjectURL(a.href);
    logActivity(session, access.primaryRole, { action: 'download', section: 'General', subsection: 'How to use', entityType: 'manual', entityName: roleName });
  };

  return (
    <div>
      <WorkspacePageHeader
        title="How to use"
        description={`Your personal manual as ${roleName}: it explains only the pages you can access, what each is for, what you can and cannot do, and what consequences actions have.`}
        actions={<Button className="font-body" onClick={download}><Download className="h-4 w-4 mr-2" />Download my manual</Button>}
      />

      <div className="space-y-8 font-body">
        {/* Intro cards: quick orientation, not reading material. */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="border border-separator rounded-lg px-5 py-6 text-center">
            <BookOpen className="h-10 w-10 text-accent mx-auto mb-3" strokeWidth={1.5} />
            <div className="font-serif text-lg text-foreground mb-1">Always current</div>
            <p className="text-sm text-muted-foreground">Built from your real permissions. Use the <span className="inline-flex items-center justify-center w-4 h-4 rounded-full border border-separator text-[10px] align-middle">?</span> icons for help in place.</p>
          </div>
          {/* THE ONE CARD OF THE THREE THAT ASKS FOR SOMETHING.
              The other two state facts about the workspace; this one
              suggests an action, and sitting in the same outlined box it
              read as a third fact and was passed over. Filling it in the
              accent, with its icon and text in white, is what separates a
              suggestion from a statement here: it is the treatment the
              rest of the workspace already uses for the thing on a page
              worth doing. */}
          <div className="rounded-lg border border-accent bg-accent px-5 py-6 text-center text-accent-foreground">
            <Sparkles className="h-10 w-10 text-accent-foreground mx-auto mb-3" strokeWidth={1.5} />
            <div className="font-serif text-lg text-accent-foreground mb-1">Learn with AI</div>
            <p className="text-sm text-accent-foreground/85">Download your manual and ask an AI assistant to walk you through it.</p>
          </div>
          <div className="border border-separator rounded-lg px-5 py-6 text-center">
            <ShieldCheck className="h-10 w-10 text-accent mx-auto mb-3" strokeWidth={1.5} />
            <div className="font-serif text-lg text-foreground mb-1">Actions are logged</div>
            <p className="text-sm text-muted-foreground">Every action is recorded in Settings, Activity log.</p>
          </div>
        </div>

        {/* How the workspace is organised, before the per-page manual. */}
        <section>
          <h2 className="font-serif text-heading text-accent border-b border-separator pb-2 mb-4">The workspace at a glance</h2>
          <ul className="space-y-2.5 max-w-3xl">
            {AT_A_GLANCE.map((p, i) => (
              <li key={i} className="flex gap-2.5 text-sm text-muted-foreground leading-relaxed">
                <span aria-hidden className="mt-[7px] w-1.5 h-1.5 bg-accent shrink-0" />
                <span>{p}</span>
              </li>
            ))}
          </ul>
        </section>

        {/* What changed recently across the workspace. */}
        <section>
          <h2 className="font-serif text-heading text-accent border-b border-separator pb-2 mb-4">Recent improvements</h2>
          <ul className="space-y-2.5 max-w-3xl">
            {RECENT_IMPROVEMENTS.map((p, i) => (
              <li key={i} className="flex gap-2.5 text-sm text-muted-foreground leading-relaxed">
                <span aria-hidden className="mt-[7px] w-1.5 h-1.5 bg-accent shrink-0" />
                <span>{p}</span>
              </li>
            ))}
          </ul>
        </section>

        {/* The manual itself */}
        {manual.map((sec) => (
          <section key={sec.section}>
            <h2 className="font-serif text-heading text-accent border-b border-separator pb-2 mb-4">{sec.section}</h2>
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-5 items-start">
              {sec.entries.map((e) => (
                <article key={e.key} className="border border-separator rounded-lg p-4">
                  <div className="flex items-center justify-between gap-3 mb-1.5">
                    <h3 className="font-serif text-lg text-foreground">{e.label}</h3>
                    <span className={`text-[11px] px-2 py-0.5 rounded shrink-0 ${e.canManage ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}>
                      {e.canManage ? 'Full access' : 'Consult & light actions'}
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground mb-3">{e.purpose}</p>

                  {(e.view.length > 0 || (e.canManage && e.manage.length > 0)) && (
                    <div className="mb-2">
                      <div className="text-xs font-semibold text-muted-foreground mb-1">You can</div>
                      <ul className="space-y-1">
                        {e.view.map((v, i) => <li key={`v${i}`} className="text-sm text-muted-foreground flex gap-2"><span className="text-accent">·</span>{v}</li>)}
                        {e.canManage && e.manage.map((m, i) => <li key={`m${i}`} className="text-sm text-muted-foreground flex gap-2"><span className="text-accent">·</span>{m}</li>)}
                      </ul>
                    </div>
                  )}

                  {!e.canManage && e.manage.length > 0 && (
                    <div className="mb-2">
                      <div className="text-xs font-semibold text-muted-foreground mb-1">You cannot (reserved for managing roles)</div>
                      <ul className="space-y-1">{e.manage.map((m, i) => <li key={i} className="text-sm text-muted-foreground/70 flex gap-2"><span>×</span>{m}</li>)}</ul>
                    </div>
                  )}

                  {e.warnings && e.warnings.length > 0 && (
                    <div>
                      <div className="text-xs font-semibold text-muted-foreground mb-1">Good to know</div>
                      <ul className="space-y-1">{e.warnings.map((w, i) => <li key={i} className="text-sm text-muted-foreground flex gap-2"><span className="text-amber-600">!</span>{w}</li>)}</ul>
                    </div>
                  )}
                </article>
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
