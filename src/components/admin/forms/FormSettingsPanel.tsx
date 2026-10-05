// =====================================================================
// A form's settings: the deadline, changes after sending, the payment,
// and the message members read once they have sent their answers.
// ---------------------------------------------------------------------
// Each setting says what it does to the member, in the member's terms,
// because that is the question the organiser is really asking.
// =====================================================================

import { useState } from 'react';
import { CalendarClock, CreditCard, Loader2, MailCheck, MessageSquareText, PencilLine } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { romeWall, romeWallToIso, zoneOnDate } from '@/lib/event-time';
import { hasPrices } from '@/lib/internal-forms-rules';
import type { InternalForm } from '@/lib/internal-forms-api';
import { deadlineRelative, deadlineText } from './forms-model';

function Block({ icon: Icon, title, children }: { icon: typeof CalendarClock; title: string; children: React.ReactNode }) {
  return (
    <section className="border border-separator p-4 sm:p-5">
      <h3 className="mb-3 flex items-center gap-2 font-serif text-lg text-accent"><Icon aria-hidden className="h-4 w-4" />{title}</h3>
      <div className="space-y-3 font-body">{children}</div>
    </section>
  );
}

export function FormSettingsPanel({ form, set, readOnly, dirty = false, onTestReceipt }: {
  form: InternalForm;
  set: (patch: Partial<InternalForm>) => void;
  readOnly: boolean;
  /** Unsaved changes: the test sends the form as last saved. */
  dirty?: boolean;
  /** Emails the organiser the receipt this form sends, with sample answers. */
  onTestReceipt?: () => Promise<void>;
}) {
  const [testing, setTesting] = useState(false);
  const test = async () => {
    if (!onTestReceipt) return;
    setTesting(true);
    try { await onTestReceipt(); } finally { setTesting(false); }
  };
  const wall = romeWall(form.closes_at);
  const setDeadline = (date: string, time: string) => {
    if (!date) { set({ closes_at: null }); return; }
    set({ closes_at: romeWallToIso(date, time || '23:59') });
  };
  const past = form.closes_at ? new Date(form.closes_at).getTime() <= Date.now() : false;

  return (
    <div className="grid max-w-4xl gap-4">
      <Block icon={CalendarClock} title="Deadline">
        <label className="flex items-center gap-2 text-sm">
          <Switch checked={!!form.closes_at} disabled={readOnly}
            onCheckedChange={(on) => { if (!on) set({ closes_at: null }); else { const d = new Date(Date.now() + 7 * 86400000); setDeadline(romeWall(d).date, '23:59'); } }} />
          The form closes by itself at a set moment
        </label>
        {form.closes_at && (
          <div className="flex flex-wrap items-end gap-3">
            <div className="space-y-1">
              <Label htmlFor="deadline-date" className="text-xs">Date</Label>
              <Input id="deadline-date" type="date" className="h-10 w-44" disabled={readOnly} value={wall.date} onChange={(e) => setDeadline(e.target.value, wall.time)} />
            </div>
            <div className="space-y-1">
              <Label htmlFor="deadline-time" className="text-xs">Time, Rome ({wall.date ? zoneOnDate(wall.date) : 'CET'})</Label>
              <Input id="deadline-time" type="time" className="h-10 w-36" disabled={readOnly} value={wall.time} onChange={(e) => setDeadline(wall.date, e.target.value)} />
            </div>
          </div>
        )}
        <p className={`text-sm ${past ? 'text-destructive' : 'text-muted-foreground'}`}>
          {form.closes_at
            ? past
              ? `This moment has passed (${deadlineText(form.closes_at)}): the form takes no answers. Move the deadline to open it again.`
              : `Members can answer until ${deadlineText(form.closes_at)} (${deadlineRelative(form.closes_at).toLowerCase()}). After that the form closes by itself, and the Dashboard stops showing it.`
            : 'No deadline: the form stays open until you close it.'}
        </p>
      </Block>

      <Block icon={PencilLine} title="Changing answers">
        <label className="flex items-start gap-2 text-sm">
          <Switch className="mt-0.5" checked={form.allow_edits} disabled={readOnly} onCheckedChange={(v) => set({ allow_edits: v })} />
          <span>Members can change their answers while the form is open<span className="block text-muted-foreground">Each member answers once; with this on they can come back, change it, and receive a new receipt. Off, the first answer is final.</span></span>
        </label>
      </Block>

      <Block icon={CreditCard} title="Payment">
        <label className="flex items-start gap-2 text-sm">
          <Switch className="mt-0.5" checked={form.track_payments} disabled={readOnly} onCheckedChange={(v) => set({ track_payments: v })} />
          <span>This form collects a payment<span className="block text-muted-foreground">Each answer gets a Paid box to tick when the money reaches the Society, with who ticked it and when. Members see what they owe and how to pay.</span></span>
        </label>
        {form.track_payments && (
          <p className="text-sm text-muted-foreground">
            {hasPrices(form.fields)
              ? `Members pay for what they order: the prices are on the choices in Questions${form.payment_amount != null ? ', plus the fixed amount below' : ''}. Each member's total is worked out when they send, and kept with their answer.`
              : 'Put a price on choices in Questions to charge for what each member orders, or set one fixed amount for every answer below.'}
          </p>
        )}
        {form.track_payments && (
          <div className="grid gap-3 sm:grid-cols-[10rem_minmax(0,1fr)]">
            <div className="space-y-1">
              <Label htmlFor="pay-amount" className="text-xs">{hasPrices(form.fields) ? 'Fixed amount added (EUR)' : 'Amount per answer (EUR)'}</Label>
              <Input id="pay-amount" type="number" min={0} step="0.01" className="h-10" disabled={readOnly} value={form.payment_amount ?? ''}
                onChange={(e) => set({ payment_amount: e.target.value === '' ? null : Number(e.target.value) })} placeholder="Optional" />
            </div>
            <div className="space-y-1">
              <Label htmlFor="pay-how" className="text-xs">How to pay</Label>
              <Textarea id="pay-how" rows={2} maxLength={1000} disabled={readOnly} value={form.payment_instructions ?? ''}
                onChange={(e) => set({ payment_instructions: e.target.value })}
                placeholder="e.g. Bank transfer to the Society account, with your name in the description." />
            </div>
          </div>
        )}
      </Block>

      <Block icon={MessageSquareText} title="After sending">
        <div className="space-y-1">
          <Label htmlFor="confirm-msg" className="text-xs">A message for the member (optional)</Label>
          <Textarea id="confirm-msg" rows={3} maxLength={1000} disabled={readOnly} value={form.confirmation_message ?? ''}
            onChange={(e) => set({ confirmation_message: e.target.value })}
            placeholder="e.g. Thank you! Hoodies arrive in about three weeks; we will tell you when and where to collect yours." />
        </div>
        <p className="text-sm text-muted-foreground">Shown on the page once they have sent, and in the receipt email every member receives with a copy of their answers.</p>
        {onTestReceipt && (
          <div className="flex flex-col gap-2 border-t border-separator pt-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-muted-foreground">
              See the receipt as a member gets it: it is sent to your own address, with sample answers.
              {dirty ? ' It uses the form as last saved.' : ''}
            </p>
            <Button data-ro type="button" variant="outline" size="sm" className="shrink-0" onClick={test} disabled={testing}>
              {testing ? <Loader2 className="h-4 w-4 animate-spin" /> : <MailCheck className="h-4 w-4" />}Send me a test receipt
            </Button>
          </div>
        )}
      </Block>
    </div>
  );
}
