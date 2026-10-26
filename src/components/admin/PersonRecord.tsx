import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { friendlyError } from '@/lib/errors';
import { rosterTeamShort } from '@/lib/rosters';
import { careerSummary, stretchLabel } from '@/lib/career';
import { fetchPersonRecord, setPublicHidden, type PersonRecord, type PersonRecordKind } from '@/lib/rosters-api';

// =====================================================================
// One person's record (Step 94B): the same person whether they are a
// member today, an alumnus, or somebody the history remembers.
// ---------------------------------------------------------------------
//   In Minerva since, semesters recorded, promotions, reports
//   Career in Minerva   each step up, then every semester's role
//   Reports             every published report that carries their name
//   After Minerva       their alumni entry
//
// Opened from a name in People > Time Machine, Members and Alumni, by the
// readers who see every division (the database refuses anybody else).
// The internal person code is shown to the President, the Vice-President
// and the Head of Operations only.
// =====================================================================

export interface PersonRecordTarget {
  kind: PersonRecordKind;
  id: string;
  /** Shown while the record loads. */
  name: string;
}

const STATUS_LABEL: Record<string, string> = { on_exchange: 'on exchange', one_semester_pause: 'on a semester pause' };

const reportDate = (iso: string) => {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? '' : d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Europe/Rome' });
};

function Figure({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="border border-separator px-3 py-2">
      <p className="font-body text-[11px] uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className="font-serif text-lg text-accent leading-snug">{value}</p>
    </div>
  );
}

