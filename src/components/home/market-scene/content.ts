// =====================================================================
// What each scene shows (Step 93B).
// ---------------------------------------------------------------------
// EVERY FORMULA HERE IS ONE A REPORT USES. Each page's scene is built
// from that page's latest seven reports, read in full: a division's from
// its own, a fund's from the fund's, the homepage's from the latest of
// every division. The notes behind them (report, page, equation) were
// kept with the step; where a report printed an equation in a garbled or
// non-standard form, the standard form of the same model is set here.
//
// EVERY EXHIBIT IS A SHAPE A REPORT DRAWS: a local volatility surface, a
// merit-order supply curve, a key-rate ladder, a dendrogram. They are
// drawn as shapes only (see exhibits.ts): no figures, no names, no
// labels, because a number in a background would be a number nobody can
// check, and the number rule allows only official figures.
//
// The only figures any scene draws are the official ones the page text
// also carries: the funds' cumulative returns and the market monitor,
// both from the key numbers registry (see MarketScene and
// lib/market-monitor.ts), and the funds' official lines.
//
// The typesetter (typeset.ts) knows a small subset of TeX: \frac, \sqrt,
// scripts, \hat, \bar, \tilde, \op{}, \left, \right, \, and Unicode for the rest
// (∑, ∫, ∏, ⊗, ⊤). A literal brace is written \{ or \}.
// =====================================================================

/** The desks the homepage's focus visits, in the order it visits them. */
export const PM = 0;
export const ER = 1;
export const MR = 2;
export const QR = 3;
export const IR = 4;
export const DESKS = 5;
export type Desk = 0 | 1 | 2 | 3 | 4;

export interface SceneFormula {
  tex: string;
  desk: Desk;
}

/** The exhibits exhibits.ts can draw, each a shape from a report. */
export type ExhibitId =
  // Quantitative Research
  | 'localVolSurface' | 'pdvSurface' | 'charSpiral' | 'barrierPaths' | 'arFan' | 'vrpSpline' | 'levyArea' | 'priceYield'
  // Macro Research
  | 'meritOrder' | 'reserveShares' | 'tariffHistory' | 'policyLadder' | 'ledgerBlocks' | 'creditNetwork'
  // Equity Research
  | 'sensitivityGrid' | 'footballField' | 'rebasedPair' | 'compsGrid' | 'riFade' | 'cet1Bars' | 'roeCapital' | 'roicWacc'
  // Investment Research
  | 'preferenceBoard' | 'curvePair' | 'bundStep' | 'spreadLevels' | 'cointegrated' | 'garchClusters' | 'transitsCollapse' | 'goldRealYield'
  // Portfolio Management and the funds
  | 'factorBars' | 'bookSilhouette' | 'correlationGrid' | 'nsBetas' | 'studentT' | 'hrpTree' | 'garchRolling' | 'momentumCrash'
  | 'scoreLadder' | 'keyRateLadder' | 'curveShifts' | 'cashflowComb' | 'sleeveBalance' | 'bootstrap' | 'fxForward' | 'addsRemovals'
  | 'supplyGap' | 'valuationStack' | 'covarianceGrid' | 'allocationBlocks' | 'tracking' | 'maturitySlide' | 'hedgePair'
  | 'factorTilt' | 'termStructure' | 'strips' | 'pirNest' | 'sizeTiers' | 'weightRule' | 'benchmarkBlend' | 'cashCycle'
  | 'capitalBar' | 'debtDynamics';

export interface SceneExhibit {
  id: ExhibitId;
  desk: Desk;
}

export interface SceneContent {
  formulas: SceneFormula[];
  exhibits: SceneExhibit[];
}

export type DivisionScene = 'division:equity' | 'division:investment' | 'division:macro' | 'division:portfolio' | 'division:quant';
export type FundScene = 'fund:long-short' | 'fund:multi-asset' | 'fund:dps' | 'fund:pir';
export type SceneKey = 'home' | DivisionScene | FundScene;

