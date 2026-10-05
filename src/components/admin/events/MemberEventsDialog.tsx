import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { formatDay } from '@/lib/event-time';
import type { HeldEvent, MyHistoryStatus } from '@/lib/events-api';
import { AttendanceStatus } from './attendance-status';

// =====================================================================
// People > Members: the events behind one member's "3/8".
// ---------------------------------------------------------------------
// The semester's events held so far with attendance taken, each one
// attended or missed, and a missed one says whether the member had
// registered. Opened by pressing the number in the Events column.
// =====================================================================

export interface MemberEventsTarget {
  name: string;
  semester: string;
  events: HeldEvent[];
  attended: Set<string>;
  registered: Set<string>;
}

export function MemberEventsDialog({ target, onClose }: { target: MemberEventsTarget | null; onClose: () => void }) {
  const rows = (target?.events ?? []).map((e) => ({
    ...e,
    status: (target!.attended.has(e.id) ? 'attended' : target!.registered.has(e.id) ? 'registered_absent' : 'not_registered') as MyHistoryStatus,
  }));
  const went = rows.filter((r) => r.status === 'attended').length;
  return (
    <Dialog open={!!target} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="max-h-[85vh] max-w-lg overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-serif text-2xl font-normal text-accent">{target?.name}</DialogTitle>
          <DialogDescription>
            {target ? `${went} of ${rows.length} events attended in ${target.semester}, counting the events held so far where attendance was taken.` : ''}
          </DialogDescription>
        </DialogHeader>
        {rows.length === 0 ? (
          <p className="border border-dashed border-separator px-4 py-5 font-body text-sm text-muted-foreground">
            No event has had its attendance taken yet this semester.
          </p>
        ) : (
          <ul className="divide-y divide-separator border border-separator font-body">
            {rows.map((r) => (
              <li key={r.id} className="flex flex-col gap-1.5 px-3 py-2.5 sm:flex-row sm:items-center sm:justify-between sm:gap-3">
                <span className="min-w-0">
                  <span className="block text-[12px] uppercase tracking-wider text-muted-foreground">{formatDay(r.start_at || r.date, { month: 'short' })}</span>
                  <span className="block text-[15px] leading-snug text-foreground">{r.title}</span>
                </span>
                <span className="shrink-0"><AttendanceStatus status={r.status} short /></span>
              </li>
            ))}
          </ul>
        )}
      </DialogContent>
    </Dialog>
  );
}
