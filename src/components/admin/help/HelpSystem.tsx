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
      className="fixed bottom-8 right-8 z-[70] w-14 h-14 rounded-full bg-accent text-accent-foreground flex items-center justify-center ring-2 ring-accent ring-offset-4 ring-offset-background shadow-[0_8px_24px_rgba(0,0,0,0.28)] transition-transform duration-150 hover:scale-105"
    >
      {isOpen ? <X className="h-6 w-6" /> : <HelpCircle className="h-7 w-7" />}
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
      {state && <div className="fixed left-0 right-0 top-20 bottom-0 z-[55]" onClick={closeHelp} aria-hidden />}
      <aside
        className={`fixed top-20 right-0 z-[60] h-[calc(100%-5rem)] w-full max-w-[380px] bg-background border-l border-t border-separator shadow-xl transition-transform duration-200 ease-out ${state ? 'translate-x-0' : 'translate-x-full pointer-events-none'}`}
        aria-hidden={!state}
      >
        {g && (
          <div className="h-full flex flex-col">
            <div className="flex items-start justify-between gap-3 px-5 py-4 border-b border-separator">
              <div>
                <div className="text-[11px] uppercase tracking-wider text-muted-foreground font-body">{g.section} · help</div>
                <h2 className="font-serif text-xl text-accent">{g.label}</h2>
              </div>
              <button type="button" onClick={closeHelp} aria-label="Close help" className="p-1 text-muted-foreground hover:text-foreground"><X className="h-5 w-5" /></button>
            </div>

            <div ref={bodyRef} className="flex-1 overflow-y-auto px-5 py-4 space-y-5 font-body text-sm">
              <section>
                <h3 className="text-xs uppercase tracking-wider text-muted-foreground mb-1.5">What you are looking at</h3>
                <p className="text-foreground leading-relaxed">{g.purpose}</p>
              </section>

              {(g.view.length > 0 || (canManage && g.manage.length > 0)) && (
                <section>
                  <h3 className="text-xs uppercase tracking-wider text-muted-foreground mb-1.5">What you can do here</h3>
                  <ul className="space-y-1.5">
                    {g.view.map((v, i) => <li key={`v${i}`} className="flex gap-2"><span className="text-accent">·</span><span className="text-muted-foreground">{v}</span></li>)}
                    {canManage && g.manage.map((m, i) => <li key={`m${i}`} className="flex gap-2"><span className="text-accent">·</span><span className="text-muted-foreground">{m}</span></li>)}
                  </ul>
                </section>
              )}

              {!canManage && g.manage.length > 0 && (
                <section>
                  <h3 className="text-xs uppercase tracking-wider text-muted-foreground mb-1.5">Reserved for managing roles</h3>
                  <p className="text-muted-foreground">Creating, editing and removing here is reserved for roles with full access to this subsection. You can consult everything shown to you.</p>
                </section>
              )}

              {g.warnings && g.warnings.length > 0 && (
                <section>
                  <h3 className="text-xs uppercase tracking-wider text-muted-foreground mb-1.5">Good to know</h3>
                  <ul className="space-y-1.5">
                    {g.warnings.map((w, i) => <li key={i} className="flex gap-2"><span className="text-amber-600">!</span><span className="text-muted-foreground">{w}</span></li>)}
                  </ul>
                </section>
              )}

              {topics.length > 0 && (
                <section className="space-y-3">
                  <h3 className="text-xs uppercase tracking-wider text-muted-foreground">In detail</h3>
                  {topics.map((t) => (
                    <div key={t.id} id={`help-${t.id}`} className={`border border-separator rounded-lg p-3 ${state?.topic === t.id ? 'border-accent bg-accent/5' : ''}`}>
                      <div className="text-foreground font-medium mb-1">{t.title}</div>
                      <p className="text-muted-foreground leading-relaxed">{t.body}</p>
                    </div>
                  ))}
                </section>
              )}

              <p className="text-xs text-muted-foreground border-t border-separator pt-3">
                Need the full picture? The <span className="text-foreground">How to use</span> section holds your complete role-based manual. Actions in the workspace are logged for accountability and security.
              </p>
            </div>
          </div>
        )}
      </aside>
    </>
  );
}
