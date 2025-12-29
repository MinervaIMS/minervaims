import { useState, useEffect, useRef } from 'react';

export function useAnimatedCounter(targetValue: number, duration: number = 1500, enabled: boolean = true) {
  const [displayValue, setDisplayValue] = useState(0);
  const animationRef = useRef<number>();
  const startTimeRef = useRef<number>();
  const hasAnimated = useRef(false);

  useEffect(() => {
    if (!enabled || targetValue === 0 || hasAnimated.current) return;

    hasAnimated.current = true;
    const startValue = 0;
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

      setDisplayValue(currentValue);

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
