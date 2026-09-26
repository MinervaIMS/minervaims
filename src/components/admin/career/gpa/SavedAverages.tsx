import { useMemo, useState } from 'react';
import { Bookmark, FolderOpen, Trash2, Loader2, Scale, Crown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { HelpDot } from '@/components/admin/help/HelpSystem';
import { CareerCard } from '@/components/admin/career/CareerCard';
import { SYSTEM_BY_ID, convert, bandOf, passes, levelOf, DEFAULT_AVERAGE_SETTINGS } from '@/lib/career/grading';
import type { SavedCalculation } from '@/lib/career-api';
import { computeAverage } from '@/lib/career/average';
import { Caveat } from './shared';
import { fmtAverage } from './format';

// =====================================================================
// GPA Converter > Saved.
// ---------------------------------------------------------------------
// The averages a member has saved, newest first; open one to carry on,
// or tick up to four to set them side by side. Averages on different
// scales are compared through the same equivalence bands the converter
// uses, and each is also shown on a few common scales.
// =====================================================================

const MAX_COMPARE = 4;
const COMMON = ['it30', 'us_gpa', 'uk_ug', 'de'];

function figures(c: SavedCalculation) {
  const s = SYSTEM_BY_ID[c.system] ?? SYSTEM_BY_ID.it30;
  const avg = computeAverage({
    id: c.id, name: c.name, system: s.id,
    settings: { ...DEFAULT_AVERAGE_SETTINGS, ...(c.settings || {}) },
    courses: Array.isArray(c.courses) ? c.courses : [],
  });
  const average = avg.average ?? c.average;
  const level = average !== null && passes(s, average) ? levelOf(s, average)?.[0] ?? null : null;
  return { s, avg, average, level };
}

function dateLabel(iso: string): string {
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

export default function SavedAverages({
  saved, error, onOpen, onDelete, deletingId, currentId, onStart,
}: {
  saved: SavedCalculation[] | null;
  error: string | null;
  onOpen: (c: SavedCalculation) => void;
  onDelete: (c: SavedCalculation) => void;
  deletingId: string | null;
  currentId: string | null;
  onStart: () => void;
}) {
  const [picked, setPicked] = useState<string[]>([]);
  const [confirm, setConfirm] = useState<SavedCalculation | null>(null);

  const list = useMemo(() => saved ?? [], [saved]);
  const chosen = useMemo(
    () => picked.map((id) => list.find((c) => c.id === id)).filter(Boolean) as SavedCalculation[],
    [picked, list],
  );
  const rows = chosen.map((c) => ({ c, ...figures(c) }));
  const topLevel = Math.max(-1, ...rows.map((r) => r.level ?? -1));

  const toggle = (id: string, on: boolean) =>
    setPicked((p) => (on ? (p.includes(id) || p.length >= MAX_COMPARE ? p : [...p, id]) : p.filter((x) => x !== id)));

  if (saved === null && !error) {
    return <div className="flex justify-center py-16 text-muted-foreground"><Loader2 className="h-5 w-5 animate-spin" /></div>;
  }

  return (
    <div className="space-y-4">
      {error && (
        <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">Your saved averages could not be loaded: {error}</p>
      )}

      {!error && list.length === 0 && (
        <div className="rounded-xl border border-dashed border-separator px-6 py-14 text-center font-body">
          <Bookmark className="mx-auto h-6 w-6 text-accent" />
          <p className="mt-3 font-serif text-xl text-accent">Nothing saved yet</p>
          <p className="mt-1 text-sm text-muted-foreground">Work out an average, give it a name and press Save. It will wait for you here.</p>
          <Button variant="outline" className="mt-4" onClick={onStart}>Work out an average</Button>
        </div>
      )}

      {list.length > 0 && (
        <>
          <p className="font-body text-sm text-muted-foreground">
            Tick up to {MAX_COMPARE} to compare them side by side. Only you can see these.
          </p>
          <ul className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
            {list.map((c) => {
              const f = figures(c);
              const on = picked.includes(c.id);
              const full = !on && picked.length >= MAX_COMPARE;
              return (
                <li key={c.id} className={`rounded-xl border bg-background p-4 sm:p-5 font-body flex flex-col ${on ? 'border-accent ring-1 ring-accent' : 'border-separator'}`}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-serif text-lg text-accent leading-tight break-words">{c.name}</p>
                      <p className="mt-0.5 text-[11px] uppercase tracking-wider text-muted-foreground">{f.s.name}</p>
                    </div>
                    {c.id === currentId && <span className="shrink-0 rounded-full bg-accent/10 px-2 py-0.5 text-[10px] uppercase tracking-wider text-accent">Open</span>}
                  </div>
                  <div className="mt-3 flex items-baseline gap-2">
                    <span className="font-serif text-3xl tabular-nums text-foreground">{f.average !== null ? fmtAverage(f.average) : 'None'}</span>
                    {f.average !== null && <span className="text-sm text-muted-foreground">{passes(f.s, f.average) ? bandOf(f.s, f.average) : f.s.failLabel}</span>}
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground tabular-nums">
                    {f.avg.count} {f.avg.count === 1 ? 'course' : 'courses'} · {Number(f.avg.totalWeight.toFixed(2))} credits · updated {dateLabel(c.updated_at)}
                  </p>
                  <div className="mt-auto pt-4 flex items-center justify-between gap-2">
                    <label className={`flex items-center gap-2 text-sm ${full ? 'text-muted-foreground/60' : 'text-foreground'}`} title={full ? `Up to ${MAX_COMPARE} at a time` : undefined}>
                      <Checkbox checked={on} disabled={full} onCheckedChange={(v) => toggle(c.id, v === true)} aria-label={`Compare ${c.name}`} />
                      Compare
                    </label>
                    <div className="flex items-center gap-1">
                      <Button variant="outline" size="sm" onClick={() => onOpen(c)}>
                        <FolderOpen className="h-4 w-4 mr-1.5" />Open
                      </Button>
                      <Button variant="ghost" size="icon" className="h-9 w-9" onClick={() => setConfirm(c)} aria-label={`Delete ${c.name}`} disabled={deletingId === c.id}>
                        {deletingId === c.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                      </Button>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        </>
      )}

      {rows.length >= 2 && (
        <CareerCard title="Side by side" subtitle={`${rows.length} averages`} icon={<Scale className="h-5 w-5" />} action={<HelpDot page="career-gpa" topic="saved" />}>
          <div className="-mx-1 overflow-x-auto">
            <table className="w-full min-w-[32rem] text-sm">
              <thead>
                <tr className="border-b border-separator">
                  <th className="sticky left-0 z-10 bg-background py-2 pr-3 text-left text-[11px] font-normal uppercase tracking-wider text-muted-foreground w-28 sm:w-40" />
                  {rows.map((r) => (
                    <th key={r.c.id} className="py-2 px-2 text-left align-bottom font-serif font-normal text-accent">
                      <span className="flex items-center gap-1.5">
                        {r.level !== null && r.level === topLevel && rows.length > 1 && <Crown className="h-3.5 w-3.5 shrink-0" aria-label="Highest" />}
                        <span className="break-words">{r.c.name}</span>
                      </span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-separator">
                <Row label="Scale" cells={rows.map((r) => r.s.name)} muted />
                <Row label="Weighted average" cells={rows.map((r) => (r.average !== null ? fmtAverage(r.average) : 'None'))} strong />
                <Row label="Band" cells={rows.map((r) => (r.average !== null ? (passes(r.s, r.average) ? bandOf(r.s, r.average) : r.s.failLabel) : ''))} />
                <Row label="Credits" cells={rows.map((r) => String(Number(r.avg.totalWeight.toFixed(2))))} />
                <Row label="Courses" cells={rows.map((r) => String(r.avg.count))} />
                {COMMON.map((id) => {
                  const to = SYSTEM_BY_ID[id];
                  return (
                    <Row
                      key={id}
                      label={`In ${to.name}`}
                      cells={rows.map((r) => {
                        if (r.average === null) return '';
                        if (r.s.id === id) return fmtAverage(r.average);
                        return convert(r.s, to, r.average, 'bands').text;
                      })}
                    />
                  );
                })}
              </tbody>
            </table>
          </div>
          <p className="mt-3 text-xs text-muted-foreground">
            The crown marks the highest average once every scale is read through the same equivalence bands.
          </p>
          <div className="mt-3 pt-3 border-t border-separator"><Caveat /></div>
        </CareerCard>
      )}
      {rows.length === 1 && (
        <p className="font-body text-sm text-muted-foreground">Tick one more to compare.</p>
      )}

      <AlertDialog open={!!confirm} onOpenChange={(o) => { if (!o) setConfirm(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this average?</AlertDialogTitle>
            <AlertDialogDescription>
              {confirm ? `"${confirm.name}" and its courses will be removed from your account. This cannot be undone.` : ''}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep it</AlertDialogCancel>
            <AlertDialogAction onClick={() => { if (confirm) { onDelete(confirm); setPicked((p) => p.filter((x) => x !== confirm.id)); } setConfirm(null); }}>
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function Row({ label, cells, strong = false, muted = false }: { label: string; cells: string[]; strong?: boolean; muted?: boolean }) {
  return (
    <tr>
      <th scope="row" className="sticky left-0 z-10 bg-background py-2 pr-3 text-left text-xs font-normal text-muted-foreground align-top">{label}</th>
      {cells.map((c, i) => (
        <td key={i} className={`py-2 px-2 align-top tabular-nums ${strong ? 'font-serif text-lg text-foreground' : muted ? 'text-xs text-muted-foreground' : 'text-foreground'}`}>{c}</td>
      ))}
    </tr>
  );
}
