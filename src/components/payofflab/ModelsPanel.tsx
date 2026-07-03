// PayoffLab — Advanced expander: pricing / volatility / rate model selectors
// (§7). Only models valid for the current portfolio are offered; the rest
// are greyed out with a one-line reason. Each selection shows a compact
// assumptions summary with an ⓘ to the full panel, and the vanilla family
// supports a comparison overlay (e.g. Bachelier vs Black–Scholes,
// binomial convergence).

import type { ChartState, ModelState, PricingModelId, RateModelState, VolModelState } from "@/lib/payofflab/types";
import { INSTRUMENTS_BY_ID } from "@/lib/payofflab/catalog";
import { useLab } from "./context";
import { InfoDot } from "./InfoDot";
import { NumberField } from "./Rail";

const PRICING_MODELS: Array<{ id: PricingModelId; label: string; info: string; needsVanilla: boolean }> = [
  { id: "auto", label: "Auto (per instrument)", info: "model-bs", needsVanilla: false },
  { id: "black-scholes", label: "Black–Scholes", info: "model-bs", needsVanilla: true },
  { id: "bachelier", label: "Bachelier (normal)", info: "model-bachelier", needsVanilla: true },
  { id: "merton-jump", label: "Merton jump-diffusion", info: "model-jump", needsVanilla: true },
  { id: "binomial-crr", label: "Binomial (CRR)", info: "model-binomial", needsVanilla: true },
  { id: "binomial-jr", label: "Binomial (Jarrow–Rudd)", info: "model-binomial", needsVanilla: true },
  { id: "trinomial", label: "Trinomial (Boyle)", info: "model-trinomial", needsVanilla: true },
];

const VOL_MODELS: Array<{ kind: VolModelState["kind"]; label: string; info: string }> = [
  { kind: "constant", label: "Constant σ", info: "vol-constant" },
  { kind: "term", label: "Term structure", info: "vol-term" },
  { kind: "garch", label: "GARCH(1,1) forecast", info: "vol-garch" },
  { kind: "sabr", label: "SABR (Hagan)", info: "vol-sabr" },
  { kind: "smile", label: "Implied smile input", info: "vol-smile" },
  { kind: "localvol", label: "Local vol (Dupire)", info: "vol-localvol" },
  { kind: "heston", label: "Heston (stochastic)", info: "vol-heston" },
];

const RATE_MODELS: Array<{ kind: RateModelState["kind"]; label: string; info: string }> = [
  { kind: "constant", label: "Constant r", info: "rate-constant" },
  { kind: "merton", label: "Merton (stochastic)", info: "rate-merton" },
  { kind: "vasicek", label: "Vasicek", info: "rate-vasicek" },
  { kind: "cir", label: "Cox–Ingersoll–Ross", info: "rate-cir" },
];

const ASSUMPTION_SUMMARY: Record<string, string> = {
  "black-scholes": "Lognormal S · constant σ, r · frictionless, continuous hedging",
  "bachelier": "Normal (arithmetic) S · prices may go negative · σ_N = σ·S₀",
  "merton-jump": "GBM + Poisson lognormal jumps · diversifiable jump risk",
  "binomial-crr": "Discrete recombining tree · converges to BS at O(1/n)",
  "binomial-jr": "Equal-probability tree · drift-centred steps",
  "trinomial": "Three-branch tree · smoother convergence",
  "auto": "Closed form where it exists; lattice for American exercise",
  "constant": "One σ for all strikes and maturities",
  "term": "σ varies by maturity (total-variance interpolation)",
  "garch": "Variance forecast decays to the long-run level (Hull ch. 23)",
  "sabr": "Stochastic vol on the forward · Hagan implied-vol expansion",
  "smile": "Sticky-strike smile σ(k) = σ + s·k + c·k²",
  "localvol": "One diffusion σ(S,t) fitted to the smile (Dupire) · Monte Carlo",
  "heston": "Mean-reverting stochastic variance · Monte Carlo",
  "rate-constant": "Flat discount curve e^{−rT}",
  "rate-merton": "Gaussian short rate, linear drift",
  "rate-vasicek": "Mean-reverting Gaussian short rate",
  "rate-cir": "Mean-reverting square-root rate (non-negative)",
};

