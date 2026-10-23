import { useEffect, useMemo, useState } from 'react';
import { ArrowDown, ArrowUp, Link2, Plus, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { AUTHORS_MAX, type ReportAuthor } from '@/lib/report-meta';
import { listPeople, type PersonOption } from '@/lib/archive-api';

// =====================================================================
// A report's authors, in the order printed on its cover (Step 93).
// ---------------------------------------------------------------------
// Each author is a name and a role. Picked from the list, the author is
// linked to their Members or Alumni entry, and the report page links to
// it; typed by hand, the name is printed as it is. Only names and roles
// are kept: never an email or a phone number, even when the cover has
// them.
// =====================================================================

interface Props {
  value: ReportAuthor[];
  onChange: (next: ReportAuthor[]) => void;
}

export function AuthorsEditor({ value, onChange }: Props) {
  const [people, setPeople] = useState<PersonOption[]>([]);
  const [query, setQuery] = useState('');
  const [role, setRole] = useState('');

  useEffect(() => { listPeople().then(setPeople).catch(() => setPeople([])); }, []);

  const matches = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (q.length < 2) return [];
    return people.filter((p) => p.name.toLowerCase().includes(q)).slice(0, 8);
  }, [people, query]);

  const full = value.length >= AUTHORS_MAX;
  const add = (a: ReportAuthor) => {
    if (full || value.some((x) => x.name.toLowerCase() === a.name.toLowerCase())) return;
    onChange([...value, a]);
    setQuery('');
    setRole('');
  };
  const move = (i: number, d: -1 | 1) => {
    const next = [...value];
    const [x] = next.splice(i, 1);
    next.splice(i + d, 0, x);
    onChange(next);
  };
  const linkedLabel = (a: ReportAuthor) => (a.member_id ? 'Members' : a.alumni_id ? 'Alumni' : null);

  return (
    <div className="space-y-3">
      {value.length > 0 && (
        <ol className="space-y-2">
          {value.map((a, i) => (
            <li key={`${a.name}-${i}`} className="flex items-center gap-2 border border-separator px-2 py-1.5">
              <div className="flex-1 min-w-0">
                <p className="font-body text-sm truncate">
                  {a.name}
                  {linkedLabel(a) && (
                    <span className="ml-2 inline-flex items-center gap-1 text-xs text-primary" title={`Linked to the ${linkedLabel(a)} page`}>
                      <Link2 className="h-3 w-3" aria-hidden="true" />{linkedLabel(a)}
                    </span>
                  )}
                </p>
                <Input
                  value={a.role ?? ''}
                  onChange={(e) => onChange(value.map((x, j) => (j === i ? { ...x, role: e.target.value } : x)))}
                  placeholder="Role on the cover, e.g. Lead Analyst"
                  className="h-8 mt-1 text-xs"
                  aria-label={`Role of ${a.name}`}
                />
              </div>
              <div className="flex flex-col">
                <button type="button" className="p-1 disabled:opacity-30" onClick={() => move(i, -1)} disabled={i === 0} aria-label={`Move ${a.name} up`}>
                  <ArrowUp className="h-3.5 w-3.5" />
                </button>
                <button type="button" className="p-1 disabled:opacity-30" onClick={() => move(i, 1)} disabled={i === value.length - 1} aria-label={`Move ${a.name} down`}>
                  <ArrowDown className="h-3.5 w-3.5" />
                </button>
              </div>
              <button type="button" className="p-1 text-muted-foreground hover:text-destructive" onClick={() => onChange(value.filter((_, j) => j !== i))} aria-label={`Remove ${a.name}`}>
                <X className="h-4 w-4" />
              </button>
            </li>
          ))}
        </ol>
      )}
      {!full && (
        <div className="space-y-2">
          <div className="flex gap-2">
            <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Name: search Members and Alumni, or type it" aria-label="Author's name" />
            <Input value={role} onChange={(e) => setRole(e.target.value)} placeholder="Role" className="max-w-[10rem]" aria-label="Author's role" />
          </div>
          {matches.length > 0 && (
            <ul className="border border-separator divide-y divide-separator max-h-48 overflow-y-auto">
              {matches.map((p) => (
                <li key={`${p.kind}-${p.id}`}>
                  <button
                    type="button"
                    className="w-full text-left px-3 py-2 hover:bg-muted font-body text-sm"
                    onClick={() => add({ name: p.name, role: role.trim() || null, ...(p.kind === 'member' ? { member_id: p.id } : { alumni_id: p.id }) })}
                  >
                    {p.name} <span className="text-xs text-muted-foreground">· {p.detail}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
          {query.trim().length > 1 && (
            <Button type="button" variant="outline" size="sm" className="font-body" onClick={() => add({ name: query.trim(), role: role.trim() || null })}>
              <Plus className="h-4 w-4 mr-1" />Add "{query.trim()}" by name, without a link
            </Button>
          )}
        </div>
      )}
      <p className="font-body text-xs text-muted-foreground">
        In the order of the cover. Picked from the list, an author is linked to their entry on the website. Names and roles only.
      </p>
    </div>
  );
}

export default AuthorsEditor;
