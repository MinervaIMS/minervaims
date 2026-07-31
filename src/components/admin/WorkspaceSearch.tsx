import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Search, CornerDownLeft, ArrowUp, ArrowDown, X, FileText, HelpCircle } from 'lucide-react';
import { useAccess } from '@/hooks/useAccess';
import { GUIDE, type GuideEntry } from '@/lib/workspace-guide';

// =====================================================================
// WorkspaceSearch — one place to reach anything you are allowed to reach.
// ---------------------------------------------------------------------
// The workspace has grown to some forty subsections across ten sections,
// and the fastest route to most of them was becoming "remember which
// section it lives under". This is the answer to that: type two or three
// letters and press Enter.
//
// It searches TWO kinds of thing, both drawn from the same guide the help
// panel and the manual are generated from, so the index can never drift
// from the workspace itself:
//
//   * subsections    - "alumni", "fees", "interview"
//   * help topics    - "how do I lock a question", "exam session"
//
// AUTHORISATION IS PART OF THE INDEX, not a filter applied afterwards.
// The list is built from `access.canView`, so a role simply has no entry
// for a page it cannot open: nothing to find, nothing to leak, and the
// result count already reflects what that person can do.
//
// The whole index is a few hundred short strings, built once per role and
// scored on every keystroke, so it answers within a frame with no network
// round trip. Ranking is deliberate rather than fuzzy: an exact label beats
// a label prefix, which beats a label substring, which beats a match in the
// body text. Fuzzy matching sounds cleverer and reads as noise.
//
// FOUR FAULTS THE FIRST VERSION HAD, all fixed here and all worth naming
// because none of them is visible in the markup on its own:
//
//  1. COLOUR WAS INHERITED. On a phone the trigger lives inside the purple
//     header, which paints its whole subtree white, and the palette is a
//     child of that trigger in the React tree. The typed text was white on
//     white. Every surface in the palette now states its own colour.
//
//  2. THE ARROW KEYS SCROLLED THE PAGE. Keeping the active row in view
//     used `scrollIntoView`, which walks EVERY scrollable ancestor, so the
//     workspace behind the modal scrolled with each press. The list now
//     scrolls itself, arithmetically, and the page behind is locked while
//     the palette is open.
//
//  3. ROWS WERE UNEVEN. A row was as tall as its explanatory line wrapped,
//     so the entries with the longest purpose (which is where the pages
//     sit) stood far apart from the rest. Every row is now exactly two
//     lines, the second one truncated, so the list has one rhythm.
//
//  4. IT OPENED THE HELP PANEL BY ITSELF. Choosing a result now opens the
//     subsection and nothing else.
// =====================================================================

export interface SearchTarget {
  /** Subsection to open. */
  key: string;
  /** Help topic the hit came from, for callers that want it. */
  topicId?: string;
}

interface Indexed {
  id: string;
  kind: 'page' | 'topic';
  /** What the row shows. */
  label: string;
  /** Section, or the owning page for a topic. */
  context: string;
  /** One line of explanation. */
  detail: string;
  target: SearchTarget;
  /** Lower-case haystack for body matches. */
  haystack: string;
  /** Lower-case label, matched first. */
  needleLabel: string;
  canManage: boolean;
}

function buildIndex(entries: GuideEntry[], canManage: (k: string) => boolean): Indexed[] {
  const out: Indexed[] = [];
  for (const g of entries) {
    const manage = canManage(g.key);
    out.push({
      id: `page:${g.key}`,
      kind: 'page',
      label: g.label,
      context: g.section,
      detail: g.purpose,
      target: { key: g.key },
      needleLabel: g.label.toLowerCase(),
      haystack: [
        g.label, g.section, g.purpose,
        ...(g.view ?? []), ...(g.manage ?? []), ...(g.warnings ?? []),
        ...(g.topics ?? []).map((t) => t.title),
      ].join(' ').toLowerCase(),
      canManage: manage,
    });

    for (const topic of g.topics ?? []) {
      out.push({
        id: `topic:${g.key}:${topic.id}`,
        kind: 'topic',
        label: topic.title,
        context: `${g.section} / ${g.label}`,
        detail: topic.body,
        target: { key: g.key, topicId: topic.id },
        needleLabel: topic.title.toLowerCase(),
        haystack: `${topic.title} ${topic.body} ${g.label} ${g.section}`.toLowerCase(),
        canManage: manage,
      });
    }
  }
  return out;
}

