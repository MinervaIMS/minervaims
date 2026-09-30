// =====================================================================
// How an item looks: the colour and icon of each type, and the one line
// of facts under a title. Shared by the grid, the list, the panel and
// the upload dialog; kept apart from the components so they stay
// refreshable.
// =====================================================================

import {
  Archive, Contact, FileSpreadsheet, FileText, Film, Image as ImageIcon, Link2, Presentation, StickyNote,
} from 'lucide-react';
import type { ResourceRow } from '@/lib/resources-api';
import { contentsLine, filesOf, formatBytes, itemLook, shortDate, type ItemLook } from '@/lib/library-files';

const LOOK_STYLE: Record<ItemLook['kind'], { tile: string; Icon: typeof FileText }> = {
  image: { tile: 'bg-sky-50 text-sky-800 dark:bg-sky-950/40 dark:text-sky-200', Icon: ImageIcon },
  video: { tile: 'bg-violet-50 text-violet-800 dark:bg-violet-950/40 dark:text-violet-200', Icon: Film },
  pdf: { tile: 'bg-rose-50 text-rose-800 dark:bg-rose-950/40 dark:text-rose-200', Icon: FileText },
  doc: { tile: 'bg-blue-50 text-blue-800 dark:bg-blue-950/40 dark:text-blue-200', Icon: FileText },
  sheet: { tile: 'bg-emerald-50 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-200', Icon: FileSpreadsheet },
  slides: { tile: 'bg-amber-50 text-amber-800 dark:bg-amber-950/40 dark:text-amber-200', Icon: Presentation },
  archive: { tile: 'bg-stone-100 text-stone-800 dark:bg-stone-900/60 dark:text-stone-200', Icon: Archive },
  text: { tile: 'bg-slate-50 text-slate-800 dark:bg-slate-900/60 dark:text-slate-200', Icon: FileText },
  other: { tile: 'bg-slate-50 text-slate-800 dark:bg-slate-900/60 dark:text-slate-200', Icon: FileText },
  link: { tile: 'bg-accent/5 text-accent', Icon: Link2 },
  note: { tile: 'bg-yellow-50 text-yellow-900 dark:bg-yellow-950/30 dark:text-yellow-100', Icon: StickyNote },
  contact: { tile: 'bg-teal-50 text-teal-800 dark:bg-teal-950/40 dark:text-teal-200', Icon: Contact },
};

export function lookStyle(kind: ItemLook['kind']) {
  return LOOK_STYLE[kind] ?? LOOK_STYLE.other;
}

// ---------------------------------------------------------------------
// One line of facts about an item
// ---------------------------------------------------------------------

/** "PDF · 2.4 MB", "3 files", "Link · github.com". */
export function factsLine(item: ResourceRow): string {
  const files = filesOf(item);
  if (files.length === 1 && item.sources.length === 1) {
    const size = formatBytes(files[0].size);
    return [itemLook(item).label, size].filter(Boolean).join(' · ');
  }
  return contentsLine(item);
}

export function byLine(item: ResourceRow): string {
  return [item.author_name || null, shortDate(item.created_at)].filter(Boolean).join(' · ');
}


/** "1.2 MB" for a single file, "2 files, 1 text" for anything else. */
export function sizeOrContents(item: ResourceRow): string {
  const files = filesOf(item);
  if (files.length === 1 && item.sources.length === 1) return formatBytes(files[0].size) || itemLook(item).label;
  return contentsLine(item);
}

/**
 * The classes and style that draw a backdrop behind a picture (see
 * `useImageBackdrop`). The chequerboard is two middle greys, so a white
 * mark and a black one both show on it.
 */
export function backdropProps(b: 'dark' | 'light' | 'checker' | null | undefined): { className: string; style?: { backgroundImage: string; backgroundSize: string } } {
  if (b === 'dark') return { className: 'bg-neutral-800' };
  if (b === 'light') return { className: 'bg-white' };
  if (b === 'checker') {
    return {
      className: 'bg-neutral-300',
      style: { backgroundImage: 'conic-gradient(#a3a3a3 25%, #d4d4d4 0 50%, #a3a3a3 0 75%, #d4d4d4 0)', backgroundSize: '16px 16px' },
    };
  }
  return { className: 'bg-muted/40' };
}
