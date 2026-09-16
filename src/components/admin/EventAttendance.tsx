import { useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Trash2, Download, Search, UserCheck, AlertTriangle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { downloadCSV } from '@/lib/download-utils';
import { WorkspacePageHeader } from '@/components/admin/WorkspacePageHeader';
import { WorkspaceLoader } from '@/components/admin/WorkspaceLoader';
import { ColumnFilter } from '@/components/admin/ColumnFilter';
import { ClearFilters } from '@/components/shared/ClearFilters';
import { HelpDot } from '@/components/admin/help/HelpSystem';
import { divisionLabels } from '@/lib/roles';
import {
  listEvents, listRegistrations, markAttended, addExternalAttendee, removeRegistration,
  isRecognisedMember, MEMBER_MATCH_LABELS, MEMBER_MATCH_NOTE,
  type EventRow, type EventRegistration, type MemberMatch,
} from '@/lib/events-api';

// =====================================================================
// ATTENDANCE: A DOOR LIST, AND IT IS USED AT A DOOR.
// ---------------------------------------------------------------------
// Two things were wrong with this page, and both came from the same
// assumption: that it would be read at a desk, afterwards.
//
// IT IS NOT. It is read standing up, with a queue in front of you, and
// the questions are "is this person on the list" and "are they one of
// ours". So the list can now be SEARCHED and FILTERED instead of scanned,
// and below the desktop breakpoint it stops being a table with five
// columns and becomes a list of rows you can hit with a thumb. The page
// is also the single exception to the workspace's read-only-on-mobile
// rule, because there is no desktop at a door: see lib/mobile-policy.ts.
//
// AND "ONE OF OURS" IS NO LONGER THE SAME QUESTION AS "WAS SIGNED IN".
// The public form takes a name and an address and asks for no account,
// which is the point of a public event; a member who used it was stored
// as an external guest. The endpoint now checks the register of members
// and says how it knows - see _shared/member-match.ts - and this page
// draws the difference, because an address identifies one person and a
// name is a good guess.
// =====================================================================

/** The three questions a door list is filtered by. */
const ATTENDED_OPTIONS = [
  { value: 'yes', label: 'Attended' },
  { value: 'no', label: 'Not yet' },
];
const TYPE_OPTIONS = [
  { value: 'member', label: 'Member' },
  { value: 'guest', label: 'Guest' },
];
const MATCH_OPTIONS: { value: MemberMatch | 'ambiguous'; label: string }[] = [
  { value: 'account', label: MEMBER_MATCH_LABELS.account },
  { value: 'email', label: MEMBER_MATCH_LABELS.email },
  { value: 'name', label: MEMBER_MATCH_LABELS.name },
  { value: 'ambiguous', label: 'Name is ambiguous' },
  { value: 'none', label: MEMBER_MATCH_LABELS.none },
];

/** How a registration was recognised, defaulting for a row with no answer. */
function matchOf(r: EventRegistration): MemberMatch {
  if (r.member_match) return r.member_match;
  // A row written before any of this existed, or one that did not come
  // through the endpoint: `is_member` is the only thing known about it.
  return r.is_member ? 'account' : 'none';
}

export default function EventAttendance() {
  const { session } = useAuth();
  const { toast } = useToast();
  const [events, setEvents] = useState<EventRow[]>([]);
  const [eventId, setEventId] = useState<string>('');
  const [regs, setRegs] = useState<EventRegistration[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingRegs, setLoadingRegs] = useState(false);
  const [ext, setExt] = useState({ name: '', surname: '', email: '' });
  const [busy, setBusy] = useState<string | null>(null);
  const [addOpen, setAddOpen] = useState(false);

  const [search, setSearch] = useState('');
  const [attendedFilter, setAttendedFilter] = useState<string[]>([]);
  const [typeFilter, setTypeFilter] = useState<string[]>([]);
  const [matchFilter, setMatchFilter] = useState<string[]>([]);

  useEffect(() => {
    (async () => {
      try {
        const evs = await listEvents();
        setEvents(evs);
        if (evs.length) setEventId(evs[0].id);
      } catch (e) { toast({ title: 'Failed to load events', description: e instanceof Error ? e.message : undefined, variant: 'destructive' }); }
      finally { setLoading(false); }
    })();
  }, [toast]);

  const loadRegs = async (id: string) => {
    if (!id) return;
    setLoadingRegs(true);
    try { setRegs(await listRegistrations(session, id)); }
    catch (e) { toast({ title: 'Failed to load attendees', description: e instanceof Error ? e.message : undefined, variant: 'destructive' }); }
    finally { setLoadingRegs(false); }
  };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { if (eventId) loadRegs(eventId); }, [eventId]);

  // ── searching and filtering ──────────────────────────────────────────
  // THE SEARCH READS THE MEMBER'S NAME TOO, not only what they typed. A
  // person who registered as "M. Rossi" and was recognised as Mario Rossi
  // has to be findable by the name you know them by, which is the one on
  // the register rather than the one in the box.
  const rows = useMemo(() => {
    const q = search.trim().toLowerCase();
    return regs
      .filter((r) => !q
        || (r.name || '').toLowerCase().includes(q)
        || (r.email || '').toLowerCase().includes(q)
        || (r.member_name || '').toLowerCase().includes(q)
        || (r.affiliation || '').toLowerCase().includes(q)
        || (r.programme || '').toLowerCase().includes(q))
      .filter((r) => attendedFilter.length === 0 || attendedFilter.includes(r.attended ? 'yes' : 'no'))
      .filter((r) => typeFilter.length === 0 || typeFilter.includes(isRecognisedMember(r) ? 'member' : 'guest'))
      .filter((r) => matchFilter.length === 0
        || matchFilter.includes(matchOf(r))
        || (r.member_ambiguous ? matchFilter.includes('ambiguous') : false));
  }, [regs, search, attendedFilter, typeFilter, matchFilter]);

  const activeFilterCount = (attendedFilter.length > 0 ? 1 : 0) + (typeFilter.length > 0 ? 1 : 0)
    + (matchFilter.length > 0 ? 1 : 0) + (search.trim() ? 1 : 0);
  const clearAllFilters = () => {
    setAttendedFilter([]); setTypeFilter([]); setMatchFilter([]); setSearch('');
  };

  // Counts describe the WHOLE event, not the filtered view: a door list
  // narrowed to one division must not make the room look empty.
  const counts = useMemo(() => ({
    total: regs.length,
    attended: regs.filter((r) => r.attended).length,
    members: regs.filter((r) => isRecognisedMember(r)).length,
    guests: regs.filter((r) => !isRecognisedMember(r)).length,
    ambiguous: regs.filter((r) => r.member_ambiguous).length,
  }), [regs]);

  const toggle = async (r: EventRegistration) => {
    if (busy) return;
    const next = !r.attended;
    setBusy(r.id);
    // Optimistic: at a door the tick has to answer immediately, and the
    // only thing at stake if it fails is one checkbox, put back.
    setRegs((p) => p.map((x) => (x.id === r.id ? { ...x, attended: next } : x)));
    try { await markAttended(session, r.id, next); }
    catch (e) {
      setRegs((p) => p.map((x) => (x.id === r.id ? { ...x, attended: !next } : x)));
      toast({ title: 'Could not update', description: e instanceof Error ? e.message : undefined, variant: 'destructive' });
    } finally { setBusy(null); }
  };

  const addExt = async () => {
    if (!ext.name.trim()) { toast({ title: 'Name is required', variant: 'destructive' }); return; }
    try {
      await addExternalAttendee(session, eventId, ext.name.trim(), ext.surname.trim(), ext.email.trim(), true);
      setExt({ name: '', surname: '', email: '' });
      setAddOpen(false);
      await loadRegs(eventId);
    }
    catch (e) { toast({ title: 'Could not add', description: e instanceof Error ? e.message : undefined, variant: 'destructive' }); }
  };

  const remove = async (id: string) => {
    try { await removeRegistration(session, id); setRegs((p) => p.filter((x) => x.id !== id)); }
    catch (e) { toast({ title: 'Could not remove', description: e instanceof Error ? e.message : undefined, variant: 'destructive' }); }
  };

  // The export follows what is on screen, so a filtered list exports as
  // the list you were looking at, and carries how each person was known.
  const exportCsv = () => {
    downloadCSV(
      rows.map((r) => ({
        name: r.name,
        email: r.email ?? '',
        type: isRecognisedMember(r) ? 'Member' : 'Guest',
        recognised: MEMBER_MATCH_LABELS[matchOf(r)],
        member: r.member_name ?? '',
        division: r.member_division ? divisionLabels[r.member_division] : '',
        attended: r.attended ? 'Yes' : 'No',
      })),
      [
        { key: 'name', header: 'Name' }, { key: 'email', header: 'Email' },
        { key: 'type', header: 'Type' }, { key: 'recognised', header: 'Recognised' },
        { key: 'member', header: 'Member on file' }, { key: 'division', header: 'Division' },
        { key: 'attended', header: 'Attended' },
      ],
      'attendance.csv',
    );
  };

  if (loading) return <div><WorkspacePageHeader title="Attendance" description="Track who registered and who attended." /><WorkspaceLoader /></div>;

  return (
    <div>
      <WorkspacePageHeader title="Attendance" description="Who registered for an event, and who came." />

      <div className="mb-4 flex flex-col sm:flex-row gap-3 sm:items-center font-body">
        <div className="flex-1 min-w-0">
          {/* Standard filter format: no label above the field. */}
          <Select value={eventId} onValueChange={setEventId}>
            <SelectTrigger className="font-body"><SelectValue placeholder="Select an event…" /></SelectTrigger>
            <SelectContent>{events.map((e) => <SelectItem key={e.id} value={e.id}>{e.title} - {new Date(e.start_at || e.date).toLocaleDateString()}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <Button data-ro variant="outline" className="font-body shrink-0" disabled={rows.length === 0} onClick={exportCsv}>
          <Download className="h-4 w-4 mr-2" />CSV
        </Button>
      </div>

      {/* SEARCH FIRST, because at a door you are looking for one person and
          you know their name. Full width on a phone, where it is the only
          control that matters. */}
      <div className="relative mb-3 font-body">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" aria-hidden />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by name, email, programme…"
          className="pl-9"
          autoComplete="off"
          aria-label="Search the people registered"
        />
      </div>

      <div className="mb-3 flex flex-wrap items-center gap-x-4 gap-y-2 font-body">
        <ColumnFilter label="Attendance" options={ATTENDED_OPTIONS} selected={attendedFilter} onChange={setAttendedFilter} />
        <ColumnFilter label="Type" options={TYPE_OPTIONS} selected={typeFilter} onChange={setTypeFilter} />
        <ColumnFilter label="Recognised" options={MATCH_OPTIONS} selected={matchFilter} onChange={setMatchFilter} />
        <HelpDot page="events-attendance" topic="recognising-members" />
      </div>
      <ClearFilters count={activeFilterCount} onClear={clearAllFilters} size="sm" className="mb-3" />

      <p className="font-body text-sm text-muted-foreground mb-2">
        {counts.attended}/{counts.total} attended · {counts.members} members · {counts.guests} guests
        {activeFilterCount > 0 && <> · showing {rows.length}</>}
      </p>

      {counts.ambiguous > 0 && (
        /* THE ONE CASE A PERSON HAS TO SETTLE. Two members with the same
           name means the register cannot say which of them registered, and
           guessing would credit attendance to the wrong person. */
        <p className="font-body text-xs text-amber-700 mb-4 inline-flex items-start gap-1.5">
          <AlertTriangle className="h-3.5 w-3.5 mt-px shrink-0" aria-hidden />
          <span>
            {counts.ambiguous === 1 ? 'One registration matches' : `${counts.ambiguous} registrations match`} more than one
            member by name, so nobody is claimed for {counts.ambiguous === 1 ? 'it' : 'them'}. Filter by
            <strong> Name is ambiguous</strong> to settle {counts.ambiguous === 1 ? 'it' : 'them'} by hand.
          </span>
        </p>
      )}

      {/* ==============================================================
          THE WALK-IN FORM IS FOLDED AWAY UNTIL IT IS WANTED.
          Three text fields and a button stood permanently between the
          counts and the list. On a phone that is most of the screen, so
          the door list - the thing the page is for - started below the
          fold, and the first thing a person does at a door is look
          somebody up rather than add them. It is one press away, and the
          press is a big one. */}
      <div className="mb-5 font-body">
        {addOpen ? (
          <div className="border border-separator p-3 space-y-2">
            <div className="text-xs uppercase tracking-wider text-muted-foreground">Somebody who turned up</div>
            <div className="grid grid-cols-1 sm:grid-cols-[1fr_1fr_1.4fr] gap-2">
              <Input placeholder="Name" value={ext.name} onChange={(e) => setExt({ ...ext, name: e.target.value })} autoComplete="off" />
              <Input placeholder="Surname" value={ext.surname} onChange={(e) => setExt({ ...ext, surname: e.target.value })} autoComplete="off" />
              <Input placeholder="Email (added to newsletter)" value={ext.email} onChange={(e) => setExt({ ...ext, email: e.target.value })} autoComplete="off" />
            </div>
            <div className="flex gap-2">
              <Button className="flex-1 sm:flex-none" onClick={addExt} disabled={!eventId || !ext.name.trim()}>
                <Plus className="h-4 w-4 mr-2" />Add and mark as attended
              </Button>
              <Button data-ro variant="outline" onClick={() => { setAddOpen(false); setExt({ name: '', surname: '', email: '' }); }}>
                Cancel
              </Button>
            </div>
          </div>
        ) : (
          <Button variant="outline" className="w-full sm:w-auto" disabled={!eventId} onClick={() => setAddOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />Add someone who turned up
          </Button>
        )}
      </div>

      {loadingRegs ? <WorkspaceLoader /> : regs.length === 0 ? (
        <Card><CardContent className="py-12 text-center"><p className="font-body text-muted-foreground">No registrations yet.</p></CardContent></Card>
      ) : rows.length === 0 ? (
        <Card><CardContent className="py-10 text-center">
          <p className="font-body text-muted-foreground">Nobody matches what you are looking for.</p>
        </CardContent></Card>
      ) : (
        <>
          {/* ============================================================
              ON A PHONE IT IS A LIST YOU CAN HIT WITH A THUMB.
              A five-column table on a 390px screen means scrolling
              sideways to reach the one control that matters, once per
              person, in front of a queue. Each person is one row: a large
              tick box, the name, and what is known about them underneath.
              ============================================================ */}
          <ul className="md:hidden border border-separator divide-y divide-separator font-body">
            {rows.map((r) => (
              <li key={r.id} className="flex items-start gap-3 p-3">
                <label className="flex items-center pt-0.5 cursor-pointer">
                  <Checkbox
                    checked={r.attended}
                    disabled={busy === r.id}
                    onCheckedChange={() => toggle(r)}
                    className="h-6 w-6"
                    aria-label={`${r.attended ? 'Mark as not attended' : 'Mark as attended'}: ${r.name}`}
                  />
                </label>
                <div className="min-w-0 flex-1">
                  <div className="text-sm text-foreground break-words">{r.name}</div>
                  <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1">
                    <MemberTag reg={r} />
                    {r.email && <span className="text-xs text-muted-foreground break-all">{r.email}</span>}
                  </div>
                </div>
                <Button
                  variant="ghost" size="icon"
                  className="shrink-0 text-destructive"
                  onClick={() => remove(r.id)}
                  aria-label={`Remove ${r.name}`}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </li>
            ))}
          </ul>

          <div className="hidden md:block max-w-full border border-separator overflow-x-auto">
            <table className="w-full text-left font-body text-sm">
              <thead className="bg-muted/40 text-muted-foreground">
                <tr>
                  <th className="px-3 py-2 font-normal text-center">Attended</th>
                  <th className="px-3 py-2 font-normal">Name</th>
                  <th className="px-3 py-2 font-normal">Email</th>
                  <th className="px-3 py-2 font-normal">Type</th>
                  <th className="px-3 py-2 font-normal text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id} className="border-t border-separator">
                    <td className="px-3 py-2 text-center">
                      <Checkbox
                        checked={r.attended}
                        disabled={busy === r.id}
                        onCheckedChange={() => toggle(r)}
                        aria-label={`${r.attended ? 'Mark as not attended' : 'Mark as attended'}: ${r.name}`}
                      />
                    </td>
                    <td className="px-3 py-2 text-foreground">
                      {r.name}
                      {/* The name on the REGISTER, when it differs from what
                          they typed. "M. Rossi" on the door, Mario Rossi on
                          the books, and the reader can see both. */}
                      {r.member_name && r.member_name.toLowerCase() !== (r.name || '').toLowerCase() && (
                        <span className="block text-xs text-muted-foreground">on the register: {r.member_name}</span>
                      )}
                    </td>
                    <td className="px-3 py-2 break-all">{r.email || '-'}</td>
                    <td className="px-3 py-2"><MemberTag reg={r} /></td>
                    <td className="px-3 py-2 text-right">
                      <Button variant="destructive" size="icon" onClick={() => remove(r.id)} aria-label={`Remove ${r.name}`}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}

/**
 * What is known about this person, in one mark.
 *
 * The evidence is carried into the label rather than flattened to
 * "Member", because the three answers are not equally certain and a
 * reader deciding whether to let somebody in should be able to tell a
 * fact from a good guess. The tooltip says which.
 */
function MemberTag({ reg }: { reg: EventRegistration }) {
  const match = matchOf(reg);
  const isMember = isRecognisedMember(reg);

  if (!isMember) {
    return (
      <span
        className="inline-flex items-center gap-1 text-xs text-muted-foreground"
        title={reg.member_ambiguous
          ? 'The name matches more than one member, so nobody is claimed for it.'
          : MEMBER_MATCH_NOTE.none}
      >
        {reg.member_ambiguous && <AlertTriangle className="h-3 w-3 text-amber-600" aria-hidden />}
        {reg.member_ambiguous ? 'Ambiguous name' : 'Guest'}
      </span>
    );
  }

  // A name match is the one worth flagging as probable rather than certain.
  const probable = match === 'name';
  return (
    /* EACH PART WRAPS AS A UNIT. On a phone the tag broke inside its own
       phrases - "matched by / email", "Macro / Research" - which reads as
       two half-facts. The line may wrap between the parts; none of them
       may wrap inside itself. */
    <span
      className={`inline-flex flex-wrap items-center gap-x-1 text-xs ${probable ? 'text-amber-700' : 'text-emerald-700'}`}
      title={MEMBER_MATCH_NOTE[match]}
    >
      <span className="inline-flex items-center gap-1 whitespace-nowrap">
        <UserCheck className="h-3 w-3 shrink-0" aria-hidden />Member
      </span>
      <span className="text-muted-foreground whitespace-nowrap">· {MEMBER_MATCH_LABELS[match].toLowerCase()}</span>
      {reg.member_division && (
        <span className="text-muted-foreground whitespace-nowrap">· {divisionLabels[reg.member_division]}</span>
      )}
    </span>
  );
}
