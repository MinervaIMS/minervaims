import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Division, divisionLabels } from '@/lib/types';
import { ArrowRight } from 'lucide-react';
import { PdfThumbnail } from './PdfThumbnail';

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
        .limit(8);

      if (error) throw error;
      setFiles(data || []);
    } catch (error) {
      console.error('Error fetching latest files:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const updateScrollState = () => {
    if (scrollContainerRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = scrollContainerRef.current;
      setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 10);
    }
  };

  useEffect(() => {
    updateScrollState();
    const container = scrollContainerRef.current;
    if (container) {
      container.addEventListener('scroll', updateScrollState);
      window.addEventListener('resize', updateScrollState);
      return () => {
        container.removeEventListener('scroll', updateScrollState);
        window.removeEventListener('resize', updateScrollState);
      };
    }
  }, [files]);

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
      {/* Scrollable container */}
      <div
        ref={scrollContainerRef}
        className="flex overflow-x-auto scrollbar-hide pb-4 -mx-2 px-2 scroll-smooth snap-x snap-mandatory"
      >
        {files.map((file) => (
          <article
            key={file.id}
            className="flex-shrink-0 w-[450px] px-8 first:pl-0 border-r border-background/20 last:border-r-0 group cursor-pointer snap-start"
          >
            {/* PDF Preview - Larger vertical preview */}
            <div className="w-full h-[480px] bg-background/10 overflow-hidden mb-5 group-hover:bg-background/20 transition-colors flex items-center justify-center">
              <PdfThumbnail
                fileUrl={file.file_url}
                width={340}
                height={480}
                title={`Preview of ${file.title}`}
                className="group-hover:opacity-90 transition-opacity"
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
          </article>
        ))}

        {/* Archive button as last item */}
        <div className="flex-shrink-0 w-[450px] px-8 flex items-center justify-center snap-start">
          <Link
            to="/archive"
            className="flex flex-col items-center justify-center gap-4 w-full h-[480px] border border-background/30 hover:border-background/60 hover:bg-background/10 transition-all group"
          >
            <ArrowRight className="w-8 h-8 text-background/60 group-hover:text-background transition-colors" />
            <span className="font-body text-lg text-background/80 group-hover:text-background transition-colors uppercase tracking-wider">
              Browse Archive
            </span>
          </Link>
        </div>
      </div>

    </div>
  );
}
