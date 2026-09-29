// =====================================================================
// Everything one item holds, in a panel beside the library.
// ---------------------------------------------------------------------
// The library shows what an item IS; this shows what it HOLDS: every
// file with its own preview and download, every caption with a copy
// button and its length, every link with where it goes, every contact
// one tap from calling or writing. Previous and Next walk the library in
// the order it is shown, so a set of graphics can be browsed without
// going back to the grid each time.
// =====================================================================

import {
  ChevronLeft, ChevronRight, Copy, Download, ExternalLink, Eye, Link2, Loader2, Mail, Pencil, Phone, Pin, PinOff, Trash2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import type { ResourceRow, ResourceSource } from '@/lib/resources-api';
import { fileBadge, fileKindOf, filesOf, formatBytes, itemLook, shortDate, sourcesOfKind } from '@/lib/library-files';
import { previewLink } from '@/lib/link-label';
import { divisionLabels } from '@/lib/roles';
import { useMedia } from '@/components/admin/calendar/calendar-hooks';
import { ItemVisual, TypeBadge } from './LibraryParts';
import { lookStyle } from './library-look';
import { CAPTION_LIMITS, textNoun, type LibraryFlavour } from './library-data';

export interface SheetHandlers {
  onPreview: (item: ResourceRow, fileIndex: number) => void;
  onDownloadFile: (file: ResourceSource) => void;
  onDownloadAll: (item: ResourceRow) => void;
  onCopy: (text: string, what: string) => void;
  onEdit: (item: ResourceRow) => void;
  onPin: (item: ResourceRow) => void;
  onDelete: (item: ResourceRow) => void;
}

export function ItemSheet({
  item, thumbs, flavour, canManage, handlers, busy, position, onStep, onClose,
}: {
  item: ResourceRow | null;
  thumbs: Record<string, string>;
  flavour: LibraryFlavour;
  canManage: boolean;
  handlers: SheetHandlers;
  /** The file (or item id) being fetched, to show a spinner on it. */
  busy: string | null;
  /** "3 of 12" in the library as it is shown, if known. */
  position: { index: number; total: number } | null;
  onStep: (delta: 1 | -1) => void;
  onClose: () => void;
}) {
  const wide = useMedia('(min-width: 640px)');
  const files = item ? filesOf(item) : [];
  const texts = item ? sourcesOfKind(item, 'text') : [];
  const links = item ? sourcesOfKind(item, 'link') : [];
  const phones = item ? sourcesOfKind(item, 'phone') : [];
  const emails = item ? sourcesOfKind(item, 'email') : [];
  const limit = CAPTION_LIMITS[flavour];
  const noun = textNoun(flavour);

  return (
    <Sheet open={!!item} onOpenChange={(o) => !o && onClose()}>
      <SheetContent
        side={wide ? 'right' : 'bottom'}
        className={wide ? 'flex w-full flex-col gap-0 p-0 sm:max-w-[34rem]' : 'flex max-h-[92vh] flex-col gap-0 p-0'}
        onKeyDown={(e) => {
          if (!position || position.total < 2) return;
          const t = e.target as HTMLElement;
          if (t.closest('input, textarea')) return;
          if (e.key === 'ArrowRight') { e.preventDefault(); onStep(1); }
          if (e.key === 'ArrowLeft') { e.preventDefault(); onStep(-1); }
        }}
      >
        {item && (
          <>
            <SheetHeader className="shrink-0 space-y-2 border-b border-separator px-5 pb-4 pt-5 pr-12 text-left">
              <div className="flex flex-wrap items-center gap-2">
                <TypeBadge look={itemLook(item)} />
                {item.is_favourite && <span className="inline-flex items-center gap-1 font-body text-xs text-accent"><Pin className="h-3.5 w-3.5" />Pinned</span>}
                {item.division !== 'none' && <span className="font-body text-xs text-muted-foreground">{divisionLabels[item.division]}</span>}
              </div>
              <SheetTitle className="font-serif text-2xl leading-tight text-accent">{item.title}</SheetTitle>
              <SheetDescription className="font-body text-[13px]">
                Added by {item.author_name || 'Unknown'}{item.author_role ? `, ${item.author_role}` : ''}, {shortDate(item.created_at)}
              </SheetDescription>
            </SheetHeader>

            <div className="min-h-0 flex-1 space-y-6 overflow-y-auto px-5 py-5 font-body">
              {files.length > 0 && <ItemVisual item={item} thumbs={thumbs} size="sheet" />}
              {item.description && <p className="whitespace-pre-wrap text-[15px] leading-relaxed text-foreground">{item.description}</p>}

              {/* ---- Files ---------------------------------------- */}
              {files.length > 0 && (
                <section aria-labelledby="lib-files">
                  <div className="mb-2 flex items-center justify-between gap-2">
                    <h3 id="lib-files" className="text-xs uppercase tracking-wider text-muted-foreground">Files ({files.length})</h3>
                    {files.length > 1 && (
                      <Button variant="outline" size="sm" disabled={busy === item.id} onClick={() => handlers.onDownloadAll(item)}>
                        {busy === item.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}Download all as ZIP
                      </Button>
                    )}
                  </div>
                  <ul className="divide-y divide-separator border border-separator">
                    {files.map((f, i) => {
                      const kind = fileKindOf(f);
                      const thumb = thumbs[f.value];
                      const { tile } = lookStyle(kind);
                      return (
                        <li key={`${f.value}-${i}`} className="flex items-center gap-3 px-3 py-2.5">
                          <button type="button" data-ro onClick={() => handlers.onPreview(item, i)} aria-label={`Preview ${f.label || `file ${i + 1}`}`}
                            className={`flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden border border-separator text-[10px] font-semibold tracking-wide ${thumb ? 'bg-muted/30' : tile}`}>
                            {thumb ? <img src={thumb} alt="" loading="lazy" className="h-full w-full object-cover" /> : fileBadge(f)}
                          </button>
                          <div className="min-w-0 flex-1">
                            <p className="break-words text-sm leading-snug text-foreground">{f.label || `File ${i + 1}`}</p>
                            <p className="text-xs text-muted-foreground">{[fileBadge(f), formatBytes(f.size)].filter(Boolean).join(' · ')}</p>
                          </div>
                          <div className="flex shrink-0 gap-1">
                            <Button variant="ghost" size="icon" className="h-10 w-10" aria-label={`Preview ${f.label || 'file'}`} title="Preview" onClick={() => handlers.onPreview(item, i)}>
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-10 w-10" aria-label={`Download ${f.label || 'file'}`} title="Download" disabled={busy === f.value} onClick={() => handlers.onDownloadFile(f)}>
                              {busy === f.value ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
                            </Button>
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                </section>
              )}

              {/* ---- Captions and texts ------------------------------ */}
              {texts.length > 0 && (
                <section aria-labelledby="lib-texts">
                  <h3 id="lib-texts" className="mb-2 text-xs uppercase tracking-wider text-muted-foreground">{texts.length === 1 ? noun.one : noun.many}</h3>
                  <div className="space-y-3">
                    {texts.map((t, i) => {
                      const n = Array.from(t.value).length;
                      const over = limit ? n > limit.limit : false;
                      return (
                        <div key={i} className="border border-separator">
                          <p className="whitespace-pre-wrap break-words px-3 py-3 text-sm leading-relaxed text-foreground">{t.value}</p>
                          <div className="flex items-center justify-between gap-2 border-t border-separator bg-muted/20 px-3 py-1.5">
                            <span className={`text-xs tabular-nums ${over ? 'text-destructive' : 'text-muted-foreground'}`}>
                              {n.toLocaleString('en-GB')} characters{limit ? ` of ${limit.limit.toLocaleString('en-GB')} for ${limit.where}${over ? ': too long' : ''}` : ''}
                            </span>
                            <Button data-ro variant="ghost" size="sm" onClick={() => handlers.onCopy(t.value, noun.one)}>
                              <Copy className="h-4 w-4" />Copy
                            </Button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </section>
              )}

              {/* ---- Links ------------------------------------------- */}
              {links.length > 0 && (
                <section aria-labelledby="lib-links">
                  <h3 id="lib-links" className="mb-2 text-xs uppercase tracking-wider text-muted-foreground">Links ({links.length})</h3>
                  <ul className="divide-y divide-separator border border-separator">
                    {links.map((l, i) => {
                      const p = previewLink(l.value, l.label);
                      return (
                        <li key={i} className="flex items-center gap-3 px-3 py-2.5">
                          <Link2 aria-hidden className="h-4 w-4 shrink-0 text-muted-foreground" />
                          <div className="min-w-0 flex-1">
                            <a href={l.value} target="_blank" rel="noopener noreferrer" className="break-words text-sm text-accent underline underline-offset-2" title={l.value}>{p.label}</a>
                            {!p.raw && <p className="truncate text-xs text-muted-foreground">{p.label === p.source ? p.domain : `${p.source} · ${p.domain}`}</p>}
                          </div>
                          <Button data-ro variant="ghost" size="icon" className="h-10 w-10" aria-label="Copy the link" title="Copy the link" onClick={() => handlers.onCopy(l.value, 'Link')}>
                            <Copy className="h-4 w-4" />
                          </Button>
                          <a href={l.value} target="_blank" rel="noopener noreferrer" aria-label={`Open ${p.label} in a new tab`} title="Open"
                            className="flex h-10 w-10 shrink-0 items-center justify-center text-muted-foreground hover:bg-accent/10 hover:text-accent">
                            <ExternalLink className="h-4 w-4" />
                          </a>
                        </li>
                      );
                    })}
                  </ul>
                </section>
              )}

              {/* ---- Contacts ---------------------------------------- */}
              {(phones.length > 0 || emails.length > 0) && (
                <section aria-labelledby="lib-contacts">
                  <h3 id="lib-contacts" className="mb-2 text-xs uppercase tracking-wider text-muted-foreground">Contacts</h3>
                  <ul className="divide-y divide-separator border border-separator">
                    {[...phones, ...emails].map((c, i) => (
                      <li key={i} className="flex items-center gap-3 px-3 py-2.5">
                        {c.kind === 'phone' ? <Phone aria-hidden className="h-4 w-4 shrink-0 text-muted-foreground" /> : <Mail aria-hidden className="h-4 w-4 shrink-0 text-muted-foreground" />}
                        <div className="min-w-0 flex-1">
                          <a href={c.kind === 'phone' ? `tel:${c.value.replace(/[^\d+]/g, '')}` : `mailto:${c.value}`} className="break-all text-sm text-accent underline underline-offset-2">{c.value}</a>
                          {c.label && <p className="truncate text-xs text-muted-foreground">{c.label}</p>}
                        </div>
                        <Button data-ro variant="ghost" size="icon" className="h-10 w-10" aria-label={`Copy ${c.value}`} title="Copy" onClick={() => handlers.onCopy(c.value, c.kind === 'phone' ? 'Number' : 'Address')}>
                          <Copy className="h-4 w-4" />
                        </Button>
                      </li>
                    ))}
                  </ul>
                </section>
              )}
            </div>

            <div className="flex shrink-0 flex-wrap items-center gap-2 border-t border-separator bg-background px-5 py-3">
              {position && position.total > 1 && (
                <div className="mr-auto flex items-center gap-1">
                  <Button data-ro variant="ghost" size="icon" className="h-10 w-10" aria-label="Previous item" onClick={() => onStep(-1)}><ChevronLeft className="h-4 w-4" /></Button>
                  <span className="font-body text-xs tabular-nums text-muted-foreground">{position.index + 1} of {position.total}</span>
                  <Button data-ro variant="ghost" size="icon" className="h-10 w-10" aria-label="Next item" onClick={() => onStep(1)}><ChevronRight className="h-4 w-4" /></Button>
                </div>
              )}
              {canManage && (
                <>
                  <Button variant="ghost" size="sm" onClick={() => handlers.onPin(item)}>
                    {item.is_favourite ? <><PinOff className="h-4 w-4" />Unpin</> : <><Pin className="h-4 w-4" />Pin to top</>}
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => handlers.onEdit(item)}><Pencil className="h-4 w-4" />Edit</Button>
                  <Button variant="ghost" size="sm" className="text-destructive hover:bg-destructive/10 hover:text-destructive" onClick={() => handlers.onDelete(item)}>
                    <Trash2 className="h-4 w-4" />Remove
                  </Button>
                </>
              )}
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
