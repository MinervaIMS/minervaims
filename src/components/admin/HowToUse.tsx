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
        {/* Intro cards */}
        <div className="grid grid-cols-1 lg:grid-cols-[2fr,2fr,1.5fr] gap-3">
          <div className="border border-separator rounded-lg p-4 flex gap-3">
            <BookOpen className="h-5 w-5 text-accent shrink-0 mt-0.5" />
            <p className="text-sm text-muted-foreground">Everything below is generated from the workspace's live access rules since it always matches what you can actually do. You do not need to learn it all: use it as a reference, and look for the <span className="inline-flex items-center justify-center w-4 h-4 rounded-full border border-separator text-[10px] align-middle">?</span> icons around the workspace for help in context.</p>
          </div>
          <div className="border border-separator rounded-lg p-4 flex gap-3">
            <Sparkles className="h-5 w-5 text-accent shrink-0 mt-0.5" />
            <p className="text-sm text-muted-foreground">Prefer learning with AI? <span className="text-foreground">Download your manual</span> and paste or upload it into an AI assistant. Ask for a summary, a checklist for a specific task, or a step-by-step walkthrough in your own words.</p>
          </div>
          <div className="border border-separator rounded-lg p-4 flex gap-3">
            <ShieldCheck className="h-5 w-5 text-accent shrink-0 mt-0.5" />
            <p className="text-sm text-muted-foreground">Actions you perform in the workspace are logged for accountability and security. The full record lives in Settings, Activity log.</p>
          </div>
        </div>



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
                      <div className="text-xs uppercase tracking-wider text-muted-foreground mb-1">You can</div>
                      <ul className="space-y-1">
                        {e.view.map((v, i) => <li key={`v${i}`} className="text-sm text-muted-foreground flex gap-2"><span className="text-accent">·</span>{v}</li>)}
                        {e.canManage && e.manage.map((m, i) => <li key={`m${i}`} className="text-sm text-muted-foreground flex gap-2"><span className="text-accent">·</span>{m}</li>)}
                      </ul>
                    </div>
                  )}

                  {!e.canManage && e.manage.length > 0 && (
                    <div className="mb-2">
                      <div className="text-xs uppercase tracking-wider text-muted-foreground mb-1">You cannot (reserved for managing roles)</div>
                      <ul className="space-y-1">{e.manage.map((m, i) => <li key={i} className="text-sm text-muted-foreground/70 flex gap-2"><span>×</span>{m}</li>)}</ul>
                    </div>
                  )}

                  {e.warnings && e.warnings.length > 0 && (
                    <div>
                      <div className="text-xs uppercase tracking-wider text-muted-foreground mb-1">Good to know</div>
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
