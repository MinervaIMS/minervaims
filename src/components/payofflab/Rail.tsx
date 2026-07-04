// PayoffLab — the left control rail (§3): level switch, chart management,
// add-asset flow with contextual parameters, leg list, chart controls,
// fixed parameters with sweep, the Advanced (models) expander, the Hedging
// expander and Export. Progressive disclosure throughout.

import { useMemo, useRef, useState } from "react";
import { ChevronDown, ChevronRight, Plus, Trash2 } from "lucide-react";
import type { ChartState, GreekName, GridResult, Leg, Level } from "@/lib/payofflab/types";
import { freshId } from "@/lib/payofflab/types";
import {
  availableAtLevel, defaultLegFor, GREEK_META, INSTRUMENT_CATALOG, INSTRUMENTS_BY_ID,
  legLabel, LEVEL_ORDER, STRATEGY_PRESETS,
} from "@/lib/payofflab/catalog";
import type { InstrumentSpec, ParamSpec } from "@/lib/payofflab/catalog";
import { useEntitlements } from "@/lib/payofflab/entitlements";
import { useLab } from "./context";
import { InfoDot } from "./InfoDot";
import { LegendSwatch } from "./LabChart";
import { ModelsPanel } from "./ModelsPanel";
import { HedgingPanel } from "./HedgingPanel";
import { ExportPanel } from "./ExportPanel";
import type { PlotSurfaceHandle } from "./PlotSurface";

// ---------- small shared inputs ----------

export function NumberField({
  value, onChange, min, max, step, percent, unit, label, ariaLabel,
}: {
  value: number;
  onChange: (v: number) => void;
  min?: number;
  max?: number;
  step?: number;
  percent?: boolean;
  unit?: string;
  label?: string;
  ariaLabel?: string;
}) {
  const display = percent ? value * 100 : value;
  const [text, setText] = useState<string | null>(null);
  const commit = (raw: string) => {
    setText(null);
    let v = parseFloat(raw);
    if (!isFinite(v)) return;
    if (percent) v /= 100;
    if (min !== undefined) v = Math.max(min, v);
    if (max !== undefined) v = Math.min(max, v);
    onChange(v);
  };
  return (
    <span className="flex min-w-0 flex-1 items-center gap-1">
      <input
        type="number"
        className="pl-num w-full min-w-0 border border-border bg-background px-2 py-1 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
        value={text ?? String(Math.abs(display) < 1e-10 ? 0 : parseFloat(display.toPrecision(8)))}
        step={percent ? (step ?? 0.005) * 100 : step ?? 1}
        aria-label={ariaLabel ?? label}
        onChange={(e) => setText(e.target.value)}
        onBlur={(e) => commit(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") commit((e.target as HTMLInputElement).value);
        }}
      />
      {(percent || unit) && <span className="text-[11px] text-muted-foreground">{percent ? "%" : unit}</span>}
    </span>
  );
}

function Expander({
  title, info, open, onToggle, children, badge, tourId,
}: {
  title: string;
  info?: string;
  open: boolean;
  onToggle: () => void;
  children: React.ReactNode;
  badge?: string;
  tourId?: string;
}) {
  return (
    <div className="border-b border-separator" data-tour={tourId}>
      <button
        type="button"
        className="flex w-full items-center gap-2 px-4 py-3 text-left transition-colors hover:bg-secondary/50"
        aria-expanded={open}
        onClick={onToggle}
      >
        {open ? <ChevronDown size={13} className="text-muted-foreground" /> : <ChevronRight size={13} className="text-muted-foreground" />}
        <span className="pl-section-title">{title}</span>
        {badge && <span className="pl-eye">{badge}</span>}
        <span className="ml-auto" onClick={(e) => e.stopPropagation()}>{info && <InfoDot id={info} />}</span>
      </button>
      {open && <div className="px-4 pb-4">{children}</div>}
    </div>
  );
}

// ---------- parameter editor (shared by add-asset and leg editing) ----------

