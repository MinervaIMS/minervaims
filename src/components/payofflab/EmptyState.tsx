// PayoffLab welcome screen: a calm hero with two clear actions and the
// Concepts library grouped by category. Doubles as the "Lab home" view the
// top bar can always return to; if a workbench already exists the user can
// jump straight back to it.

import { useMemo } from "react";
import { CONCEPT_CATEGORIES, CONCEPTS } from "@/lib/payofflab/concepts";
import { useLab } from "./context";

export function EmptyState({ onAddAsset, onStartTour }: { onAddAsset: () => void; onStartTour: () => void }) {
  const { state, dispatch, openLearn, setView } = useLab();
  const hasWork = state.charts.some((c) => c.legs.length > 0);

  const grouped = useMemo(
    () => CONCEPT_CATEGORIES.map((cat) => ({ cat, items: CONCEPTS.filter((c) => c.category === cat) }))
      .filter((g) => g.items.length > 0),
    [],
  );

  return (
    <div className="relative flex min-h-0 flex-1 flex-col overflow-y-auto">
      <div className="relative border-b border-separator px-16 pb-10 pt-12 text-center">
        <div className="pl-eye mb-4">Derivatives payoff &amp; pricing laboratory</div>
        <h2 className="mx-auto mb-4 max-w-2xl font-serif text-4xl leading-[1.12] tracking-tight text-foreground">
          Build a portfolio of derivatives and see the payoff, the price and the Greeks, all at once.
        </h2>
        <p className="mx-auto mb-7 max-w-xl text-[15px] leading-relaxed text-muted-foreground">
          Start from a blank chart, or open a guided example below: each one loads a ready-made chart together with a
          short written walkthrough that explains what you are looking at.
        </p>
        <div className="inline-flex gap-3">
          <button
            type="button"
            className="bg-accent px-9 py-3 font-serif text-[15px] text-accent-foreground transition-colors hover:bg-accent/90"
            onClick={onAddAsset}
          >
            Add your first asset
          </button>
          <button
            type="button"
            className="border border-accent px-9 py-3 font-serif text-[15px] text-accent transition-colors hover:bg-accent hover:text-accent-foreground"
            onClick={onStartTour}
          >
            Take the tour
          </button>
          {hasWork && (
            <button
              type="button"
              className="border border-border px-9 py-3 font-serif text-[15px] text-foreground transition-colors hover:border-accent hover:text-accent"
              onClick={() => setView("bench")}
            >
              Resume workbench →
            </button>
          )}
        </div>
      </div>

      <div className="relative px-12 pb-14 pt-8 2xl:px-16">
        <div className="mb-2 flex items-baseline justify-between">
          <span className="font-serif text-[26px] tracking-tight text-accent">Concepts library</span>
          <span className="pl-eye">One click loads a chart and a Learn walkthrough</span>
        </div>
        {grouped.map(({ cat, items }) => (
          <section key={cat} className="mt-7">
            <div className="mb-3.5 flex items-baseline gap-3 border-b border-separator pb-2">
              <span className="font-serif text-lg tracking-tight text-foreground">{cat}</span>
              <span className="pl-eye">{items.length} example{items.length > 1 ? "s" : ""}</span>
            </div>
            <div className="grid grid-cols-3 gap-4 2xl:grid-cols-4">
              {items.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  className="group border border-border bg-background p-4 text-left transition-colors hover:border-accent focus-visible:outline focus-visible:outline-2 focus-visible:outline-ring"
                  onClick={() => {
                    dispatch({ type: "replace-charts", charts: c.build() });
                    if (c.tier !== "basic") dispatch({ type: "level", level: c.tier });
                    setView("bench");
                    openLearn(c.learnId);
                  }}
                >
                  <div className="mb-2.5 flex items-center justify-between">
                    <span className="pl-eye text-accent">{c.category}</span>
                    <span className="pl-eye opacity-0 transition-opacity group-hover:opacity-100">Load →</span>
                  </div>
                  <svg viewBox="0 0 200 64" className="mb-2.5 h-[52px] w-full" aria-hidden="true">
                    <line x1="0" y1="46" x2="200" y2="46" stroke="hsl(var(--separator))" strokeWidth="1" />
                    <path d={c.spark.d} fill="none" stroke={`var(${c.spark.colorVar})`} strokeWidth="2" />
                    {c.spark.d2 && (
                      <path d={c.spark.d2} fill="none" stroke="var(--pl-vega)" strokeWidth="2" strokeDasharray="4 3" />
                    )}
                  </svg>
                  <div className="text-[14.5px] font-semibold leading-snug text-foreground">{c.label}</div>
                  <div className="mt-0.5 text-xs leading-snug text-muted-foreground">{c.blurb}</div>
                </button>
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
