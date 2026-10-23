import { memo, useEffect, useMemo, useRef } from 'react';
import { usePageKeyNumbers } from '@/hooks/useKeyNumbers';
import { formatKeyNumber } from '@/lib/key-numbers';
import { loadFundLines } from '@/lib/fund-lines-api';
import { FUND_FIGURE_LINES, FUNDS_PAGE, MONITOR_PAGE, monitorDate } from '@/lib/market-monitor';
import { fundShortLabels } from '@/lib/types';
import type { SceneKey } from './content';
import { startScene, type Obstacle, type SceneHandle } from './engine';
import type { FundTag, MonitorRow } from './painters';
import { SANS, SERIF } from './typeset';

// =====================================================================
// The canvas half of a page's moving ground, and the only part of it that
// is code-split: this module and everything it imports (the engine, the
// painters, the exhibits, the typesetter and the content) arrive as one
// small chunk, fetched while the page is still loading its data and
// mounted only after the page has painted. See HeroMarketBackground.
//
// On the homepage it also gathers the official figures the scene draws:
// the market monitor and the funds' cumulative returns, as text, from
// the key numbers registry (the same text the ticker at the foot of the
// hero prints), and the funds' official lines (lib/fund-lines.ts).
// =====================================================================

interface Props {
  scene: SceneKey;
  form: 'hero' | 'band';
  /** False draws a single composed frame: reduced motion, lite browsers. */
  animate: boolean;
  /** Fired once the first frame is on the canvas, not on mount. */
  onPainted?: () => void;
  /** Where the header, the logo or title and the button are. */
  obstacles?: () => Obstacle[];
  /** Elements whose resizing means those may have moved. */
  watch?: () => Element[];
}

/**
 * The scene sets its type in the site's own faces, so it waits for them,
 * briefly. By the time the page is up they are almost always loaded
 * already, and if they are not after 900ms the scene draws with the
 * fallbacks rather than hold the opening back.
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

const MarketScene = memo(function MarketScene({ scene, form, animate, onPainted, obstacles, watch }: Props) {
  const ref = useRef<HTMLCanvasElement | null>(null);
  const handle = useRef<SceneHandle | null>(null);
  // Read through refs: the scene is started once per `animate`, and must
  // not be torn down because a parent passed new closures.
  const onPaintedRef = useRef(onPainted);
  onPaintedRef.current = onPainted;
  const obstaclesRef = useRef(obstacles);
  obstaclesRef.current = obstacles;
  const watchRef = useRef(watch);
  watchRef.current = watch;

  // The official figures, as the page prints them (homepage only).
  const home = scene === 'home';
  const monitorFigures = usePageKeyNumbers(MONITOR_PAGE);
  const fundFigures = usePageKeyNumbers(FUNDS_PAGE);
  const monitor = useMemo<MonitorRow[]>(() => (home ? monitorFigures.map((n) => ({
    slug: n.slug, label: n.label, value: formatKeyNumber(n), date: monitorDate(n.slug, n),
  })) : []), [home, monitorFigures]);
  const tags = useMemo<FundTag[]>(() => (home ? fundFigures
    .filter((n) => FUND_FIGURE_LINES[n.slug] && n.as_of)
    .map((n) => {
      const fund = FUND_FIGURE_LINES[n.slug];
      return { fund, name: fundShortLabels[fund], value: formatKeyNumber(n), date: monitorDate(n.slug, n), month: (n.as_of as string).slice(0, 7) };
    }) : []), [home, fundFigures]);
  const figuresRef = useRef({ monitor, tags });
  figuresRef.current = { monitor, tags };
  const linesRef = useRef<Parameters<SceneHandle['setFigures']>[0]['lines'] | null>(null);

  useEffect(() => {
    let cancelled = false;
    // The lines are in the page already when the build embedded them;
    // otherwise they are asked for at once and handed over when they
    // arrive. The scene never waits for them.
    const lines = home ? loadFundLines() : null;
    fontsReady().then(() => {
      if (cancelled || !ref.current) return;
      const started = startScene(ref.current, {
        scene,
        form,
        animate,
        onPainted: () => onPaintedRef.current?.(),
        obstacles: () => obstaclesRef.current?.() ?? [],
        watch: () => watchRef.current?.() ?? [],
      });
      handle.current = started;
      lines?.then((snap) => {
        if (cancelled) return;
        linesRef.current = snap.lines;
        started.setFigures({ ...figuresRef.current, lines: snap.lines });
      });
    });
    return () => {
      cancelled = true;
      handle.current?.destroy();
      handle.current = null;
    };
  }, [animate, scene, form, home]);

  // Figures that arrive after the scene has started (a live read on a page
  // without embedded figures) are handed over once; the registry never
  // replaces a value already shown (hooks/useKeyNumbers.ts).
  useEffect(() => {
    if (!home || !handle.current || !linesRef.current) return;
    handle.current.setFigures({ monitor, tags, lines: linesRef.current });
  }, [home, monitor, tags]);

  return <canvas ref={ref} className="block h-full w-full" aria-hidden="true" data-scene={scene} />;
});

export default MarketScene;