export function ModelsPanel({ chart, onChange }: { chart: ChartState; onChange: (patch: Partial<ChartState>) => void }) {
  const { openLearn } = useLab();
  const model = chart.model;
  const hasVanilla = chart.legs.some((l) => INSTRUMENTS_BY_ID[l.instrument]?.pricingSelectable);
  const hasRateLeg = chart.legs.some((l) => {
    const c = INSTRUMENTS_BY_ID[l.instrument]?.category;
    return c === "Rates & volatility";
  });
  const setModel = (patch: Partial<ModelState>) => onChange({ model: { ...model, ...patch } });
  const isTree = model.pricing.startsWith("binomial") || model.pricing === "trinomial";
  const isMcVol = model.vol.kind === "heston" || model.vol.kind === "localvol";
  const hasMcLeg = chart.legs.some((l) => INSTRUMENTS_BY_ID[l.instrument]?.usesMc);

  return (
    <div className="flex flex-col gap-3 text-[11px]">
      {/* pricing */}
      <div>
        <div className="mb-1 flex items-center justify-between text-foreground">
          Pricing formula
          <InfoDot id={PRICING_MODELS.find((m) => m.id === model.pricing)?.info ?? "model-bs"} />
        </div>
        <select
          className="w-full border border-border bg-background px-2 py-1.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
          value={model.pricing}
          aria-label="Pricing formula"
          onChange={(e) => setModel({ pricing: e.target.value as PricingModelId })}
        >
          {PRICING_MODELS.map((m) => (
            <option key={m.id} value={m.id} disabled={m.needsVanilla && !hasVanilla && chart.legs.length > 0}>
              {m.label}
              {m.needsVanilla && !hasVanilla && chart.legs.length > 0 ? " — needs a vanilla leg" : ""}
            </option>
          ))}
        </select>
        <div className="mt-1 text-[10px] leading-snug text-muted-foreground">
          {ASSUMPTION_SUMMARY[model.pricing]}
          {!hasVanilla && chart.legs.length > 0 && model.pricing === "auto" && (
            <> · exotics keep their own closed forms; the selector applies to European/American legs.</>
          )}
        </div>
        {model.pricing === "merton-jump" && (
          <div className="mt-2 flex gap-2">
            <Labelled label="λ /yr"><NumberField value={model.jump.lambda} min={0} max={20} step={0.1} ariaLabel="Jump intensity" onChange={(v) => setModel({ jump: { ...model.jump, lambda: v } })} /></Labelled>
            <Labelled label="μ_J"><NumberField value={model.jump.muJ} min={-2} max={2} step={0.05} ariaLabel="Mean log jump" onChange={(v) => setModel({ jump: { ...model.jump, muJ: v } })} /></Labelled>
            <Labelled label="δ_J"><NumberField value={model.jump.deltaJ} min={0} max={2} step={0.05} ariaLabel="Jump volatility" onChange={(v) => setModel({ jump: { ...model.jump, deltaJ: v } })} /></Labelled>
          </div>
        )}
        {(isTree || chart.legs.some((l) => l.instrument === "amer-option")) && (
          <div className="mt-2 flex items-center gap-2">
            <Labelled label="Tree steps"><NumberField value={model.treeSteps} min={10} max={1000} step={50} ariaLabel="Tree steps" onChange={(v) => setModel({ treeSteps: Math.round(v) })} /></Labelled>
            <InfoDot id="tree-steps" />
          </div>
        )}
        {hasVanilla && (
          <label className="mt-2 flex cursor-pointer items-center gap-1.5 text-foreground">
            <input
              type="checkbox"
              checked={chart.compareModel !== null}
              onChange={(e) =>
                onChange({
                  compareModel: e.target.checked
                    ? { ...model, pricing: model.pricing === "bachelier" ? "black-scholes" : "bachelier" }
                    : null,
                })
              }
            />
            Comparison overlay
            <InfoDot id="concept-bachelier" />
          </label>
        )}
        {chart.compareModel && (
          <select
            className="mt-1.5 w-full border border-border bg-background px-2 py-1.5 text-xs text-foreground"
            value={chart.compareModel.pricing}
            aria-label="Comparison model"
            onChange={(e) => onChange({ compareModel: { ...model, pricing: e.target.value as PricingModelId } })}
          >
            {PRICING_MODELS.filter((m) => m.id !== "auto").map((m) => (
              <option key={m.id} value={m.id}>vs {m.label}</option>
            ))}
          </select>
        )}
      </div>

      {/* volatility */}
      <div className="border-t border-separator pt-3">
        <div className="mb-1 flex items-center justify-between text-foreground">
          Volatility model
          <InfoDot id={VOL_MODELS.find((m) => m.kind === model.vol.kind)?.info ?? "vol-constant"} />
        </div>
        <select
          className="w-full border border-border bg-background px-2 py-1.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
          value={model.vol.kind}
          aria-label="Volatility model"
          onChange={(e) => {
            const kind = e.target.value as VolModelState["kind"];
            const vol: VolModelState =
              kind === "term" ? { kind, points: [{ t: 0.25, sigma: 0.24 }, { t: 0.5, sigma: 0.22 }, { t: 1, sigma: 0.2 }, { t: 2, sigma: 0.19 }] }
                : kind === "garch" ? { kind, sigmaLong: 0.2, persistence: 0.97 }
                : kind === "sabr" ? { kind, alpha: chart.market.sigma, beta: 1, rhoSabr: -0.3, nu: 0.5 }
                : kind === "smile" ? { kind, skew: -0.1, curv: 0.3 }
                : kind === "localvol" ? { kind, skew: -0.1, curv: 0.3 }
                : kind === "heston" ? { kind, kappa: 2, thetaV: 0.04, xi: 0.5, rhoSV: -0.7 }
                : { kind: "constant" };
            setModel({ vol: vol });
          }}
        >
          {VOL_MODELS.map((m) => (
            <option key={m.kind} value={m.kind}>{m.label}</option>
          ))}
        </select>
        <div className="mt-1 text-[10px] leading-snug text-muted-foreground">{ASSUMPTION_SUMMARY[model.vol.kind]}</div>
        {model.vol.kind === "garch" && (
          <div className="mt-2 flex gap-2">
            <Labelled label="σ long"><NumberField value={model.vol.sigmaLong} percent min={0.001} max={3} step={0.01} ariaLabel="Long-run vol" onChange={(v) => setModel({ vol: { kind: "garch", sigmaLong: v, persistence: (model.vol as { persistence: number }).persistence } })} /></Labelled>
            <Labelled label="α+β"><NumberField value={(model.vol as { persistence: number }).persistence} min={0} max={0.999} step={0.005} ariaLabel="Persistence" onChange={(v) => setModel({ vol: { kind: "garch", sigmaLong: (model.vol as { sigmaLong: number }).sigmaLong, persistence: v } })} /></Labelled>
          </div>
        )}
        {model.vol.kind === "sabr" && (
          <div className="mt-2 grid grid-cols-2 gap-2">
            <Labelled label="α"><NumberField value={model.vol.alpha} min={0.001} max={3} step={0.01} ariaLabel="SABR alpha" onChange={(v) => setModel({ vol: { ...(model.vol as Extract<VolModelState, { kind: "sabr" }>), alpha: v } })} /></Labelled>
            <Labelled label="β"><NumberField value={model.vol.beta} min={0} max={1} step={0.05} ariaLabel="SABR beta" onChange={(v) => setModel({ vol: { ...(model.vol as Extract<VolModelState, { kind: "sabr" }>), beta: v } })} /></Labelled>
            <Labelled label="ρ"><NumberField value={model.vol.rhoSabr} min={-0.99} max={0.99} step={0.05} ariaLabel="SABR rho" onChange={(v) => setModel({ vol: { ...(model.vol as Extract<VolModelState, { kind: "sabr" }>), rhoSabr: v } })} /></Labelled>
            <Labelled label="ν"><NumberField value={model.vol.nu} min={0} max={5} step={0.05} ariaLabel="SABR nu" onChange={(v) => setModel({ vol: { ...(model.vol as Extract<VolModelState, { kind: "sabr" }>), nu: v } })} /></Labelled>
          </div>
        )}
        {(model.vol.kind === "smile" || model.vol.kind === "localvol") && (
          <div className="mt-2 flex gap-2">
            <Labelled label="Skew s"><NumberField value={model.vol.skew} min={-3} max={3} step={0.05} ariaLabel="Smile skew" onChange={(v) => setModel({ vol: { kind: model.vol.kind as "smile", skew: v, curv: (model.vol as { curv: number }).curv } })} /></Labelled>
            <Labelled label="Curv c"><NumberField value={(model.vol as { curv: number }).curv} min={-3} max={3} step={0.05} ariaLabel="Smile curvature" onChange={(v) => setModel({ vol: { kind: model.vol.kind as "smile", skew: (model.vol as { skew: number }).skew, curv: v } })} /></Labelled>
          </div>
        )}
        {model.vol.kind === "heston" && (
          <div className="mt-2 grid grid-cols-2 gap-2">
            <Labelled label="κ"><NumberField value={model.vol.kappa} min={0.01} max={20} step={0.25} ariaLabel="Heston kappa" onChange={(v) => setModel({ vol: { ...(model.vol as Extract<VolModelState, { kind: "heston" }>), kappa: v } })} /></Labelled>
            <Labelled label="θ (var)"><NumberField value={model.vol.thetaV} min={0.0001} max={4} step={0.005} ariaLabel="Heston theta" onChange={(v) => setModel({ vol: { ...(model.vol as Extract<VolModelState, { kind: "heston" }>), thetaV: v } })} /></Labelled>
            <Labelled label="ξ"><NumberField value={model.vol.xi} min={0} max={5} step={0.05} ariaLabel="Heston xi" onChange={(v) => setModel({ vol: { ...(model.vol as Extract<VolModelState, { kind: "heston" }>), xi: v } })} /></Labelled>
            <Labelled label="ρ_SV"><NumberField value={model.vol.rhoSV} min={-0.99} max={0.99} step={0.05} ariaLabel="Heston correlation" onChange={(v) => setModel({ vol: { ...(model.vol as Extract<VolModelState, { kind: "heston" }>), rhoSV: v } })} /></Labelled>
          </div>
        )}
        {model.vol.kind === "term" && (
          <div className="mt-2 flex flex-col gap-1.5">
            {(model.vol.points).map((pt, i) => (
              <div key={i} className="flex items-center gap-2">
                <Labelled label={`T${i + 1}`}><NumberField value={pt.t} min={0.01} max={50} step={0.25} unit="y" ariaLabel={`Pillar ${i + 1} maturity`} onChange={(v) => {
                  const points = (model.vol as Extract<VolModelState, { kind: "term" }>).points.map((q, j) => (j === i ? { ...q, t: v } : q));
                  setModel({ vol: { kind: "term", points } });
                }} /></Labelled>
                <Labelled label="σ"><NumberField value={pt.sigma} percent min={0.001} max={3} step={0.01} ariaLabel={`Pillar ${i + 1} vol`} onChange={(v) => {
                  const points = (model.vol as Extract<VolModelState, { kind: "term" }>).points.map((q, j) => (j === i ? { ...q, sigma: v } : q));
                  setModel({ vol: { kind: "term", points } });
                }} /></Labelled>
              </div>
            ))}
          </div>
        )}
        {isMcVol && (
          <div className="mt-1.5 text-[10px] leading-snug text-muted-foreground">
            Simulation model: European and arithmetic-Asian legs price by Monte Carlo; other exotics fall back to their
            closed forms at the effective vol.
          </div>
        )}
      </div>

      {/* rates */}
      <div className="border-t border-separator pt-3">
        <div className="mb-1 flex items-center justify-between text-foreground">
          Interest-rate model
          <InfoDot id={RATE_MODELS.find((m) => m.kind === model.rates.kind)?.info ?? "rate-constant"} />
        </div>
        <select
          className="w-full border border-border bg-background px-2 py-1.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
          value={model.rates.kind}
          aria-label="Interest-rate model"
          onChange={(e) => {
            const kind = e.target.value as RateModelState["kind"];
            const rates: RateModelState =
              kind === "merton" ? { kind, a: 0.001, sigmaR: 0.01 }
                : kind === "vasicek" ? { kind, a: 0.5, theta: 0.05, sigmaR: 0.01 }
                : kind === "cir" ? { kind, a: 0.5, theta: 0.05, sigmaR: 0.08 }
                : { kind: "constant" };
            setModel({ rates });
          }}
        >
          {RATE_MODELS.map((m) => (
            <option key={m.kind} value={m.kind} disabled={m.kind !== "constant" && !hasRateLeg && chart.legs.length > 0}>
              {m.label}
              {m.kind !== "constant" && !hasRateLeg && chart.legs.length > 0 ? " — needs a rate-sensitive leg" : ""}
            </option>
          ))}
        </select>
        <div className="mt-1 text-[10px] leading-snug text-muted-foreground">{ASSUMPTION_SUMMARY[`rate-${model.rates.kind}`]}</div>
        {model.rates.kind !== "constant" && (
          <div className="mt-2 grid grid-cols-2 gap-2">
            <Labelled label="a"><NumberField value={model.rates.a} min={-0.5} max={5} step={0.05} ariaLabel="Rate model a" onChange={(v) => setModel({ rates: { ...(model.rates as Extract<RateModelState, { kind: "vasicek" }>), a: v } })} /></Labelled>
            {"theta" in model.rates && (
              <Labelled label="θ"><NumberField value={model.rates.theta} percent min={0.0001} max={0.5} step={0.0025} ariaLabel="Long-run rate" onChange={(v) => setModel({ rates: { ...(model.rates as Extract<RateModelState, { kind: "vasicek" }>), theta: v } })} /></Labelled>
            )}
            <Labelled label="σ_r"><NumberField value={model.rates.sigmaR} percent min={0.0001} max={1} step={0.0025} ariaLabel="Rate volatility" onChange={(v) => setModel({ rates: { ...(model.rates as Extract<RateModelState, { kind: "vasicek" }>), sigmaR: v } })} /></Labelled>
          </div>
        )}
      </div>

      {/* Monte Carlo settings */}
      {(hasMcLeg || isMcVol) && (
        <div className="border-t border-separator pt-3">
          <div className="mb-1 flex items-center justify-between text-foreground">
            Monte Carlo <InfoDot id="mc-settings" />
          </div>
          <div className="grid grid-cols-3 gap-2">
            <Labelled label="Paths"><NumberField value={model.mcPaths} min={500} max={40000} step={1000} ariaLabel="Monte Carlo paths" onChange={(v) => setModel({ mcPaths: Math.round(v) })} /></Labelled>
            <Labelled label="Steps"><NumberField value={model.mcSteps} min={8} max={250} step={4} ariaLabel="Monte Carlo steps" onChange={(v) => setModel({ mcSteps: Math.round(v) })} /></Labelled>
            <Labelled label="Seed"><NumberField value={model.seed} min={0} max={999999} step={1} ariaLabel="Random seed" onChange={(v) => setModel({ seed: Math.round(v) })} /></Labelled>
          </div>
        </div>
      )}

      <button
        type="button"
        className="self-start text-accent underline underline-offset-2"
        onClick={() => openLearn(PRICING_MODELS.find((m) => m.id === model.pricing)?.info ?? "model-bs")}
      >
        Read the full assumptions panel →
      </button>
    </div>
  );
}

function Labelled({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex min-w-0 flex-1 items-center gap-1.5">
      <span className="w-10 flex-none text-[10px] text-muted-foreground">{label}</span>
      {children}
    </label>
  );
}
