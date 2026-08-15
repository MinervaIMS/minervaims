import { useState, useEffect, useRef } from 'react';

export function useAnimatedCounter(targetValue: number, duration: number = 1500, enabled: boolean = true) {
  const [displayValue, setDisplayValue] = useState(0);
  const animationRef = useRef<number>();
  const startTimeRef = useRef<number>();
  /**
   * The figure this counter has already counted up to.
   *
   * It used to be a plain boolean, latched on the first run and never
   * cleared, so a figure that CHANGED after the first count-up was never
   * shown: the card kept displaying the old number for the life of the
   * mount, with no indication that it was stale. Remembering the target
   * instead keeps the "count up once" behaviour for the ordinary case and
   * still lets a genuinely new figure be counted to.
   */
  const animatedTo = useRef<number | null>(null);
  /** What is on screen, readable without making the effect depend on it. */
  const shownRef = useRef(0);
  shownRef.current = displayValue;

  useEffect(() => {
    if (!enabled || targetValue === 0 || animatedTo.current === targetValue) return;

    // A first arrival counts up from zero; a later change counts on from
    // whatever is on screen, so a corrected figure moves rather than resets.
    const startValue = animatedTo.current === null ? 0 : shownRef.current;
    animatedTo.current = targetValue;
    startTimeRef.current = undefined;
    const difference = targetValue - startValue;

    const animate = (currentTime: number) => {
      if (!startTimeRef.current) {
        startTimeRef.current = currentTime;
      }

      const elapsed = currentTime - startTimeRef.current;
      const progress = Math.min(elapsed / duration, 1);
      
      // Ease-out cubic for smooth deceleration
      const easeOut = 1 - Math.pow(1 - progress, 3);
      const currentValue = Math.round(startValue + difference * easeOut);

      // ONE RENDER PER VISIBLE CHANGE, not one per frame. The figure is an
      // integer, so most frames of a count-up land on the number already
      // on screen; setting state for them re-rendered the card sixty times
      // a second for nothing, on all four cards at once, during the exact
      // moment the page is busiest.
      setDisplayValue((prev) => (prev === currentValue ? prev : currentValue));

      if (progress < 1) {
        animationRef.current = requestAnimationFrame(animate);
      }
    };

    animationRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [targetValue, duration, enabled]);

  // If not enabled or already showing value, return target directly
  if (!enabled) return targetValue;
  
  return displayValue;
}
