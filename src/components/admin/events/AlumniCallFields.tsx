import { useEffect, useMemo, useRef, useState } from 'react';
import { Plus, Search, UserPlus, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { HelpDot } from '@/components/admin/help/HelpSystem';
import { alumniCallPrefill, listAlumniDirectory, type AlumniOption } from '@/lib/alumni-aod-api';
import {
  ALUMNI_CALL_MAX, ALUMNI_CALL_MIN, ALUMNI_FORMER_DIVISIONS,
  alumnusGuestLine, describeAlumnus, formerFromRoster, type AlumniGuest,
} from '@/lib/alumni-call';
import type { AlumniCallDraft } from '@/lib/alumni-call-draft';
import { divisionLabels, type OrgDivision } from '@/lib/roles';
import { ROSTER_DIVISIONS } from '@/lib/rosters';
import { PREFILLED_FIELD, PrefilledTag, prefilledNoteId, usePrefilled } from '@/components/admin/kit/Prefilled';

// =====================================================================
// The part of an event that only an alumni call has (Step 91).
// ---------------------------------------------------------------------
// Used by Events > Create when the type is "Alumni call", and by the
// call's own window in the Event Archive. Everything else about the call
// (title, organiser, time, online or in person, poster, registration,
// website) is the event's, and is edited where every event's is.
//
// The alumni come from the directory or are typed by hand for somebody
// not in it. Picking one from the directory fills in what the records
// know (Step 105): the company on file, and the role and division they
// held at Minerva, from the roster history. Every field stays editable,
// and what the organisers type is what the call keeps; the (?) beside the
// fields says where the records themselves are corrected. Each alumnus is
// introduced on the website by a line written from those fields, or in
// the organisers' own words.
//
// Step 108: the current position is filled in too (the role on file in
// the directory), every field the records filled carries "From the
// records" until somebody changes it, and a division the form cannot
// name (a Board office, or a division that no longer exists) is said in
// words under the choice instead of leaving it on "Not set" unexplained.
//
// The status, the responsible person and the internal notes are no
// longer asked for (Step 105). A saved call keeps the values it has: the
// draft carries them through unchanged, so saving never clears them.
// =====================================================================

export function AlumniCallFields({ value, onChange, idPrefix = 'ac' }: {
  value: AlumniCallDraft;
  onChange: (next: AlumniCallDraft) => void;
  idPrefix?: string;
}) {
  const [directory, setDirectory] = useState<AlumniOption[] | null>(null);
  const [search, setSearch] = useState('');
  // Areas on file, for the position's hint: the directory has the area of
  // work (Investment Banking), not the job title.
  const [areas, setAreas] = useState<Record<string, string>>({});
  // What the records filled and nobody has changed since, per alumnus and
  // field; and, per alumnus, where they were when the form cannot name it.
  const filled = usePrefilled();
  const [pastDivision, setPastDivision] = useState<Record<string, string>>({});
  useEffect(() => { listAlumniDirectory().then(setDirectory).catch(() => setDirectory([])); }, []);
  // The draft as it is now, for the fill that arrives after a pick: by then
  // the organisers may have typed in another row.
  const latest = useRef(value);
  latest.current = value;

  const full = value.participants.length >= ALUMNI_CALL_MAX;
  const results = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q || !directory) return [];
    const taken = new Set(value.participants.map((p) => p.alumni_id).filter(Boolean));
    return directory
      .filter((a) => !taken.has(a.id) && `${a.name} ${a.surname} ${a.company ?? ''}`.toLowerCase().includes(q))
      .slice(0, 8);
  }, [search, directory, value.participants]);

  const setGuest = (i: number, patch: Partial<AlumniGuest>) => {
    const id = value.participants[i]?.alumni_id;
    if (id) for (const k of Object.keys(patch)) filled.release(`${id}:${k}`);
    onChange({ ...value, participants: value.participants.map((p, idx) => (idx === i ? { ...p, ...patch } : p)) });
  };
  const addFromDirectory = (a: AlumniOption) => {
    if (full) return;
    onChange({ ...value, participants: [...value.participants, { alumni_id: a.id, name: `${a.name} ${a.surname}`, company: a.company ?? '' }] });
    if ((a.company ?? '').trim()) filled.mark([`${a.id}:company`]);
    setSearch('');
    // What the records know, into the fields still empty; never over what
    // somebody has typed meanwhile.
    alumniCallPrefill([a.id]).then((rows) => {
      const r = rows.find((x) => x.alumni_id === a.id);
      if (!r) return;
      if (r.job_area) setAreas((m) => ({ ...m, [a.id]: r.job_area as string }));
      const was = formerFromRoster(r.role_label, r.division_key);
      if (!was.former_division && r.division_key && r.division_key !== 'none') {
        setPastDivision((m) => ({ ...m, [a.id]: r.division_key as string }));
      }
      const cur = latest.current;
      const marks: string[] = [];
      onChange({
        ...cur,
        participants: cur.participants.map((p) => {
          if (p.alumni_id !== a.id) return p;
          const next = { ...p };
          const fill = (k: 'position' | 'company' | 'former_role', v: string | null | undefined) => {
            if ((p[k] ?? '').trim() || !(v ?? '').trim()) return;
            next[k] = (v as string).trim();
            marks.push(`${a.id}:${k}`);
          };
          fill('position', r.job_area);
          fill('company', r.company);
          fill('former_role', was.former_role);
          if (!p.former_division && was.former_division) {
            next.former_division = was.former_division;
            marks.push(`${a.id}:former_division`);
          }
          return next;
        }),
      });
      filled.mark(marks);
    }).catch(() => undefined);
  };
  const addByHand = () => {
    if (full) return;
    onChange({ ...value, participants: [...value.participants, { alumni_id: null, name: search.trim() }] });
    setSearch('');
  };
  const remove = (i: number) => {
    const id = value.participants[i]?.alumni_id;
    if (id) filled.releaseWhere((k) => k.startsWith(`${id}:`));
    onChange({ ...value, participants: value.participants.filter((_, idx) => idx !== i) });
  };
  // The mark and the edge of a field the records filled.
  const pre = (p: AlumniGuest, k: string) => !!p.alumni_id && filled.has(`${p.alumni_id}:${k}`);
  const preProps = (p: AlumniGuest, k: string, fieldId: string) => (pre(p, k)
    ? { 'aria-describedby': prefilledNoteId(fieldId), className: PREFILLED_FIELD }
    : {});
  const labelRow = (p: AlumniGuest, k: string, fieldId: string, label: React.ReactNode) => (
    <div className="flex min-h-5 items-center justify-between gap-2">
      {label}
      {pre(p, k) && <PrefilledTag fieldId={fieldId} />}
    </div>
  );
  // Where an alumnus was, when the form's choice cannot name it.
  const pastDivisionNote = (p: AlumniGuest): string | null => {
    const key = p.alumni_id ? pastDivision[p.alumni_id] : undefined;
    if (!key || p.former_division) return null;
    if (key === 'board' || key === 'asset_management') return 'A Board office: the website names no division with it.';
    const label = ROSTER_DIVISIONS.find((d) => d.key === key)?.label;
    return label ? `${label}, a division that no longer exists: the role above names it.` : null;
  };

  return (
    <div className="space-y-5 font-body">
      <div className="space-y-2">
        <span className="inline-flex items-center gap-1.5">
          <Label>Alumni ({ALUMNI_CALL_MIN} to {ALUMNI_CALL_MAX}) *</Label>
          <HelpDot page="events-create" topic="alumni-call" />
        </span>
        {value.participants.some((p) => p.alumni_id) && (
          <p className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
            Filled in from the records: check each field, and change anything that is out of date.
            <HelpDot page="events-create" topic="alumni-fix" />
          </p>
        )}

        {value.participants.map((p, i) => (
          <div key={i} className="border border-separator p-3 space-y-3">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1 space-y-1">
                <Input
                  value={p.name}
                  onChange={(e) => setGuest(i, { name: e.target.value })}
                  placeholder="Name and surname"
                  aria-label={`Alumnus ${i + 1}: name`}
                />
                <p className="text-xs text-muted-foreground">{p.alumni_id ? 'From the alumni directory: every field can be changed for this call' : 'Typed by hand: not in the alumni directory'}</p>
              </div>
              <Button type="button" variant="outline" size="icon" onClick={() => remove(i)} aria-label={`Remove ${p.name || `alumnus ${i + 1}`}`}>
                <X className="h-4 w-4" />
              </Button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                {labelRow(p, 'position', `${idPrefix}-pos-${i}`, <Label htmlFor={`${idPrefix}-pos-${i}`}>Current position</Label>)}
                <Input id={`${idPrefix}-pos-${i}`} value={p.position ?? ''} onChange={(e) => setGuest(i, { position: e.target.value })} placeholder={p.alumni_id && areas[p.alumni_id] ? `Works in ${areas[p.alumni_id]}` : 'e.g. Equity Research Analyst'} {...preProps(p, 'position', `${idPrefix}-pos-${i}`)} />
              </div>
              <div className="space-y-1">
                {labelRow(p, 'company', `${idPrefix}-co-${i}`, <Label htmlFor={`${idPrefix}-co-${i}`}>Current company</Label>)}
                <Input id={`${idPrefix}-co-${i}`} value={p.company ?? ''} onChange={(e) => setGuest(i, { company: e.target.value })} placeholder="e.g. Goldman Sachs" {...preProps(p, 'company', `${idPrefix}-co-${i}`)} />
              </div>
              <div className="space-y-1">
                {labelRow(p, 'former_role', `${idPrefix}-fr-${i}`, <Label htmlFor={`${idPrefix}-fr-${i}`}>Former role at Minerva</Label>)}
                <Input id={`${idPrefix}-fr-${i}`} value={p.former_role ?? ''} onChange={(e) => setGuest(i, { former_role: e.target.value })} placeholder="e.g. Analyst, Head of Division" {...preProps(p, 'former_role', `${idPrefix}-fr-${i}`)} />
              </div>
              <div className="space-y-1">
                {labelRow(p, 'former_division', `${idPrefix}-fd-${i}`, <Label id={`${idPrefix}-fdl-${i}`}>Former division at Minerva</Label>)}
                <Select value={p.former_division || 'none'} onValueChange={(v) => setGuest(i, { former_division: v === 'none' ? null : v })}>
                  <SelectTrigger
                    aria-label={`Alumnus ${i + 1}: former division at Minerva`}
                    {...preProps(p, 'former_division', `${idPrefix}-fd-${i}`)}
                    {...(pastDivisionNote(p) ? { 'aria-describedby': `${idPrefix}-fdn-${i}` } : {})}
                  ><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None named</SelectItem>
                    {ALUMNI_FORMER_DIVISIONS.map((d) => <SelectItem key={d} value={d}>{divisionLabels[d as OrgDivision]}</SelectItem>)}
                  </SelectContent>
                </Select>
                {pastDivisionNote(p) && (
                  <p id={`${idPrefix}-fdn-${i}`} className="text-xs text-muted-foreground">{pastDivisionNote(p)}</p>
                )}
              </div>
            </div>
            <div className="space-y-1">
              <Label htmlFor={`${idPrefix}-hl-${i}`}>Introduced on the website as</Label>
              <Input
                id={`${idPrefix}-hl-${i}`}
                value={p.headline ?? ''}
                onChange={(e) => setGuest(i, { headline: e.target.value })}
                placeholder={describeAlumnus(p) || 'Written from the fields above'}
              />
              <p className="text-xs text-muted-foreground">
                Guest line: <span className="text-foreground">{alumnusGuestLine(p) || 'the name, once typed'}</span>
              </p>
            </div>
          </div>
        ))}

        {!full && (
          <div className="space-y-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" aria-hidden />
              <Input
                className="pl-9"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={directory === null ? 'Loading the alumni directory…' : 'Search the alumni directory by name or company'}
                aria-label="Search the alumni directory"
                autoComplete="off"
              />
            </div>
            {search.trim() && (
              <div className="border border-separator divide-y divide-separator max-h-56 overflow-y-auto">
                {results.map((a) => (
                  <button
                    key={a.id}
                    type="button"
                    onClick={() => addFromDirectory(a)}
                    className="w-full text-left px-3 py-2 text-sm hover:bg-muted flex items-center justify-between gap-3"
                  >
                    <span className="text-foreground">{a.name} {a.surname}</span>
                    {a.company && <span className="text-xs text-muted-foreground shrink-0">{a.company}</span>}
                  </button>
                ))}
                {directory !== null && results.length === 0 && (
                  <div className="px-3 py-2 text-sm text-muted-foreground">Nobody in the directory matches.</div>
                )}
              </div>
            )}
            <Button type="button" variant="outline" size="sm" onClick={addByHand}>
              {search.trim() ? <UserPlus className="h-4 w-4 mr-2" /> : <Plus className="h-4 w-4 mr-2" />}
              {search.trim() ? `Add "${search.trim()}" by hand` : 'Add somebody not in the directory'}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
