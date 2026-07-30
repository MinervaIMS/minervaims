import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Search, CornerDownLeft, ArrowUp, ArrowDown, X } from 'lucide-react';
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
// =====================================================================

export interface SearchTarget {
  /** Subsection to open. */
  key: string;
  /** Help topic to open inside it, when the hit was a topic. */
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
        context: `${g.section} · ${g.label}`,
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

interface Props {
  /** Open the subsection, and the help topic when there is one. */
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

  const index = useMemo(
    () => buildIndex(GUIDE.filter((g) => access.canView(g.key)), (k) => access.canManage(k)),
    [access],
  );

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) {
      // An empty box is still useful: offer the pages, in workspace order.
      return index.filter((i) => i.kind === 'page').slice(0, 12);
    }
    return index
      .map((item) => ({ item, s: score(item, q) }))
      .filter((r) => r.s > 0)
      .sort((a, b) => b.s - a.s || a.item.label.length - b.item.label.length)
      .slice(0, 20)
      .map((r) => r.item);
  }, [index, query]);

  useEffect(() => { setCursor(0); }, [query]);

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
    // Focus after the dialog has painted, or the caret lands nowhere.
    const id = window.setTimeout(() => inputRef.current?.focus(), 30);
    return () => window.clearTimeout(id);
  }, [open]);

  // Keep the highlighted row in view while arrowing through a long list.
  useEffect(() => {
    listRef.current?.querySelector<HTMLElement>('[data-active="true"]')
      ?.scrollIntoView({ block: 'nearest' });
  }, [cursor]);

  const choose = useCallback((item: Indexed | undefined) => {
    if (!item) return;
    setOpen(false);
    onNavigate(item.target);
  }, [onNavigate]);

  const onInputKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setCursor((c) => Math.min(c + 1, results.length - 1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setCursor((c) => Math.max(c - 1, 0)); }
    else if (e.key === 'Enter') { e.preventDefault(); choose(results[cursor]); }
    else if (e.key === 'Escape') { e.preventDefault(); setOpen(false); }
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
          className="fixed inset-0 z-[100] flex items-start justify-center px-4 pt-[12vh]"
          role="dialog"
          aria-modal="true"
          aria-label="Search the workspace"
          onMouseDown={(e) => { if (e.target === e.currentTarget) setOpen(false); }}
        >
          <div className="absolute inset-0 bg-foreground/40" aria-hidden="true" />

          <div className="relative w-full max-w-xl bg-background border border-separator shadow-[0_24px_60px_-20px_hsl(var(--overlay)/0.35)]">
            <div className="flex items-center gap-3 px-4 h-14 border-b border-separator">
              <Search className="h-4 w-4 text-muted-foreground shrink-0" />
              <input
                ref={inputRef}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={onInputKeyDown}
                placeholder="Search subsections and help topics"
                aria-label="Search subsections and help topics"
                className="flex-1 bg-transparent border-0 outline-none font-body text-base placeholder:text-muted-foreground"
              />
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Close search"
                className="h-8 w-8 flex items-center justify-center text-muted-foreground hover:text-accent shrink-0"
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
              <ul ref={listRef} className="max-h-[52vh] overflow-y-auto py-1" role="listbox">
                {results.map((item, i) => (
                  <li key={item.id} role="option" aria-selected={i === cursor} data-active={i === cursor}>
                    <button
                      type="button"
                      onMouseEnter={() => setCursor(i)}
                      onMouseDown={(e) => { e.preventDefault(); choose(item); }}
                      className={`w-full text-left px-4 py-2.5 font-body transition-colors ${
                        i === cursor ? 'bg-accent/8' : ''
                      }`}
                    >
                      <div className="flex items-baseline gap-2">
                        <span className="text-foreground">{item.label}</span>
                        <span className="text-[11px] uppercase tracking-wider text-muted-foreground/80">
                          {item.kind === 'topic' ? 'Help' : item.canManage ? 'Manage' : 'View'}
                        </span>
                      </div>
                      <div className="text-xs text-muted-foreground">{item.context}</div>
                      <div className="text-xs text-muted-foreground/80 line-clamp-1">{item.detail}</div>
                    </button>
                  </li>
                ))}
              </ul>
            )}

            <div className="flex items-center gap-4 px-4 h-10 border-t border-separator font-body text-[11px] text-muted-foreground">
              <span className="inline-flex items-center gap-1"><ArrowUp className="h-3 w-3" /><ArrowDown className="h-3 w-3" />move</span>
              <span className="inline-flex items-center gap-1"><CornerDownLeft className="h-3 w-3" />open</span>
              <span className="ml-auto">{results.length} {results.length === 1 ? 'result' : 'results'}</span>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default WorkspaceSearch;
