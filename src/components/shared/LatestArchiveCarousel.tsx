import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Division, divisionLabels } from '@/lib/types';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface ArchiveFile {
  id: string;
  title: string;
  file_url: string;
  date: string;
  division: string;
}

export function LatestArchiveCarousel() {
  const [files, setFiles] = useState<ArchiveFile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  useEffect(() => {
    fetchLatestFiles();
  }, []);

  const fetchLatestFiles = async () => {
    try {
      const { data, error } = await supabase
        .from('archive_files')
        .select('id, title, file_url, date, division')
        .order('date', { ascending: false })
        .limit(9);

      if (error) throw error;
      setFiles(data || []);
    } catch (error) {
      console.error('Error fetching latest files:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const updateScrollButtons = () => {
    if (scrollContainerRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = scrollContainerRef.current;
      setCanScrollLeft(scrollLeft > 0);
      setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 10);
    }
  };

  useEffect(() => {
    updateScrollButtons();
    const container = scrollContainerRef.current;
    if (container) {
      container.addEventListener('scroll', updateScrollButtons);
      window.addEventListener('resize', updateScrollButtons);
      return () => {
        container.removeEventListener('scroll', updateScrollButtons);
        window.removeEventListener('resize', updateScrollButtons);
      };
    }
  }, [files]);

  const scroll = (direction: 'left' | 'right') => {
    if (scrollContainerRef.current) {
      const cardWidth = 340; // Approximate card width + gap
      const scrollAmount = direction === 'left' ? -cardWidth : cardWidth;
      scrollContainerRef.current.scrollBy({ left: scrollAmount, behavior: 'smooth' });
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  if (isLoading) {
    return (
      <div className="py-8">
        <p className="font-body text-muted-foreground">Loading latest reports...</p>
      </div>
    );
  }

  if (files.length === 0) {
    return null;
  }

  return (
    <div className="relative">
      {/* Scroll buttons */}
      {canScrollLeft && (
        <button
          onClick={() => scroll('left')}
          className="absolute left-0 top-1/2 -translate-y-1/2 z-10 w-10 h-10 bg-foreground border border-background/20 flex items-center justify-center hover:bg-background/10 transition-colors -ml-5"
          aria-label="Scroll left"
        >
          <ChevronLeft className="w-5 h-5 text-background" />
        </button>
      )}
      {canScrollRight && (
        <button
          onClick={() => scroll('right')}
          className="absolute right-0 top-1/2 -translate-y-1/2 z-10 w-10 h-10 bg-foreground border border-background/20 flex items-center justify-center hover:bg-background/10 transition-colors -mr-5"
          aria-label="Scroll right"
        >
          <ChevronRight className="w-5 h-5 text-background" />
        </button>
      )}

      {/* Scrollable container */}
      <div
        ref={scrollContainerRef}
        className="flex overflow-x-auto scrollbar-hide pb-4 -mx-2 px-2 divide-x divide-background/30"
        style={{ scrollSnapType: 'x mandatory' }}
      >
        {files.map((file) => (
          <article
            key={file.id}
            className="flex-shrink-0 w-80 px-6 first:pl-0"
            style={{ scrollSnapAlign: 'start' }}
          >
            {/* PDF Preview */}
            <div className="w-full h-44 bg-background/10 overflow-hidden mb-4">
              <iframe
                src={`${file.file_url}#page=1&view=FitH&toolbar=0&navpanes=0&scrollbar=0`}
                className="w-[200%] h-[200%] scale-50 origin-top-left pointer-events-none"
                title={`Preview of ${file.title}`}
              />
            </div>

            {/* Meta */}
            <div className="flex items-center gap-3 mb-2">
              <time className="font-body text-xs text-background/60 uppercase tracking-wider">
                {formatDate(file.date)}
              </time>
              <span className="font-body text-xs text-background/80 uppercase tracking-wider">
                {divisionLabels[file.division as Division]}
              </span>
            </div>

            {/* Title */}
            <h3 className="font-serif text-lg leading-tight line-clamp-2 text-background">
              {file.title}
            </h3>
          </article>
        ))}
      </div>
    </div>
  );
}
