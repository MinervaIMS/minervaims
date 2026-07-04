// PayoffLab Learn drawer content (§10). A rigorous, readable derivatives
// textbook in UK English. Every entry follows the same arc: plain-English
// intuition first, then the key formulas (KaTeX), then the assumptions, and,
// where it earns its keep, a mathematical appendix. Entry ids are referenced
// by every ⓘ affordance in the tool.

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
    title: "Delta, the hedge ratio",
    intuition:
      "Delta answers the most basic question you can ask of a position: if the underlying price rises by one unit, how much does my position gain or lose? Geometrically it is the slope of the value curve. A delta of 0.61 means that a rise of 1 in S adds roughly 0.61 of value, before any second-order effects. Delta is also the hedge ratio: to neutralise the directional risk of the position you would sell 0.61 units of the underlying against it. For a call, delta runs from about 0 (deep out of the money, the option barely reacts) to about 1 (deep in the money, the option behaves like the stock itself), and it passes through roughly one half at the money.",
    formulas: [
      { tex: R`\Delta = \frac{\partial V}{\partial S}` },
      { tex: R`\Delta_{\text{call}} = e^{(b-r)\tau}\,N(d_1), \qquad \Delta_{\text{put}} = e^{(b-r)\tau}\,\bigl(N(d_1)-1\bigr)`, caption: "Generalised Black–Scholes, with b the cost of carry" },
      { tex: R`d_1 = \frac{\ln(S/K) + (b + \tfrac{1}{2}\sigma^2)\tau}{\sigma\sqrt{\tau}}` },
    ],
    assumptions: [
      "This is a model delta: it is computed under the dynamics of the pricing model you selected.",
      "A portfolio's delta is the signed, quantity-weighted sum of its legs' deltas.",
      "PayoffLab reports the raw derivative, value change per unit change in S.",
    ],
    appendix: {
      title: "Derivation for the Black–Scholes call",
      body:
        "Differentiate C = S·e^{(b−r)τ}N(d₁) − K·e^{−rτ}N(d₂) with respect to S. Two chain-rule terms appear, one from each N(·). They cancel exactly through the identity below, and what remains is the clean result Δ = e^{(b−r)τ}N(d₁).",
      tex: [R`S\,e^{(b-r)\tau} n(d_1) = K e^{-r\tau} n(d_2), \qquad \frac{\partial d_1}{\partial S}=\frac{\partial d_2}{\partial S}=\frac{1}{S\sigma\sqrt{\tau}}`],
    },
    related: ["greek-gamma", "hedge-delta"],
  },
  {
    id: "greek-gamma",
    eyebrow: "The Greeks",
    title: "Gamma, the convexity",
    intuition:
      "Gamma is the curvature of the value curve: the rate at which delta itself changes as the underlying moves. It is the reason a delta hedge does not stay hedged. If you are long options you are long gamma, and your delta drifts in your favour: it grows when the market rallies and shrinks when it falls, so a delta-hedged long option position makes money from movement in either direction. Short options carry the opposite burden. Gamma concentrates around the strike, and as expiry approaches it spikes there while collapsing everywhere else. That spike is the phenomenon the 'gamma near expiry' example is built around.",
    formulas: [
      { tex: R`\Gamma = \frac{\partial^2 V}{\partial S^2} = \frac{\partial \Delta}{\partial S}` },
      { tex: R`\Gamma = \frac{e^{(b-r)\tau}\, n(d_1)}{S\,\sigma\sqrt{\tau}}`, caption: "Identical for calls and puts" },
    ],
    assumptions: [
      "Gamma is the same for a call and a put with the same strike and expiry, because put-call parity differs only by terms that are linear in S.",
      "Sign convention: long options have positive gamma, short options negative.",
    ],
    appendix: {
      title: "Gamma and the hedging error",
      body:
        "Over a small move ΔS, a delta-hedged book earns approximately ½Γ(ΔS)². This is why discrete re-hedging leaves a residual profit or loss with a gamma shape: each interval's move beyond first order is simply unhedged. The hedging simulation decomposes every step of its path into exactly this term plus the theta term.",
      tex: [R`\delta \Pi \approx \Theta\,\delta t + \tfrac{1}{2}\Gamma\,(\delta S)^2`],
    },
    related: ["greek-speed", "greek-colour", "hedge-sim"],
  },
  {
    id: "greek-theta",
    eyebrow: "The Greeks",
    title: "Theta, the time decay",
    intuition:
      "Theta measures how the value of the position drifts as calendar time passes while everything else stays frozen. For a long option theta is usually negative: optionality is a wasting asset, and its time value bleeds away towards intrinsic value as expiry approaches. Theta is best understood not as a risk in itself but as a price. In a delta-hedged book it is the rent you pay (or collect) for holding gamma and vega: under Black–Scholes a hedged position satisfies Θ ≈ −½Γσ²S², so what you lose to the calendar you expect to earn back from movement. PayoffLab reports theta per year; divide by 365 for the per-day figure traders usually quote.",
    formulas: [
      { tex: R`\Theta = \frac{\partial V}{\partial t} = -\frac{\partial V}{\partial \tau}` },
      { tex: R`\Theta_{\text{call}} = -\frac{S e^{(b-r)\tau} n(d_1)\sigma}{2\sqrt{\tau}} - (b-r)S e^{(b-r)\tau}N(d_1) - rKe^{-r\tau}N(d_2)` },
    ],
    related: ["greek-gamma", "concept-time-decay"],
  },
  {
    id: "greek-vega",
    eyebrow: "The Greeks",
    title: "Vega, the volatility sensitivity",
    intuition:
      "Vega is the derivative of value with respect to the volatility input. Long options are long vega, because more uncertainty makes optionality more valuable. Vega peaks near the money and grows with time to expiry, which is why long-dated at-the-money options are the natural instruments for trading volatility. Mind the units: PayoffLab reports the raw derivative per unit of σ, so divide by 100 to get the 'per volatility point' figure quoted on trading desks.",
    formulas: [
      { tex: R`\mathcal{V} = \frac{\partial V}{\partial \sigma} = S e^{(b-r)\tau} n(d_1)\sqrt{\tau}`, caption: "Identical for calls and puts" },
    ],
    assumptions: [
      "Vega treats σ as a parameter that can be bumped. That is fully coherent inside Black–Scholes; under stochastic volatility it is an approximation, and the second-order Greeks vanna and vomma describe how it breaks down.",
    ],
    related: ["greek-vomma", "greek-vanna", "inst-varswap"],
  },
  {
    id: "greek-rho",
    eyebrow: "The Greeks",
    title: "Rho, the rate sensitivity",
    intuition:
      "Rho measures sensitivity to the interest rate. For short-dated equity options it is usually the smallest of the first-order Greeks. For rate-sensitive instruments such as swaps, FRAs and caps it is the entire story: their value-against-r chart is essentially a picture of rho. Calls gain from higher rates, because the strike is paid later and is therefore discounted more heavily; puts lose for the same reason.",
    formulas: [
      { tex: R`\rho = \frac{\partial V}{\partial r}` },
      { tex: R`\rho_{\text{call}} = K\,\tau\, e^{-r\tau} N(d_2)`, caption: "Black–Scholes, holding the dividend yield fixed" },
    ],
    related: ["inst-swap", "rate-vasicek"],
  },
  {
    id: "greek-vanna",
    eyebrow: "Second-order Greeks",
    title: "Vanna: how delta reacts to volatility",
    intuition:
      "Vanna is the cross-derivative between spot and volatility. It tells you two equivalent things at once: how your delta moves when volatility changes, and how your vega moves when spot changes (the two mixed partial derivatives are the same number). Trading desks watch vanna closely because volatility surfaces move together with spot: on an equity index, a sell-off usually lifts implied volatility, and a book with the wrong vanna finds its delta hedge quietly drifting against it. Vanna is largest away from the money and close to zero at the money.",
    formulas: [
      { tex: R`\text{Vanna} = \frac{\partial^2 V}{\partial S\,\partial\sigma} = -e^{(b-r)\tau} n(d_1)\frac{d_2}{\sigma}` },
    ],
    related: ["greek-vomma", "vol-sabr"],
  },
  {
    id: "greek-vomma",
    eyebrow: "Second-order Greeks",
    title: "Vomma (volga): convexity in volatility",
    intuition:
      "Vomma is the second derivative of value with respect to volatility. A position with positive vomma gains more from a rise in volatility than it loses from an equal fall, so it benefits when volatility is itself volatile. Out-of-the-money options carry the most vomma, which explains a classic structure: a butterfly (long the wings, short the body) isolates exposure to the volatility of volatility.",
    formulas: [
      { tex: R`\text{Vomma} = \frac{\partial^2 V}{\partial \sigma^2} = \mathcal{V}\,\frac{d_1 d_2}{\sigma}` },
    ],
    related: ["greek-vega", "vol-heston"],
  },
  {
    id: "greek-charm",
    eyebrow: "Second-order Greeks",
    title: "Charm: delta decay",
    intuition:
      "Charm is the drift of delta with the passage of time, holding everything else fixed. As expiry approaches, an in-the-money option's delta migrates towards 1 (exercise becomes near-certain) and an out-of-the-money option's delta migrates towards 0. Charm measures the speed of that overnight migration. It matters in practice because it forces even a book that has not moved at all to re-hedge every morning.",
    formulas: [
      { tex: R`\text{Charm} = \frac{\partial \Delta}{\partial t} = \frac{\partial^2 V}{\partial S\,\partial t}` },
    ],
    related: ["greek-delta", "greek-colour"],
  },
  {
    id: "greek-speed",
    eyebrow: "Second-order Greeks",
    title: "Speed: how gamma changes with spot",
    intuition:
      "Speed is the third derivative of value in S, or equivalently the slope of the gamma curve. It warns a hedger that the gamma being hedged is itself unstable: a gamma hedge sized at today's spot will be wrong after a move, and speed says how wrong. Speed is most violent on the flanks of the gamma peak, close to the strike and close to expiry.",
    formulas: [
      { tex: R`\text{Speed} = \frac{\partial^3 V}{\partial S^3} = -\frac{\Gamma}{S}\left(\frac{d_1}{\sigma\sqrt{\tau}} + 1\right)` },
    ],
    related: ["greek-gamma"],
  },
  {
    id: "greek-colour",
    eyebrow: "Second-order Greeks",
    title: "Colour: gamma decay",
    intuition:
      "Colour is the drift of gamma with time. As expiry approaches, gamma redistributes itself: it explodes at the strike and dies everywhere else. Colour is the rate of that redistribution. It tells a trader how today's gamma profile will have deformed by tomorrow morning, before the market has even moved.",
    formulas: [
      { tex: R`\text{Colour} = \frac{\partial \Gamma}{\partial t} = \frac{\partial^3 V}{\partial S^2\,\partial t}` },
    ],
    related: ["greek-gamma", "concept-gamma-expiry"],
  },

  // ====================================================== CORE CONCEPTS ====
  {
    id: "payoff-vs-value",
    eyebrow: "Reading the chart",
    title: "Payoff at expiry versus present value now",
    intuition:
      "The two principal lines answer two different questions. The payoff line reads the contract literally at expiry: it is piecewise linear, needs no model at all, and is the picture you could draw with a pencil and the term sheet. The value line answers what the position is worth today under the selected pricing model: a smooth curve whose slope is delta and whose curvature is gamma. The vertical gap between the two lines is time value, and if you sweep the time axis you can watch that gap close. One convention to know: when legs expire on different dates, the payoff is drawn at the first expiry, with the surviving legs valued by the model on that date. That is the standard treatment for calendar-style positions.",
    formulas: [
      { tex: R`\text{payoff}_{\text{call}}(S_T) = \max(S_T - K, 0)` },
      { tex: R`V_t = e^{-r\tau}\,\mathbb{E}^{\mathbb{Q}}\!\left[\,\text{payoff}(S_T)\,\right]`, caption: "Risk-neutral valuation" },
    ],
    related: ["net-premium", "x-axis"],
  },
  {
    id: "net-premium",
    eyebrow: "Reading the chart",
    title: "Net premium: the profit convention",
    intuition:
      "With the Net premium toggle on, both lines are shifted down by the portfolio's initial cost, so the chart shows profit and loss rather than gross value. This is the convention of every textbook strategy diagram, and it is the convention under which break-evens and maximum profit or loss are meaningful numbers. Switch the toggle off to see raw values instead; the shapes are identical, only the zero line moves.",
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
      "Every chart sweeps exactly one variable along the horizontal axis and freezes everything else at the fixed-parameter values in the rail. Price S gives the classic payoff diagram and is the default. Time t gives the decay view: you watch the value converge to intrinsic value as expiry approaches, while gamma and vega reshape along the way. Rate r is the natural axis for swaps, FRAs, caps and swaptions. It is the same portfolio in all three cases; you are simply taking different cross-sections through it.",
    related: ["payoff-vs-value", "crosshair"],
  },
  {
    id: "crosshair",
    eyebrow: "Reading the chart",
    title: "The crosshair",
    intuition:
      "Hover over any chart and a vertical guide follows the cursor, intersecting every visible line; the legend underneath shows each line's exact value at that x. The values are interpolated locally from the sampled curves, so the readout is instant and never waits for the server. The arrow keys nudge the crosshair in fine steps, and Shift with an arrow key snaps it to the next strike or break-even. The sync toggle in the rail locks the crosshair position across all charts, which is the quickest way to compare two strategies at the same spot.",
    related: ["x-axis"],
  },
  {
    id: "level-switch",
    eyebrow: "The tool",
    title: "Basic, Advanced and Pro",
    intuition:
      "The level switch controls how much of the tool is exposed; it never changes the mathematics underneath. Basic covers the building blocks: cash, stock, forwards, futures and vanilla options, with delta and gamma and the most guidance. Advanced unlocks the exotic instruments, the FX family, Monte Carlo pricing and the model selectors, each with a full assumptions panel. Pro adds the complete second-order Greek set with sign-region shading, plus the hedging analytics. Move up whenever you are curious; nothing you have built is lost when you switch.",
  },
  {
    id: "sign-shading",
    eyebrow: "Reading the chart",
    title: "Sign-region shading",
    intuition:
      "When a Greek overlay is active, sign shading tints the chart background wherever that Greek is positive (a faint green) or negative (a faint red). The point is to make regime boundaries legible at a glance: for a call spread, for instance, you can see immediately where the book is long convexity and where it flips short. The tint is never the only signal; the crosshair always gives the exact signed value, so nothing depends on colour alone.",
    related: ["greek-gamma"],
  },
  {
    id: "path-dependent-payoff",
    eyebrow: "Reading the chart",
    title: "Why there is no payoff line here",
    intuition:
      "This portfolio contains a path-dependent claim, such as an Asian, a lookback or a variance leg. Its settlement depends on the entire trajectory the price takes, not just on where it ends, so a line of 'payoff against terminal price' is mathematically undefined: two paths can end at the same S and pay completely different amounts. Rather than fail silently, PayoffLab plots the mark-to-market value curve instead. For Monte Carlo instruments that is the simulated present value against the swept variable.",
    related: ["inst-asian", "inst-lookback"],
  },
  {
    id: "put-call-parity",
    eyebrow: "Core results",
    title: "Put-call parity",
    intuition:
      "Hold a call and sell a put with the same strike and expiry, and at expiry you will buy the asset at K no matter what happens: the combination is a forward, so its price today must equal the forward's price. No model is required, only the absence of arbitrage. Parity is the first sanity check applied to any pricing engine (PayoffLab's test suite enforces it), and it explains why gamma and vega are identical for calls and puts: the two contracts differ only by terms that are linear in S.",
    formulas: [
      { tex: R`C - P = S e^{(b-r)\tau} - K e^{-r\tau}` },
    ],
  },

  // ========================================================= PARAMETERS ====
  { id: "spot", eyebrow: "Parameters", title: "Spot price S", intuition: "The current price of the underlying, and the default x-axis. When S is the swept variable this fixed input still matters: it sets the reference point for the readout panel and the automatic plotting range of plus or minus fifty per cent." },
  { id: "strike", eyebrow: "Parameters", title: "Strike K", intuition: "The price at which the option allows you to trade. Everything interesting in an option's geometry happens at the strike: the kink in the payoff, the peak in gamma, the cliff in a digital. Vertical guides mark each leg's strike on the chart so you can attribute what you see to the leg that causes it." },
  { id: "maturity", eyebrow: "Parameters", title: "Maturity T", intuition: "Time to expiry, measured in years, with continuous compounding used throughout. More time usually means more option value, because more can happen; it also means heavier discounting of fixed cash flows. On the time axis you watch the remaining life T − t shrink to zero." },
  { id: "rate", eyebrow: "Parameters", title: "Interest rate r", intuition: "The continuously compounded risk-free rate. It plays two roles at once: e^{−rτ} discounts every future cash flow, and r (net of the yield q) is the drift of the underlying in the risk-neutral world used for pricing. The textbook default here is five per cent." },
  { id: "volatility", eyebrow: "Parameters", title: "Volatility σ", intuition: "The annualised standard deviation of the underlying's log-returns. It is the one input you cannot read off any screen, and precisely for that reason it is the market's real currency for options. The textbook default is twenty per cent. Under some model selections this headline σ is reinterpreted, for instance as the starting volatility of a Heston simulation." },
  { id: "dividend-yield", eyebrow: "Parameters", title: "Dividend yield q", intuition: "A continuous income from holding the asset: dividend payments for equities, the foreign interest rate for currencies, storage and convenience considerations for commodities. It lowers the forward price S·e^{(r−q)τ}, which makes calls cheaper and puts dearer.", formulas: [{ tex: R`b = r - q` }] },
  { id: "call-put", eyebrow: "Parameters", title: "Call or put", intuition: "A call is the right to buy at K, a bullish position with unlimited upside. A put is the right to sell at K, a bearish position whose payoff is capped at K. The two are tied together by put-call parity, so nothing about one is independent of the other.", related: ["put-call-parity"] },
  { id: "notional", eyebrow: "Parameters", title: "Notional", intuition: "The face amount on which a swap's or deposit's cash flows are computed. Rate instruments in PayoffLab quote value per this notional; use the leg quantity to scale positions up or down." },
  { id: "second-asset", eyebrow: "Parameters", title: "The second asset", intuition: "Two-asset instruments treat the chart's S as asset 1 and hold asset 2 fixed at its input S₂, with its own volatility σ₂ and yield q₂. The chart you see is therefore a cross-section: the value against S₁, assuming S₂ stays where it is." },
  { id: "correlation", eyebrow: "Parameters", title: "Correlation ρ", intuition: "The instantaneous correlation between the two assets' returns, and the decisive price-maker for multi-asset options. A spread option wants LOW correlation, because the two legs then fly apart and the spread widens. A basket call prefers HIGH correlation, because the sum then moves as one. The textbook default is 0.5; drag it and watch the price react." },
  { id: "digital-payout", eyebrow: "Parameters", title: "Digital payout", intuition: "The fixed cash amount a cash-or-nothing digital pays when it finishes in the money. The option's value is simply this payout times the discounted risk-neutral probability of the event." },
  { id: "foreign-rate", eyebrow: "Parameters", title: "Foreign rate r_f", intuition: "In currency markets, holding the foreign currency earns the foreign interest rate. That income plays exactly the role a dividend yield plays for a stock, which is why Garman–Kohlhagen is Black–Scholes with the carry b = r_d − r_f." },
  { id: "fx-spot", eyebrow: "Parameters", title: "FX rate", intuition: "Units of domestic currency per unit of foreign currency. For a quanto the relevant input is instead X̄, the fixed conversion rate written into the contract: currency risk is removed by contract, and the model pays for that with a drift correction." },
  { id: "fx-vol", eyebrow: "Parameters", title: "FX volatility σ_X", intuition: "The volatility of the exchange rate. For composite options it combines with the asset's volatility (in quadrature, plus a correlation term); for quantos it enters only through the covariance term ρσ_Sσ_X in the drift correction." },
  { id: "discrete-dividend", eyebrow: "Parameters", title: "Discrete dividend", intuition: "A single known cash dividend paid at a known date. The lattice handles it with the escrowed-dividend method: the tree diffuses the share price minus the dividend's present value, and adds it back when checking early exercise. A large enough dividend makes it rational to exercise an American call just before the shares go ex-dividend, which is the classic exception to the rule of never exercising a call early." },
  { id: "barrier-direction", eyebrow: "Parameters", title: "Barrier type", intuition: "Two independent choices. Down or up says where the barrier sits relative to today's spot. In or out says what touching it does: a knock-in creates the option, a knock-out destroys it. Combined with call or put, this gives eight variants, and all eight are priced in closed form." },
  { id: "barrier-level", eyebrow: "Parameters", title: "Barrier H", intuition: "The trigger level, monitored continuously. The closer H sits to spot, the larger the discount of a knock-out relative to the vanilla, and the wilder the behaviour of delta near the barrier. The default places the barrier twenty per cent away from spot." },
  { id: "barrier-rebate", eyebrow: "Parameters", title: "Rebate", intuition: "A consolation payment attached to the barrier event: paid at the moment of knock-out for out options, or at expiry for a knock-in that never activated." },
  { id: "compound-structure", eyebrow: "Parameters", title: "Compound structure", intuition: "Which option sits on top of which. A call-on-call is the right to BUY the underlying call at t₁ for K₁; a put-on-put is the right to SELL the underlying put. Two exercise decisions have to be evaluated together, which is why the price involves bivariate normal probabilities." },
  { id: "rainbow-kind", eyebrow: "Parameters", title: "Max or min payoff", intuition: "A call on the max pays on the better of the two assets, so it is expensive, and correlation hurts it. A call on the min pays only if BOTH assets finish above K, so it is much cheaper, and correlation helps it. Comparing the two prices while you drag ρ is the fastest way to build intuition for multi-asset optionality." },
  { id: "basket-weights", eyebrow: "Parameters", title: "Basket weights", intuition: "The portfolio weights inside the basket; the option pays on w₁S₁ + w₂S₂. A weighted sum of lognormal prices has no closed-form distribution, which is the reason baskets are priced by Monte Carlo." },
  { id: "spread-method", eyebrow: "Parameters", title: "Kirk versus Monte Carlo", intuition: "Kirk's approximation treats the combination S₂ + K as if it were a single lognormal asset, which prices spread options quickly and accurately for moderate strikes. The Monte Carlo mode is exact up to sampling error. PayoffLab's test suite keeps the two within tolerance of each other, and you can switch between them to see the difference for yourself." },
  { id: "variance-strike", eyebrow: "Parameters", title: "Variance-swap strike", intuition: "Quoted in volatility terms as K_vol; the contract settles realised variance against K_vol squared. The fair strike at inception is the one that makes the swap worth zero." },
  { id: "fixed-rate", eyebrow: "Parameters", title: "Fixed rate K", intuition: "The contractual fixed leg of a swap or FRA, or the strike rate of a cap or swaption. When K equals the par rate the swap is worth exactly zero, and on the rate axis you can see that par point as the zero crossing of the value line." },
  { id: "tenor", eyebrow: "Parameters", title: "Tenor and frequency", intuition: "How long the instrument's payment schedule runs and how often it pays or resets. Longer tenors mean larger annuities, and larger annuities mean more rate sensitivity. This is duration, drawn as a line." },
  { id: "black-vol", eyebrow: "Parameters", title: "Black volatility", intuition: "The lognormal volatility of the FORWARD rate used by Black's 1976 formula inside caps and swaptions. It is the market's quoting convention for interest-rate options." },
  { id: "forward-start-alpha", eyebrow: "Parameters", title: "Strike ratio α", intuition: "The strike will be fixed at t₁ as α times the spot price at that moment. With α = 1 the option starts its life exactly at the money, which is the building block of cliquet structures; with α below 1 the call starts in the money. The closed form exists because the pricing formula is homogeneous in the pair (S, K)." },
  { id: "mc-settings", eyebrow: "Parameters", title: "Monte Carlo settings", intuition: "Paths times steps buys accuracy with computing time; the standard error of the estimate shrinks like one over the square root of the number of paths. The seed makes every run reproducible. One detail matters for reading the charts: the same random numbers are reused across the whole grid and all the Greek bumps (the common-random-numbers technique), which is why Monte Carlo curves here look smooth rather than jittery." },
  { id: "tree-steps", eyebrow: "Parameters", title: "Lattice steps", intuition: "More steps bring the tree price closer to the continuous-time price, with an error of order one over the number of steps. You can watch the convergence happen in the binomial-versus-Black–Scholes comparison overlay. Around two hundred steps is ample for teaching accuracy." },

  // ============================================================ MODELS =====
  {
    id: "model-bs",
    eyebrow: "Pricing models",
    title: "Black–Scholes–Merton (1973)",
    intuition:
      "The canonical option model rests on one deep idea. If you can trade the underlying continuously and without friction, you can rebalance a stock-plus-option portfolio so that its risk vanishes moment by moment; a riskless portfolio must earn the riskless rate, and that single statement pins down the option price completely. The trader's appetite for risk never enters. The result is a closed formula in five inputs. Every other model in PayoffLab is best understood as this one with a single assumption relaxed: Bachelier changes the distribution, Merton adds jumps, Heston frees the volatility, the lattices discretise time. The generalised form with cost of carry b also covers Merton's dividend version (b = r − q), Black's futures version (b = 0) and Garman–Kohlhagen for currencies (b = r − r_f).",
    formulas: [
      { tex: R`dS_t = \mu S_t\,dt + \sigma S_t\,dW_t`, caption: "The assumed dynamics: geometric Brownian motion" },
      { tex: R`\frac{\partial V}{\partial t} + \tfrac{1}{2}\sigma^2 S^2 \frac{\partial^2 V}{\partial S^2} + b S \frac{\partial V}{\partial S} - rV = 0`, caption: "The pricing equation every derivative must satisfy" },
      { tex: R`C = S e^{(b-r)\tau} N(d_1) - K e^{-r\tau} N(d_2)` },
      { tex: R`d_{1,2} = \frac{\ln(S/K) + (b \pm \tfrac{1}{2}\sigma^2)\tau}{\sigma\sqrt{\tau}}` },
    ],
    assumptions: [
      "The underlying follows geometric Brownian motion: lognormal prices, constant volatility, continuous paths with no jumps.",
      "The interest rate and the carry are constant and known.",
      "Markets are frictionless: continuous trading, no transaction costs, unlimited borrowing and short selling.",
      "European exercise for the closed form.",
    ],
    appendix: {
      title: "Sketch of the replication argument",
      body:
        "Hold the option and short Δ = ∂V/∂S units of the stock. Apply Itô's lemma to the option value: the random dW terms of the option and the stock position cancel exactly, leaving a deterministic drift. A portfolio with no risk must earn the risk-free rate r, and writing that equality out is precisely the partial differential equation above. Solving it with the terminal condition max(S−K, 0) yields the formula; equivalently, the price is the discounted expectation of the payoff under the risk-neutral measure.",
    },
    related: ["model-bachelier", "model-jump", "put-call-parity"],
  },
  {
    id: "model-bachelier",
    eyebrow: "Pricing models",
    title: "Bachelier's normal model (1900)",
    intuition:
      "Five years before Einstein's paper on Brownian motion, Louis Bachelier priced options in his doctoral thesis by assuming that prices themselves, not returns, follow a random walk. Price CHANGES are then normally distributed, and prices can go negative. That is nonsense for a stock, but it is exactly right for anything that can genuinely change sign: spreads between two prices, and occasionally prices themselves, as in April 2020 when oil futures traded below zero and the entire market switched to Bachelier quoting overnight. Near the money and over short horizons the two models agree closely once the scales are matched by σ_N = σ·S; the disagreement lives in the tails, where normal and lognormal distributions differ most.",
    formulas: [
      { tex: R`dS_t = \sigma_N\, dW_t` },
      { tex: R`C = e^{-r\tau}\left[(F-K)\,N(d) + \sigma_N\sqrt{\tau}\; n(d)\right], \qquad d = \frac{F-K}{\sigma_N\sqrt{\tau}}` },
    ],
    assumptions: [
      "Normal (absolute) volatility σ_N, in currency units per square-root year. PayoffLab maps your σ input as σ_N = σ·S₀ so the two models are directly comparable on one chart.",
      "Prices may go negative: a feature for spreads and rates, a defect for equities.",
    ],
    related: ["model-bs", "concept-bachelier"],
  },
  {
    id: "model-jump",
    eyebrow: "Pricing models",
    title: "Merton's jump-diffusion (1976)",
    intuition:
      "Real markets gap. Crashes do not arrive as a rapid sequence of small moves but as discontinuous jumps, and no diffusion can produce them. Merton's extension adds jumps at random (Poisson) times with lognormal sizes on top of the usual diffusion. The elegant part is the pricing: conditional on how many jumps occur, the model is simply Black–Scholes with adjusted inputs, so the price is a Poisson-weighted average of Black–Scholes prices. The observable consequence is a volatility smile: out-of-the-money options are worth more than constant-volatility Black–Scholes says, because jumps make the tails fat.",
    formulas: [
      { tex: R`\frac{dS_t}{S_{t^-}} = (b - \lambda \bar{k})\,dt + \sigma\, dW_t + (J-1)\,dN_t` },
      { tex: R`C = \sum_{n=0}^{\infty} \frac{e^{-\lambda \tau}(\lambda \tau)^n}{n!}\; C_{BS}\!\left(\sigma_n, b_n\right)`, caption: "σ_n and b_n absorb the variance and drift of n jumps" },
    ],
    assumptions: [
      "Jump risk is diversifiable and therefore not priced, which is Merton's original assumption.",
      "λ is the expected number of jumps per year; μ_J and δ_J are the mean and standard deviation of the log jump size.",
    ],
    related: ["model-bs", "vol-heston"],
  },
  {
    id: "model-binomial",
    eyebrow: "Pricing models",
    title: "Binomial lattices: CRR and Jarrow–Rudd",
    intuition:
      "Cut time into n steps and allow the price to do only one of two things per step: move up by a factor u or down by a factor d, with the risk-neutral probability chosen so the tree matches the model's drift and variance. Then work backwards from expiry, discounting one step at a time. As n grows the tree price converges to Black–Scholes, and the comparison overlay lets you watch it happen. The tree's real power is early exercise: at every node you compare the value of continuing against the value of exercising now, which is exactly the decision an American option holder faces. That makes the lattice the standard tool for American options.",
    formulas: [
      { tex: R`u = e^{\sigma\sqrt{\Delta t}},\quad d = 1/u,\quad p = \frac{e^{b\Delta t} - d}{u - d}`, caption: "Cox–Ross–Rubinstein parameterisation" },
      { tex: R`V_{\text{node}} = \max\!\Big(e^{-r\Delta t}\big[pV_u + (1-p)V_d\big],\; \text{intrinsic}\Big)`, caption: "Backward induction with early exercise" },
    ],
    assumptions: [
      "Jarrow–Rudd centres the drift differently so that p = ½, the equal-probability tree.",
      "Discrete dividends are handled with the escrowed-dividend adjustment.",
    ],
    related: ["model-trinomial", "inst-amer"],
  },
  {
    id: "model-trinomial",
    eyebrow: "Pricing models",
    title: "The trinomial lattice (Boyle)",
    intuition:
      "Give each step three branches instead of two: up, middle and down. The extra branch is an extra degree of freedom, so the tree matches the moments of the continuous process better and converges more smoothly, with fewer of the odd-even oscillations a binomial tree shows. Everything else, including the early-exercise logic, works exactly as in the binomial case.",
    formulas: [
      { tex: R`\Delta x = \lambda\sigma\sqrt{\Delta t},\quad p_{u,d} = \frac{1}{2}\!\left(\frac{\sigma^2\Delta t + \nu^2\Delta t^2}{\Delta x^2} \pm \frac{\nu\,\Delta t}{\Delta x}\right)`, caption: "ν = b − σ²/2 and λ = √(3/2)" },
    ],
    related: ["model-binomial"],
  },
  {
    id: "vol-constant",
    eyebrow: "Volatility models",
    title: "Constant volatility",
    intuition:
      "One σ for every strike and every maturity: the Black–Scholes baseline. Its empirical failure is famous. Markets systematically quote different implied volatilities across strikes (the smile, or the skew), and that failure is the motivation for every other entry in this menu.",
    related: ["vol-term", "vol-sabr", "vol-heston"],
  },
  {
    id: "vol-term",
    eyebrow: "Volatility models",
    title: "A deterministic term structure",
    intuition:
      "Volatility varies with maturity but not with strike. You supply σ at a few pillar maturities and the model interpolates in total variance, w = σ²T. An option then prices with the root-mean-square volatility over its own life. This is the simplest honest upgrade from constant volatility, and it is the natural language for statements like 'short-dated volatility is elevated because of next month's announcement'.",
    formulas: [
      { tex: R`\sigma_{\text{eff}}(T) = \sqrt{\frac{1}{T}\int_0^T \sigma^2(s)\,ds}` },
    ],
    related: ["vol-constant"],
  },
  {
    id: "vol-garch",
    eyebrow: "Volatility models",
    title: "A GARCH(1,1) forecast",
    intuition:
      "GARCH captures the best-documented fact about volatility: it clusters. Turbulent days follow turbulent days, because today's variance feeds tomorrow's. For option pricing PayoffLab uses the standard textbook mapping (Hull, chapter 23): the model's expected variance decays geometrically from today's level towards the long-run level, at a speed set by the persistence φ = α + β, and the option prices with the average expected variance over its life. With persistence close to one, a calm spell lifts long-dated volatility back towards normal only slowly, exactly as markets behave.",
    formulas: [
      { tex: R`\mathbb{E}[\sigma^2_{n+i}] = \sigma_L^2 + \varphi^{\,i}\,(\sigma_0^2 - \sigma_L^2), \qquad \varphi = \alpha + \beta` },
    ],
    assumptions: [
      "This deterministic-forecast treatment ignores the risk premium attached to stochastic variance. It is a documented approximation, not the full Duan GARCH option-pricing model.",
    ],
    related: ["vol-term", "vol-heston"],
  },
  {
    id: "vol-sabr",
    eyebrow: "Volatility models",
    title: "SABR (Hagan et al., 2002)",
    intuition:
      "The market standard for smiles in rates and FX. Both the forward and its volatility are random, correlated through ρ. Hagan's celebrated expansion turns the four parameters into an implied Black–Scholes volatility for every strike: α sets the overall level, β the backbone, ρ tilts the smile (negative ρ produces the equity-style downward skew), and ν bends it into a smile. PayoffLab evaluates the expansion at each instrument's own strike and feeds the resulting volatility into the pricing formula.",
    formulas: [
      { tex: R`dF = \alpha F^{\beta} dW_1,\quad d\alpha = \nu\,\alpha\,dW_2,\quad dW_1 dW_2 = \rho\,dt` },
      { tex: R`\sigma_{BS}(K) \approx \frac{\alpha}{(FK)^{(1-\beta)/2}\bigl[1 + \ldots\bigr]}\cdot\frac{z}{x(z)}\cdot\bigl[1 + (\ldots)\,T\bigr]`, caption: "Hagan's expansion, implemented in full" },
    ],
    assumptions: [
      "An asymptotic approximation: accurate for the moderate maturities and strikes used here, less reliable far out in the wings.",
    ],
    related: ["vol-smile", "vol-heston"],
  },
  {
    id: "vol-smile",
    eyebrow: "Volatility models",
    title: "An implied smile as direct input",
    intuition:
      "Sometimes you do not want a model of the smile; you want to state the smile. This input is a parametric curve in log-moneyness k = ln(K/F): a level, a skew and a curvature. Each instrument then prices with the volatility read off at its own strike, which is the practitioner's sticky-strike rule. Set the skew negative and low strikes become dearer, exactly as equity index options trade.",
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
      "Dupire's remarkable result: given an entire surface of vanilla prices, there exists exactly ONE diffusion, with volatility a deterministic function σ(S, t) of spot and time, that reproduces all of them at once. PayoffLab derives that local volatility analytically from the parametric smile above and simulates paths through it, so vanillas and exotics live in one self-consistent world. A sanity check the test suite performs: with a flat smile the local volatility collapses back to the constant σ, and the model becomes Black–Scholes again.",
    formulas: [
      { tex: R`\sigma_{\text{loc}}^2(K,T) = \frac{\partial w/\partial T}{1 - \frac{y}{w}\frac{\partial w}{\partial y} + \frac{1}{4}\left(-\frac{1}{4} - \frac{1}{w} + \frac{y^2}{w^2}\right)\left(\frac{\partial w}{\partial y}\right)^2 + \frac{1}{2}\frac{\partial^2 w}{\partial y^2}}`, caption: "Gatheral's form; w is total implied variance, y is log-moneyness" },
    ],
    assumptions: [
      "Volatility is state-dependent but not separately random. The model reprices today's vanillas by construction, but it understates the forward smile relative to stochastic-volatility models.",
    ],
    related: ["vol-smile", "vol-heston"],
  },
  {
    id: "vol-heston",
    eyebrow: "Volatility models",
    title: "Heston's stochastic volatility (1993)",
    intuition:
      "Variance becomes a process of its own: mean-reverting at speed κ towards a long-run level θ, with volatility-of-volatility ξ, and correlated with the spot through ρ. Negative correlation generates the equity skew, because a falling market drags volatility up with it; a larger ξ fattens both tails. PayoffLab prices under Heston by Monte Carlo simulation, using your σ input as the starting volatility √v₀. Expect the progress bar, and a little sampling texture in the curves.",
    formulas: [
      { tex: R`dS = b S\,dt + \sqrt{v}\,S\,dW_1` },
      { tex: R`dv = \kappa(\theta - v)\,dt + \xi\sqrt{v}\,dW_2, \qquad dW_1 dW_2 = \rho\,dt` },
    ],
    assumptions: [
      "The Feller condition 2κθ ≥ ξ² keeps variance strictly positive; where it fails, the simulator truncates variance at zero (full-truncation Euler).",
    ],
    related: ["vol-localvol", "greek-vomma"],
  },
  {
    id: "rate-constant",
    eyebrow: "Rate models",
    title: "A constant short rate",
    intuition: "A flat curve: every cash flow at T discounts by e^{−rT}. This is the right baseline for teaching equity options, where rate risk is second order, and the rate axis then simply sweeps this one number.",
    formulas: [{ tex: R`P(0,T) = e^{-rT}` }],
  },
  {
    id: "rate-merton",
    eyebrow: "Rate models",
    title: "Merton's short-rate model (1973)",
    intuition:
      "The simplest stochastic rate: the short rate drifts linearly and diffuses with constant volatility. It is Gaussian, so the bond price has a clean closed form. Its pedagogical value lies partly in its flaw: rates wander off without any anchor, and noticing that is what motivates the mean-reverting models that follow.",
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
      "The short rate is pulled back towards a long-run level θ at speed a, like a weight on a spring, while being buffeted by Gaussian noise. Because the model is affine, the whole discount curve comes out in closed form from a single state variable. The classic objection is that Gaussian rates can go negative; after 2015, when much of Europe traded below zero, that objection started to look more like foresight.",
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
      "Vasicek with one change that fixes the negativity: the noise is scaled by the square root of the rate, so volatility fades as rates approach zero and the rate cannot cross below it (strictly, under the Feller condition 2aθ ≥ σ_r²). The model stays affine, so bond prices remain closed-form. Compare its discount curve against Vasicek's on the rate axis to see how differently the two behave at low rates.",
    formulas: [
      { tex: R`dr = a(\theta - r)\,dt + \sigma_r\sqrt{r}\,dW` },
      { tex: R`P(0,T) = A(T)\,e^{-B(T)\,r}`, caption: "A and B from the CIR affine solution" },
    ],
    related: ["rate-vasicek"],
  },

  // ======================================================== INSTRUMENTS ====
  {
    id: "inst-cash", eyebrow: "Instruments", title: "Cash (the money-market account)",
    intuition: "A deposit of N accruing continuously at the rate r, worth N·e^{rt} at time t. Flat against S and exponential in time, and more important than it looks: the money-market account is the numéraire, the measuring stick against which risk-neutral pricing values everything else.",
    formulas: [{ tex: R`V(t) = N e^{rt}` }],
  },
  {
    id: "inst-stock", eyebrow: "Instruments", title: "Stock, the underlying itself",
    intuition: "One unit of the asset: value S, payoff the 45-degree line, delta exactly one, and no curvature at all. Combined with options it builds covered calls, collars and synthetic forwards. It is also the cleanest way to internalise what delta means: hover the crosshair over a stock leg and read a slope of exactly one.",
    formulas: [{ tex: R`V = S, \qquad \Delta = 1,\; \Gamma = 0` }],
  },
  {
    id: "inst-forward", eyebrow: "Instruments", title: "Forward",
    intuition: "A binding agreement, not an option: you WILL buy at K at maturity. Its value is the discounted gap between the fair forward price and your agreed K, linear in S with delta e^{−qτ} and every higher Greek zero. Set K equal to the fair forward S·e^{(r−q)T} and the value line passes through zero today, which is exactly how forwards are struck in practice.",
    formulas: [
      { tex: R`V = S e^{-q\tau} - K e^{-r\tau}` },
      { tex: R`F_0 = S e^{(r-q)T}`, caption: "The fair delivery price" },
    ],
    related: ["inst-future"],
  },
  {
    id: "inst-future", eyebrow: "Instruments", title: "Future",
    intuition: "Economically a forward, mechanically different: gains and losses are settled in cash every day. Because the running profit is banked as it occurs, the position's value is the UNdiscounted move in the futures quote. With deterministic interest rates, futures and forward prices coincide; the difference between the two contracts is purely the financing of the daily margin flows.",
    formulas: [{ tex: R`V = F - K = S e^{(r-q)\tau} - K` }],
    related: ["inst-forward"],
  },
  {
    id: "inst-euro", eyebrow: "Instruments", title: "European option",
    intuition: "The right, without the obligation, to buy (call) or sell (put) at K at expiry. That asymmetry between rights and obligations is what creates the hockey-stick payoff and everything the Greeks describe. Priced with whichever model you select; Black–Scholes by default.",
    formulas: [
      { tex: R`C = S e^{(b-r)\tau} N(d_1) - K e^{-r\tau} N(d_2)` },
      { tex: R`P = K e^{-r\tau} N(-d_2) - S e^{(b-r)\tau} N(-d_1)` },
    ],
    related: ["model-bs", "put-call-parity", "greek-delta"],
  },
  {
    id: "inst-amer", eyebrow: "Instruments", title: "American option",
    intuition: "Exercisable at any moment up to expiry, so pricing it means solving a decision problem: at every state, is the option worth more alive (its continuation value) or dead (its intrinsic value)? The lattice answers that question node by node. Two classic results to test here: an American call on a non-dividend stock is never exercised early, so it equals the European; an American put, or a call facing a large dividend, genuinely commands an early-exercise premium.",
    formulas: [
      { tex: R`V = \max\bigl(\text{continuation},\; \text{intrinsic}\bigr) \;\text{at every node}` },
      { tex: R`V_{\text{Am}} \geq V_{\text{Eu}}` },
    ],
    related: ["model-binomial", "discrete-dividend"],
  },
  {
    id: "inst-digital-cash", eyebrow: "Instruments", title: "Digital, cash-or-nothing",
    intuition: "Pays a fixed amount if S finishes beyond K, and nothing otherwise: the option stripped down to a pure bet on an event. Its value is the discounted risk-neutral probability of the event, N(d₂), times the payout. The price of that simplicity is paid in the Greeks: near expiry the digital's delta concentrates into a spike at the strike, which is why digital books are notoriously hard to hedge, and why the sign-shading view around K is so dramatic here.",
    formulas: [
      { tex: R`C_{\text{dig}} = Q\, e^{-r\tau} N(d_2)` },
      { tex: R`C_{\text{dig}} = -Q\,\frac{\partial C_{BS}}{\partial K}`, caption: "A digital is the limit of an ever-tighter call spread" },
    ],
    related: ["inst-digital-asset", "concept-digital"],
  },
  {
    id: "inst-digital-asset", eyebrow: "Instruments", title: "Share digital, asset-or-nothing",
    intuition: "Delivers the asset itself, rather than cash, when it finishes in the money; its value is S·e^{(b−r)τ}N(d₁). Here is the satisfying part: a vanilla call is exactly a share digital minus K cash digitals. Look at the Black–Scholes formula and you can see the decomposition sitting in plain sight, one instrument per term.",
    formulas: [
      { tex: R`C_{\text{share}} = S e^{(b-r)\tau} N(d_1)` },
      { tex: R`C_{BS} = C_{\text{share}} - K\,C_{\text{dig}}(Q{=}1)` },
    ],
    related: ["inst-digital-cash"],
  },
  {
    id: "inst-fx", eyebrow: "Instruments", title: "Currency option (Garman–Kohlhagen)",
    intuition: "An option on an exchange rate. The key observation: holding the foreign currency earns the foreign interest rate, so r_f plays exactly the role a dividend yield plays for a stock. Garman and Kohlhagen's 1983 formula is therefore Black–Scholes with carry b = r_d − r_f. Set the chart's S to the FX spot; the default is 1.10.",
    formulas: [{ tex: R`C = S e^{-r_f \tau} N(d_1) - K e^{-r_d \tau} N(d_2)` }],
    related: ["model-bs", "foreign-rate"],
  },
  {
    id: "inst-black", eyebrow: "Instruments", title: "Option on a future (Black, 1976)",
    intuition: "A futures position costs nothing to enter, so under the risk-neutral measure the futures price has no drift: its cost of carry is zero. Black's 1976 formula is the b = 0 case of the generalised model, and it is the market convention for options on rate futures, commodities and index futures. It also powers the caplets and swaptions further down this list.",
    formulas: [{ tex: R`C = e^{-r\tau}\bigl[F N(d_1) - K N(d_2)\bigr]` }],
    related: ["inst-capfloor", "inst-swaption"],
  },
  {
    id: "inst-foreign-equity", eyebrow: "Instruments", title: "Foreign asset struck in domestic currency",
    intuition: "You hold an option on a foreign stock, but the strike and the settlement are in your own currency. What is really being optioned is therefore the composite asset X·S, the foreign price converted at the spot rate, and its volatility combines the stock's and the currency's volatilities in quadrature plus twice the covariance. Currency risk is not hedged away here; it lives inside the option.",
    formulas: [
      { tex: R`\sigma_{\text{comp}} = \sqrt{\sigma_S^2 + \sigma_X^2 + 2\rho\,\sigma_S \sigma_X}` },
      { tex: R`C = C_{BS}(X S,\; K,\; \sigma_{\text{comp}};\; b = r_d - q)` },
    ],
    related: ["inst-quanto"],
  },
  {
    id: "inst-quanto", eyebrow: "Instruments", title: "Quanto option",
    intuition: "The payoff of a foreign-asset option, converted at a FIXED exchange rate X̄ written into the contract. Currency risk is removed for the holder, but not for free: the bank hedging the product must hold foreign-currency positions, and the cost of doing so appears as a drift correction of −ρσ_Sσ_X on the underlying. This is one of the rare places in finance where a correlation is priced directly into a drift.",
    formulas: [
      { tex: R`b_{\text{quanto}} = r_f - q - \rho\,\sigma_S\,\sigma_X` },
      { tex: R`C = \bar{X}\; C_{BS}(S, K, \sigma_S;\; b_{\text{quanto}},\; r_d)` },
    ],
    related: ["inst-foreign-equity", "correlation"],
  },
  {
    id: "inst-exchange", eyebrow: "Instruments", title: "Exchange option (Margrabe, 1978)",
    intuition: "The right to swap asset 2 for asset 1 at maturity, with payoff max(S₁ − S₂, 0). Margrabe's insight was a change of perspective: measure everything in units of asset 2, and the exchange option becomes an ordinary call on the RATIO S₁/S₂, struck at one. The volatility that matters is the volatility of that ratio, which is where the correlation enters. Notice that there is no cash strike anywhere: the second asset itself is the strike.",
    formulas: [
      { tex: R`w = S_1 e^{(b_1-r)\tau} N(d_1) - S_2 e^{(b_2-r)\tau} N(d_2)` },
      { tex: R`\sigma^2 = \sigma_1^2 + \sigma_2^2 - 2\rho\,\sigma_1\sigma_2` },
    ],
    related: ["inst-rainbow", "correlation"],
  },
  {
    id: "inst-forward-start", eyebrow: "Instruments", title: "Forward-start option (Rubinstein, 1990)",
    intuition: "An option whose strike does not exist yet: it will be set at a future date t₁ as α times whatever the spot is at that moment. Because the Black–Scholes price is homogeneous of degree one in the pair (S, K), the option's value at t₁ is a known multiple of S(t₁), and today's value follows by discounting that multiple. Chains of forward-start options are what cliquet structures are made of.",
    formulas: [{ tex: R`V = S e^{(b-r)t_1}\; C_{BS}(1, \alpha, \tau - t_1)` }],
    related: ["forward-start-alpha"],
  },
  {
    id: "inst-barrier", eyebrow: "Instruments", title: "Barrier options (Reiner and Rubinstein, 1991)",
    intuition: "A vanilla option fitted with a life switch at level H. A knock-out dies if the price ever touches H; a knock-in is born there. Hold both an in and an out with the same H, K and T and you own the vanilla in every possible scenario, so in plus out must equal vanilla; that parity is enforced in PayoffLab's test suite. Reflection arguments give closed forms for all eight variants. The behaviour worth studying on the chart: near the barrier, an up-and-out call's delta swings violently negative, because the option's approaching death outweighs its growing moneyness.",
    formulas: [
      { tex: R`V_{\text{in}} + V_{\text{out}} = V_{\text{vanilla}}\quad (R = 0)` },
      { tex: R`C_{\text{do}} = C_{BS} - C_{\text{reflected}},\;\; \text{with}\;(H/S)^{2\mu}\;\text{reflection weights}` },
    ],
    related: ["barrier-level", "barrier-rebate"],
  },
  {
    id: "inst-lookback", eyebrow: "Instruments", title: "Lookback options",
    intuition: "Hindsight, written into a contract. The floating-strike version lets you buy at the lowest price the path ever visited (call) or sell at the highest (put), so it can never finish out of the money; Goldman, Sosin and Gatto priced it in closed form in 1979. The fixed-strike version settles a vanilla against the path's extreme rather than its endpoint (Conze and Viswanathan, 1991). Both are path-dependent, so no terminal-payoff line exists and the chart shows the value curve. Mid-life valuation here uses the fresh-issue convention: the running extremum is taken as not yet accrued.",
    formulas: [
      { tex: R`\text{floating call: } S_T - \min_{t\le T} S_t, \qquad \text{fixed call: } \max\bigl(\max_{t\le T} S_t - K, 0\bigr)` },
    ],
    related: ["path-dependent-payoff"],
  },
  {
    id: "inst-compound", eyebrow: "Instruments", title: "Compound options (Geske, 1979)",
    intuition: "An option on an option: the mathematics of instalment purchases, extension rights, and Merton's view of a firm's equity as a call on its assets. Exercise pays off only if two things go right in sequence: S must clear the critical level S* at the first date t₁, and the underlying option must then deliver by T₂. Evaluating two correlated events requires the bivariate normal distribution, with correlation √(t₁/T₂) coming purely from the overlap of the two horizons.",
    formulas: [
      { tex: R`CoC = S e^{(b-r)T_2} M(z_1, y_1; \rho) - K_2 e^{-rT_2} M(z_2, y_2;\rho) - K_1 e^{-rt_1} N(y_2)` },
      { tex: R`\rho = \sqrt{t_1/T_2}, \qquad C_{BS}(S^*, K_2, T_2 - t_1) = K_1` },
    ],
    related: ["compound-structure"],
  },
  {
    id: "inst-chooser", eyebrow: "Instruments", title: "Chooser option",
    intuition: "At the choice date t₁ you decide whether your option is a call or a put, both with the same strike and expiry. Think of the situations where you know something big is coming but not its direction: an election, a court ruling, an earnings date. The chooser is worth at least the dearer of the two vanillas and at most the straddle, and as the choice date moves towards expiry its price climbs to meet the straddle exactly.",
    formulas: [
      { tex: R`w = C_{BS}(S,K,T) + \text{a put-like term evaluated at } t_1`, caption: "Rubinstein's simple-chooser formula" },
      { tex: R`\max(C, P) \le w \le C + P` },
    ],
    related: ["concept-straddle"],
  },
  {
    id: "inst-rainbow", eyebrow: "Instruments", title: "Options on the max or min (Stulz, 1982)",
    intuition: "Two-colour rainbow options: the payoff first selects the better (max) or the worse (min) of two assets, and only then compares with the strike. A call on the min pays only if BOTH assets beat K, which makes it cheap and strongly correlation-loving. Stulz's decomposition ties the family together: a call on the max equals the two vanilla calls minus the call on the min, and the test suite checks that identity numerically.",
    formulas: [
      { tex: R`c_{\max} = c(S_1,K) + c(S_2,K) - c_{\min}(S_1,S_2,K)` },
      { tex: R`c_{\min} \text{ uses } M(\cdot,\cdot;\rho_1),\; M(\cdot,\cdot;\rho_2) \text{ bivariate terms}` },
    ],
    related: ["inst-exchange", "correlation"],
  },
  {
    id: "inst-asian", eyebrow: "Instruments", title: "Asian (average-price) options",
    intuition: "Settling on the AVERAGE price over the option's life, rather than the final print, makes the payoff hard to manipulate and smooth to hedge, which is why Asians dominate commodity and FX markets. Mathematically, the arithmetic average of lognormals has no closed-form distribution, so the arithmetic Asian is priced by Monte Carlo. The geometric average, by contrast, stays lognormal and has an exact formula (Kemna and Vorst, 1990). PayoffLab exploits that twice: as an instrument in its own right, and as a control variate that removes most of the Monte Carlo error from the arithmetic price. Averaging also reduces effective volatility (σ/√3 in the continuous geometric case), which is why Asians are cheaper than vanillas on the same terms.",
    formulas: [
      { tex: R`\text{payoff} = \max\!\Big(\tfrac{1}{n}\textstyle\sum_i S_{t_i} - K,\, 0\Big)` },
      { tex: R`\sigma_G = \sigma/\sqrt{3}, \qquad b_G = \tfrac{1}{2}\bigl(b - \sigma^2/6\bigr)`, caption: "Kemna–Vorst, continuous geometric averaging" },
    ],
    related: ["path-dependent-payoff", "mc-settings"],
  },
  {
    id: "inst-basket", eyebrow: "Instruments", title: "Basket option",
    intuition: "An option on a weighted portfolio, w₁S₁ + w₂S₂. Diversification works inside the payoff: unless correlation is perfect, the basket's volatility is lower than the weighted average of the components' volatilities, so a call on the basket costs less than the basket of calls. The gap between those two prices is set by correlation, and dragging ρ makes the relationship visible. Priced by Monte Carlo on correlated paths.",
    formulas: [{ tex: R`\text{payoff} = \max\bigl(w_1 S_1(T) + w_2 S_2(T) - K,\; 0\bigr)` }],
    related: ["correlation", "mc-settings"],
  },
  {
    id: "inst-spread", eyebrow: "Instruments", title: "Spread option",
    intuition: "Pays on the DIFFERENCE between two prices: crack spreads in oil refining, spark spreads in power generation, basis trades everywhere. A difference of lognormals can go negative, so Black–Scholes cannot be applied directly. Kirk's approximation absorbs the strike into the short asset and treats the resulting ratio as lognormal, which works well for moderate strikes; the Monte Carlo mode is exact. Note the correlation logic, opposite to the basket's: LOW correlation widens the spread's distribution and raises the option's price.",
    formulas: [
      { tex: R`\sigma_{\text{Kirk}}^2 = \sigma_1^2 - 2\rho\sigma_1\sigma_2 w + \sigma_2^2 w^2, \qquad w = \frac{F_2}{F_2 + K}` },
    ],
    related: ["spread-method", "correlation"],
  },
  {
    id: "inst-product", eyebrow: "Instruments", title: "Product option",
    intuition: "Pays on the PRODUCT of two prices, the canonical case being a foreign stock times an exchange rate. Multiplying lognormals keeps you lognormal, so unlike the basket this instrument has an exact Black-style formula: the product's forward picks up a covariance factor e^{ρσ₁σ₂T}, and the volatilities add in quadrature plus the correlation term.",
    formulas: [
      { tex: R`F_{\text{prod}} = F_1 F_2\, e^{\rho\sigma_1\sigma_2 \tau}, \qquad \sigma^2 = \sigma_1^2 + \sigma_2^2 + 2\rho\sigma_1\sigma_2` },
    ],
    related: ["inst-foreign-equity"],
  },
  {
    id: "inst-varswap", eyebrow: "Instruments", title: "Variance and volatility swaps",
    intuition: "A forward contract on realised variance: at expiry you exchange what the market's variance actually turned out to be against the strike agreed today. There is no delta to manage and no strike geometry, just volatility exposure in its purest form, which is why desks use variance swaps to trade volatility as an asset class. Fair value needs only the model's expected variance over the life, which is exact under constant volatility and under Heston. The volatility swap settles on the square root of realised variance and therefore carries a concavity correction, because the expectation of a square root sits below the square root of the expectation.",
    formulas: [
      { tex: R`V = N_{\text{var}}\bigl(\mathbb{E}[\bar\sigma^2] - K_{\text{var}}\bigr)e^{-r\tau}` },
      { tex: R`\mathbb{E}\!\left[\bar v\right]_{\text{Heston}} = \theta + (v_0-\theta)\frac{1 - e^{-\kappa T}}{\kappa T}` },
    ],
    related: ["greek-vega", "vol-heston"],
  },
  {
    id: "inst-fra", eyebrow: "Instruments", title: "Forward rate agreement",
    intuition: "Fix today the borrowing rate for a future period from T₁ to T₂. The value is the discounted difference between the forward rate implied by the curve and your fixed rate K, times notional and year fraction. Because it is linear in the forward rate, its picture on the rate axis is nearly a straight line through the par point.",
    formulas: [
      { tex: R`f(T_1,T_2) = \frac{1}{\delta}\left(\frac{P(T_1)}{P(T_2)} - 1\right)` },
      { tex: R`V = N\,\delta\,\bigl(f - K\bigr)P(0,T_2)` },
    ],
    related: ["inst-swap", "fixed-rate"],
  },
  {
    id: "inst-swap", eyebrow: "Instruments", title: "Interest-rate swap",
    intuition: "Exchange fixed for floating interest on a schedule of dates. The floating leg has a beautiful property: each coupon is worth its forward rate discounted, and the whole strip telescopes to 1 − P(0,Tₙ), which is par today minus par at the end. A payer swap is therefore that quantity minus the fixed-rate annuity. Plot it against r and you are looking at duration drawn as a slope; the zero crossing of the line is the par swap rate.",
    formulas: [
      { tex: R`V_{\text{payer}} = N\Bigl[1 - P(0,T_n) - K \textstyle\sum_i \delta_i P(0,T_i)\Bigr]` },
      { tex: R`s_{\text{par}} = \frac{1 - P(0,T_n)}{\sum_i \delta_i P(0,T_i)}` },
    ],
    related: ["inst-swaption", "rate-vasicek"],
  },
  {
    id: "inst-capfloor", eyebrow: "Instruments", title: "Caps and floors",
    intuition: "A cap is a strip of call options, one per period, on the future floating rate: whenever a fixing sets above K, the difference is refunded. It is insurance against rising rates, and the floor is its mirror image against falling ones. Each caplet is priced with Black's formula on the curve's forward rate, discounted from its own payment date, which is the market's quoting standard.",
    formulas: [
      { tex: R`\text{caplet}_i = N\,\delta\,P(0,T_{i+1})\bigl[f_i N(d_1) - K N(d_2)\bigr]` },
    ],
    related: ["inst-black", "black-vol"],
  },
  {
    id: "inst-swaption", eyebrow: "Instruments", title: "Swaptions",
    intuition: "An option to ENTER a swap at rate K at a future date: the rates market's vanilla instrument for hedging future financing decisions. Black's formula applies to the forward swap rate, with one twist worth understanding: the whole payoff is multiplied by the annuity, because a rate advantage of F − K is received not once but on every payment date of the underlying swap.",
    formulas: [
      { tex: R`V_{\text{payer}} = N\,A\,\bigl[F\,N(d_1) - K\,N(d_2)\bigr], \qquad A = \textstyle\sum_i \delta_i P(0,T_i)` },
    ],
    related: ["inst-swap", "inst-black"],
  },
  {
    id: "inst-trs", eyebrow: "Instruments", title: "Total return swap",
    intuition: "Receive everything the equity does, price moves and dividends alike, and pay a fixed rate on the notional in exchange. The result is full economic exposure to the stock without ever owning a share: the classic synthetic-financing trade. The value tracks S/S₀ against the fixed leg's annuity, and at inception the fair K is the one that sets the whole package to zero.",
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
      "Every action in this panel adds real, labelled legs to the portfolio, so the aggregate curves show the hedge actually working, and every action can be undone. Start simple: Delta adds the single underlying position that sets net delta to zero, and you will see the value curve flatten at the current spot in one click. Delta-Gamma goes one step further, using an at-the-money option to remove curvature before re-zeroing delta with stock. Vega does the same for volatility risk. When those feel natural, open the simulation below them: it shows what happens when you hedge a continuously moving world in discrete steps, which is precisely the gap between the textbook and the trading floor.",
    related: ["hedge-delta", "hedge-delta-gamma", "hedge-sim"],
  },
  {
    id: "hedge-delta",
    eyebrow: "Hedging",
    title: "Delta hedging",
    intuition:
      "Hold minus delta units of the underlying against the position, and small moves in S cancel to first order: the value curve becomes flat exactly at the current spot. The hedge is only locally correct, though. Gamma bends the curve away from flat as soon as S moves, so the hedge must be rebalanced, and how often to rebalance is a genuine trade-off between residual risk and transaction costs. Stock or futures are the standard hedge instruments because they carry no optionality of their own.",
    formulas: [
      { tex: R`n_{\text{stock}} = -\Delta_{\text{portfolio}}` },
    ],
    related: ["greek-delta", "hedge-delta-gamma"],
  },
  {
    id: "hedge-delta-gamma",
    eyebrow: "Hedging",
    title: "Delta-gamma hedging",
    intuition:
      "The underlying has no gamma, so curvature cannot be hedged with stock alone: it must be bought or sold with another OPTION. The procedure is triangular. First solve for the option quantity that zeroes the net gamma; that trade changes your delta, so then re-zero delta with stock. The result is a position flat to second order, locally immune to direction and to small movement alike, and its running cost is the theta of the option you added.",
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
      "Volatility risk, like gamma, can only be offset with instruments that carry it: options, or variance swaps. The panel sizes an at-the-money option to zero the net vega, then repairs delta with stock. Watch the by-product carefully: hedging vega with a single option also changes your gamma, and with one hedge instrument you cannot in general zero both at once. That is the practical reason real books hedge with baskets of options across strikes and maturities rather than with a single strike.",
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
      "The simulation grows one seeded price path at the REALISED volatility while you re-hedge at fixed intervals using deltas computed at the MODEL volatility. If you could re-hedge continuously, the profit and loss would lock at exactly zero; that statement is Black–Scholes. Hedging in discrete steps leaves each interval's move unhedged beyond first order, so every step contributes roughly ½Γ(ΔS)² of movement profit against Θδt of time cost, and the imperfect cancellation of those two streams is the hedging error. Halve the interval and the error's dispersion shrinks by about one over the square root of two. Then set the hedge volatility away from the realised volatility and watch the other classic effect: hedging with the wrong σ leaks the volatility difference into the P/L through the gamma term.",
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
      "Buy the 100 call and sell the 120 call. The premium collected on the short leg subsidises the long one, and in exchange you give away everything above 120: profit is capped at the width of the spread minus the net cost, loss is capped at the net cost. Now read the chart like a professional. The break-even sits at the lower strike plus the net premium. Delta is positive but humped between the strikes. Most instructive of all is gamma: positive near the lower strike, NEGATIVE near the upper one. The same position is long convexity below and short convexity above, and the Pro sign-shading paints exactly that boundary.",
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
      "A call plus a put at the same strike. You hold no opinion on direction; your opinion is that the market WILL move, and by more than the options are pricing. The straddle is the purest simple expression of long volatility: maximum vega and maximum gamma at the strike, financed by paying two premiums of theta. The break-evens sit one combined premium either side of the strike, and between them time is the enemy. Overlay vega and watch where the volatility exposure actually lives.",
    formulas: [
      { tex: R`S_{BE} = K \pm (c + p)` },
    ],
    related: ["greek-vega", "inst-chooser"],
  },
  {
    id: "concept-covered-call",
    eyebrow: "Concepts",
    title: "The covered call",
    intuition:
      "Own the stock and sell a call above the market. The premium is income you keep in every scenario; the price of it is that your upside now stops at the strike. The payoff picture makes the trade-off unambiguous: below the strike you are simply long stock with a premium cushion, above it the line goes flat. One classical remark worth knowing: by put-call parity, a covered call has the same payoff shape as a short put at that strike.",
    related: ["put-call-parity", "concept-protective-put"],
  },
  {
    id: "concept-protective-put",
    eyebrow: "Concepts",
    title: "The protective put",
    intuition:
      "Own the stock and buy a put at or below the market: a hard floor under the position, in exchange for the premium. The value curve shows insurance economics directly: the floor's height is the strike minus the premium, and the drag below the unhedged stock line is the running cost of protection. Sweep the volatility input and watch the cost of insurance rise and fall with fear.",
    related: ["greek-vega", "concept-collar"],
  },
  {
    id: "concept-butterfly",
    eyebrow: "Concepts",
    title: "The butterfly",
    intuition:
      "Long one call below the market, short two at the market, long one above. The payoff is a tent with its peak at the middle strike: you are betting the price finishes THERE, and the position costs very little because you sold the body to buy the wings. The Greeks tell the second story: near the peak close to expiry, the butterfly is intensely short gamma and long theta, which is why pin risk around expiry is the professional's chief concern with this structure.",
    related: ["concept-gamma-expiry", "greek-vomma"],
  },
  {
    id: "concept-collar",
    eyebrow: "Concepts",
    title: "The collar",
    intuition:
      "A protective put financed by a covered call: a floor below, a cap above, and often nearly zero net cost when the strikes are placed symmetrically around the forward. Corporates hedge concentrated stock positions this way. On the chart, move the two strikes and watch the trade-off reshape: a higher floor costs upside, a higher cap costs protection.",
    related: ["concept-protective-put", "concept-covered-call"],
  },
  {
    id: "concept-calendar",
    eyebrow: "Concepts",
    title: "The calendar spread",
    intuition:
      "Sell the near-dated option and buy the far-dated one at the same strike. You are not trading direction; you are trading the SPEED of time decay, because theta accelerates as expiry approaches, so the short near-dated leg decays faster than the long far-dated one. Note the chart's footnote: with legs expiring on different dates, the payoff is drawn at the first expiry with the surviving leg valued by the model, which is the standard convention for calendars.",
    related: ["greek-theta", "payoff-vs-value"],
  },
  {
    id: "concept-gamma-expiry",
    eyebrow: "Concepts",
    title: "Gamma explodes near expiry",
    intuition:
      "Put an at-the-money option on the time axis and watch the two overlays diverge as expiry approaches: gamma at the strike grows without bound while vega dies away to nothing. The economics behind the mathematics: with an hour to expiry, an at-the-money option is a coin flip whose delta must travel from near 0 to near 1 across a vanishing interval of prices. Whoever is short that option must trade ever more violently to stay hedged, and that is the pin risk that makes expiry afternoons exciting. This pair of curves is arguably the single most instructive picture in the whole subject of the Greeks.",
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
      "On the time axis, the value line of an at-the-money option slides down towards its intrinsic value, meeting it exactly at expiry. The slide is not a straight line: at-the-money time value behaves like the square root of the remaining life, so the final weeks are by far the steepest. This is why option sellers speak of harvesting the last month of theta, and why buyers of short-dated protection pay so dearly for it. Overlay theta to see the instantaneous rate of the bleed at every date.",
    formulas: [
      { tex: R`V_{\text{ATM}} \approx 0.4\, S\,\sigma\sqrt{\tau}`, caption: "The classic at-the-money approximation" },
    ],
    related: ["greek-theta", "payoff-vs-value"],
  },
  {
    id: "concept-delta-hedge",
    eyebrow: "Concepts",
    title: "Delta-hedging a short call",
    intuition:
      "You sold a call. Open the Hedging panel and press Delta: a stock leg appears and the value curve flattens at the current spot. Now open the simulation and run it. Re-hedging weekly, the hedged P/L hugs zero while the unhedged line swings with the market. Study the decomposition below the path: at every step you LOSE about ½Γ(ΔS)², because a short-gamma hedger buys high and sells low by construction, and you EARN theta as compensation. Over many steps the two streams nearly cancel. Their imperfect cancellation, visible as the wobble in the green line, IS the hedging error, and it shrinks as you re-hedge more often.",
    related: ["hedge-sim", "hedge-delta", "greek-gamma"],
  },
  {
    id: "concept-bachelier",
    eyebrow: "Concepts",
    title: "Bachelier versus Black–Scholes",
    intuition:
      "Two models, one option, one chart. At the money and short-dated, the two value curves lie almost exactly on top of each other once the volatilities are matched by σ_N = σ·S. Push far from the money and they separate: Black–Scholes prices the far out-of-the-money call higher, because lognormal upside is unbounded and fat while normal upside is thin. The lesson generalises far beyond these two models: model choice is a statement about the TAILS. The centre of the distribution is pinned by the market; the wings are where the assumptions live.",
    related: ["model-bachelier", "model-bs"],
  },
  {
    id: "concept-digital",
    eyebrow: "Concepts",
    title: "Digital versus vanilla",
    intuition:
      "Two charts, side by side. The vanilla's payoff KINKS at the strike; the digital's payoff JUMPS. That one discontinuity transforms the Greeks: compare the two gamma overlays and you will see that what the vanilla spreads smoothly across a range of prices, the digital concentrates into a violent, sign-flipping spike around the strike. Near expiry the digital's delta becomes essentially unhedgeable at the strike. This is why professional desks do not hedge digitals as digitals: they decompose them into tight call spreads, accepting a small pricing giveaway in exchange for Greeks a human can actually manage.",
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
  { term: "American option", definition: "An option exercisable at any time up to expiry; priced on a lattice by backward induction.", learnId: "inst-amer" },
  { term: "Annuity (swap)", definition: "The value of receiving one unit per year on a swap's payment schedule, Σ δᵢP(0,Tᵢ). The natural numéraire for swaptions.", learnId: "inst-swaption" },
  { term: "At the money (ATM)", definition: "A strike equal, or nearly equal, to the current spot or forward. Gamma and vega concentrate there." },
  { term: "Barrier", definition: "A price level whose touch creates (knock-in) or destroys (knock-out) an option.", learnId: "inst-barrier" },
  { term: "Break-even", definition: "The terminal price at which the strategy's profit, payoff minus initial cost, is exactly zero.", learnId: "net-premium" },
  { term: "Carry (cost of, b)", definition: "The risk-neutral drift of the underlying: r − q for equities, r − r_f for currencies, zero for futures.", learnId: "model-bs" },
  { term: "Control variate", definition: "A Monte Carlo variance-reduction technique: simulate a related quantity whose exact answer is known, and correct the estimate by the observed error.", learnId: "inst-asian" },
  { term: "Delta (Δ)", definition: "The first derivative of value in the underlying: the hedge ratio.", learnId: "greek-delta" },
  { term: "Digital / binary", definition: "An option paying a fixed amount (or the asset itself) on an in-the-money finish: a bet on the event.", learnId: "inst-digital-cash" },
  { term: "Discount factor P(0,T)", definition: "Today's price of one unit paid at T; e^{−rT} on a flat curve, model-dependent otherwise.", learnId: "rate-constant" },
  { term: "Forward price", definition: "The fair delivery price for a forward contract, F = S·e^{(r−q)T}.", learnId: "inst-forward" },
  { term: "Gamma (Γ)", definition: "The second derivative of value in the underlying: convexity, the rate at which delta changes.", learnId: "greek-gamma" },
  { term: "Greeks", definition: "The partial derivatives of a position's value with respect to the market inputs: the local map of its risk." },
  { term: "Implied volatility", definition: "The σ that makes a model price match a market price; the market's quoting currency for options.", learnId: "vol-smile" },
  { term: "Intrinsic value", definition: "The payoff if exercised now, max(S−K, 0) for a call. The floor towards which time value decays.", learnId: "payoff-vs-value" },
  { term: "Knock-in / knock-out", definition: "The two barrier events: activation or extinction of the option when S touches H.", learnId: "inst-barrier" },
  { term: "Lognormal", definition: "The distribution of S under geometric Brownian motion: log-returns are normal and prices stay positive.", learnId: "model-bs" },
  { term: "Margrabe option", definition: "The right to exchange one asset for another; priced with the volatility of the ratio, with no cash strike.", learnId: "inst-exchange" },
  { term: "Moneyness", definition: "Where spot stands relative to strike, often expressed as ln(S/K) or S/K; the natural coordinate of the smile." },
  { term: "Monte Carlo", definition: "Pricing by simulating many risk-neutral paths and averaging discounted payoffs; the error shrinks like 1/√paths.", learnId: "mc-settings" },
  { term: "Numéraire", definition: "The asset in whose units values are measured. Changing it (money market, annuity, or a second asset) is the trick behind Black-76, swaption pricing and Margrabe." },
  { term: "Par rate", definition: "The fixed rate that values a swap to exactly zero at inception.", learnId: "inst-swap" },
  { term: "Path-dependent", definition: "A payoff that depends on the whole trajectory (an average, an extremum, a barrier touch), not just on the terminal price.", learnId: "path-dependent-payoff" },
  { term: "Pin risk", definition: "The hedging hazard of the price sitting exactly at strike near expiry, where delta is practically undefined and gamma explodes.", learnId: "concept-gamma-expiry" },
  { term: "Put-call parity", definition: "C − P equals the forward: a model-free identity that follows from no-arbitrage alone.", learnId: "put-call-parity" },
  { term: "Rebate", definition: "A consolation payment attached to a barrier event.", learnId: "inst-barrier" },
  { term: "Rho (ρ)", definition: "The sensitivity of value to the interest rate.", learnId: "greek-rho" },
  { term: "Risk-neutral measure", definition: "The probability measure under which discounted asset prices are martingales; prices are discounted expectations under it.", learnId: "model-bs" },
  { term: "Skew / smile", definition: "The strike-dependence of implied volatility: downward-sloping in equities, smile-shaped in FX.", learnId: "vol-smile" },
  { term: "Straddle", definition: "A call plus a put at one strike: long volatility in its purest simple form.", learnId: "concept-straddle" },
  { term: "Term structure", definition: "The maturity-dependence of a quantity: rates, forward prices or volatility.", learnId: "vol-term" },
  { term: "Theta (Θ)", definition: "The drift of value with calendar time: time decay.", learnId: "greek-theta" },
  { term: "Time value", definition: "Option value above intrinsic: the price of the optionality that remains.", learnId: "concept-time-decay" },
  { term: "Vega (ν)", definition: "The sensitivity of value to volatility.", learnId: "greek-vega" },
  { term: "Volatility (realised vs implied)", definition: "What the asset actually did versus what options currently price; variance swaps settle the difference between the two.", learnId: "inst-varswap" },
];
