import { useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Clock, Loader2, Phone, Trash2, User } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { useAccess } from '@/hooks/useAccess';
import { WorkspacePageHeader } from '@/components/admin/WorkspacePageHeader';
import { WorkspaceLoader } from '@/components/admin/WorkspaceLoader';
import { useEmailConfirm } from '@/components/admin/EmailConfirmDialog';
import { useCandidateDetail } from '@/components/admin/recruiting/useCandidateDetail';
import { CandidateProfile, CandidateStage } from '@/components/admin/recruiting/CandidateProfile';
import { AddToCalendar } from '@/components/shared/AddToCalendar';
import { formatClockRange } from '@/lib/event-time';
import { currentSemester, semesterOf, semestersInData } from '@/lib/semester';
import { STATUS_LABELS, applyDivisionLabel, statusBadgeClass, addApplicationNote } from '@/lib/applications-api';
import { isFutureSlot } from '@/lib/interviews-api';
import {
  CALL_INVITABLE, CALL_MINUTES, CALL_STAGES, DEFAULT_CALL_MINUTES,
  callsOverview, createCallSlots, deleteCallSlot, inviteToCall, phoneError, recordCallOutcome,
  type CallCandidate, type CallOutcome, type CallsOverview,
} from '@/lib/calls-api';

// =====================================================================
// PhoneCalls: Recruiting, Phone Calls (Step 97).
// ---------------------------------------------------------------------
// The President and the Vice President call the candidates a division
// wants, after the interview and before the offer. One page for the
// whole step: who can be invited, the call slots (smart planning, the
// caller's phone number, how many candidates a slot takes), the calls
// booked, and the outcome with its notes, which moves the candidate on.
// =====================================================================

type View = 'to-invite' | 'invited' | 'booked' | 'on-hold' | 'decided';
const VIEW_LABELS: Record<View, string> = {
  'to-invite': 'To invite', invited: 'Invited', booked: 'Booked', 'on-hold': 'On hold', decided: 'Decided',
};
function viewOf(c: CallCandidate): View {
  if (CALL_INVITABLE.includes(c.status)) return 'to-invite';
  if (c.status === 'call_invitation_sent') return 'invited';
  if (c.status === 'call_confirmed') return 'booked';
  if (c.status === 'call_on_hold') return 'on-hold';
  return 'decided';
}
const OUTCOME_TEXT: Record<CallOutcome, { label: string; effect: string }> = {
  pass: { label: 'Pass', effect: 'The candidate is selected for an offer ("Accepted"). Nothing is sent: they learn of it with the offer, from Offers.' },
  hold: { label: 'Hold', effect: 'The candidacy waits ("On hold after phone call"). Nothing is sent; Pass or Decline can still follow.' },
  decline: { label: 'Decline', effect: 'The candidate is rejected now and receives the usual post-interview rejection email.' },
};

