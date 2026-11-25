import { useCallback, useDeferredValue, useEffect, useMemo, useRef, useState, type KeyboardEvent as ReactKeyboardEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { ArrowRight, BookOpen, CalendarDays, CornerDownLeft, FileText, Loader2, Search, User, X } from 'lucide-react';
import { eventTypeLabel } from '@/lib/events-api';
import { prefetchSearchSources, type Loaded } from './site-search-sources';
import { HIDEABLE_PAGES } from '@/lib/hideable-pages';
import { usePageVisibility } from '@/hooks/usePageVisibility';
import {
  buildIndex, groupHits, highlightRanges, KIND_LABELS, search, type SearchDoc, type SearchHit, type SearchKind,
} from '@/lib/site-search';
import { buildSiteDocs, SEARCH_START_PAGES } from '@/lib/site-search-data';

// =====================================================================
// THE WEBSITE'S SEARCH (Step 107).
// ---------------------------------------------------------------------
// Opened from the magnifier in the header (and with "/" or Ctrl K), on
// every public page. Loaded only when somebody reaches for it, so the
// first screen of every page costs exactly what it did.
//
// One field, results as you type, in groups (pages, people, reports,
// events, readings), the group with the best result first. The arrows
// move, Enter opens, Escape closes; on a phone it fills the screen and
// "Cancel" closes it. Before anything is typed it offers the main pages
// and the reader's last searches (kept in this browser only).
//
// What is searched, and what a result may say about a person, is
// lib/site-search-data.ts: an alumnus is found only through the reports
// that carry their name, never with an employer, a city or a profile.
// =====================================================================

const PER_GROUP = 5;
const RECENT_KEY = 'mims_site_search_recent';
const RECENT_MAX = 5;

const readRecent = (): string[] => {
  try {
    const v = JSON.parse(localStorage.getItem(RECENT_KEY) ?? '[]') as unknown;
    return Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string').slice(0, RECENT_MAX) : [];
  } catch { return []; }
};
const writeRecent = (list: string[]) => {
  try { localStorage.setItem(RECENT_KEY, JSON.stringify(list.slice(0, RECENT_MAX))); } catch { /* private mode */ }
};

// ---------------------------------------------------------------------
// A text with the words of the query marked.
// ---------------------------------------------------------------------
function Marked({ text, terms }: { text: string; terms: string[] }) {
  const ranges = highlightRanges(text, terms);
  if (!ranges.length) return <>{text}</>;
  const out: React.ReactNode[] = [];
  let at = 0;
  ranges.forEach(([a, b], i) => {
    if (a > at) out.push(text.slice(at, a));
    out.push(<mark key={i} className="bg-transparent font-medium text-accent">{text.slice(a, b)}</mark>);
    at = b;
  });
  if (at < text.length) out.push(text.slice(at));
  return <>{out}</>;
}

const KIND_ICON: Record<SearchKind, typeof FileText> = {
  page: ArrowRight, person: User, report: FileText, event: CalendarDays, reading: BookOpen,
};

interface Row { key: string; doc: SearchDoc; hit: SearchHit | null }

export default function SiteSearch({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const navigate = useNavigate();
  const { isHidden } = usePageVisibility();
  const [query, setQuery] = useState('');
  const deferred = useDeferredValue(query);
  const [loaded, setLoaded] = useState<Loaded | null>(null);
  const [failed, setFailed] = useState(false);
  const [cursor, setCursor] = useState(0);
  const [expanded, setExpanded] = useState<Set<SearchKind>>(new Set());
  const [recent, setRecent] = useState<string[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // Open: the reads (once per visit), a fresh field, the last searches.
  useEffect(() => {
    if (!open) return;
    setRecent(readRecent());
    setCursor(0);
    let live = true;
    prefetchSearchSources().then((r) => { if (live) { setLoaded(r.data); setFailed(r.failed); } });
    return () => { live = false; };
  }, [open]);

  const hidden = useMemo(() => new Set(HIDEABLE_PAGES.map((p) => p.key).filter((k) => isHidden(k))), [isHidden]);

  const index = useMemo(() => buildIndex(buildSiteDocs({
    reports: loaded?.reports ?? [], members: loaded?.members ?? [], events: loaded?.events ?? [], readings: loaded?.readings ?? [],
    hidden, eventType: eventTypeLabel,
  })), [loaded, hidden]);

  const results = useMemo(() => search(index, deferred), [index, deferred]);
  const groups = useMemo(() => groupHits(results.hits), [results]);
  useEffect(() => { setCursor(0); setExpanded(new Set()); }, [deferred]);

  // The rows the arrows move through, in the order they are drawn.
  const startDocs = useMemo(() => SEARCH_START_PAGES
    .map((p) => index.docs.find((d) => d.doc.href === p)?.doc)
    .filter((d): d is SearchDoc => !!d), [index]);
  const rows: Row[] = useMemo(() => {
    if (!deferred.trim()) return startDocs.map((doc) => ({ key: doc.id, doc, hit: null }));
    return groups.flatMap((g) => (expanded.has(g.kind) ? g.hits : g.hits.slice(0, PER_GROUP)).map((hit) => ({ key: hit.doc.id, doc: hit.doc, hit })));
  }, [deferred, groups, expanded, startDocs]);

  const remember = useCallback((q: string) => {
    const t = q.trim();
    if (t.length < 2) return;
    const next = [t, ...readRecent().filter((x) => x.toLowerCase() !== t.toLowerCase())].slice(0, RECENT_MAX);
    writeRecent(next);
  }, []);

  const go = useCallback((doc: SearchDoc) => {
    remember(query);
    onOpenChange(false);
    navigate(doc.href);
  }, [navigate, onOpenChange, query, remember]);

  // The active row stays in view by scrolling the list itself: never the
  // page behind it (the fault the workspace's search once had).
  useEffect(() => {
    const list = listRef.current;
    const el = list?.querySelector<HTMLElement>(`[data-row="${cursor}"]`);
    if (!list || !el) return;
    const top = el.offsetTop, bottom = top + el.offsetHeight;
    if (top < list.scrollTop + 8) list.scrollTop = Math.max(0, top - 40);
    else if (bottom > list.scrollTop + list.clientHeight - 8) list.scrollTop = bottom - list.clientHeight + 8;
  }, [cursor]);

  const onKeyDown = (e: ReactKeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setCursor((c) => (rows.length ? (c + 1) % rows.length : 0)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setCursor((c) => (rows.length ? (c - 1 + rows.length) % rows.length : 0)); }
    else if (e.key === 'Enter') {
      const row = rows[cursor];
      if (row) { e.preventDefault(); go(row.doc); }
    }
  };

  // The field the header focused in the tap (so that the phone's keyboard
  // came up at once) hands over its focus and anything already typed.
  const takeFocusFromProxy = useCallback(() => {
    const proxy = document.getElementById('site-search-proxy') as HTMLInputElement | null;
    const typedSoFar = proxy?.value ?? '';
    if (proxy) proxy.value = '';
    if (typedSoFar) setQuery((q) => q || typedSoFar);
    inputRef.current?.focus({ preventScroll: true });
  }, []);

  // ON A PHONE THE PANEL FOLLOWS THE VISIBLE SCREEN (Step 108). With the
  // keyboard up, the browser's visible area is shorter than the page and
  // may be scrolled; the panel takes exactly that area, so the field stays
  // at the top of what can be seen and the results scroll above the keyboard.
  const [viewport, setViewport] = useState<{ top: number; height: number } | null>(null);
  useEffect(() => {
    const vv = typeof window !== 'undefined' ? window.visualViewport : null;
    if (!open || !vv || window.matchMedia('(min-width: 640px)').matches) { setViewport(null); return; }
    const update = () => setViewport({ top: Math.round(vv.offsetTop), height: Math.round(vv.height) });
    update();
    vv.addEventListener('resize', update);
    vv.addEventListener('scroll', update);
    return () => { vv.removeEventListener('resize', update); vv.removeEventListener('scroll', update); };
  }, [open]);

  const typed = deferred.trim().length > 0;
  const stillLoading = open && !loaded;
  const activeId = rows[cursor] ? `site-search-row-${cursor}` : undefined;
  let rowNo = -1;

  const renderRow = (row: Row) => {
    rowNo += 1;
    const n = rowNo;
    const active = n === cursor;
    const Icon = KIND_ICON[row.doc.kind];
    const terms = results.terms;
    return (
      <a
        key={row.key}
        id={`site-search-row-${n}`}
        data-row={n}
        role="option"
        aria-selected={active}
        href={row.doc.href}
        onClick={(e) => { if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return; e.preventDefault(); go(row.doc); }}
        onMouseMove={() => { if (cursor !== n) setCursor(n); }}
        className={`flex items-start gap-3 border-l-2 px-4 py-3 font-body outline-none transition-colors sm:px-5 ${active ? 'border-accent bg-muted/60' : 'border-transparent'}`}
      >
        <Icon className={`mt-1 h-4 w-4 shrink-0 ${active ? 'text-accent' : 'text-muted-foreground'}`} aria-hidden="true" />
        <span className="min-w-0 flex-1">
          <span className="block text-[15px] leading-snug text-foreground sm:text-base">
            {typed ? <Marked text={row.doc.title} terms={terms} /> : row.doc.title}
          </span>
          {row.doc.meta && <span className="mt-0.5 block truncate text-xs text-muted-foreground">{row.doc.meta}</span>}
          {row.hit?.snippet && (
            <span className="mt-1 block text-xs leading-relaxed text-muted-foreground line-clamp-2">
              <Marked text={row.hit.snippet} terms={row.hit.matched} />
            </span>
          )}
        </span>
        <CornerDownLeft className={`mt-1 h-3.5 w-3.5 shrink-0 text-accent transition-opacity max-sm:hidden ${active ? 'opacity-100' : 'opacity-0'}`} aria-hidden="true" />
      </a>
    );
  };

  const groupHeading = (label: string, extra?: React.ReactNode) => (
    <div className="flex items-baseline justify-between gap-3 px-4 pb-1 pt-4 sm:px-5">
      <span className="font-body text-[11px] uppercase tracking-[0.14em] text-muted-foreground">{label}</span>
      {extra}
    </div>
  );

  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        {/* A neutral dim (Step 108): the page behind steps back, in black,
            not in the brand colour. */}
        <DialogPrimitive.Overlay className="fixed inset-0 z-[80] bg-black/50 backdrop-blur-[2px] data-[state=open]:animate-in data-[state=open]:fade-in-0" />
        <DialogPrimitive.Content
          aria-describedby={undefined}
          onOpenAutoFocus={(e) => { e.preventDefault(); takeFocusFromProxy(); }}
          // Closing must not give the focus back to the header's invisible
          // field, which would bring the keyboard up again on a phone.
          onCloseAutoFocus={(e) => { e.preventDefault(); (document.getElementById('site-search-proxy') as HTMLInputElement | null)?.blur(); }}
          className="fixed inset-x-0 top-0 z-[81] flex h-[100dvh] flex-col bg-background text-foreground outline-none sm:inset-x-0 sm:top-[9vh] sm:bottom-auto sm:mx-auto sm:h-auto sm:max-h-[78vh] sm:w-[min(44rem,calc(100vw-2rem))] sm:border sm:border-separator sm:shadow-[0_28px_70px_-24px_rgba(0,0,0,0.45)]"
          style={{ paddingTop: 'env(safe-area-inset-top)', paddingBottom: 'env(safe-area-inset-bottom)', ...(viewport ? { top: viewport.top, height: viewport.height } : {}) }}
        >
          <DialogPrimitive.Title className="sr-only">Search the website</DialogPrimitive.Title>
          <div className="flex h-16 shrink-0 items-center gap-3 border-b border-separator px-4 sm:px-5">
            <Search className="h-5 w-5 shrink-0 text-accent" aria-hidden="true" />
            <input
              ref={inputRef}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={onKeyDown}
              type="search"
              inputMode="search"
              enterKeyHint="go"
              autoComplete="off"
              autoCorrect="off"
              spellCheck={false}
              maxLength={120}
              placeholder="Search reports, people, events and pages"
              aria-label="Search the website"
              role="combobox"
              aria-expanded={rows.length > 0}
              aria-controls="site-search-results"
              aria-activedescendant={activeId}
              aria-autocomplete="list"
              className="min-w-0 flex-1 border-0 bg-transparent font-body text-base text-foreground caret-accent outline-none placeholder:text-muted-foreground sm:text-lg [&::-webkit-search-cancel-button]:hidden"
            />
            {query && (
              <button type="button" onClick={() => { setQuery(''); inputRef.current?.focus(); }} aria-label="Clear the search"
                className="inline-flex h-9 w-9 shrink-0 items-center justify-center text-muted-foreground hover:text-accent">
                <X className="h-4 w-4" />
              </button>
            )}
            <DialogPrimitive.Close className="shrink-0 font-body text-sm text-accent sm:hidden">Cancel</DialogPrimitive.Close>
            <DialogPrimitive.Close className="hidden shrink-0 border border-separator px-1.5 py-0.5 font-body text-[11px] leading-none text-muted-foreground hover:text-accent sm:inline-flex" aria-label="Close the search">Esc</DialogPrimitive.Close>
          </div>

          <div ref={listRef} id="site-search-results" role="listbox" aria-label="Results" className="relative min-h-0 flex-1 overflow-y-auto overscroll-contain pb-3">
            {!typed && (
              <>
                {recent.length > 0 && (
                  <>
                    {groupHeading('Recent searches', (
                      <button type="button" onClick={() => { writeRecent([]); setRecent([]); }} className="font-body text-[11px] text-muted-foreground underline-offset-4 hover:text-accent hover:underline">Clear</button>
                    ))}
                    <div className="flex flex-wrap gap-2 px-4 pb-1 sm:px-5">
                      {recent.map((r) => (
                        <button key={r} type="button" onClick={() => { setQuery(r); inputRef.current?.focus(); }}
                          className="border border-separator px-3 py-1.5 font-body text-sm text-foreground transition-colors hover:border-accent hover:text-accent">
                          {r}
                        </button>
                      ))}
                    </div>
                  </>
                )}
                {groupHeading('Go to')}
                {rows.map(renderRow)}
                <p className="px-4 pt-4 font-body text-xs text-muted-foreground sm:px-5">
                  Every published report, its authors, the current members, the events and every page of the website.
                </p>
              </>
            )}

            {typed && rows.length === 0 && !stillLoading && (
              <div className="px-5 py-10 text-center font-body">
                <p className="text-foreground">Nothing matches &ldquo;{deferred.trim()}&rdquo;.</p>
                {results.suggestion ? (
                  <p className="mt-2 text-sm text-muted-foreground">
                    Did you mean{' '}
                    <button type="button" onClick={() => setQuery(results.suggestion!)} className="text-accent underline underline-offset-4">{results.suggestion}</button>?
                  </p>
                ) : (
                  <p className="mt-2 text-sm text-muted-foreground">Try fewer words, a surname, a company or a year.</p>
                )}
              </div>
            )}

            {typed && results.partial && rows.length > 0 && (
              <p className="px-4 pt-3 font-body text-xs text-muted-foreground sm:px-5">
                No result holds every word; these hold most of them.
                {results.suggestion && (
                  <> Did you mean <button type="button" onClick={() => setQuery(results.suggestion!)} className="text-accent underline underline-offset-4">{results.suggestion}</button>?</>
                )}
              </p>
            )}

            {typed && groups.map((g) => {
              const shown = expanded.has(g.kind) ? g.hits : g.hits.slice(0, PER_GROUP);
              return (
                <div key={g.kind} role="group" aria-label={KIND_LABELS[g.kind]}>
                  {groupHeading(`${KIND_LABELS[g.kind]} · ${g.hits.length}`, g.hits.length > PER_GROUP ? (
                    <button type="button" onClick={() => setExpanded((s) => { const n = new Set(s); if (n.has(g.kind)) n.delete(g.kind); else n.add(g.kind); return n; })}
                      className="font-body text-[11px] text-accent underline-offset-4 hover:underline">
                      {expanded.has(g.kind) ? 'Show fewer' : `Show all ${g.hits.length}`}
                    </button>
                  ) : undefined)}
                  {shown.map((hit) => renderRow({ key: hit.doc.id, doc: hit.doc, hit }))}
                </div>
              );
            })}

            {stillLoading && (
              <p className="flex items-center gap-2 px-4 pt-4 font-body text-xs text-muted-foreground sm:px-5">
                <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />Gathering the reports, the people and the events
              </p>
            )}
            {failed && loaded && (
              <p className="px-4 pt-4 font-body text-xs text-muted-foreground sm:px-5">
                Part of the website could not be read just now, so some results may be missing. Close the search and open it again in a moment.
              </p>
            )}
          </div>

          <div className="hidden shrink-0 items-center justify-between gap-4 border-t border-separator px-5 py-2.5 font-body text-[11px] text-muted-foreground sm:flex">
            <span>Arrow keys to move, Enter to open, Esc to close</span>
            <span>Try a name, a company, a fund or a year</span>
          </div>
          <span className="sr-only" aria-live="polite">
            {typed ? (results.hits.length ? `${results.hits.length} results` : 'No results') : ''}
          </span>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
