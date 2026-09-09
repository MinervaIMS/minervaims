import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { Menu, X, Globe, LogOut, ChevronDown, ChevronRight, Eye } from 'lucide-react';
import { HelpProvider, PageHelpButton } from '@/components/admin/help/HelpSystem';
import WorkspaceSearch, { type SearchTarget } from '@/components/admin/WorkspaceSearch';
import logoWhite from '@/assets/logo-white.svg';

// =====================================================================
// Mobile workspace shell. Rendered below the desktop breakpoint INSTEAD
// of the desktop layout, which stays exactly as it is. It recomposes the
// four structural pieces for a small screen:
//   - top strip  -> compact accent bar: menu, current place, website/logout
//   - section nav -> left drawer with accordion sections (role + email live
//                    in the drawer header)
//   - subsection nav -> horizontally scrollable chip bar under the top bar
//   - help panel -> full-screen sheet (handled responsively in HelpSystem)
//
// EVERY SUBSECTION THE ROLE MAY OPEN, OPENS HERE. The shell withholds
// nothing of its own: what is listed is what `filterNav` allowed, which
// is the same navigation the desktop draws. What a phone does NOT do is
// edit, and that is said once in the ribbon below the chip bar and
// enforced by the `useAccess` mobile cap plus `ReadOnlyRegion`.
// =====================================================================

export interface MobileNavSub { key: string; label: string }
export interface MobileNavSection {
  key: string;
  label: string;
  Icon: React.ComponentType<{ className?: string }>;
  subItems: MobileNavSub[];
}

interface Props {
  nav: MobileNavSection[];
  /** Open a search result: the same routine the desktop shell uses. */
  onSearch: (target: SearchTarget) => void;
  activeSectionKey: string | null;
  activeSubKey: string | null;
  onNavigate: (sectionKey: string, subKey: string | null) => void;
  roleLabel: string;
  email: string;
  onWebsite: () => void;
  onSignOut: () => void;
  children: ReactNode;
}

