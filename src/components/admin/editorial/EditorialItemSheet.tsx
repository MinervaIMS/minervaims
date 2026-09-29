import { useEffect, useState } from 'react';
import { CalendarDays, Loader2, Trash2 } from 'lucide-react';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  ED_STATUS_LABELS, FORMATS_BY_PLATFORM, FORMAT_SHORT_LABELS, PLATFORM_LABELS, PLATFORM_ORDER,
  describeDestinations, normalisedDestinations, setFormatFor, togglePlatform,
  type EditorialInput, type EditorialItem,
} from '@/lib/smm-api';
import type { EventRow } from '@/lib/events-api';
import { formatEventWhen } from '@/lib/event-time';
import { longDay, relativeDay } from '@/lib/calendar-dates';
import { useMedia } from '@/components/admin/calendar/calendar-hooks';
import { PLATFORM_ICON, STATUS_ORDER, STATUS_STYLE } from './editorial-model';
import { StatusBadge } from './EditorialBits';

// =====================================================================
// One editorial item: read it, or (for the Media team, on a computer)
// change it. The same panel either way, so a reader and an editor look
// at the same thing.
//
// THE LINKED EVENT IS KEPT. The old editor never sent `event_id` back,
// and the server writes what it is sent, so saving any change to an item
// quietly unlinked it from its event. The form now carries it, and it can
// be chosen here.
// =====================================================================

function Pill({ on, onClick, children, title }: { on: boolean; onClick: () => void; children: React.ReactNode; title?: string }) {
  return (
    <button
      type="button" onClick={onClick} aria-pressed={on} title={title}
      className={`h-9 px-3 inline-flex items-center gap-1.5 border font-body text-sm transition-colors ${
        on ? 'border-accent bg-accent text-accent-foreground' : 'border-separator bg-background text-foreground hover:bg-muted'
      }`}
    >
      {children}
    </button>
  );
}

