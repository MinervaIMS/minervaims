import { Fragment, useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Plus, Trash2, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { divisionLabels } from '@/lib/roles';
import { WorkspacePageHeader } from '@/components/admin/WorkspacePageHeader';
import { WorkspaceLoader } from '@/components/admin/WorkspaceLoader';
import {
  listAod, createAodDay, deleteAodDay, setAodOpen, aodSignup, aodRemoveSignup,
  AOD_SLOTS, type AodDay, type AodSignup,
} from '@/lib/alumni-aod-api';
import { semesterOf, semestersInData } from '@/lib/semester';
import { logActivity } from '@/lib/activity-log';
import { HelpDot } from '@/components/admin/help/HelpSystem';
import { useAccess } from '@/hooks/useAccess';

// A slot counts as "covered" once at least this many people are registered.
const MIN_COVER = 3;
// Distinct divisions represented in a slot (members with no division don't count).
const divisionsInSlot = (people: AodSignup[]) =>
  new Set(people.map((p) => p.division).filter((d) => d && d !== 'none')).size;

export default function AssociationOnDisplay() {
  const { session, user } = useAuth();
  const { primaryRole } = useAccess();
  const { toast } = useToast();
  const [days, setDays] = useState<AodDay[]>([]);
  const [signups, setSignups] = useState<AodSignup[]>([]);
  const [isSenior, setIsSenior] = useState(false);
  const [loading, setLoading] = useState(true);
  const [newDate, setNewDate] = useState('');
  const [busySlot, setBusySlot] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    try { const res = await listAod(session); setDays(res.days); setSignups(res.signups); setIsSenior(res.isSenior); }
    catch (e) { toast({ title: 'Failed to load', description: e instanceof Error ? e.message : undefined, variant: 'destructive' }); }
    finally { setLoading(false); }
  };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { load(); }, []);

  const addDay = async () => {
    if (!newDate) { toast({ title: 'Pick a date', variant: 'destructive' }); return; }
    try { await createAodDay(session, newDate); logActivity(session, primaryRole, { action: 'create', section: 'Events', subsection: 'Association on Display', entityType: 'aod_day', entityName: newDate }); setNewDate(''); await load(); }
    catch (e) { toast({ title: 'Could not create', description: e instanceof Error ? e.message : undefined, variant: 'destructive' }); }
  };

  const signupsFor = (dayId: string, slot: string) => signups.filter((s) => s.day_id === dayId && s.slot_time === slot);

  const todayStr = new Date().toISOString().slice(0, 10);
  const upcomingDays = useMemo(() => days.filter((d) => d.event_date >= todayStr).sort((a, b) => a.event_date.localeCompare(b.event_date)), [days, todayStr]);
  const pastDays = useMemo(() => days.filter((d) => d.event_date < todayStr).sort((a, b) => b.event_date.localeCompare(a.event_date)), [days, todayStr]);
  const coverageCount = (dayId: string) => AOD_SLOTS.filter((s) => signups.filter((su) => su.day_id === dayId && su.slot_time === s).length >= MIN_COVER).length;

  const handleSignup = async (dayId: string, slot: string) => {
    setBusySlot(`${dayId}-${slot}`);
    try {
      await aodSignup(session, dayId, slot);
      logActivity(session, primaryRole, { action: 'registration', section: 'Events', subsection: 'Association on Display', entityType: 'aod_signup', entityName: `Slot ${slot}`, details: { day_id: dayId } });
      await load();
    }
    catch (e) { toast({ title: 'Could not sign up', description: e instanceof Error ? e.message : undefined, variant: 'destructive' }); }
    finally { setBusySlot(null); }
  };
  const handleRemove = async (id: string) => {
    try { await aodRemoveSignup(session, id); logActivity(session, primaryRole, { action: 'delete', section: 'Events', subsection: 'Association on Display', entityType: 'aod_signup', entityId: id, entityName: 'Slot registration cancelled' }); await load(); }
    catch (e) { toast({ title: 'Could not remove', description: e instanceof Error ? e.message : undefined, variant: 'destructive' }); }
  };

  return (
    <div>
      <WorkspacePageHeader title="Association on Display" description="Organise stand coverage. The stand runs 10:00–19:00 in 30-minute slots; multiple people can take the same slot. Senior roles open or close a day; everyone else can register or de-register up to 48 hours before." />

      {isSenior && (
        <div className="flex gap-2 mb-6 font-body">
          <Input type="date" value={newDate} onChange={(e) => setNewDate(e.target.value)} className="max-w-[200px]" />
          <Button variant="outline" onClick={addDay}><Plus className="h-4 w-4 mr-2" />Add a day</Button>
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
              onDelete={async () => { if (confirm('Delete this day and all signups?')) { try { await deleteAodDay(session, day.id); await load(); } catch (e) { toast({ title: 'Could not delete', description: e instanceof Error ? e.message : undefined, variant: 'destructive' }); } } }}
            />
          ))}

          {/* Register of past sessions */}
          {pastDays.length > 0 && (
            <div>
              <h3 className="font-serif text-lg text-accent mb-2">Past sessions</h3>
              <div className="border border-separator">
                <table className="w-full text-left font-body text-sm">
                  <thead className="bg-muted/40 text-muted-foreground">
                    <tr>
                      <th className="px-3 py-2 font-normal">Date</th>
                      <th className="px-3 py-2 font-normal">Slots covered</th>
                    </tr>
                  </thead>
                  <tbody>
                    {semestersInData(pastDays.map((d) => d.event_date)).map((sem) => (
                      <Fragment key={sem.key}>
                        {/* Semester divider: past sessions stay archived per semester. */}
                        <tr className="border-t border-separator bg-accent/5">
                          <td colSpan={2} className="px-3 py-1.5 font-serif text-accent uppercase tracking-wider text-xs">{sem.label}</td>
                        </tr>
                        {pastDays.filter((d) => semesterOf(d.event_date).key === sem.key).map((d) => (
                          <tr key={d.id} className="border-t border-separator">
                            <td className="px-3 py-2">{new Date(`${d.event_date}T00:00:00`).toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</td>
                            <td className="px-3 py-2">{coverageCount(d.id)} / {AOD_SLOTS.length}</td>
                          </tr>
                        ))}
                      </Fragment>
                    ))}
                  </tbody>
                </table>
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
  const coverage = useMemo(() => AOD_SLOTS.filter((s) => signupsFor(s).length >= MIN_COVER).length, [signupsFor]);
  return (
    <div className="border border-separator">
      <div className="flex items-center justify-between px-4 py-3 bg-muted/40 font-body">
        <div>
          <div className="font-serif text-lg text-accent">{new Date(`${day.event_date}T00:00:00`).toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</div>
          <div className="text-xs text-muted-foreground">{coverage}/{AOD_SLOTS.length} slots covered (a slot needs {MIN_COVER} people) <HelpDot page="events-on-display" topic="coverage" /> · {day.registration_open ? 'Registration open' : 'Registration closed'}</div>
        </div>
        {isSenior && (
          <div className="flex items-center gap-3">
            <span className="text-sm text-muted-foreground">Open</span>
            <Switch checked={day.registration_open} onCheckedChange={onToggleOpen} />
            <Button variant="destructive" size="icon" onClick={onDelete}><Trash2 className="h-4 w-4" /></Button>
          </div>
        )}
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-px bg-separator">
        {AOD_SLOTS.map((slot) => {
          const people = signupsFor(slot);
          const mine = people.find((p) => p.user_id === userId);
          const covered = people.length >= MIN_COVER;
          const divCount = divisionsInSlot(people);
          return (
            <div key={slot} className={`bg-background p-3 font-body border-l-2 ${covered ? 'border-emerald-500' : 'border-amber-500'}`}>
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm font-medium text-foreground">{slot}</span>
                <span className={`text-[11px] px-1.5 py-0.5 rounded ${covered ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}>
                  {covered ? 'Covered' : `${people.length}/${MIN_COVER}`}
                </span>
              </div>
              {/* Registration button: clear, full-width, for everyone. */}
              <div className="mt-2">
                {mine ? (
                  <Button variant="outline" size="sm" className="w-full text-destructive border-destructive/40 hover:bg-destructive/10" onClick={() => onRemove(mine.id)}>
                    Cancel my registration
                  </Button>
                ) : (
                  <Button variant="outline" size="sm" className="w-full" disabled={!day.registration_open || busySlot === `${day.id}-${slot}`} onClick={() => onSignup(slot)}>
                    {busySlot === `${day.id}-${slot}` ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : day.registration_open ? 'Register for this slot' : 'Registration closed'}
                  </Button>
                )}
              </div>
              {/* Registered people + how many divisions are represented. */}
              <div className="mt-2 space-y-0.5">
                <div className="text-[11px] uppercase tracking-wider text-muted-foreground">
                  {people.length} registered · {divCount} division{divCount === 1 ? '' : 's'} covered
                </div>
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
