// PayoffLab guided tour (§10). Dismissible and replayable. Each step
// anchors to a region of the tool via its data-tour attribute; the
// highlight follows the element live (scroll and resize included), and
// steps that describe Advanced or Pro features switch the level first so
// the user is always looking at the thing being described.

import { useCallback, useEffect, useState } from "react";
import type { Level } from "@/lib/payofflab/types";
import { useLab } from "./context";

export const TOUR_KEY = "__mims_payofflab_tour__";

interface TourStep {
  anchor: string | null;
  /** Level this step needs so its subject is visible. */
  level?: Level;
  title: string;
  body: string;
}

const STEPS: TourStep[] = [
  {
    anchor: "add-asset",
    title: "1 · Add an asset",
    body: "Open the Add asset panel, pick an instrument and press Add to portfolio. Every field is pre-filled with sensible textbook values, so a chart appears immediately. The dropdown below it loads a classic multi-leg strategy in one click.",
  },
  {
    anchor: "controls",
    title: "2 · Choose what runs along the x-axis",
    body: "Each chart sweeps exactly one variable and holds everything else fixed. Price S gives the classic payoff diagram. Time shows the position decaying towards expiry. Rate is the natural axis for swaps, caps and other rate products.",
  },
  {
    anchor: null,
    title: "3 · Read the crosshair",
    body: "Hover over a chart and a vertical guide intersects every visible line; the legend underneath shows the exact value of each one. The arrow keys nudge the crosshair in fine steps, and Shift with an arrow key jumps straight to the next strike or break-even.",
  },
  {
    anchor: "overlays",
    title: "4 · Overlay the Greeks",
    body: "Add up to three Greek overlays on their own right-hand axis. Every Greek keeps the same colour everywhere in the tool, so you build recognition: delta is always blue, gamma always amber, and so on.",
  },
  {
    anchor: "level",
    level: "advanced",
    title: "5 · Advanced level: instruments and models",
    body: "The level switch controls how much of the tool is exposed; it never changes the mathematics. Advanced unlocks the exotic instruments and the model selectors: Bachelier, jump-diffusion, lattices, Heston, SABR and more, each with a full assumptions panel behind its information mark.",
  },
  {
    anchor: "hedging",
    level: "pro",
    title: "6 · Pro level: hedge the book",
    body: "Pro adds the second-order Greeks, sign shading and this Hedging panel. One click neutralises delta by adding a real, labelled stock leg you can undo. The simulation inside then shows why re-hedging in discrete steps still leaves residual risk.",
  },
  {
    anchor: "export",
    title: "7 · Take it with you",
    body: "Export the active chart as a watermarked PNG or a CSV of the plotted series, or copy a share link that rebuilds this exact dashboard for anyone who opens it. The link encodes your inputs and nothing else.",
  },
];

export function Tour({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { dispatch } = useLab();
  const [step, setStep] = useState(0);
  const [rect, setRect] = useState<DOMRect | null>(null);

  useEffect(() => {
    if (open) setStep(0);
  }, [open]);

  const measure = useCallback(() => {
    const anchor = STEPS[step].anchor;
    if (!anchor) {
      setRect(null);
      return;
    }
    const el = document.querySelector(`[data-tour="${anchor}"]`);
    setRect(el ? el.getBoundingClientRect() : null);
  }, [step]);

  // Switch level when a step needs it, scroll the anchor into view (retrying
  // until the level-gated section has actually mounted), then keep the
  // highlight glued to the element through scrolling and resizing.
  useEffect(() => {
    if (!open) return;
    const lvl = STEPS[step].level;
    if (lvl) dispatch({ type: "level", level: lvl });
    const anchor = STEPS[step].anchor;
    let scrolled = false;
    const tick = () => {
      if (!anchor) {
        setRect(null);
        return;
      }
      const el = document.querySelector(`[data-tour="${anchor}"]`);
      if (el && !scrolled) {
        el.scrollIntoView({ block: "center", behavior: "instant" as ScrollBehavior });
        scrolled = true;
      }
      measure();
    };
    const raf = requestAnimationFrame(tick);
    window.addEventListener("scroll", measure, true);
    window.addEventListener("resize", measure);
    const interval = setInterval(tick, 300); // layout shifts, lazy sections
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("scroll", measure, true);
      window.removeEventListener("resize", measure);
      clearInterval(interval);
    };
  }, [open, step, measure, dispatch]);

  if (!open) return null;
  const s = STEPS[step];

  const finish = () => {
    localStorage.setItem(TOUR_KEY, "1");
    onClose();
  };

  // Card placement: to the right of the highlight when it fits, otherwise
  // to the left; centred when there is no highlight.
  const cardStyle: React.CSSProperties = rect
    ? {
        left: rect.right + 420 < window.innerWidth ? rect.right + 16 : Math.max(16, rect.left - 400),
        top: Math.max(16, Math.min(rect.top, window.innerHeight - 240)),
      }
    : { left: "50%", top: "40%", transform: "translate(-50%, -50%)" };

  return (
    <div className="fixed inset-0 z-[90]" role="dialog" aria-modal="true" aria-label="Guided tour">
      <div className="absolute inset-0 bg-overlay/50" onClick={finish} />
      {rect && (
        <div
          className="pointer-events-none absolute border-2 border-accent transition-all duration-150"
          style={{ left: rect.left - 4, top: rect.top - 4, width: rect.width + 8, height: rect.height + 8 }}
        />
      )}
      <div className="absolute w-[380px] border border-accent bg-background p-5 shadow-elevated" style={cardStyle}>
        <div className="pl-eye mb-1 text-accent">Guided tour · {step + 1} / {STEPS.length}</div>
        <div className="mb-1.5 font-serif text-lg tracking-tight text-foreground">{s.title}</div>
        <p className="mb-4 text-[13px] leading-relaxed text-muted-foreground">{s.body}</p>
        <div className="flex items-center justify-between">
          <button type="button" className="text-xs text-muted-foreground underline underline-offset-2 hover:text-accent" onClick={finish}>
            Skip tour
          </button>
          <div className="flex gap-2">
            {step > 0 && (
              <button type="button" className="border border-accent px-4 py-1.5 text-xs text-accent" onClick={() => setStep(step - 1)}>
                Back
              </button>
            )}
            <button
              type="button"
              className="bg-accent px-4 py-1.5 text-xs text-accent-foreground"
              onClick={() => (step === STEPS.length - 1 ? finish() : setStep(step + 1))}
            >
              {step === STEPS.length - 1 ? "Finish" : "Next"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
