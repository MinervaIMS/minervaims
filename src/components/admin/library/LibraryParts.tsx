// =====================================================================
// The pieces every file library is drawn from: the type tile, the
// grid card, the list row and the toolbar.
// ---------------------------------------------------------------------
// WHICH FILE IS WHICH, AT A GLANCE. A picture shows as the picture. Any
// other file shows its type three ways at once: an icon, a colour and
// the extension written out (PDF, DOCX, XLSX), so nothing depends on
// telling colours apart. The title is the name a person gave it; the
// file's own name is one line below wherever it adds something.
// =====================================================================

import { useState, type ReactNode } from 'react';
import { Check, Copy, Download, ExternalLink, LayoutGrid, List, Pin, Search, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { ResourceRow } from '@/lib/resources-api';
import {
  contentsLine, coverImage, filesOf, itemLook, shortDate,
  LIBRARY_SORTS, type ItemLook, type LibraryFilter, type LibrarySort,
} from '@/lib/library-files';
import { byLine, factsLine, lookStyle, sizeOrContents } from './library-look';
import { divisionLabels } from '@/lib/roles';
import type { LibraryView } from './library-data';

// ---------------------------------------------------------------------
// Type tiles
// ---------------------------------------------------------------------

/** The small type badge: "PDF", "PNG", "LINK". */
export function TypeBadge({ look, className = '' }: { look: ItemLook; className?: string }) {
  const { tile } = lookStyle(look.kind);
  return (
    <span className={`inline-flex h-5 items-center px-1.5 font-body text-[11px] font-semibold tracking-wide ${tile} ${className}`}>
      {look.badge}
    </span>
  );
}

/**
 * What stands for an item: its first picture, or a tile of its type.
 * `size` is the tile's scale: the grid card's cover, or a list row's icon.
 */
export function ItemVisual({ item, thumbs, size }: { item: ResourceRow; thumbs: Record<string, string>; size: 'cover' | 'row' | 'sheet' }) {
  const look = itemLook(item);
  const cover = coverImage(item);
  // A picture that cannot be read (moved, expired) falls back to its type,
  // never to the browser's broken-image mark.
  const [broken, setBroken] = useState<string | null>(null);
  const signed = cover ? thumbs[cover.value] : undefined;
  const url = signed && signed !== broken ? signed : undefined;
  const { tile, Icon } = lookStyle(look.kind);
  const onError = () => setBroken(signed ?? null);
  if (size === 'row') {
    return (
      <span className={`relative flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden border border-separator ${url ? 'bg-muted/30' : tile}`}>
        {url ? <img src={url} alt="" loading="lazy" decoding="async" onError={onError} className="h-full w-full object-cover" /> : <Icon aria-hidden className="h-5 w-5" />}
      </span>
    );
  }
  return (
    <div className={`relative flex w-full items-center justify-center overflow-hidden ${size === 'cover' ? 'aspect-[4/3]' : 'aspect-[16/9]'} ${url ? 'bg-muted/40' : tile}`}>
      {url ? (
        <img src={url} alt="" loading="lazy" decoding="async" onError={onError} className={`h-full w-full ${size === 'cover' ? 'object-cover' : 'object-contain'}`} />
      ) : (
        <div className="flex flex-col items-center gap-2">
          <Icon aria-hidden className={size === 'cover' ? 'h-9 w-9' : 'h-12 w-12'} />
          <span className="font-body text-xs font-semibold tracking-[0.12em]">{look.badge}</span>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------
// The quick action every item offers without opening it
// ---------------------------------------------------------------------

export interface QuickHandlers {
  onDownload: (item: ResourceRow) => void;
  onCopy: (text: string, what: string) => void;
}

/**
 * The one thing people most often want from an item, one press away:
 * download its file, open its link, or copy its text. Items holding
 * several things offer it in the panel instead, where the choice is clear.
 */
export function QuickAction({ item, busy, handlers, compact = false }: { item: ResourceRow; busy: boolean; handlers: QuickHandlers; compact?: boolean }) {
  const files = filesOf(item);
  const link = item.sources.find((s) => s.kind === 'link');
  const text = item.sources.find((s) => s.kind === 'text');
  const contact = item.sources.find((s) => s.kind === 'email') ?? item.sources.find((s) => s.kind === 'phone');
  const base = `relative z-10 inline-flex items-center justify-center gap-1.5 border border-separator bg-background font-body text-[13px] text-accent hover:border-accent hover:bg-accent/5 transition-colors disabled:opacity-60 ${compact ? 'h-9 w-9' : 'h-9 px-3'}`;
  if (files.length > 0) {
    const label = files.length > 1 ? `Download all ${files.length} files of ${item.title}` : `Download ${item.title}`;
    return (
      <button type="button" data-ro className={base} disabled={busy} aria-label={label} title={files.length > 1 ? `Download all ${files.length} as a ZIP` : 'Download'}
        onClick={(e) => { e.stopPropagation(); handlers.onDownload(item); }}>
        <Download aria-hidden className="h-4 w-4" />{!compact && (files.length > 1 ? 'Download all' : 'Download')}
      </button>
    );
  }
  if (link) {
    return (
      <a href={link.value} target="_blank" rel="noopener noreferrer" className={base} aria-label={`Open ${item.title} in a new tab`} title="Open the link"
        onClick={(e) => e.stopPropagation()}>
        <ExternalLink aria-hidden className="h-4 w-4" />{!compact && 'Open'}
      </a>
    );
  }
  if (text) {
    return (
      <button type="button" data-ro className={base} aria-label={`Copy the text of ${item.title}`} title="Copy the text"
        onClick={(e) => { e.stopPropagation(); handlers.onCopy(text.value, 'Text'); }}>
        <Copy aria-hidden className="h-4 w-4" />{!compact && 'Copy'}
      </button>
    );
  }
  if (contact) {
    const what = contact.kind === 'email' ? 'Address' : 'Number';
    return (
      <button type="button" data-ro className={base} aria-label={`Copy ${contact.value}`} title={`Copy ${contact.value}`}
        onClick={(e) => { e.stopPropagation(); handlers.onCopy(contact.value, what); }}>
        <Copy aria-hidden className="h-4 w-4" />{!compact && 'Copy'}
      </button>
    );
  }
  return null;
}

// ---------------------------------------------------------------------
// Selection box
// ---------------------------------------------------------------------

export function SelectBox({ checked, onChange, label, className = '' }: { checked: boolean; onChange: (v: boolean) => void; label: string; className?: string }) {
  return (
    <button
      type="button" role="checkbox" aria-checked={checked} aria-label={label} data-ro
      onClick={(e) => { e.stopPropagation(); onChange(!checked); }}
      className={`relative z-10 flex h-7 w-7 items-center justify-center border transition-colors ${checked ? 'border-accent bg-accent text-accent-foreground' : 'border-separator bg-background/95 text-transparent hover:border-accent'} ${className}`}
    >
      <Check aria-hidden className="h-4 w-4" />
    </button>
  );
}

// ---------------------------------------------------------------------
// Grid card
// ---------------------------------------------------------------------

export function GridCard({ item, thumbs, selected, selecting, onSelect, onOpen, busy, handlers, showDivision }: {
  item: ResourceRow;
  thumbs: Record<string, string>;
  selected: boolean;
  selecting: boolean;
  onSelect: (v: boolean) => void;
  onOpen: () => void;
  busy: boolean;
  handlers: QuickHandlers;
  showDivision: boolean;
}) {
  const look = itemLook(item);
  return (
    <article
      className={`group relative flex min-w-0 flex-col border bg-background transition-colors ${selected ? 'border-accent ring-1 ring-accent' : 'border-separator hover:border-accent/60'}`}
      data-library-item={item.id}
    >
      <div className="relative">
        <ItemVisual item={item} thumbs={thumbs} size="cover" />
        {item.is_favourite && (
          <span className="absolute left-2 top-2 inline-flex items-center gap-1 bg-accent px-1.5 py-0.5 font-body text-[11px] text-accent-foreground">
            <Pin aria-hidden className="h-3 w-3" />Pinned
          </span>
        )}
        <SelectBox
          checked={selected} onChange={onSelect} label={`Select ${item.title}`}
          className={`absolute right-2 top-2 ${selecting || selected ? 'opacity-100' : 'opacity-100 sm:opacity-0 sm:group-hover:opacity-100 sm:focus-visible:opacity-100'}`}
        />
      </div>
      <div className="flex min-w-0 flex-1 flex-col gap-1.5 p-3">
        <div className="flex items-center gap-2 min-w-0">
          <TypeBadge look={look} />
          {showDivision && item.division !== 'none' && (
            <span className="truncate font-body text-xs text-muted-foreground">{divisionLabels[item.division]}</span>
          )}
        </div>
        {/* The title is the button that opens the item; its ::after
            stretches over the whole card, so the card is one big target
            while the actions above it keep their own. */}
        <h3 className="min-w-0 font-body text-[15px] font-medium leading-snug text-foreground">
          <button
            type="button" data-ro onClick={onOpen}
            className="line-clamp-2 text-left after:absolute after:inset-0 after:content-[''] focus-visible:outline-none focus-visible:after:ring-2 focus-visible:after:ring-accent"
            title={item.title}
          >
            {item.title}
          </button>
        </h3>
        {item.description && <p className="line-clamp-2 font-body text-[13px] text-muted-foreground">{item.description}</p>}
        <div className="mt-auto flex items-end justify-between gap-2 pt-1">
          <div className="min-w-0 font-body text-xs text-muted-foreground">
            <p className="truncate">{factsLine(item)}</p>
            <p className="truncate">{byLine(item)}</p>
          </div>
          <QuickAction item={item} busy={busy} handlers={handlers} compact />
        </div>
      </div>
    </article>
  );
}

// ---------------------------------------------------------------------
// List row
// ---------------------------------------------------------------------

export function ListRow({ item, thumbs, selected, onSelect, onOpen, busy, handlers, showDivision }: {
  item: ResourceRow;
  thumbs: Record<string, string>;
  selected: boolean;
  onSelect: (v: boolean) => void;
  onOpen: () => void;
  busy: boolean;
  handlers: QuickHandlers;
  showDivision: boolean;
}) {
  const look = itemLook(item);
  const single = filesOf(item).length === 1 ? filesOf(item)[0] : null;
  return (
    <li
      className={`group relative grid min-w-0 grid-cols-[auto_auto_minmax(0,1fr)_auto] items-center gap-3 border-b border-separator px-2 py-2.5 transition-colors md:grid-cols-[auto_auto_minmax(0,1fr)_11rem_9rem_auto] ${selected ? 'bg-accent/5' : 'hover:bg-muted/30'}`}
      data-library-item={item.id}
    >
      <SelectBox checked={selected} onChange={onSelect} label={`Select ${item.title}`} />
      <ItemVisual item={item} thumbs={thumbs} size="row" />
      <div className="min-w-0">
        <div className="flex min-w-0 items-center gap-2">
          {item.is_favourite && <Pin aria-label="Pinned" className="h-3.5 w-3.5 shrink-0 text-accent" />}
          <button
            type="button" data-ro onClick={onOpen}
            className="min-w-0 truncate text-left font-body text-[15px] font-medium text-foreground after:absolute after:inset-0 after:content-[''] focus-visible:outline-none focus-visible:after:ring-2 focus-visible:after:ring-accent"
            title={item.title}
          >
            {item.title}
          </button>
        </div>
        <p className="truncate font-body text-[13px] text-muted-foreground">
          {item.description || (single?.label && single.label !== item.title ? single.label : contentsLine(item))}
        </p>
        {/* On a phone the two columns below fold into this line. */}
        <p className="truncate font-body text-xs text-muted-foreground md:hidden">
          {[look.badge, factsLine(item) !== look.label ? factsLine(item) : null, shortDate(item.created_at)].filter(Boolean).join(' · ')}
        </p>
      </div>
      <div className="hidden min-w-0 md:block">
        <div className="flex min-w-0 items-center gap-2">
          <TypeBadge look={look} />
          <span className="truncate font-body text-xs text-muted-foreground" title={sizeOrContents(item)}>{sizeOrContents(item)}</span>
        </div>
        <p className="mt-0.5 truncate font-body text-xs text-muted-foreground">
          {showDivision ? (item.division === 'none' ? 'General' : divisionLabels[item.division]) : look.label}
        </p>
      </div>
      <div className="hidden min-w-0 font-body text-[13px] md:block">
        <p className="truncate text-foreground">{shortDate(item.created_at)}</p>
        <p className="truncate text-xs text-muted-foreground">{item.author_name || 'Unknown'}</p>
      </div>
      <div className="flex w-9 justify-end"><QuickAction item={item} busy={busy} handlers={handlers} compact /></div>
    </li>
  );
}

// ---------------------------------------------------------------------
// Toolbar
// ---------------------------------------------------------------------

export function SearchBox({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder: string }) {
  return (
    <div className="relative min-w-0 flex-1">
      <Search aria-hidden className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
      <Input
        type="search" value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder}
        aria-label="Search this library" className="h-10 pl-9 pr-9 font-body"
      />
      {value && (
        <button type="button" data-ro onClick={() => onChange('')} aria-label="Clear the search"
          className="absolute right-1 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center text-muted-foreground hover:text-accent">
          <X aria-hidden className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}

export function SortSelect({ value, onChange }: { value: LibrarySort; onChange: (v: LibrarySort) => void }) {
  return (
    <Select value={value} onValueChange={(v) => onChange(v as LibrarySort)}>
      <SelectTrigger className="h-10 w-full font-body sm:w-[11.5rem]" aria-label="Sort by">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {LIBRARY_SORTS.map((s) => <SelectItem key={s.key} value={s.key}>{s.label}</SelectItem>)}
      </SelectContent>
    </Select>
  );
}

export function ViewSwitch({ value, onChange }: { value: LibraryView; onChange: (v: LibraryView) => void }) {
  const opt = (v: LibraryView, label: string, icon: ReactNode) => (
    <button
      type="button" data-ro aria-pressed={value === v} onClick={() => onChange(v)}
      className={`inline-flex h-10 items-center gap-1.5 px-3 font-body text-sm transition-colors ${value === v ? 'bg-accent text-accent-foreground' : 'text-muted-foreground hover:bg-accent/5 hover:text-accent'}`}
    >
      {icon}{label}
    </button>
  );
  return (
    <div role="group" aria-label="Show as" className="inline-flex shrink-0 border border-separator bg-background">
      {opt('grid', 'Grid', <LayoutGrid aria-hidden className="h-4 w-4" />)}
      {opt('list', 'List', <List aria-hidden className="h-4 w-4" />)}
    </div>
  );
}

/** One choice in a row of mutually exclusive chips. */
export function Chip({ active, onClick, children, count }: { active: boolean; onClick: () => void; children: ReactNode; count?: number }) {
  return (
    <button
      type="button" data-ro aria-pressed={active} onClick={onClick}
      className={`inline-flex h-9 shrink-0 items-center gap-1.5 border px-3 font-body text-[13px] transition-colors ${
        active ? 'border-accent bg-accent text-accent-foreground' : 'border-separator bg-background text-foreground hover:border-accent hover:text-accent'
      }`}
    >
      {children}
      {typeof count === 'number' && <span className={`tabular-nums ${active ? 'text-accent-foreground/80' : 'text-muted-foreground'}`}>{count}</span>}
    </button>
  );
}

export type FilterCounts = Partial<Record<LibraryFilter | 'all', number>>;
