// =====================================================================
// Contextual help — a unified right-hand help panel per workspace page.
//   · HelpProvider wraps the workspace and holds the open/close state.
//   · HelpDot renders a small circular "?" that opens the panel scrolled
//     to the topic it addresses.
//   · HelpPanel slides in from the very right with ALL the help for the
//     current page: purpose, allowed actions, consequences and topics.
// Content comes from src/lib/workspace-guide.ts and is ROLE-AWARE: users
// only read about actions they can actually perform.
// =====================================================================
import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { HelpCircle, X } from 'lucide-react';
import { useAccess } from '@/hooks/useAccess';
import { guideFor } from '@/lib/workspace-guide';

interface HelpState { page: string; topic?: string }
interface HelpContextValue {
  openHelp: (page: string, topic?: string) => void;
  closeHelp: () => void;
  state: HelpState | null;
}

const HelpContext = createContext<HelpContextValue>({ openHelp: () => {}, closeHelp: () => {}, state: null });
export const useHelp = () => useContext(HelpContext);

export function HelpProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<HelpState | null>(null);
  return (
    <HelpContext.Provider value={{
      openHelp: (page, topic) => setState({ page, topic }),
      closeHelp: () => setState(null),
      state,
    }}>
      {children}
      <HelpPanel />
    </HelpContext.Provider>
  );
}

/** Small circular question-mark icon that opens the page help at a topic. */
export function HelpDot({ page, topic, className = '' }: { page: string; topic?: string; className?: string }) {
  const { openHelp } = useHelp();
  if (!guideFor(page)) return null;
  return (
    <button
      type="button"
      onClick={(e) => { e.stopPropagation(); openHelp(page, topic); }}
      title="What is this?"
      aria-label="Open contextual help"
      className={`inline-flex items-center justify-center w-5 h-5 rounded-full border border-separator text-muted-foreground hover:text-accent hover:border-accent transition-colors align-middle shrink-0 ${className}`}
    >
      <HelpCircle className="h-3.5 w-3.5" />
    </button>
  );
}

/**
 * Floating page-level help button (bottom-right of the content area).
 * Uses the association's circular accent treatment with a distinctive ring
 * border, stays visible while the panel is open, and toggles it.
 */
export function PageHelpButton({ page }: { page: string }) {
  const { openHelp, closeHelp, state } = useHelp();
  if (!guideFor(page)) return null;
  const isOpen = !!state;
  return (
    <button
      type="button"
      onClick={() => (isOpen ? closeHelp() : openHelp(page))}
      title={isOpen ? 'Close help' : 'Help for this page'}
      aria-label={isOpen ? 'Close help' : 'Open help for this page'}
      // All visual traits (circle, size, halo shadow, serif glyph) live in the
      // dedicated .ws-help-fab class so the button renders identically on
      // desktop, tablet and mobile and cannot be flattened by utility rules.
      className="ws-help-fab help-dot-ignite"
    >
      {isOpen ? <X className="h-6 w-6" /> : <span aria-hidden className="ws-help-glyph">?</span>}
    </button>
  );
}

function HelpPanel() {
  const { state, closeHelp } = useHelp();
  const access = useAccess();
  const bodyRef = useRef<HTMLDivElement>(null);
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
        className={`fixed top-0 lg:top-20 right-0 z-[60] h-full lg:h-[calc(100%-5rem)] w-full max-w-full lg:max-w-[380px] bg-background border-l border-separator shadow-xl transition-transform duration-200 ease-out ${state ? 'translate-x-0' : 'translate-x-full pointer-events-none'}`}
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
                <h3 className="font-serif text-[17px] text-accent mb-1.5">What you are looking at</h3>
                <p className="text-[15px] text-foreground leading-relaxed">{g.purpose}</p>
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

              <p className="text-xs text-muted-foreground leading-relaxed border-t border-separator pt-4">
                Need the full picture? The <span className="text-foreground">How to use</span> section holds your complete role-based manual. Actions in the workspace are logged for accountability and security.
              </p>
            </div>
          </div>
        )}
      </aside>
    </>
  );
}