export function PersonRecordDialog({ target, onClose }: { target: PersonRecordTarget | null; onClose: () => void }) {
  const { session } = useAuth();
  const { toast } = useToast();
  const [record, setRecord] = useState<PersonRecord | null>(null);
  const [failed, setFailed] = useState<string | null>(null);

  useEffect(() => {
    setRecord(null);
    setFailed(null);
    if (!target) return;
    let live = true;
    fetchPersonRecord(target.kind, target.id)
      .then((r) => { if (live) setRecord(r); })
      .catch((e) => { if (live) setFailed(friendlyError(e)); });
    return () => { live = false; };
  }, [target]);

  const summary = useMemo(() => (record ? careerSummary(record.career) : null), [record]);

  const togglePublic = async (hidden: boolean) => {
    if (!record) return;
    try {
      await setPublicHidden(session, record.person_id, hidden);
      setRecord({ ...record, public_hidden: hidden });
      toast({ title: hidden ? 'Left out of the public past Boards' : 'Shown in the public past Boards again' });
    } catch (e) {
      toast({ title: 'Not changed', description: friendlyError(e), variant: 'destructive' });
    }
  };

  const standing = (r: PersonRecord) => {
    const parts: string[] = [];
    if (r.member) {
      const status = STATUS_LABEL[r.member.membership_status];
      parts.push(`${r.member.role}${status ? `, ${status}` : ''}`);
    }
    for (const a of r.alumni) {
      parts.push(['Alumnus', `class of ${a.graduation_year}`, a.company].filter(Boolean).join(', '));
    }
    if (!parts.length) parts.push('Former member');
    return parts.join(' · ');
  };

  const linkedin = record?.member?.linkedin_url || record?.alumni.find((a) => a.linkedin_url)?.linkedin_url || null;

  return (
    <Dialog open={!!target} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-serif">{record ? `${record.first_name} ${record.surname}` : target?.name}</DialogTitle>
          <DialogDescription className="font-body">
            {record ? standing(record) : failed ? '' : 'Opening the record'}
            {record?.code ? <span className="ml-2 font-mono text-xs text-muted-foreground/80">{record.code}</span> : null}
          </DialogDescription>
        </DialogHeader>

        {failed ? (
          <p className="font-body text-small text-muted-foreground py-6">{failed}</p>
        ) : !record || !summary ? (
          <div className="py-10 flex justify-center"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
        ) : (
          <div className="space-y-7 font-body">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <Figure label="In Minerva since" value={summary.since?.label ?? 'Not recorded'} />
              <Figure label="Semesters" value={summary.semesters} />
              <Figure label="Promotions" value={summary.promotions} />
              <Figure label="Reports" value={record.reports.length} />
            </div>

            <section>
              <h3 className="font-serif text-subheading text-accent mb-2">Career in Minerva</h3>
              {summary.path.length === 0 ? (
                <p className="text-small text-muted-foreground">No semester is recorded for this person. The history begins in Fall 2019.</p>
              ) : (
                <>
                  {summary.growth.length > 1 && (
                    <p className="text-small text-foreground mb-3">
                      {summary.growth.map((g, i) => (
                        <span key={`${g.semester}-${g.role}`}>
                          {i > 0 && <span className="text-muted-foreground"> → </span>}
                          {g.role} <span className="text-muted-foreground">({g.label}{g.live ? ', current' : ''})</span>
                        </span>
                      ))}
                    </p>
                  )}
                  <ol className="border border-separator divide-y divide-separator text-small">
                    {summary.path.map((s, i) => s.kind === 'gap' ? (
                      <li key={`gap-${i}`} className="px-3 py-2 text-muted-foreground italic">
                        No record: {stretchLabel(s)}
                      </li>
                    ) : (
                      <li key={`${s.from}-${i}`} className="px-3 py-2 flex flex-col sm:flex-row sm:justify-between gap-0.5 sm:gap-4">
                        <span className="text-muted-foreground shrink-0">{stretchLabel(s)}{s.live ? ' (current)' : ''}</span>
                        <span className="sm:text-right">
                          {s.roles.map((r) => `${r.role}${r.team && rosterTeamShort(r.team) ? `, ${rosterTeamShort(r.team)}` : ''}`).join(' and ')}
                        </span>
                      </li>
                    ))}
                  </ol>
                </>
              )}
            </section>

            <section>
              <h3 className="font-serif text-subheading text-accent mb-2">
                Reports <span className="font-body text-small text-muted-foreground">({record.reports.length})</span>
              </h3>
              {record.reports.length === 0 ? (
                <p className="text-small text-muted-foreground">No published report carries this name.</p>
              ) : (
                <ul className="border border-separator divide-y divide-separator text-small max-h-72 overflow-y-auto">
                  {record.reports.map((r) => (
                    <li key={r.id} className="px-3 py-2 flex flex-col sm:flex-row sm:items-baseline gap-0.5 sm:gap-4">
                      <span className="text-muted-foreground tabular-nums shrink-0 sm:w-24">{reportDate(r.date)}</span>
                      <span className="min-w-0 flex-1">
                        {r.slug
                          ? <Link to={`/archive/${r.slug}`} target="_blank" rel="noopener" className="text-foreground hover:text-accent underline-offset-4 hover:underline">{r.title}</Link>
                          : r.title}
                        {r.role && <span className="block text-xs text-muted-foreground">{r.role}</span>}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            {(record.alumni.length > 0 || linkedin) && (
              <section>
                <h3 className="font-serif text-subheading text-accent mb-2">{record.alumni.length ? 'After Minerva' : 'Profile'}</h3>
                <dl className="grid grid-cols-[minmax(0,8rem)_minmax(0,1fr)] gap-x-4 gap-y-1 text-small">
                  {record.alumni.map((a) => (
                    <div key={a.id} className="contents">
                      <dt className="text-muted-foreground">Class of</dt><dd>{a.graduation_year}</dd>
                      {a.company && <><dt className="text-muted-foreground">Company</dt><dd>{a.company}</dd></>}
                      {a.job_area && <><dt className="text-muted-foreground">Job area</dt><dd>{a.job_area}</dd></>}
                      {a.city && <><dt className="text-muted-foreground">City</dt><dd>{a.city}</dd></>}
                    </div>
                  ))}
                  {linkedin && (
                    <>
                      <dt className="text-muted-foreground">LinkedIn</dt>
                      <dd className="min-w-0 truncate">
                        <a href={linkedin} target="_blank" rel="noopener noreferrer" className="text-accent underline-offset-4 hover:underline">Open the profile</a>
                      </dd>
                    </>
                  )}
                </dl>
              </section>
            )}

            {record.can_edit && record.held_office && (
              <div className="flex items-start justify-between gap-4 border-t border-separator pt-4">
                <Label htmlFor="public-hidden" className="font-body text-small leading-snug">
                  Leave out of the public past Boards
                  <span className="block text-xs text-muted-foreground">For a former Board member who asked not to be listed (Privacy Policy, section 9).</span>
                </Label>
                <Switch id="public-hidden" checked={record.public_hidden} onCheckedChange={togglePublic} />
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
