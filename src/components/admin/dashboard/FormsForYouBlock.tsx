import { Link } from 'react-router-dom';
import { ClipboardList } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import type { MyFormSummary } from '@/lib/internal-forms-api';
import { formatDay } from '@/lib/event-time';
import { deadlineRelative } from '@/components/admin/forms/forms-model';

// =====================================================================
// Forms for you: the internal forms open to this member, on the Dashboard.
// ---------------------------------------------------------------------
// A strip under the greeting, there only while a form is open: what to
// answer first (by deadline), then what was already answered, with its
// payment. Each opens the form's own page. It loads with the rest of the
// Dashboard, so it is in place when the page appears; a slow answer is
// not waited for beyond a moment, and the next visit reads it from
// memory (useMyForms.ts). Only active members are sent anything: the
// server decides.
// =====================================================================

function statusOf(f: MyFormSummary): string {
  if (!f.answered_at) return f.closes_at ? deadlineRelative(f.closes_at) : 'No deadline';
  const when = `Answered ${formatDay(f.answered_at, { weekday: false, month: 'short' })}`;
  if (!f.track_payments) return when;
  return `${when} · ${f.paid ? 'paid' : 'payment pending'}`;
}

function Item({ f }: { f: MyFormSummary }) {
  const answered = !!f.answered_at;
  return (
    <li className="flex min-w-0 items-center gap-3">
      <div className="min-w-0 flex-1 lg:flex-none">
        <p className="truncate text-sm text-foreground lg:max-w-[18rem]" title={f.title}>{f.title}</p>
        <p className={`text-xs ${!answered && f.closes_at && new Date(f.closes_at).getTime() - Date.now() < 2 * 86400000 ? 'text-destructive' : 'text-muted-foreground'}`}>{statusOf(f)}</p>
      </div>
      <Button asChild size="sm" variant={answered ? 'outline' : 'solid'} className="shrink-0">
        <Link to={`/forms/${f.id}`}>{answered ? (f.allow_edits ? 'View or change' : 'View') : 'Answer'}</Link>
      </Button>
    </li>
  );
}

export default function FormsForYouBlock({ forms, style }: { forms: MyFormSummary[]; style?: React.CSSProperties }) {
  if (!forms.length) return null;
  const ordered = [...forms.filter((f) => !f.answered_at), ...forms.filter((f) => !!f.answered_at)];
  const toAnswer = forms.filter((f) => !f.answered_at).length;
  const shown = ordered.slice(0, 3);
  const rest = ordered.slice(3);
  return (
    <section aria-labelledby="forms-for-you" className="dash-enter-soft shrink-0 rounded-xl border border-separator bg-background px-4 py-3 font-body" style={style}>
      <div className="flex flex-col gap-2.5 lg:flex-row lg:items-center lg:gap-6">
        <div className="flex shrink-0 items-baseline gap-2">
          <ClipboardList aria-hidden className="h-4 w-4 translate-y-0.5 text-accent" />
          <h2 id="forms-for-you" className="font-serif text-lg leading-tight text-accent">Forms for you</h2>
          <span className="text-xs text-muted-foreground">{toAnswer ? `${toAnswer} to answer` : 'All answered'}</span>
        </div>
        <ul className="flex min-w-0 flex-1 flex-col gap-2.5 lg:flex-row lg:flex-wrap lg:items-center lg:gap-x-8">
          {shown.map((f) => <Item key={f.id} f={f} />)}
          {rest.length > 0 && (
            <li>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="ghost" size="sm" className="text-accent">{rest.length} more</Button>
                </PopoverTrigger>
                <PopoverContent align="end" className="w-[min(92vw,24rem)] p-3 font-body">
                  <ul className="space-y-3">{rest.map((f) => <Item key={f.id} f={f} />)}</ul>
                </PopoverContent>
              </Popover>
            </li>
          )}
        </ul>
      </div>
    </section>
  );
}
