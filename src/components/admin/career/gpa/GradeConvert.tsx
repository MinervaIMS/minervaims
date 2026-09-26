import { useMemo, useState } from 'react';
import { ArrowDownUp, ArrowLeftRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { HelpDot } from '@/components/admin/help/HelpSystem';
import { CareerCard } from '@/components/admin/career/CareerCard';
import { SYSTEM_BY_ID, convert, type ConversionMethod } from '@/lib/career/grading';
import { SystemSelect, Field, Segmented, EverySystem, Caveat } from './shared';
import { parseNum, inRange, rangeText } from './format';

// =====================================================================
// GPA Converter > Convert a grade.
// ---------------------------------------------------------------------
// One grade in, the same grade read in every other system out: a final
// figure (72.5% in a UK degree), a single exam (27 at Bocconi) or an
// average (a 3.71 GPA). The chosen target is shown large; every other
// system is listed beside it, so "and back" is a swap, not a new page.
// =====================================================================

export default function GradeConvert() {
  const [fromId, setFromId] = useState('it30');
  const [toId, setToId] = useState('us_gpa');
  const [raw, setRaw] = useState('27');
  const [lode, setLode] = useState(false);
  const [method, setMethod] = useState<ConversionMethod>('bands');

  const from = SYSTEM_BY_ID[fromId];
  const to = SYSTEM_BY_ID[toId];
  const typed = parseNum(raw);
  const value = lode && from.honours ? from.honours.value : typed;
  // Honours come from the tick box, never from a typed number above the maximum.
  const valid = lode ? !!from.honours : typed !== null && inRange(from, typed) && typed <= from.max + 1e-9;
  const atMax = typed !== null && Math.abs(typed - from.max) < 1e-9;

  const result = useMemo(() => (valid ? convert(from, to, value!, method) : null), [valid, from, to, value, method]);

  const changeFrom = (id: string) => {
    setFromId(id);
    setLode(false);
    const s = SYSTEM_BY_ID[id];
    // Start from a sensible grade of the new system rather than an
    // impossible leftover (a 27 is not a GPA).
    setRaw(String(s.options ? s.options[0].value : s.anchors[3]));
  };

  const swap = () => {
    const back = result && !result.fail ? (to.higherIsBetter ? result.low : result.high) : null;
    const nextFrom = toId;
    setToId(fromId);
    setFromId(nextFrom);
    const s = SYSTEM_BY_ID[nextFrom];
    if (back !== null && s.honours && back >= s.honours.value - 1e-9) { setLode(true); setRaw(String(s.max)); }
    else {
      setLode(false);
      setRaw(back !== null ? String(Number(back.toFixed(Math.max(s.decimals, 2)))) : String(s.anchors[3]));
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-5 gap-4 lg:items-start">
      <CareerCard
        title="Your grade"
        subtitle="A final figure, an exam or an average"
        icon={<ArrowLeftRight className="h-5 w-5" />}
        action={<HelpDot page="career-gpa" topic="convert" />}
        className="lg:col-span-2"
      >
        <div className="space-y-4">
          <Field label="From" htmlFor="gpa-from">
            <SystemSelect id="gpa-from" value={fromId} onChange={changeFrom} label="The system your grade is in" />
          </Field>

          <Field
            label="Grade"
            htmlFor="gpa-value"
            hint={from.note ?? from.scale}
          >
            {from.options ? (
              <div className="flex flex-wrap gap-1.5" role="radiogroup" aria-label="Grade">
                {from.options.map((o) => {
                  const on = typed !== null && Math.abs(typed - o.value) < 1e-9;
                  return (
                    <button
                      key={o.value} type="button" role="radio" aria-checked={on}
                      onClick={() => setRaw(String(o.value))}
                      className={`h-9 min-w-[2.75rem] rounded-md border px-3 text-sm tabular-nums transition-colors ${
                        on ? 'border-accent bg-accent text-accent-foreground' : 'border-separator bg-background text-foreground hover:bg-muted'
                      }`}
                    >
                      {o.label}
                    </button>
                  );
                })}
              </div>
            ) : (
              <>
                <div className="flex items-center gap-3">
                  <Input
                    id="gpa-value" inputMode="decimal" autoComplete="off"
                    value={lode ? String(from.max) : raw}
                    onChange={(e) => { setRaw(e.target.value); setLode(false); }}
                    aria-invalid={!valid && raw.trim() !== ''}
                    className="max-w-[10rem] tabular-nums text-lg md:text-lg"
                  />
                  {from.honours && (
                    <label className={`flex items-center gap-2 text-sm ${atMax || lode ? 'text-foreground' : 'text-muted-foreground'}`}>
                      <Checkbox
                        checked={lode}
                        disabled={!atMax && !lode}
                        onCheckedChange={(c) => setLode(c === true)}
                        aria-label={from.honours.label}
                      />
                      e lode
                    </label>
                  )}
                </div>
                {from.entryOptions && (
                  <div className="mt-2 flex flex-wrap gap-1" aria-label="Letter grades">
                    {from.entryOptions.filter((o) => o.value > 0).map((o) => (
                      <button
                        key={o.label} type="button" onClick={() => setRaw(o.value.toFixed(2))}
                        className="h-7 rounded border border-separator px-2 text-xs text-muted-foreground hover:bg-muted hover:text-foreground"
                        title={`${o.label} = ${o.value.toFixed(2)}`}
                      >
                        {o.label}
                      </button>
                    ))}
                  </div>
                )}
              </>
            )}
            {!valid && raw.trim() !== '' && !from.options && (
              <p className="mt-1.5 text-xs text-destructive">Enter a grade from {rangeText(from)}.</p>
            )}
          </Field>

          <div className="flex justify-center">
            <Button variant="ghost" size="sm" onClick={swap} aria-label="Swap the two systems" className="text-muted-foreground">
              <ArrowDownUp className="h-4 w-4 mr-2" />Swap
            </Button>
          </div>

          <Field label="To" htmlFor="gpa-to">
            <SystemSelect id="gpa-to" value={toId} onChange={setToId} label="The system to convert to" />
          </Field>

          {/* The answer, large. */}
          <div
            className={`rounded-lg p-4 sm:p-5 ${result && !result.fail ? 'bg-accent text-accent-foreground' : 'bg-muted/50 text-foreground'}`}
            aria-live="polite"
          >
            <div className="text-[11px] uppercase tracking-wider opacity-80">In {to.name}</div>
            {result ? (
              <>
                <div className="mt-1 font-serif text-3xl sm:text-4xl leading-tight tabular-nums">{result.text}</div>
                {!result.fail && <div className="mt-1 text-sm opacity-90">{result.band}</div>}
                {result.fail && <div className="mt-1 text-sm text-muted-foreground">The grade is below the pass mark of {from.name}.</div>}
              </>
            ) : (
              <div className="mt-1 text-sm text-muted-foreground">Enter a grade to see it here.</div>
            )}
          </div>

          <Field
            label="Method"
            hint={method === 'bands'
              ? 'Matches grades that mean the same thing (pass, good, very good, excellent) in both systems. The usual choice.'
              : 'The modified Bavarian formula used by German universities: the same share of the way from the pass mark to the best grade. Stricter in the middle of most scales.'}
          >
            <Segmented<ConversionMethod>
              value={method} onChange={setMethod} label="Conversion method"
              options={[{ value: 'bands', label: 'Equivalence bands' }, { value: 'linear', label: 'Linear (German formula)' }]}
            />
          </Field>
        </div>
      </CareerCard>

      <CareerCard
        title="In every system"
        subtitle={valid ? `${lode && from.honours ? from.honours.label : raw.trim()} in ${from.name}` : 'Enter a grade'}
        className="lg:col-span-3"
      >
        {valid ? (
          <EverySystem from={from} value={value!} method={method} highlight={toId} />
        ) : (
          <p className="text-sm text-muted-foreground py-6 text-center">The conversions appear here as soon as the grade is valid.</p>
        )}
        <div className="mt-4 pt-4 border-t border-separator"><Caveat /></div>
      </CareerCard>
    </div>
  );
}
