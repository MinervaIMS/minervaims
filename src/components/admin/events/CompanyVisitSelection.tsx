import { useCallback, useEffect, useMemo, useState } from 'react';
import { Loader2, FileText, Download, Search, Send, Lock, UserPlus, UserMinus, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { HelpDot } from '@/components/admin/help/HelpSystem';
import { divisionLabels } from '@/lib/roles';
import { formatStamp } from '@/lib/event-time';
import {
  listSelection, draftDecision, closeInterestNow, sendDecisions, offerPlace, recordWithdrawal, openCv, downloadInvitedCvs,
  candidateStage, formatClosing, SELECTION_STATEMENT,
  type Selection, type Candidate, type Decision, type SelectionCounts,
} from '@/lib/company-visits-api';

// =====================================================================
// THE SELECTION OF A COMPANY VISIT (Step 93B), above its door list.
// ---------------------------------------------------------------------
// The President and the Vice President read who asked to take part,
// with each person's participation in the Society's activities beside
// their name, and draft a decision for each: Invite, Not this time or
// Undecided. Nothing reaches anybody until "Send decisions", which emails
// everyone at once: the invited get a place (and appear on the door list
// below), the others are told kindly and kept as reserves. Afterwards a
// place that opens up (an invited member writes to say they cannot come:
// "Record a withdrawal") can be offered to a reserve.
//
// The record of participation leads each row and the CV is one link at
// the end: the selection is made on participation and interest in the
// topic, and the CV plays no part in it.
// =====================================================================

type Stage = ReturnType<typeof candidateStage>;
const STAGE_LABEL: Record<Stage, string> = {
  undecided: 'Undecided', draft_invite: 'Invite (draft)', draft_not_selected: 'Not this time (draft)',
  invited: 'Invited', reserve: 'Reserve', withdrawn: 'Withdrawn',
};
const STAGE_CLASS: Record<Stage, string> = {
  undecided: 'text-muted-foreground border-separator',
  draft_invite: 'text-accent border-accent/40 bg-accent/5',
  draft_not_selected: 'text-amber-800 border-amber-600/40 bg-amber-50',
  invited: 'text-emerald-800 border-emerald-600/40 bg-emerald-50',
  reserve: 'text-foreground border-separator bg-muted/40',
  withdrawn: 'text-muted-foreground border-separator line-through',
};
const FILTERS: { value: 'all' | Stage; label: string }[] = [
  { value: 'all', label: 'Everyone' },
  { value: 'undecided', label: 'Undecided' },
  { value: 'draft_invite', label: 'Invite' },
  { value: 'draft_not_selected', label: 'Not this time' },
  { value: 'invited', label: 'Invited' },
  { value: 'reserve', label: 'Reserves' },
  { value: 'withdrawn', label: 'Withdrawn' },
];

type Confirm =
  | { kind: 'send' } | { kind: 'close' } | { kind: 'zip' }
  | { kind: 'offer'; c: Candidate } | { kind: 'withdraw'; c: Candidate };

export function CompanyVisitSelection({ eventId, title, onChanged }: { eventId: string; title: string; onChanged: () => void }) {
  const { session } = useAuth();
  const { toast } = useToast();
  const [data, setData] = useState<Selection | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<'all' | Stage>('all');
  const [sort, setSort] = useState<'participation' | 'requested'>('participation');
  const [confirm, setConfirm] = useState<Confirm | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setData(await listSelection(session, eventId));
      setPicked(new Set());
    } catch (e) {
      toast({ title: 'Could not load the selection', description: e instanceof Error ? e.message : undefined, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, [session, eventId, toast]);
  useEffect(() => { load(); }, [load]);

  const setCounts = (counts: SelectionCounts) => setData((d) => (d ? { ...d, counts } : d));

  const rows = useMemo(() => {
    if (!data) return [];
    const q = query.trim().toLowerCase();
    const list = data.candidates
      .filter((c) => !q || c.name.toLowerCase().includes(q) || c.email.toLowerCase().includes(q))
      .filter((c) => filter === 'all' || candidateStage(c) === filter);
    const score = (c: Candidate) => [c.record?.events_attended_year ?? 0, c.record?.events_attended_total ?? 0, -(c.record?.missed_year ?? 0)];
    return [...list].sort((a, b) => {
      if (sort === 'requested') return a.submitted_at.localeCompare(b.submitted_at);
      const [x, y] = [score(a), score(b)];
      return y[0] - x[0] || y[1] - x[1] || y[2] - x[2] || a.submitted_at.localeCompare(b.submitted_at);
    });
  }, [data, query, filter, sort]);

  if (loading && !data) return <div className="border border-separator p-6 flex justify-center"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>;
  if (!data) return null;

  const { counts, open, started } = data;
  const drafts = counts.draft_invite + counts.draft_not_selected;
  const draftable = (c: Candidate) => !c.notified;
  const pickedDraftable = [...picked].filter((id) => data.candidates.some((c) => c.id === id && draftable(c)));
  const overCapacity = counts.places !== null && counts.invited + counts.draft_invite > counts.places;
  const invitedWithCv = data.candidates.filter((c) => candidateStage(c) === 'invited' && c.has_cv).length;

  const decide = async (ids: string[], decision: Decision) => {
    if (!ids.length) return;
    setBusy('decide');
    // Drafts answer at once; nothing is sent to anybody.
    setData((d) => d ? { ...d, candidates: d.candidates.map((c) => (ids.includes(c.id) && !c.notified ? { ...c, decision } : c)) } : d);
    try {
      const r = await draftDecision(session, eventId, ids, decision);
      setCounts(r.counts);
      setPicked(new Set());
    } catch (e) {
      toast({ title: 'Could not save the decision', description: e instanceof Error ? e.message : undefined, variant: 'destructive' });
      load();
    } finally { setBusy(null); }
  };

  const run = async () => {
    const c = confirm;
    setConfirm(null);
    if (!c) return;
    setBusy(c.kind);
    try {
      if (c.kind === 'close') {
        await closeInterestNow(session, eventId);
        toast({ title: 'The interest form is closed', description: 'Nobody else can register their interest. You can now send the decisions.' });
      } else if (c.kind === 'send') {
        const r = await sendDecisions(session, eventId);
        toast({ title: 'Decisions sent', description: `${r.invited} ${r.invited === 1 ? 'invitation' : 'invitations'} and ${r.not_selected} "not this time" ${r.not_selected === 1 ? 'email' : 'emails'} are on their way.` });
        onChanged();
      } else if (c.kind === 'offer') {
        await offerPlace(session, c.c.id);
        toast({ title: `The place is offered to ${c.c.name}`, description: 'They have been emailed "A place has opened up" with their ticket.' });
        onChanged();
      } else if (c.kind === 'withdraw') {
        await recordWithdrawal(session, c.c.id);
        toast({ title: `${c.c.name} is no longer coming`, description: 'Their place is free: you can offer it to a reserve.' });
        onChanged();
      } else if (c.kind === 'zip') {
        await downloadInvitedCvs(session, eventId, title);
      }
      await load();
    } catch (e) {
      toast({ title: 'That did not work', description: e instanceof Error ? e.message : undefined, variant: 'destructive' });
      load();
    } finally { setBusy(null); }
  };

  const showCv = async (c: Candidate) => {
    try { await openCv(session, c.id); }
    catch (e) { toast({ title: 'Could not open the CV', description: e instanceof Error ? e.message : undefined, variant: 'destructive' }); }
  };

  const togglePick = (id: string) => setPicked((p) => { const n = new Set(p); if (n.has(id)) n.delete(id); else n.add(id); return n; });
  const allDraftable = rows.filter(draftable).map((c) => c.id);
  const allPicked = allDraftable.length > 0 && allDraftable.every((id) => picked.has(id));

  // Plain render functions, not components: a component declared inside a
  // render is a new type every time, and React would remount each row.
  const record = (c: Candidate) => (
    <div className="text-xs text-muted-foreground leading-relaxed">
      {c.record ? (
        <>
          <span className="text-foreground font-medium tabular-nums">{c.record.events_attended_year}</span> this year
          {' · '}<span className="tabular-nums">{c.record.events_attended_total}</span> in all
          {c.record.visits_attended > 0 && <> · {c.record.visits_attended} {c.record.visits_attended === 1 ? 'visit' : 'visits'}</>}
          {c.record.missed_year > 0 && <span className="text-amber-700"> · missed {c.record.missed_year}</span>}
          {c.record.visits_missed > 0 && <span className="text-destructive"> · {c.record.visits_missed} {c.record.visits_missed === 1 ? 'visit' : 'visits'} not attended</span>}
        </>
      ) : 'No record'}
    </div>
  );

  const who = (c: Candidate) => (
    <div className="min-w-0">
      <div className="text-sm text-foreground break-words">{c.name}</div>
      <div className="text-xs text-muted-foreground">
        {[c.kind === 'alumni' ? 'Alumni' : 'Member', c.member?.division && c.member.division !== 'none' ? divisionLabels[c.member.division] : null].filter(Boolean).join(' · ')}
      </div>
    </div>
  );

  const decisionControl = (c: Candidate) => {
    const stage = candidateStage(c);
    if (c.notified) {
      return (
        <div className="flex flex-wrap items-center gap-2">
          <span className={`text-xs border px-1.5 py-0.5 whitespace-nowrap ${STAGE_CLASS[stage]}`}>{STAGE_LABEL[stage]}{stage === 'invited' && c.attended ? ' · attended' : ''}</span>
          {stage === 'reserve' && !started && (
            <Button size="sm" variant="outline" disabled={!!busy || (counts.places_left === 0)} onClick={() => setConfirm({ kind: 'offer', c })}
              title={counts.places_left === 0 ? 'All places are taken: record a withdrawal first.' : undefined}>
              <UserPlus className="h-3.5 w-3.5 mr-1" />Offer a place
            </Button>
          )}
          {stage === 'invited' && !started && !c.attended && (
            <Button size="sm" variant="ghost" className="text-destructive" disabled={!!busy} onClick={() => setConfirm({ kind: 'withdraw', c })}>
              <UserMinus className="h-3.5 w-3.5 mr-1" />Record a withdrawal
            </Button>
          )}
        </div>
      );
    }
    const choice = (d: Decision, label: string, on: string) => (
      <button
        type="button"
        disabled={busy === 'decide'}
        onClick={() => decide([c.id], d)}
        aria-pressed={c.decision === d}
        className={`px-2 py-1 text-xs border-y border-r first:border-l border-separator transition-colors ${c.decision === d ? on : 'bg-background text-muted-foreground hover:text-foreground'}`}
      >{label}</button>
    );
    return (
      <div className="inline-flex" role="group" aria-label={`Decision for ${c.name}`}>
        {choice('invite', 'Invite', 'bg-accent text-accent-foreground border-accent')}
        {choice('not_selected', 'Not this time', 'bg-amber-100 text-amber-900')}
        {choice('pending', 'Undecided', 'bg-muted text-foreground')}
      </div>
    );
  };

  const tiles: { label: string; value: string | number; strong?: boolean }[] = [
    { label: 'Interested', value: counts.interested },
    { label: 'Invites sent', value: counts.places !== null ? `${counts.invited} of ${counts.places}` : counts.invited, strong: true },
    { label: 'Places left', value: counts.places_left ?? 'No limit' },
    { label: 'Undecided', value: counts.undecided },
    { label: 'Drafts to send', value: drafts },
    { label: 'Reserves', value: counts.reserves },
  ];

  return (
    <section className="mb-8 font-body border border-separator">
      <div className="p-4 space-y-3 border-b border-separator">
        <div className="flex flex-col lg:flex-row lg:items-start gap-3">
          <div className="flex-1 min-w-0">
            <h3 className="font-serif text-lg text-accent inline-flex items-center gap-2">Selection <HelpDot page="events-attendance" topic="company-visits" /></h3>
            <p className="text-sm text-muted-foreground">
              {open
                ? <>The interest form is open until <span className="text-foreground">{formatClosing(data.event.interest_closes_at)}</span>. You can draft decisions now; they are sent once it closes.</>
                : <>The interest form closed on <span className="text-foreground">{formatClosing(data.event.interest_closes_at)}</span>.</>}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {open && !started && (
              <Button variant="outline" size="sm" disabled={!!busy} onClick={() => setConfirm({ kind: 'close' })}><Lock className="h-4 w-4 mr-1.5" />Close the form now</Button>
            )}
            {invitedWithCv > 0 && (
              <Button variant="outline" size="sm" disabled={!!busy} onClick={() => setConfirm({ kind: 'zip' })}>
                {busy === 'zip' ? <Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> : <Download className="h-4 w-4 mr-1.5" />}Invited CVs (ZIP)
              </Button>
            )}
            {!started && (
              <Button variant="solid" size="sm" disabled={!!busy || open || drafts === 0 || overCapacity} onClick={() => setConfirm({ kind: 'send' })}
                title={open ? 'Close the interest form first.' : drafts === 0 ? 'Mark people Invite or Not this time first.' : overCapacity ? 'More invitations than places.' : undefined}>
                {busy === 'send' ? <Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> : <Send className="h-4 w-4 mr-1.5" />}Send decisions{drafts ? ` (${drafts})` : ''}
              </Button>
            )}
          </div>
        </div>
        <p className="text-xs text-muted-foreground flex items-start gap-1.5"><Info className="h-3.5 w-3.5 mt-0.5 shrink-0" /><span>{SELECTION_STATEMENT.replace('Your CV does not count', 'The CV does not count')} Participation is counted from the attendance lists: events attended since 1 September, in all, company visits, and events registered for but missed.</span></p>
        <ul className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2" aria-label="Selection in numbers">
          {tiles.map((t) => (
            <li key={t.label} className={`border px-3 py-2 ${t.strong ? 'border-accent/50 bg-accent/5' : 'border-separator'}`}>
              <div className="text-[11px] uppercase tracking-wider text-muted-foreground">{t.label}</div>
              <div className={`tabular-nums text-lg ${t.strong ? 'text-accent font-semibold' : 'text-foreground'}`}>{t.value}</div>
            </li>
          ))}
        </ul>
        {overCapacity && (
          <p className="text-sm text-destructive">{counts.invited + counts.draft_invite} invitations for {counts.places} places: mark fewer people Invite, or raise the places in Registration Forms.</p>
        )}
      </div>

      {data.candidates.length === 0 ? (
        <p className="p-6 text-center text-sm text-muted-foreground">Nobody has registered their interest yet{open ? '. Share the visit’s page with members and alumni.' : '.'}</p>
      ) : (
        <div className="p-4 space-y-3">
          <div className="flex flex-col md:flex-row gap-2 md:items-center">
            <div className="relative flex-1 min-w-0">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" aria-hidden />
              <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search by name or email" className="pl-9" aria-label="Search the people interested" />
            </div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground shrink-0">
              Order by
              <div className="inline-flex" role="group" aria-label="Order">
                {(['participation', 'requested'] as const).map((s) => (
                  <button key={s} type="button" onClick={() => setSort(s)} aria-pressed={sort === s}
                    className={`px-2 py-1 border-y border-r first:border-l border-separator ${sort === s ? 'bg-accent text-accent-foreground border-accent' : 'bg-background hover:text-foreground'}`}>
                    {s === 'participation' ? 'Participation' : 'Date of request'}
                  </button>
                ))}
              </div>
            </div>
          </div>
          <div className="flex flex-wrap gap-1.5" role="group" aria-label="Show">
            {FILTERS.map((f) => {
              const n = f.value === 'all' ? data.candidates.length : data.candidates.filter((c) => candidateStage(c) === f.value).length;
              if (f.value !== 'all' && n === 0) return null;
              return (
                <button key={f.value} type="button" onClick={() => setFilter(f.value)} aria-pressed={filter === f.value}
                  className={`text-xs px-2.5 py-1 border ${filter === f.value ? 'border-accent bg-accent text-accent-foreground' : 'border-separator text-muted-foreground hover:text-foreground'}`}>
                  {f.label} <span className="tabular-nums opacity-80">{n}</span>
                </button>
              );
            })}
          </div>

          {pickedDraftable.length > 0 && (
            <div className="flex flex-wrap items-center gap-2 border border-accent/40 bg-accent/5 px-3 py-2 text-sm" role="status">
              <span className="text-foreground">{pickedDraftable.length} selected:</span>
              <Button size="sm" variant="outline" disabled={busy === 'decide'} onClick={() => decide(pickedDraftable, 'invite')}>Invite</Button>
              <Button size="sm" variant="outline" disabled={busy === 'decide'} onClick={() => decide(pickedDraftable, 'not_selected')}>Not this time</Button>
              <Button size="sm" variant="ghost" disabled={busy === 'decide'} onClick={() => decide(pickedDraftable, 'pending')}>Undecided</Button>
              <Button size="sm" variant="link" onClick={() => setPicked(new Set())}>Clear</Button>
            </div>
          )}

          {rows.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">Nobody matches.</p>
          ) : (
            <>
              <ul className="md:hidden border border-separator divide-y divide-separator">
                {rows.map((c) => (
                  <li key={c.id} className="p-3 space-y-2">
                    <div className="flex items-start gap-3">
                      {draftable(c) && <Checkbox checked={picked.has(c.id)} onCheckedChange={() => togglePick(c.id)} className="mt-1 h-5 w-5" aria-label={`Select ${c.name}`} />}
                      <div className="flex-1 min-w-0">{who(c)}{record(c)}</div>
                      {c.has_cv && <Button size="sm" variant="ghost" onClick={() => showCv(c)} aria-label={`Open the CV of ${c.name}`}><FileText className="h-4 w-4" /></Button>}
                    </div>
                    {decisionControl(c)}
                  </li>
                ))}
              </ul>
              <div className="hidden md:block border border-separator overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-muted/40 text-muted-foreground">
                    <tr>
                      <th className="px-3 py-2 w-8">
                        {allDraftable.length > 0 && <Checkbox checked={allPicked} onCheckedChange={() => setPicked(allPicked ? new Set() : new Set(allDraftable))} aria-label="Select everyone undecided on screen" />}
                      </th>
                      <th className="px-3 py-2 font-normal">Name</th>
                      <th className="px-3 py-2 font-normal">Participation</th>
                      <th className="px-3 py-2 font-normal">Requested</th>
                      <th className="px-3 py-2 font-normal">Decision</th>
                      <th className="px-3 py-2 font-normal text-right">CV</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((c) => (
                      <tr key={c.id} className="border-t border-separator align-top">
                        <td className="px-3 py-2">{draftable(c) && <Checkbox checked={picked.has(c.id)} onCheckedChange={() => togglePick(c.id)} aria-label={`Select ${c.name}`} />}</td>
                        <td className="px-3 py-2">{who(c)}</td>
                        <td className="px-3 py-2">{record(c)}</td>
                        <td className="px-3 py-2 text-xs text-muted-foreground whitespace-nowrap">{formatStamp(c.submitted_at)}</td>
                        <td className="px-3 py-2">{decisionControl(c)}</td>
                        <td className="px-3 py-2 text-right">
                          {c.has_cv
                            ? <Button size="sm" variant="ghost" onClick={() => showCv(c)} aria-label={`Open the CV of ${c.name}`}><FileText className="h-4 w-4 mr-1" />Open</Button>
                            : <span className="text-xs text-muted-foreground">{c.cv_deleted ? 'Deleted' : '-'}</span>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      )}

      <AlertDialog open={!!confirm} onOpenChange={(o) => { if (!o) setConfirm(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="font-serif">
              {confirm?.kind === 'send' && 'Send the decisions now?'}
              {confirm?.kind === 'close' && 'Close the interest form now?'}
              {confirm?.kind === 'zip' && 'Download the CVs of the members invited?'}
              {confirm?.kind === 'offer' && `Offer the place to ${confirm.c.name}?`}
              {confirm?.kind === 'withdraw' && `Record that ${confirm.c.name} is not coming?`}
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-2 text-sm">
                {confirm?.kind === 'send' && (
                  <>
                    <p>{counts.draft_invite} {counts.draft_invite === 1 ? 'person receives an invitation' : 'people receive an invitation'}, with their ticket, and {counts.draft_not_selected} {counts.draft_not_selected === 1 ? 'receives' : 'receive'} the &ldquo;not this time&rdquo; email and {counts.draft_not_selected === 1 ? 'is' : 'are'} kept as {counts.draft_not_selected === 1 ? 'a reserve' : 'reserves'}.</p>
                    {counts.undecided > 0 && <p>{counts.undecided} undecided {counts.undecided === 1 ? 'person hears' : 'people hear'} nothing yet.</p>}
                    <p>The emails go out at once and cannot be taken back.</p>
                  </>
                )}
                {confirm?.kind === 'close' && <p>Nobody else can register their interest, and the page says the form is closed. The decisions can then be sent.</p>}
                {confirm?.kind === 'zip' && <p>Share them only with the host company, and only because it asked for them (Privacy Policy, section 13). The CVs of the people not selected are never shared. The download is recorded in Activity tracking.</p>}
                {confirm?.kind === 'offer' && <p>They are emailed &ldquo;A place has opened up&rdquo; with their ticket, and appear on the door list.</p>}
                {confirm?.kind === 'withdraw' && <p>Use this when they have written to say they cannot come. They leave the door list and their place can be offered to a reserve. Nobody is emailed.</p>}
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={run}>
              {confirm?.kind === 'send' ? 'Send now' : confirm?.kind === 'close' ? 'Close the form' : confirm?.kind === 'zip' ? 'Download' : confirm?.kind === 'offer' ? 'Offer the place' : 'Record it'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </section>
  );
}

/** For everybody else with Attendance: what is happening, without the people. */
export function CompanyVisitSelectionNote({ closesAt }: { closesAt: string | null | undefined }) {
  return (
    <div className="mb-6 border border-separator bg-muted/30 px-4 py-3 font-body text-sm text-muted-foreground flex items-start gap-2" role="status">
      <Info className="h-4 w-4 mt-0.5 shrink-0" />
      <span>
        This company visit selects its participants. Members and alumni register their interest until {formatClosing(closesAt) || 'the closing date'};
        the President and the Vice President then choose who goes, here. The people invited appear on the list below, with their tickets.
      </span>
    </div>
  );
}
