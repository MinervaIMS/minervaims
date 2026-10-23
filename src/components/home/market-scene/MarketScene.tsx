import { memo, useEffect, useRef } from 'react';
import { startScene, type Obstacle, type SceneHandle } from './engine';
import { loadFundSeries } from './fund-series';
import { SANS, SERIF } from './typeset';

// =====================================================================
// The canvas half of the homepage hero, and the only part of it that is
// code-split: this module and everything it imports (the engine, the
// painters, the typesetter and the content) arrive as one small chunk,
// fetched while the page is still loading its data and mounted only
// after the hero has painted. See HeroMarketBackground.
// =====================================================================

interface Props {
  /** False draws a single composed frame: reduced motion, lite browsers. */
  animate: boolean;
  /** Fired once the first frame is on the canvas, not on mount. */
  onPainted?: () => void;
  /** Where the header, the logo and the button are. */
  obstacles?: () => Obstacle[];
  /** Elements whose resizing means those may have moved. */
  watch?: () => Element[];
}

/**
 * The scene sets its type in the site's own faces, so it waits for them,
 * briefly. By the time the hero is up they are almost always loaded
 * already (the page uses both), and if they are not after 900ms the scene
 * draws with the fallbacks rather than hold the opening back.
 */
function fontsReady(): Promise<void> {
  const fonts = (document as Document & { fonts?: FontFaceSet }).fonts;
  if (!fonts?.load) return Promise.resolve();
  const loads = Promise.all([fonts.load(`400 16px ${SERIF}`), fonts.load(`400 16px ${SANS}`), fonts.load(`700 16px ${SANS}`)]);
  const cap = new Promise((resolve) => window.setTimeout(resolve, 900));
  return Promise.race([loads, cap]).then(
    () => undefined,
    () => undefined,
  );
}

const MarketScene = memo(function MarketScene({ animate, onPainted, obstacles, watch }: Props) {
  const ref = useRef<HTMLCanvasElement | null>(null);
  // Read through refs: the scene is started once per `animate`, and must
  // not be torn down because a parent passed new closures.
  const onPaintedRef = useRef(onPainted);
  onPaintedRef.current = onPainted;
  const obstaclesRef = useRef(obstacles);
  obstaclesRef.current = obstacles;
  const watchRef = useRef(watch);
  watchRef.current = watch;

  useEffect(() => {
    let scene: SceneHandle | null = null;
    let cancelled = false;
    // The funds' records are asked for at once (the page has usually
    // asked already, and the two requests are one; see fund-series.ts),
    // and handed over whenever they arrive. The scene never waits for them.
    const records = loadFundSeries();
    fontsReady().then(() => {
      if (cancelled || !ref.current) return;
      scene = startScene(ref.current, {
        animate,
        onPainted: () => onPaintedRef.current?.(),
        obstacles: () => obstaclesRef.current?.() ?? [],
        watch: () => watchRef.current?.() ?? [],
      });
      records.then((series) => {
        if (!cancelled && series.length) scene?.setFunds(series);
      });
    });
    return () => {
      cancelled = true;
      scene?.destroy();
    };
  }, [animate]);

  return <canvas ref={ref} className="block h-full w-full" aria-hidden="true" data-scene="market" />;
});

export default MarketScene;
