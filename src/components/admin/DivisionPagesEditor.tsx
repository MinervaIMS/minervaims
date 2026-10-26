import { useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { useAccess } from '@/hooks/useAccess';
import { supabase } from '@/integrations/supabase/client';
import { WorkspacePageHeader } from '@/components/admin/WorkspacePageHeader';
import { WorkspaceLoader } from '@/components/admin/WorkspaceLoader';
import { REPORT_DIVISION_LABELS, type ReportDivision } from '@/lib/report-meta';
import { saveDivisionPage } from '@/lib/archive-api';
import { WORK_PARTS } from '@/components/divisions/DivisionWork';

// =====================================================================
// Reports > Division Pages (Step 93).
// ---------------------------------------------------------------------
// What each division page says under "How we work" (the standards a
// report meets, how it is reviewed, the tools and data it draws on) and
// which three published reports it shows as "Flagship work". The Head of
// a division edits their own; the President, the Vice President and the
// Head of Asset Management can edit any. A block left empty is hidden on
// the website, so nothing half-written is ever shown.
// =====================================================================

const DIVISIONS: ReportDivision[] = ['equity', 'investment', 'macro', 'portfolio', 'quant'];
const MAX = 1500;
const BOARD = ['admin', 'president', 'vice_president', 'head_of_asset_management'];

interface Page { standards: string; review: string; tools: string; flagship_ids: string[] }
interface Pick { id: string; title: string; date: string }

export default function DivisionPagesEditor() {
  const { session } = useAuth();
  const access = useAccess();
  const { toast } = useToast();

  const editable = useMemo<ReportDivision[]>(() => {
    if (access.isFullAccess || (access.primaryRole && BOARD.includes(access.primaryRole))) return DIVISIONS;
    return DIVISIONS.filter((d) => (access.allowedDivisions ?? []).includes(d));
  }, [access]);

  const [division, setDivision] = useState<ReportDivision | ''>('');
  const [page, setPage] = useState<Page | null>(null);
  const [reports, setReports] = useState<Pick[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [missing, setMissing] = useState(false);

  useEffect(() => { if (!division && editable.length) setDivision(editable[0]); }, [editable, division]);

  useEffect(() => {
    if (!division) return;
    let alive = true;
    setLoading(true);
    (async () => {
      const [pageRes, reportsRes] = await Promise.all([
        supabase.from('division_pages').select('*').eq('division', division).maybeSingle(),
        supabase.from('archive_files').select('id, title, date').eq('division', division)
          .eq('status', 'published').is('deleted_at', null).order('date', { ascending: false }),
      ]);
      if (!alive) return;
      setMissing(!!pageRes.error);
      const row = pageRes.data as Page | null;
      setPage({ standards: row?.standards ?? '', review: row?.review ?? '', tools: row?.tools ?? '', flagship_ids: row?.flagship_ids ?? [] });
      setReports((reportsRes.data || []) as Pick[]);
      setLoading(false);
    })();
    return () => { alive = false; };
  }, [division]);

  const save = async () => {
    if (!division || !page) return;
    setSaving(true);
    try {
      await saveDivisionPage({ division, ...page }, session);
      toast({ title: 'Division page saved', description: `${REPORT_DIVISION_LABELS[division]}: the website shows it from the next page load.` });
    } catch (e) {
      toast({ title: 'Could not save', description: e instanceof Error ? e.message : undefined, variant: 'destructive' });
    } finally { setSaving(false); }
  };

  const toggleFlagship = (id: string) => {
    if (!page) return;
    const has = page.flagship_ids.includes(id);
    if (!has && page.flagship_ids.length >= 3) {
      toast({ title: 'Three at most', description: 'Remove one before choosing another.' });
      return;
    }
    setPage({ ...page, flagship_ids: has ? page.flagship_ids.filter((x) => x !== id) : [...page.flagship_ids, id] });
  };

  return (
    <div className="font-body ws-form-touch">
      <WorkspacePageHeader
        title="Division Pages"
        description={'"How we work" and "Flagship work" on each division\'s public page.'}
      />
      {editable.length === 0 ? (
        <p className="text-muted-foreground">Only a division&apos;s Head, the President, the Vice President and the Head of Asset Management edit these pages.</p>
      ) : (
        <div className="space-y-6 max-w-4xl">
          {editable.length > 1 && (
            <div className="space-y-1 max-w-xs">
              <Label htmlFor="dp-division">Division</Label>
              <select id="dp-division" value={division} onChange={(e) => setDivision(e.target.value as ReportDivision)} className="bg-background border border-separator px-3 h-10 w-full">
                {editable.map((d) => <option key={d} value={d}>{REPORT_DIVISION_LABELS[d]}</option>)}
              </select>
            </div>
          )}
          {missing && <p className="text-sm text-destructive">The division pages are not in the database yet: apply this version&apos;s database update first.</p>}
          {loading || !page ? <WorkspaceLoader /> : (
            <>
              <section className="space-y-4">
                <h2 className="font-serif text-xl text-accent">How we work</h2>
                <p className="text-sm text-muted-foreground">Plain statements of what the division does. Each part left empty is hidden on the website; no output per semester.</p>
                {WORK_PARTS.map((p) => (
                  <div key={p.key} className="space-y-1">
                    <Label htmlFor={`dp-${p.key}`}>{p.title}</Label>
                    <Textarea id={`dp-${p.key}`} rows={5} maxLength={MAX} value={page[p.key]} onChange={(e) => setPage({ ...page, [p.key]: e.target.value })} />
                    <p className={`text-xs ${page[p.key].length > MAX - 100 ? 'text-destructive' : 'text-muted-foreground'}`}>{page[p.key].length} of {MAX} characters</p>
                  </div>
                ))}
              </section>
              <section className="space-y-3">
                <h2 className="font-serif text-xl text-accent">Flagship work</h2>
                <p className="text-sm text-muted-foreground">
                  Up to three published reports of the division, in the order chosen. Hidden on the website until at least one is chosen. {page.flagship_ids.length} of 3 chosen.
                </p>
                <ul className="border border-separator divide-y divide-separator max-h-80 overflow-y-auto">
                  {reports.map((r) => {
                    const pos = page.flagship_ids.indexOf(r.id);
                    return (
                      <li key={r.id}>
                        <label className="flex items-center gap-3 px-3 py-2 cursor-pointer hover:bg-muted max-lg:min-h-12">
                          <input type="checkbox" checked={pos >= 0} onChange={() => toggleFlagship(r.id)} />
                          <span className="flex-1 min-w-0 truncate">{r.title}</span>
                          <span className="text-xs text-muted-foreground shrink-0">{r.date.slice(0, 4)}{pos >= 0 ? ` · #${pos + 1}` : ''}</span>
                        </label>
                      </li>
                    );
                  })}
                  {reports.length === 0 && <li className="px-3 py-4 text-sm text-muted-foreground">No published reports in this division yet.</li>}
                </ul>
              </section>
              {/* On a phone the button stays at the foot of the screen while
                  the page scrolls (Step 98); on a computer it sits here. */}
              <div className="flex items-center gap-3 max-lg:sticky max-lg:-bottom-[5.5rem] max-lg:z-10 max-lg:border-t max-lg:border-separator max-lg:bg-background max-lg:py-3">
                <Button onClick={save} disabled={saving}>{saving ? 'Saving...' : 'Save the division page'}</Button>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
