/**
 * The scenes' chunk, as one shared loader.
 *
 * The background's `lazy()` calls it once the page's hero has painted,
 * never before: fetched any earlier, the script would compete with what
 * the page's loader waits for (the homepage logo is its LCP). Every call
 * resolves to the same module, so it is only ever downloaded once.
 *
 * IT NEVER FAILS. A chunk that cannot be fetched (a deploy that replaced
 * it under an open tab, a network that dropped the request) resolves to a
 * component that draws nothing, so the CSS ground simply stays. Letting
 * the import reject would reach the site's stale-deploy recovery in
 * main.tsx, which reloads the whole page: a background is not worth that.
 */
import type { ComponentProps, ComponentType } from 'react';
import type MarketSceneType from './MarketScene';

type SceneProps = ComponentProps<typeof MarketSceneType>;
type Scene = { default: ComponentType<SceneProps> };

const Nothing: ComponentType<SceneProps> = () => null;

let pending: Promise<Scene> | null = null;

export const loadMarketScene = (): Promise<Scene> => {
  if (!pending) {
    pending = import('./MarketScene').catch(() => {
      // The next call may try again (a later mount, a later page).
      pending = null;
      return { default: Nothing };
    });
  }
  return pending;
};
