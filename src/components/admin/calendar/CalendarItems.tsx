import type { ReactNode } from 'react';
import { Check, CircleCheck, Hourglass, Loader2, Lock, Mail, QrCode, BellRing, MousePointerClick, Ticket } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { monthShort, weekdayShort } from '@/lib/calendar-dates';
import { EVENT_TYPE_LABELS } from '@/lib/events-api';
import { CATEGORY, categoryOf, isBoardOnly, itemTime, type CalItem, type RegState } from './calendar-model';

// =====================================================================
// How one item looks: in a month cell, as a row of the agenda, and the
// badge that says where the reader stands with an event.
// =====================================================================

/** The glyph for a registration state, where one is worth drawing. */
function stateGlyph(state: RegState | undefined) {
  if (state === 'registered') return <CircleCheck aria-hidden className="h-3.5 w-3.5 shrink-0 text-emerald-700" />;
  if (state === 'waiting') return <Hourglass aria-hidden className="h-3.5 w-3.5 shrink-0 text-amber-700" />;
  if (state === 'open' || state === 'full') return <Ticket aria-hidden className="h-3.5 w-3.5 shrink-0 text-accent" />;
  return null;
}

/** Words for the accessible name of a chip. */
function stateWords(state: RegState | undefined): string {
  if (state === 'registered') return ', you are registered';
  if (state === 'waiting') return ', you are on the waiting list';
  if (state === 'open') return ', registration open';
  if (state === 'full') return ', full, waiting list open';
  return '';
}

/** An item inside a month cell: icon, title (two lines at most) and state. */
export function ItemChip({ item, state, onOpen }: { item: CalItem; state?: RegState; onOpen: () => void }) {
  const cat = CATEGORY[categoryOf(item)];
  const time = itemTime(item);
  const past = state === 'past';
  return (
    <button
      data-ro type="button"
      onClick={(e) => { e.stopPropagation(); onOpen(); }}
      onDoubleClick={(e) => e.stopPropagation()}
      aria-label={`${item.title}, ${cat.label}${time ? `, ${time}` : ''}${stateWords(state)}`}
      title={item.title}
      className={`group/chip relative flex w-full items-start gap-1 overflow-hidden pl-2 pr-1 py-[3px] text-left text-[12px] leading-[1.3] ${cat.chip} ${past ? 'opacity-60' : ''} hover:ring-1 hover:ring-accent/40 focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent`}
    >
      <span aria-hidden className={`absolute inset-y-0 left-0 w-[3px] ${cat.bar}`} />
      <span aria-hidden className="mt-[1px] shrink-0 opacity-75">{cat.icon('h-3 w-3')}</span>
      <span className="min-w-0 flex-1">
        {time && <span className="hidden 2xl:inline tabular-nums text-muted-foreground mr-1">{time}</span>}
        <span className="line-clamp-2 break-words">{item.title}</span>
      </span>
      {stateGlyph(state) && <span className="mt-[2px] shrink-0">{stateGlyph(state)}</span>}
    </button>
  );
}

/** A small badge for a registration state. */
export function RegBadge({ state, compact = false }: { state: RegState; compact?: boolean }) {
  const map: Partial<Record<RegState, { cls: string; icon: ReactNode; text: string }>> = {
    registered: { cls: 'border-emerald-600/40 bg-emerald-50 text-emerald-800', icon: <Check className="h-3 w-3" />, text: 'Registered' },
    waiting: { cls: 'border-amber-500/50 bg-amber-50 text-amber-900', icon: <Hourglass className="h-3 w-3" />, text: compact ? 'Waiting list' : 'On the waiting list' },
    open: { cls: 'border-accent/30 bg-accent/5 text-accent', icon: <span className="h-1.5 w-1.5 rounded-full bg-accent" />, text: 'Open' },
    full: { cls: 'border-accent/30 bg-background text-accent', icon: <Hourglass className="h-3 w-3" />, text: 'Full: waiting list' },
    started: { cls: 'border-separator bg-muted/40 text-muted-foreground', icon: <Lock className="h-3 w-3" />, text: 'Under way' },
    past: { cls: 'border-separator bg-muted/40 text-muted-foreground', icon: null, text: 'Taken place' },
  };
  const m = map[state];
  if (!m) return null;
  return (
    <span className={`inline-flex h-6 shrink-0 items-center gap-1 border px-2 font-body text-[12px] ${m.cls}`}>
      {m.icon}{m.text}
    </span>
  );
}

/** The day as a block: "THU / 1 / Oct". */
export function DateBlock({ ymd, muted = false }: { ymd: string; muted?: boolean }) {
  return (
    <div className={`flex w-12 shrink-0 flex-col items-center justify-center border py-1 font-body leading-none ${muted ? 'border-separator text-muted-foreground' : 'border-accent/30 text-accent'}`}>
      <span className="text-[10px] uppercase tracking-wider">{weekdayShort(ymd)}</span>
      <span className="font-serif text-[22px] leading-[1.1]">{Number(ymd.slice(8, 10))}</span>
      <span className="text-[10px] uppercase tracking-wider">{monthShort(ymd)}</span>
    </div>
  );
}

