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

  const setGuest = (i: number, patch: Partial<AlumniGuest>) =>
    onChange({ ...value, participants: value.participants.map((p, idx) => (idx === i ? { ...p, ...patch } : p)) });
  const addFromDirectory = (a: AlumniOption) => {
    if (full) return;
    onChange({ ...value, participants: [...value.participants, { alumni_id: a.id, name: `${a.name} ${a.surname}`, company: a.company ?? '' }] });
    setSearch('');
    // What the records know, into the fields still empty; never over what
    // somebody has typed meanwhile.
    alumniCallPrefill([a.id]).then((rows) => {
      const r = rows.find((x) => x.alumni_id === a.id);
      if (!r) return;
      if (r.job_area) setAreas((m) => ({ ...m, [a.id]: r.job_area as string }));
      const was = formerFromRoster(r.role_label, r.division_key);
      const cur = latest.current;
      onChange({
        ...cur,
        participants: cur.participants.map((p) => (p.alumni_id !== a.id ? p : {
          ...p,
          company: (p.company ?? '').trim() ? p.company : (r.company ?? p.company ?? ''),
          former_role: (p.former_role ?? '').trim() ? p.former_role : was.former_role,
          former_division: p.former_division || was.former_division,
        })),
      });
    }).catch(() => undefined);
  };
  const addByHand = () => {
    if (full) return;
    onChange({ ...value, participants: [...value.participants, { alumni_id: null, name: search.trim() }] });
    setSearch('');
  };
  const remove = (i: number) => onChange({ ...value, participants: value.participants.filter((_, idx) => idx !== i) });

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
                <Label htmlFor={`${idPrefix}-pos-${i}`}>Current position</Label>
                <Input id={`${idPrefix}-pos-${i}`} value={p.position ?? ''} onChange={(e) => setGuest(i, { position: e.target.value })} placeholder={p.alumni_id && areas[p.alumni_id] ? `Works in ${areas[p.alumni_id]}` : 'e.g. Equity Research Analyst'} />
              </div>
              <div className="space-y-1">
                <Label htmlFor={`${idPrefix}-co-${i}`}>Current company</Label>
                <Input id={`${idPrefix}-co-${i}`} value={p.company ?? ''} onChange={(e) => setGuest(i, { company: e.target.value })} placeholder="e.g. Goldman Sachs" />
              </div>
              <div className="space-y-1">
                <Label htmlFor={`${idPrefix}-fr-${i}`}>Former role at Minerva</Label>
                <Input id={`${idPrefix}-fr-${i}`} value={p.former_role ?? ''} onChange={(e) => setGuest(i, { former_role: e.target.value })} placeholder="e.g. Analyst, Head of Division" />
              </div>
              <div className="space-y-1">
                <Label>Former division</Label>
                <Select value={p.former_division || 'none'} onValueChange={(v) => setGuest(i, { former_division: v === 'none' ? null : v })}>
                  <SelectTrigger aria-label={`Alumnus ${i + 1}: former division`}><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Not set</SelectItem>
                    {ALUMNI_FORMER_DIVISIONS.map((d) => <SelectItem key={d} value={d}>{divisionLabels[d as OrgDivision]}</SelectItem>)}
                  </SelectContent>
                </Select>
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
