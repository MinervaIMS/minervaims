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
import {
  COMMON_TASKS, GLOSSARY, HOW_IT_WORKS, PAGE_DETAIL, ROLE_BRIEFS, TROUBLESHOOTING,
} from '@/lib/workspace-manual';
import { SPECIAL_RULES, MEMBERS_DIVISION_VIEW_ROLES, CROSS_DIVISION_VIEW_ROLES } from '@/lib/access/matrix';
import { roleLabel, divisionLabels, normalizeRole } from '@/lib/roles';
import { logActivity } from '@/lib/activity-log';

interface ManualSection { section: string; entries: (GuideEntry & { canManage: boolean })[] }

// How the workspace is organised, independent of role.
const AT_A_GLANCE = [
  'Your role decides not only which pages you see but what you can do on each. On a page you may read but not change, the editing controls are faded and inert rather than failing when pressed; everything that only changes what you see keeps working.',
  'The navigation is organised in sections, each holding subsections. You only ever see the pages your role can access, so nothing in your menu is off limits.',
  'The fastest way anywhere is the search bar in the header, or Ctrl K (Cmd K on a Mac). It finds subsections and help topics, and it also searches INSIDE the workspace: members, alumni, events, reports and the resource libraries. Type a person\'s name and you get the person, not just the page they are on. Every result is limited to what your role can open, and no search is even sent for a part of the workspace you cannot reach.',
  'One role drives everything. It is assigned by the President or Admin in Settings, Users, which edits the same record as People, Members: a change made in either place appears in both immediately. Nobody can change their own role.',
  'Help lives where you work: the floating question mark on every page opens the sliding help panel for that page, and the small circled question marks next to specific controls open the panel directly at the matching topic. Everything you read there is generated from the same source as this manual, for your role only.',
  'On a phone the workspace becomes a compact shell: sections in a drawer, subsections as chips, and every page your role can open available to read. Nothing is withheld on a phone that you could see on a computer, and nothing can be edited from one, whatever your role; each page carries a ribbon saying so, and wide tables are dragged sideways rather than trimmed.',
  'Links of the form /admin?section=...&sub=... open the workspace directly on a subsection, provided your role can see it. Some website buttons use them to bring you to the right place in one click.',
  'Every meaningful action is recorded in Settings, Activity log, together with the role you held at that moment.',
];

