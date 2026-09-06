// =====================================================================
// Contextual help — a unified right-hand help panel per workspace page.
//   · HelpProvider wraps the workspace and holds the open/close state.
//   · HelpDot renders a small circular "?" that opens the panel scrolled
//     to the topic it addresses.
//   · HelpPanel slides in from the very right with ALL the help for the
//     current page: purpose, allowed actions, consequences and topics.
// Content comes from src/lib/workspace-guide.ts and is ROLE-AWARE: users
// only read about actions they can actually perform.
// ---------------------------------------------------------------------
// THIS FILE IS THE HALF THAT IS ALWAYS THERE, AND IT NO LONGER CARRIES
// THE WORDS.
//
// HelpProvider wraps every workspace page, so whatever it imports is
// downloaded and parsed before the workspace can draw anything. It used
// to import the guide and the manual - 120kB of prose - for the panel it
// rendered alongside the pages, and nobody reads a word of that until
// they press the ?, if they ever do. That was close to half of the
// workspace's opening download, spent on a panel that was closed.
//
// The panel is `./HelpPanel` now, in its own chunk, mounted the first
// time the help is opened; the workspace warms that chunk in the
// background once the page is up, so pressing ? does not wait for it.
//
// The two buttons still have to know whether a page HAS help, because
// thirty-eight of the workspace's pages do and the rest do not, and a ?
// that opens an empty panel is worse than no ?. They ask
// `workspace-guide-keys`, which is the list of keys and nothing else.
// =====================================================================
import { lazy, Suspense, useEffect, useState, type ReactNode } from 'react';
import { HelpCircle, X } from 'lucide-react';
import { hasGuide } from '@/lib/workspace-guide-keys';
import { HelpContext, useHelp, type HelpState } from './HelpContext';

const HelpPanel = lazy(() => import('./HelpPanel'));

export function HelpProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<HelpState | null>(null);
  // The panel is mounted from the first opening onwards and never
  // unmounted again: it keeps rendering the page it was showing while it
  // slides back out, which is what closing it looks like.
  const [everOpened, setEverOpened] = useState(false);

  // The workspace search can land on a help topic rather than a page. It
  // lives outside this provider (in the shell's header), so it asks through
  // an event rather than reaching into the context across the tree.
  useEffect(() => {
    const onOpen = (e: Event) => {
      const detail = (e as CustomEvent<{ page: string; topic?: string }>).detail;
      if (detail?.page) setState({ page: detail.page, topic: detail.topic });
    };
    window.addEventListener('minerva:open-help', onOpen);
    return () => window.removeEventListener('minerva:open-help', onOpen);
  }, []);

  useEffect(() => { if (state) setEverOpened(true); }, [state]);

  return (
    <HelpContext.Provider value={{
      openHelp: (page, topic) => setState({ page, topic }),
      closeHelp: () => setState(null),
      state,
    }}>
      {children}
      {/* No fallback: there is nothing sensible to show in the fraction of
          a second before the panel's chunk arrives, and an empty box
          sliding in and then filling would be worse than the panel
          arriving a moment later. */}
      {everOpened && (
        <Suspense fallback={null}>
          <HelpPanel />
        </Suspense>
      )}
    </HelpContext.Provider>
  );
}

/** Small circular question-mark icon that opens the page help at a topic. */
export function HelpDot({ page, topic, className = '' }: { page: string; topic?: string; className?: string }) {
  const { openHelp } = useHelp();
  if (!hasGuide(page)) return null;
  return (
    <button
      data-ro
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
  if (!hasGuide(page)) return null;
  const isOpen = !!state;
  return (
    <button
      data-ro
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
