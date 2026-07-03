// PayoffLab — clean first-run state: one primary action, the tour, and the
// Concepts library of one-click guided examples (mock A1).

import { CONCEPTS } from "@/lib/payofflab/concepts";
import { useLab } from "./context";

export function EmptyState({ onAddAsset, onStartTour }: { onAddAsset: () => void; onStartTour: () => void }) {
  const { dispatch, openLearn, watermark } = useLab();

  return (
    <div className="relative flex min-h-0 flex-1 flex-col overflow-y-auto">
      {watermark && (
        <img
          src={watermark.src}
          alt=""
          aria-hidden="true"
          className="pointer-events-none absolute left-1/2 top-[34%] w-[340px] -translate-x-1/2 -translate-y-1/2 opacity-[0.055]"
        />
      )}
      <div className="relative px-16 pb-8 pt-14 text-center">
        <div className="pl-eye mb-3.5">Derivatives payoff &amp; pricing laboratory</div>
        <h2 className="mx-auto mb-3.5 max-w-2xl font-serif text-4xl leading-[1.12] tracking-tight text-foreground">
          Build a portfolio of derivatives and see the payoff, the price and the Greeks — at once.
        </h2>
        <p className="mx-auto mb-6 max-w-lg text-[15px] leading-relaxed text-muted-foreground">
          Start from a blank chart, or open a guided example and read it line by line.
        </p>
        <div className="inline-flex gap-3">
          <button type="button" className="bg-accent px-8 py-3 font-serif text-[15px] text-accent-foreground" onClick={onAddAsset}>
            Add your first asset
          </button>
          <button type="button" className="border border-accent px-8 py-3 font-serif text-[15px] text-accent" onClick={onStartTour}>
            Take the tour
          </button>
        </div>
      </div>
      <div className="relative px-10 pb-10 pt-2">
        <div className="mb-5 flex items-baseline justify-between border-b border-separator pb-2.5">
          <span className="font-serif text-[22px] tracking-tight text-accent">Concepts library</span>
          <span className="pl-eye">One click loads a chart + a Learn walkthrough</span>
        </div>
        <div className="grid grid-cols-2 gap-4 2xl:grid-cols-4">
          {CONCEPTS.map((c) => (
            <button
              key={c.id}
              type="button"
              className="border border-border bg-background p-4 text-left transition-colors hover:border-accent"
              onClick={() => {
                dispatch({ type: "replace-charts", charts: c.build() });
                if (c.tier !== "basic") dispatch({ type: "level", level: c.tier });
                openLearn(c.learnId);
              }}
            >
              <div className="pl-eye mb-2.5 text-accent">{c.category}</div>
              <svg viewBox="0 0 200 64" className="mb-2.5 h-[52px] w-full" aria-hidden="true">
                <line x1="0" y1="46" x2="200" y2="46" stroke="hsl(var(--separator))" strokeWidth="1" />
                <path d={c.spark.d} fill="none" stroke={`var(${c.spark.colorVar})`} strokeWidth="2" />
                {c.spark.d2 && (
                  <path d={c.spark.d2} fill="none" stroke="var(--pl-vega)" strokeWidth="2" strokeDasharray="4 3" />
                )}
              </svg>
              <div className="text-sm font-semibold text-foreground">{c.label}</div>
              <div className="text-[11px] text-muted-foreground">{c.blurb}</div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
