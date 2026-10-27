import { useEffect, useState, RefObject } from 'react';
import { DotPager } from './DotPager';

interface CarouselScrollIndicatorProps {
  containerRef: RefObject<HTMLDivElement>;
  itemCount: number;
  itemWidth: number;
}

export function CarouselScrollIndicator({ 
  containerRef, 
  itemCount,
  itemWidth 
}: CarouselScrollIndicatorProps) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [visibleDots, setVisibleDots] = useState(itemCount);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    let rafId: number;

    const calculateVisibleDots = () => {
      // Use requestAnimationFrame to avoid forced reflow
      rafId = requestAnimationFrame(() => {
        if (!container) return;
        const { clientWidth } = container;
        // Calculate how many items fit in viewport
        const itemsPerView = Math.max(1, Math.floor(clientWidth / itemWidth));
        // Number of "pages" or scroll positions
        const dots = Math.max(1, itemCount - itemsPerView + 1);
        setVisibleDots(Math.min(dots, itemCount));
      });
    };

    const handleScroll = () => {
      // Use requestAnimationFrame to batch layout reads
      rafId = requestAnimationFrame(() => {
        if (!container) return;
        const { scrollLeft, scrollWidth, clientWidth } = container;
        const maxScroll = scrollWidth - clientWidth;
        
        if (maxScroll <= 0) {
          setActiveIndex(0);
          return;
        }

        // Calculate progress as percentage
        const progress = scrollLeft / maxScroll;
        // Map progress to dot index
        const newIndex = Math.round(progress * (visibleDots - 1));
        setActiveIndex(Math.max(0, Math.min(newIndex, visibleDots - 1)));
      });
    };

    calculateVisibleDots();
    handleScroll();

    container.addEventListener('scroll', handleScroll, { passive: true });
    window.addEventListener('resize', calculateVisibleDots);

    return () => {
      container.removeEventListener('scroll', handleScroll);
      window.removeEventListener('resize', calculateVisibleDots);
      if (rafId) cancelAnimationFrame(rafId);
    };
  }, [containerRef, itemCount, itemWidth, visibleDots]);

  // Don't show dots if only 1 or fewer positions
  if (visibleDots <= 1) return null;

  const goTo = (index: number) => {
    const container = containerRef.current;
    if (!container) return;

    // Use requestAnimationFrame to avoid forced reflow on click
    requestAnimationFrame(() => {
      const { scrollWidth, clientWidth } = container;
      const maxScroll = scrollWidth - clientWidth;
      const targetScroll = (index / (visibleDots - 1)) * maxScroll;

      container.scrollTo({
        left: targetScroll,
        behavior: 'smooth'
      });
    });
  };

  return (
    // One dot style site-wide: see the shared rule in src/index.css. These
    // rails sit on the navy strip, hence the dark-ground modifier. The dots
    // are one control (DotPager), large enough for a finger.
    <div className="mdots mdots--ondark mt-6">
      <DotPager
        count={visibleDots}
        active={activeIndex}
        onSelect={goTo}
        label="Slides"
        valueText={(i, n) => `Slide ${i + 1} of ${n}`}
        dotClass="mdot"
        activeClass="is-on"
      />
    </div>
  );
}
