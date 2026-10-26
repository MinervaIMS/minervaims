import { useEffect, useMemo, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Send, Mail, Search, ChevronLeft, ChevronRight, Undo2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { ColumnFilter } from '@/components/admin/ColumnFilter';
import { FilterSheet, FilterSummary, filterChips, type FilterGroup } from '@/components/admin/kit/Filters';
import { RecordCard, RecordList, Detail } from '@/components/admin/kit/RecordCard';
import { MoreMenu } from '@/components/admin/kit/MoreMenu';
import { Pinned, REGISTER_HELD_COLUMN, REGISTER_HEAD, RegisterFrame, RegisterPage } from '@/components/admin/kit/Register';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { logActivity } from '@/lib/activity-log';
import { useAccess } from '@/hooks/useAccess';

import { Lock } from 'lucide-react';
import { divisionLabels, roleLabel as composeRoleLabel, divisionsForRole, type OrgDivision, type AppRole } from '@/lib/roles';
import { WorkspacePageHeader } from '@/components/admin/WorkspacePageHeader';
import { HelpDot } from '@/components/admin/help/HelpSystem';
import { WorkspaceLoader } from '@/components/admin/WorkspaceLoader';
import { useEmailConfirm } from '@/components/admin/EmailConfirmDialog';
import { listApplications, sendOffer, withdrawOffer, addApplicationNote, evaluationDivision, applyDivisionLabel, JOINT_INTAKE, ACADEMIC_YEAR_LABELS, type ApplicationRow } from '@/lib/applications-api';
import { useCandidateDetail } from '@/components/admin/recruiting/useCandidateDetail';
import { CandidateProfile, CandidateStage } from '@/components/admin/recruiting/CandidateProfile';
import { currentSemester, semesterOf, semestersInData } from '@/lib/semester';

const JOIN_ROLES: AppRole[] = ['analyst', 'senior_analyst', 'team_leader', 'portfolio_manager', 'media_analyst', 'operations_analyst'];

// =====================================================================
// THE DIVISION A CANDIDATE WAS SELECTED FOR - not the two they asked for.
// ---------------------------------------------------------------------
// The column used to read "Preference" and print both choices, e.g.
// "Equity Research / Macro Research". By the time a candidacy reaches
// Offers the preferences have been settled: the person was interviewed
// by one division and it is that division that decided to take them.
// Printing the original pair here asks the reader to work out which of
// the two actually happened, and a candidate transferred after interview
// is shown neither.
//
// So the column reads DIVISION and prints the one the offer concerns, in
// the same precedence the offer dialog itself uses:
//
//   offer_division      - the division on an offer already prepared or sent
//   evaluation_division - otherwise, the division that assessed them,
//                         which is what Candidates screening sets and what
//                         every email to this candidate has named
//   interview_division  - then the division that interviewed them, for
//                         rows written before the evaluation division
//   first_choice        - and only if none of the above was ever recorded
//
// Because it is the same precedence, the column and the dialog can never
// disagree, and changing the division in the confirmation pop-up (still
// possible, and still the only place it can be changed) is reflected here
// as soon as the offer is saved.
// =====================================================================
const selectedDivision = (a: ApplicationRow): OrgDivision =>
  (a.offer_division as OrgDivision) || evaluationDivision(a);

// =====================================================================
// THE ROLE AN OFFER STARTS FROM.
// ---------------------------------------------------------------------
// The dialog always opened on "Analyst", which is a research role: its
// division list is the five research divisions. For a candidate from the
// joint Media & Communication and Operations intake that meant a division
// field showing an intake the role cannot take, and an offer the server
// then refused ("Choose one of the five research divisions") until the
// role was changed by hand.
//
// The joint intake is where the split between its two divisions is made.
// An offer there appoints a Media & Communication Analyst or, since step
// 85, an Operations Analyst; appointing the Head of Operations remains a
// leadership appointment made in People > Members, never through an
// offer. A joint-intake candidate starts on Media & Communication Analyst,
// and the dialog switches to Operations Analyst in one choice. A role already saved on the offer still wins, but
// only when it fits the division saved with it: an offer saved as
// "Analyst" in Media & Communication (the pair the server refuses) would
// otherwise reopen as an Analyst in Equity Research, the first division
// that role can take, which is an offer for a different division.
// =====================================================================
const startingRole = (a: ApplicationRow): AppRole => {
  const saved = a.offer_role as AppRole | null;
  if (saved && !offerPairProblem(saved, selectedDivision(a))) return saved;
  return evaluationDivision(a) === JOINT_INTAKE ? 'media_analyst' : 'analyst';
};

// =====================================================================
// WHICH ROLE MAY BE OFFERED IN WHICH DIVISION, asked before sending.
// ---------------------------------------------------------------------
// The mirror of `joinRoleDivisionError` in supabase/functions/
// admin-applications. The server has always refused a mismatched pair -
// "Choose one of the five research divisions" for an Analyst in Media &
// Communication - but the dialog let the pair be chosen and only said so
// after Send, with the Division field showing nothing at all, because the
// division it held was not one the role could take. So the dialog now
// asks the same question first and names the problem under the field.
// =====================================================================
const RESEARCH: OrgDivision[] = ['equity', 'investment', 'macro', 'portfolio', 'quant'];
function offerPairProblem(role: AppRole, division: OrgDivision | ''): string | null {
  if (!division) return 'Choose the division this role belongs to.';
  if (role === 'media_analyst') return division === 'media' ? null : 'Media & Communication Analysts always belong to Media & Communication.';
  if (role === 'operations_analyst') return division === 'operations' ? null : 'Operations Analysts always belong to Operations.';
  if (role === 'portfolio_manager') return division === 'portfolio' ? null : 'Portfolio Manager always belongs to Portfolio Management.';
  if (role === 'team_leader' && division === 'portfolio') return "Portfolio Management's team leader is the Portfolio Manager role.";
  return RESEARCH.includes(division)
    ? null
    : `${composeRoleLabel(role, null)} is a research role. For the joint intake, choose "Media & Communication Analyst" or "Operations Analyst".`;
}

/** The Division column: where the offer places them, or the intake they are in. */
const divisionColumn = (a: ApplicationRow): string =>
  a.offer_division ? divisionLabels[a.offer_division as OrgDivision] : applyDivisionLabel(evaluationDivision(a));

// Human-readable state of the offer for a candidate row. `key` is what the
// Offer filter selects on; `canWithdraw` is true while the offer is open
// (ready, or sent and not answered), which is when it can be withdrawn.
type OfferStateKey = 'ready' | 'sent' | 'declined' | 'joined' | 'withdrawn';
const OFFER_STATE_LABELS: Record<OfferStateKey, string> = {
  ready: 'Ready to offer', sent: 'Offer sent, awaiting reply', declined: 'Declined / expired', joined: 'Joined', withdrawn: 'Offer withdrawn',
};
function offerState(a: ApplicationRow): { key: OfferStateKey; label: string; tone: string; canOffer: boolean; resend: boolean; canWithdraw: boolean } {
  if (a.status === 'joined') return { key: 'joined', label: 'Joined', tone: 'bg-emerald-50 text-emerald-700 border-emerald-200', canOffer: false, resend: false, canWithdraw: false };
  if (a.offer_withdrawn_at && a.status !== 'accepted') {
    const on = new Date(a.offer_withdrawn_at).toLocaleDateString();
    return { key: 'withdrawn', label: `Offer withdrawn · ${on}`, tone: 'bg-red-50 text-red-700 border-red-200', canOffer: true, resend: true, canWithdraw: false };
  }
  if (a.status === 'offer_declined') return { key: 'declined', label: 'Declined / expired', tone: 'bg-orange-50 text-orange-700 border-orange-200', canOffer: true, resend: true, canWithdraw: false };
  if (a.status === 'accepted' && a.offer_sent_at) {
    const by = a.offer_deadline ? ` · by ${new Date(a.offer_deadline).toLocaleDateString()}` : '';
    return { key: 'sent', label: `Offer sent · awaiting reply${by}`, tone: 'bg-amber-50 text-amber-700 border-amber-200', canOffer: true, resend: true, canWithdraw: true };
  }
  return { key: 'ready', label: 'Ready to offer', tone: 'bg-muted text-muted-foreground border-separator', canOffer: true, resend: false, canWithdraw: true };
}

// =====================================================================
// IN THE ORDER THEY WERE SELECTED. The page used to list offers in the
// order the applications arrived, which says nothing about an offer. It
// now lists them by when each candidate was selected for an offer (the
// moment their status became "accepted"), first selected first: the
// order in which the offers are to be dealt with. Candidates selected
// before that moment was recorded fall back on when their offer was sent.
// =====================================================================
const selectedTime = (a: ApplicationRow): string => a.selected_at || a.offer_sent_at || a.created_at;
const shortDate = (iso: string | null | undefined) =>
  iso ? new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '';

// =====================================================================
// STEP 97: THE ONE-ASSOCIATION DECLARATION, as Recruiting shows it.
// Signed (by the candidate, on accepting) or Missing (joined while the
// declaration was asked for, without one: `declaration_asked` is stamped
// on the application at that moment). Nothing is shown for an offer not
// yet accepted, or accepted while it was not asked for.
// =====================================================================
function declarationState(a: ApplicationRow): { label: string; tone: string } | null {
  if (a.declaration) return { label: 'Signed', tone: 'bg-emerald-50 text-emerald-700 border-emerald-200' };
  if (a.status === 'joined' && a.declaration_asked) return { label: 'Missing', tone: 'bg-red-50 text-red-700 border-red-200' };
  return null;
}

/** Where the offer places them, or the intake they are in: the Division filter's value. */
const divisionKey = (a: ApplicationRow): string => (a.offer_division as string) || evaluationDivision(a);

export default function NewJoiners() {
  const { session } = useAuth();
  const { toast } = useToast();
  const { canManage } = useAccess();
  // Some roles may open this page only to understand the offer flow; every
  // action is disabled for them (see the role permissions matrix).
  const canSendOffers = canManage('applications-joiners');
  // THE SAME CANDIDATE, READ THE SAME WAY. Preparing an offer means knowing
  // how the person reached this stage, and that used to mean leaving Offers,
  // going back to Candidate Screening and finding them again. The profile,
  // the documents and the screening notes are the same component and the same
  // hook here as there, so there is one source and one behaviour rather than
  // a second, competing candidate view.
  const {
    openId, detail, cvUrl, answerUrl, loading: detailLoading, docsLoading,
    open: openCandidate, close: closeCandidate, refresh: refreshCandidate,
  } = useCandidateDetail(session);
  const { hasSpecial } = useAccess();
  // Notes are part of assessing a candidate, so anyone who may comment during
  // screening may comment here too. The offer itself is a separate permission.
  const canAddNotes = canManage('applications-screening') || hasSpecial('applications-screening', 'candidates_notes_only');
  // Same exception as Candidate Screening: a notes-only role holds 'view' here,
  // so the read-only sweep must be told to leave the note controls alive.
  // On a phone as on a computer since Step 98 opened Offers on a phone.
  const notesAllowedInReadOnly = canAddNotes && !canManage('applications-screening');

  const { confirm: confirmEmail, dialog: emailDialog } = useEmailConfirm();
  const [apps, setApps] = useState<ApplicationRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [target, setTarget] = useState<ApplicationRow | null>(null);
  const [role, setRole] = useState<AppRole>('analyst');
  const [division, setDivision] = useState<OrgDivision>('equity');
  const [feeDue, setFeeDue] = useState(true);
  const [busy, setBusy] = useState(false);

  const load = async () => {
    setLoading(true);
    try { setApps(await listApplications(session)); }
    catch (e) { toast({ title: 'Failed to load', description: e instanceof Error ? e.message : undefined, variant: 'destructive' }); }
    finally { setLoading(false); }
  };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { load(); }, []);

  // Semester scope: offers are an active workflow for THIS semester only;
  // previous semesters remain consultable as a read-only archive.
  const [semKey, setSemKey] = useState(currentSemester().key);
  const viewingArchived = semKey !== currentSemester().key;

  const semesterOptions = useMemo(() => {
    const withOffers = apps.filter((a) => ['accepted', 'joined', 'offer_declined'].includes(a.status));
    const list = semestersInData(withOffers.map((a) => a.created_at));
    if (!list.some((s) => s.key === currentSemester().key)) list.unshift(currentSemester());
    return list;
  }, [apps]);

  // Accepted candidates (offer ready / sent), those who joined, declined /
  // expired offers (which can be re-sent), and withdrawn offers (kept on
  // the page as the record of what happened, and re-sendable too).
  // In the order they were selected; see `selectedTime`.
  const joiners = useMemo(
    () => apps.filter((a) => ['accepted', 'joined', 'offer_declined'].includes(a.status) || !!a.offer_withdrawn_at)
      .filter((a) => semesterOf(a.created_at).key === semKey)
      .sort((x, y) => selectedTime(x).localeCompare(selectedTime(y)) || `${x.surname} ${x.first_name}`.localeCompare(`${y.surname} ${y.first_name}`)),
    [apps, semKey],
  );

  // =====================================================================
  // THE SAME FILTERS AS CANDIDATE SCREENING. A search box over name, email
  // and Bocconi ID, and a filter in the header of each column that has
  // values to choose from: Division, Year, Programme and the state of the
  // offer. Each menu offers only what this semester's offers contain, and
  // "Clear filters" undoes them all at once.
  // =====================================================================
  const [search, setSearch] = useState('');
  const [divisionFilter, setDivisionFilter] = useState<string[]>([]);
  const [stateFilter, setStateFilter] = useState<string[]>([]);
  const [yearFilter, setYearFilter] = useState<string[]>([]);
  const [programmeFilter, setProgrammeFilter] = useState<string[]>([]);
  const clearAllFilters = () => { setDivisionFilter([]); setStateFilter([]); setYearFilter([]); setProgrammeFilter([]); setSearch(''); };

  const rows = useMemo(() => {
    const q = search.trim().toLowerCase();
    return joiners
      .filter((a) => divisionFilter.length === 0 || divisionFilter.includes(divisionKey(a)))
      .filter((a) => stateFilter.length === 0 || stateFilter.includes(offerState(a).key))
      .filter((a) => yearFilter.length === 0 || yearFilter.includes(a.academic_year))
      .filter((a) => programmeFilter.length === 0 || programmeFilter.includes((a.degree_course ?? '').trim()))
      .filter((a) => !q || `${a.first_name} ${a.surname} ${a.email} ${a.bocconi_id}`.toLowerCase().includes(q));
  }, [joiners, search, divisionFilter, stateFilter, yearFilter, programmeFilter]);

  const divisionOptions = useMemo(() => {
    const seen = new Map<string, string>();
    for (const a of joiners) seen.set(divisionKey(a), divisionColumn(a));
    return [...seen].sort((x, y) => x[1].localeCompare(y[1])).map(([value, label]) => ({ value, label }));
  }, [joiners]);
  const stateOptions = useMemo(() => {
    const present = new Set(joiners.map((a) => offerState(a).key));
    return (Object.keys(OFFER_STATE_LABELS) as OfferStateKey[]).filter((k) => present.has(k)).map((k) => ({ value: k, label: OFFER_STATE_LABELS[k] }));
  }, [joiners]);
  const yearOptions = useMemo(() => {
    const present = new Set(joiners.map((a) => a.academic_year));
    return (Object.keys(ACADEMIC_YEAR_LABELS) as (keyof typeof ACADEMIC_YEAR_LABELS)[])
      .filter((y) => present.has(y)).map((y) => ({ value: y, label: ACADEMIC_YEAR_LABELS[y] }));
  }, [joiners]);
  const programmeOptions = useMemo(() => {
    const seen = new Set<string>();
    for (const a of joiners) { const name = (a.degree_course ?? '').trim(); if (name) seen.add(name); }
    return [...seen].sort((x, y) => x.localeCompare(y)).map((name) => ({ value: name, label: name }));
  }, [joiners]);

  // The column funnels as a list, for the phone's Filters sheet and the
  // line that names every filter that is on (Step 98). Same state.
  const filterGroups: FilterGroup[] = [
    { key: 'division', label: 'Division', options: divisionOptions, selected: divisionFilter, onChange: setDivisionFilter },
    { key: 'year', label: 'Year', options: yearOptions, selected: yearFilter, onChange: setYearFilter },
    { key: 'programme', label: 'Programme', options: programmeOptions, selected: programmeFilter, onChange: setProgrammeFilter },
    { key: 'offer', label: 'Offer', options: stateOptions, selected: stateFilter, onChange: setStateFilter },
  ];
  const noun = { one: 'offer', many: 'offers' };

  // =====================================================================
  // ONE CANDIDATE TO THE NEXT, as in Candidate Screening: the two arrows in
  // the window's header walk the table in the order it is showing, with
  // its filters applied. A candidate the filters no longer match has no
  // neighbours, and both arrows go quiet.
  // =====================================================================
  const openIndex = useMemo(() => (openId ? rows.findIndex((r) => r.id === openId) : -1), [rows, openId]);
  const prevCandidate = openIndex > 0 ? rows[openIndex - 1] : null;
  const nextCandidate = openIndex >= 0 && openIndex < rows.length - 1 ? rows[openIndex + 1] : null;
  const detailPaneRef = useRef<HTMLDivElement>(null);
  useEffect(() => { detailPaneRef.current?.scrollTo({ top: 0 }); }, [openId]);

  // =====================================================================
  // WITHDRAWING AN OFFER. Possible while the offer is open: ready, or sent
  // and not yet answered. The candidacy closes and the candidate is told,
  // with the "Offer withdrawn" email if they had received the offer, or
  // the usual post-interview rejection if they never had. Confirmed first,
  // because it emails the candidate and cannot be undone except by sending
  // a new offer.
  // =====================================================================
  const [withdrawing, setWithdrawing] = useState<string | null>(null);
  const withdraw = async (a: ApplicationRow) => {
    const sent = !!a.offer_sent_at;
    const ok = await confirmEmail({
      title: 'Withdraw this offer?',
      description: (
        <>
          <p>
            The offer to <strong>{a.first_name} {a.surname}</strong> will be withdrawn and their candidacy closed.{' '}
            {sent
              ? <>They will receive the <strong>Offer withdrawn</strong> email, and can no longer accept the offer from their workspace.</>
              : <>The offer was never sent, so they will receive the usual <strong>post-interview rejection</strong> email and will not learn of the offer.</>}
          </p>
          <p>This cannot be undone, except by sending them a new offer.</p>
        </>
      ),
      confirmLabel: 'Yes, withdraw the offer',
    });
    if (!ok) return;
    setWithdrawing(a.id);
    try {
      await withdrawOffer(session, a.id);
      toast({
        title: 'Offer withdrawn',
        description: `${a.first_name} ${a.surname} has been emailed${sent ? ' that the offer is withdrawn' : ' the rejection'}.`,
      });
      await load();
      if (openId === a.id) await refreshCandidate(a.id);
    } catch (e) {
      toast({ title: 'Could not withdraw the offer', description: e instanceof Error ? e.message : undefined, variant: 'destructive' });
    } finally { setWithdrawing(null); }
  };

  const openOffer = (a: ApplicationRow) => {
    setTarget(a);
    const role0 = startingRole(a);
    setRole(role0);
    // The division must be one the starting role can take; a role pinned
    // to one division (Media & Communication Analyst) takes that one.
    const allowed = divisionsForRole(role0);
    const wanted = selectedDivision(a);
    setDivision(allowed.length === 0 || allowed.includes(wanted) ? wanted : allowed[0]);
    setFeeDue(a.offer_fee_due !== false);
  };

  const confirm = async () => {
    if (!target) return;
    // Explicit confirmation: sending an offer emails the candidate automatically.
    const ok = await confirmEmail({
      title: 'Send this offer by email?',
      description: (
        <>
          <p>
            <strong>{target.first_name} {target.surname}</strong> will receive an automatic email inviting them to join as{' '}
            <strong>{composeRoleLabel(role, division)}</strong>. They have three days to accept from their workspace
            (a reminder email is sent after two days).
          </p>
          <p>This action cannot be reversed. Have you checked the role and division are correct?</p>
        </>
      ),
      confirmLabel: 'Yes, send the offer',
    });
    if (!ok) return;
    setBusy(true);
    try {
      await sendOffer(session, target.id, role, division, feeDue);
      toast({ title: 'Offer sent', description: `${target.first_name} ${target.surname} has 3 days to accept. They will receive an email.` });
      setTarget(null);
      await load();
    } catch (e) {
      toast({ title: 'Could not send the offer', description: e instanceof Error ? e.message : undefined, variant: 'destructive' });
    } finally { setBusy(false); }
  };

  // A row's actions: Open and, where it can be sent, the offer itself, on
  // the row; Withdraw, which emails the candidate and cannot be undone, in
  // More, last and in red (Step 98). Every one of them as before.
  const offerActions = (a: ApplicationRow, phone: boolean) => {
    const st = offerState(a);
    const canSend = st.canOffer && canSendOffers && !viewingArchived;
    const canWithdraw = st.canWithdraw && canSendOffers && !viewingArchived;
    const h = phone ? 'h-11' : '';
    return (
      <>
        {/* `data-ro`: opening a joiner is a read, and the
            read-only guard has only the word "Open" to judge
            it by. See the same note in CandidatesManagement. */}
        <Button data-ro variant="outline" size="sm" className={phone ? 'h-11 flex-1' : ''} onClick={() => openCandidate(a.id)}>Open</Button>
        {canSend && (
          <Button size="sm" className={phone ? 'h-11 flex-1' : ''} onClick={() => openOffer(a)}>
            <Send className="h-4 w-4 mr-2" />{st.resend ? 'Resend offer' : 'Send offer'}
          </Button>
        )}
        {canWithdraw && (
          withdrawing === a.id ? (
            <Button size="sm" variant="outline" className={h} disabled aria-label="Withdrawing the offer"><Loader2 className="h-4 w-4 animate-spin" /></Button>
          ) : (
            <MoreMenu
              label={`More actions for ${a.first_name} ${a.surname}`}
              title={`${a.first_name} ${a.surname}`}
              actions={[{ key: 'withdraw', label: 'Withdraw the offer', icon: Undo2, destructive: true, onSelect: () => withdraw(a) }]}
            />
          )
        )}
      </>
    );
  };

  return (
    <RegisterPage>
      <Pinned>
      <WorkspacePageHeader
        title="Offers"
        description="Offers to the candidates who passed selection."
      />

      {!canSendOffers && (
        <div className="flex items-start gap-2 mb-6 rounded-lg border border-separator bg-muted/30 px-4 py-3 font-body text-sm">
          <Lock className="h-4 w-4 mt-0.5 text-accent shrink-0" />
          <span className="text-muted-foreground">This page is <span className="text-foreground">view-only</span> for your role. You can see the offer process to understand how it works, but sending, resending and editing offers is reserved for the President and Admin.</span>
        </div>
      )}

      <div className="mb-3 flex flex-col sm:flex-row sm:items-center gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input className="pl-10 font-body h-11 lg:h-10" placeholder="Search by name, email or Bocconi ID" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <div className="flex items-center gap-2">
          <FilterSheet groups={filterGroups} shown={rows.length} noun={noun} onClearAll={clearAllFilters} />
          <Select value={semKey} onValueChange={setSemKey}>
            <SelectTrigger className="w-[220px] max-lg:w-auto max-lg:flex-1 h-11 lg:h-10 font-body"><SelectValue /></SelectTrigger>
            <SelectContent>
              {semesterOptions.map((s) => (
                <SelectItem key={s.key} value={s.key}>{s.label}{s.key === currentSemester().key ? ' (current)' : ' (archive)'}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        {viewingArchived && (
          <span className="font-body text-sm text-muted-foreground">Archived semester: a read-only record of past offers.</span>
        )}
      </div>

      {/* How many are showing, in what order, and every filter that is on. */}
      {!loading && joiners.length > 0 && (
        <FilterSummary
          shown={rows.length}
          total={joiners.length}
          noun={noun}
          note="in the order the candidates were selected"
          chips={filterChips(filterGroups, { value: search, clear: () => setSearch('') })}
          onClearAll={clearAllFilters}
        />
      )}
      </Pinned>

      {loading ? <WorkspaceLoader /> : joiners.length === 0 ? (
        <Pinned><Card><CardContent className="py-12 text-center"><p className="font-body text-muted-foreground">{viewingArchived ? 'No offers were recorded in this semester.' : 'No candidates ready for an offer.'}</p></CardContent></Card></Pinned>
      ) : rows.length === 0 ? (
        <Pinned><Card><CardContent className="py-12 text-center"><p className="font-body text-muted-foreground">No offers match the current filters.</p></CardContent></Card></Pinned>
      ) : (
        <>
        {/* On a phone, a card per offer: the name, the state of the offer,
            the division; the rest under Details; the actions at the foot. */}
        <RecordList label="Offers">
          {rows.map((a) => {
            const st = offerState(a);
            const d = declarationState(a);
            return (
              <RecordCard
                key={a.id}
                title={`${a.first_name} ${a.surname}`}
                meta={a.email}
                aside={<span className={`inline-block px-2 py-0.5 text-xs border ${st.tone}`}>{st.label}</span>}
                lines={(
                  <>
                    <div>{divisionColumn(a)}</div>
                    <div className="text-muted-foreground">Selected <span className="tabular-nums">{shortDate(selectedTime(a))}</span></div>
                  </>
                )}
                details={(
                  <>
                    <Detail label="Year">{ACADEMIC_YEAR_LABELS[a.academic_year as keyof typeof ACADEMIC_YEAR_LABELS] ?? a.academic_year}</Detail>
                    <Detail label="Programme">{a.degree_course}</Detail>
                    <Detail label="Declaration">{d ? <span className={`inline-block px-2 py-0.5 text-xs border ${d.tone}`}>{d.label}</span> : <span className="text-muted-foreground">-</span>}</Detail>
                  </>
                )}
                actions={offerActions(a, true)}
              />
            );
          })}
        </RecordList>
        <RegisterFrame>
          <table className="w-full text-left font-body text-sm">
            <thead className={REGISTER_HEAD}>
              <tr>
                <th className="px-3 py-2 font-normal" title="When the candidate was selected for an offer. The list is in this order, first selected first.">Selected</th>
                <th className={`px-3 py-2 font-normal ${REGISTER_HELD_COLUMN}`}>Name</th>
                <th className="px-3 py-2 font-normal"><ColumnFilter label="Division" options={divisionOptions} selected={divisionFilter} onChange={setDivisionFilter} /></th>
                <th className="px-3 py-2 font-normal"><ColumnFilter label="Year" options={yearOptions} selected={yearFilter} onChange={setYearFilter} /></th>
                <th className="px-3 py-2 font-normal"><ColumnFilter label="Programme" options={programmeOptions} selected={programmeFilter} onChange={setProgrammeFilter} /></th>
                <th className="px-3 py-2 font-normal">
                  <span className="inline-flex items-center gap-1.5">
                    <ColumnFilter label="Offer" options={stateOptions} selected={stateFilter} onChange={setStateFilter} />
                    <HelpDot page="applications-joiners" topic="offer-flow" />
                  </span>
                </th>
                <th className="px-3 py-2 font-normal" title="The one-association declaration: Signed by the candidate on accepting, or Missing if they joined while it was asked for without signing it.">Declaration</th>
                <th className="px-3 py-2 font-normal text-right">Action</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((a) => {
                const st = offerState(a);
                return (
                  <tr key={a.id} className="border-t border-separator">
                    <td className="px-3 py-2 whitespace-nowrap text-muted-foreground tabular-nums">{shortDate(selectedTime(a))}</td>
                    <td className={`px-3 py-2 text-foreground whitespace-nowrap ${REGISTER_HELD_COLUMN}`}>
                      {a.first_name} {a.surname}
                      {/* The address may break before its @ when the register
                          is tight, rather than push the page sideways. */}
                      <div className="text-xs text-muted-foreground whitespace-normal">
                        {a.email.includes('@') ? <>{a.email.slice(0, a.email.indexOf('@'))}<wbr />{a.email.slice(a.email.indexOf('@'))}</> : a.email}
                      </div>
                    </td>
                    <td className="px-3 py-2">{divisionColumn(a)}</td>
                    <td className="px-3 py-2 whitespace-nowrap">{ACADEMIC_YEAR_LABELS[a.academic_year as keyof typeof ACADEMIC_YEAR_LABELS] ?? a.academic_year}</td>
                    <td className="px-3 py-2">{a.degree_course}</td>
                    <td className="px-3 py-2"><span className={`inline-block px-2 py-0.5 text-xs border ${st.tone}`}>{st.label}</span></td>
                    <td className="px-3 py-2">
                      {(() => { const d = declarationState(a); return d ? <span className={`inline-block px-2 py-0.5 text-xs border ${d.tone}`}>{d.label}</span> : <span className="text-xs text-muted-foreground">-</span>; })()}
                    </td>
                    <td className="px-3 py-2 text-right">
                      <div className="inline-flex items-center gap-2">
                        {offerActions(a, false)}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </RegisterFrame>
        </>
      )}

      {/* The candidate, in full, without leaving Offers. */}
      <Dialog open={!!openId} onOpenChange={(o) => { if (!o) closeCandidate(); }}>
        <DialogContent ref={detailPaneRef} className="max-w-[96vw] w-[96vw] max-h-[94vh] overflow-y-auto">
          <DialogHeader>
            {/* The name, and the way to the candidate on either side of it,
                exactly as in Candidate Screening. `pr-10` keeps the arrows
                clear of the window's own close button. */}
            <div className="flex items-center gap-3 pr-10">
              <DialogTitle className="font-serif text-2xl min-w-0 truncate">
                {detail ? `${detail.application.first_name} ${detail.application.surname}` : 'Candidate'}
              </DialogTitle>
              {rows.length > 1 && (
                <div className="ml-auto shrink-0 flex items-center gap-1">
                  <Button
                    type="button" variant="outline" size="icon" className="h-8 w-8"
                    disabled={!prevCandidate}
                    onClick={() => prevCandidate && openCandidate(prevCandidate.id)}
                    title={prevCandidate ? `Previous candidate: ${prevCandidate.first_name} ${prevCandidate.surname}` : 'This is the first candidate'}
                    aria-label="Previous candidate"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <span className="font-body text-xs text-muted-foreground tabular-nums px-1 whitespace-nowrap">
                    {openIndex >= 0 ? `${openIndex + 1} of ${rows.length}` : `${rows.length} shown`}
                  </span>
                  <Button
                    type="button" variant="outline" size="icon" className="h-8 w-8"
                    disabled={!nextCandidate}
                    onClick={() => nextCandidate && openCandidate(nextCandidate.id)}
                    title={nextCandidate ? `Next candidate: ${nextCandidate.first_name} ${nextCandidate.surname}` : 'This is the last candidate'}
                    aria-label="Next candidate"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </div>
            <DialogDescription className="font-body">
              The same information the reviewers saw during screening, including their notes. Progression is not changed from here.
            </DialogDescription>
          </DialogHeader>
          {detailLoading || !detail ? <WorkspaceLoader inline /> : (
            <CandidateProfile
              session={session}
              detail={detail}
              cvUrl={cvUrl}
              answerUrl={answerUrl}
              docsLoading={docsLoading}
              canAddNotes={canAddNotes && !viewingArchived}
              notesAllowedInReadOnly={notesAllowedInReadOnly && !viewingArchived}

              addNote={async (b) => { await addApplicationNote(session, detail.application.id, b); }}
              onNoteAdded={async () => { await refreshCandidate(detail.application.id); }}
              onError={(m) => toast({ title: 'Something went wrong', description: m, variant: 'destructive' })}
            >
              <CandidateStage status={detail.application.status} />
              <div className="border border-separator p-3 space-y-1">
                <div className="text-xs uppercase tracking-wider text-muted-foreground">Offer</div>
                <span className={`inline-block px-2 py-0.5 text-xs border ${offerState(detail.application).tone}`}>
                  {offerState(detail.application).label}
                </span>
                {detail.application.offer_role && (
                  <p className="text-xs text-muted-foreground">
                    Offered as {composeRoleLabel(detail.application.offer_role as AppRole, (detail.application.offer_division as OrgDivision) || null)}.
                  </p>
                )}
                {detail.application.selected_at && (
                  <p className="text-xs text-muted-foreground">Selected for an offer on {shortDate(detail.application.selected_at)}.</p>
                )}
                {offerState(detail.application).canWithdraw && canSendOffers && !viewingArchived && (
                  <Button
                    size="sm" variant="outline"
                    className="mt-2 text-destructive border-destructive/40 hover:bg-destructive/5 hover:text-destructive"
                    disabled={withdrawing === detail.application.id}
                    onClick={() => withdraw(detail.application)}
                  >
                    <Undo2 className="h-4 w-4 mr-2" />Withdraw offer
                  </Button>
                )}
              </div>
            </CandidateProfile>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={!!target} onOpenChange={(o) => !o && setTarget(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="font-serif">Send an offer to {target?.first_name} {target?.surname}</DialogTitle>
            <DialogDescription className="font-body">
              Choose the role and division for the offer. The candidate has three days to accept from their workspace; on acceptance their account becomes a member with this role. An email is sent now.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 font-body">
            <div className="space-y-1">
              <Label>Role</Label>
              <Select value={role} onValueChange={(v) => {
                const next = v as AppRole;
                setRole(next);
                const opts = divisionsForRole(next);
                if (opts.length === 1) setDivision(opts[0]);
                else if (!opts.includes(division)) setDivision(opts[0] ?? 'equity');
              }}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{JOIN_ROLES.map((r) => <SelectItem key={r} value={r}>{composeRoleLabel(r, null)}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Division</Label>
              <Select value={division} onValueChange={(v) => setDivision(v as OrgDivision)} disabled={divisionsForRole(role).length === 1}>
                <SelectTrigger><SelectValue placeholder="Choose a division" /></SelectTrigger>
                <SelectContent>{divisionsForRole(role).map((d) => <SelectItem key={d} value={d}>{divisionLabels[d]}</SelectItem>)}</SelectContent>
              </Select>
              {divisionsForRole(role).length === 1 && (
                <p className="text-xs text-muted-foreground">{composeRoleLabel(role, null)} always belongs to {divisionLabels[divisionsForRole(role)[0]]}.</p>
              )}
              {offerPairProblem(role, division) && (
                <p className="text-xs text-destructive" role="alert">{offerPairProblem(role, division)}</p>
              )}
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="feeDue">Membership fee due</Label>
              <Switch id="feeDue" checked={feeDue} onCheckedChange={setFeeDue} />
            </div>
            <p className="text-xs text-muted-foreground">
              Only Bocconi students can become members, and payment of the membership fee is a condition of membership.
            </p>
            <div className="flex items-start gap-2 rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-800">
              <Mail className="h-4 w-4 mt-0.5 shrink-0" />
              <span>Sending an offer emails the candidate automatically. You will be asked to confirm.</span>
            </div>
            <div className="flex gap-3 pt-1">
              <Button className="flex-1" onClick={confirm} disabled={busy || !!offerPairProblem(role, division)}>
                {busy ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Sending</> : 'Send offer'}
              </Button>
              <Button variant="outline" onClick={() => setTarget(null)}>Cancel</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
      {emailDialog}
    </RegisterPage>
  );
}
