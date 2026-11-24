import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import {
  Menu, X, Globe, LogOut, ChevronDown, ChevronRight, BarChart3, CalendarCheck, User as UserIcon,
  ClipboardList, CalendarClock, Phone, FileSignature, HelpCircle,
} from 'lucide-react';
import { HelpProvider, PageHelpButton } from '@/components/admin/help/HelpSystem';
import WorkspaceSearch, { type SearchTarget } from '@/components/admin/WorkspaceSearch';
import logoWhite from '@/assets/logo-white.svg';
import { applicantBar, isBarItemActive, isProtectedPage, memberBar, type BarItem } from '@/lib/mobile-bar';
import TourHost from '@/components/admin/help/TourHost';

// =====================================================================
// Mobile workspace shell. Rendered below the desktop breakpoint INSTEAD
// of the desktop layout, which stays exactly as it is. It recomposes the
// structural pieces for a small screen:
//   - top strip  -> compact accent bar: the current place, and Back to
//                   website in the upper right (Step 106); an applicant,
//                   whose bottom bar has no Menu, also has menu and search
//   - section nav -> left drawer with accordion sections (role + email live
//                    in the drawer header; Sign out at its foot, where a
//                    stray tap cannot sign anybody out)
//   - subsection nav -> horizontally scrollable chip bar under the top bar,
//                    scrolled so the current page's chip is always in view
//   - bottom bar (Step 98) -> the places used most, within thumb reach;
//                    see lib/mobile-bar.ts for what each reader is given
//   - help panel -> full-screen sheet (handled responsively in HelpSystem)
//
// THE DASHBOARD AND THE CALENDAR ARE LEFT AS THEY ARE. The spacing kept
// clear for the help button and the larger touch areas of Step 98 apply
// to every other page, never to those two (`isProtectedPage`).
//
// EVERY SUBSECTION THE ROLE MAY OPEN, OPENS HERE. The shell withholds
// nothing of its own: what is listed is what `filterNav` allowed, which
// is the same navigation the desktop draws. Editing on a phone is opened
// page by page as each page is made to work there (Step 98); on a page not
// yet opened the `useAccess` mobile cap plus `ReadOnlyRegion` hold back
// what changes things. See lib/mobile-policy.ts. (The ribbon that also
// said so was removed in Step 106: only the Dashboard and the Calendar
// still carried it, and they are read on a phone, not edited.)
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
  /** An applicant's workspace: their own bottom bar, and menu and search at the top. */
  applicant?: boolean;
  children: ReactNode;
}

/** The icon of each button of the bottom bar. */
const BAR_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  menu: Menu,
  dashboard: BarChart3,
  'events-mine': CalendarCheck,
  'my-role': UserIcon,
  'applications-status': ClipboardList,
  'applications-interview': CalendarClock,
  'applications-call': Phone,
  'applications-offer': FileSignature,
  'applications-faqs': HelpCircle,
};