const f = (desk: Desk, ...tex: string[]): SceneFormula[] => tex.map((t) => ({ tex: t, desk }));
const x = (desk: Desk, ...ids: ExhibitId[]): SceneExhibit[] => ids.map((id) => ({ id, desk }));

// ---- the formulas, by the reports they come from -------------------

const QUANT = {
  dupire: 'σ_{\\op{loc}}^2(K, T) = \\frac{∂_T C(K, T)}{\\frac{1}{2}K^2\\,∂_{KK} C(K, T)}',
  dupireFx: 'σ_{\\op{loc}}^2(K, T) = \\frac{∂_T C + (r_d - r_f)K\\,∂_K C + r_f C}{\\frac{1}{2}K^2\\,∂_{KK} C}',
  breeden: '∂_{KK} C(K, T) = P(0, T)\\,p(K, T)',
  heston: 'dv_t = κ(θ - v_t)\\,dt + ξ\\sqrt{v_t}\\,dW_t^v',
  lsv: 'σ_{\\op{LV}}^2(K, T) = L^2(K, T)\\,\\op{E}\\left[v_T | S_T = K\\right]',
  gilPelaez: 'F_X(x) = \\frac{1}{2} - \\frac{1}{π}∫_0^{∞} \\op{Im}\\left(\\frac{e^{-iux}\\,φ_X(u)}{u}\\right)du',
  cos: 'f_{X_T}(x) ≈ ∑_{k=0}^{N-1} A_k\\,\\op{cos}\\left(kπ\\frac{x - a}{b - a}\\right)',
  pdv: '\\op{Vol}_t = β_0 + β_1R_{1,t} + β_2Σ_t',
  pdvKernel: 'R_{1,t} = ∑_{k≥1} w_k^{(1)}\\,r_{t-k}',
  garch11: 'σ_t^2 = α_0 + α_1x_{t-1}^2 + β_1σ_{t-1}^2',
  ar1: 'g_t = μ + φ(g_{t-1} - μ) + σε_t',
  vrp: 'R_{t+1} = α + ∑_{j=1}^{J} β_j B_j(\\op{VRP}_t) + ε_{t+1}',
  chen: 'S(X ∗ Y) = S(X) ⊗ S(Y)',
  levy: 'A_{[0,T]}(X) = \\frac{1}{2}\\left(S(X)^{1,2} - S(X)^{2,1}\\right)',
  lash: '\\op{LASH}_{i,t} ≈ Λ_i\\,\\frac{∂\\op{NPV}_{i,t}}{∂R_t}',
};

const MACRO = {
  meritOrder: 'p(b) = \\op{max}_{i:\\,q_i > 0}\\,b_i',
  uniform: 'π_i^u(θ, b) = \\left(p(b) - c_i\\right)q_i(θ, b)',
  payAsBid: 'π_i^d(θ, b) = (b_i - c_i)\\,q_i(θ, b)',
  clearing: '∑_{i∈I} q_i(θ, b) = θ',
  critical: '\\tilde{θ} = \\frac{P}{P - c_j}\\,k_j',
  revenue: 'R^d < R^u',
  hedge: 'h^* = \\frac{\\op{Cov}(ΔP_a,\\,ΔP_h)}{\\op{Var}(ΔP_h)}',
  dollarisation: 'σ_π > σ_{\\op{RER}}',
};

const EQUITY = {
  wacc: '\\op{WACC} = \\frac{E}{D + E}K_e + \\frac{D}{D + E}K_d(1 - t)',
  capm: 'K_e = R_f + β(R_m - R_f)',
  blume: 'β_{\\op{adj}} = \\frac{2}{3}β_{\\op{raw}} + \\frac{1}{3}',
  hamada: 'β_L = β_U\\left[1 + (1 - t)\\frac{D}{E}\\right]',
  fcff: '\\op{FCFF} = \\op{EBIT}(1 - t) + \\op{D&A} - \\op{CAPEX} - Δ\\op{NWC}',
  gordon: '\\op{TV} = \\frac{\\op{FCFF}_{T+1}}{\\op{WACC} - g}',
  ddm: 'P_0 = ∑_{t=1}^{T}\\frac{\\op{DPS}_t}{(1 + k_e)^t} + \\frac{\\op{TV}_T}{(1 + k_e)^T}',
  residual: '\\op{RI}_t = \\op{NI}_t - k_e\\,\\op{TBV}_{t-1}',
  ptbv: '\\frac{P}{\\op{TBV}} = \\frac{\\op{RoTE} - g}{\\op{CoE} - g}',
  growth: 'g = \\op{RoTE} × b',
  harmonic: '\\bar{x}_H = \\frac{n}{∑_i 1/x_i}',
};