/** Higher is better. Zero means "not a match". */
function score(item: Indexed, q: string): number {
  const label = item.needleLabel;
  if (label === q) return 1000;
  if (label.startsWith(q)) return 800 - label.length;
  // A match at a word boundary reads as intentional; mid-word does not.
  if (new RegExp(`\\b${q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`).test(label)) return 600 - label.length;
  if (label.includes(q)) return 400 - label.length;
  const at = item.haystack.indexOf(q);
  if (at >= 0) return 200 - Math.min(at, 190);
  return 0;
}

/** The matched run, picked out of an otherwise plain string. */
function Highlight({ text, q }: { text: string; q: string }) {
  if (!q) return <>{text}</>;
  const at = text.toLowerCase().indexOf(q);
  if (at < 0) return <>{text}</>;
  return (
    <>
      {text.slice(0, at)}
      <mark className="bg-transparent text-accent">{text.slice(at, at + q.length)}</mark>
      {text.slice(at + q.length)}
    </>
  );
}

interface Props {
  /** Open the subsection the result belongs to. */
  onNavigate: (target: SearchTarget) => void;
  /** Compact trigger for the mobile header. */
  variant?: 'bar' | 'icon';
  className?: string;
}

export function WorkspaceSearch({ onNavigate, variant = 'bar', className = '' }: Props) {
  const access = useAccess();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [cursor, setCursor] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);

  const index = useMemo(
    () => buildIndex(GUIDE.filter((g) => access.canView(g.key)), (k) => access.canManage(k)),
    [access],
  );

  const q = query.trim().toLowerCase();

  const results = useMemo(() => {
    if (!q) {
      // An empty box is still useful: offer the pages, in workspace order.
      return index.filter((i) => i.kind === 'page').slice(0, 5);
    }
    return index
      .map((item) => ({ item, s: score(item, q) }))
      .filter((r) => r.s > 0)
      .sort((a, b) => b.s - a.s || a.item.label.length - b.item.label.length)
      .slice(0, 5)
      .map((r) => r.item);
  }, [index, q]);

  useEffect(() => { setCursor(0); }, [q]);

  // Ctrl/Cmd+K from anywhere in the workspace, and "/" when not typing.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const typing = (e.target as HTMLElement | null)?.closest('input, textarea, select, [contenteditable="true"]');
      if ((e.key === 'k' || e.key === 'K') && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen(true);
      } else if (e.key === '/' && !typing && !e.metaKey && !e.ctrlKey && !e.altKey) {
        e.preventDefault();
        setOpen(true);
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, []);

  useEffect(() => {
    if (!open) return;
    setQuery('');
    setCursor(0);
    // Nothing behind the palette may move while it is open. This is half of
    // the "the arrows scroll the page" fault: even with the list scrolling
    // itself, a trackpad or a stray key would still drag the workspace
    // about underneath the overlay.
    const body = document.body;
    const previousOverflow = body.style.overflow;
    body.style.overflow = 'hidden';
    // Focus after the dialog has painted, or the caret lands nowhere.
    const id = window.setTimeout(() => inputRef.current?.focus(), 30);
    return () => {
      window.clearTimeout(id);
      body.style.overflow = previousOverflow;
    };
  }, [open]);

  // The other half of "nothing behind this moves". The overlay is a child
  // of the workspace in the DOM, so a wheel over it would otherwise scroll
  // the panel underneath, which locking the document alone does not catch.
  // The results list is the one thing allowed to scroll.
  useEffect(() => {
    if (!open) return;
    const el = overlayRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      if (listRef.current?.contains(e.target as Node)) return;
      e.preventDefault();
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, [open]);

  // Keep the highlighted row in view WITHOUT touching any other scroller.
  // `scrollIntoView` walks every scrollable ancestor, which is what made
  // arrowing through the results scroll the workspace behind the overlay.
  useEffect(() => {
    const list = listRef.current;
    if (!list) return;
    const row = list.querySelector<HTMLElement>('[data-active="true"]');
    if (!row) return;
    const top = row.offsetTop;
    const bottom = top + row.offsetHeight;
    if (top < list.scrollTop) list.scrollTop = top;
    else if (bottom > list.scrollTop + list.clientHeight) list.scrollTop = bottom - list.clientHeight;
  }, [cursor, results]);

  const choose = useCallback((item: Indexed | undefined) => {
    if (!item) return;
    setOpen(false);
    onNavigate(item.target);
  }, [onNavigate]);

  // Bound to the dialog rather than to the input, so the keys keep working
  // if focus lands on a row (a tap on a phone) or on the close button.
  const onDialogKeyDown = (e: React.KeyboardEvent) => {
    const last = results.length - 1;
    if (e.key === 'ArrowDown') { e.preventDefault(); setCursor((c) => (c >= last ? 0 : c + 1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setCursor((c) => (c <= 0 ? last : c - 1)); }
    else if (e.key === 'Home') { e.preventDefault(); setCursor(0); }
    else if (e.key === 'End') { e.preventDefault(); setCursor(Math.max(0, last)); }
    else if (e.key === 'PageDown') { e.preventDefault(); setCursor((c) => Math.min(last, c + 5)); }
    else if (e.key === 'PageUp') { e.preventDefault(); setCursor((c) => Math.max(0, c - 5)); }
    else if (e.key === 'Enter') { e.preventDefault(); choose(results[cursor]); }
    else if (e.key === 'Escape') { e.preventDefault(); setOpen(false); }
    else return;
    // Anything handled here must never reach the page underneath.
    e.stopPropagation();
  };

  const trigger = variant === 'icon' ? (
    <button
      type="button"
      onClick={() => setOpen(true)}
      aria-label="Search the workspace"
      className={`h-11 w-11 flex items-center justify-center shrink-0 ${className}`}
    >
      <Search className="h-5 w-5" />
    </button>
  ) : (
    <button
      type="button"
      onClick={() => setOpen(true)}
      className={`group flex items-center gap-2 h-10 px-3 min-w-[15rem] border border-separator bg-background text-left transition-colors hover:border-accent ${className}`}
    >
      <Search className="h-4 w-4 text-muted-foreground group-hover:text-accent shrink-0" />
      <span className="font-body text-sm text-muted-foreground flex-1">Search the workspace</span>
      <kbd className="font-body text-[11px] text-muted-foreground border border-separator px-1.5 py-0.5 leading-none">
        Ctrl K
      </kbd>
    </button>
  );

  return (
    <>
      {trigger}

      {open && (
        <div
          ref={overlayRef}
          className="fixed inset-0 z-[100] flex items-start justify-center px-3 pt-[max(env(safe-area-inset-top),1rem)] sm:px-4 sm:pt-[11vh] [touch-action:none]"
          role="dialog"
          aria-modal="true"
          aria-label="Search the workspace"
          onKeyDown={onDialogKeyDown}
          onMouseDown={(e) => { if (e.target === e.currentTarget) setOpen(false); }}
        >
          <div className="absolute inset-0 bg-foreground/45 backdrop-blur-[2px]" aria-hidden="true" />

          {/* text-foreground is not decoration. On a phone this palette is a
              child of the trigger inside the purple header, which paints its
              subtree white, and every word in here was white on white. */}
          <div className="relative w-full max-w-xl flex flex-col max-h-[calc(100dvh-2rem)] sm:max-h-[70vh] bg-background text-foreground border border-separator shadow-[0_28px_70px_-24px_hsl(var(--overlay)/0.45)]">
            <div className="flex items-center gap-3 px-4 h-14 border-b border-separator shrink-0">
              <Search className="h-4 w-4 text-accent shrink-0" />
              <input
                ref={inputRef}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search subsections and help topics"
                aria-label="Search subsections and help topics"
                aria-autocomplete="list"
                aria-controls="workspace-search-results"
                aria-activedescendant={results[cursor] ? `wsr-${results[cursor].id}` : undefined}
                autoComplete="off"
                autoCorrect="off"
                autoCapitalize="none"
                spellCheck={false}
                /* text-base is 16px, which is also what stops iOS zooming
                   the whole workspace in when the caret lands here. */
                className="flex-1 min-w-0 bg-transparent border-0 outline-none font-body text-base text-foreground caret-accent placeholder:text-muted-foreground"
              />
              {query && (
                <button
                  type="button"
                  onClick={() => { setQuery(''); inputRef.current?.focus(); }}
                  aria-label="Clear the search"
                  className="font-body text-[11px] uppercase tracking-wider text-muted-foreground hover:text-accent shrink-0"
                >
                  Clear
                </button>
              )}
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Close search"
                className="h-8 w-8 -mr-2 flex items-center justify-center text-muted-foreground hover:text-accent shrink-0"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {results.length === 0 ? (
              <div className="px-4 py-10 text-center font-body">
                <p className="text-muted-foreground">Nothing matches that.</p>
                <p className="text-xs text-muted-foreground/80 mt-1">
                  Only the pages your role can open are searched.
                </p>
              </div>
            ) : (
              <>
                <p className="px-4 pt-3 pb-1 font-body text-[10px] uppercase tracking-[0.14em] text-muted-foreground/80 shrink-0">
                  {q ? 'Results' : '\n'}
                </p>
                <ul
                  ref={listRef}
                  id="workspace-search-results"
                  className="flex-1 min-h-0 overflow-hidden pb-1"
                  role="listbox"
                >
                  {results.map((item, i) => {
                    const active = i === cursor;
                    return (
                      <li
                        key={item.id}
                        id={`wsr-${item.id}`}
                        role="option"
                        aria-selected={active}
                        data-active={active}
                      >
                        <button
                          type="button"
                          tabIndex={-1}
                          onMouseEnter={() => setCursor(i)}
                          onClick={() => choose(item)}
                          /* Exactly two lines, always. A row that grew with
                             its own explanation is what set the first few
                             results apart from the rest of the list. */
                          className={`w-full text-left flex items-start gap-3 px-4 py-2.5 h-[3.75rem] font-body border-l-2 transition-colors ${
                            active ? 'border-l-accent bg-accent/[0.07]' : 'border-l-transparent hover:bg-muted/40'
                          }`}
                        >
                          <span className={`mt-[3px] shrink-0 ${active ? 'text-accent' : 'text-muted-foreground'}`}>
                            {item.kind === 'topic'
                              ? <HelpCircle className="h-4 w-4" />
                              : <FileText className="h-4 w-4" />}
                          </span>
                          <span className="flex-1 min-w-0">
                            <span className="flex items-baseline gap-2">
                              <span className="min-w-0 text-sm text-foreground truncate">
                                <Highlight text={item.label} q={q} />
                              </span>
                              <span className="shrink-0 text-[10px] uppercase tracking-wider text-muted-foreground/80">
                                {item.kind === 'topic' ? 'Help' : item.canManage ? 'Manage' : 'View'}
                              </span>
                            </span>
                            <span className="block text-xs text-muted-foreground truncate">
                              <span className="text-muted-foreground/90">{item.context}</span>
                              <span className="text-muted-foreground/50"> · </span>
                              <span className="text-muted-foreground/60">{item.detail}</span>
                            </span>
                          </span>
                          <CornerDownLeft
                            className={`h-3.5 w-3.5 shrink-0 mt-[3px] text-accent transition-opacity ${active ? 'opacity-100' : 'opacity-0'}`}
                            aria-hidden="true"
                          />
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </>
            )}

            <div className="flex items-center gap-4 px-4 h-10 border-t border-separator font-body text-[11px] text-muted-foreground shrink-0">
              <span className="hidden sm:inline-flex items-center gap-1"><ArrowUp className="h-3 w-3" /><ArrowDown className="h-3 w-3" />move</span>
              <span className="hidden sm:inline-flex items-center gap-1"><CornerDownLeft className="h-3 w-3" />open</span>
              <span className="hidden sm:inline">esc to close</span>
              <span className="sm:ml-auto">{"\n"}</span>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default WorkspaceSearch;