export default function MobileWorkspaceShell({
  nav, activeSectionKey, activeSubKey, onNavigate, onSearch, roleLabel, email, onWebsite, onSignOut, applicant = false, children,
}: Props) {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(activeSectionKey);
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

  // The bottom bar, built from the same navigation the menu shows.
  const bar = useMemo<BarItem[]>(() => (applicant ? applicantBar(nav) : memberBar(nav)), [applicant, nav]);
  // The Dashboard and the Calendar keep their own layout (see the header).
  const protectedPage = isProtectedPage(activeSectionKey);

  // The current page's chip is scrolled into view: a chip row that opens
  // on its first chips can hide the page being read past the edge.
  const activeChipRef = useRef<HTMLButtonElement | null>(null);
  useEffect(() => {
    activeChipRef.current?.scrollIntoView({ block: 'nearest', inline: 'center' });
  }, [activeSectionKey, activeSubKey]);

  // Notifications sit above the bottom bar rather than over it (Step 106):
  // index.css lifts them while this flag is on <html>.
  useEffect(() => {
    if (!bar.length) return undefined;
    const root = document.documentElement;
    root.setAttribute('data-ws-dock', '');
    return () => root.removeAttribute('data-ws-dock');
  }, [bar.length]);

  const barButton = 'flex-1 min-w-0 h-full flex flex-col items-center justify-center gap-0.5 font-body text-[11px] leading-tight border-t-2 transition-colors';

  return (
    // The shell is FIXED to the viewport: the document itself can never
    // scroll, so the header physically cannot be moved off screen (previously
    // the browser's own page scroll / rubber-banding could push it away).
    // Only the content pane below scrolls. The top strip extends its accent
    // colour into the iOS status-bar safe area. `--ws-bar-h` lifts the help
    // button above the bottom bar.
    <div
      className="fixed inset-0 z-[40] flex flex-col bg-background overflow-hidden"
      style={{
        height: '100dvh', paddingTop: 'env(safe-area-inset-top)',
        // The floating dock (Step 107): 3.5rem high, 0.5rem above the home
        // bar. --ws-bar-h lifts the help button over it; --ws-dock-space is
        // the room a page leaves at its foot so its end scrolls clear of it.
        ['--ws-bar-h' as string]: bar.length ? '4rem' : '0rem',
        ['--ws-dock-space' as string]: bar.length ? 'calc(4rem + env(safe-area-inset-bottom))' : '0px',
      }}
    >
      {/* The guided tours (Step 106): started from How To Use or the help. */}
      <TourHost />
      {/* Paint the status-bar safe area with the same accent as the header. */}
      <div aria-hidden className="absolute top-0 left-0 right-0 bg-accent" style={{ height: 'env(safe-area-inset-top)' }} />
      {/* Top strip: the current place. A member's Menu and Search are in the
          bottom bar; an applicant's bar has neither, so they stay up here. */}
      <header className={`shrink-0 h-14 flex items-center gap-2 bg-accent text-accent-foreground ${applicant ? 'px-2' : 'px-4'}`}>
        {applicant && (
          <button
            type="button"
            onClick={() => setDrawerOpen(true)}
            aria-label="Open navigation"
            className="h-11 w-11 flex items-center justify-center shrink-0"
          >
            <Menu className="h-6 w-6" />
          </button>
        )}
        <div data-tour="place" className="min-w-0 flex-1">
          <div className="font-serif text-lg leading-tight truncate">{title}</div>
          {activeSection && activeSub && (
            <div className="text-xs text-accent-foreground/70 leading-tight truncate">{activeSection.label}</div>
          )}
        </div>
        {applicant && <WorkspaceSearch onNavigate={onSearch} variant="icon" className="text-accent-foreground/90" />}
        {/* BACK TO WEBSITE, IN THE UPPER RIGHT (Step 106): where a phone
            reader looks to leave, and away from the bottom bar, so a thumb
            on its way to Search cannot take anybody out of the workspace.
            Sign out stays at the foot of the Menu. Since Step 107 it is the
            globe alone for everybody, with no frame and no word, as the
            other icons of the bar are; its name is still read aloud. */}
        <button
          type="button"
          data-tour="leave"
          onClick={onWebsite}
          aria-label="Back to website"
          title="Back to website"
          className="shrink-0 h-11 w-11 -mr-2 flex items-center justify-center text-accent-foreground/90 hover:text-accent-foreground"
        >
          <Globe className="h-5 w-5 shrink-0" aria-hidden="true" />
        </button>
      </header>

      {/* Subsection bar: horizontally scrollable chips for the open section. */}
      {activeSection && activeSection.subItems.length > 0 && (
        <nav data-tour="subnav" className="shrink-0 border-b border-separator bg-muted/30 overflow-x-auto" aria-label={`${activeSection.label} pages`}>
          <div className="flex gap-2 px-3 py-1.5 w-max">
            {activeSection.subItems.map((si) => {
              const isActive = si.key === activeSubKey;
              return (
                <button
                  key={si.key}
                  ref={isActive ? activeChipRef : undefined}
                  data-tour={`page-${si.key}`}
                  type="button"
                  aria-current={isActive ? 'page' : undefined}
                  onClick={() => go(activeSection.key, si)}
                  className={`inline-flex items-center gap-1.5 whitespace-nowrap px-3 h-11 border font-body text-sm transition-colors ${
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

      {/* NO READ-ONLY RIBBON (Step 106). Every page but the Dashboard and the
          Calendar now works in full on a phone, and those two are read on a
          phone rather than used, so a line saying "editing is available on
          desktop" told the reader nothing they needed and cost a line of
          height on the two pages read most. What a role may change is still
          decided by the access matrix and the phone policy, exactly as before. */}

      {/* Content slot. Overscroll is contained so a bounce at the edges can
          never chain to the document and drag the fixed header around.

          IT SCROLLS SIDEWAYS TOO, now that every page opens here. Most of
          the workspace's wide tables carry their own `overflow-x-auto`
          wrapper and never reach this, but the pages that were previously
          desktop-only were written without a phone in mind, and a column
          that cannot be reached is the same as a column that was withheld.
          The pane is a sibling of the header, so a sideways drag can move
          the content and nothing else. */}
      {/* `ws-touch` and `ws-fab-clear` (index.css) give every page but the
          Dashboard and the Calendar touch areas of at least 44 px for its
          small controls, and room at the end so nothing stays under the
          help button. The bottom bar holds the home-bar safe area, so the
          pane needs it only when there is no bar. */}
      <main
        id="mobile-ws-content"
        data-ws-pane
        className={`flex-1 min-h-0 overflow-y-auto overflow-x-auto px-4 py-4 relative ${protectedPage ? '' : 'ws-touch ws-fab-clear'}`}
        style={{ overscrollBehavior: 'contain', ...(protectedPage ? { paddingBottom: bar.length ? 'calc(1rem + var(--ws-dock-space))' : 'calc(1rem + env(safe-area-inset-bottom))' } : {}) }}
      >
        <HelpProvider>
          {children}
          <PageHelpButton page={currentPageKey} />
        </HelpProvider>
      </main>

      {/* Bottom bar: the places used most, within thumb reach. Since Step
          107 a FLOATING DOCK: square as the design system is, on a hairline,
          inset from the edges and lifted off the page by a soft shadow
          (.ws-dock), 3.5rem high, with the page running on underneath it. The
          page being read is marked by a 2 px accent rule, as the design
          system marks a selected row. */}
      {bar.length > 0 && (
        <nav
          aria-label="Main places"
          data-tour="bar"
          className="ws-dock absolute inset-x-2 z-10 flex items-stretch"
          style={{ height: '3.5rem', bottom: 'calc(env(safe-area-inset-bottom) + 0.5rem)' }}
        >
          {bar.map((item) => {
            if (item.kind === 'search') {
              return (
                <WorkspaceSearch
                  key={item.id}
                  onNavigate={onSearch}
                  variant="tab"
                  className={`${barButton} border-transparent text-muted-foreground`}
                />
              );
            }
            const Icon = BAR_ICONS[item.id] ?? Menu;
            if (item.kind === 'menu') {
              return (
                <button key={item.id} type="button" data-tour="bar-menu" onClick={() => setDrawerOpen(true)} aria-label="Open navigation"
                  className={`${barButton} border-transparent text-muted-foreground`}>
                  <Icon className="h-5 w-5" aria-hidden="true" />
                  <span>{item.label}</span>
                </button>
              );
            }
            const active = isBarItemActive(item, activeSectionKey, activeSubKey);
            return (
              <button
                key={item.id}
                type="button"
                aria-current={active ? 'page' : undefined}
                onClick={() => onNavigate(item.sectionKey, item.subKey)}
                className={`${barButton} ${active ? 'border-accent text-accent' : 'border-transparent text-muted-foreground'}`}
              >
                <Icon className="h-5 w-5" aria-hidden="true" />
                <span className="max-w-full truncate px-1">{item.label}</span>
              </button>
            );
          })}
        </nav>
      )}

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

        {/* Signing out, kept apart from the pages so that a stray tap on the
            way to search can never sign anybody out. Back to website is in
            the upper right of the header (Step 106). */}
        <div className="shrink-0 border-t border-accent-foreground/15 py-1">
          <button type="button" onClick={() => { setDrawerOpen(false); onSignOut(); }}
            className="w-full flex items-center gap-3 px-4 h-12 text-left font-body text-sm text-accent-foreground/90 active:bg-background/10">
            <LogOut className="h-5 w-5 shrink-0" aria-hidden="true" />Sign out
          </button>
        </div>
      </aside>
    </div>
  );
}