/** A row of the agenda: time, what it is, and the one action it offers. */
export function AgendaRow({ item, state, placesText, onOpen, action }: {
  item: CalItem;
  state?: RegState;
  placesText?: string;
  onOpen: () => void;
  /** The primary action, such as Register, drawn on the right. */
  action?: ReactNode;
}) {
  const cat = CATEGORY[categoryOf(item)];
  const time = itemTime(item);
  const meta = [
    item.event ? EVENT_TYPE_LABELS[item.event.event_type] : cat.label,
    item.event?.place || item.entry?.location || item.note || '',
    placesText || '',
  ].filter(Boolean);
  const hasSide = (state && state !== 'none' && state !== 'open') || !!action;
  return (
    <div className={`grid grid-cols-[3.75rem_minmax(0,1fr)] bg-background sm:grid-cols-[4.75rem_minmax(0,1fr)_auto] ${state === 'past' ? 'opacity-70' : ''}`}>
      <div className="pr-2 pt-3 text-right font-body text-[13px] tabular-nums leading-tight text-muted-foreground">
        {time || 'All day'}
      </div>
      <button
        data-ro type="button" onClick={onOpen}
        className="group relative flex min-w-0 items-start gap-2.5 py-2.5 pl-3.5 pr-2 text-left hover:bg-accent/[0.04] focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent"
      >
        <span aria-hidden className={`absolute inset-y-2 left-0 w-[3px] ${cat.bar}`} />
        <span aria-hidden className={`mt-0.5 inline-flex h-6 w-6 shrink-0 items-center justify-center ${cat.chip}`}>{cat.icon('h-3.5 w-3.5')}</span>
        <span className="min-w-0 flex-1">
          <span className="block font-body text-[15px] font-medium leading-snug text-foreground group-hover:text-accent">{item.title}</span>
          <span className="mt-0.5 block font-body text-[13px] leading-snug text-muted-foreground">
            {meta.join(' · ')}
            {isBoardOnly(item) && <span className="ml-1.5 border border-separator px-1 text-[11px] uppercase tracking-wide">Board only</span>}
          </span>
        </span>
      </button>
      {hasSide && (
        <div className="col-start-2 flex flex-wrap items-center gap-2 pb-2.5 pl-[2.9rem] pr-2 sm:col-start-auto sm:flex-nowrap sm:pb-0 sm:pl-0">
          {state && state !== 'none' && state !== 'open' && <RegBadge state={state} compact />}
          {action}
        </div>
      )}
    </div>
  );
}

/** The Register / Join the waiting list button, sized for a row or a card. */
export function RegisterButton({ state, busy, onClick, size = 'sm', className = '' }: {
  state: RegState; busy: boolean; onClick: () => void; size?: 'sm' | 'default'; className?: string;
}) {
  if (state !== 'open' && state !== 'full') return null;
  return (
    <Button
      data-ro size={size} variant={state === 'open' ? 'solid' : 'outline'} disabled={busy}
      onClick={(e) => { e.stopPropagation(); onClick(); }}
      className={`font-body ${className}`}
    >
      {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
      {state === 'open' ? 'Register' : 'Join the waiting list'}
    </Button>
  );
}

// =====================================================================
// WHAT HAPPENS WHEN YOU REGISTER, SAID BEFORE YOU DO IT.
// ---------------------------------------------------------------------
// Four steps, the whole journey from the button to the door. Shown in
// full under "How registration works", and in an event's details with the
// steps already behind the reader ticked, so a member who has registered
// can see what is still to come.
// =====================================================================
const STEPS = [
  { icon: MousePointerClick, title: 'Register', text: 'One click here. Your details come from your account, so there is no form.' },
  { icon: Mail, title: 'Confirmation email', text: 'With your entry code (a QR code) and Add to calendar. If the event is full you join the waiting list instead, and are emailed if a place opens up.' },
  { icon: BellRing, title: 'Reminder the day before', text: 'The same entry code, and a link to cancel if you can no longer come, so your place goes to somebody else.' },
  { icon: QrCode, title: 'At the door', text: 'Show the code on your phone and you are checked in.' },
];

export function RegistrationSteps({ state, compact = false }: { state?: RegState; compact?: boolean }) {
  // How many steps are behind the reader.
  const done = state === 'registered' ? 2 : state === 'waiting' ? 1 : state === 'past' ? 4 : 0;
  return (
    <ol className={`grid gap-3 font-body ${compact ? 'grid-cols-1' : 'sm:grid-cols-2 xl:grid-cols-4'}`}>
      {STEPS.map((s, i) => {
        const Icon = s.icon;
        const isDone = i < done;
        const isNext = i === done && !!state && state !== 'none';
        return (
          <li key={s.title} className={`flex gap-2.5 ${compact ? '' : 'border border-separator bg-background p-3'}`}>
            <span className={`mt-0.5 inline-flex h-7 w-7 shrink-0 items-center justify-center text-[13px] ${
              isDone ? 'bg-emerald-600 text-white' : isNext ? 'bg-accent text-accent-foreground' : 'border border-separator text-muted-foreground'
            }`} aria-hidden>
              {isDone ? <Check className="h-4 w-4" /> : <Icon className="h-3.5 w-3.5" />}
            </span>
            <span className="min-w-0">
              <span className="block text-[14px] font-medium text-foreground">
                <span className="sr-only">{isDone ? 'Done: ' : isNext ? 'Next: ' : ''}</span>
                {i + 1}. {s.title}
              </span>
              <span className="mt-0.5 block text-[13px] leading-snug text-muted-foreground">{s.text}</span>
            </span>
          </li>
        );
      })}
    </ol>
  );
}
