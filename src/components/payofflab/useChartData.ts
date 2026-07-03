// PayoffLab — data hook: debounced grid fetches per chart, with a staged
// progress estimate for the loading bar (§12). Heavy work runs in the edge
// function, so the UI thread never blocks.

import { useEffect, useMemo, useRef, useState } from "react";
import type { ChartState, GreekName, GridResult } from "@/lib/payofflab/types";
import { estimateLatencyMs, fetchCompareGrid, fetchGrid, gridBodyFor } from "@/lib/payofflab/api";

export interface ChartData {
  grid: GridResult | null;
  compare: GridResult | null;
  loading: boolean;
  /** 0..1 progress estimate while loading (staged, time-based). */
  progress: number;
  /** Show the bar only for slow computations (> ~200 ms). */
  showProgress: boolean;
  error: string | null;
}

export function useChartData(chart: ChartState, extraGreeks: GreekName[] = []): ChartData {
  const [grid, setGrid] = useState<GridResult | null>(null);
  const [compare, setCompare] = useState<GridResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [showProgress, setShowProgress] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const genRef = useRef(0);

  const greeks = useMemo(() => {
    const set = new Set<GreekName>(chart.greeks);
    for (const g of extraGreeks) set.add(g);
    return Array.from(set);
  }, [chart.greeks, extraGreeks]);

  const requestKey = useMemo(() => {
    if (chart.legs.length === 0) return "";
    return JSON.stringify({ b: gridBodyFor(chart, greeks), cmp: chart.compareModel });
  }, [chart, greeks]);

  useEffect(() => {
    if (!requestKey) {
      setGrid(null);
      setCompare(null);
      setError(null);
      setLoading(false);
      return;
    }
    const gen = ++genRef.current;
    let progressTimer: ReturnType<typeof setInterval> | null = null;
    let showTimer: ReturnType<typeof setTimeout> | null = null;

    const debounce = setTimeout(async () => {
      if (gen !== genRef.current) return;
      setLoading(true);
      setError(null);
      const est = estimateLatencyMs(chart);
      const started = Date.now();
      setProgress(0);
      setShowProgress(false);
      showTimer = setTimeout(() => {
        if (gen === genRef.current) setShowProgress(true);
      }, 220);
      progressTimer = setInterval(() => {
        if (gen !== genRef.current) return;
        const f = (Date.now() - started) / est;
        setProgress(Math.min(0.92, f * 0.9));
      }, 120);
      try {
        const [g, c] = await Promise.all([
          fetchGrid(chart, greeks),
          chart.compareModel ? fetchCompareGrid(chart).catch(() => null) : Promise.resolve(null),
        ]);
        if (gen !== genRef.current) return;
        setGrid(g);
        setCompare(c);
        setProgress(1);
      } catch (e) {
        if (gen !== genRef.current) return;
        setError(e instanceof Error ? e.message : "Pricing failed");
      } finally {
        if (gen === genRef.current) {
          setLoading(false);
          setTimeout(() => {
            if (gen === genRef.current) setShowProgress(false);
          }, 300);
        }
      }
    }, 260);

    return () => {
      clearTimeout(debounce);
      if (showTimer) clearTimeout(showTimer);
      if (progressTimer) clearInterval(progressTimer);
    };
    // requestKey encodes every input that matters.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [requestKey]);

  return { grid, compare, loading, progress, showProgress, error };
}
