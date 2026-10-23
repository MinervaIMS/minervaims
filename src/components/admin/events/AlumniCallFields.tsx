import { useEffect, useMemo, useState } from 'react';
import { Plus, Search, UserPlus, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { HelpDot } from '@/components/admin/help/HelpSystem';
import { listAlumniDirectory, type AlumniOption } from '@/lib/alumni-aod-api';
import {
  ALUMNI_CALL_MAX, ALUMNI_CALL_MIN, ALUMNI_CALL_STATUSES, ALUMNI_CALL_STATUS_LABELS, ALUMNI_FORMER_DIVISIONS,
  alumnusGuestLine, describeAlumnus, type AlumniGuest,
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
// The alumni come from the directory, so the company is the one on file,
// or are typed by hand for somebody not in it. Each is introduced on the
// website by a line written from their current position and company and
// what they were at Minerva; the organisers can write it themselves
// instead. The status, the responsible person and the notes are internal.
// =====================================================================

export function AlumniCallFields({ value, onChange, idPrefix = 'ac' }: {
  value: AlumniCallDraft;
  onChange: (next: AlumniCallDraft) => void;
  idPrefix?: string;
}) {
  const [directory, setDirectory] = useState<AlumniOption[] | null>(null);
  const [search, setSearch] = useState('');
  useEffect(() => { listAlumniDirectory().then(setDirectory).catch(() => setDirectory([])); }, []);

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

        {value.participants.map((p, i) => (
          <div key={i} className="border border-separator p-3 space-y-3">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1 space-y-1">
                <Input
                  value={p.name}
                  onChange={(e) => setGuest(i, { name: e.target.value })}
                  placeholder="Name and surname"
                  aria-label={`Alumnus ${i + 1}: name`}
                  readOnly={!!p.alumni_id}
                  className={p.alumni_id ? 'bg-muted/40' : undefined}
                />
                <p className="text-xs text-muted-foreground">{p.alumni_id ? 'From the alumni directory' : 'Typed by hand: not in the alumni directory'}</p>
              </div>
              <Button type="button" variant="outline" size="icon" onClick={() => remove(i)} aria-label={`Remove ${p.name || `alumnus ${i + 1}`}`}>
                <X className="h-4 w-4" />
              </Button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label htmlFor={`${idPrefix}-pos-${i}`}>Current position</Label>
                <Input id={`${idPrefix}-pos-${i}`} value={p.position ?? ''} onChange={(e) => setGuest(i, { position: e.target.value })} placeholder="e.g. Equity Research Analyst" />
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

      <div className="space-y-2">
        <span className="inline-flex items-center gap-1.5">
          <Label>Status</Label>
          <HelpDot page="events-create" topic="alumni-status" />
        </span>
        <div role="radiogroup" aria-label="Status of the call" className="flex flex-wrap gap-2">
          {ALUMNI_CALL_STATUSES.map((s) => (
            <button
              key={s}
              type="button"
              role="radio"
              aria-checked={value.status === s}
              onClick={() => onChange({ ...value, status: s })}
              className={`border px-3 py-1.5 text-sm ${value.status === s ? 'border-accent bg-accent text-accent-foreground' : 'border-separator text-foreground hover:border-accent'}`}
            >
              {ALUMNI_CALL_STATUS_LABELS[s]}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-1">
          <Label htmlFor={`${idPrefix}-resp`}>Responsible person</Label>
          <Input id={`${idPrefix}-resp`} value={value.responsible_person} onChange={(e) => onChange({ ...value, responsible_person: e.target.value })} placeholder="Who follows the call up" />
        </div>
        <div className="space-y-1 sm:col-span-2">
          <Label htmlFor={`${idPrefix}-notes`}>Internal notes</Label>
          <Textarea id={`${idPrefix}-notes`} rows={2} value={value.notes} onChange={(e) => onChange({ ...value, notes: e.target.value })} placeholder="Seen by the workspace only, never on the website" />
        </div>
      </div>
    </div>
  );
}
