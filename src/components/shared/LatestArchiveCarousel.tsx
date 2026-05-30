import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Division, divisionLabels } from '@/lib/types';
import { ArrowRight } from 'lucide-react';
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

interface LatestArchiveCarouselProps {
  files?: ArchiveFile[];
}

export function LatestArchiveCarousel({ files: propFiles }: LatestArchiveCarouselProps = {}) {
  const [files, setFiles] = useState<ArchiveFile[]>(propFiles || []);
  const [isLoading, setIsLoading] = useState(!propFiles);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (propFiles) {
      setFiles(propFiles);
      setIsLoading(false);
    } else {
      fetchLatestFiles();
    }
  }, [propFiles]);

  const fetchLatestFiles = async () => {
    try {
      const { data, error } = await supabase
        .from('archive_files')
        .select('id, title, file_url, date, division')
        .order('date', { ascending: false })
        .limit(15);

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
        <p className="font-body text-muted-foreground">Loading latest reports...</p>
      </div>
    );
  }

  if (files.length === 0) {
    return null;
  }

  // Total items including the "Browse Archive" button
  const totalItems = files.length + 1;

  return (
    <div className="relative">
      {/* Scrollable container */}
      <div
        ref={scrollContainerRef}
        className="flex overflow-x-auto scrollbar-hide pb-4 scroll-smooth snap-x snap-mandatory gap-[60px]"
        style={{ WebkitOverflowScrolling: 'touch', contain: 'layout' } as React.CSSProperties}
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
                className="w-full bg-background mb-5"
                alt={`Preview of ${file.title}`}
              />
            </div>

            {/* Meta */}
            <div className="flex items-center gap-3 mb-3">
              <time className="font-body text-sm text-background/60 uppercase tracking-wider group-hover:text-background/80 transition-colors">
                {formatDate(file.date)}
              </time>
              <span className="font-body text-sm text-background/80 uppercase tracking-wider">
                {divisionLabels[file.division as Division]}
              </span>
            </div>

            {/* Title */}
            <h3 className="font-serif text-xl leading-tight line-clamp-2 text-background group-hover:text-background/80 transition-colors">
              {file.title}
            </h3>
          </Link>
        ))}

        {/* Browse Archive button as last item */}
        <div 
          className="flex-shrink-0 flex items-center justify-center snap-start"
          style={{ width: `${ITEM_WIDTH}px` }}
        >
          <Link
            to="/archive"
            className="flex flex-col items-center justify-center gap-5 w-full transition-all duration-300 group"
            style={{ height: `${ITEM_WIDTH * 1.4142}px` }}
          >
            {/* White circle with accent arrow */}
            <div className="flex items-center justify-center w-16 h-16 rounded-full bg-background group-hover:scale-110 transition-all duration-300">
              <ArrowRight className="w-6 h-6 text-accent group-hover:translate-x-0.5 transition-all duration-300" />
            </div>
            
            <span className="font-serif text-sm text-background uppercase tracking-[0.2em]">
              Browse Archive
            </span>
          </Link>
        </div>
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