export function EditorialItemSheet({ open, initial, item, events, canEdit, readOnlyReason, saving, onSave, onDelete, onClose }: {
  open: boolean;
  /** What the form starts from: an item's values, or a new item's. */
  initial: EditorialInput;
  /** The stored item, when an existing one is open. */
  item: EditorialItem | null;
  events: EventRow[];
  canEdit: boolean;
  /** Why a reader cannot edit, in a sentence. */
  readOnlyReason: string;
  saving: boolean;
  onSave: (v: EditorialInput) => void;
  onDelete: () => void;
  onClose: () => void;
}) {
  const wide = useMedia('(min-width: 640px)');
  const [form, setForm] = useState<EditorialInput>(initial);
  const [confirmDelete, setConfirmDelete] = useState(false);
  useEffect(() => { if (open) setForm(initial); }, [open, initial]);

  const linked = events.find((e) => e.id === form.event_id) ?? null;
  // Events worth linking: the current link, then anything from a month ago on.
  const monthAgo = new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10);
  const eventChoices = events
    .filter((e) => !e.aod_day_id && ((e.start_at || e.date || '') >= monthAgo || e.id === form.event_id))
    .sort((a, b) => (a.start_at || a.date || '').localeCompare(b.start_at || b.date || ''));

  const title = item ? (canEdit ? 'Edit item' : item.title) : 'New item';

  return (
    <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
      <SheetContent side={wide ? 'right' : 'bottom'} className={wide ? 'w-full sm:max-w-[32rem] overflow-y-auto p-0' : 'max-h-[88vh] overflow-y-auto p-0'}>
        <div className="font-body">
          <SheetHeader className="space-y-1.5 border-b border-separator px-6 pb-4 pt-6 text-left">
            <SheetTitle className="pr-8 font-serif text-[24px] font-normal leading-tight text-accent">{title}</SheetTitle>
            <SheetDescription className="text-[14px] text-muted-foreground">
              {item && !canEdit ? describeDestinations(normalisedDestinations(item).platforms, normalisedDestinations(item).formats) : canEdit ? 'One piece of content: where it goes, when, and how far along it is.' : ''}
            </SheetDescription>
          </SheetHeader>

          {!canEdit && item ? (
            // ---- Reading ---------------------------------------------
            <div className="space-y-5 px-6 py-5 text-[15px]">
              <div className="flex flex-wrap items-center gap-2">
                <StatusBadge status={item.status} />
                {item.paid && <span className="border border-separator px-2 text-[12px] leading-6">Paid advertising</span>}
              </div>
              <dl className="grid grid-cols-[7.5rem_1fr] gap-x-3 gap-y-2">
                <dt className="text-muted-foreground">When</dt>
                <dd>{item.scheduled_date ? `${longDay(item.scheduled_date.slice(0, 10))} (${relativeDay(item.scheduled_date.slice(0, 10)).toLowerCase()})` : 'Not scheduled yet'}</dd>
                <dt className="text-muted-foreground">Where</dt>
                <dd>{describeDestinations(normalisedDestinations(item).platforms, normalisedDestinations(item).formats)}</dd>
                {item.responsible_person && (<><dt className="text-muted-foreground">Responsible</dt><dd>{item.responsible_person}</dd></>)}
                {linked && (<><dt className="text-muted-foreground">For the event</dt><dd>{linked.title}<span className="block text-[13px] text-muted-foreground">{formatEventWhen(linked)}</span></dd></>)}
              </dl>
              {item.notes && <p className="whitespace-pre-line border-t border-separator pt-4 text-foreground/90">{item.notes}</p>}
              <p className="border border-separator bg-muted/30 p-3 text-[13px] text-muted-foreground">{readOnlyReason}</p>
            </div>
          ) : (
            // ---- Editing ---------------------------------------------
            <div className="space-y-5 px-6 py-5">
              <div className="space-y-1.5">
                <Label htmlFor="ed-title">What to promote *</Label>
                <Input id="ed-title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="e.g. Guest speaker announcement" />
              </div>

              <div className="space-y-1.5">
                <Label>Status</Label>
                <div className="flex flex-wrap gap-1.5">
                  {STATUS_ORDER.map((s) => (
                    <Pill key={s} on={form.status === s} onClick={() => setForm({ ...form, status: s })} title={STATUS_STYLE[s].hint}>
                      {STATUS_STYLE[s].icon('h-3.5 w-3.5')}{ED_STATUS_LABELS[s]}
                    </Pill>
                  ))}
                </div>
                <p className="text-xs text-muted-foreground">{STATUS_STYLE[form.status].hint}</p>
              </div>

              {/* WHERE IT GOES, AND WHAT IT IS IN EACH PLACE: one item, however
                  many destinations, each with its own format. The last
                  destination cannot be removed: an item has to go somewhere. */}
              <div className="space-y-1.5">
                <Label>Where it goes</Label>
                <div className="flex flex-wrap gap-1.5">
                  {PLATFORM_ORDER.map((p) => {
                    const on = form.platforms.includes(p);
                    const only = on && form.platforms.length === 1;
                    return (
                      <Pill key={p} on={on} onClick={() => setForm({ ...form, ...togglePlatform(form.platforms, form.formats, p) })}
                        title={only ? 'An item has to go somewhere: add another destination before removing this one.' : undefined}>
                        {PLATFORM_ICON[p]('h-4 w-4')}{PLATFORM_LABELS[p]}
                      </Pill>
                    );
                  })}
                </div>
              </div>
              {form.platforms.map((p) => (
                <div key={p} className="space-y-1.5">
                  <Label>{form.platforms.length > 1 ? `Format on ${PLATFORM_LABELS[p]}` : 'Format'}</Label>
                  <div className="flex flex-wrap gap-1.5">
                    {FORMATS_BY_PLATFORM[p].map((f) => (
                      <Pill key={f} on={form.formats[form.platforms.indexOf(p)] === f} onClick={() => setForm({ ...form, formats: setFormatFor(form.platforms, form.formats, p, f) })}>
                        {FORMAT_SHORT_LABELS[f]}
                      </Pill>
                    ))}
                  </div>
                </div>
              ))}

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="ed-date">Publishing date</Label>
                  <Input id="ed-date" type="date" value={form.scheduled_date ?? ''} onChange={(e) => setForm({ ...form, scheduled_date: e.target.value })} />
                  {form.scheduled_date ? (
                    <button type="button" onClick={() => setForm({ ...form, scheduled_date: '' })} className="text-xs text-accent hover:underline">No date yet</button>
                  ) : <p className="text-xs text-muted-foreground">Without a date it waits in Unscheduled.</p>}
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="ed-owner">Responsible</Label>
                  <Input id="ed-owner" value={form.responsible_person ?? ''} onChange={(e) => setForm({ ...form, responsible_person: e.target.value })} placeholder="e.g. Jane Smith" />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label>For an event</Label>
                <Select value={form.event_id ?? 'none'} onValueChange={(v) => setForm({ ...form, event_id: v === 'none' ? null : v })}>
                  <SelectTrigger><SelectValue placeholder="Not linked to an event" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Not linked to an event</SelectItem>
                    {eventChoices.map((e) => (
                      <SelectItem key={e.id} value={e.id}>{e.title} · {formatEventWhen(e, { weekday: false, month: 'short' })}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {linked && <p className="flex items-center gap-1.5 text-xs text-muted-foreground"><CalendarDays className="h-3.5 w-3.5" />{formatEventWhen(linked)}</p>}
              </div>

              <div className="flex items-center justify-between border border-separator px-3 py-2.5">
                <Label htmlFor="ed-paid" className="cursor-pointer">Paid advertising</Label>
                <Switch id="ed-paid" checked={!!form.paid} onCheckedChange={(v) => setForm({ ...form, paid: v })} />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="ed-notes">Notes</Label>
                <Textarea id="ed-notes" rows={3} value={form.notes ?? ''} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Copy, links, anything the team should know" />
              </div>

              <div className="flex flex-wrap gap-2 border-t border-separator pt-4">
                <Button variant="solid" className="flex-1" disabled={saving || !form.title.trim()} onClick={() => onSave({ ...form, title: form.title.trim() })}>
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}{item ? 'Save changes' : 'Add to the plan'}
                </Button>
                <Button variant="outline" onClick={onClose} disabled={saving}>Cancel</Button>
                {item && (
                  <Button variant="outline" className="border-destructive/50 text-destructive hover:bg-destructive hover:text-destructive-foreground" onClick={() => setConfirmDelete(true)} aria-label="Delete this item">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>
          )}
        </div>
      </SheetContent>

      <AlertDialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="font-serif">Delete this item?</AlertDialogTitle>
            <AlertDialogDescription className="font-body">
              "{item?.title}" is removed from the plan for everybody. To keep it for the record, set it to Cancelled instead.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="font-body">Keep it</AlertDialogCancel>
            <AlertDialogAction className="font-body bg-destructive text-destructive-foreground hover:bg-destructive/90" onClick={() => { setConfirmDelete(false); onDelete(); }}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Sheet>
  );
}
