import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { Menu, X, Globe, LogOut, ChevronDown, ChevronRight, Monitor, Eye } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  AlertDialog, AlertDialogAction, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { HelpProvider, PageHelpButton } from '@/components/admin/help/HelpSystem';
import { mobilePolicyFor } from '@/lib/mobile-policy';
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
// Subsections marked 'no' in the mobile policy are visible but tapping
// them opens a card explaining they are available on desktop only.
// 'view' subsections carry a read-only ribbon; editing is withheld by the
// useAccess mobile cap plus per-page guards.
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
  nav, activeSectionKey, activeSubKey, onNavigate, roleLabel, email, onWebsite, onSignOut, children,
}: Props) {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(activeSectionKey);
  const [blocked, setBlocked] = useState<{ section: string; label: string } | null>(null);

  const activeSection = nav.find((s) => s.key === activeSectionKey) ?? null;
  const activeSub = activeSection?.subItems.find((si) => si.key === activeSubKey) ?? null;
  const currentPageKey = activeSubKey ?? activeSectionKey ?? '';
  const currentPolicy = mobilePolicyFor(currentPageKey);

  // Keep the drawer accordion in step with the active section.
  useEffect(() => { if (drawerOpen) setExpanded(activeSectionKey); }, [drawerOpen, activeSectionKey]);

  const go = (sectionKey: string, sub: MobileNavSub | null) => {
    const key = sub ? sub.key : sectionKey;
    const label = sub ? sub.label : (nav.find((s) => s.key === sectionKey)?.label ?? key);
    if (mobilePolicyFor(key) === 'no') {
      setBlocked({ section: label, label });
      return;
    }
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
    <div className="h-[100dvh] flex flex-col bg-background overflow-hidden">
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
              const p = mobilePolicyFor(si.key);
              const isActive = si.key === activeSubKey;
              return (
                <button
                  key={si.key}
                  type="button"
                  onClick={() => go(activeSection.key, si)}
                  className={`inline-flex items-center gap-1.5 whitespace-nowrap px-3 h-9 border font-body text-sm transition-colors ${
                    isActive
                      ? 'bg-accent text-accent-foreground border-accent'
                      : p === 'no'
                        ? 'bg-transparent text-muted-foreground border-separator'
                        : 'bg-background text-accent border-accent/40'
                  }`}
                >
                  {si.label}
                  {p === 'no' && <Monitor className="h-3.5 w-3.5 opacity-70" aria-label="Desktop only" />}
                </button>
              );
            })}
          </div>
        </nav>
      )}

      {/* Read-only ribbon for 'view' pages. */}
      {currentPolicy === 'view' && (
        <div className="shrink-0 flex items-center gap-2 px-4 py-1.5 bg-muted/60 border-b border-separator font-body text-xs text-muted-foreground">
          <Eye className="h-3.5 w-3.5 shrink-0" />
          Read-only on mobile. Editing is available on desktop.
        </div>
      )}

      {/* Content slot. */}
      <main id="mobile-ws-content" className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden px-4 py-4 relative">
        <HelpProvider>
          {currentPolicy === 'no' ? (
            <div className="h-full flex items-center justify-center">
              <div className="border border-separator bg-muted/30 px-6 py-8 text-center max-w-sm">
                <Monitor className="h-8 w-8 text-accent mx-auto mb-3" strokeWidth={1.5} />
                <div className="font-serif text-lg text-accent mb-1">Available on desktop</div>
                <p className="font-body text-sm text-muted-foreground">
                  This subsection can be used from a desktop computer or a tablet in landscape mode.
                </p>
              </div>
            </div>
          ) : (
            <>
              {children}
              <PageHelpButton page={currentPageKey} />
            </>
          )}
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
                      const p = mobilePolicyFor(si.key);
                      const isSubActive = si.key === activeSubKey && section.key === activeSectionKey;
                      return (
                        <button
                          key={si.key}
                          type="button"
                          onClick={() => go(section.key, si)}
                          className={`w-full flex items-center gap-2 pl-12 pr-4 h-10 text-left font-body text-sm transition-colors ${
                            isSubActive ? 'bg-background/20 text-accent-foreground' : p === 'no' ? 'text-accent-foreground/50' : 'text-accent-foreground/85 active:bg-background/10'
                          }`}
                        >
                          <span className="flex-1 truncate">{si.label}</span>
                          {p === 'no' && <Monitor className="h-3.5 w-3.5 opacity-70" aria-label="Desktop only" />}
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
          Subsections marked with the monitor icon are available on desktop only.
        </div>
      </aside>

      {/* Desktop-only popup for blocked subsections. */}
      <AlertDialog open={!!blocked} onOpenChange={(o) => { if (!o) setBlocked(null); }}>
        <AlertDialogContent className="max-w-[calc(100vw-2rem)] sm:max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle className="font-serif flex items-center gap-2">
              <Monitor className="h-5 w-5 text-accent" />
              {blocked?.label} is available on desktop
            </AlertDialogTitle>
            <AlertDialogDescription className="font-body">
              This subsection involves work that needs a full screen, so it is not offered on mobile.
              Open the Minerva Workspace from a desktop computer or a tablet in landscape mode to use it.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction asChild>
              <Button className="font-body w-full sm:w-auto">Understood</Button>
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