export default function PhoneCalls() {
  const { session } = useAuth();
  const { toast } = useToast();
  const { canManage } = useAccess();
  const manage = canManage('applications-calls');
  const { confirm: confirmEmail, dialog: emailDialog } = useEmailConfirm();
  const {
    openId, detail, cvUrl, answerUrl, loading: detailLoading, docsLoading,
    open: openCandidate, close: closeCandidate, refresh: refreshCandidate,
  } = useCandidateDetail(session);

  const [data, setData] = useState<CallsOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [view, setView] = useState<View>('to-invite');
  const [semKey, setSemKey] = useState(currentSemester().key);

  // Smart planning.
  const [plan, setPlan] = useState({ slot_date: '', start_time: '', end_time: '', slot_minutes: DEFAULT_CALL_MINUTES, capacity: 1, caller_phone: '' });
  // The outcome dialog.
  const [outcomeFor, setOutcomeFor] = useState<CallCandidate | null>(null);
  const [outcome, setOutcome] = useState<CallOutcome | ''>('');
  const [notes, setNotes] = useState('');

  const load = async () => {
    setLoading(true);
    try {
      const d = await callsOverview(session);
      setData(d);
      setPlan((p) => (p.caller_phone ? p : { ...p, caller_phone: d.me.phone || '' }));
    } catch (e) {
      toast({ title: 'Could not load the phone calls', description: e instanceof Error ? e.message : undefined, variant: 'destructive' });
    } finally { setLoading(false); }
  };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { load(); }, []);

  const semesterOptions = useMemo(() => {
    const list = semestersInData((data?.candidates ?? []).map((c) => c.created_at));
    if (!list.some((s) => s.key === currentSemester().key)) list.unshift(currentSemester());
    return list;
  }, [data]);
  const inSemester = useMemo(
    () => (data?.candidates ?? []).filter((c) => semesterOf(c.created_at).key === semKey),
    [data, semKey],
  );
  const counts = useMemo(() => {
    const out: Record<View, number> = { 'to-invite': 0, invited: 0, booked: 0, 'on-hold': 0, decided: 0 };
    for (const c of inSemester) out[viewOf(c)]++;
    return out;
  }, [inSemester]);
  const rows = useMemo(
    () => inSemester.filter((c) => viewOf(c) === view).sort((a, b) => `${a.surname} ${a.first_name}`.localeCompare(`${b.surname} ${b.first_name}`)),
    [inSemester, view],
  );

  // Each candidate's booked call, from the slots.
  const callOf = useMemo(() => {
    const m = new Map<string, { slot: CallsOverview['slots'][number]; bookingId: string }>();
    for (const s of data?.slots ?? []) for (const b of s.bookings) m.set(b.application_id, { slot: s, bookingId: b.id });
    return m;
  }, [data]);

  const upcoming = useMemo(() => (data?.slots ?? []).filter((s) => isFutureSlot(s)), [data]);
  const held = useMemo(() => (data?.slots ?? []).filter((s) => !isFutureSlot(s) && s.bookings.length), [data]);
  const freeTimes = upcoming.filter((s) => s.bookings.length < s.capacity).length;
  const byDay = (list: CallsOverview['slots']) => {
    const map = new Map<string, CallsOverview['slots']>();
    for (const s of list) { if (!map.has(s.slot_date)) map.set(s.slot_date, []); map.get(s.slot_date)!.push(s); }
    return [...map.entries()].sort(([a], [b]) => a.localeCompare(b));
  };

  const run = async (fn: () => Promise<unknown>, done: string) => {
    setBusy(true);
    try { await fn(); toast({ title: done }); await load(); }
    catch (e) { toast({ title: 'That did not work', description: e instanceof Error ? e.message : undefined, variant: 'destructive' }); }
    finally { setBusy(false); }
  };

  const openSlots = async () => {
    const pErr = phoneError(plan.caller_phone);
    if (!plan.slot_date || !plan.start_time || !plan.end_time) { toast({ title: 'Choose a date, a start and an end', variant: 'destructive' }); return; }
    if (pErr) { toast({ title: 'Check your phone number', description: pErr, variant: 'destructive' }); return; }
    setBusy(true);
    try {
      const r = await createCallSlots(session, plan);
      toast({
        title: r.created ? `${r.created} call slot${r.created === 1 ? '' : 's'} opened` : 'No new slot opened',
        description: r.skipped_overlapping ? `${r.skipped_overlapping} overlapped a slot you already have and were left out.` : undefined,
      });
      await load();
    } catch (e) {
      toast({ title: 'Could not open the slots', description: e instanceof Error ? e.message : undefined, variant: 'destructive' });
    } finally { setBusy(false); }
  };

  const invite = async (c: CallCandidate) => {
    const ok = await confirmEmail({
      title: `Invite ${c.first_name} ${c.surname} to a phone call?`,
      description: (
        <>
          <p>They receive the <strong>Phone call invitation</strong> email and a Phone Call page in their workspace, where they book one of the open times within 72 hours. The email says the call is about the Society as a whole, not a technical conversation.</p>
          <p>{freeTimes} free time{freeTimes === 1 ? '' : 's'} open at the moment.</p>
        </>
      ),
      confirmLabel: 'Yes, invite',
    });
    if (!ok) return;
    await run(() => inviteToCall(session, c.id), `${c.first_name} ${c.surname} is invited`);
  };

  const saveOutcome = async () => {
    if (!outcomeFor || !outcome) return;
    const c = outcomeFor;
    setOutcomeFor(null);
    await run(() => recordCallOutcome(session, c.id, outcome, notes), `Outcome recorded: ${OUTCOME_TEXT[outcome].label}`);
    setOutcome(''); setNotes('');
  };

  if (loading && !data) return <div><WorkspacePageHeader title="Phone Calls" description="The call with the President or the Vice President, after the interview and before the offer." /><WorkspaceLoader /></div>;

  return (
    <div className="font-body">
      <WorkspacePageHeader
        title="Phone Calls"
        description="The call with the President or the Vice President, after the division's interview and before the offer. It is about the Society as a whole, not about markets."
      />

      {/* ── Candidates ───────────────────────────────────────────── */}
      <Card className="mb-6">
        <CardContent className="pt-6">
          <div className="flex flex-wrap items-center gap-2 mb-4">
            {(Object.keys(VIEW_LABELS) as View[]).map((v) => (
              <Button key={v} data-ro size="sm" variant={view === v ? 'solid' : 'outline'} onClick={() => setView(v)} aria-pressed={view === v}>
                {VIEW_LABELS[v]} <span className="ml-1 tabular-nums opacity-80">{counts[v]}</span>
              </Button>
            ))}
            <div className="ml-auto w-44">
              <Select value={semKey} onValueChange={setSemKey}>
                <SelectTrigger data-ro aria-label="Semester"><SelectValue /></SelectTrigger>
                <SelectContent>{semesterOptions.map((s) => <SelectItem key={s.key} value={s.key}>{s.label}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>
          {rows.length === 0 ? (
            <p className="text-sm text-muted-foreground py-6 text-center">
              {view === 'to-invite' ? 'Nobody is waiting for a call: candidates appear here once their interview is completed.' : 'No candidate here.'}
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs uppercase tracking-wider text-muted-foreground border-b border-separator">
                    <th className="py-2 pr-3 font-normal">Candidate</th>
                    <th className="py-2 pr-3 font-normal">Division</th>
                    <th className="py-2 pr-3 font-normal">Status</th>
                    <th className="py-2 pr-3 font-normal">Call</th>
                    <th className="py-2 font-normal sr-only">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((c) => {
                    const booked = callOf.get(c.id);
                    return (
                      <tr key={c.id} className="border-b border-separator/60 align-top">
                        <td className="py-3 pr-3">
                          <button type="button" data-ro className="text-left text-accent hover:underline" onClick={() => openCandidate(c.id)}>{c.first_name} {c.surname}</button>
                          <div className="text-xs text-muted-foreground">{c.phone}</div>
                        </td>
                        <td className="py-3 pr-3">{applyDivisionLabel(c.division)}</td>
                        <td className="py-3 pr-3">
                          <span className={`inline-block px-2 py-0.5 text-xs border ${statusBadgeClass(c.status)}`}>{STATUS_LABELS[c.status]}</span>
                          {c.call_outcome && <div className="mt-1 text-xs text-muted-foreground">Outcome: {OUTCOME_TEXT[c.call_outcome].label}</div>}
                        </td>
                        <td className="py-3 pr-3 text-xs">
                          {booked ? (
                            <>
                              <div>{format(parseISO(booked.slot.slot_date), 'EEE d MMM')}, {formatClockRange(booked.slot.start_time, booked.slot.end_time, booked.slot.slot_date)}</div>
                              <div className="text-muted-foreground">{booked.slot.caller_name}</div>
                            </>
                          ) : c.call_invited_at ? <span className="text-muted-foreground">Not booked</span> : <span className="text-muted-foreground">Not invited</span>}
                        </td>
                        <td className="py-3 text-right whitespace-nowrap">
                          {manage && CALL_INVITABLE.includes(c.status) && (
                            <Button size="sm" disabled={busy} onClick={() => invite(c)}>Invite to a call</Button>
                          )}
                          {manage && CALL_STAGES.includes(c.status) && (
                            <Button size="sm" variant="outline" disabled={busy} onClick={() => { setOutcomeFor(c); setOutcome(''); setNotes(''); }}>Record outcome</Button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── Smart planning ───────────────────────────────────────── */}
      {manage && (
        <Card className="mb-6">
          <CardContent className="pt-6">
            <h2 className="font-serif text-lg text-accent">Open call slots</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              A range is cut into calls of the length you choose. Candidates see your name, and receive your phone number when they book, so they recognise the call and can call back.
            </p>
            <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="p-date">Date</Label>
                <Input id="p-date" type="date" className="rounded-none" value={plan.slot_date} onChange={(e) => setPlan({ ...plan, slot_date: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="p-start">From (Rome time)</Label>
                <Input id="p-start" type="time" className="rounded-none" value={plan.start_time} onChange={(e) => setPlan({ ...plan, start_time: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="p-end">To (Rome time)</Label>
                <Input id="p-end" type="time" className="rounded-none" value={plan.end_time} onChange={(e) => setPlan({ ...plan, end_time: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="p-length">Length of each call</Label>
                <Select value={String(plan.slot_minutes)} onValueChange={(v) => setPlan({ ...plan, slot_minutes: Number(v) })}>
                  <SelectTrigger id="p-length" className="rounded-none"><SelectValue /></SelectTrigger>
                  <SelectContent>{CALL_MINUTES.map((m) => <SelectItem key={m} value={String(m)}>{m} minutes{m === DEFAULT_CALL_MINUTES ? ' (default)' : ''}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="p-capacity">Candidates per slot</Label>
                <Select value={String(plan.capacity)} onValueChange={(v) => setPlan({ ...plan, capacity: Number(v) })}>
                  <SelectTrigger id="p-capacity" className="rounded-none"><SelectValue /></SelectTrigger>
                  <SelectContent>{[1, 2, 3, 4, 5].map((n) => <SelectItem key={n} value={String(n)}>{n}{n === 1 ? ' (default)' : ''}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="p-phone">Your phone number</Label>
                <Input id="p-phone" type="tel" className="rounded-none" placeholder="+39 333 123 4567" value={plan.caller_phone} onChange={(e) => setPlan({ ...plan, caller_phone: e.target.value })} />
              </div>
            </div>
            <div className="mt-4">
              <Button onClick={openSlots} disabled={busy}>{busy ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Open slots'}</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── The calls ────────────────────────────────────────────── */}
      <Card className="mb-6">
        <CardContent className="pt-6">
          <h2 className="font-serif text-lg text-accent">Upcoming calls</h2>
          {upcoming.length === 0 ? (
            <p className="mt-3 text-sm text-muted-foreground">No call slot is open. Open some above before inviting candidates: an invitation needs a time to book.</p>
          ) : (
            <div className="mt-4 space-y-6">
              {byDay(upcoming).map(([day, slots], di) => (
                <div key={day} className={di > 0 ? 'pt-6 border-t border-separator' : ''}>
                  <h3 className="font-serif text-base text-accent mb-3">{format(parseISO(day), 'EEEE, d MMMM yyyy')}</h3>
                  <div className="space-y-2">
                    {slots.map((s) => (
                      <div key={s.id} className="border border-separator p-3">
                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
                          <span className="flex items-center gap-1.5 font-medium"><Clock className="h-4 w-4 text-accent" aria-hidden="true" />{formatClockRange(s.start_time, s.end_time, s.slot_date)}</span>
                          <span className="flex items-center gap-1.5 text-muted-foreground"><User className="h-3.5 w-3.5" aria-hidden="true" />{s.caller_name}</span>
                          <span className="flex items-center gap-1.5 text-muted-foreground"><Phone className="h-3.5 w-3.5" aria-hidden="true" />{s.caller_phone}</span>
                          <span className="text-xs text-muted-foreground">{s.bookings.length} of {s.capacity} booked</span>
                          {manage && s.bookings.length === 0 && (
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button size="icon" variant="ghost" className="ml-auto h-8 w-8" aria-label="Delete this slot" disabled={busy}><Trash2 className="h-4 w-4" /></Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Delete this slot?</AlertDialogTitle>
                                  <AlertDialogDescription>Nobody has booked it, so it simply stops being offered.</AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Keep it</AlertDialogCancel>
                                  <AlertDialogAction onClick={() => run(() => deleteCallSlot(session, s.id), 'Slot deleted')}>Delete</AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          )}
                        </div>
                        {s.bookings.map((b) => (
                          <div key={b.id} className="mt-2 flex flex-wrap items-center gap-3 border-t border-separator/60 pt-2 text-sm">
                            <span><strong className="font-medium">{b.candidate_name}</strong>, call on {b.candidate_phone || 'the number in the application'}</span>
                            <AddToCalendar call={{ bookingId: b.id, who: 'caller' }} className="ml-auto" />
                          </div>
                        ))}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
          {held.length > 0 && (
            <>
              <h2 className="mt-8 font-serif text-lg text-accent">Calls already held</h2>
              <ul className="mt-3 space-y-1 text-sm">
                {held.map((s) => s.bookings.map((b) => (
                  <li key={b.id}>{format(parseISO(s.slot_date), 'EEE d MMM yyyy')}, {formatClockRange(s.start_time, s.end_time, s.slot_date)}: {b.candidate_name}, with {s.caller_name}</li>
                )))}
              </ul>
            </>
          )}
        </CardContent>
      </Card>

      {/* ── The outcome ──────────────────────────────────────────── */}
      <Dialog open={!!outcomeFor} onOpenChange={(o) => { if (!o) setOutcomeFor(null); }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="font-serif text-xl">Outcome of the call with {outcomeFor?.first_name} {outcomeFor?.surname}</DialogTitle>
            <DialogDescription>Your notes are added to the candidate&rsquo;s notes, where every reviewer reads them.</DialogDescription>
          </DialogHeader>
          <RadioGroup value={outcome} onValueChange={(v) => setOutcome(v as CallOutcome)} className="gap-2" aria-label="Outcome">
            {(Object.keys(OUTCOME_TEXT) as CallOutcome[]).map((k) => (
              <label key={k} htmlFor={`o-${k}`} className={`flex items-start gap-3 border p-3 cursor-pointer ${outcome === k ? 'border-accent bg-accent/5' : 'border-separator'}`}>
                <RadioGroupItem id={`o-${k}`} value={k} className="mt-1" />
                <span>
                  <span className="font-medium text-foreground">{OUTCOME_TEXT[k].label}</span>
                  <span className="block text-xs text-muted-foreground">{OUTCOME_TEXT[k].effect}</span>
                </span>
              </label>
            ))}
          </RadioGroup>
          <div className="space-y-1.5">
            <Label htmlFor="o-notes">Notes</Label>
            <Textarea id="o-notes" rows={4} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="What you discussed, and why this outcome." />
          </div>
          <div className="flex gap-3 pt-1">
            <Button variant={outcome === 'decline' ? 'destructive' : 'solid'} className="flex-1" disabled={!outcome || busy} onClick={saveOutcome}>
              {outcome === 'decline' ? 'Decline and send the rejection' : 'Record the outcome'}
            </Button>
            <Button variant="outline" onClick={() => setOutcomeFor(null)}>Cancel</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── The candidate, in full ──────────────────────────────── */}
      <Dialog open={!!openId} onOpenChange={(o) => { if (!o) closeCandidate(); }}>
        <DialogContent className="max-w-[96vw] w-[96vw] max-h-[94vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-serif text-2xl">{detail ? `${detail.application.first_name} ${detail.application.surname}` : 'Candidate'}</DialogTitle>
            <DialogDescription className="font-body">The same information the reviewers saw during screening and the interview, with their notes.</DialogDescription>
          </DialogHeader>
          {detailLoading || !detail ? <WorkspaceLoader inline /> : (
            <CandidateProfile
              session={session}
              detail={detail}
              cvUrl={cvUrl}
              answerUrl={answerUrl}
              docsLoading={docsLoading}
              canAddNotes={manage}
              notesAllowedInReadOnly={false}
              addNote={async (b) => { await addApplicationNote(session, detail.application.id, b); }}
              onNoteAdded={async () => { await refreshCandidate(detail.application.id); }}
              onError={(m) => toast({ title: 'Something went wrong', description: m, variant: 'destructive' })}
            >
              <CandidateStage status={detail.application.status} />
            </CandidateProfile>
          )}
        </DialogContent>
      </Dialog>
      {emailDialog}
    </div>
  );
}
