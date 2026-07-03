// PayoffLab — central capability / feature-flag layer (§2).
//
// EVERY premium-candidate feature checks this hook instead of hardcoding
// availability, so a future paywall (Basic free · Plus · Pro) is a config
// change here — not a refactor. Currently hard-wired to grant everything;
// no payments code exists or should exist yet. If tiers ship, resolve the
// flags from the user's subscription (and enforce server-side too: the
// pricing-engine function can verify the Supabase JWT).

export interface Entitlements {
  /** Advanced instrument families (FX, exotics, Monte Carlo). */
  advancedInstruments: boolean;
  /** Pricing / volatility / rate model selection. */
  modelSelection: boolean;
  /** Second-order Greeks and sign-region shading. */
  proGreeks: boolean;
  /** Hedging analytics incl. the discrete-hedging simulation. */
  hedging: boolean;
  /** Rate-sensitive instrument family. */
  rateInstruments: boolean;
  /** Multiple charts on one dashboard. */
  multiChart: boolean;
  /** PNG / CSV export. */
  exports: boolean;
  /** Encoded share URLs. */
  shareLinks: boolean;
}

const GRANT_ALL: Entitlements = {
  advancedInstruments: true,
  modelSelection: true,
  proGreeks: true,
  hedging: true,
  rateInstruments: true,
  multiChart: true,
  exports: true,
  shareLinks: true,
};

export function useEntitlements(): Entitlements {
  // Deliberately trivial for now — the seam is the point.
  return GRANT_ALL;
}