const INVESTMENT = {
  dv01: 'N_{\\op{BTP}}\\,\\op{DV01}_{\\op{BTP}} = N_{\\op{Bund}}\\,\\op{DV01}_{\\op{Bund}}',
  spread: 's = y_{\\op{BTP}} - y_{\\op{Bund}}',
  carry: 'r^{\\op{carry}} ≈ (i^* - i) - \\frac{ΔS}{S}',
  vecm: 'Δy_t = αβ′y_{t-1} + ∑_i Γ_iΔy_{t-i} + ε_t',
  garch: 'σ_t^2 = ω + α\\,ε_{t-1}^2 + β\\,σ_{t-1}^2',
  debt: 'Δd_t ≈ (r - g)\\,d_{t-1} - \\op{pb}_t',
};

const RISK = {
  var: '\\op{VaR}_α = μ + σ\\,t_ν^{-1}(α)',
  esIntegral: '\\op{ES}_α = -\\frac{1}{α}∫_0^α \\op{VaR}_γ\\,dγ',
  esT: '\\op{ES}_α = σ\\,\\frac{ν + (T_ν^{-1}(α))^2}{ν - 1}\\,\\frac{τ_ν(T_ν^{-1}(α))}{α} + μ',
  garchPQ: 'σ_{t+1|t}^2 = ω + ∑_{i=1}^{p}α_iε_{t-i}^2 + ∑_{j=1}^{q}β_jσ_{t-j+1|t-j}^2',
  portfolioVar: '\\op{VaR}_{α,p} ≈ \\sqrt{\\op{VaR}_α\\,ρ\\,\\op{VaR}_α′}',
  ks: 'D_n = \\op{sup}_x |F_n(x) - F(x)|',
  covariance: 'Σ = DρD,\\ σ_p^2 = w^⊤Σw',
  portfolioReturn: 'r_t^p = ∑_i w_i\\,r_{t,i}',
};

const LONG_SHORT = {
  tsfm: 'w_{i,j,t+1} = f_{i,j,t+1}\\left(\\frac{1}{N}\\right)(-1)^{1_s}',
  tsfmScale: 's_{i,j,t} = \\op{min}\\left(\\op{max}\\left(\\frac{1}{σ_{i,j,t}}∑_{τ=1}^{j}f_{i,t-τ+1},\\,-2\\right),\\,2\\right)',
  nelsonSiegel: 'y(τ) = β_0 + β_1\\frac{1 - e^{-λτ}}{λτ} + β_2\\left(\\frac{1 - e^{-λτ}}{λτ} - e^{-λτ}\\right)',
  rateShock: 'r_{i,t}^e = d_i + γ_i^{(k)}Δβ_{k,t} + ε_{i,t}',
  tailBeta: 'r_{i,t+1} = α_i + β_iλ_t^z + ε_{i,t+1}',
  amihud: '\\op{ILLIQ}_i = \\frac{1}{D}∑_{d=1}^{D}\\frac{|R_{i,d}|}{\\op{VOL}_{i,d}}',
  hrp: 'd_{ij} = \\sqrt{\\frac{1}{2}(1 - ρ_{ij})}',
  sharpe: 'S_p = \\frac{\\op{E}(R_p - R_f)}{σ_p}',
  vif: '\\op{VIF}_k = \\frac{1}{1 - R_k^2}',
  betaHedge: 'N_f = \\frac{β\\,V_p}{F × m}',
};

