import type { ReactNode } from 'react';
import {
  SYSTEMS, SYSTEM_BY_ID, REGIONS, convert, bandOf,
  type GradingSystem, type ConversionMethod,
} from '@/lib/career/grading';
import { SELECT_CLASS } from './format';

// =====================================================================
// What the three parts of the GPA Converter share: the system picker,
// number parsing, and the "this grade in every system" list.
// =====================================================================

export function SystemSelect({
  value, onChange, label, only, id,
}: {
  value: string;
  onChange: (id: string) => void;
  label: string;
  /** Limit the list, e.g. to the systems that can be averaged. */
  only?: (s: GradingSystem) => boolean;
  id?: string;
}) {
  return (
    <select id={id} value={value} onChange={(e) => onChange(e.target.value)} aria-label={label} className={SELECT_CLASS}>
      {REGIONS.map((r) => {
        const list = SYSTEMS.filter((s) => s.region === r && (!only || only(s)));
        if (!list.length) return null;
        return (
          <optgroup key={r} label={r}>
            {list.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </optgroup>
        );
      })}
    </select>
  );
}

/** A labelled field, the label above. */
export function Field({ label, htmlFor, hint, children }: { label: string; htmlFor?: string; hint?: ReactNode; children: ReactNode }) {
  return (
    <div className="min-w-0">
      <label htmlFor={htmlFor} className="block text-xs uppercase tracking-wider text-muted-foreground mb-1.5">{label}</label>
      {children}
      {hint && <div className="mt-1.5 text-xs text-muted-foreground">{hint}</div>}
    </div>
  );
}

/** A two or three way switch, drawn like the Calendar's size control. */
export function Segmented<T extends string>({
  value, onChange, options, label, className = '', nowrap = false,
}: {
  value: T;
  onChange: (v: T) => void;
  options: { value: T; label: ReactNode }[];
  label: string;
  className?: string;
  /** Keep each label on one line from `sm` up (the page switch). */
  nowrap?: boolean;
}) {
  return (
    <div className={`flex items-stretch border border-separator rounded-md overflow-hidden ${className}`} role="group" aria-label={label}>
      {options.map((o) => (
        <button
          key={o.value} type="button"
          onClick={() => onChange(o.value)}
          aria-pressed={value === o.value}
          className={`min-h-9 flex-1 px-3 py-1.5 font-body text-xs transition-colors inline-flex items-center justify-center gap-1.5 ${nowrap ? 'sm:whitespace-nowrap sm:px-4' : ''} ${
            value === o.value ? 'bg-accent text-accent-foreground' : 'bg-background text-muted-foreground hover:bg-muted'
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

/**
 * One grade, read in every system, grouped by region. The source system
 * is marked as "your grade" and the highlighted one (the chosen target)
 * stands out.
 */
export function EverySystem({
  from, value, method, highlight, only, twoColumns = false,
}: {
  from: GradingSystem;
  value: number;
  method: ConversionMethod;
  highlight?: string;
  /** Show only these systems (by id), in this order. */
  only?: string[];
  /** On a wide card, set the regions side by side (from `xl`). */
  twoColumns?: boolean;
}) {
  const groups = only
    ? [{ region: null as string | null, list: only.map((id) => SYSTEM_BY_ID[id]).filter(Boolean) }]
    : REGIONS.map((r) => ({ region: r as string | null, list: SYSTEMS.filter((s) => s.region === r) }));
  return (
    <div className={twoColumns ? 'xl:columns-2 xl:gap-8' : 'divide-y divide-separator'}>
      {groups.map((g) => (
        <div
          key={g.region ?? 'featured'}
          className={twoColumns ? 'break-inside-avoid pb-3 mb-1 border-b border-separator last:border-b-0' : 'py-2 first:pt-0 last:pb-0'}
        >
          {g.region && <div className="text-[11px] uppercase tracking-wider text-accent font-serif mb-1">{g.region}</div>}
          <ul>
            {g.list.map((s) => {
              const self = s.id === from.id;
              const c = convert(from, s, value, method);
              const on = s.id === highlight;
              return (
                <li
                  key={s.id}
                  className={`flex items-baseline justify-between gap-3 rounded-md px-2 py-1.5 ${on ? 'bg-accent/10' : ''}`}
                >
                  <span className="min-w-0">
                    <span className={`block text-sm ${on ? 'text-accent font-medium' : 'text-foreground'}`}>{s.name}</span>
                    <span className="block text-[11px] text-muted-foreground">{self ? 'Your grade' : s.scale}</span>
                  </span>
                  <span className="shrink-0 text-right">
                    <span className={`block text-sm tabular-nums ${c.fail ? 'text-destructive' : 'text-foreground'} ${on ? 'font-semibold' : ''}`}>
                      {self ? formatSelf(s, value) : c.text}
                    </span>
                    {!c.fail && <span className="block text-[11px] text-muted-foreground">{self ? bandOf(s, value) : c.band}</span>}
                  </span>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </div>
  );
}

function formatSelf(s: GradingSystem, v: number): string {
  if (s.honours && v >= s.honours.value - 1e-9) return s.honours.label;
  if (s.options) return s.options.find((o) => Math.abs(o.value - v) < 1e-9)?.label ?? String(v);
  return String(Number(v.toFixed(Math.max(s.decimals, 2))));
}

/** The line under every result: what the numbers are, and are not. */
export function Caveat() {
  return (
    <p className="text-xs text-muted-foreground leading-relaxed">
      Indicative only. There is no official conversion between grading systems: every university and employer uses its
      own table. If an application gives you one, use theirs, and always write your original grade and scale next to
      any converted figure.
    </p>
  );
}
