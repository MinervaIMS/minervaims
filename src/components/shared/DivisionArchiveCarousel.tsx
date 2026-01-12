import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Division } from '@/lib/types';
import { PdfThumbnail } from './PdfThumbnail';
import { CarouselScrollIndicator } from './CarouselScrollIndicator';

const ITEM_WIDTH = 320; // Consistent width for all items

interface ArchiveFile {
  id: string;
  title: string;
  file_url: string;
  date: string;
  division: string;
}

interface DivisionArchiveCarouselProps {
  division: Division;
}

export function DivisionArchiveCarousel({ division }: DivisionArchiveCarouselProps) {
  const [files, setFiles] = useState<ArchiveFile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchLatestFiles();
  }, [division]);

  const fetchLatestFiles = async () => {
    try {
      const { data, error } = await supabase
        .from('archive_files')
        .select('id, title, file_url, date, division')
        .eq('division', division)
        .order('date', { ascending: false })
        .limit(5);

      if (error) throw error;
      setFiles(data || []);
    } catch (error) {
      console.error('Error fetching latest files:', error);
    } finally {
      setIsLoading(false);
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
        <p className="font-body text-background/60">Loading latest reports...</p>
      </div>
    );
  }

  if (files.length === 0) {
    return (
      <div className="py-8">
        <p className="font-body text-background/60">No reports available yet.</p>
      </div>
    );
  }

  const totalItems = files.length;

  return (
    <div className="relative">
      {/* Scrollable container */}
      <div
        ref={scrollContainerRef}
        className="flex overflow-x-auto scrollbar-hide pb-4 scroll-smooth snap-x snap-mandatory gap-[60px]"
        style={{ WebkitOverflowScrolling: 'touch' } as React.CSSProperties}
      >
        {files.map((file) => (
          <Link
            key={file.id}
            to={`/archive?fileId=${file.id}`}
            className="flex-shrink-0 group cursor-pointer snap-start"
            style={{ width: `${ITEM_WIDTH}px` }}
          >
            {/* PDF Preview - fixed width container */}
            <div className="w-full">
              <PdfThumbnail
                url={file.file_url}
                className="w-full bg-white mb-5"
                alt={`Preview of ${file.title}`}
              />
            </div>

            {/* Meta */}
            <div className="flex items-center gap-3 mb-3">
              <time className="font-body text-sm text-background/60 uppercase tracking-wider group-hover:text-background/80 transition-colors">
                {formatDate(file.date)}
              </time>
            </div>

            {/* Title */}
            <h3 className="font-serif text-xl leading-tight line-clamp-2 text-background group-hover:text-background/80 transition-colors">
              {file.title}
            </h3>
          </Link>
        ))}

      </div>

      {/* Scroll indicator dots */}
      <CarouselScrollIndicator 
        containerRef={scrollContainerRef}
        itemCount={totalItems}
        itemWidth={ITEM_WIDTH}
      />
    </div>
  );
}
