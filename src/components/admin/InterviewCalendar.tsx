import { useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Calendar } from '@/components/ui/calendar';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { CalendarPlus, Sparkles, Trash2, Clock, Video, User, Loader2 } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { logActivity } from '@/lib/activity-log';
import { useAccess } from '@/hooks/useAccess';
import { divisionLabels, type OrgDivision } from '@/lib/roles';
import { WorkspacePageHeader } from '@/components/admin/WorkspacePageHeader';
import { Recommendation } from '@/components/admin/Recommendation';
import { WorkspaceLoader } from '@/components/admin/WorkspaceLoader';
import {
  listSlots, createSlot, bulkCreateSlots, deleteSlot, clearDivisionSlots,
  isFutureSlot, type StaffSlot,
} from '@/lib/interviews-api';
import { listExamSessions, examSessionOn, type ExamSession } from '@/lib/calendar-api';
import { useCandidateDetail } from '@/components/admin/recruiting/useCandidateDetail';
import { CandidateProfile } from '@/components/admin/recruiting/CandidateProfile';
import { CandidateStatusControl } from '@/components/admin/recruiting/CandidateStatusControl';
import {
  addApplicationNote, reviewerDivisionsOf, canProgressApplication,
  type ApplicationStatus,
} from '@/lib/applications-api';

const CORE: OrgDivision[] = ['equity', 'investment', 'macro', 'portfolio', 'quant'];
const hhmm = (t: string) => t.slice(0, 5);
const plus30 = (t: string) => {
  const [h, m] = t.split(':').map(Number);
  const tot = h * 60 + m + 30;
  return `${String(Math.floor(tot / 60) % 24).padStart(2, '0')}:${String(tot % 60).padStart(2, '0')}`;
};

