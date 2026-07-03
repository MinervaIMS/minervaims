// PayoffLab — Learn drawer content (§10). A rigorous, compact derivatives
// textbook in UK English: plain-English intuition → key formulas (KaTeX) →
// assumptions → optional mathematical appendix. Entry ids are referenced by
// every ⓘ affordance in the tool.

export interface LearnFormula {
  tex: string;
  caption?: string;
}

export interface LearnEntry {
  id: string;
  eyebrow: string;
  title: string;
  intuition: string;
  formulas?: LearnFormula[];
  assumptions?: string[];
  appendix?: { title: string; body: string; tex?: string[] };
  related?: string[];
}

const R = String.raw;

export const LEARN_ENTRIES: LearnEntry[] = [
  // =========================================================== GREEKS =====
  {
    id: "greek-delta",
    eyebrow: "The Greeks",
    title: "Delta — the hedge ratio",
    intuition:
      "Delta is the slope of the value curve: how much the position's value moves for a small change in the underlying price. A delta of 0.61 means a rise of 1 in S adds roughly 0.61 of value, before second-order effects. It is also the hedge ratio — the number of units of the underlying that neutralises directional risk — and, loosely, the risk-neutral probability-weighted exposure to the asset.",
    formulas: [
      { tex: R`\Delta = \frac{\partial V}{\partial S}` },
      { tex: R`\Delta_{\text{call}} = e^{(b-r)\tau}\,N(d_1), \qquad \Delta_{\text{put}} = e^{(b-r)\tau}\,\bigl(N(d_1)-1\bigr)`, caption: "Generalised Black–Scholes (b = cost of carry)" },
      { tex: R`d_1 = \frac{\ln(S/K) + (b + \tfrac{1}{2}\sigma^2)\tau}{\sigma\sqrt{\tau}}` },
    ],
    assumptions: [
      "Model delta: computed under the selected pricing model's dynamics.",
      "A portfolio's delta is the signed, quantity-weighted sum of leg deltas.",
      "PayoffLab reports the raw derivative ∂V/∂S (per unit of S).",
    ],
    appendix: {
      title: "Derivation for the Black–Scholes call",
      body:
        "Differentiate C = S·e^{(b−r)τ}N(d₁) − K·e^{−rτ}N(d₂) with respect to S. The chain-rule terms in ∂d₁/∂S and ∂d₂/∂S cancel through the identity below, leaving Δ = e^{(b−r)τ}N(d₁).",
      tex: [R`S\,e^{(b-r)\tau} n(d_1) = K e^{-r\tau} n(d_2), \qquad \frac{\partial d_1}{\partial S}=\frac{\partial d_2}{\partial S}=\frac{1}{S\sigma\sqrt{\tau}}`],
    },
    related: ["greek-gamma", "hedge-delta"],
  },
  {
    id: "greek-gamma",
    eyebrow: "The Greeks",
    title: "Gamma — convexity",
    intuition:
      "Gamma is the curvature of the value curve — the rate at which delta itself changes as S moves. Long options are long gamma: their delta drifts in your favour, which is why a delta-hedged long option earns money from movement. Gamma concentrates at the strike and, as expiry approaches, spikes there while collapsing elsewhere.",
    formulas: [
      { tex: R`\Gamma = \frac{\partial^2 V}{\partial S^2} = \frac{\partial \Delta}{\partial S}` },
      { tex: R`\Gamma = \frac{e^{(b-r)\tau}\, n(d_1)}{S\,\sigma\sqrt{\tau}}`, caption: "Same for calls and puts" },
    ],
    assumptions: [
      "Gamma is identical for a call and a put with the same strike and expiry (parity differs only by linear terms).",
      "Sign convention: long options have positive gamma; short options negative.",
    ],
    appendix: {
      title: "Gamma and hedging error",
      body:
        "Over a small move ΔS, a delta-hedged book earns approximately ½Γ(ΔS)². Discrete re-hedging therefore leaves a residual P/L of gamma shape — see the hedging simulation, which decomposes each step's P/L into this term plus theta.",
      tex: [R`\delta \Pi \approx \Theta\,\delta t + \tfrac{1}{2}\Gamma\,(\delta S)^2`],
    },
    related: ["greek-speed", "greek-colour", "hedge-sim"],
  },
  {
    id: "greek-theta",
    eyebrow: "The Greeks",
    title: "Theta — time decay",
    intuition:
      "Theta measures how the position's value drifts as calendar time passes with everything else frozen. For a long option it is usually negative: optionality is a wasting asset, and its time value bleeds towards intrinsic value as expiry nears. PayoffLab reports theta per year; divide by 365 for a per-day figure.",
    formulas: [
      { tex: R`\Theta = \frac{\partial V}{\partial t} = -\frac{\partial V}{\partial \tau}` },
      { tex: R`\Theta_{\text{call}} = -\frac{S e^{(b-r)\tau} n(d_1)\sigma}{2\sqrt{\tau}} - (b-r)S e^{(b-r)\tau}N(d_1) - rKe^{-r\tau}N(d_2)` },
    ],
    assumptions: [
      "Theta is not a risk in itself — it is the deterministic price of holding gamma and vega: in a delta-hedged book, Θ ≈ −½Γσ²S² under Black–Scholes.",
    ],
    related: ["greek-gamma", "concept-time-decay"],
  },
  {
    id: "greek-vega",
    eyebrow: "The Greeks",
    title: "Vega — volatility sensitivity",
    intuition:
      "Vega is the derivative of value with respect to the volatility input. Long options are long vega: more uncertainty makes optionality dearer. Vega peaks near the money and grows with time to expiry — long-dated ATM options are the natural vega instruments. PayoffLab reports the raw derivative per unit of σ; divide by 100 for 'per vol point'.",
    formulas: [
      { tex: R`\mathcal{V} = \frac{\partial V}{\partial \sigma} = S e^{(b-r)\tau} n(d_1)\sqrt{\tau}`, caption: "Same for calls and puts" },
    ],
    assumptions: [
      "Vega treats σ as a parameter — coherent inside Black–Scholes, an approximation under stochastic volatility (where vomma and vanna matter).",
    ],
    related: ["greek-vomma", "greek-vanna", "inst-varswap"],
  },
  {
    id: "greek-rho",
    eyebrow: "The Greeks",
    title: "Rho — rate sensitivity",
    intuition:
      "Rho measures sensitivity to the interest rate. For equity options it is usually the smallest first-order Greek; for rate-sensitive instruments (swaps, FRAs, caps) it is the whole story — their value-versus-r chart is essentially a rho picture. Calls gain from higher rates (the strike is paid later, discounted more); puts lose.",
    formulas: [
      { tex: R`\rho = \frac{\partial V}{\partial r}` },
      { tex: R`\rho_{\text{call}} = K\,\tau\, e^{-r\tau} N(d_2)`, caption: "Black–Scholes with the dividend yield held fixed" },
    ],
    related: ["inst-swap", "rate-vasicek"],
  },
  {
    id: "greek-vanna",
    eyebrow: "Second-order Greeks",
    title: "Vanna — ∂Δ/∂σ (= ∂ν/∂S)",
    intuition:
      "Vanna says how your delta moves when volatility changes — equivalently, how vega changes as S moves; the two cross-derivatives are the same number. Desks watch vanna because a skewed vol surface moving with spot re-hedges their book for them (or against them). It is largest in the wings, zero-ish at the money.",
    formulas: [
      { tex: R`\text{Vanna} = \frac{\partial^2 V}{\partial S\,\partial\sigma} = -e^{(b-r)\tau} n(d_1)\frac{d_2}{\sigma}` },
    ],
    related: ["greek-vomma", "vol-sabr"],
  },
  {
    id: "greek-vomma",
    eyebrow: "Second-order Greeks",
    title: "Vomma (volga) — ∂²V/∂σ²",
    intuition:
      "Vomma is convexity in volatility: a positive-vomma position gains more from a vol rise than it loses from an equal fall. Out-of-the-money options carry the most vomma, which is why butterflies (wings versus body) isolate volatility-of-volatility exposure.",
    formulas: [
      { tex: R`\text{Vomma} = \frac{\partial^2 V}{\partial \sigma^2} = \mathcal{V}\,\frac{d_1 d_2}{\sigma}` },
    ],
    related: ["greek-vega", "vol-heston"],
  },
  {
    id: "greek-charm",
    eyebrow: "Second-order Greeks",
    title: "Charm — delta decay",
    intuition:
      "Charm is the drift of delta with the passage of time. An in-the-money option's delta migrates towards 1 (it will almost surely be exercised) and an out-of-the-money delta towards 0 — charm quantifies that overnight migration, and is what forces even a static book to re-hedge each morning.",
    formulas: [
      { tex: R`\text{Charm} = \frac{\partial \Delta}{\partial t} = \frac{\partial^2 V}{\partial S\,\partial t}` },
    ],
    related: ["greek-delta", "greek-colour"],
  },
  {
    id: "greek-speed",
    eyebrow: "Second-order Greeks",
    title: "Speed — ∂Γ/∂S",
    intuition:
      "Speed is the third derivative of value in S: how quickly gamma itself changes as spot moves. It warns a gamma hedger that the hedge ratio of the hedge is unstable — most relevant close to the strike near expiry, where the gamma peak is sharp and speed is violent on its flanks.",
    formulas: [
      { tex: R`\text{Speed} = \frac{\partial^3 V}{\partial S^3} = -\frac{\Gamma}{S}\left(\frac{d_1}{\sigma\sqrt{\tau}} + 1\right)` },
    ],
    related: ["greek-gamma"],
  },
  {
    id: "greek-colour",
    eyebrow: "Second-order Greeks",
    title: "Colour — gamma decay",
    intuition:
      "Colour is the drift of gamma with time. As expiry approaches, at-the-money gamma explodes while away-from-the-money gamma dies — colour is the rate of that redistribution, telling a trader how today's gamma profile will have deformed by tomorrow.",
    formulas: [
      { tex: R`\text{Colour} = \frac{\partial \Gamma}{\partial t} = \frac{\partial^3 V}{\partial S^2\,\partial t}` },
    ],
    related: ["greek-gamma", "concept-gamma-expiry"],
  },

  // ====================================================== CORE CONCEPTS ====
  {
    id: "payoff-vs-value",
    eyebrow: "Reading the chart",
    title: "Payoff at expiry vs present value now",
    intuition:
      "The payoff line is the contract read literally at expiry: piecewise-linear, model-free, the picture you can draw with no mathematics. The value line is what the position is worth today under the pricing model: a smooth curve whose slope is delta and whose curvature is gamma. The vertical gap between them is time value — watch it close as you sweep the time axis. When legs expire on different dates, the payoff is drawn at the first expiry with the surviving legs marked to model, as is standard practice.",
    formulas: [
      { tex: R`\text{payoff}_{\text{call}}(S_T) = \max(S_T - K, 0)` },
      { tex: R`V_t = e^{-r\tau}\,\mathbb{E}^{\mathbb{Q}}\!\left[\,\text{payoff}(S_T)\,\right]`, caption: "Risk-neutral valuation" },
    ],
    related: ["net-premium", "x-axis"],
  },
  {
    id: "net-premium",
    eyebrow: "Reading the chart",
    title: "Net premium (profit convention)",
    intuition:
      "With 'Net premium' on, both lines are shifted down by the portfolio's initial cost, so the chart shows profit and loss rather than gross value — the convention of every textbook strategy diagram, and the one under which break-evens and max profit/loss are meaningful. Switch it off to see raw values instead.",
    formulas: [
      { tex: R`\text{P\&L}(S_T) = \text{payoff}(S_T) - V_0` },
    ],
    related: ["payoff-vs-value"],
  },
  {
    id: "x-axis",
    eyebrow: "Reading the chart",
    title: "The independent variable",
    intuition:
      "Each chart sweeps ONE variable along the horizontal axis and freezes everything else at the fixed-parameter values. Price S gives the classic payoff diagram. Time t is the decay view: value converging to intrinsic as t → T, gamma and vega reshaping on the way. Rate r is the natural axis for swaps, FRAs, caps and swaptions. The same portfolio, three cross-sections.",
    related: ["payoff-vs-value", "crosshair"],
  },
  {
    id: "crosshair",
    eyebrow: "Reading the chart",
    title: "The crosshair",
    intuition:
      "Hover to read every visible line's exact value at one x. Values are interpolated client-side from the sampled curves, so the readout is instant. Arrow keys nudge the crosshair in fine steps; it snaps to strikes and break-evens. The sync toggle locks the crosshair x across all charts for direct comparison.",
    related: ["x-axis"],
  },
  {
    id: "level-switch",
    eyebrow: "The tool",
    title: "Basic · Advanced · Pro",
    intuition:
      "The level switch changes which instruments, models and Greeks are exposed and how much explanation shows — it never changes the mathematics. Basic covers cash to vanilla strategies with delta and gamma. Advanced unlocks exotics, model selection and Monte Carlo. Pro adds the full second-order Greek set with sign-region shading and the hedging analytics.",
  },
  {
    id: "sign-shading",
    eyebrow: "Reading the chart",
    title: "Sign-region shading",
    intuition:
      "For a Greek overlay, the background is tinted where the aggregate Greek is positive (green) or negative (red) — so the S-regions where your book is long or short convexity are legible at a glance. The tint never carries information alone: the crosshair gives the exact signed value at every x.",
    related: ["greek-gamma"],
  },
  {
    id: "path-dependent-payoff",
    eyebrow: "Reading the chart",
    title: "Why no payoff line here",
    intuition:
      "This portfolio contains a path-dependent claim (an Asian, lookback or variance leg): its settlement depends on the whole trajectory of S, not just the terminal price, so a terminal-payoff line is mathematically undefined. PayoffLab plots the mark-to-market value curve instead — for Monte Carlo instruments, the simulated present value against the swept variable.",
    related: ["inst-asian", "inst-lookback"],
  },
  {
    id: "put-call-parity",
    eyebrow: "Core results",
    title: "Put–call parity",
    intuition:
      "A call minus a put with the same strike and expiry is a forward — no model required, only the absence of arbitrage. Parity is the first sanity check on any pricing engine (PayoffLab's test suite enforces it) and the reason gamma and vega are identical for calls and puts.",
    formulas: [
      { tex: R`C - P = S e^{(b-r)\tau} - K e^{-r\tau}` },
    ],
  },

  // ========================================================= PARAMETERS ====
  { id: "spot", eyebrow: "Parameters", title: "Spot price S", intuition: "The current price of the underlying — the default x-axis. When S is being swept, its fixed input sets the reference point for the readout and for auto-ranging (±50%)." },
  { id: "strike", eyebrow: "Parameters", title: "Strike K", intuition: "The contractual trade price. Everything interesting in an option's geometry — the payoff kink, the gamma peak, the digital cliff — happens at the strike. Vertical guides mark each leg's strike on the chart." },
  { id: "maturity", eyebrow: "Parameters", title: "Maturity T", intuition: "Time to expiry in years, with continuous compounding throughout. More time means more optionality (usually more value) but also more discounting; on the time axis you watch T − t shrink to zero." },
  { id: "rate", eyebrow: "Parameters", title: "Interest rate r", intuition: "The continuously-compounded risk-free rate: e^{−rτ} discounts every future cash flow. It doubles as the risk-neutral drift of the underlying (net of yield q). Textbook default 5%." },
  { id: "volatility", eyebrow: "Parameters", title: "Volatility σ", intuition: "The annualised standard deviation of log-returns — the one parameter you cannot read off a screen and the market's actual currency of option value. Textbook default 20%. Under model selection this headline σ may be reinterpreted (e.g. as SABR's α or Heston's √v₀)." },
  { id: "dividend-yield", eyebrow: "Parameters", title: "Dividend yield q", intuition: "A continuous leakage from holding the asset: dividends for equities, the foreign rate for FX, convenience yield for commodities. It lowers the forward, S·e^{(r−q)τ}, and hence calls; it raises puts.", formulas: [{ tex: R`b = r - q` }] },
  { id: "call-put", eyebrow: "Parameters", title: "Call or put", intuition: "A call is the right to buy at K (bullish, unbounded upside); a put is the right to sell at K (bearish, upside capped at K). The two are locked together by put–call parity.", related: ["put-call-parity"] },
  { id: "notional", eyebrow: "Parameters", title: "Notional", intuition: "The face amount on which a swap's or deposit's cash flows are computed. Rate instruments here quote value per this notional; scale via quantity for size." },
  { id: "second-asset", eyebrow: "Parameters", title: "The second asset", intuition: "Two-asset instruments sweep S as asset 1 and hold asset 2 at its input S₂ with its own volatility σ₂ and yield q₂. The chart is thus a cross-section: 'value against S₁, if S₂ stays put'." },
  { id: "correlation", eyebrow: "Parameters", title: "Correlation ρ", intuition: "The instantaneous correlation of the two assets' returns. It is THE price-maker for spread, basket and rainbow options: a spread option loves low correlation (the legs fly apart), a basket call prefers high correlation (the sum moves as one). Textbook default 0.5." },
  { id: "digital-payout", eyebrow: "Parameters", title: "Digital payout", intuition: "The fixed cash amount a cash-or-nothing digital pays when it finishes in the money. The option's value is simply the discounted risk-neutral probability of that event times this payout." },
  { id: "foreign-rate", eyebrow: "Parameters", title: "Foreign rate r_f", intuition: "In FX, holding foreign currency earns the foreign rate — so r_f plays exactly the role of a dividend yield in Garman–Kohlhagen: b = r_d − r_f." },
  { id: "fx-spot", eyebrow: "Parameters", title: "FX rate", intuition: "Domestic currency per unit of foreign. For a quanto, X̄ is instead the FIXED conversion rate written into the contract — currency risk is removed, at the cost of a drift correction." },
  { id: "fx-vol", eyebrow: "Parameters", title: "FX volatility σ_X", intuition: "The volatility of the exchange rate. For composite options it adds in quadrature (plus correlation) to the asset's vol; for quantos it enters only through the covariance term ρσ_Sσ_X." },
  { id: "discrete-dividend", eyebrow: "Parameters", title: "Discrete dividend", intuition: "A single known cash dividend at a known date, handled on the lattice by the escrowed-dividend method: the tree diffuses S minus the dividend's present value, adding it back for early-exercise comparisons. A large enough dividend makes early exercise of an American call rational just before the ex-date." },
  { id: "barrier-direction", eyebrow: "Parameters", title: "Barrier type", intuition: "Down or up says where the barrier sits relative to spot; in or out says whether touching it creates or destroys the option. The eight combinations with call/put are all priced in closed form (Reiner–Rubinstein)." },
  { id: "barrier-level", eyebrow: "Parameters", title: "Barrier H", intuition: "The trigger level, monitored continuously. The closer H is to spot, the more the knock-out discounts the vanilla — and the more violently delta behaves near H. Default: ±20% of spot." },
  { id: "barrier-rebate", eyebrow: "Parameters", title: "Rebate", intuition: "A consolation payment: paid at the moment of knock-out for 'out' options, or at expiry if a knock-in never activates." },
  { id: "compound-structure", eyebrow: "Parameters", title: "Compound structure", intuition: "Which option sits on which: a call-on-call is the right to BUY the underlying call at t₁ for K₁; a put-on-put the right to SELL the put. Two exercise events → bivariate normal probabilities." },
  { id: "rainbow-kind", eyebrow: "Parameters", title: "Max or min payoff", intuition: "Call-on-max pays on the better of two assets (dual-asset upside); call-on-min only pays if BOTH finish above K — much cheaper, and very correlation-sensitive." },
  { id: "basket-weights", eyebrow: "Parameters", title: "Basket weights", intuition: "The portfolio weights inside the basket. The payoff is on w₁S₁ + w₂S₂; a weighted sum of lognormals has no closed-form law, hence Monte Carlo." },
  { id: "spread-method", eyebrow: "Parameters", title: "Kirk vs Monte Carlo", intuition: "Kirk's approximation treats S₂ + K as a single lognormal — fast and accurate for moderate K. Monte Carlo is exact (to sampling error); the test suite keeps the two within tolerance of each other." },
  { id: "variance-strike", eyebrow: "Parameters", title: "Variance-swap strike", intuition: "Quoted in volatility terms K_vol; the contract settles on realised variance against K_vol². Fair value at inception makes the expected payoff zero." },
  { id: "fixed-rate", eyebrow: "Parameters", title: "Fixed rate K", intuition: "The contractual fixed leg of a swap, FRA or the strike rate of a cap/swaption. At the par rate the swap values to zero — the r-axis chart makes the par point visible as the zero crossing." },
  { id: "tenor", eyebrow: "Parameters", title: "Tenor & frequency", intuition: "How long the instrument's schedule runs and how often it pays or resets. Longer tenors mean larger annuities and hence bigger rate sensitivity (duration)." },
  { id: "black-vol", eyebrow: "Parameters", title: "Black volatility", intuition: "The lognormal volatility of the FORWARD rate used by Black-76 inside caps and swaptions — the market's quoting convention for rate options." },
  { id: "forward-start-alpha", eyebrow: "Parameters", title: "Strike ratio α", intuition: "The strike is set at t₁ as α·S(t₁): α = 1 is at-the-money forward-start (the cliquet building block); α < 1 starts in the money. Homogeneity of the pricing formula in (S, K) is what yields the closed form." },
  { id: "mc-settings", eyebrow: "Parameters", title: "Monte Carlo settings", intuition: "Paths × steps trade accuracy for time; the standard error shrinks as 1/√paths. The seed makes runs reproducible, and the same random numbers are reused across the grid and Greek bumps (common random numbers) so curves stay smooth." },
  { id: "tree-steps", eyebrow: "Parameters", title: "Lattice steps", intuition: "More steps converge to the continuous-time price at O(1/n) — watch it happen in the binomial-vs-Black–Scholes comparison overlay. 200 steps is ample for teaching accuracy." },

  // ============================================================ MODELS =====
  {
    id: "model-bs",
    eyebrow: "Pricing models",
    title: "Black–Scholes–Merton (1973)",
    intuition:
      "The canonical model: the underlying follows geometric Brownian motion with constant volatility and rates, markets are frictionless, and continuous hedging removes all risk — so the option's value obeys a deterministic PDE with a closed-form solution. Every other model in PayoffLab is best understood as one assumption of this list relaxed. The generalised form with cost of carry b covers Merton's dividend variant (b = r − q), Black-76 on futures (b = 0) and Garman–Kohlhagen for FX (b = r − r_f).",
    formulas: [
      { tex: R`dS_t = \mu S_t\,dt + \sigma S_t\,dW_t`, caption: "Dynamics under the real-world measure" },
      { tex: R`\frac{\partial V}{\partial t} + \tfrac{1}{2}\sigma^2 S^2 \frac{\partial^2 V}{\partial S^2} + b S \frac{\partial V}{\partial S} - rV = 0`, caption: "The pricing PDE" },
      { tex: R`C = S e^{(b-r)\tau} N(d_1) - K e^{-r\tau} N(d_2)` },
      { tex: R`d_{1,2} = \frac{\ln(S/K) + (b \pm \tfrac{1}{2}\sigma^2)\tau}{\sigma\sqrt{\tau}}` },
    ],
    assumptions: [
      "Lognormal underlying: constant σ, continuous paths (no jumps).",
      "Constant, known interest rate and carry; no arbitrage.",
      "Frictionless, continuous trading — the hedge portfolio is rebalanced at every instant.",
      "European exercise for the closed form.",
    ],
    appendix: {
      title: "Sketch of the replication argument",
      body:
        "Hold the option and short Δ = ∂V/∂S units of stock. Itô's lemma makes the portfolio's instantaneous P/L deterministic (the dW terms cancel), so by no-arbitrage it must earn the risk-free rate — which is precisely the PDE above. Solving it with the terminal condition max(S−K,0) gives the formula; equivalently, V = e^{−rτ}E^Q[payoff] under the risk-neutral measure.",
    },
    related: ["model-bachelier", "model-jump", "put-call-parity"],
  },
  {
    id: "model-bachelier",
    eyebrow: "Pricing models",
    title: "Bachelier (normal) model — 1900",
    intuition:
      "Five years before Einstein's Brownian-motion paper, Bachelier priced options assuming ARITHMETIC Brownian motion: absolute price changes, not returns, are normal. Prices can go negative — nonsense for stocks, but exactly right for spreads and briefly for oil futures in April 2020, when the market switched to Bachelier overnight. Near the money and over short horizons it agrees closely with Black–Scholes when σ_N = σ·S; the disagreement grows in the wings.",
    formulas: [
      { tex: R`dS_t = \sigma_N\, dW_t` },
      { tex: R`C = e^{-r\tau}\left[(F-K)\,N(d) + \sigma_N\sqrt{\tau}\; n(d)\right], \qquad d = \frac{F-K}{\sigma_N\sqrt{\tau}}` },
    ],
    assumptions: [
      "Normal (absolute) volatility σ_N in currency units; PayoffLab maps your σ input as σ_N = σ·S₀ so the two models are comparable.",
      "Prices may go negative — a feature for spreads and rates, a bug for equities.",
    ],
    related: ["model-bs", "concept-bachelier"],
  },
  {
    id: "model-jump",
    eyebrow: "Pricing models",
    title: "Merton jump-diffusion (1976)",
    intuition:
      "Real returns have fat tails: crashes arrive as jumps, not as a fast diffusion. Merton adds lognormal jumps at Poisson times to the Black–Scholes diffusion and prices the option as a Poisson-probability-weighted average of Black–Scholes prices with adjusted inputs. The observable consequence is a volatility smile — exactly what constant-σ Black–Scholes cannot produce.",
    formulas: [
      { tex: R`\frac{dS_t}{S_{t^-}} = (b - \lambda \bar{k})\,dt + \sigma\, dW_t + (J-1)\,dN_t` },
      { tex: R`C = \sum_{n=0}^{\infty} \frac{e^{-\lambda \tau}(\lambda \tau)^n}{n!}\; C_{BS}\!\left(\sigma_n, b_n\right)`, caption: "σ_n and b_n absorb n jumps' variance and drift" },
    ],
    assumptions: [
      "Jump risk is diversifiable (not priced) — Merton's original assumption.",
      "λ = expected jumps per year; μ_J, δ_J = mean and volatility of log jump size.",
    ],
    related: ["model-bs", "vol-heston"],
  },
  {
    id: "model-binomial",
    eyebrow: "Pricing models",
    title: "Binomial lattices — CRR & Jarrow–Rudd",
    intuition:
      "Chop time into n steps; each step the price moves up or down with risk-neutral probability chosen to match the model's drift and variance; roll option values backwards from expiry. The tree converges to Black–Scholes at rate O(1/n) — overlay the two to watch — and, crucially, at every node you may compare against immediate exercise, which is what makes it THE workhorse for American options.",
    formulas: [
      { tex: R`u = e^{\sigma\sqrt{\Delta t}},\quad d = 1/u,\quad p = \frac{e^{b\Delta t} - d}{u - d}`, caption: "Cox–Ross–Rubinstein parameterisation" },
      { tex: R`V_{\text{node}} = \max\!\Big(e^{-r\Delta t}\big[pV_u + (1-p)V_d\big],\; \text{intrinsic}\Big)`, caption: "American backward induction" },
    ],
    assumptions: [
      "Jarrow–Rudd instead centres the drift so p = ½ (equal-probability tree).",
      "Discrete dividends use the escrowed-dividend adjustment.",
    ],
    related: ["model-trinomial", "inst-amer"],
  },
  {
    id: "model-trinomial",
    eyebrow: "Pricing models",
    title: "Trinomial lattice (Boyle)",
    intuition:
      "Three branches per step (up, middle, down) give the tree an extra degree of freedom, so it matches the diffusion's moments better and converges more smoothly than the binomial — fewer of the odd–even oscillations you can see in the convergence overlay.",
    formulas: [
      { tex: R`\Delta x = \lambda\sigma\sqrt{\Delta t},\quad p_{u,d} = \frac{1}{2}\!\left(\frac{\sigma^2\Delta t + \nu^2\Delta t^2}{\Delta x^2} \pm \frac{\nu\,\Delta t}{\Delta x}\right)`, caption: "ν = b − σ²/2, λ = √(3/2)" },
    ],
    related: ["model-binomial"],
  },
  {
    id: "vol-constant",
    eyebrow: "Volatility models",
    title: "Constant volatility",
    intuition:
      "One σ for every strike and maturity — the Black–Scholes baseline. Its empirical failure (markets quote different implied vols across strikes: the smile) is the motivation for every other entry in this menu.",
    related: ["vol-term", "vol-sabr", "vol-heston"],
  },
  {
    id: "vol-term",
    eyebrow: "Volatility models",
    title: "Deterministic term structure",
    intuition:
      "Volatility varies with maturity but not with strike: σ(T) pillars are interpolated in total variance w = σ²T. An option of maturity T prices with the root-mean-square volatility over its life — the simplest honest upgrade from constant σ, and the standard way to express 'short-dated vol is elevated'.",
    formulas: [
      { tex: R`\sigma_{\text{eff}}(T) = \sqrt{\frac{1}{T}\int_0^T \sigma^2(s)\,ds}` },
    ],
    related: ["vol-constant"],
  },
  {
    id: "vol-garch",
    eyebrow: "Volatility models",
    title: "GARCH(1,1) forecast",
    intuition:
      "GARCH captures volatility clustering: today's variance feeds tomorrow's. For option pricing PayoffLab uses the standard textbook mapping (Hull ch. 23): the model's expected variance path decays geometrically from today's σ² towards the long-run level, and the option prices with the average expected variance over its life. A quiet market with persistence φ close to 1 therefore lifts long-dated vols only slowly back to normal.",
    formulas: [
      { tex: R`\mathbb{E}[\sigma^2_{n+i}] = \sigma_L^2 + \varphi^{\,i}\,(\sigma_0^2 - \sigma_L^2), \qquad \varphi = \alpha + \beta` },
    ],
    assumptions: [
      "This deterministic-forecast treatment ignores the risk premium on stochastic variance — a documented approximation, not the full Duan GARCH option model.",
    ],
    related: ["vol-term", "vol-heston"],
  },
  {
    id: "vol-sabr",
    eyebrow: "Volatility models",
    title: "SABR (Hagan et al., 2002)",
    intuition:
      "The market standard for smiles in rates and FX: the forward and its volatility are both stochastic, correlated by ρ. Hagan's asymptotic formula turns the four parameters (α level, β backbone, ρ skew, ν convexity) into an implied Black–Scholes vol per strike — which PayoffLab then feeds to the pricing formula. Negative ρ tilts the smile down to the right (equity-like skew); ν bends it.",
    formulas: [
      { tex: R`dF = \alpha F^{\beta} dW_1,\quad d\alpha = \nu\,\alpha\,dW_2,\quad dW_1 dW_2 = \rho\,dt` },
      { tex: R`\sigma_{BS}(K) \approx \frac{\alpha}{(FK)^{(1-\beta)/2}\bigl[1 + \ldots\bigr]}\cdot\frac{z}{x(z)}\cdot\bigl[1 + (\ldots)\,T\bigr]`, caption: "Hagan's expansion (implemented in full)" },
    ],
    assumptions: [
      "An asymptotic approximation — accurate for the moderate maturities and strikes used here, degraded far in the wings.",
    ],
    related: ["vol-smile", "vol-heston"],
  },
  {
    id: "vol-smile",
    eyebrow: "Volatility models",
    title: "Implied smile input",
    intuition:
      "A direct, parametric statement of the market smile: σ(k) = σ_ATM + skew·k + curv·k² in log-moneyness k = ln(K/F). Each instrument prices with the vol read at ITS OWN strike — the practitioner's 'sticky-strike' rule. Negative skew makes low strikes dearer, exactly as equity index markets trade.",
    formulas: [
      { tex: R`\sigma(k) = \sigma_{\text{ATM}} + s\,k + c\,k^2, \qquad k = \ln(K/F)` },
    ],
    related: ["vol-localvol", "vol-sabr"],
  },
  {
    id: "vol-localvol",
    eyebrow: "Volatility models",
    title: "Local volatility (Dupire, 1994)",
    intuition:
      "Dupire's insight: there is exactly ONE diffusion σ(S,t) consistent with an entire surface of vanilla prices. PayoffLab derives that local volatility analytically from the parametric smile above and simulates paths through it, so exotics and vanillas share one self-consistent world. With a flat smile the local vol collapses back to constant σ — the test suite checks precisely that.",
    formulas: [
      { tex: R`\sigma_{\text{loc}}^2(K,T) = \frac{\partial w/\partial T}{1 - \frac{y}{w}\frac{\partial w}{\partial y} + \frac{1}{4}\left(-\frac{1}{4} - \frac{1}{w} + \frac{y^2}{w^2}\right)\left(\frac{\partial w}{\partial y}\right)^2 + \frac{1}{2}\frac{\partial^2 w}{\partial y^2}}`, caption: "Gatheral's form; w = total implied variance, y = log-moneyness" },
    ],
    assumptions: [
      "Deterministic (state-dependent) volatility — it reprices today's vanillas but understates forward smile compared with stochastic-vol models.",
    ],
    related: ["vol-smile", "vol-heston"],
  },
  {
    id: "vol-heston",
    eyebrow: "Volatility models",
    title: "Heston stochastic volatility (1993)",
    intuition:
      "Variance itself becomes a mean-reverting square-root process, correlated with spot. Negative correlation ρ generates the equity skew (spot down → vol up); the vol-of-vol ξ fattens both tails. PayoffLab prices under Heston by Monte Carlo (full-truncation Euler) with your σ input as the starting vol √v₀ — expect the progress bar, and small sampling noise in the curves.",
    formulas: [
      { tex: R`dS = b S\,dt + \sqrt{v}\,S\,dW_1` },
      { tex: R`dv = \kappa(\theta - v)\,dt + \xi\sqrt{v}\,dW_2, \qquad dW_1 dW_2 = \rho\,dt` },
    ],
    assumptions: [
      "Feller condition 2κθ ≥ ξ² keeps variance strictly positive; the simulator truncates at zero otherwise.",
    ],
    related: ["vol-localvol", "greek-vomma"],
  },
  {
    id: "rate-constant",
    eyebrow: "Rate models",
    title: "Constant short rate",
    intuition: "A flat curve: P(0,T) = e^{−rT}. The right baseline for equity-option teaching, where rate risk is second-order; the r-axis then simply sweeps this one number.",
    formulas: [{ tex: R`P(0,T) = e^{-rT}` }],
  },
  {
    id: "rate-merton",
    eyebrow: "Rate models",
    title: "Merton short-rate model (1973)",
    intuition:
      "The simplest stochastic rate: the short rate drifts linearly and diffuses with constant σ_r — a Gaussian model with a closed-form bond price. Pedagogically useful precisely because its flaw (rates wander off without anchor) motivates mean reversion.",
    formulas: [
      { tex: R`dr = a\,dt + \sigma_r\,dW` },
      { tex: R`P(0,T) = \exp\!\left(-rT - \tfrac{1}{2}aT^2 + \tfrac{1}{6}\sigma_r^2 T^3\right)` },
    ],
    related: ["rate-vasicek"],
  },
  {
    id: "rate-vasicek",
    eyebrow: "Rate models",
    title: "Vasicek (1977)",
    intuition:
      "Ornstein–Uhlenbeck rates: pulled back to a long-run level θ at speed a. The affine bond formula below makes whole curves out of one state variable; the price is that Gaussian rates can (rarely) go negative — which post-2015 Europe made look prescient rather than broken.",
    formulas: [
      { tex: R`dr = a(\theta - r)\,dt + \sigma_r\,dW` },
      { tex: R`P(0,T) = A(T)\,e^{-B(T)\,r}, \qquad B(T) = \frac{1 - e^{-aT}}{a}` },
    ],
    related: ["rate-cir", "rate-merton"],
  },
  {
    id: "rate-cir",
    eyebrow: "Rate models",
    title: "Cox–Ingersoll–Ross (1985)",
    intuition:
      "Vasicek with a √r diffusion coefficient: volatility shrinks as rates approach zero, keeping them non-negative (strictly positive under the Feller condition 2aθ ≥ σ_r²). Still affine, so bond prices stay closed-form — compare its curve against Vasicek's on the rate axis.",
    formulas: [
      { tex: R`dr = a(\theta - r)\,dt + \sigma_r\sqrt{r}\,dW` },
      { tex: R`P(0,T) = A(T)\,e^{-B(T)\,r}`, caption: "A, B as in the CIR affine solution" },
    ],
    related: ["rate-vasicek"],
  },

  // ======================================================== INSTRUMENTS ====
  {
    id: "inst-cash", eyebrow: "Instruments", title: "Cash (money-market account)",
    intuition: "A deposit of N accruing continuously at r: worth N·e^{rt} at time t. Flat in S, exponential in t, and the numéraire against which risk-neutral pricing measures everything else.",
    formulas: [{ tex: R`V(t) = N e^{rt}` }],
  },
  {
    id: "inst-stock", eyebrow: "Instruments", title: "Stock / underlying",
    intuition: "One unit of the asset: value S, payoff the 45° line. Combined with options it builds covered calls, collars and synthetic forwards; combined with the crosshair it is the cleanest way to see what 'delta = 1' means.",
    formulas: [{ tex: R`V = S, \qquad \Delta = 1,\; \Gamma = 0` }],
  },
  {
    id: "inst-forward", eyebrow: "Instruments", title: "Forward",
    intuition: "A binding agreement to buy at K at T. Value is the discounted gap between the forward price and K — linear in S, so delta is e^{−qτ} and every higher Greek is zero. Set K to the fair forward S·e^{(r−q)T} and the value line passes through zero at inception.",
    formulas: [
      { tex: R`V = S e^{-q\tau} - K e^{-r\tau}` },
      { tex: R`F_0 = S e^{(r-q)T}`, caption: "The fair delivery price" },
    ],
    related: ["inst-future"],
  },
  {
    id: "inst-future", eyebrow: "Instruments", title: "Future",
    intuition: "Economically a forward, but marked to market daily: gains are banked as they occur, so the position's value is the UNdiscounted move in the futures quote. With deterministic rates, futures and forward prices coincide — the difference is purely the financing of the running P/L.",
    formulas: [{ tex: R`V = F - K = S e^{(r-q)\tau} - K` }],
    related: ["inst-forward"],
  },
  {
    id: "inst-euro", eyebrow: "Instruments", title: "European option",
    intuition: "The right, without obligation, to buy (call) or sell (put) at K at expiry — the asymmetry that creates the hockey stick and everything the Greeks describe. Priced with the selected model; Black–Scholes by default.",
    formulas: [
      { tex: R`C = S e^{(b-r)\tau} N(d_1) - K e^{-r\tau} N(d_2)` },
      { tex: R`P = K e^{-r\tau} N(-d_2) - S e^{(b-r)\tau} N(-d_1)` },
    ],
    related: ["model-bs", "put-call-parity", "greek-delta"],
  },
  {
    id: "inst-amer", eyebrow: "Instruments", title: "American option",
    intuition: "Exercisable at any moment, so its value is a free-boundary problem: at every state, continuation value versus intrinsic. Priced here on a lattice. An American call on a non-dividend stock is never exercised early (equals the European); an American put, or a call before a large dividend, genuinely is.",
    formulas: [
      { tex: R`V = \max\bigl(\text{continuation},\; \text{intrinsic}\bigr) \;\text{at every node}` },
      { tex: R`V_{\text{Am}} \geq V_{\text{Eu}}` },
    ],
    related: ["model-binomial", "discrete-dividend"],
  },
  {
    id: "inst-digital-cash", eyebrow: "Instruments", title: "Digital (cash-or-nothing)",
    intuition: "Pays a fixed amount if S finishes beyond K — the option distilled to a probability bet. Its value is the discounted risk-neutral probability N(d₂) times the payout; its delta near expiry concentrates into a spike at the strike, which is why digital books are notoriously hard to hedge and why sign shading around K is so dramatic here.",
    formulas: [
      { tex: R`C_{\text{dig}} = Q\, e^{-r\tau} N(d_2)` },
      { tex: R`C_{\text{dig}} = -Q\,\frac{\partial C_{BS}}{\partial K}`, caption: "A digital is the limit of a tightening call spread" },
    ],
    related: ["inst-digital-asset", "concept-digital"],
  },
  {
    id: "inst-digital-asset", eyebrow: "Instruments", title: "Share digital (asset-or-nothing)",
    intuition: "Delivers the ASSET, not cash, when in the money: value S·e^{(b−r)τ}N(d₁). Decompose any vanilla with it: a call is a share digital long minus K cash digitals — the two halves of the Black–Scholes formula are literally these two instruments.",
    formulas: [
      { tex: R`C_{\text{share}} = S e^{(b-r)\tau} N(d_1)` },
      { tex: R`C_{BS} = C_{\text{share}} - K\,C_{\text{dig}}(Q{=}1)` },
    ],
    related: ["inst-digital-cash"],
  },
  {
    id: "inst-fx", eyebrow: "Instruments", title: "Currency option (Garman–Kohlhagen)",
    intuition: "An option on an exchange rate. Holding foreign currency earns r_f, so the foreign rate acts exactly like a dividend yield: the 1983 Garman–Kohlhagen formula is Black–Scholes with b = r_d − r_f. Set the chart's S to the FX spot (default 1.10).",
    formulas: [{ tex: R`C = S e^{-r_f \tau} N(d_1) - K e^{-r_d \tau} N(d_2)` }],
    related: ["model-bs", "foreign-rate"],
  },
  {
    id: "inst-black", eyebrow: "Instruments", title: "Option on a future (Black-76)",
    intuition: "A futures position costs nothing to enter, so the futures price has zero cost of carry under the risk-neutral measure: b = 0. Black's 1976 formula is the b = 0 case of the generalised model, and the market convention for options on rates, commodities and index futures.",
    formulas: [{ tex: R`C = e^{-r\tau}\bigl[F N(d_1) - K N(d_2)\bigr]` }],
    related: ["inst-capfloor", "inst-swaption"],
  },
  {
    id: "inst-foreign-equity", eyebrow: "Instruments", title: "Foreign asset struck in domestic currency",
    intuition: "You hold an option on a foreign stock but the strike and settlement are in your own currency, so what is really optioned is the composite asset X·S — and its volatility adds the FX leg in quadrature plus twice the covariance. Currency risk is inside the option, not hedged away.",
    formulas: [
      { tex: R`\sigma_{\text{comp}} = \sqrt{\sigma_S^2 + \sigma_X^2 + 2\rho\,\sigma_S \sigma_X}` },
      { tex: R`C = C_{BS}(X S,\; K,\; \sigma_{\text{comp}};\; b = r_d - q)` },
    ],
    related: ["inst-quanto"],
  },
  {
    id: "inst-quanto", eyebrow: "Instruments", title: "Quanto option",
    intuition: "Payoff on a foreign asset, converted at a FIXED rate X̄ — currency risk removed by contract. The hedge involves holding FX, so under the domestic measure the asset's drift picks up a quanto correction −ρσ_Sσ_X: correlation is literally priced into the drift.",
    formulas: [
      { tex: R`b_{\text{quanto}} = r_f - q - \rho\,\sigma_S\,\sigma_X` },
      { tex: R`C = \bar{X}\; C_{BS}(S, K, \sigma_S;\; b_{\text{quanto}},\; r_d)` },
    ],
    related: ["inst-foreign-equity", "correlation"],
  },
  {
    id: "inst-exchange", eyebrow: "Instruments", title: "Exchange option (Margrabe, 1978)",
    intuition: "The right to swap asset 2 for asset 1: payoff max(S₁ − S₂, 0). Margrabe's trick is to price in units of asset 2 — then the option is an ordinary call struck at 1 on the RATIO S₁/S₂, whose volatility is the volatility of the ratio. No strike parameter exists; the second asset is the strike.",
    formulas: [
      { tex: R`w = S_1 e^{(b_1-r)\tau} N(d_1) - S_2 e^{(b_2-r)\tau} N(d_2)` },
      { tex: R`\sigma^2 = \sigma_1^2 + \sigma_2^2 - 2\rho\,\sigma_1\sigma_2` },
    ],
    related: ["inst-rainbow", "correlation"],
  },
  {
    id: "inst-forward-start", eyebrow: "Instruments", title: "Forward-start option (Rubinstein, 1990)",
    intuition: "The strike is not known today: it will be set at t₁ as α times the then-spot. Because the Black–Scholes price is homogeneous of degree one in (S, K), the t₁-value is a known multiple of S(t₁) — and today's value follows by discounting that multiple. Strings of forward-starts make cliquets.",
    formulas: [{ tex: R`V = S e^{(b-r)t_1}\; C_{BS}(1, \alpha, \tau - t_1)` }],
    related: ["forward-start-alpha"],
  },
  {
    id: "inst-barrier", eyebrow: "Instruments", title: "Barrier options (Reiner–Rubinstein, 1991)",
    intuition: "A vanilla with a life switch: knock-OUT dies if S touches H, knock-IN is born there. Since owning both an in and an out (same H, K, T) reconstructs the vanilla in every scenario, in + out = vanilla — the parity PayoffLab's tests enforce. Reflection arguments give closed forms for all eight variants; near H, an up-and-out call's delta swings violently negative as the option's death outweighs its moneyness.",
    formulas: [
      { tex: R`V_{\text{in}} + V_{\text{out}} = V_{\text{vanilla}}\quad (R = 0)` },
      { tex: R`\text{e.g.}\; C_{\text{do}} = C_{BS} - C_{\text{reflected}},\;\; \text{with}\;(H/S)^{2\mu}\;\text{reflection weights}` },
    ],
    related: ["barrier-level", "barrier-rebate"],
  },
  {
    id: "inst-lookback", eyebrow: "Instruments", title: "Lookback options",
    intuition: "Hindsight as a contract. Floating strike: buy at the path's minimum (call) or sell at its maximum (put) — never out of the money at expiry, and priced in closed form (Goldman–Sosin–Gatto). Fixed strike settles a vanilla against the path's extreme (Conze–Viswanathan). Both are path-dependent, so no terminal-payoff line exists; the value curve is shown instead. Mid-life valuation here uses the fresh-issue convention (running extremum not yet accrued).",
    formulas: [
      { tex: R`\text{floating call: } S_T - \min_{t\le T} S_t, \qquad \text{fixed call: } \max\bigl(\max_{t\le T} S_t - K, 0\bigr)` },
    ],
    related: ["path-dependent-payoff"],
  },
  {
    id: "inst-compound", eyebrow: "Instruments", title: "Compound options (Geske, 1979)",
    intuition: "An option on an option — the mathematics of instalments, extension rights and equity-as-option-on-firm-value. Exercise happens only if S clears the critical level S* at t₁ AND the underlying option pays at T₂, so the price involves the bivariate normal probability of both events, correlated by √(t₁/T₂).",
    formulas: [
      { tex: R`CoC = S e^{(b-r)T_2} M(z_1, y_1; \rho) - K_2 e^{-rT_2} M(z_2, y_2;\rho) - K_1 e^{-rt_1} N(y_2)` },
      { tex: R`\rho = \sqrt{t_1/T_2}, \qquad C_{BS}(S^*, K_2, T_2 - t_1) = K_1` },
    ],
    related: ["compound-structure"],
  },
  {
    id: "inst-chooser", eyebrow: "Instruments", title: "Chooser option",
    intuition: "At t₁ you decide whether your option is a call or a put (same K, T). Before an earnings date or an election you are buying the straddle's outcome without paying for both legs the whole way — the chooser is worth at least the dearer leg and at most the straddle, converging to the straddle as the choice date approaches expiry.",
    formulas: [
      { tex: R`w = C_{BS}(S,K,T) + \text{put-like term evaluated at } t_1`, caption: "Rubinstein's simple-chooser formula" },
      { tex: R`\max(C, P) \le w \le C + P` },
    ],
    related: ["concept-straddle"],
  },
  {
    id: "inst-rainbow", eyebrow: "Instruments", title: "Options on the max / min (Stulz, 1982)",
    intuition: "Two-colour rainbows: the payoff first picks the better (max) or worse (min) of two assets, then compares with K. A call on the min pays only if BOTH assets beat K — strongly correlation-loving; a call on the max is close to owning both calls less the min-call, which is exactly Stulz's decomposition and the identity the tests check.",
    formulas: [
      { tex: R`c_{\max} = c(S_1,K) + c(S_2,K) - c_{\min}(S_1,S_2,K)` },
      { tex: R`c_{\min} \text{ uses } M(\cdot,\cdot;\rho_1), M(\cdot,\cdot;\rho_2) \text{ bivariate terms}` },
    ],
    related: ["inst-exchange", "correlation"],
  },
  {
    id: "inst-asian", eyebrow: "Instruments", title: "Asian (average) options",
    intuition: "Settling on the AVERAGE price tames manipulation and smooths hedging — the workhorse of commodity and FX markets. The arithmetic average of lognormals has no closed-form law, so pricing is Monte Carlo; but the GEOMETRIC average stays lognormal (Kemna–Vorst), giving both a closed form and a superb control variate that PayoffLab uses to cut the Monte Carlo error dramatically. Averaging reduces effective volatility (σ/√3 in the continuous geometric case), so Asians are cheaper than vanillas.",
    formulas: [
      { tex: R`\text{payoff} = \max\!\Big(\tfrac{1}{n}\textstyle\sum_i S_{t_i} - K,\, 0\Big)` },
      { tex: R`\sigma_G = \sigma/\sqrt{3}, \qquad b_G = \tfrac{1}{2}\bigl(b - \sigma^2/6\bigr)`, caption: "Kemna–Vorst continuous geometric case" },
    ],
    related: ["path-dependent-payoff", "mc-settings"],
  },
  {
    id: "inst-basket", eyebrow: "Instruments", title: "Basket option",
    intuition: "An option on a weighted portfolio w₁S₁ + w₂S₂. Diversification inside the basket lowers its volatility below the weighted average of the components' vols — so a basket call is cheaper than the basket of calls, with the gap set by correlation. Priced by Monte Carlo on correlated paths.",
    formulas: [{ tex: R`\text{payoff} = \max\bigl(w_1 S_1(T) + w_2 S_2(T) - K,\; 0\bigr)` }],
    related: ["correlation", "mc-settings"],
  },
  {
    id: "inst-spread", eyebrow: "Instruments", title: "Spread option",
    intuition: "Pays on the DIFFERENCE S₁ − S₂ − K: crack spreads, spark spreads, basis trades. A difference of lognormals can go negative, so Black–Scholes cannot apply directly; Kirk's approximation absorbs K into the short asset and treats the ratio as lognormal. Low correlation widens the spread's distribution and raises the price — the opposite of the basket.",
    formulas: [
      { tex: R`\sigma_{\text{Kirk}}^2 = \sigma_1^2 - 2\rho\sigma_1\sigma_2 w + \sigma_2^2 w^2, \qquad w = \frac{F_2}{F_2 + K}` },
    ],
    related: ["spread-method", "correlation"],
  },
  {
    id: "inst-product", eyebrow: "Instruments", title: "Product option",
    intuition: "Pays on the PRODUCT S₁·S₂ — a foreign stock times an FX rate is the canonical example. Multiplying lognormals keeps you lognormal, so unlike the basket this one has an exact Black formula: the product's forward picks up an e^{ρσ₁σ₂T} covariance kicker, and the vols add in quadrature plus correlation.",
    formulas: [
      { tex: R`F_{\text{prod}} = F_1 F_2\, e^{\rho\sigma_1\sigma_2 \tau}, \qquad \sigma^2 = \sigma_1^2 + \sigma_2^2 + 2\rho\sigma_1\sigma_2` },
    ],
    related: ["inst-foreign-equity"],
  },
  {
    id: "inst-varswap", eyebrow: "Instruments", title: "Variance & volatility swaps",
    intuition: "A forward contract on realised variance: at expiry you exchange what volatility actually did for the strike — pure vega with no delta to manage, which is why desks use it to trade volatility as an asset class. Fair value needs only the model's expected integrated variance (exact under constant vol and Heston). The volatility swap settles on the square root and therefore carries a concavity correction: E[√V] < √E[V].",
    formulas: [
      { tex: R`V = N_{\text{var}}\bigl(\mathbb{E}[\bar\sigma^2] - K_{\text{var}}\bigr)e^{-r\tau}` },
      { tex: R`\mathbb{E}\!\left[\bar v\right]_{\text{Heston}} = \theta + (v_0-\theta)\frac{1 - e^{-\kappa T}}{\kappa T}` },
    ],
    related: ["greek-vega", "vol-heston"],
  },
  {
    id: "inst-fra", eyebrow: "Instruments", title: "Forward rate agreement",
    intuition: "Fix today the borrowing rate for a future period [T₁, T₂]. Value is the discounted difference between the curve's forward rate and your fixed K, times notional and year fraction — linear in the forward, which the r-axis chart shows as a near-straight line through the par point.",
    formulas: [
      { tex: R`f(T_1,T_2) = \frac{1}{\delta}\left(\frac{P(T_1)}{P(T_2)} - 1\right)` },
      { tex: R`V = N\,\delta\,\bigl(f - K\bigr)P(0,T_2)` },
    ],
    related: ["inst-swap", "fixed-rate"],
  },
  {
    id: "inst-swap", eyebrow: "Instruments", title: "Interest-rate swap",
    intuition: "Exchange fixed for floating on a schedule. The floating leg is worth par at inception (each coupon is the forward, discounted — telescoping to 1 − P(0,Tₙ)), so a payer swap's value is that minus the fixed annuity. Its slope against r is duration made visible; the zero crossing is the par swap rate.",
    formulas: [
      { tex: R`V_{\text{payer}} = N\Bigl[1 - P(0,T_n) - K \textstyle\sum_i \delta_i P(0,T_i)\Bigr]` },
      { tex: R`s_{\text{par}} = \frac{1 - P(0,T_n)}{\sum_i \delta_i P(0,T_i)}` },
    ],
    related: ["inst-swaption", "rate-vasicek"],
  },
  {
    id: "inst-capfloor", eyebrow: "Instruments", title: "Caps & floors",
    intuition: "A cap is a strip of call options (caplets) on successive floating rates: each period you are refunded any fixing above K. Insurance against rising rates; the floor is the mirror. Each caplet prices with Black-76 on the curve's forward rate, discounted from its payment date — the market's quoting standard.",
    formulas: [
      { tex: R`\text{caplet}_i = N\,\delta\,P(0,T_{i+1})\bigl[f_i N(d_1) - K N(d_2)\bigr]` },
    ],
    related: ["inst-black", "black-vol"],
  },
  {
    id: "inst-swaption", eyebrow: "Instruments", title: "Swaptions",
    intuition: "An option to ENTER a swap at rate K at expiry — the rates market's vanilla for hedging future financing. Black's formula applies to the forward swap rate, with the annuity as numéraire: the annuity multiplies the whole payoff because the rate difference is received on every payment date of the underlying swap.",
    formulas: [
      { tex: R`V_{\text{payer}} = N\,A\,\bigl[F\,N(d_1) - K\,N(d_2)\bigr], \qquad A = \textstyle\sum_i \delta_i P(0,T_i)` },
    ],
    related: ["inst-swap", "inst-black"],
  },
  {
    id: "inst-trs", eyebrow: "Instruments", title: "Total return swap",
    intuition: "Receive everything the equity does — price moves plus dividends — and pay a fixed rate on notional: full economic exposure with no shares changing hands, the classic synthetic-financing trade. Value tracks S/S₀ against the fixed leg's annuity; at inception the fair K sets it to zero.",
    formulas: [
      { tex: R`V = N\Bigl[\tfrac{S}{S_0} - P(0,T) - K\textstyle\sum_i \delta_i P(0,T_i)\Bigr]` },
    ],
    related: ["inst-swap"],
  },

  // =========================================================== HEDGING =====
  {
    id: "hedging-intro",
    eyebrow: "Hedging",
    title: "How to use the hedging panel",
    intuition:
      "Each action adds REAL, labelled legs to the portfolio, so the aggregate curves show the hedge working (and it can be undone). Delta-neutralise adds the underlying position that zeroes net delta — one click, flat value curve at spot. Delta–gamma adds an ATM option to kill curvature first, then re-zeroes delta. Vega hedge does the same for volatility risk. The simulation below then shows why hedging discretely, in a world that moves continuously, still leaves risk.",
    related: ["hedge-delta", "hedge-delta-gamma", "hedge-sim"],
  },
  {
    id: "hedge-delta",
    eyebrow: "Hedging",
    title: "Delta hedging",
    intuition:
      "Hold −Δ units of the underlying against the position and small moves in S cancel to first order: the value curve flattens at the current spot. The hedge is only locally right — gamma bends the curve away from flat as S moves, which is exactly the residual the delta–gamma hedge targets. In practice stock or futures are used because they cost no optionality.",
    formulas: [
      { tex: R`n_{\text{stock}} = -\Delta_{\text{portfolio}}` },
    ],
    related: ["greek-delta", "hedge-delta-gamma"],
  },
  {
    id: "hedge-delta-gamma",
    eyebrow: "Hedging",
    title: "Delta–gamma hedging",
    intuition:
      "The underlying has no gamma, so curvature must be bought or sold with another OPTION. Solve for the option quantity that zeroes net gamma, then re-zero delta with stock — a triangular 2×2 system. The result is flat to second order: locally immune to both direction and (small) movement, at the running cost of the added option's theta.",
    formulas: [
      { tex: R`n_{\text{opt}} = -\frac{\Gamma_{\text{pf}}}{\Gamma_{\text{opt}}}, \qquad n_{\text{stock}} = -\bigl(\Delta_{\text{pf}} + n_{\text{opt}}\Delta_{\text{opt}}\bigr)` },
    ],
    related: ["hedge-delta", "hedge-vega"],
  },
  {
    id: "hedge-vega",
    eyebrow: "Hedging",
    title: "Vega hedging",
    intuition:
      "Volatility risk, like gamma, can only be offset with instruments that HAVE it: options (or variance swaps). The panel sizes an ATM option to zero net vega, then repairs delta with stock. Note the by-product: hedging vega with one option also moves your gamma — with a single hedge instrument you cannot zero both unless their ratio happens to match, which is the practical reason books hedge with baskets of strikes.",
    formulas: [
      { tex: R`n_{\text{opt}} = -\frac{\mathcal{V}_{\text{pf}}}{\mathcal{V}_{\text{opt}}}` },
    ],
    related: ["greek-vega", "inst-varswap"],
  },
  {
    id: "hedge-sim",
    eyebrow: "Hedging",
    title: "The discrete delta-hedging simulation",
    intuition:
      "A seeded price path unfolds at the REALISED volatility while you re-hedge at fixed intervals using deltas from the MODEL volatility. Continuous re-hedging would lock in exactly zero P/L (that is Black–Scholes); discrete re-hedging leaves each interval's move unhedged beyond first order, producing a residual P/L of ½Γ(ΔS)² per step against the theta you collect or pay. Fewer re-hedges → wider dispersion (∝ 1/√n). Set hedge vol ≠ realised vol to see the other classic: hedging with the wrong σ leaks the vol difference through the gamma term.",
    formulas: [
      { tex: R`\delta\Pi_i \approx \Theta\,\delta t + \tfrac{1}{2}\Gamma\,(\delta S_i)^2` },
      { tex: R`\text{std}(\text{P\&L}) \sim \sqrt{\frac{\pi}{4\,n}}\;\mathcal{V}\,\sigma`, caption: "Kamal–Derman order of magnitude for n re-hedges" },
    ],
    related: ["greek-gamma", "greek-theta", "hedging-intro"],
  },

  // =========================================================== CONCEPTS ====
  {
    id: "concept-bull-call-spread",
    eyebrow: "Concepts",
    title: "The bull call spread",
    intuition:
      "Buy the 100 call, sell the 120 call: the short leg's premium subsidises the long one, capping profit at the spread width minus net cost and capping loss at that cost. Read the chart: break-even at K₁ + net premium; delta positive but humped between the strikes; gamma positive near K₁, NEGATIVE near K₂ — the same position is long convexity below and short it above, which the Pro sign-shading makes explicit.",
    formulas: [
      { tex: R`\text{max profit} = (K_2 - K_1) - c_{\text{net}}, \qquad \text{max loss} = c_{\text{net}}` },
      { tex: R`S_{BE} = K_1 + c_{\text{net}}` },
    ],
    related: ["greek-gamma", "net-premium"],
  },
  {
    id: "concept-straddle",
    eyebrow: "Concepts",
    title: "The long straddle",
    intuition:
      "Call plus put at the same strike: you do not care which way S goes, only that it GOES. The position is the purest retail expression of long volatility — maximum vega and gamma at the strike, paid for with double theta. Break-evens sit a full combined premium either side of K; between them, time is the enemy.",
    formulas: [
      { tex: R`S_{BE} = K \pm (c + p)` },
    ],
    related: ["greek-vega", "inst-chooser"],
  },
  {
    id: "concept-gamma-expiry",
    eyebrow: "Concepts",
    title: "Gamma explodes near expiry",
    intuition:
      "Sweep the time axis for an ATM option: as t → T, gamma at the strike grows like 1/(σS√τ) while vega dies like √τ. The economic reading: with an hour to expiry, the option is a coin flip whose delta snaps from 0 to 1 across a vanishing price interval — the terror of every pin-risk desk. This chart pair (gamma up, vega down) is the single most instructive picture in the Greeks.",
    formulas: [
      { tex: R`\Gamma_{\text{ATM}} \sim \frac{1}{S\sigma\sqrt{2\pi\tau}} \to \infty, \qquad \mathcal{V} \sim S\sqrt{\tau}\,n(d_1) \to 0` },
    ],
    related: ["greek-gamma", "greek-colour", "x-axis"],
  },
  {
    id: "concept-time-decay",
    eyebrow: "Concepts",
    title: "Time decay",
    intuition:
      "On the time axis, the value line of an ATM option slides down towards its intrinsic value — the annotated convergence at t = T. The slide is not linear: ATM time value decays like √τ, so the last weeks are the steepest. Overlay theta to see the instantaneous rate of that bleed.",
    formulas: [
      { tex: R`V_{\text{ATM}} \approx 0.4\, S\,\sigma\sqrt{\tau}`, caption: "The classic ATM approximation" },
    ],
    related: ["greek-theta", "payoff-vs-value"],
  },
  {
    id: "concept-delta-hedge",
    eyebrow: "Concepts",
    title: "Delta-hedging a short call",
    intuition:
      "You sold a call; delta-neutralise and the value curve flattens at spot. Now open the simulation: re-hedging daily, the hedged P/L hugs zero while the unhedged line swings with S. Look at the decomposition — every step you LOSE ½Γ(ΔS)² (you are short gamma: you buy high, sell low re-hedging) and EARN theta; over many steps the two nearly cancel, and their imperfect cancellation IS the hedging error.",
    related: ["hedge-sim", "hedge-delta", "greek-gamma"],
  },
  {
    id: "concept-bachelier",
    eyebrow: "Concepts",
    title: "Bachelier vs Black–Scholes",
    intuition:
      "Two models, one option, one chart. At the money and short-dated the curves coincide almost perfectly (with σ_N = σS); push far from the money and lognormal versus normal tails pull them apart — Black–Scholes prices the far OTM call higher because lognormal upside is unbounded and fat. The lesson: model choice is a WING phenomenon; the centre of the smile hardly cares.",
    related: ["model-bachelier", "model-bs"],
  },
  {
    id: "concept-digital",
    eyebrow: "Concepts",
    title: "Digital vs vanilla",
    intuition:
      "Side-by-side: the vanilla's payoff kinks at K, the digital's JUMPS. That discontinuity is a Greek factory — the digital's delta near expiry is a spike (a Dirac delta forming), and its gamma flips sign violently around the strike. Compare the two gamma overlays: what the vanilla spreads smoothly, the digital concentrates into an un-hedgeable point. This is why exotic desks decompose digitals into tight call spreads.",
    formulas: [
      { tex: R`C_{\text{dig}} = \lim_{\epsilon\to 0}\frac{C(K-\epsilon) - C(K+\epsilon)}{2\epsilon}\cdot Q` },
    ],
    related: ["inst-digital-cash", "greek-gamma"],
  },
];