const MULTI_ASSET = {
  bondPrice: 'P = ∑_j \\frac{CF_j}{(1 + y/m)^{m t_j}}',
  keyRate: '\\frac{ΔPV}{PV_0} ≈ -∑_k D_kΔr_k + \\frac{1}{2}∑_k \\op{Conv}_kΔr_k^2',
  modified: 'D_{\\op{mod}} = \\frac{D_{\\op{Mac}}}{1 + y/m}',
  duration: '\\frac{ΔP}{P} ≈ -D_{\\op{mod}}\\,Δy',
  discount: 'DF(t) = e^{-r(t)\\,t}',
  cip: 'F = X\\,e^{(r - r_f)(T - t)}',
  basis: 'F^{\\op{mkt}} = X\\,e^{(r - r_f + b)(T - t)}',
  swapSpread: 'a_{FX} ≈ (r - r_f)\\,T',
  decomposition: 'P = \\op{BV} + \\left(\\frac{E}{k} - \\op{BV}\\right) + \\op{PVGO}',
  impliedGrowth: 'P = \\frac{E(1 + g)}{k - g}',
};

const PASSIVE = {
  tracking: '\\op{TE} = \\sqrt{\\op{Var}(r_p - r_b)}',
  strips: 'P = \\frac{F}{(1 + y)^T}',
};

const PIR = {
  benchmark: 'r_b = w_1\\,r_{\\op{MIB}} + w_2\\,r_{\\op{MS}}',
  active: 'α_t = r_{p,t} - r_{b,t}',
  weight: 'w_i = w_0 + b · 1_{\\op{OW}}',
  debt: 'Δd = (r - g)\\,d - \\op{pb}',
  ccc: '\\op{CCC} = \\op{DIO} + \\op{DSO} - \\op{DPO}',
  cet1: '\\op{CET1 ratio} = \\frac{\\op{CET1}}{\\op{RWA}}',
};

// ---- the scenes ----------------------------------------------------

