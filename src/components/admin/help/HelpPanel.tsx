// =====================================================================
// HelpPanel — everything the sliding panel says, and the only thing that
// reads the guide and the manual.
// ---------------------------------------------------------------------
// IT IS A SEPARATE FILE BECAUSE IT IS A SEPARATE CHUNK. `workspace-guide`
// and `workspace-manual` are 120kB of prose between them, and while this
// component lived alongside HelpProvider - which wraps every workspace
// page - all of it was downloaded and parsed before the workspace could
// draw anything, on every load, whether or not anybody opened the help.
//
// HelpSystem now loads this file the first time the panel is opened, and
// the workspace warms it in the background once the page is up, so in
// practice it is already there when the ? is pressed.
//
// Nothing about what the panel SAYS changed in the move.
// =====================================================================
import { useEffect, useRef, useState } from 'react';
import { X } from 'lucide-react';
import { useAccess } from '@/hooks/useAccess';
import { GUIDE, guideFor } from '@/lib/workspace-guide';
import { COMMON_TASKS, PAGE_DETAIL, TROUBLESHOOTING } from '@/lib/workspace-manual';
import { useHelp } from './HelpContext';

export default function HelpPanel() {
  const { state, closeHelp } = useHelp();
  const access = useAccess();
  const bodyRef = useRef<HTMLDivElement>(null);
  // ONE FRAME AT THE CLOSED POSITION, AND ONLY EVER THE FIRST.
  //
  // This component is mounted the first time the help is opened, so it
  // arrives with `state` already set: without this it would be at
  // translate-x-0 on its very first frame and would appear rather than
  // slide. `entered` flips on the next frame, which is what the transform
  // transition needs to have something to animate from. It never goes
  // back to false, so every subsequent open behaves exactly as before.
  const [entered, setEntered] = useState(false);
  useEffect(() => {
    const raf = requestAnimationFrame(() => setEntered(true));
    return () => cancelAnimationFrame(raf);
  }, []);
  // Keep the last page rendered during the slide-out animation.
  const [visiblePage, setVisiblePage] = useState<string | null>(null);
  useEffect(() => { if (state?.page) setVisiblePage(state.page); }, [state?.page]);

  // Scroll to the requested topic once the panel is open.
  useEffect(() => {
    if (!state) return;
    const t = setTimeout(() => {
      const el = state.topic
        ? bodyRef.current?.querySelector(`#help-${state.topic}`)
        : bodyRef.current;
      if (el && 'scrollIntoView' in el) (el as HTMLElement).scrollIntoView({ behavior: 'smooth', block: 'start' });
      else bodyRef.current?.scrollTo({ top: 0 });
    }, 220);
    return () => clearTimeout(t);
  }, [state]);

  const g = visiblePage ? guideFor(visiblePage) : undefined;
  const canManage = g ? access.canManage(g.key) : false;
  const topics = (g?.topics ?? []).filter((t) => t.requires !== 'manage' || canManage);

  // =====================================================================
  // WHAT THE PANEL CARRIES NOW, AND WHY IT CARRIES IT.
  // ---------------------------------------------------------------------
  // The page subtitles used to be paragraphs. They are one sentence each
  // now, and this is where the rest of what they said arrived: `detail`
  // below is that material, expanded. Alongside it the panel gained three
  // things it never had, each of which somebody standing on the page
  // would otherwise have to go and find:
  //
  //   * THE TASKS THAT START HERE, in the order they are done, filtered
  //     to the ones this role can actually perform. A page description
  //     cannot teach a sequence, and a sequence is what somebody doing
  //     the job for the first time is missing.
  //
  //   * WHAT TO DO WHEN SOMETHING LOOKS WRONG on this page, answered
  //     with the real mechanism rather than "try again".
  //
  //   * WHERE THIS PAGE SITS. The subsections it is part of a sequence
  //     with, filtered by what this reader can open, so the panel never
  //     points at a door that is locked for them.
  //
  // All four come from the same two modules the downloadable manual is
  // generated from, so the panel and the manual can never say different
  // things about the same page.
  // =====================================================================
  const extra = g ? PAGE_DETAIL[g.key] : undefined;
  const tasks = g
    ? COMMON_TASKS.filter((t) => t.requires === g.key
        && (t.level === 'manage' ? access.canManage(t.requires) : access.canView(t.requires)))
    : [];
  const answers = g ? TROUBLESHOOTING.filter((a) => a.requires === g.key) : [];
  const related = (extra?.related ?? [])
    .filter((k) => access.canView(k))
    .map((k) => GUIDE.find((e) => e.key === k))
    .filter((e): e is NonNullable<typeof e> => !!e);

  return (
    <>
      {/* Click-away backdrop below the top strip, so Return to Website and
          Log Out always stay visible and clickable. The floating help button
          sits above this layer, so it always receives its clicks. */}
      {state && <div className="fixed left-0 right-0 top-0 lg:top-20 bottom-0 z-[55]" onClick={closeHelp} aria-hidden />}
      {/* top-20 matches the h-20 top strip exactly; the panel deliberately has
          NO top border of its own (the strip's bottom hairline already draws
          that line), so its edge sits flush with the breadcrumb/content area. */}
      <aside
        className={`fixed top-0 lg:top-20 right-0 z-[60] h-full lg:h-[calc(100%-5rem)] w-full max-w-full lg:max-w-[380px] bg-background border-l border-separator shadow-xl transition-transform duration-200 ease-out ${state && entered ? 'translate-x-0' : 'translate-x-full pointer-events-none'}`}
        aria-hidden={!state}
      >
        {g && (
          <div className="h-full flex flex-col">
            {/* Header band: the one strongly coloured element, so the panel
                reads as "help mode" at a glance. Serif title carries the
                hierarchy, the kicker gives the place. */}
            <div className="flex items-start justify-between gap-3 px-6 py-5 bg-accent text-accent-foreground">
              <div className="min-w-0">
                <div className="text-xs text-accent-foreground/70 font-body mb-1">Help · {g.section}</div>
                <h2 className="font-serif text-2xl leading-tight">{g.label}</h2>
              </div>
              <button type="button" onClick={closeHelp} aria-label="Close help" className="p-1 -mr-1 text-accent-foreground/80 hover:text-accent-foreground"><X className="h-5 w-5" /></button>
            </div>

            <div ref={bodyRef} className="flex-1 overflow-y-auto px-6 py-6 space-y-8 font-body text-sm">
              {/* 1 · Purpose: the tinted accent block opens the page. */}
              <section className="border-l-2 border-accent bg-accent/[0.05] px-4 py-3.5">
                <div className="mb-2 flex items-center gap-2">
                  <h3 className="font-serif text-[17px] text-accent">What you are looking at</h3>
                  {/* The level, stated rather than inferred from which
                      buttons happen to be faded. */}
                  <span className={`ml-auto shrink-0 rounded px-1.5 py-0.5 text-[10px] uppercase tracking-wider ${
                    canManage ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'
                  }`}>
                    {canManage ? 'Full interact' : 'Interact only'}
                  </span>
                </div>
                <p className="text-[15px] text-foreground leading-relaxed">{g.purpose}</p>
                {/* The old subtitle's paragraph, and then some. */}
                {extra && extra.detail.length > 0 && (
                  <div className="mt-3 space-y-2.5 border-t border-accent/15 pt-3">
                    {extra.detail.map((d, i) => (
                      <p key={i} className="text-foreground/80 leading-relaxed">{d}</p>
                    ))}
                  </div>
                )}
              </section>

              {/* 2 · Actions, split into consult vs manage for a clear
                  hierarchy (colours kept: accent = consult, green = manage). */}
              {(g.view.length > 0 || (canManage && g.manage.length > 0)) && (
                <section>
                  <h3 className="font-serif text-[17px] text-accent pb-2 mb-3 border-b border-separator">What you can do here</h3>
                  {g.view.length > 0 && (
                    <ul className="space-y-2">
                      {g.view.map((v, i) => (
                        <li key={`v${i}`} className="flex gap-2.5">
                          <span aria-hidden className="mt-[7px] w-1.5 h-1.5 bg-accent shrink-0" />
                          <span className="text-foreground/85 leading-relaxed">{v}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                  {canManage && g.manage.length > 0 && (
                    <div className={g.view.length > 0 ? 'mt-4' : ''}>
                      <div className="text-[13px] font-semibold text-emerald-700 mb-2">Managing actions your role unlocks</div>
                      <ul className="space-y-2">
                        {g.manage.map((m, i) => (
                          <li key={`m${i}`} className="flex gap-2.5">
                            <span aria-hidden className="mt-[7px] w-1.5 h-1.5 bg-emerald-600 shrink-0" />
                            <span className="text-foreground/85 leading-relaxed">{m}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </section>
              )}

              {!canManage && g.manage.length > 0 && (
                <section className="border border-separator bg-muted/40 px-4 py-3.5">
                  <h3 className="font-serif text-[17px] text-foreground/75 mb-1.5">Reserved for managing roles</h3>
                  <p className="text-muted-foreground leading-relaxed">Creating, editing and removing here is reserved for roles with full access to this subsection. You can consult everything shown to you.</p>
                </section>
              )}

              {/* 3 · Warnings keep their amber band: the colour IS the signal. */}
              {g.warnings && g.warnings.length > 0 && (
                <section className="border-l-2 border-amber-500 bg-amber-50/70 px-4 py-3.5">
                  <h3 className="font-serif text-[17px] text-amber-800 mb-2">Good to know</h3>
                  <ul className="space-y-2">
                    {g.warnings.map((w, i) => <li key={i} className="flex gap-2.5"><span className="text-amber-600 font-semibold shrink-0">!</span><span className="text-foreground/80 leading-relaxed">{w}</span></li>)}
                  </ul>
                </section>
              )}

              {/* 4 · Topics: serif titles over hairlines; the targeted topic
                  is lifted with the accent tint. */}
              {topics.length > 0 && (
                <section>
                  <h3 className="font-serif text-[17px] text-accent pb-2 mb-1 border-b border-separator">In detail</h3>
                  <div className="divide-y divide-separator">
                    {topics.map((t) => (
                      <div
                        key={t.id}
                        id={`help-${t.id}`}
                        className={`py-3.5 ${state?.topic === t.id ? 'border-l-2 border-accent bg-accent/[0.05] pl-3.5 pr-2 -mx-0' : ''}`}
                      >
                        <div className="font-serif text-base text-accent mb-1">{t.title}</div>
                        <p className="text-foreground/75 leading-relaxed">{t.body}</p>
                      </div>
                    ))}
                  </div>
                </section>
              )}

              {/* 5 · How the work is actually done here, in order. */}
              {tasks.length > 0 && (
                <section>
                  <h3 className="font-serif text-[17px] text-accent pb-2 mb-3 border-b border-separator">How to do it</h3>
                  <div className="space-y-4">
                    {tasks.map((t) => (
                      <div key={t.id}>
                        <div className="font-serif text-base text-foreground mb-1.5">{t.title}</div>
                        <ol className="list-decimal space-y-1 pl-4">
                          {t.steps.map((step, i) => (
                            <li key={i} className="text-foreground/75 leading-relaxed">{step}</li>
                          ))}
                        </ol>
                        {t.caution && (
                          <p className="mt-2 flex gap-2 text-xs text-amber-800">
                            <span className="shrink-0 font-semibold text-amber-600">!</span>{t.caution}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                </section>
              )}

              {/* 6 · The questions people ask about this page. */}
              {answers.length > 0 && (
                <section>
                  <h3 className="font-serif text-[17px] text-accent pb-2 mb-3 border-b border-separator">If something looks wrong</h3>
                  <div className="space-y-3">
                    {answers.map((a) => (
                      <div key={a.question}>
                        <div className="text-foreground">{a.question}</div>
                        <p className="text-foreground/70 leading-relaxed">{a.answer}</p>
                      </div>
                    ))}
                  </div>
                </section>
              )}

              {/* 7 · Where this page sits, and what it leads to. */}
              {related.length > 0 && (
                <section>
                  <h3 className="font-serif text-[17px] text-accent pb-2 mb-3 border-b border-separator">Works with</h3>
                  <ul className="space-y-1.5">
                    {related.map((r) => (
                      <li key={r.key} className="flex gap-2.5">
                        <span aria-hidden className="mt-[7px] h-1.5 w-1.5 shrink-0 bg-accent" />
                        <span className="text-foreground/80 leading-relaxed">
                          <span className="text-foreground">{r.section}, {r.label}.</span>{' '}
                          {r.purpose}
                        </span>
                      </li>
                    ))}
                  </ul>
                </section>
              )}

              {/* "How to use" was styled as a link and did nothing. It now
                  goes where it says it goes.

                  The panel lives under HelpProvider, several levels away
                  from the state that decides which section the workspace is
                  showing, so it ASKS rather than reaching across the tree -
                  the same idiom the workspace search already uses to open a
                  help topic from the header. The shells listen for
                  `minerva:navigate` and move; see MinervaWorkspace and
                  MobileWorkspaceShell.

                  It is only offered to someone whose role can actually open
                  that section, so the link cannot lead to a refusal. */}
              {/* AND FOR SOMEBODY WITH NO MANUAL, A DIFFERENT SENTENCE.
                  An applicant has no "How to use" section: pointing them at
                  one, even as plain text rather than a link, describes a
                  workspace they cannot see. They are sent to their own FAQs
                  instead, which is the page that actually answers them. */}
              {access.canView('welcome') ? (
                <p className="text-xs text-muted-foreground leading-relaxed border-t border-separator pt-4">
                  Need the full picture? The{' '}
                  <button
                    type="button"
                    onClick={() => {
                      closeHelp();
                      window.dispatchEvent(new CustomEvent('minerva:navigate', { detail: { section: 'welcome' } }));
                    }}
                    className="text-accent underline underline-offset-2 hover:text-accent/80 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent"
                  >
                    How to use
                  </button>{' '}
                  section holds your complete role-based manual. Actions in the workspace are logged for accountability and security.
                </p>
              ) : access.isCandidate ? (
                <p className="text-xs text-muted-foreground leading-relaxed border-t border-separator pt-4">
                  Still unsure? The{' '}
                  <button
                    type="button"
                    onClick={() => {
                      closeHelp();
                      window.dispatchEvent(new CustomEvent('minerva:navigate', { detail: { section: 'applications-faqs' } }));
                    }}
                    className="text-accent underline underline-offset-2 hover:text-accent/80 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent"
                  >
                    FAQs
                  </button>{' '}
                  section answers the questions applicants ask most often. If yours is not there, write to the association: asking never counts against an application.
                </p>
              ) : (
                <p className="text-xs text-muted-foreground leading-relaxed border-t border-separator pt-4">
                  Actions in the workspace are logged for accountability and security.
                </p>
              )}
            </div>
          </div>
        )}
      </aside>
    </>
  );
}
