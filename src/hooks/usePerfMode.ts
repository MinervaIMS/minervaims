import { useEffect, useState } from 'react';
import { perfMode, type PerfMode } from '@/lib/perf';

/**
 * The current motion budget, answered ON THE FIRST RENDER.
 *
 * It is read synchronously in the state initialiser rather than settled in
 * an effect, because a component that renders once as "full" and again as
 * "lite" a frame later would mount a WebGL canvas and immediately throw it
 * away, which is worse than either answer. The listener exists only for
 * the one-way downgrade the frame-rate sampler can make about a second in.
 */
export function usePerfMode(): PerfMode {
  const [mode, setMode] = useState<PerfMode>(() => perfMode());
  useEffect(() => {
    const onChange = (e: Event) => setMode((e as CustomEvent<PerfMode>).detail);
    window.addEventListener('mims:perfmode', onChange);
    return () => window.removeEventListener('mims:perfmode', onChange);
  }, []);
  return mode;
}

/** True when the browser has asked for, or earned, the reduced treatment. */
export function useLiteMotion(): boolean {
  return usePerfMode() === 'lite';
}

export default usePerfMode;
