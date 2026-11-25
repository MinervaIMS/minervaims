import { useEffect, useMemo, useRef, useState } from 'react';
import { Minus, Plus, Rewind, SkipForward } from 'lucide-react';
import type { TimeMachineSemester } from '@/lib/rosters-api';

// =====================================================================
// THE MACHINE ITSELF (Step 108), at the top of People > Time Machine.
// ---------------------------------------------------------------------
// A chronometer: three rings and a hand on a navy console, the season
// and the year to set beside it, and one lever, Travel. Pressed, the
// rings spin up, the hand sweeps backwards, the semesters roll past in
// the window from today to the one chosen, light streaks run across the
// console, and on arrival a flash clears to the Society as it was: how
// many people, how many divisions, who was President. The semester then
// opens in the list below.
//
// It is a way into the list, never in its way: every semester is still
// one press away below, Skip ends the trip at once, and under reduced
// motion there is no trip at all, only the arrival.
// =====================================================================

type Phase = 'idle' | 'charging' | 'travelling' | 'flash' | 'arrived';

const CHARGE_MS = 650;
const TRIP_MS = 1500;
const FLASH_MS = 260;

const seasonOf = (key: string) => (key.endsWith('-fall') ? 'fall' : 'spring');
const yearOf = (key: string) => Number(key.slice(0, 4));
const ordinal = (key: string) => yearOf(key) * 2 + (seasonOf(key) === 'fall' ? 1 : 0);
const labelOf = (key: string) => `${seasonOf(key) === 'fall' ? 'Fall' : 'Spring'} ${yearOf(key)}`;

function reducedMotion(): boolean {
  return typeof window !== 'undefined' && !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
}

/** The year in the window, its digits rolling in one by one when it changes. */
function Odometer({ value }: { value: string }) {
  return (
    <span className="inline-flex gap-1" aria-hidden="true">
      {value.split('').map((d, i) => (
        <span key={i} className="tm-digit relative flex h-11 w-8 items-center justify-center overflow-hidden border border-accent-foreground/25 bg-accent-foreground/[0.06] font-serif text-2xl tabular-nums">
          <span key={`${i}-${d}`} className="tm-digit-in block">{d}</span>
        </span>
      ))}
    </span>
  );
}

function Chronometer({ phase, season, year }: { phase: Phase; season: string; year: number }) {
  const ticks = Array.from({ length: 60 }, (_, i) => i);
  return (
    <div className="tm-dial relative h-[190px] w-[190px] shrink-0" data-phase={phase} aria-hidden="true">
      <svg viewBox="0 0 200 200" className="absolute inset-0 h-full w-full">
        {/* The outer scale: sixty ticks, every fifth longer. */}
        <g className="tm-ring-outer">
          {ticks.map((i) => {
            const a = (i / 60) * Math.PI * 2;
            const long = i % 5 === 0;
            const r1 = long ? 86 : 90;
            return (
              <line key={i} x1={100 + Math.cos(a) * r1} y1={100 + Math.sin(a) * r1} x2={100 + Math.cos(a) * 95} y2={100 + Math.sin(a) * 95}
                stroke="currentColor" strokeOpacity={long ? 0.7 : 0.3} strokeWidth={long ? 1.6 : 1} />
            );
          })}
        </g>
        <g className="tm-ring-mid">
          <circle cx="100" cy="100" r="76" fill="none" stroke="currentColor" strokeOpacity="0.55" strokeWidth="3" strokeDasharray="34 10" />
        </g>
        <g className="tm-ring-inner">
          <circle cx="100" cy="100" r="62" fill="none" stroke="currentColor" strokeOpacity="0.3" strokeWidth="1.2" strokeDasharray="2 6" />
          <circle cx="100" cy="38" r="3" fill="currentColor" fillOpacity="0.8" />
        </g>
        <g className="tm-hand">
          <line x1="100" y1="100" x2="100" y2="30" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          <circle cx="100" cy="100" r="4" fill="currentColor" />
        </g>
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
        <span className="text-[11px] uppercase tracking-[0.22em] text-accent-foreground/70">{season}</span>
        <span className="font-serif text-4xl leading-none tabular-nums">{year}</span>
      </div>
    </div>
  );
}