export const LEARN_BY_ID: Record<string, LearnEntry> = Object.fromEntries(
  LEARN_ENTRIES.map((e) => [e.id, e]),
);

// ================================================================ GLOSSARY =
export interface GlossaryTerm {
  term: string;
  definition: string;
  learnId?: string;
}

export const GLOSSARY: GlossaryTerm[] = [
  { term: "American option", definition: "An option exercisable at any time up to expiry; priced on a lattice via backward induction.", learnId: "inst-amer" },
  { term: "Annuity (swap)", definition: "The value of receiving 1 per year on a swap's payment schedule: Σ δᵢ P(0,Tᵢ). The natural numéraire for swaptions.", learnId: "inst-swaption" },
  { term: "At the money (ATM)", definition: "Strike equal (or near) the current spot or forward. Where gamma and vega concentrate." },
  { term: "Barrier", definition: "A price level whose touch creates (knock-in) or destroys (knock-out) an option.", learnId: "inst-barrier" },
  { term: "Break-even", definition: "The terminal price at which the strategy's profit (payoff minus initial cost) is exactly zero.", learnId: "net-premium" },
  { term: "Carry (cost of, b)", definition: "The risk-neutral drift of the underlying: r − q for equities, r − r_f for FX, 0 for futures.", learnId: "model-bs" },
  { term: "Control variate", definition: "A Monte Carlo variance-reduction trick: simulate a related quantity with a known closed form and correct the estimate by the observed error.", learnId: "inst-asian" },
  { term: "Delta (Δ)", definition: "First derivative of value in the underlying: the hedge ratio.", learnId: "greek-delta" },
  { term: "Digital / binary", definition: "An option paying a fixed amount (or the asset) on an in-the-money finish — a bet on the event itself.", learnId: "inst-digital-cash" },
  { term: "Discount factor P(0,T)", definition: "Today's price of 1 paid at T; e^{−rT} on a flat curve, model-dependent otherwise.", learnId: "rate-constant" },
  { term: "Forward price", definition: "The fair delivery price for a forward contract: F = S·e^{(r−q)T}.", learnId: "inst-forward" },
  { term: "Gamma (Γ)", definition: "Second derivative of value in the underlying: convexity, the rate delta changes.", learnId: "greek-gamma" },
  { term: "Greeks", definition: "The partial derivatives of a position's value with respect to market inputs — the local map of its risk." },
  { term: "Implied volatility", definition: "The σ that makes a model price match a market price; the market's quoting currency for options.", learnId: "vol-smile" },
  { term: "Intrinsic value", definition: "The payoff if exercised now: max(S−K, 0) for a call. The floor to which time value decays.", learnId: "payoff-vs-value" },
  { term: "Knock-in / knock-out", definition: "Barrier events: activation or extinction of the option when S touches H.", learnId: "inst-barrier" },
  { term: "Lognormal", definition: "The distribution of S under GBM: log-returns are normal, prices stay positive.", learnId: "model-bs" },
  { term: "Margrabe option", definition: "The right to exchange one asset for another; priced with the ratio's volatility, no cash strike.", learnId: "inst-exchange" },
  { term: "Moneyness", definition: "Where spot stands relative to strike, often ln(S/K) or S/K; the natural coordinate of the smile." },
  { term: "Monte Carlo", definition: "Pricing by simulating many risk-neutral paths and averaging discounted payoffs; error shrinks as 1/√paths.", learnId: "mc-settings" },
  { term: "Numéraire", definition: "The asset in whose units values are measured; changing it (money market → annuity → asset 2) is the trick behind Black-76, swaption pricing and Margrabe." },
  { term: "Par rate", definition: "The fixed rate that values a swap to zero at inception.", learnId: "inst-swap" },
  { term: "Path-dependent", definition: "A payoff depending on the whole trajectory (average, extremum, barrier touch), not just the terminal price.", learnId: "path-dependent-payoff" },
  { term: "Pin risk", definition: "The hedging hazard of S sitting exactly at strike near expiry, where delta is undefined-in-practice and gamma explodes.", learnId: "concept-gamma-expiry" },
  { term: "Put–call parity", definition: "C − P = forward: a model-free identity from no-arbitrage.", learnId: "put-call-parity" },
  { term: "Rebate", definition: "A consolation payment attached to a barrier event.", learnId: "inst-barrier" },
  { term: "Rho (ρ)", definition: "Sensitivity of value to the interest rate.", learnId: "greek-rho" },
  { term: "Risk-neutral measure", definition: "The probability measure under which discounted asset prices are martingales; prices are discounted expectations under it.", learnId: "model-bs" },
  { term: "Skew / smile", definition: "The strike-dependence of implied volatility; downward-sloping in equities, smile-shaped in FX.", learnId: "vol-smile" },
  { term: "Straddle", definition: "Call plus put at one strike: pure long volatility.", learnId: "concept-straddle" },
  { term: "Term structure", definition: "The maturity-dependence of a quantity — rates, forward prices or volatility.", learnId: "vol-term" },
  { term: "Theta (Θ)", definition: "The drift of value with calendar time: time decay.", learnId: "greek-theta" },
  { term: "Time value", definition: "Option value above intrinsic — the price of remaining optionality.", learnId: "concept-time-decay" },
  { term: "Vega (ν)", definition: "Sensitivity of value to volatility.", learnId: "greek-vega" },
  { term: "Volatility (realised vs implied)", definition: "What the asset actually did versus what options currently price; variance swaps settle the difference.", learnId: "inst-varswap" },
];
