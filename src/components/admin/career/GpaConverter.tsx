import { useEffect, useState } from 'react';
import { ArrowLeftRight, Calculator, Bookmark } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { WorkspacePageHeader } from '@/components/admin/WorkspacePageHeader';
import { DEFAULT_AVERAGE_SETTINGS } from '@/lib/career/grading';
import {
  listSavedCalculations, saveCalculation, deleteCalculation, type SavedCalculation,
} from '@/lib/career-api';
import GradeConvert from './gpa/GradeConvert';
import AverageCalculator from './gpa/AverageCalculator';
import { computeAverage, emptyRows, newRowId, type Draft } from '@/lib/career/average';
import SavedAverages from './gpa/SavedAverages';
import { Segmented } from './gpa/shared';

// =====================================================================
// Career > GPA Converter.
// ---------------------------------------------------------------------
// Three views of one tool, switched at the top:
//
//   Convert a grade   one figure, read in every other system
//   Weighted average  courses in, the average out, and what the next
//                     exam can do to it
//   Saved             the averages saved to the account, to reopen and
//                     compare
//
// The three stay mounted when switching, so nothing typed is lost on the
// way. The calculation being worked on is also kept in this browser
// until it is saved (a convenience: it can come back empty, and the
// page works without it). What is SAVED goes to the member's own rows in
// `gpa_calculations`, which only they can read.
// =====================================================================

type Mode = 'convert' | 'average' | 'saved';

const DRAFT_KEY = 'mims.gpa.draft.v1';
const MODE_KEY = 'mims.gpa.mode.v1';

function freshDraft(system = 'it30', settings = DEFAULT_AVERAGE_SETTINGS): Draft {
  return { id: null, name: '', system, settings: { ...settings }, courses: emptyRows(3) };
}

function readDraft(key: string): Draft | null {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const d = JSON.parse(raw) as Draft;
    if (!d || typeof d.system !== 'string' || !Array.isArray(d.courses)) return null;
    return { ...freshDraft(), ...d, settings: { ...DEFAULT_AVERAGE_SETTINGS, ...(d.settings || {}) } };
  } catch { return null; }
}

function readMode(): Mode {
  try {
    const m = localStorage.getItem(MODE_KEY);
    return m === 'average' || m === 'saved' ? m : 'convert';
  } catch { return 'convert'; }
}

/** A row is worth keeping if anything was typed into it. */
function hasContent(c: Draft['courses'][number]): boolean {
  return c.name.trim() !== '' || c.weight !== null || c.grade !== null;
}

export default function GpaConverter() {
  const { user } = useAuth();
  const { toast } = useToast();
  const draftKey = `${DRAFT_KEY}:${user?.id ?? 'anon'}`;
  const [mode, setModeState] = useState<Mode>(readMode);
  const [draft, setDraftState] = useState<Draft>(() => readDraft(draftKey) ?? freshDraft());
  const [saved, setSaved] = useState<SavedCalculation[] | null>(null);
  const [savedError, setSavedError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const setMode = (m: Mode) => {
    setModeState(m);
    try { localStorage.setItem(MODE_KEY, m); } catch { /* a convenience only */ }
  };
  const setDraft = (d: Draft) => {
    setDraftState(d);
    try { localStorage.setItem(draftKey, JSON.stringify(d)); } catch { /* a convenience only */ }
  };

  useEffect(() => {
    let cancelled = false;
    listSavedCalculations()
      .then((rows) => { if (!cancelled) { setSaved(rows); setSavedError(null); } })
      .catch((e) => { if (!cancelled) { setSaved([]); setSavedError(e instanceof Error ? e.message : 'unknown error'); } });
    return () => { cancelled = true; };
  }, []);

  const save = async (asNew: boolean) => {
    const avg = computeAverage(draft);
    if (avg.average === null) return;
    const name = draft.name.trim()
      || `Average of ${new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}`;
    setSaving(true);
    try {
      const row = await saveCalculation({
        id: asNew ? undefined : draft.id ?? undefined,
        name,
        system: draft.system,
        settings: draft.settings,
        courses: draft.courses.filter(hasContent),
        average: Number(avg.average.toFixed(4)),
        total_weight: Number(avg.totalWeight.toFixed(2)),
      });
      setDraft({ ...draft, id: row.id, name: row.name });
      setSaved((list) => [row, ...(list ?? []).filter((c) => c.id !== row.id)]);
      toast({ title: asNew || !draft.id ? 'Average saved' : 'Changes saved', description: `${row.name}. Find it under Saved.` });
    } catch (e) {
      toast({ title: 'Could not save the average', description: e instanceof Error ? e.message : undefined, variant: 'destructive' });
    } finally { setSaving(false); }
  };

  const open = (c: SavedCalculation) => {
    const courses = (Array.isArray(c.courses) ? c.courses : []).map((r) => ({ ...r, id: r.id || newRowId() }));
    setDraft({
      id: c.id, name: c.name, system: c.system,
      settings: { ...DEFAULT_AVERAGE_SETTINGS, ...(c.settings || {}) },
      courses: courses.length ? courses : emptyRows(3),
    });
    setMode('average');
    toast({ title: 'Opened', description: c.name });
  };

  const remove = async (c: SavedCalculation) => {
    setDeletingId(c.id);
    try {
      await deleteCalculation(c.id);
      setSaved((list) => (list ?? []).filter((x) => x.id !== c.id));
      // The open calculation stays on screen, now unsaved.
      if (draft.id === c.id) setDraft({ ...draft, id: null });
      toast({ title: 'Average deleted', description: c.name });
    } catch (e) {
      toast({ title: 'Could not delete the average', description: e instanceof Error ? e.message : undefined, variant: 'destructive' });
    } finally { setDeletingId(null); }
  };

  const startNew = () => setDraft(freshDraft(draft.system, draft.settings));

  return (
    <div>
      <WorkspacePageHeader
        title="GPA Converter"
        description="Read a grade in the Bocconi system and the main systems of Europe, the UK and North America, and work out, save and compare your weighted averages."
      />
      <Segmented<Mode>
        value={mode} onChange={setMode} label="GPA Converter view" nowrap
        className="mb-5 w-full sm:w-auto sm:inline-flex"
        options={[
          { value: 'convert', label: <><ArrowLeftRight className="h-4 w-4" /><span>Convert a grade</span></> },
          { value: 'average', label: <><Calculator className="h-4 w-4" /><span>Weighted average</span></> },
          { value: 'saved', label: <><Bookmark className="h-4 w-4" /><span>Saved{saved && saved.length ? ` (${saved.length})` : ''}</span></> },
        ]}
      />
      <div className={mode === 'convert' ? '' : 'hidden'}><GradeConvert /></div>
      <div className={mode === 'average' ? '' : 'hidden'}>
        <AverageCalculator draft={draft} setDraft={setDraft} onSave={save} saving={saving} onNew={startNew} />
      </div>
      <div className={mode === 'saved' ? '' : 'hidden'}>
        <SavedAverages
          saved={saved} error={savedError} onOpen={open} onDelete={remove}
          deletingId={deletingId} currentId={draft.id} onStart={() => setMode('average')}
        />
      </div>
    </div>
  );
}
