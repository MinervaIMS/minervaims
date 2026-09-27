import { useMemo, useState } from 'react';
import { Trash2, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { HelpDot } from '@/components/admin/help/HelpSystem';
import { CareerCard } from '@/components/admin/career/CareerCard';
import {
  SYSTEM_BY_ID, averageWith, gradeNeeded, degreeBase110, candidateGrades, bandOf, passes, formatGrade,
  type CourseRow, type GradingSystem,
} from '@/lib/career/grading';
import { computeAverage, newRowId, type Draft } from '@/lib/career/average';
import { SystemSelect, Field, EverySystem, Caveat } from './shared';
import { parseNum, fmtAverage, inRange, SELECT_CLASS } from './format';

// =====================================================================
// GPA Converter > Weighted average.
// ---------------------------------------------------------------------
// Courses in, with their credits and grades; the weighted average out,
// read in the other systems; and the question every student asks before
// the next exam: what does it do to my average? Every grade worth trying
// is listed with the average it would leave, and a target average is
// turned into the grade it needs.
//
// The calculation itself lives in `lib/career/grading.ts`; this file is
// only the form around it. Saving is done by the page (GpaConverter),
// to the member's own rows.
// =====================================================================

/** The featured systems under an average, the source system left out. */
function featured(s: GradingSystem): string[] {
  return ['it30', 'us_gpa', 'uk_ug', 'de', 'fr', 'ects'].filter((id) => id !== s.id).slice(0, 5);
}

function signed(n: number): string {
  const r = Number(n.toFixed(2));
  return `${r > 0 ? '+' : r < 0 ? '−' : '±'}${Math.abs(r).toFixed(2)}`;
}

// ---------------------------------------------------------------------

function GradeInput({ s, row, onChange, lodeValue }: {
  s: GradingSystem; row: CourseRow; onChange: (patch: Partial<CourseRow>) => void; lodeValue: number;
}) {
  if (s.id === 'it30') {
    const v = row.lode ? 'L' : row.grade === null ? '' : String(row.grade);
    return (
      <select
        value={v} aria-label="Grade" className={SELECT_CLASS}
        onChange={(e) => {
          const x = e.target.value;
          if (x === 'L') onChange({ grade: 30, lode: true });
          else onChange({ grade: x === '' ? null : Number(x), lode: false });
        }}
      >
        <option value="">Grade</option>
        <option value="L">30 e lode{lodeValue !== 30 ? ` (${lodeValue})` : ''}</option>
        {Array.from({ length: 13 }, (_, i) => 30 - i).map((g) => <option key={g} value={g}>{g}</option>)}
      </select>
    );
  }
  if (s.entryOptions) {
    return (
      <select
        value={row.grade === null ? '' : String(row.grade)} aria-label="Grade" className={SELECT_CLASS}
        onChange={(e) => onChange({ grade: e.target.value === '' ? null : Number(e.target.value) })}
      >
        <option value="">Grade</option>
        {s.entryOptions.map((o) => <option key={o.label} value={o.value}>{o.label}{s.id === 'dk' ? '' : ` (${o.value.toFixed(2)})`}</option>)}
      </select>
    );
  }
  return <NumberCell value={row.grade} onChange={(n) => onChange({ grade: n })} label="Grade" invalid={row.grade !== null && !inRange(s, row.grade)} placeholder={`${s.pass} to ${s.higherIsBetter ? s.max : s.best}`} />;
}

/** A number field that keeps what is being typed ("27," on the way to "27,5"). */
function NumberCell({ value, onChange, label, invalid, placeholder }: {
  value: number | null; onChange: (n: number | null) => void; label: string; invalid?: boolean; placeholder?: string;
}) {
  const [text, setText] = useState<string | null>(null);
  const shown = text ?? (value === null ? '' : String(value));
  return (
    <Input
      inputMode="decimal" autoComplete="off" aria-label={label} placeholder={placeholder}
      value={shown}
      aria-invalid={invalid}
      className={`tabular-nums ${invalid ? 'border-destructive' : ''}`}
      onChange={(e) => { setText(e.target.value); onChange(parseNum(e.target.value)); }}
      onBlur={() => setText(null)}
    />
  );
}

// ---------------------------------------------------------------------

export default function AverageCalculator({
  draft, setDraft, onSave, saving, onNew,
}: {
  draft: Draft;
  setDraft: (d: Draft) => void;
  onSave: (asNew: boolean) => void;
  saving: boolean;
  onNew: () => void;
}) {
  const s = SYSTEM_BY_ID[draft.system] ?? SYSTEM_BY_ID.it30;
  const avg = useMemo(() => computeAverage(draft), [draft]);
  const [pendingSystem, setPendingSystem] = useState<string | null>(null);
  const [nextWeight, setNextWeight] = useState<number | null>(6);
  const [targetText, setTargetText] = useState('');
  const [showAll, setShowAll] = useState(false);

  const setRow = (id: string, patch: Partial<CourseRow>) =>
    setDraft({ ...draft, courses: draft.courses.map((c) => (c.id === id ? { ...c, ...patch } : c)) });
  const addRow = () => setDraft({ ...draft, courses: [...draft.courses, { id: newRowId(), name: '', weight: lastWeight(draft.courses), grade: null }] });
  const removeRow = (id: string) => setDraft({ ...draft, courses: draft.courses.filter((c) => c.id !== id) });

  const changeSystem = (id: string) => {
    if (id === draft.system) return;
    if (draft.courses.some((c) => c.grade !== null)) { setPendingSystem(id); return; }
    setDraft({ ...draft, system: id });
  };
  const confirmSystem = () => {
    if (!pendingSystem) return;
    setDraft({ ...draft, system: pendingSystem, courses: draft.courses.map((c) => ({ ...c, grade: null, lode: false })) });
    setPendingSystem(null);
  };

  const best = s.id === 'it30' ? Math.max(30, draft.settings.lodeValue) : s.higherIsBetter ? s.max : s.best;
  const target = parseNum(targetText);
  const need = nextWeight && target !== null ? gradeNeeded(avg, nextWeight, target) : null;

  // Every grade worth trying for the next exam, with what it leaves.
  const whatIf = useMemo(() => {
    if (avg.average === null || !nextWeight || nextWeight <= 0) return [];
    return candidateGrades(s, draft.settings).map((g) => {
      const after = averageWith(avg, nextWeight, g.value)!;
      return { ...g, after, delta: after - avg.average! };
    });
  }, [avg, nextWeight, s, draft.settings]);
  const maxAbs = Math.max(0.0001, ...whatIf.map((w) => Math.abs(w.delta)));

  return (
    // ON A COMPUTER THE THREE CARDS FILL THE SCREEN AND SCROLL INSIDE.
    // From `xl` they stand side by side, a third each; between `lg` and `xl` the courses
    // and the next exam share the left column, one above the other (the
    // wrapper is `xl:contents`, so from `xl` its two cards are grid items
    // of their own). Below `lg` everything stacks.
    <div className="grid grid-cols-1 gap-4 lg:min-h-0 lg:flex-1 lg:grid-cols-12 lg:grid-rows-[minmax(0,1fr)]">
      <div className="min-w-0 flex flex-col gap-4 lg:col-span-7 lg:min-h-0 xl:contents">
        {/* ---------------- Courses ---------------- */}
        <CareerCard
          title="Your courses"
          subtitle={draft.id ? `Editing: ${draft.name || 'untitled'}` : 'Credits and grades'}
          action={<HelpDot page="career-gpa" topic="average" />}
          scroll
          className="lg:flex-1 xl:col-span-4"
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-5">
            <Field label="Grading system" htmlFor="avg-system">
              <SystemSelect id="avg-system" value={draft.system} onChange={changeSystem} label="The system your grades are in" only={(x) => x.averageable} />
            </Field>
            {s.id === 'it30' && (
              <Field label="30 e lode counts as" htmlFor="avg-lode" hint="Bocconi counts it as 30 in the average; some universities count it as more.">
                <select
                  id="avg-lode" className={SELECT_CLASS} value={draft.settings.lodeValue}
                  onChange={(e) => setDraft({ ...draft, settings: { ...draft.settings, lodeValue: Number(e.target.value) } })}
                >
                  {[30, 31, 32, 33].map((v) => <option key={v} value={v}>{v}{v === 30 ? ' (Bocconi)' : ''}</option>)}
                </select>
              </Field>
            )}
          </div>

          {/* One line per course only where the card is wide (2xl); below
              that, the name above and credits and grade under it. */}
          <div className="hidden 2xl:grid grid-cols-[minmax(0,1fr)_6rem_9rem_2.25rem] gap-2 px-0.5 mb-1.5 text-[11px] uppercase tracking-wider text-muted-foreground">
            <span>Course</span><span>Credits</span><span>Grade</span><span />
          </div>
          <ul className="space-y-3 2xl:space-y-2">
            {draft.courses.map((c, i) => (
              <li key={c.id} className="grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)_2.25rem] 2xl:grid-cols-[minmax(0,1fr)_6rem_9rem_2.25rem] gap-2 items-center rounded-lg 2xl:rounded-none border 2xl:border-0 border-separator p-2.5 2xl:p-0">
                <Input
                  value={c.name} placeholder={`Course ${i + 1}`} aria-label="Course name" maxLength={120}
                  onChange={(e) => setRow(c.id, { name: e.target.value })}
                  className="col-span-3 2xl:col-span-1"
                />
                <NumberCell value={c.weight} onChange={(n) => setRow(c.id, { weight: n })} label="Credits" placeholder="Credits" invalid={c.weight !== null && c.weight <= 0} />
                <GradeInput s={s} row={c} lodeValue={draft.settings.lodeValue} onChange={(p) => setRow(c.id, p)} />
                <Button variant="ghost" size="icon" className="h-9 w-9" onClick={() => removeRow(c.id)} aria-label={`Remove ${c.name || `course ${i + 1}`}`}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </li>
            ))}
          </ul>
          <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
            <Button variant="outline" size="sm" onClick={addRow} disabled={draft.courses.length >= 200}>
              Add a course
            </Button>
            <span className="text-xs text-muted-foreground">Rows without credits or a grade are left out.</span>
          </div>
          {/* On a phone the average card comes last, after the next exam: the
              figure itself is repeated here, where the grades are typed. */}
          {avg.average !== null && (
            <div className="lg:hidden mt-4 flex items-baseline justify-between gap-3 rounded-lg bg-accent px-4 py-3 text-accent-foreground" aria-hidden>
              <span className="text-[11px] uppercase tracking-wider opacity-80">Weighted average</span>
              <span className="font-serif text-2xl tabular-nums">{fmtAverage(avg.average)}</span>
            </div>
          )}
        </CareerCard>

        {/* ---------------- The next exam ---------------- */}
        <CareerCard
          title="The next exam"
          subtitle="What it does to your average"
          action={<HelpDot page="career-gpa" topic="next" />}
          scroll
          className="lg:flex-1 xl:col-span-4"
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Field label="Its credits" htmlFor="next-weight">
              <NumberCell value={nextWeight} onChange={setNextWeight} label="Credits of the next exam" placeholder="e.g. 6" />
            </Field>
            <Field label="Average you are aiming for" htmlFor="next-target">
              <Input
                id="next-target" inputMode="decimal" autoComplete="off" placeholder={avg.average !== null ? `e.g. ${fmtAverage(avg.average + (s.higherIsBetter ? 0.1 : -0.1))}` : 'Optional'}
                value={targetText} onChange={(e) => setTargetText(e.target.value)} className="tabular-nums"
              />
            </Field>
          </div>

          {avg.average !== null && need !== null && target !== null && (
            <NeedLine s={s} need={need} best={best} target={target} weight={nextWeight!} lodeValue={draft.settings.lodeValue} current={avg.average} />
          )}

          {avg.average === null ? (
            <p className="mt-4 text-sm text-muted-foreground">Add at least one course with credits and a grade to see what the next exam can do.</p>
          ) : !nextWeight || nextWeight <= 0 ? (
            <p className="mt-4 text-sm text-muted-foreground">Enter the credits of the next exam.</p>
          ) : (
            <div className="mt-5">
              <p className="text-xs text-muted-foreground mb-2">
                Any grade better than your average ({fmtAverage(avg.average)}) raises it; any grade below lowers it. The bars show by how much.
              </p>
              <ul className="space-y-1" aria-label="The average after each possible grade">
                {whatIf.map((w) => {
                  const better = s.higherIsBetter ? w.delta > 0.00001 : w.delta < -0.00001;
                  const worse = s.higherIsBetter ? w.delta < -0.00001 : w.delta > 0.00001;
                  const pct = (Math.abs(w.delta) / maxAbs) * 50;
                  return (
                    <li key={w.label} className="grid grid-cols-[4.5rem_minmax(0,1fr)_3.5rem_3.5rem] sm:grid-cols-[6rem_minmax(0,1fr)_4rem_4rem] items-center gap-2 text-sm">
                      <span className="tabular-nums text-foreground truncate">{w.label}</span>
                      <span className="relative h-3 rounded-sm bg-muted/60" aria-hidden>
                        <span className="absolute inset-y-0 left-1/2 w-px bg-separator" />
                        {better && <span className="absolute inset-y-0 left-1/2 rounded-r-sm bg-emerald-600" style={{ width: `${pct}%` }} />}
                        {worse && <span className="absolute inset-y-0 right-1/2 rounded-l-sm bg-destructive" style={{ width: `${pct}%` }} />}
                      </span>
                      <span className="tabular-nums text-right text-foreground">{fmtAverage(w.after)}</span>
                      <span className={`tabular-nums text-right text-xs ${better ? 'text-emerald-700' : worse ? 'text-destructive' : 'text-muted-foreground'}`}>
                        {signed(w.delta)}
                      </span>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}
        </CareerCard>
      </div>

      {/* ---------------- The average, and saving it ---------------- */}
      <div className="min-w-0 flex lg:col-span-5 lg:min-h-0 xl:col-span-4">
        <CareerCard title="Your average" subtitle={s.name} scroll>
          <div className={`rounded-lg p-4 sm:p-5 ${avg.average !== null ? 'bg-accent text-accent-foreground' : 'bg-muted/50'}`} aria-live="polite">
            <div className="text-[11px] uppercase tracking-wider opacity-80">Weighted average</div>
            {avg.average !== null ? (
              <>
                <div className="mt-1 font-serif text-4xl leading-tight tabular-nums">{fmtAverage(avg.average)}</div>
                <div className="mt-1 text-sm opacity-90">{passes(s, avg.average) ? bandOf(s, avg.average) : s.failLabel}</div>
              </>
            ) : (
              <div className="mt-1 text-sm text-muted-foreground">Add a course with credits and a grade.</div>
            )}
          </div>

          {avg.average !== null && (
            <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
              <div><dt className="text-[11px] uppercase tracking-wider text-muted-foreground">Credits counted</dt><dd className="tabular-nums">{Number(avg.totalWeight.toFixed(2))}</dd></div>
              <div><dt className="text-[11px] uppercase tracking-wider text-muted-foreground">Courses counted</dt><dd className="tabular-nums">{avg.count}</dd></div>
              <div><dt className="text-[11px] uppercase tracking-wider text-muted-foreground">Simple average</dt><dd className="tabular-nums">{fmtAverage(avg.simple!)}</dd></div>
              {s.id === 'it30' && (
                <div>
                  <dt className="text-[11px] uppercase tracking-wider text-muted-foreground">Degree mark base</dt>
                  <dd className="tabular-nums">{fmtAverage(degreeBase110(avg.average))}/110</dd>
                </div>
              )}
            </dl>
          )}
          {s.id === 'it30' && avg.average !== null && (
            <p className="mt-2 text-xs text-muted-foreground">The degree mark base is the average times 110 divided by 30, before the points the final commission adds.</p>
          )}

          {avg.average !== null && passes(s, avg.average) && (
            <div className="mt-5">
              <div className="text-[11px] uppercase tracking-wider text-muted-foreground mb-2">Your average in other systems</div>
              <EverySystem from={s} value={avg.average} method="bands" only={showAll ? undefined : featured(s)} />
              <button type="button" onClick={() => setShowAll((v) => !v)} className="mt-2 text-xs text-accent underline-offset-2 hover:underline">
                {showAll ? 'Show fewer systems' : 'Show every system'}
              </button>
            </div>
          )}

          {/* Save */}
          <div className="mt-5 pt-4 border-t border-separator space-y-3">
            <Field label="Name" htmlFor="avg-name">
              <Input
                id="avg-name" value={draft.name} maxLength={120} placeholder="e.g. BSc, after year 2"
                onChange={(e) => setDraft({ ...draft, name: e.target.value })}
              />
            </Field>
            <div className="flex flex-wrap gap-2">
              <Button variant="solid" onClick={() => onSave(false)} disabled={saving || avg.average === null} className="flex-1 min-w-[8rem]">
                {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                {draft.id ? 'Save changes' : 'Save'}
              </Button>
              {draft.id && (
                <Button variant="outline" onClick={() => onSave(true)} disabled={saving || avg.average === null} className="flex-1 min-w-[8rem]">
                  Save as new
                </Button>
              )}
            </div>
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs text-muted-foreground">Saved to your account, visible only to you.</span>
              <Button variant="ghost" size="sm" onClick={onNew} className="shrink-0 text-muted-foreground">
                New
              </Button>
            </div>
          </div>
          <div className="mt-4 pt-4 border-t border-separator"><Caveat /></div>
        </CareerCard>
      </div>

      <AlertDialog open={pendingSystem !== null} onOpenChange={(o) => { if (!o) setPendingSystem(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Change the grading system?</AlertDialogTitle>
            <AlertDialogDescription>
              The grades you entered are on the {s.name} scale and will be cleared. Course names and credits stay.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep {s.name}</AlertDialogCancel>
            <AlertDialogAction onClick={confirmSystem}>Change and clear the grades</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function lastWeight(rows: CourseRow[]): number | null {
  for (let i = rows.length - 1; i >= 0; i--) if (rows[i].weight) return rows[i].weight;
  return null;
}

/** "You need at least 28", or why no single exam can do it. */
function NeedLine({ s, need, best, target, weight, lodeValue, current }: {
  s: GradingSystem; need: number; best: number; target: number; weight: number; lodeValue: number; current: number;
}) {
  let text: string; let tone: 'ok' | 'bad' | 'easy';
  const hb = s.higherIsBetter;
  const reachable = hb ? need <= best + 1e-9 : need >= best - 1e-9;
  const anyPass = hb ? need <= s.pass + 1e-9 : need >= s.pass - 1e-9;
  if (!reachable) {
    tone = 'bad';
    text = `Out of reach with one exam of ${weight} credits: it would take ${fmtAverage(need)}, beyond the best grade.`;
  } else if (anyPass) {
    tone = 'easy';
    const already = hb ? current >= target - 1e-9 : current <= target + 1e-9;
    text = `Any passing grade ${already ? 'keeps you at' : 'gets you to'} ${fmtAverage(target)} or ${hb ? 'above' : 'better'}.`;
  } else if (s.id === 'it30') {
    const g = Math.ceil(need - 1e-9);
    tone = 'ok';
    text = g > 30
      ? `You need 30 e lode (counted as ${lodeValue}) in an exam of ${weight} credits.`
      : `You need at least ${g} in an exam of ${weight} credits (exactly ${fmtAverage(need)}).`;
  } else if (s.entryOptions) {
    // Letter scales: the first grade that is enough, not a number between two letters.
    const enough = s.entryOptions
      .filter((o) => (hb ? o.value >= need - 1e-9 : o.value <= need + 1e-9))
      .sort((x, y) => (hb ? x.value - y.value : y.value - x.value))[0];
    tone = 'ok';
    text = enough
      ? `You need at least ${enough.label}${s.id === 'dk' ? '' : ` (${enough.value.toFixed(2)})`} in an exam of ${weight} credits.`
      : `Out of reach with one exam of ${weight} credits.`;
  } else {
    // Rounded towards the safe side, so the grade shown is always enough.
    const f = Math.pow(10, s.decimals);
    const g = hb ? Math.ceil(need * f - 1e-9) / f : Math.floor(need * f + 1e-9) / f;
    tone = 'ok';
    text = `You need ${hb ? 'at least' : 'at most'} ${formatGrade(s, g)} in an exam of ${weight} credits.`;
  }
  return (
    <p
      className={`mt-4 rounded-md px-3 py-2 text-sm ${
        tone === 'bad' ? 'bg-destructive/10 text-destructive' : tone === 'easy' ? 'bg-emerald-600/10 text-emerald-800' : 'bg-accent/10 text-accent'
      }`}
      aria-live="polite"
    >
      {text}
    </p>
  );
}
