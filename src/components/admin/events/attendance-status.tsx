import { Check, CircleSlash, UserX } from 'lucide-react';
import type { MyHistoryStatus } from '@/lib/events-api';

// =====================================================================
// Attended or missed, said the same way in Members and in My events.
// ---------------------------------------------------------------------
// Present means ticked or scanned in at the event. Missed is everything
// else, and the two kinds of missed are kept apart, because "registered
// but not ticked" is the one an attendance mistake looks like.
// =====================================================================

const STATUS_LABEL: Record<MyHistoryStatus, string> = {
  attended: 'Attended',
  registered_absent: 'Missed: registered, not marked present',
  not_registered: 'Missed: not registered',
};

const LOOK: Record<MyHistoryStatus, { cls: string; Icon: typeof Check }> = {
  // The registration badges' own colours (calendar/CalendarItems.tsx).
  attended: { cls: 'border-emerald-600/40 bg-emerald-50 text-emerald-800', Icon: Check },
  registered_absent: { cls: 'border-amber-500/50 bg-amber-50 text-amber-900', Icon: UserX },
  not_registered: { cls: 'border-separator bg-muted text-muted-foreground', Icon: CircleSlash },
};

export function AttendanceStatus({ status, short = false }: { status: MyHistoryStatus; short?: boolean }) {
  const { cls, Icon } = LOOK[status];
  const label = short
    ? status === 'attended' ? 'Attended' : status === 'registered_absent' ? 'Registered, not present' : 'Not registered'
    : STATUS_LABEL[status];
  return (
    <span className={`inline-flex items-center gap-1 border px-1.5 py-0.5 font-body text-[12px] leading-tight ${cls}`}>
      <Icon aria-hidden className="h-3.5 w-3.5 shrink-0" />{label}
    </span>
  );
}