export const SCENES: Record<SceneKey, SceneContent> = {
  // The latest of every division, each formula with its desk, so the
  // focus can visit one desk at a time.
  home: {
    formulas: [
      ...f(QR, QUANT.dupireFx, QUANT.breeden, QUANT.heston, QUANT.pdv, QUANT.gilPelaez),
      ...f(ER, EQUITY.wacc, EQUITY.ptbv, EQUITY.residual, EQUITY.gordon),
      ...f(MR, MACRO.meritOrder, MACRO.uniform, MACRO.critical, MACRO.hedge),
      ...f(IR, INVESTMENT.dv01, INVESTMENT.carry, INVESTMENT.vecm),
      ...f(PM, LONG_SHORT.tsfm, LONG_SHORT.hrp, MULTI_ASSET.keyRate, MULTI_ASSET.cip, RISK.var),
    ],
    exhibits: [
      ...x(QR, 'localVolSurface'),
      ...x(MR, 'meritOrder'),
      ...x(ER, 'sensitivityGrid', 'footballField'),
      ...x(IR, 'preferenceBoard', 'curvePair'),
      ...x(PM, 'factorBars', 'keyRateLadder', 'hrpTree', 'studentT'),
    ],
  },

  'division:quant': {
    formulas: f(QR, QUANT.dupire, QUANT.dupireFx, QUANT.breeden, QUANT.heston, QUANT.lsv, QUANT.gilPelaez, QUANT.cos,
      QUANT.pdv, QUANT.pdvKernel, QUANT.garch11, QUANT.ar1, QUANT.vrp, QUANT.chen, QUANT.levy, QUANT.lash),
    exhibits: x(QR, 'localVolSurface', 'pdvSurface', 'charSpiral', 'barrierPaths', 'arFan', 'vrpSpline', 'levyArea', 'priceYield'),
  },
  'division:macro': {
    formulas: f(MR, MACRO.meritOrder, MACRO.uniform, MACRO.payAsBid, MACRO.clearing, MACRO.critical, MACRO.revenue, MACRO.hedge, MACRO.dollarisation),
    exhibits: x(MR, 'meritOrder', 'reserveShares', 'tariffHistory', 'policyLadder', 'ledgerBlocks', 'creditNetwork'),
  },
  'division:equity': {
    formulas: f(ER, EQUITY.wacc, EQUITY.capm, EQUITY.blume, EQUITY.hamada, EQUITY.fcff, EQUITY.gordon, EQUITY.ddm,
      EQUITY.residual, EQUITY.ptbv, EQUITY.growth, EQUITY.harmonic),
    exhibits: x(ER, 'sensitivityGrid', 'footballField', 'rebasedPair', 'compsGrid', 'riFade', 'cet1Bars', 'roeCapital', 'roicWacc'),
  },
  'division:investment': {
    formulas: f(IR, INVESTMENT.dv01, INVESTMENT.spread, INVESTMENT.carry, INVESTMENT.vecm, INVESTMENT.garch, INVESTMENT.debt),
    exhibits: x(IR, 'preferenceBoard', 'curvePair', 'bundStep', 'spreadLevels', 'cointegrated', 'garchClusters', 'transitsCollapse', 'goldRealYield'),
  },
  'division:portfolio': {
    formulas: f(PM, LONG_SHORT.tsfm, LONG_SHORT.hrp, LONG_SHORT.amihud, MULTI_ASSET.cip, MULTI_ASSET.decomposition,
      MULTI_ASSET.keyRate, RISK.portfolioReturn, RISK.covariance, RISK.var, RISK.garchPQ, RISK.ks),
    exhibits: x(PM, 'factorBars', 'hrpTree', 'keyRateLadder', 'fxForward', 'allocationBlocks', 'maturitySlide', 'covarianceGrid', 'garchRolling', 'addsRemovals'),
  },

  'fund:long-short': {
    formulas: f(PM, LONG_SHORT.tsfm, LONG_SHORT.tsfmScale, LONG_SHORT.nelsonSiegel, LONG_SHORT.rateShock, LONG_SHORT.tailBeta,
      LONG_SHORT.amihud, LONG_SHORT.hrp, LONG_SHORT.sharpe, RISK.var, RISK.esT, RISK.portfolioVar, RISK.garchPQ,
      LONG_SHORT.vif, LONG_SHORT.betaHedge),
    exhibits: x(PM, 'factorBars', 'bookSilhouette', 'correlationGrid', 'nsBetas', 'studentT', 'hrpTree', 'garchRolling', 'momentumCrash', 'scoreLadder'),
  },
  'fund:multi-asset': {
    formulas: f(PM, MULTI_ASSET.bondPrice, MULTI_ASSET.keyRate, MULTI_ASSET.modified, MULTI_ASSET.duration, MULTI_ASSET.discount,
      MULTI_ASSET.cip, MULTI_ASSET.basis, MULTI_ASSET.swapSpread, MULTI_ASSET.decomposition, MULTI_ASSET.impliedGrowth,
      RISK.var, RISK.esIntegral, RISK.garchPQ, RISK.covariance, RISK.ks),
    exhibits: x(PM, 'keyRateLadder', 'curveShifts', 'cashflowComb', 'sleeveBalance', 'studentT', 'bootstrap', 'fxForward', 'addsRemovals', 'supplyGap', 'valuationStack'),
  },
  'fund:dps': {
    formulas: f(PM, RISK.portfolioReturn, PASSIVE.tracking, PASSIVE.strips, MULTI_ASSET.duration, RISK.var, RISK.esIntegral,
      RISK.garchPQ, RISK.ks, RISK.covariance),
    exhibits: x(PM, 'allocationBlocks', 'tracking', 'maturitySlide', 'hedgePair', 'factorTilt', 'termStructure', 'strips', 'studentT'),
  },
  'fund:pir': {
    formulas: f(PM, PIR.benchmark, PIR.active, PIR.weight, PIR.debt, PIR.ccc, PIR.cet1, RISK.var, RISK.esIntegral, RISK.ks),
    exhibits: x(PM, 'pirNest', 'sizeTiers', 'weightRule', 'benchmarkBlend', 'cashCycle', 'capitalBar', 'debtDynamics', 'bootstrap'),
  },
};