export function TimeMachineConsole({ semesters, currentKey, currentLabel, onArrive }: {
  /** Every past semester, newest first (the Time Machine's own list). */
  semesters: TimeMachineSemester[];
  currentKey: string;
  currentLabel: string;
  /** The trip is over: open this semester in the list. */
  onArrive: (key: string) => void;
}) {
  const keys = useMemo(() => new Set(semesters.map((s) => s.key)), [semesters]);
  const years = useMemo(() => [...new Set(semesters.map((s) => yearOf(s.key)))].sort((a, b) => a - b), [semesters]);
  const newest = semesters[0]?.key ?? null;

  const [season, setSeason] = useState<'spring' | 'fall'>(newest ? seasonOf(newest) : 'fall');
  const [year, setYear] = useState<number>(newest ? yearOf(newest) : new Date().getFullYear());
  const target = `${year}-${season}`;
  const known = keys.has(target);

  const [phase, setPhase] = useState<Phase>('idle');
  const [shownKey, setShownKey] = useState<string | null>(null);
  const timers = useRef<number[]>([]);
  const clear = () => { timers.current.forEach((t) => window.clearTimeout(t)); timers.current = []; };
  useEffect(() => clear, []);

  const arrive = (key: string) => {
    clear();
    setShownKey(key);
    setPhase('arrived');
    onArrive(key);
  };

  const travel = () => {
    if (!known || phase === 'charging' || phase === 'travelling' || phase === 'flash') return;
    if (reducedMotion()) { arrive(target); return; }
    clear();
    setPhase('charging');
    // The semesters between today and the destination, rolled through.
    const path = semesters.filter((s) => ordinal(s.key) >= ordinal(target)).map((s) => s.key);
    const step = Math.max(55, Math.min(230, TRIP_MS / Math.max(1, path.length)));
    const at = (ms: number, fn: () => void) => { timers.current.push(window.setTimeout(fn, ms)); };
    at(CHARGE_MS, () => { setPhase('travelling'); setShownKey(currentKey); });
    path.forEach((k, i) => at(CHARGE_MS + step * (i + 1), () => setShownKey(k)));
    const end = CHARGE_MS + step * (path.length + 1);
    at(end, () => setPhase('flash'));
    at(end + FLASH_MS, () => arrive(target));
  };

  const running = phase === 'charging' || phase === 'travelling' || phase === 'flash';
  const windowKey = running || phase === 'arrived' ? (shownKey ?? currentKey) : target;
  const arrived = phase === 'arrived' && shownKey ? semesters.find((s) => s.key === shownKey) ?? null : null;
  const president = arrived?.rows.find((r) => r.role === 'President');
  const divisions = arrived ? new Set(arrived.rows.map((r) => r.division).filter((d) => d && d !== 'none' && d !== 'board')).size : 0;

  const yearIndex = years.indexOf(year);
  const firstLabel = semesters.length ? labelOf(semesters[semesters.length - 1].key) : '';

  if (!semesters.length) return null;

  return (
    <section
      aria-labelledby="tm-console-title"
      className="tm-console relative mb-6 overflow-hidden bg-accent text-accent-foreground"
      data-phase={phase}
    >
      {/* The light of the trip, and the flash of the arrival. */}
      <div aria-hidden="true" className="tm-warp pointer-events-none absolute inset-0" />
      <div aria-hidden="true" className="tm-flash pointer-events-none absolute inset-0 bg-accent-foreground" />

      <div className="relative flex flex-col items-center gap-5 px-5 py-5 sm:flex-row sm:items-center sm:gap-8 sm:px-7">
        <Chronometer phase={phase} season={seasonOf(windowKey) === 'fall' ? 'Fall' : 'Spring'} year={yearOf(windowKey)} />

        <div className="min-w-0 flex-1 font-body">
          <h2 id="tm-console-title" className="font-serif text-2xl leading-tight">The Minerva Chronometer</h2>
          <p className="mt-0.5 text-sm text-accent-foreground/75">
            Set a semester, travel, and see the Society as it was. The present, {currentLabel}, is in People, Members.
          </p>

          <div className="mt-4 flex flex-wrap items-end gap-x-6 gap-y-3">
            <div>
              <span className="mb-1 block text-[11px] uppercase tracking-[0.2em] text-accent-foreground/60">Season</span>
              <div className="inline-flex border border-accent-foreground/30 p-0.5" role="radiogroup" aria-label="Season">
                {(['spring', 'fall'] as const).map((sn) => (
                  <button
                    key={sn}
                    type="button"
                    role="radio"
                    aria-checked={season === sn}
                    disabled={running}
                    onClick={() => { setSeason(sn); if (phase === 'arrived') setPhase('idle'); }}
                    className={`h-10 px-4 text-sm transition-colors max-lg:h-11 ${season === sn ? 'bg-accent-foreground text-accent' : 'text-accent-foreground/85 hover:bg-accent-foreground/10'}`}
                  >
                    {sn === 'fall' ? 'Fall' : 'Spring'}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <span className="mb-1 block text-[11px] uppercase tracking-[0.2em] text-accent-foreground/60" id="tm-year-label">Year</span>
              <div className="flex items-center gap-2" role="group" aria-labelledby="tm-year-label">
                <button type="button" disabled={running || yearIndex <= 0} onClick={() => { setYear(years[yearIndex - 1]); if (phase === 'arrived') setPhase('idle'); }}
                  className="flex h-11 w-9 items-center justify-center border border-accent-foreground/30 hover:bg-accent-foreground/10 disabled:opacity-35" aria-label="An earlier year">
                  <Minus className="h-4 w-4" aria-hidden="true" />
                </button>
                <Odometer value={String(year)} />
                <span className="sr-only" aria-live="polite">{year}</span>
                <button type="button" disabled={running || yearIndex >= years.length - 1} onClick={() => { setYear(years[yearIndex + 1]); if (phase === 'arrived') setPhase('idle'); }}
                  className="flex h-11 w-9 items-center justify-center border border-accent-foreground/30 hover:bg-accent-foreground/10 disabled:opacity-35" aria-label="A later year">
                  <Plus className="h-4 w-4" aria-hidden="true" />
                </button>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={travel}
                disabled={!known || running}
                className="tm-lever inline-flex h-11 items-center gap-2 bg-accent-foreground px-5 font-serif text-lg text-accent transition-transform hover:-translate-y-px disabled:translate-y-0 disabled:opacity-50"
              >
                <Rewind className="h-4 w-4" aria-hidden="true" />
                {running ? 'Travelling' : `Travel to ${labelOf(target)}`}
              </button>
              {running && (
                <button type="button" onClick={() => arrive(target)} className="inline-flex h-11 items-center gap-1.5 px-3 text-sm text-accent-foreground/80 underline-offset-2 hover:underline">
                  <SkipForward className="h-4 w-4" aria-hidden="true" />Skip
                </button>
              )}
            </div>
          </div>

          <p className="mt-3 min-h-[1.5rem] text-sm" aria-live="polite">
            {!known && !running ? (
              <span className="text-accent-foreground/75">No record of {labelOf(target)}: the history runs from {firstLabel} to {labelOf(semesters[0].key)}.</span>
            ) : phase === 'charging' ? (
              <span className="text-accent-foreground/80">Charging the chronometer.</span>
            ) : phase === 'travelling' || phase === 'flash' ? (
              <span className="text-accent-foreground/80">Passing {labelOf(windowKey)}.</span>
            ) : arrived ? (
              <span className="tm-arrival inline-flex flex-wrap items-center gap-x-3 gap-y-1">
                <span className="font-serif text-lg">Arrived in {arrived.label}.</span>
                <span className="text-accent-foreground/80">{arrived.count} {arrived.count === 1 ? 'person' : 'people'}</span>
                {divisions > 0 && <span className="text-accent-foreground/80">{divisions} {divisions === 1 ? 'division' : 'divisions'}</span>}
                {president && <span className="text-accent-foreground/80">President: {president.first_name} {president.surname}</span>}
              </span>
            ) : (
              <span className="text-accent-foreground/65">Ready.</span>
            )}
          </p>
        </div>
      </div>
    </section>
  );
}