// What changed recently, so returning members catch up at a glance.
// Newest first. Kept to what a person would actually notice: a change
// nobody can see from a page does not belong in a manual about pages.
const RECENT_IMPROVEMENTS = [
  'The whole workspace now opens on a phone. Every page your role can see is there to read, including the recruiting pipeline, the treasury, the user list and the activity log, which used to ask for a computer; pages built for a wide screen keep all their columns and are dragged sideways rather than trimmed. What a phone does not do is edit: every control that changes something is withheld, for every role, and a ribbon on each page says so.',
  'Recruiting, Candidates screening opens a candidate with arrows to the one before and the one after, so a screening round is read straight through without returning to the table between candidates. They follow the order the table is showing, filters included.',
  'A Head of Division reads the whole intake in Candidates screening, not only the candidates who named their division, so the round can be judged as a whole and somebody who fits another division better can be spotted. Moving a candidacy stays with the division assessing it.',
  'Where your role may look but not change, the controls that would change something are now faded and cannot be pressed: create and add buttons, the edit and delete icons on a row, publishing switches, the Save at the foot of a form. Searching, filtering, sorting, downloading, opening a record to read it and registering yourself for an event all keep working. Previously those buttons looked live and failed only after you had filled in the form.',
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

  // The role's own facts, said once at the top rather than left to be
  // inferred from forty page descriptions.
  const roleFacts = useMemo(() => {
    const role = access.primaryRole ? normalizeRole(access.primaryRole) : null;
    const brief = role ? ROLE_BRIEFS[role] : undefined;
    const specials = role
      ? SPECIAL_RULES.filter((r) => r.roles.includes(role) && access.canView(r.resource))
      : [];
    const scoped = !!role && MEMBERS_DIVISION_VIEW_ROLES.includes(role);
    const crossDivision = !!role && CROSS_DIVISION_VIEW_ROLES.includes(role);
    return { role, brief, specials, scoped, crossDivision };
  }, [access]);

  // Reference material is filtered exactly as the per-page manual is: a
  // block whose subject is a page you cannot open is not printed, so
  // nothing here describes a part of the workspace you will never meet.
  const concepts = useMemo(
    () => HOW_IT_WORKS.filter((c) => !c.requires || access.canView(c.requires)),
    [access],
  );
  const tasks = useMemo(
    () => COMMON_TASKS.filter((t) => (t.level === 'manage' ? access.canManage(t.requires) : access.canView(t.requires))),
    [access],
  );
  const glossary = useMemo(
    () => GLOSSARY.filter((g) => !g.requires || access.canView(g.requires)),
    [access],
  );
  const answers = useMemo(
    () => TROUBLESHOOTING.filter((a) => !a.requires || access.canView(a.requires)),
    [access],
  );

  // =================================================================
  // THE DOWNLOAD IS THE MANUAL, NOT A SUMMARY OF IT.
  // -----------------------------------------------------------------
  // It used to print each page's purpose and its two lists of actions,
  // and stop. The TOPICS - a hundred and three of them, and the part of
  // the guide that actually explains how a control behaves and what it
  // costs to get wrong - were shown in the sliding help panel and left
  // out of the file entirely. So the document people download, and the
  // document people paste into an AI assistant to have explained, was
  // the thinnest version of the guide that exists.
  //
  // It now carries everything: the reference sections above, the role's
  // own rules, every page with all of its topics, the tasks that cross
  // pages, the vocabulary and the questions people ask when something
  // looks wrong. Written in the order somebody reads rather than the
  // order the navigation happens to be in.
  //
  // IT IS WRITTEN TO BE READ BY A MODEL AS WELL AS BY A PERSON. That is
  // not a stylistic note, it is why the reference sections exist at all:
  // asked "how do I move a candidate", a model given only page
  // descriptions will produce something plausible and wrong, because the
  // rule it needs was never in the file. Stating the rules is what makes
  // the answers it gives correct.
  // =================================================================
  const buildMarkdown = () => {
    const lines: string[] = [];
    const push = (...l: string[]) => lines.push(...l);

    push(`# Minerva workspace manual: ${roleName}`, '');
    push(`Generated for your role${divisionName ? ` (${divisionName})` : ''} on ${new Date().toLocaleDateString('en-GB')}.`, '');
    push('This manual describes exactly the parts of the workspace your role can reach, and what you can do in each. Anything it does not mention is something your role cannot do.', '');
    push('> If you are reading this inside an AI assistant: this file is authoritative and complete for this role. Where it does not say something, the right answer is that the role cannot do it, rather than an inference from how similar systems usually work.', '');

    push('## Contents', '');
    push('1. Your role');
    push('2. How the workspace works');
    push('3. The workspace at a glance');
    push('4. Your pages, one by one');
    push('5. Common tasks');
    push('6. When something looks wrong');
    push('7. Glossary');
    push('8. Recent improvements');
    push('');

    // 1 -------------------------------------------------------------
    push('## 1. Your role', '');
    push(`You are signed in as **${roleName}**${divisionName ? `, in ${divisionName}` : ''}.`, '');
    if (roleFacts.brief) push(roleFacts.brief, '');
    const sectionNames = manual.map((s) => s.section).join(', ');
    push(`You can open ${manual.reduce((n, s) => n + s.entries.length, 0)} subsections across these sections: ${sectionNames}.`, '');
    const managed = manual.flatMap((s) => s.entries.filter((e) => e.canManage).map((e) => e.label));
    const readOnly = manual.flatMap((s) => s.entries.filter((e) => !e.canManage).map((e) => e.label));
    if (managed.length) push(`**Full interact** (you can create, edit, delete and publish): ${managed.join(', ')}.`, '');
    if (readOnly.length) push(`**Interact only** (you can read and use light actions, but not change anything): ${readOnly.join(', ')}.`, '');
    if (roleFacts.scoped) push('**Division scoping.** On the report pages and in the members register you see your own division. Reports, templates and archives are limited the same way.', '');
    if (roleFacts.crossDivision) push('**Cross-division view.** On the report pages you can look beyond your own division.', '');
    if (roleFacts.specials.length) {
      push('**Rules that apply specifically to your role:**', '');
      roleFacts.specials.forEach((r) => push(`- ${r.label}`));
      push('');
    }
    push('You cannot change your own role, from any page. That is enforced on the server as well as in the interface.', '');

    // 2 -------------------------------------------------------------
    push('## 2. How the workspace works', '');
    concepts.forEach((c) => {
      push(`### ${c.title}`, '');
      c.body.forEach((b) => push(b, ''));
    });

    // 3 -------------------------------------------------------------
    push('## 3. The workspace at a glance', '');
    AT_A_GLANCE.forEach((p) => push(`- ${p}`));
    push('');

    // 4 -------------------------------------------------------------
    push('## 4. Your pages, one by one', '');
    for (const sec of manual) {
      push(`### ${sec.section}`, '');
      for (const e of sec.entries) {
        push(`#### ${e.label}`, '');
        push(`*Your level: ${e.canManage ? 'Full interact' : 'Interact only'}.*`, '');
        push(e.purpose, '');
        const can = [...e.view, ...(e.canManage ? e.manage : [])];
        // THE PARAGRAPHS THE PAGE HEADERS GAVE UP. Every subsection's
        // subtitle is now one sentence; what it used to say, expanded,
        // is here and in the help panel. It is printed before the action
        // lists because it is the context those lists sit in.
        const extra = PAGE_DETAIL[e.key];
        if (extra?.detail.length) { extra.detail.forEach((d) => push(d, '')); }
        if (can.length) { push('**You can:**', ''); can.forEach((c) => push(`- ${c}`)); push(''); }
        if (!e.canManage && e.manage.length) {
          push('**You cannot** (reserved for roles with full interact on this page):', '');
          e.manage.forEach((c) => push(`- ${c}`));
          push('');
        }
        if (e.warnings?.length) { push('**Good to know:**', ''); e.warnings.forEach((w) => push(`- ${w}`)); push(''); }
        // The topics, which is where the guide actually explains itself.
        // A topic marked `requires: 'manage'` describes a control this
        // role does not have, so it is left out rather than teaching
        // somebody a button they will never see.
        const topics = (e.topics ?? []).filter((t) => !(t.requires === 'manage' && !e.canManage));
        if (topics.length) {
          push('**In detail:**', '');
          topics.forEach((t) => { push(`- **${t.title}.** ${t.body}`); });
          push('');
        }
        // The sequence this page belongs to, limited to the parts of it
        // this role can actually open.
        const links = (extra?.related ?? [])
          .filter((k) => access.canView(k))
          .map((k) => GUIDE.find((x) => x.key === k))
          .filter((x): x is GuideEntry => !!x);
        if (links.length) {
          push('**Works with:** ' + links.map((l) => `${l.section}, ${l.label}`).join('; ') + '.', '');
        }
        // The tasks that start on this page, in the order they are done.
        const pageTasks = tasks.filter((t) => t.requires === e.key);
        if (pageTasks.length) {
          pageTasks.forEach((t) => {
            push(`**${t.title}**`, '');
            t.steps.forEach((step, i) => push(`${i + 1}. ${step}`));
            push('');
            if (t.caution) push(`> ${t.caution}`, '');
          });
        }
      }
    }

    // 5 -------------------------------------------------------------
    if (tasks.length) {
      push('## 5. Common tasks', '');
      push('Sequences that cross more than one page, in the order they are done.', '');
      tasks.forEach((t) => {
        push(`### ${t.title}`, '');
        t.steps.forEach((step, i) => push(`${i + 1}. ${step}`));
        push('');
        if (t.caution) push(`> ${t.caution}`, '');
      });
    }

    // 6 -------------------------------------------------------------
    if (answers.length) {
      push('## 6. When something looks wrong', '');
      answers.forEach((a) => { push(`**${a.question}**`, '', a.answer, ''); });
    }

    // 7 -------------------------------------------------------------
    push('## 7. Glossary', '');
    glossary.forEach((g) => push(`- **${g.term}.** ${g.definition}`));
    push('');

    // 8 -------------------------------------------------------------
    push('## 8. Recent improvements', '');
    RECENT_IMPROVEMENTS.forEach((p) => push(`- ${p}`));
    push('');

    push('---');
    push('Every meaningful action in the workspace is recorded in the activity log together with the role held at the time.');
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

        {/* YOUR ROLE, STATED. It used to have to be inferred from forty
            page descriptions, which is not a thing anybody does. */}
        <section>
          <h2 className="font-serif text-heading text-accent border-b border-separator pb-2 mb-4">Your role</h2>
          <div className="max-w-3xl space-y-3 text-sm text-muted-foreground leading-relaxed">
            <p className="text-foreground">
              You are signed in as <span className="font-semibold">{roleName}</span>{divisionName ? `, in ${divisionName}` : ''}.
            </p>
            {roleFacts.brief && <p>{roleFacts.brief}</p>}
            <p>
              You can open {manual.reduce((n, sec) => n + sec.entries.length, 0)} subsections
              {manual.length > 0 && <> across {manual.map((sec) => sec.section).join(', ')}</>}.
              {' '}Of those, {manual.flatMap((sec) => sec.entries).filter((e) => e.canManage).length} are yours to change and the rest are yours to read.
            </p>
            {roleFacts.scoped && (
              <p>On the report pages and in the members register you see your own division.</p>
            )}
            {roleFacts.crossDivision && (
              <p>On the report pages you can look beyond your own division.</p>
            )}
            {roleFacts.specials.length > 0 && (
              <div>
                <div className="text-xs font-semibold text-muted-foreground mb-1">Rules that apply specifically to your role</div>
                <ul className="space-y-1">
                  {roleFacts.specials.map((r) => (
                    <li key={r.rule} className="flex gap-2"><span className="text-accent">·</span><span>{r.label}</span></li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </section>

        {/* HOW IT WORKS, before the pages. The model, not the menu. */}
        <section>
          <h2 className="font-serif text-heading text-accent border-b border-separator pb-2 mb-4">How the workspace works</h2>
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-5 items-start">
            {concepts.map((c) => (
              <article key={c.id} className="border border-separator rounded-lg p-4">
                <h3 className="font-serif text-lg text-foreground mb-2">{c.title}</h3>
                <div className="space-y-2">
                  {c.body.map((b, i) => <p key={i} className="text-sm text-muted-foreground leading-relaxed">{b}</p>)}
                </div>
              </article>
            ))}
          </div>
        </section>

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

                  {/* THE DETAIL, FOLDED AWAY RATHER THAN LEFT OUT.
                      These are the same topics the sliding help panel
                      shows, and they are the part of the guide that
                      explains how a control actually behaves. Printing
                      them open would make this page a wall; omitting
                      them, which is what happened before, made the page
                      a summary of a document nobody could reach from
                      here. A disclosure is the honest middle. */}
                  {(() => {
                    const topics = (e.topics ?? []).filter((t) => !(t.requires === 'manage' && !e.canManage));
                    const extra = PAGE_DETAIL[e.key];
                    const paras = extra?.detail ?? [];
                    if (topics.length === 0 && paras.length === 0) return null;
                    return (
                      <details className="mt-3 border-t border-separator pt-2">
                        <summary data-ro className="cursor-pointer text-xs font-semibold text-accent">
                          In detail ({topics.length + paras.length})
                        </summary>
                        {paras.length > 0 && (
                          <div className="mt-2 space-y-2">
                            {paras.map((d, i) => (
                              <p key={i} className="text-sm text-muted-foreground leading-relaxed">{d}</p>
                            ))}
                          </div>
                        )}
                        {topics.length > 0 && (
                          <ul className="mt-2 space-y-2">
                            {topics.map((t) => (
                              <li key={t.id} className="text-sm text-muted-foreground leading-relaxed">
                                <span className="text-foreground">{t.title}. </span>{t.body}
                              </li>
                            ))}
                          </ul>
                        )}
                      </details>
                    );
                  })()}
                </article>
              ))}
            </div>
          </section>
        ))}

        {/* THE SEQUENCES THAT CROSS PAGES. A page description cannot
            teach an order, and an order is what somebody doing the job
            for the first time is missing. */}
        {tasks.length > 0 && (
          <section>
            <h2 className="font-serif text-heading text-accent border-b border-separator pb-2 mb-4">Common tasks</h2>
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-5 items-start">
              {tasks.map((t) => (
                <article key={t.id} className="border border-separator rounded-lg p-4">
                  <h3 className="font-serif text-lg text-foreground mb-2">{t.title}</h3>
                  <ol className="space-y-1.5 list-decimal pl-5">
                    {t.steps.map((step, i) => <li key={i} className="text-sm text-muted-foreground leading-relaxed">{step}</li>)}
                  </ol>
                  {t.caution && (
                    <p className="mt-3 flex gap-2 text-sm text-muted-foreground"><span className="text-amber-600">!</span>{t.caution}</p>
                  )}
                </article>
              ))}
            </div>
          </section>
        )}

        {answers.length > 0 && (
          <section>
            <h2 className="font-serif text-heading text-accent border-b border-separator pb-2 mb-4">When something looks wrong</h2>
            <div className="max-w-3xl space-y-4">
              {answers.map((a) => (
                <div key={a.question}>
                  <div className="text-sm text-foreground">{a.question}</div>
                  <p className="text-sm text-muted-foreground leading-relaxed">{a.answer}</p>
                </div>
              ))}
            </div>
          </section>
        )}

        <section>
          <h2 className="font-serif text-heading text-accent border-b border-separator pb-2 mb-4">Glossary</h2>
          <ul className="max-w-3xl space-y-2">
            {glossary.map((g) => (
              <li key={g.term} className="text-sm text-muted-foreground leading-relaxed">
                <span className="text-foreground">{g.term}. </span>{g.definition}
              </li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  );
}