function ParamFields({
  spec, params, onChange,
}: {
  spec: InstrumentSpec;
  params: Record<string, number | string>;
  onChange: (key: string, v: number | string) => void;
}) {
  const rows: ParamSpec[][] = [];
  let current: ParamSpec[] = [];
  for (const p of spec.params) {
    current.push(p);
    if (current.length === 2 || p.kind === "select") {
      rows.push(current);
      current = [];
    }
  }
  if (current.length) rows.push(current);
  return (
    <div className="flex flex-col gap-2.5">
      {rows.map((row, ri) => (
        <div key={ri} className="flex gap-2.5">
          {row.map((p) => (
            <div key={p.key} className="min-w-0 flex-1">
              <div className="mb-1 flex items-center justify-between text-xs text-foreground">
                <span className="truncate">{p.label}</span>
                <InfoDot id={p.info} />
              </div>
              {p.kind === "select" ? (
                <select
                  className="w-full border border-border bg-background px-2 py-1.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                  value={String(params[p.key] ?? p.default)}
                  aria-label={p.label}
                  onChange={(e) => onChange(p.key, e.target.value)}
                >
                  {p.options?.map((o) => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
              ) : (
                <NumberField
                  value={typeof params[p.key] === "number" ? (params[p.key] as number) : (p.default as number)}
                  onChange={(v) => onChange(p.key, v)}
                  min={p.min}
                  max={p.max}
                  step={p.step}
                  percent={p.percent}
                  unit={p.unit}
                  ariaLabel={p.label}
                />
              )}
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

// ---------- the rail ----------

interface RailProps {
  activeGrid: GridResult | null;
  exportRef: React.RefObject<PlotSurfaceHandle | null>;
  onStartTour: () => void;
}

export function Rail({ activeGrid, exportRef, onStartTour }: RailProps) {
  const { state, dispatch, openLearn } = useLab();
  const ent = useEntitlements();
  const chart = state.charts[state.activeChart];
  const level = state.level;

  const [addOpen, setAddOpen] = useState(false);
  const [pendingInstrument, setPendingInstrument] = useState<string>("euro-option");
  const [pendingSide, setPendingSide] = useState<1 | -1>(1);
  const [pendingParams, setPendingParams] = useState<Record<string, number | string>>({});
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [hedgingOpen, setHedgingOpen] = useState(false);
  const [stylesOpen, setStylesOpen] = useState(false);
  const [editingLeg, setEditingLeg] = useState<string | null>(null);
  const sweepRef = useRef(0);

  const instruments = useMemo(() => {
    let list = availableAtLevel(INSTRUMENT_CATALOG, level);
    if (!ent.advancedInstruments) list = list.filter((i) => i.tier === "basic");
    if (!ent.rateInstruments) list = list.filter((i) => i.category !== "Rates & volatility");
    return list;
  }, [level, ent]);

  const categories = useMemo(() => {
    const map = new Map<string, InstrumentSpec[]>();
    for (const i of instruments) {
      const arr = map.get(i.category) ?? [];
      arr.push(i);
      map.set(i.category, arr);
    }
    return Array.from(map.entries());
  }, [instruments]);

  const pendingSpec = INSTRUMENTS_BY_ID[pendingInstrument];
  const update = (patch: Partial<ChartState>) => dispatch({ type: "update-chart", index: state.activeChart, patch });

  const addLeg = () => {
    if (!pendingSpec || chart.legs.length >= 5) return;
    const leg = defaultLegFor(pendingSpec, pendingSide);
    leg.params = { ...leg.params, ...pendingParams };
    const legs = [...chart.legs, leg];
    dispatch({ type: "set-legs", index: state.activeChart, legs });
    // Steer the chart to a sensible axis for the instrument.
    if (!pendingSpec.axes.includes(chart.xVar)) update({ xVar: pendingSpec.axes[0] });
    if (chart.legs.length === 0 && legs.length === 1) {
      update({ title: legLabel(leg).replace(/^Long |^Short /, (m) => m) });
    }
    setPendingParams({});
    setAddOpen(false);
  };

  const loadPreset = (id: string) => {
    const preset = STRATEGY_PRESETS.find((p) => p.id === id);
    if (!preset) return;
    const legs: Leg[] = preset.build(chart.market.S).map((l) => ({ ...l, id: freshId("l") }));
    dispatch({ type: "set-legs", index: state.activeChart, legs });
    update({ title: preset.label, xVar: "S" });
  };

  const greekChoices = useMemo(() => {
    const all = (Object.keys(GREEK_META) as GreekName[]).filter(
      (g) => LEVEL_ORDER[GREEK_META[g].tier] <= LEVEL_ORDER[level] && (ent.proGreeks || GREEK_META[g].tier !== "pro"),
    );
    return all;
  }, [level, ent.proGreeks]);

  const toggleGreek = (g: GreekName) => {
    const has = chart.greeks.includes(g);
    let next = has ? chart.greeks.filter((q) => q !== g) : [...chart.greeks, g];
    if (next.length > 3) next = next.slice(next.length - 3);
    update({ greeks: next });
  };

  const sweepParam = (key: "S" | "r" | "sigma" | "q") => {
    const orig = chart.market[key];
    const lo = key === "S" ? orig * 0.7 : Math.max(orig - (key === "sigma" ? 0.1 : 0.03), 0.0001);
    const hi = key === "S" ? orig * 1.3 : orig + (key === "sigma" ? 0.1 : 0.03);
    const steps = 12;
    const gen = ++sweepRef.current;
    let i = 0;
    const seq: number[] = [];
    for (let k = 0; k <= steps; k++) seq.push(lo + ((hi - lo) * k) / steps);
    for (let k = steps; k >= 0; k--) seq.push(lo + ((hi - lo) * k) / steps);
    const tick = () => {
      if (gen !== sweepRef.current) return;
      if (i >= seq.length) {
        dispatch({ type: "update-chart", index: state.activeChart, patch: { market: { ...chart.market, [key]: orig } } });
        return;
      }
      dispatch({ type: "update-chart", index: state.activeChart, patch: { market: { ...chart.market, [key]: seq[i] } } });
      i += 1;
      setTimeout(tick, 320);
    };
    tick();
  };

  const visibleLines = useMemo(() => {
    const lines: Array<{ id: string; label: string }> = [];
    if (chart.showValue) lines.push({ id: "value", label: "Value" });
    if (chart.showPayoff) lines.push({ id: "payoff", label: "Payoff" });
    for (const g of chart.greeks) lines.push({ id: g, label: GREEK_META[g].label });
    return lines;
  }, [chart]);

  return (
    <div className="payofflab-rail flex h-full w-[340px] flex-none flex-col overflow-y-auto border-r border-separator 2xl:w-[360px]" data-tour="rail">
      {/* Level */}
      <div className="pl-section" data-tour="level">
        <div className="mb-2 flex items-center justify-between">
          <span className="pl-eye">Level</span>
          <InfoDot id="level-switch" />
        </div>
        <div className="pl-seg" role="group" aria-label="Learner level">
          {(["basic", "advanced", "pro"] as Level[]).map((lv) => (
            <button key={lv} type="button" data-active={level === lv} onClick={() => dispatch({ type: "level", level: lv })}>
              {lv === "basic" ? "Basic" : lv === "advanced" ? "Advanced" : "Pro"}
            </button>
          ))}
        </div>
      </div>

      {/* Charts */}
      {ent.multiChart && (
        <div className="pl-section">
          <div className="mb-2 flex items-center justify-between">
            <span className="pl-eye">Charts</span>
            <InfoDot id="x-axis" />
          </div>
          <div className="flex items-center gap-1.5">
            {state.charts.map((c, i) => (
              <button
                key={c.id}
                type="button"
                aria-label={`Select chart ${i + 1}`}
                className={`pl-num flex h-7 w-9 items-center justify-center border text-xs ${i === state.activeChart ? "border-accent text-accent" : "border-border text-muted-foreground"}`}
                onClick={() => dispatch({ type: "set-active", index: i })}
              >
                {i + 1}
              </button>
            ))}
            {state.charts.length < 4 && (
              <button
                type="button"
                aria-label="Add chart"
                className="flex h-7 w-9 items-center justify-center border border-dashed border-border text-muted-foreground hover:border-accent hover:text-accent"
                onClick={() => dispatch({ type: "add-chart" })}
              >
                <Plus size={13} />
              </button>
            )}
            {state.charts.length > 1 && (
              <button
                type="button"
                className="ml-auto text-xs text-muted-foreground underline underline-offset-2 hover:text-accent"
                onClick={() => dispatch({ type: "remove-chart", index: state.activeChart })}
              >
                remove
              </button>
            )}
          </div>
          <div className="mt-2.5 flex items-center gap-3 text-xs text-foreground">
            <label className="flex cursor-pointer items-center gap-1.5">
              <input
                type="checkbox"
                checked={state.focused}
                onChange={(e) => dispatch({ type: "focus", focused: e.target.checked })}
              />
              Focus single chart
            </label>
            <label className="flex cursor-pointer items-center gap-1.5">
              <input
                type="checkbox"
                checked={state.syncCrosshair}
                onChange={(e) => dispatch({ type: "sync-crosshair", value: e.target.checked })}
              />
              Sync crosshair
            </label>
            <InfoDot id="crosshair" />
          </div>
        </div>
      )}

      {/* Add asset */}
      <div className="pl-section" data-tour="add-asset">
        <button
          type="button"
          className="flex w-full items-center justify-between"
          aria-expanded={addOpen}
          onClick={() => setAddOpen((v) => !v)}
        >
          <span className="pl-eye text-accent">＋ Add asset</span>
          <span className="pl-eye">{chart.legs.length}/5 legs</span>
        </button>
        {addOpen && (
          <div className="mt-3">
            <div className="mb-1 flex items-center justify-between text-xs text-foreground">
              Instrument type <InfoDot id={pendingSpec?.info ?? "inst-euro"} />
            </div>
            <select
              className="mb-3 w-full border border-accent bg-background px-2 py-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
              value={pendingInstrument}
              aria-label="Instrument type"
              onChange={(e) => {
                setPendingInstrument(e.target.value);
                setPendingParams({});
              }}
            >
              {categories.map(([cat, list]) => (
                <optgroup key={cat} label={cat}>
                  {list.map((i) => (
                    <option key={i.id} value={i.id}>{i.label}</option>
                  ))}
                </optgroup>
              ))}
            </select>
            <div className="mb-1 text-xs text-foreground">Position</div>
            <div className="pl-seg mb-3" role="group" aria-label="Position">
              <button type="button" data-active={pendingSide === 1} onClick={() => setPendingSide(1)}>Long</button>
              <button type="button" data-active={pendingSide === -1} onClick={() => setPendingSide(-1)}>Short</button>
            </div>
            {pendingSpec && pendingSpec.params.length > 0 && (
              <>
                <div className="pl-eye mb-2 border-t border-separator pt-3">Parameters for this instrument</div>
                <ParamFields
                  spec={pendingSpec}
                  params={{ ...Object.fromEntries(pendingSpec.params.map((p) => [p.key, p.default])), ...pendingParams }}
                  onChange={(k, v) => setPendingParams((p) => ({ ...p, [k]: v }))}
                />
              </>
            )}
            {pendingSpec && (
              <div className="mt-3 border-l-2 border-accent bg-secondary px-3 py-2 text-xs leading-snug text-muted-foreground">
                {pendingSpec.note}{" "}
                <button type="button" className="text-accent underline underline-offset-2" onClick={() => openLearn(pendingSpec.info)}>
                  Learn more
                </button>
              </div>
            )}
            <button
              type="button"
              className="mt-3 w-full bg-accent py-2.5 font-serif text-sm text-accent-foreground disabled:opacity-40"
              disabled={chart.legs.length >= 5}
              onClick={addLeg}
            >
              {chart.legs.length >= 5 ? "Portfolio limit reached (5 legs)" : "Add to portfolio"}
            </button>
          </div>
        )}
        {/* strategy presets */}
        <div className="mt-3">
          <div className="mb-1 flex items-center justify-between text-xs text-foreground">
            Strategy template <InfoDot id="concept-bull-call-spread" />
          </div>
          <select
            className="w-full border border-border bg-background px-2 py-1.5 text-xs text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
            value=""
            aria-label="Load a strategy template"
            onChange={(e) => {
              if (e.target.value) loadPreset(e.target.value);
              e.target.value = "";
            }}
          >
            <option value="">Load a classic strategy…</option>
            {STRATEGY_PRESETS.map((p) => (
              <option key={p.id} value={p.id}>{p.label}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Legs */}
      <div className="pl-section" data-tour="legs">
        <div className="mb-2 flex items-center justify-between">
          <span className="pl-eye">Portfolio legs · Chart {state.activeChart + 1}</span>
          <InfoDot id="payoff-vs-value" />
        </div>
        {chart.legs.length === 0 ? (
          <div className="border border-dashed border-border px-3 py-4 text-center text-xs leading-relaxed text-muted-foreground">
            No legs yet.<br />Add an asset or load a concept.
          </div>
        ) : (
          <div className="flex flex-col gap-1">
            {chart.legs.map((leg) => {
              const spec = INSTRUMENTS_BY_ID[leg.instrument];
              const editing = editingLeg === leg.id;
              return (
                <div key={leg.id} className="border-b border-separator/60 pb-1 last:border-b-0">
                  <div className="flex items-center gap-2 text-xs text-foreground">
                    <button
                      type="button"
                      className="flex min-w-0 flex-1 items-center gap-2 text-left"
                      onClick={() => setEditingLeg(editing ? null : leg.id)}
                      aria-expanded={editing}
                    >
                      <span className={`inline-block h-1.5 w-1.5 flex-none ${leg.side === 1 ? "bg-accent" : "border border-accent"}`} aria-hidden="true" />
                      <span className="truncate">{legLabel(leg)}</span>
                      {leg.hedge && <span className="pl-eye flex-none text-accent">hedge</span>}
                    </button>
                    {spec && <InfoDot id={spec.info} />}
                    <button
                      type="button"
                      aria-label={`Remove leg: ${legLabel(leg)}`}
                      className="text-muted-foreground hover:text-destructive"
                      onClick={() =>
                        dispatch({ type: "set-legs", index: state.activeChart, legs: chart.legs.filter((l) => l.id !== leg.id) })
                      }
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                  {editing && spec && (
                    <div className="mt-2 border border-border p-2.5">
                      <div className="mb-2 flex items-center gap-2">
                        <div className="pl-seg pl-seg--soft flex-1" role="group" aria-label="Position">
                          <button
                            type="button"
                            data-active={leg.side === 1}
                            onClick={() =>
                              dispatch({ type: "set-legs", index: state.activeChart, legs: chart.legs.map((l) => (l.id === leg.id ? { ...l, side: 1 } : l)) })
                            }
                          >
                            Long
                          </button>
                          <button
                            type="button"
                            data-active={leg.side === -1}
                            onClick={() =>
                              dispatch({ type: "set-legs", index: state.activeChart, legs: chart.legs.map((l) => (l.id === leg.id ? { ...l, side: -1 } : l)) })
                            }
                          >
                            Short
                          </button>
                        </div>
                        <span className="text-xs text-muted-foreground">Qty</span>
                        <span className="w-16">
                          <NumberField
                            value={leg.qty}
                            min={0.01}
                            step={1}
                            ariaLabel="Quantity"
                            onChange={(v) =>
                              dispatch({ type: "set-legs", index: state.activeChart, legs: chart.legs.map((l) => (l.id === leg.id ? { ...l, qty: v } : l)) })
                            }
                          />
                        </span>
                      </div>
                      <ParamFields
                        spec={spec}
                        params={leg.params}
                        onChange={(k, v) =>
                          dispatch({
                            type: "set-legs",
                            index: state.activeChart,
                            legs: chart.legs.map((l) => (l.id === leg.id ? { ...l, params: { ...l.params, [k]: v } } : l)),
                          })
                        }
                      />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Chart controls */}
      <div className="pl-section" data-tour="controls">
        <div className="mb-2 flex items-center justify-between">
          <span className="pl-eye">Chart controls</span>
          <InfoDot id="x-axis" />
        </div>
        <div className="mb-1 text-xs text-foreground">Independent variable (x-axis)</div>
        <div className="pl-seg pl-seg--soft mb-3" role="group" aria-label="X axis">
          {(["S", "t", "r"] as const).map((x) => {
            const supported = chart.legs.length === 0 || chart.legs.some((l) => INSTRUMENTS_BY_ID[l.instrument]?.axes.includes(x));
            return (
              <button
                key={x}
                type="button"
                data-active={chart.xVar === x}
                disabled={!supported}
                title={supported ? undefined : "No leg in this portfolio varies with this axis"}
                style={supported ? undefined : { opacity: 0.4, cursor: "not-allowed" }}
                onClick={() => update({ xVar: x })}
              >
                {x === "S" ? "Price S" : x === "t" ? "Time" : "Rate"}
              </button>
            );
          })}
        </div>
        <div className="mb-1 flex items-center justify-between text-xs text-foreground">
          Overlays <InfoDot id="greek-delta" />
        </div>
        <div className="flex flex-wrap gap-1.5" data-tour="overlays">
          <button
            type="button"
            className="pl-chip"
            style={{ "--pl-chip-color": "var(--pl-payoff)" } as React.CSSProperties}
            data-active={chart.showPayoff}
            onClick={() => update({ showPayoff: !chart.showPayoff })}
          >
            Payoff
          </button>
          <button
            type="button"
            className="pl-chip"
            style={{ "--pl-chip-color": "var(--pl-value)" } as React.CSSProperties}
            data-active={chart.showValue}
            onClick={() => update({ showValue: !chart.showValue })}
          >
            Value
          </button>
          {greekChoices.map((g) => (
            <button
              key={g}
              type="button"
              className="pl-chip"
              style={{ "--pl-chip-color": `var(--pl-${g === "vanna" || g === "vomma" ? "vega" : g === "charm" ? "delta" : g === "speed" || g === "colour" ? "gamma" : g})` } as React.CSSProperties}
              data-active={chart.greeks.includes(g)}
              onClick={() => toggleGreek(g)}
              title={`${GREEK_META[g].label} (${GREEK_META[g].symbol})`}
            >
              {GREEK_META[g].label}
            </button>
          ))}
        </div>
        <div className="mt-1 text-[11px] text-muted-foreground">Up to three Greek overlays; the first drives sign shading.</div>
        <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-foreground">
          <label className="flex cursor-pointer items-center gap-1.5">
            <input type="checkbox" checked={chart.labels} onChange={(e) => update({ labels: e.target.checked })} /> Labels
          </label>
          <label className="flex cursor-pointer items-center gap-1.5">
            <input type="checkbox" checked={chart.markers} onChange={(e) => update({ markers: e.target.checked })} /> Markers
          </label>
          <label className="flex cursor-pointer items-center gap-1.5">
            <input type="checkbox" checked={chart.netPremium} onChange={(e) => update({ netPremium: e.target.checked })} /> Net premium
            <InfoDot id="net-premium" />
          </label>
          {level === "pro" && ent.proGreeks && (
            <label className="flex cursor-pointer items-center gap-1.5">
              <input type="checkbox" checked={chart.signShading} onChange={(e) => update({ signShading: e.target.checked })} /> Sign shading
              <InfoDot id="sign-shading" />
            </label>
          )}
        </div>
        {/* line styles */}
        {visibleLines.length > 0 && (
          <div className="mt-3">
            <button type="button" className="pl-eye flex items-center gap-1 text-accent" aria-expanded={stylesOpen} onClick={() => setStylesOpen((v) => !v)}>
              {stylesOpen ? <ChevronDown size={11} /> : <ChevronRight size={11} />} Line styles
            </button>
            {stylesOpen && (
              <div className="mt-2 flex flex-col gap-1.5">
                {visibleLines.map((ln) => {
                  const st = chart.styles[ln.id] ?? undefined;
                  const cur = st ?? { color: ln.id, dash: undefined, width: undefined };
                  return (
                    <div key={ln.id} className="flex items-center gap-2 text-xs text-foreground">
                      <LegendSwatch styleId={st?.color ?? ln.id} dash={st?.dash ?? "solid"} />
                      <span className="w-14 truncate">{ln.label}</span>
                      <select
                        className="flex-1 border border-border bg-background px-1 py-0.5 text-xs"
                        aria-label={`${ln.label} colour`}
                        value={st?.color ?? ln.id}
                        onChange={(e) =>
                          update({ styles: { ...chart.styles, [ln.id]: { color: e.target.value, dash: st?.dash ?? "solid", width: st?.width ?? 2 } } })
                        }
                      >
                        <option value={ln.id}>Default</option>
                        {["navy", "violet", "blue", "amber", "green", "pink", "sky", "vermillion"].map((c) => (
                          <option key={c} value={c}>{c[0].toUpperCase() + c.slice(1)}</option>
                        ))}
                      </select>
                      <select
                        className="flex-1 border border-border bg-background px-1 py-0.5 text-xs"
                        aria-label={`${ln.label} pattern`}
                        value={st?.dash ?? "solid"}
                        onChange={(e) =>
                          update({ styles: { ...chart.styles, [ln.id]: { color: st?.color ?? ln.id, dash: e.target.value as "solid", width: st?.width ?? 2 } } })
                        }
                      >
                        {["solid", "dashed", "dashdot", "dotted"].map((d) => (
                          <option key={d} value={d}>{d}</option>
                        ))}
                      </select>
                      <select
                        className="w-14 border border-border bg-background px-1 py-0.5 text-xs"
                        aria-label={`${ln.label} width`}
                        value={st?.width ?? 2}
                        onChange={(e) =>
                          update({ styles: { ...chart.styles, [ln.id]: { color: st?.color ?? ln.id, dash: st?.dash ?? "solid", width: Number(e.target.value) as 1 } } })
                        }
                      >
                        <option value={1}>Thin</option>
                        <option value={2}>Med</option>
                        <option value={3}>Thick</option>
                      </select>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Fixed parameters */}
      <div className="pl-section" data-tour="fixed-params">
        <div className="mb-2 flex items-center justify-between">
          <span className="pl-eye">Fixed parameters</span>
          <InfoDot id="x-axis" />
        </div>
        <div className="flex flex-col gap-2">
          {(
            [
              { key: "S" as const, label: "Spot S", info: "spot", percent: false, hidden: chart.xVar === "S" },
              { key: "r" as const, label: "Rate r", info: "rate", percent: true, hidden: chart.xVar === "r" },
              { key: "sigma" as const, label: "Vol σ", info: "volatility", percent: true, hidden: false },
              { key: "q" as const, label: "Yield q", info: "dividend-yield", percent: true, hidden: false },
            ]
          ).map((p) =>
            p.hidden ? null : (
              <div key={p.key} className="flex items-center gap-2 text-xs">
                <span className="flex w-16 flex-none items-center gap-1 text-muted-foreground">
                  {p.label} <InfoDot id={p.info} />
                </span>
                <NumberField
                  value={chart.market[p.key]}
                  percent={p.percent}
                  min={p.key === "S" ? 0.0001 : p.key === "sigma" ? 0.001 : -0.2}
                  step={p.key === "S" ? 1 : 0.005}
                  ariaLabel={p.label}
                  onChange={(v) => update({ market: { ...chart.market, [p.key]: v } })}
                />
                <button
                  type="button"
                  className="text-[11px] uppercase tracking-wider text-accent hover:underline"
                  title={`Animate ${p.label} and watch the curves move`}
                  onClick={() => sweepParam(p.key)}
                >
                  sweep
                </button>
              </div>
            ),
          )}
        </div>
      </div>

      {/* Advanced: models */}
      {LEVEL_ORDER[level] >= 1 && ent.modelSelection && (
        <Expander
          title="Models & assumptions"
          badge="Advanced"
          info="model-bs"
          open={advancedOpen}
          onToggle={() => setAdvancedOpen((v) => !v)}
        >
          <ModelsPanel chart={chart} onChange={update} />
        </Expander>
      )}

      {/* Hedging */}
      {level === "pro" && ent.hedging && (
        <Expander title="Hedging" badge="Pro" info="hedging-intro" open={hedgingOpen} onToggle={() => setHedgingOpen((v) => !v)} tourId="hedging">
          <HedgingPanel chart={chart} chartIndex={state.activeChart} activeGrid={activeGrid} />
        </Expander>
      )}

      {/* Export */}
      {ent.exports && (
        <div className="pl-section" data-tour="export">
          <ExportPanel activeGrid={activeGrid} exportRef={exportRef} />
        </div>
      )}

      <div className="px-4 py-3 text-xs leading-relaxed text-muted-foreground">
        {level === "basic" && <>The Advanced level adds exotic instruments and model selection; <b className="text-accent">Pro</b> adds second-order Greeks, sign shading and hedging. </>}
        {level === "advanced" && <>Switch to <b className="text-accent">Pro</b> for second-order Greeks, sign shading and the hedging panel. </>}
        <button type="button" className="text-accent underline underline-offset-2" onClick={onStartTour}>
          Replay the tour
        </button>
      </div>
    </div>
  );
}
