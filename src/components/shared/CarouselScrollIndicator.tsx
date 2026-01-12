import { useEffect, useState, RefObject } from 'react';

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

    const calculateVisibleDots = () => {
      const { clientWidth } = container;
      // Calculate how many items fit in viewport
      const itemsPerView = Math.max(1, Math.floor(clientWidth / itemWidth));
      // Number of "pages" or scroll positions
      const dots = Math.max(1, itemCount - itemsPerView + 1);
      setVisibleDots(Math.min(dots, itemCount));
    };

    const handleScroll = () => {
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
    };

    calculateVisibleDots();
    handleScroll();

    container.addEventListener('scroll', handleScroll);
    window.addEventListener('resize', calculateVisibleDots);

    return () => {
      container.removeEventListener('scroll', handleScroll);
      window.removeEventListener('resize', calculateVisibleDots);
    };
  }, [containerRef, itemCount, itemWidth, visibleDots]);

  // Don't show dots if only 1 or fewer positions
  if (visibleDots <= 1) return null;

  return (
    <div className="flex justify-center items-center gap-2 mt-6">
      {Array.from({ length: visibleDots }).map((_, index) => (
        <button
          key={index}
          onClick={() => {
            const container = containerRef.current;
            if (!container) return;
            
            const { scrollWidth, clientWidth } = container;
            const maxScroll = scrollWidth - clientWidth;
            const targetScroll = (index / (visibleDots - 1)) * maxScroll;
            
            container.scrollTo({
              left: targetScroll,
              behavior: 'smooth'
            });
          }}
          className={`
            w-2 h-2 rounded-full transition-all duration-300 ease-out
            ${index === activeIndex 
              ? 'bg-background scale-125' 
              : 'bg-background/40 hover:bg-background/60'
            }
          `}
          aria-label={`Go to slide ${index + 1}`}
        />
      ))}
    </div>
  );
}
