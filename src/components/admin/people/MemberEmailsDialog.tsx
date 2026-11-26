import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { formatStamp } from '@/lib/event-time';
import type { MemberEmail } from '@/lib/ops-api';

// =====================================================================
// People > Members: the automatic emails behind one member's number
// (Step 110). Every automatic email sent to the member's address since
// the semester began, newest first, with its outcome as the Sent Emails
// register (Settings) records it. Opened by pressing the number in the
// Emails column, for the roles that read that register.
// =====================================================================

export interface MemberEmailsTarget {
  name: string;
  semester: string;
  items: MemberEmail[];
}

const OUTCOME: Record<string, { label: string; tone: string }> = {
  sent: { label: 'Received', tone: 'text-green-700' },
  pending: { label: 'Waiting to go', tone: 'text-muted-foreground' },
  rate_limited: { label: 'Waiting to go', tone: 'text-muted-foreground' },
  suppressed: { label: 'Not sent (unsubscribed)', tone: 'text-muted-foreground' },
  failed: { label: 'Failed', tone: 'text-destructive' },
  bounced: { label: 'Bounced', tone: 'text-destructive' },
  complained: { label: 'Marked as spam', tone: 'text-destructive' },
  dlq: { label: 'Set aside', tone: 'text-destructive' },
};

export function MemberEmailsDialog({ target, onClose }: { target: MemberEmailsTarget | null; onClose: () => void }) {
  const items = target?.items ?? [];
  const received = items.filter((i) => i.status === 'sent').length;
  return (
    <Dialog open={!!target} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="max-h-[85vh] max-w-lg overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-serif text-2xl font-normal text-accent">{target?.name}</DialogTitle>
          <DialogDescription>
            {target ? `${received} automatic ${received === 1 ? 'email' : 'emails'} received since ${target.semester} began.` : ''}
          </DialogDescription>
        </DialogHeader>
        {items.length === 0 ? (
          <p className="border border-dashed border-separator px-4 py-5 font-body text-sm text-muted-foreground">
            No automatic email has been sent to this address this semester.
          </p>
        ) : (
          <ul className="divide-y divide-separator border border-separator font-body">
            {items.map((m) => {
              const o = OUTCOME[m.status] ?? { label: m.status, tone: 'text-muted-foreground' };
              return (
                <li key={m.key} className="flex flex-col gap-1 px-3 py-2.5 sm:flex-row sm:items-center sm:justify-between sm:gap-3">
                  <span className="min-w-0">
                    <span className="block text-[12px] uppercase tracking-wider text-muted-foreground">{formatStamp(m.at)}</span>
                    <span className="block text-[15px] leading-snug text-foreground">{m.label}</span>
                  </span>
                  <span className={`shrink-0 text-sm ${o.tone}`}>{o.label}</span>
                </li>
              );
            })}
          </ul>
        )}
        <p className="font-body text-xs text-muted-foreground">Every email the workspace sends, and to whom, is in Settings, Sent Emails.</p>
      </DialogContent>
    </Dialog>
  );
}
