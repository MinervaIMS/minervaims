/**
 * The homepage scene's chunk, as one shared loader.
 *
 * The page calls it early, to fetch the script while its own data is in
 * flight; the hero's `lazy()` calls it again to mount the component. Both
 * resolve to the same module, so it is only ever downloaded once.
 */
export const loadMarketScene = () => import('./MarketScene');