export default function InterviewCalendar() {
  const { session, roles } = useAuth();
  const { toast } = useToast();
  const access = useAccess();

  // Divisions this user may see (full access = all five core divisions).
  const divisionOptions = useMemo<OrgDivision[]>(() => {
    if (access.isFullAccess || !access.allowedDivisions) return CORE;
    return CORE.filter((d) => access.allowedDivisions!.includes(d));
  }, [access.isFullAccess, access.allowedDivisions]);

  const [division, setDivision] = useState<OrgDivision | null>(null);
  const [slots, setSlots] = useState<StaffSlot[]>([]);
  const [canManage, setCanManage] = useState(false);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [busy, setBusy] = useState(false);

  // ═══════════════════════════════════════════════════════════════════
  // WHICH SLOTS ARE ON SCREEN.
  // -------------------------------------------------------------------
  // "Who is coming, and when" is the question this page is opened with
  // once the invitations have gone out, and the answer used to be spread
  // through a list of every slot the division has ever opened, most of
  // them empty. One press narrows it to the interviews that are actually
  // booked, and the counts beside the chips answer it without pressing
  // anything at all.
  // ═══════════════════════════════════════════════════════════════════
  const [slotFilter, setSlotFilter] = useState<'all' | 'booked' | 'free'>('all');

  // ═══════════════════════════════════════════════════════════════════
  // THE CANDIDATE, OPENED FROM THE SLOT THEY BOOKED.
  // -------------------------------------------------------------------
  // The same window Candidates Screening opens, with the same hook behind
  // it, so a candidate read here is a candidate read there: one round
  // trip, the two documents signed in parallel, the notes, the emails
  // they have been sent, and the status control if this reader may move
  // them. An examiner about to interview somebody should not have to go
  // and find them in another subsection first, and the outcome should be
  // recordable where the interview is.
  // ═══════════════════════════════════════════════════════════════════
  const {
    openId, detail, cvUrl, answerUrl, loading: detailLoading, docsLoading,
    open: openCandidate, close: closeCandidate, refresh: refreshCandidate, patch: patchCandidate,
  } = useCandidateDetail(session);

  const canScreen = access.canView('applications-screening');
  const canChangeStatus = access.canManage('applications-screening');
  const canAddNotes = canChangeStatus || access.hasSpecial('applications-screening', 'candidates_notes_only');
  const myDivisions = useMemo(
    () => reviewerDivisionsOf(roles as { role: string; division?: string | null }[] | null, access.isFullAccess),
    [roles, access.isFullAccess],
  );

  const openCandidateFor = (slot: StaffSlot) => {
    if (!slot.booking) return;
    if (!canScreen) {
      toast({ title: 'Your role cannot open candidate records', description: 'Candidates are read in Recruiting, Candidates Screening.' });
      return;
    }
    openCandidate(slot.booking.application_id);
  };

  // A status change here can move the candidate out of the booked stage,
  // so the calendar is re-read rather than guessed at.
  const onStatusChanged = ({ id, status }: { id: string; status: ApplicationStatus }) => {
    patchCandidate(id, { status });
    if (division) load(division);
  };

  const addNote = async (body: string) => {
    if (!openId) return;
    await addApplicationNote(session, openId, body);
  };
  const afterNote = async () => { if (openId) await refreshCandidate(openId); };

  const [createOpen, setCreateOpen] = useState(false);
  const [bulkOpen, setBulkOpen] = useState(false);
  const [form, setForm] = useState({ slot_date: '', start_time: '', end_time: '', meeting_link: '' });
  const [bulk, setBulk] = useState({ slot_date: '', start_time: '', end_time: '', meeting_link: '' });

  useEffect(() => {
    if (!division && divisionOptions.length > 0) setDivision(divisionOptions[0]);
  }, [divisionOptions, division]);

  // Exam session breaks: no slot can be opened inside one (enforced by the
  // database as well; this keeps the UI honest and the error friendly).
  const [examSessions, setExamSessions] = useState<ExamSession[]>([]);
  useEffect(() => { listExamSessions().then(setExamSessions).catch(() => {}); }, []);
  const examBreakFor = (date: string) => examSessionOn(examSessions, date);

  const load = async (div: OrgDivision) => {
    setLoading(true);
    try {
      const res = await listSlots(session, div);
      setSlots(res.slots);
      setCanManage(res.canManage);
    } catch (e) {
      toast({ title: 'Failed to load the calendar', description: e instanceof Error ? e.message : undefined, variant: 'destructive' });
    } finally { setLoading(false); }
  };

  useEffect(() => {
    if (division) load(division);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [division]);

  const datesWithSlots = useMemo(() => new Set(slots.map((s) => s.slot_date)), [slots]);
  const bookedCount = useMemo(() => slots.filter((s) => s.booking).length, [slots]);
  const freeCount = slots.length - bookedCount;

  const shown = useMemo(
    () => slots.filter((s) => (slotFilter === 'all' ? true : slotFilter === 'booked' ? !!s.booking : !s.booking)),
    [slots, slotFilter],
  );

  /**
   * The slots on screen, grouped by day and split at now.
   *
   * UNBOOKED SLOTS IN THE PAST NO LONGER EXIST: the endpoint removes them
   * when the division's calendar is read, so what remains behind today is
   * a record of interviews that were actually held. That belongs below
   * the ones still to come, not above them, which is where an ascending
   * list of everything had been putting it.
   */
  const [upcoming, past] = useMemo(() => {
    const byDay = (list: StaffSlot[]) => {
      const map = new Map<string, StaffSlot[]>();
      for (const s of list) {
        const day = map.get(s.slot_date) ?? [];
        day.push(s);
        map.set(s.slot_date, day);
      }
      return Array.from(map.entries()).sort(([a], [b]) => a.localeCompare(b));
    };
    return [
      byDay(shown.filter((s) => isFutureSlot(s))),
      byDay(shown.filter((s) => !isFutureSlot(s))).reverse(),
    ];
  }, [shown]);

  const submitCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!division) return;
    const brk = examBreakFor(form.slot_date);
    if (brk) { toast({ title: 'Exam session break', description: `${brk.label}: no interviews can be scheduled between ${brk.start_date} and ${brk.end_date}.`, variant: 'destructive' }); return; }
    setBusy(true);
    try {
      await createSlot(session, { division, ...form });
      toast({ title: 'Slot opened' });
      setCreateOpen(false); setForm({ slot_date: '', start_time: '', end_time: '', meeting_link: '' });
      await load(division);
    } catch (e) { toast({ title: 'Could not open the slot', description: e instanceof Error ? e.message : undefined, variant: 'destructive' }); }
    finally { setBusy(false); }
  };

  const submitBulk = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!division) return;
    const brk = examBreakFor(bulk.slot_date);
    if (brk) { toast({ title: 'Exam session break', description: `${brk.label}: no interviews can be scheduled between ${brk.start_date} and ${brk.end_date}.`, variant: 'destructive' }); return; }
    setBusy(true);
    try {
      const res = await bulkCreateSlots(session, { division, ...bulk });
      toast({ title: `${res.created} slot${res.created === 1 ? '' : 's'} opened` });
      setBulkOpen(false); setBulk({ slot_date: '', start_time: '', end_time: '', meeting_link: '' });
      await load(division);
    } catch (e) { toast({ title: 'Could not generate slots', description: e instanceof Error ? e.message : undefined, variant: 'destructive' }); }
    finally { setBusy(false); }
  };

  const removeSlot = async (id: string) => {
    if (!division) return;
    try { await deleteSlot(session, id);toast({ title: 'Slot removed' }); await load(division); }
    catch (e) { toast({ title: 'Could not remove the slot', description: e instanceof Error ? e.message : undefined, variant: 'destructive' }); }
  };

  const clearAll = async () => {
    if (!division) return;
    try { await clearDivisionSlots(session, division); toast({ title: 'All slots cleared' }); await load(division); }
    catch (e) { toast({ title: 'Could not clear the calendar', description: e instanceof Error ? e.message : undefined, variant: 'destructive' }); }
  };

  if (!division) {
    return (
      <div>
        <WorkspacePageHeader title="Interview Calendar" description="Open and manage interview slots for your division." />
        <Card><CardContent className="py-12 text-center"><p className="font-body text-muted-foreground">No division is associated with your role.</p></CardContent></Card>
      </div>
    );
  }

  return (
    <div>
      <WorkspacePageHeader
        title="Interview Calendar"
        description="Interview slots for your division, and who has booked them."
        actions={canManage ? (
          <>
            <Button variant="outline" className="rounded-none font-body" onClick={() => setCreateOpen(true)}>
              <CalendarPlus className="h-4 w-4 mr-2" />Open a slot
            </Button>
            <Button variant="outline" className="rounded-none font-body" onClick={() => setBulkOpen(true)}>
              <Sparkles className="h-4 w-4 mr-2" /> Smart planning
            </Button>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="outline" className="rounded-none font-body text-destructive hover:text-destructive">
                  <Trash2 className="h-4 w-4 mr-2" /> Clear all
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Clear the whole calendar?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This removes every interview slot for {divisionLabels[division]}. Candidates who had booked will be able to book again.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel className="rounded-none">Cancel</AlertDialogCancel>
                  <AlertDialogAction className="rounded-none bg-destructive hover:bg-destructive/90" onClick={clearAll}>Clear all</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </>
        ) : undefined}
      />

      {canManage && (
        <div className="mb-5">
          <Recommendation title="Create the Teams meeting link before opening slots">
            <p>
              When you open interview slots, it is advisable to create and attach a Microsoft Teams meeting link
              immediately. The practical setup that has worked best: create one single Teams meeting for the whole
              interview session and configure it so that everyone with the link waits in the lobby and only the host
              admits people (both options are in the Teams meeting settings).
            </p>
            <p>
              With one link for all interviews, examiners admit one candidate at a time, only when the previous
              interview has finished. This keeps the flow orderly, avoids candidates crossing each other, and spares
              you creating a separate link for every slot.
            </p>
          </Recommendation>
        </div>
      )}

      {/* Division selector (only when the user can see more than one) */}
      {divisionOptions.length > 1 && (
        <div className="flex flex-wrap gap-2 mb-6">
          {divisionOptions.map((d) => (
            <button
              key={d}
              /* `data-ro`: this chooses WHICH division's calendar is on
                 screen and writes nothing. Greyed out, a reader who can
                 see several divisions was stuck on the first one. */
              data-ro
              onClick={() => setDivision(d)}
              className={`px-4 py-2 border font-body text-sm transition-colors ${d === division ? 'bg-accent text-accent-foreground border-accent' : 'bg-transparent text-accent border-accent/40 hover:border-accent'}`}
            >
              {divisionLabels[d]}
            </button>
          ))}
        </div>
      )}

      {loading ? (
        <WorkspaceLoader />
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardContent className="pt-6">
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={setSelectedDate}
                modifiers={{
                  hasSlots: (date) => datesWithSlots.has(format(date, 'yyyy-MM-dd')),
                  examBreak: (date) => !!examSessionOn(examSessions, format(date, 'yyyy-MM-dd')),
                }}
                modifiersClassNames={{
                  hasSlots: 'font-semibold text-accent underline underline-offset-4',
                  examBreak: 'bg-muted text-muted-foreground/50 line-through',
                }}
                className="rounded-none border border-separator"
              />
              <div className="mt-4 space-y-1 text-xs font-body text-muted-foreground">
                <div><span className="underline underline-offset-4 text-accent font-semibold">Underlined</span> = days with open slots</div>
                {examSessions.length > 0 && (
                  <div><span className="line-through">Struck</span> = exam session break: the calendar does not accept interviews on those days</div>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex flex-wrap items-baseline justify-between gap-2 mb-3">
                <h3 className="font-serif text-lg text-accent">Interview slots</h3>
                <span className="font-body text-xs text-muted-foreground">
                  {bookedCount} booked · {freeCount} still open
                </span>
              </div>

              {/* The three ways of reading this calendar. `data-ro`: these
                  choose what is shown and write nothing, so a reader who
                  may not manage the calendar keeps them. */}
              <div className="flex flex-wrap gap-1.5 mb-4">
                {([
                  ['all', `All (${slots.length})`],
                  ['booked', `Booked (${bookedCount})`],
                  ['free', `Available (${freeCount})`],
                ] as const).map(([key, label]) => (
                  <button
                    key={key}
                    data-ro
                    type="button"
                    onClick={() => setSlotFilter(key)}
                    className={`px-3 h-8 border font-body text-xs transition-colors ${
                      slotFilter === key
                        ? 'bg-accent text-accent-foreground border-accent'
                        : 'bg-transparent text-accent border-accent/40 hover:border-accent'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>

              {slots.length === 0 ? (
                <p className="font-body text-sm text-muted-foreground py-8 text-center">No slots opened yet. Use “Open a slot” or “Smart planning” to add availability.</p>
              ) : shown.length === 0 ? (
                <p className="font-body text-sm text-muted-foreground py-8 text-center">
                  {slotFilter === 'booked' ? 'No slot has been booked yet.' : 'Every slot is booked.'}
                </p>
              ) : (
                <div className="max-h-[64vh] overflow-y-auto pr-1 space-y-5">
                  {upcoming.map(([date, daySlots]) => (
                    <SlotDay
                      key={date} date={date} daySlots={daySlots} canManage={canManage}
                      onRemove={removeSlot} onOpenCandidate={openCandidateFor}
                    />
                  ))}

                  {past.length > 0 && (
                    <div className="pt-2">
                      {/* WHAT IS LEFT BEHIND TODAY IS A RECORD, NOT A GAP.
                          Slots nobody booked are removed automatically when
                          this calendar is read, so everything here is an
                          interview that was actually held, kept because the
                          booking is the only record of who was seen and
                          when. Newest first, and below the ones to come. */}
                      <div className="border-t border-separator pt-3 mb-2 font-body text-xs uppercase tracking-wider text-muted-foreground">
                        Interviews already held
                      </div>
                      <div className="space-y-5 opacity-90">
                        {past.map(([date, daySlots]) => (
                          <SlotDay
                            key={date} date={date} daySlots={daySlots} canManage={canManage}
                            onRemove={removeSlot} onOpenCandidate={openCandidateFor}
                          />
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* The candidate who booked a slot, in full. */}
      <Dialog open={!!openId} onOpenChange={(o) => { if (!o) closeCandidate(); }}>
        <DialogContent className="max-w-[96vw] w-[96vw] max-h-[94vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-serif text-2xl pr-10">
              {detail ? `${detail.application.first_name} ${detail.application.surname}` : 'Candidate'}
            </DialogTitle>
          </DialogHeader>
          {detailLoading || !detail ? <WorkspaceLoader inline /> : (
            <CandidateProfile
              session={session}
              detail={detail}
              cvUrl={cvUrl}
              answerUrl={answerUrl}
              docsLoading={docsLoading}
              canAddNotes={canAddNotes}
              addNote={addNote}
              onNoteAdded={afterNote}
              onError={(m) => toast({ title: 'Something went wrong', description: m, variant: 'destructive' })}
            >
              <CandidateStatusControl
                session={session}
                app={detail.application}
                canChangeStatus={canChangeStatus}
                canProgress={canProgressApplication(detail.application, myDivisions)}
                onChanged={onStatusChanged}
                showHelp={false}
              />
              <p className="text-xs text-muted-foreground">
                The interview this candidate booked is in the calendar behind this window. Changing the division
                they are evaluated for is done in <strong>Recruiting, Candidates Screening</strong>, because it
                releases the slot they are holding.
              </p>
            </CandidateProfile>
          )}
        </DialogContent>
      </Dialog>

      {/* Open a single slot */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle className="font-serif text-accent">Open an interview slot</DialogTitle></DialogHeader>
          <form onSubmit={submitCreate} className="space-y-4 font-body">
            <div>
              <Label htmlFor="c-date">Date</Label>
              <Input id="c-date" type="date" className="rounded-none" required value={form.slot_date} onChange={(e) => setForm({ ...form, slot_date: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="c-start">Start</Label>
                <Input id="c-start" type="time" className="rounded-none" required value={form.start_time}
                  onChange={(e) => setForm({ ...form, start_time: e.target.value, end_time: e.target.value ? plus30(e.target.value) : '' })} />
              </div>
              <div>
                <Label htmlFor="c-end">End</Label>
                <Input id="c-end" type="time" className="rounded-none" required value={form.end_time} onChange={(e) => setForm({ ...form, end_time: e.target.value })} />
              </div>
            </div>
            <div>
              <Label htmlFor="c-link">Meeting link (optional)</Label>
              <Input id="c-link" type="url" placeholder="https://…" className="rounded-none" value={form.meeting_link} onChange={(e) => setForm({ ...form, meeting_link: e.target.value })} />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" className="rounded-none" onClick={() => setCreateOpen(false)}>Cancel</Button>
              <Button type="submit" className="rounded-none" disabled={busy}>{busy ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Open slot'}</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Smart planning */}
      <Dialog open={bulkOpen} onOpenChange={setBulkOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle className="font-serif text-accent">Smart planning</DialogTitle></DialogHeader>
          <p className="font-body text-sm text-muted-foreground -mt-2">Generate back-to-back 30-minute slots across a time range for one day.</p>
          <form onSubmit={submitBulk} className="space-y-4 font-body">
            <div>
              <Label htmlFor="b-date">Date</Label>
              <Input id="b-date" type="date" className="rounded-none" required value={bulk.slot_date} onChange={(e) => setBulk({ ...bulk, slot_date: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="b-start">From</Label>
                <Input id="b-start" type="time" className="rounded-none" required value={bulk.start_time} onChange={(e) => setBulk({ ...bulk, start_time: e.target.value })} />
              </div>
              <div>
                <Label htmlFor="b-end">To</Label>
                <Input id="b-end" type="time" className="rounded-none" required value={bulk.end_time} onChange={(e) => setBulk({ ...bulk, end_time: e.target.value })} />
              </div>
            </div>
            <div>
              <Label htmlFor="b-link">Meeting link (optional, applied to all)</Label>
              <Input id="b-link" type="url" placeholder="https://…" className="rounded-none" value={bulk.meeting_link} onChange={(e) => setBulk({ ...bulk, meeting_link: e.target.value })} />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" className="rounded-none" onClick={() => setBulkOpen(false)}>Cancel</Button>
              <Button type="submit" className="rounded-none" disabled={busy}>{busy ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Generate slots'}</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// =====================================================================
// One day of the calendar, and the slots on it.
// ---------------------------------------------------------------------
// Lifted out of the page because the list is drawn twice now, once for
// what is still to come and once for what has already been held, and two
// copies of eighty lines of JSX is two places for them to drift apart.
// =====================================================================
function SlotDay({ date, daySlots, canManage, onRemove, onOpenCandidate }: {
  date: string;
  daySlots: StaffSlot[];
  canManage: boolean;
  onRemove: (id: string) => void;
  onOpenCandidate: (slot: StaffSlot) => void;
}) {
  return (
    <div>
      {/* Date divider */}
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur py-1.5 mb-2 border-b border-separator">
        <span className="font-body text-xs uppercase tracking-wider text-accent font-semibold">
          {format(parseISO(date), 'EEEE, d MMMM yyyy')}
        </span>
        <span className="font-body text-xs text-muted-foreground ml-2">
          {daySlots.filter((s) => s.booking).length}/{daySlots.length} booked
        </span>
      </div>
      <div className="space-y-2">
        {daySlots.map((s) => (
          <div key={s.id} className="flex items-start justify-between gap-3 border border-separator p-3">
            <div className="min-w-0">
              <div className="flex items-center gap-2 font-body font-medium text-foreground">
                <Clock className="h-4 w-4 text-accent shrink-0" />
                {hhmm(s.start_time)} – {hhmm(s.end_time)}
              </div>
              {s.examiner_name && (
                <div className="mt-1 flex items-center gap-1.5 text-xs font-body text-muted-foreground">
                  <User className="h-3.5 w-3.5" /> Examiner: {s.examiner_name}
                </div>
              )}
              {s.meeting_link && (
                <a href={s.meeting_link} target="_blank" rel="noopener noreferrer" className="mt-1 flex items-center gap-1.5 text-xs font-body text-accent hover:underline break-all">
                  <Video className="h-3.5 w-3.5 shrink-0" /> Meeting link
                </a>
              )}
              {s.booking ? (
                <div className="mt-2 text-xs font-body">
                  <span className="inline-block px-2 py-0.5 bg-accent/10 text-accent border border-accent/20">Booked</span>
                  {/* THE NAME IS THE WAY IN. An examiner reading this list
                      an hour before the interview wants the candidate's CV,
                      their written answer and the notes their colleagues
                      left, and had to go and find them in Candidates
                      Screening. `data-ro`: opening a candidate is a read,
                      so the read-only guard leaves it alone. */}
                  <button
                    data-ro
                    type="button"
                    onClick={() => onOpenCandidate(s)}
                    title={`Open ${s.booking.candidate_name}`}
                    className="ml-2 text-accent underline underline-offset-2 hover:no-underline"
                  >
                    {s.booking.candidate_name}
                  </button>
                  <span className="ml-1 text-muted-foreground">· {s.booking.candidate_email}</span>
                </div>
              ) : (
                <div className="mt-2 text-xs font-body">
                  <span className="inline-block px-2 py-0.5 bg-muted text-muted-foreground border border-separator">Available</span>
                </div>
              )}
            </div>
            {canManage && (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="ghost" size="icon" className="shrink-0 text-muted-foreground hover:text-destructive">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Remove this slot?</AlertDialogTitle>
                    <AlertDialogDescription>
                      {s.booking
                        ? `${s.booking.candidate_name} has booked this slot. Removing it cancels their interview and lets them book again.`
                        : 'This interview slot will be removed.'}
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel className="rounded-none">Cancel</AlertDialogCancel>
                    <AlertDialogAction className="rounded-none bg-destructive hover:bg-destructive/90" onClick={() => onRemove(s.id)}>Remove</AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