export default function MobileWorkspaceShell({
  nav, activeSectionKey, activeSubKey, onNavigate, onSearch, roleLabel, email, onWebsite, onSignOut, children,
}: Props) {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(activeSectionKey);
  // The read-only ribbon states a fact once. Keeping it on screen for the
  // rest of the session costs a line of height on every scroll of every
  // read-only page, so it can be dismissed for the session. It returns on
  // the next sign-in, which is the right cadence for something a member
  // needs to be told but not reminded of.
  const [ribbonDismissed, setRibbonDismissed] = useState(false);

  const activeSection = nav.find((s) => s.key === activeSectionKey) ?? null;
  const activeSub = activeSection?.subItems.find((si) => si.key === activeSubKey) ?? null;
  const currentPageKey = activeSubKey ?? activeSectionKey ?? '';

  // Keep the drawer accordion in step with the active section.
  useEffect(() => { if (drawerOpen) setExpanded(activeSectionKey); }, [drawerOpen, activeSectionKey]);

  const go = (sectionKey: string, sub: MobileNavSub | null) => {
    onNavigate(sectionKey, sub ? sub.key : null);
    setDrawerOpen(false);
  };

  // Scroll the content back to the top when the page changes.
  useEffect(() => {
    document.getElementById('mobile-ws-content')?.scrollTo({ top: 0 });
  }, [currentPageKey]);

  const title = useMemo(() => {
    if (activeSub) return activeSub.label;
    if (activeSection) return activeSection.label;
    return 'Minerva Workspace';
  }, [activeSection, activeSub]);

  return (
    // The shell is FIXED to the viewport: the document itself can never
    // scroll, so the header physically cannot be moved off screen (previously
    // the browser's own page scroll / rubber-banding could push it away).
    // Only the content pane below scrolls. The top strip extends its accent
    // colour into the iOS status-bar safe area.
    <div
      className="fixed inset-0 z-[40] flex flex-col bg-background overflow-hidden"
      style={{ height: '100dvh', paddingTop: 'env(safe-area-inset-top)' }}
    >
      {/* Paint the status-bar safe area with the same accent as the header. */}
      <div aria-hidden className="absolute top-0 left-0 right-0 bg-accent" style={{ height: 'env(safe-area-inset-top)' }} />
      {/* Top strip: compact counterpart of the desktop role/email bar. */}
      <header className="shrink-0 h-14 flex items-center gap-2 px-2 bg-accent text-accent-foreground">
        <button
          type="button"
          onClick={() => setDrawerOpen(true)}
          aria-label="Open navigation"
          className="h-11 w-11 flex items-center justify-center shrink-0"
        >
          <Menu className="h-6 w-6" />
        </button>
        <div className="min-w-0 flex-1">
          <div className="font-serif text-lg leading-tight truncate">{title}</div>
          {activeSection && activeSub && (
            <div className="text-[11px] text-accent-foreground/70 leading-tight truncate">{activeSection.label}</div>
          )}
        </div>
        <WorkspaceSearch onNavigate={onSearch} variant="icon" className="text-accent-foreground/90" />
        <button type="button" onClick={onWebsite} aria-label="Return to website" title="Return to Website"
          className="h-11 w-11 flex items-center justify-center shrink-0 text-accent-foreground/90">
          <Globe className="h-5 w-5" />
        </button>
        <button type="button" onClick={onSignOut} aria-label="Log out" title="Log Out"
          className="h-11 w-11 flex items-center justify-center shrink-0 text-accent-foreground/90">
          <LogOut className="h-5 w-5" />
        </button>
      </header>

      {/* Subsection bar: horizontally scrollable chips for the open section. */}
      {activeSection && activeSection.subItems.length > 0 && (
        <nav className="shrink-0 border-b border-separator bg-muted/30 overflow-x-auto">
          <div className="flex gap-2 px-3 py-2 w-max">
            {activeSection.subItems.map((si) => {
              const isActive = si.key === activeSubKey;
              return (
                <button
                  key={si.key}
                  type="button"
                  onClick={() => go(activeSection.key, si)}
                  className={`inline-flex items-center gap-1.5 whitespace-nowrap px-3 h-9 border font-body text-sm transition-colors ${
                    isActive
                      ? 'bg-accent text-accent-foreground border-accent'
                      : 'bg-background text-accent border-accent/40'
                  }`}
                >
                  {si.label}
                </button>
              );
            })}
          </div>
        </nav>
      )}

      {/* Read-only ribbon. Every page is read-only here, so the notice is
          the same on all of them; it is dismissible for the session. */}
      {!ribbonDismissed && (
        <div className="shrink-0 flex items-center gap-2 px-4 py-1.5 bg-muted/60 border-b border-separator font-body text-xs text-muted-foreground">
          <Eye className="h-3.5 w-3.5 shrink-0" />
          <span className="flex-1 min-w-0 truncate">Read-only on mobile. Editing is available on desktop.</span>
          <button
            type="button"
            onClick={() => setRibbonDismissed(true)}
            aria-label="Dismiss the read-only notice"
            className="shrink-0 -mr-2 h-7 w-7 flex items-center justify-center text-muted-foreground"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {/* Content slot. Overscroll is contained so a bounce at the edges can
          never chain to the document and drag the fixed header around.

          IT SCROLLS SIDEWAYS TOO, now that every page opens here. Most of
          the workspace's wide tables carry their own `overflow-x-auto`
          wrapper and never reach this, but the pages that were previously
          desktop-only were written without a phone in mind, and a column
          that cannot be reached is the same as a column that was withheld.
          The pane is a sibling of the header, so a sideways drag can move
          the content and nothing else. */}
      <main
        id="mobile-ws-content"
        data-ws-pane
        className="flex-1 min-h-0 overflow-y-auto overflow-x-auto px-4 py-4 relative"
        style={{ overscrollBehavior: 'contain', paddingBottom: 'calc(1rem + env(safe-area-inset-bottom))' }}
      >
        <HelpProvider>
          {children}
          <PageHelpButton page={currentPageKey} />
        </HelpProvider>
      </main>

      {/* Navigation drawer (left). */}
      <div
        className={`fixed inset-0 z-[80] bg-foreground/40 transition-opacity duration-200 ${drawerOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
        onClick={() => setDrawerOpen(false)}
        aria-hidden
      />
      <aside
        className={`fixed inset-y-0 left-0 z-[90] w-[300px] max-w-[85vw] bg-accent text-accent-foreground flex flex-col transition-transform duration-200 ease-out ${drawerOpen ? 'translate-x-0' : '-translate-x-full'}`}
        style={{ paddingTop: 'env(safe-area-inset-top)', paddingBottom: 'env(safe-area-inset-bottom)' }}
        aria-hidden={!drawerOpen}
      >
        {/* Drawer header: identity (role + email) plus close. */}
        <div className="shrink-0 px-4 pt-4 pb-3 border-b border-accent-foreground/15">
          <div className="flex items-start justify-between gap-3">
            <img src={logoWhite} alt="Minerva" className="h-11 w-11" />
            <button type="button" onClick={() => setDrawerOpen(false)} aria-label="Close navigation" className="h-10 w-10 -mr-2 flex items-center justify-center text-accent-foreground/80">
              <X className="h-5 w-5" />
            </button>
          </div>
          <div className="mt-2 font-serif italic text-xl leading-tight">{roleLabel}</div>
          <div className="font-body text-xs text-accent-foreground/70 truncate">{email}</div>
        </div>

        {/* Sections with accordion subsections. */}
        <nav className="flex-1 overflow-y-auto py-2">
          {nav.map((section) => {
            const hasSubs = section.subItems.length > 0;
            const isOpen = expanded === section.key;
            const isActive = section.key === activeSectionKey;
            return (
              <div key={section.key}>
                <button
                  type="button"
                  onClick={() => (hasSubs ? setExpanded(isOpen ? null : section.key) : go(section.key, null))}
                  className={`w-full flex items-center gap-3 px-4 h-12 text-left font-serif tracking-wide transition-colors ${isActive ? 'bg-background/15' : 'active:bg-background/10'}`}
                >
                  <section.Icon className="h-5 w-5 shrink-0" />
                  <span className="text-base flex-1 truncate">{section.label}</span>
                  {hasSubs && (isOpen ? <ChevronDown className="h-4 w-4 opacity-70" /> : <ChevronRight className="h-4 w-4 opacity-70" />)}
                </button>
                {hasSubs && isOpen && (
                  <div className="pb-1">
                    {section.subItems.map((si) => {
                      const isSubActive = si.key === activeSubKey && section.key === activeSectionKey;
                      return (
                        <button
                          key={si.key}
                          type="button"
                          onClick={() => go(section.key, si)}
                          className={`w-full flex items-center gap-2 pl-12 pr-4 h-10 text-left font-body text-sm transition-colors ${
                            isSubActive ? 'bg-background/20 text-accent-foreground' : 'text-accent-foreground/85 active:bg-background/10'
                          }`}
                        >
                          <span className="flex-1 truncate">{si.label}</span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </nav>

        <div className="shrink-0 px-4 py-3 border-t border-accent-foreground/15 font-body text-[11px] text-accent-foreground/60">
          Every page your role can open is available here, to read. Editing is done on a desktop computer.
        </div>
      </aside>
    </div>
  );
}
