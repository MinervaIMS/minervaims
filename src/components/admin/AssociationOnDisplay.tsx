import { Fragment, useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Check, ChevronDown, ChevronRight, Plus, Trash2, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { divisionLabels, type OrgDivision } from '@/lib/roles';
import { WorkspacePageHeader } from '@/components/admin/WorkspacePageHeader';
import { WorkspaceLoader } from '@/components/admin/WorkspaceLoader';
import {
  listAod, createAodDay, deleteAodDay, setAodOpen, aodSignup, aodRemoveSignup,
  AOD_SLOTS, AOD_SLOT_MINUTES, formatSlotTime, slotEndTime,
  type AodAttendance, type AodDay, type AodSignup,
} from '@/lib/alumni-aod-api';
import { semesterOf, semestersInData } from '@/lib/semester';
import { logActivity } from '@/lib/activity-log';
import { formatDay, zoneOnDate } from '@/lib/event-time';
import { HelpDot } from '@/components/admin/help/HelpSystem';
import { MoreMenu } from '@/components/admin/kit/MoreMenu';
import { useConfirm } from '@/components/admin/kit/ConfirmDialog';

// =====================================================================
// WHEN A SLOT COUNTS AS COVERED, and there are two ways to be.
// ---------------------------------------------------------------------
// It used to be one: three people on the slot. Three people from the same
// division is a stand that can answer questions about that division and
// no other, which is not what the stand is for; and on the busiest slots
// three is far below what the stand actually needs.
//
// So a slot is covered when EITHER
//
//   * more than eight people have registered for it - enough that the
//     stand is staffed whoever happens not to arrive; or
//   * all five core divisions are represented on it - so whatever a
//     visitor asks about, somebody there does that.
//
// Two independent routes, because they answer two different worries:
// the first is about numbers, the second about breadth. A slot that
// satisfies either is covered, and the badge says which.
// =====================================================================

// =====================================================================
// COVERED IS A FLOOR, NEVER A CEILING.
// ---------------------------------------------------------------------
// Nothing on this page caps a slot, and nothing ever has: there is no
// capacity column, no count check in `admin-aod`, and no constraint in
// the database beyond one registration per person per slot. The tenth
// and the twentieth person to register are accepted exactly as the first
// was, and the Register button stays live on a slot that is already
// covered.
//
// That was true and invisible. A badge that read "Covered", beside a
// figure written as "3/5", is easy to read as a quota that has been
// filled, and somebody who reads it that way does not register. So the
// page now SAYS the rule rather than leaving it to be inferred: the day
// header states that registration is never capped, and a covered slot
// still invites more people onto it.
// =====================================================================

/** Registrations above which a slot is covered on numbers alone. */
const COVER_BY_HEADCOUNT = 8;

/** The five research divisions. One person from each also covers a slot. */
const CORE_DIVISIONS: OrgDivision[] = ['equity', 'investment', 'macro', 'portfolio', 'quant'];
/** How many of the five core divisions are represented on a slot. */
const coreDivisionsInSlot = (people: AodSignup[]) =>
  new Set(
    people
      .map((p) => p.division)
      .filter((d): d is OrgDivision => !!d && (CORE_DIVISIONS as string[]).includes(d)),
  ).size;

/** The rule itself, in one place, so every reader of it agrees. */
const isSlotCovered = (people: AodSignup[]) =>
  people.length > COVER_BY_HEADCOUNT || coreDivisionsInSlot(people) === CORE_DIVISIONS.length;

export default function AssociationOnDisplay() {
  const { session, user } = useAuth();
  const { toast } = useToast();
  const [days, setDays] = useState<AodDay[]>([]);
  const [signups, setSignups] = useState<AodSignup[]>([]);
  const [attendance, setAttendance] = useState<Record<string, AodAttendance>>({});
  const [openPast, setOpenPast] = useState<Set<string>>(new Set());
  const [isSenior, setIsSenior] = useState(false);
  const [loading, setLoading] = useState(true);
  const [newDate, setNewDate] = useState('');
  const [busySlot, setBusySlot] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    try { const res = await listAod(session); setDays(res.days); setSignups(res.signups); setIsSenior(res.isSenior); setAttendance(res.attendance); }
    catch (e) { toast({ title: 'Failed to load', description: e instanceof Error ? e.message : undefined, variant: 'destructive' }); }
    finally { setLoading(false); }
  };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { load(); }, []);

  const addDay = async () => {
    if (!newDate) { toast({ title: 'Pick a date', variant: 'destructive' }); return; }
    try { await createAodDay(session, newDate);setNewDate(''); await load(); }
    catch (e) { toast({ title: 'Could not create', description: e instanceof Error ? e.message : undefined, variant: 'destructive' }); }
  };

  const signupsFor = (dayId: string, slot: string) => signups.filter((s) => s.day_id === dayId && s.slot_time === slot);

  const todayStr = new Date().toISOString().slice(0, 10);
  const upcomingDays = useMemo(() => days.filter((d) => d.event_date >= todayStr).sort((a, b) => a.event_date.localeCompare(b.event_date)), [days, todayStr]);
  const pastDays = useMemo(() => days.filter((d) => d.event_date < todayStr).sort((a, b) => b.event_date.localeCompare(a.event_date)), [days, todayStr]);
  const coverageCount = (dayId: string) =>
    AOD_SLOTS.filter((s) => isSlotCovered(signups.filter((su) => su.day_id === dayId && su.slot_time === s))).length;

  const handleSignup = async (dayId: string, slot: string) => {
    setBusySlot(`${dayId}-${slot}`);
    try {
      await aodSignup(session, dayId, slot);
      await load();
    }
    catch (e) { toast({ title: 'Could not sign up', description: e instanceof Error ? e.message : undefined, variant: 'destructive' }); }
    finally { setBusySlot(null); }
  };
  // Deleting a day is asked in the workspace's own window (Step 98), not
  // the browser's grey box.
  const { confirm: confirmAction, dialog: confirmDialog } = useConfirm();
  const deleteDay = async (day: AodDay) => {
    const ok = await confirmAction({
      title: 'Delete this day?',
      body: <p>{formatDay(`${day.event_date}T12:00:00Z`)} is deleted, with every signup, its event and its attendance. This cannot be undone.</p>,
      action: 'Delete day',
    });
    if (!ok) return;
    try { await deleteAodDay(session, day.id); await load(); }
    catch (e) { toast({ title: 'Could not delete', description: e instanceof Error ? e.message : undefined, variant: 'destructive' }); }
  };
  const handleRemove = async (id: string) => {
    try { await aodRemoveSignup(session, id);await load(); }
    catch (e) { toast({ title: 'Could not remove', description: e instanceof Error ? e.message : undefined, variant: 'destructive' }); }
  };

  return (
    <div>
      <WorkspacePageHeader title="Association On Display" description="Stand days, and the slots people have signed up for." />
      {confirmDialog}

      {isSenior && (
        <div className="flex gap-2 mb-6 font-body">
          <Input type="date" value={newDate} onChange={(e) => setNewDate(e.target.value)} className="max-w-[200px] h-11 lg:h-10" />
          <Button variant="outline" className="h-11 lg:h-10" onClick={addDay}><Plus className="h-4 w-4 mr-2" />Add a day</Button>
        </div>
      )}

      {loading ? <WorkspaceLoader /> : days.length === 0 ? (
        <Card><CardContent className="py-12 text-center"><p className="font-body text-muted-foreground">No Association on Display day scheduled yet.</p></CardContent></Card>
      ) : (
        <div className="space-y-8">
          {upcomingDays.length === 0 ? (
            <Card><CardContent className="py-10 text-center"><p className="font-body text-muted-foreground">No upcoming Association on Display day.</p></CardContent></Card>
          ) : upcomingDays.map((day) => (
            <DayBlock key={day.id} day={day} isSenior={isSenior} userId={user?.id ?? null}
              signupsFor={(slot) => signupsFor(day.id, slot)} busySlot={busySlot}
              onSignup={(slot) => handleSignup(day.id, slot)} onRemove={handleRemove}
              onToggleOpen={async (open) => { try { await setAodOpen(session, day.id, open); await load(); } catch (e) { toast({ title: 'Could not update', description: e instanceof Error ? e.message : undefined, variant: 'destructive' }); } }}
              onDelete={() => deleteDay(day)}
            />
          ))}

          {/* PAST SESSIONS (Step 110): who was on the stand, not a score.
              A past day used to read "1 / 18 slots covered", which looked
              like a failed day whatever happened. It now says who signed
              up and how many actually came (the day's attendance, taken in
              Events > Attendance), and opens on the slots with the names
              on each. Covered slots stay, small, as the organisational
              detail they are. */}
          {pastDays.length > 0 && (
            <div>
              <h3 className="font-serif text-lg text-accent mb-2">Past sessions</h3>
              <div className="border border-separator divide-y divide-separator">
                {semestersInData(pastDays.map((d) => d.event_date)).map((sem) => (
                  <Fragment key={sem.key}>
                    <div className="bg-accent/5 px-3 py-1.5 font-serif text-accent uppercase tracking-wider text-xs">{sem.label}</div>
                    {pastDays.filter((d) => semesterOf(d.event_date).key === sem.key).map((d) => {
                      const daySignups = signups.filter((su) => su.day_id === d.id);
                      const people = new Set(daySignups.map((su) => su.user_id ?? su.member_name)).size;
                      const a = attendance[d.id];
                      const open = openPast.has(d.id);
                      const came = new Set((a?.attendees ?? []).map((x) => x.user_id).filter(Boolean) as string[]);
                      return (
                        <div key={d.id} data-aod-past={d.event_date}>
                          <button type="button" data-ro aria-expanded={open}
                            onClick={() => setOpenPast((prev) => { const n = new Set(prev); if (n.has(d.id)) n.delete(d.id); else n.add(d.id); return n; })}
                            className="flex w-full flex-wrap items-center gap-x-6 gap-y-1 px-3 py-3 text-left font-body text-sm hover:bg-muted/40">
                            <span className="flex min-w-[14rem] items-center gap-2 text-foreground">
                              {open ? <ChevronDown className="h-4 w-4 text-muted-foreground" /> : <ChevronRight className="h-4 w-4 text-muted-foreground" />}
                              {formatDay(`${d.event_date}T12:00:00Z`)}
                            </span>
                            <span className="text-muted-foreground"><strong className="font-medium text-foreground">{people}</strong> signed up</span>
                            <span className="text-muted-foreground">
                              {a?.taken
                                ? <><strong className="font-medium text-foreground">{a.attended}</strong> attended</>
                                : 'Attendance not taken'}
                            </span>
                            <span className="ml-auto text-xs text-muted-foreground">{coverageCount(d.id)} of {AOD_SLOTS.length} slots covered</span>
                          </button>
                          {open && (
                            <div className="border-t border-separator bg-muted/20 px-3 py-3">
                              {daySignups.length === 0 ? (
                                <p className="font-body text-sm text-muted-foreground">Nobody signed up for this day.</p>
                              ) : (
                                <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                                  {AOD_SLOTS.filter((slot) => daySignups.some((su) => su.slot_time === slot)).map((slot) => (
                                    <div key={slot} className="border border-separator bg-background p-3 font-body">
                                      <div className="text-sm font-medium text-foreground">{formatSlotTime(slot)} <span className="text-[11px] font-normal text-muted-foreground">to {formatSlotTime(slotEndTime(slot))}</span></div>
                                      <ul className="mt-1.5 space-y-0.5">
                                        {daySignups.filter((su) => su.slot_time === slot).map((su) => (
                                          <li key={su.id} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                                            {a?.attendees && (su.user_id && came.has(su.user_id)
                                              ? <Check className="h-3.5 w-3.5 shrink-0 text-emerald-600" aria-label="Attended" />
                                              : <span className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />)}
                                            <span className="truncate">{su.member_name}{su.division && su.division !== 'none' ? ` · ${divisionLabels[su.division]}` : ''}</span>
                                          </li>
                                        ))}
                                      </ul>
                                    </div>
                                  ))}
                                </div>
                              )}
                              {a?.attendees && a.taken && (
                                <p className="mt-3 font-body text-xs text-muted-foreground">
                                  Ticked: present in Events &gt; Attendance.
                                  {a.attendees.some((x) => !x.user_id || !daySignups.some((su) => su.user_id === x.user_id))
                                    ? ` Also present without a slot: ${a.attendees.filter((x) => !x.user_id || !daySignups.some((su) => su.user_id === x.user_id)).map((x) => x.name).join(', ')}.`
                                    : ''}
                                </p>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </Fragment>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function DayBlock({ day, isSenior, userId, signupsFor, busySlot, onSignup, onRemove, onToggleOpen, onDelete }: {
  day: AodDay; isSenior: boolean; userId: string | null;
  signupsFor: (slot: string) => AodSignup[]; busySlot: string | null;
  onSignup: (slot: string) => void; onRemove: (id: string) => void;
  onToggleOpen: (open: boolean) => void; onDelete: () => void;
}) {
  const coverage = useMemo(() => AOD_SLOTS.filter((s) => isSlotCovered(signupsFor(s))).length, [signupsFor]);
  return (
    <div className="border border-separator">
      <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 bg-muted/40 font-body">
        <div>
          <div className="font-serif text-lg text-accent">{formatDay(`${day.event_date}T12:00:00Z`)}</div>
          <div className="text-xs text-muted-foreground">{coverage}/{AOD_SLOTS.length} slots covered (more than {COVER_BY_HEADCOUNT} people, or all {CORE_DIVISIONS.length} core divisions) <HelpDot page="events-on-display" topic="coverage" /> · {day.registration_open ? 'Registration open' : 'Registration closed'}</div>
          {/* THE TWO FACTS EVERY SLOT ON THIS DAY SHARES, SAID ONCE.
              How long a slot lasts and whether it can fill up are true of
              all eighteen of them, so they are stated here rather than
              repeated eighteen times down the grid. */}
          <div className="mt-1 text-xs text-muted-foreground">
            Each slot runs for {AOD_SLOT_MINUTES} minutes, from its start time to the end of the following
            half hour, on Rome time ({zoneOnDate(day.event_date)}). There is no limit on how many people can take a slot: the more of us on the stand,
            the better, so please register even where a slot is already covered.
          </div>
        </div>
        {isSenior && (
          <div className="flex items-center gap-3">
            <label className="flex items-center gap-3 text-sm text-muted-foreground">
              Open
              <Switch checked={day.registration_open} onCheckedChange={onToggleOpen} />
            </label>
            {/* Deleting the day takes its signups, its event and its
                attendance with it: in More, last and in red (Step 98). */}
            <MoreMenu
              label={`More actions for ${formatDay(`${day.event_date}T12:00:00Z`)}`}
              title={formatDay(`${day.event_date}T12:00:00Z`)}
              triggerClassName="lg:h-10 lg:w-10"
              actions={[{ key: 'delete', label: 'Delete this day', icon: Trash2, destructive: true, onSelect: onDelete }]}
            />
          </div>
        )}
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-px bg-separator">
        {AOD_SLOTS.map((slot) => {
          const people = signupsFor(slot);
          const mine = people.find((p) => p.user_id === userId);
          const divCount = coreDivisionsInSlot(people);
          const covered = isSlotCovered(people);
          return (
            <div key={slot} className={`bg-background p-3 font-body border-l-2 ${covered ? 'border-emerald-500' : 'border-amber-500'}`}>
              {/* A SLOT IS A LENGTH OF TIME, NOT AN INSTANT.
                  It used to be labelled with its start alone, "18:30",
                  which says when to turn up and nothing at all about when
                  you may leave. Both ends are now named, with the start
                  carrying the weight because it is what a person scans
                  for, and the span between them is drawn beneath. */}
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="text-sm font-medium text-foreground">{formatSlotTime(slot)}</div>
                  <div className="text-[11px] text-muted-foreground">to {formatSlotTime(slotEndTime(slot))} {zoneOnDate(day.event_date)}</div>
                </div>
                <span className={`shrink-0 text-[11px] px-1.5 py-0.5 rounded ${covered ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}>
                  {/* The headcount shows in BOTH states. It used to be
                      replaced by the word "Covered", so the one slot whose
                      numbers somebody might want to check was the one that
                      stopped showing them. */}
                  {covered
                    ? `Covered · ${people.length}`
                    : `${people.length} · ${divCount}/${CORE_DIVISIONS.length} div.`}
                </span>
              </div>
              {/* The half hour itself, drawn: a rule with a tick at each
                  end, which is how a span of time is marked on a plan.
                  Decorative only, and hidden from screen readers, because
                  the two times above already say it in words. */}
              <div aria-hidden className="mt-1.5 flex items-center gap-1" title={`${AOD_SLOT_MINUTES} minutes`}>
                <span className={`h-2 w-px ${covered ? 'bg-emerald-500/60' : 'bg-amber-500/60'}`} />
                <span className={`h-px flex-1 ${covered ? 'bg-emerald-500/35' : 'bg-amber-500/35'}`} />
                <span className={`h-2 w-px ${covered ? 'bg-emerald-500/60' : 'bg-amber-500/60'}`} />
              </div>
              {/* Registration button: clear, full-width, for everyone. */}
              <div className="mt-2">
                {mine ? (
                  <Button data-ro variant="outline" size="sm" className="w-full h-11 lg:h-9 text-destructive border-destructive/40 hover:bg-destructive/10" onClick={() => onRemove(mine.id)}>
                    Cancel my registration
                  </Button>
                ) : (
                  <Button data-ro variant="outline" size="sm" className="w-full h-11 lg:h-9" disabled={!day.registration_open || busySlot === `${day.id}-${slot}`} onClick={() => onSignup(slot)}>
                    {busySlot === `${day.id}-${slot}` ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : day.registration_open ? 'Register for this slot' : 'Registration closed'}
                  </Button>
                )}
              </div>
              {/* Registered people + how many divisions are represented. */}
              <div className="mt-2 space-y-0.5">
                <div className="text-[11px] uppercase tracking-wider text-muted-foreground">
                  {people.length} registered · {divCount} division{divCount === 1 ? '' : 's'} covered
                </div>
                {/* Said on the slot itself, and not only in the day header,
                    because this is the exact spot where a green badge might
                    otherwise be read as "no more needed". */}
                {covered && day.registration_open && !mine && (
                  <div className="text-[11px] text-emerald-700">Covered, and more are still welcome</div>
                )}
                {people.length === 0 ? (
                  <span className="text-xs text-amber-600">No one yet</span>
                ) : people.map((p) => (
                  <div key={p.id} className="text-xs text-muted-foreground truncate">{p.member_name}{p.division && p.division !== 'none' ? ` · ${divisionLabels[p.division]}` : ''}</div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
