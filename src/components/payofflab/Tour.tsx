// PayoffLab — first-run guided tour (§10): dismissible, replayable, and
// light-weight. Each step highlights one region of the tool via its
// data-tour anchor; anchors that are not currently on screen are described
// rather than highlighted.

import { useEffect, useState } from "react";

export const TOUR_KEY = "__mims_payofflab_tour__";

interface TourStep {
  anchor: string | null;
  title: string;
  body: string;
}

const STEPS: TourStep[] = [
  { anchor: "add-asset", title: "1 · Add an asset", body: "Open “＋ Add asset”, pick an instrument (every field is pre-filled with textbook defaults) and add it to the portfolio — or load a classic strategy template in one click." },
  { anchor: "controls", title: "2 · Choose the x-axis", body: "Each chart sweeps one variable: the underlying price S (the classic payoff diagram), calendar time t (the decay view), or the interest rate r (for rate products)." },
  { anchor: null, title: "3 · Read the crosshair", body: "Hover over a chart: a vertical guide intersects every visible line and the legend shows exact values. Arrow keys nudge finely; Shift+arrows snap to strikes and break-evens." },
  { anchor: "overlays", title: "4 · Overlay a Greek", body: "Toggle up to three aggregate Greek overlays — delta, gamma and friends keep the same colour everywhere in the tool. In Pro, the first overlay drives sign-region shading." },
  { anchor: "level", title: "5 · Go deeper", body: "Switch to Advanced for exotics and model selection (Bachelier, jump-diffusion, Heston, SABR…), each with a full assumptions panel behind its ⓘ." },
  { anchor: null, title: "6 · Hedge it", body: "In Pro, the Hedging panel delta-neutralises the book in one click, then lets you run the discrete re-hedging simulation to see why hedging in steps leaves residual risk." },
  { anchor: "export", title: "7 · Take it with you", body: "Export any chart as a watermarked PNG or CSV, or copy a share link that rebuilds this exact dashboard — inputs only, nothing else." },
];

export function Tour({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [step, setStep] = useState(0);
  const [rect, setRect] = useState<DOMRect | null>(null);

  useEffect(() => {
    if (!open) return;
    setStep(0);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const anchor = STEPS[step].anchor;
    if (!anchor) {
      setRect(null);
      return;
    }
    const el = document.querySelector(`[data-tour="${anchor}"]`);
    if (el) {
      el.scrollIntoView({ block: "nearest" });
      setRect(el.getBoundingClientRect());
    } else {
      setRect(null);
    }
  }, [open, step]);

  if (!open) return null;
  const s = STEPS[step];

  const finish = () => {
    localStorage.setItem(TOUR_KEY, "1");
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[90]" role="dialog" aria-modal="true" aria-label="Guided tour">
      <div className="absolute inset-0 bg-overlay/50" onClick={finish} />
      {rect && (
        <div
          className="pointer-events-none absolute border-2 border-accent bg-transparent"
          style={{ left: rect.left - 4, top: rect.top - 4, width: rect.width + 8, height: rect.height + 8 }}
        />
      )}
      <div
        className="absolute w-[380px] border border-accent bg-background p-5 shadow-elevated"
        style={
          rect
            ? { left: Math.min(rect.right + 16, window.innerWidth - 400), top: Math.min(rect.top, window.innerHeight - 230) }
            : { left: "50%", top: "40%", transform: "translate(-50%, -50%)" }
        }
      >
        <div className="pl-eye mb-1 text-accent">Guided tour · {step + 1} / {STEPS.length}</div>
        <div className="mb-1.5 font-serif text-lg tracking-tight text-foreground">{s.title}</div>
        <p className="mb-4 text-[13px] leading-relaxed text-muted-foreground">{s.body}</p>
        <div className="flex items-center justify-between">
          <button type="button" className="text-xs text-muted-foreground underline underline-offset-2" onClick={finish}>
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
