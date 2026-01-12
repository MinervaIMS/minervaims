import { useState, useEffect, useRef } from 'react';
import { FileText, Loader2 } from 'lucide-react';
import * as pdfjsLib from 'pdfjs-dist';

// Configure PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

interface PdfThumbnailProps {
  fileUrl: string;
  width?: number;
  height?: number;
  className?: string;
  title?: string;
  onClick?: () => void;
}

export function PdfThumbnail({
  fileUrl,
  width = 144,
  height = 192,
  className = '',
  title,
  onClick,
}: PdfThumbnailProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [isVisible, setIsVisible] = useState(false);

  // Lazy loading with IntersectionObserver
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setIsVisible(true);
            observer.disconnect();
          }
        });
      },
      { rootMargin: '100px' }
    );

    observer.observe(container);
    return () => observer.disconnect();
  }, []);

  // Render PDF when visible
  useEffect(() => {
    if (!isVisible || !fileUrl) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    let cancelled = false;

    const renderPdf = async () => {
      try {
        setIsLoading(true);
        setHasError(false);

        // Load the PDF document
        const loadingTask = pdfjsLib.getDocument({
          url: fileUrl,
          disableAutoFetch: true,
          disableStream: true,
        });

        const pdf = await loadingTask.promise;
        if (cancelled) return;

        // Get the first page
        const page = await pdf.getPage(1);
        if (cancelled) return;

        // Calculate scale to fit the container while maintaining aspect ratio
        const originalViewport = page.getViewport({ scale: 1 });
        const scaleX = width / originalViewport.width;
        const scaleY = height / originalViewport.height;
        const scale = Math.min(scaleX, scaleY);

        const viewport = page.getViewport({ scale });

        // Set canvas dimensions
        const devicePixelRatio = window.devicePixelRatio || 1;
        canvas.width = viewport.width * devicePixelRatio;
        canvas.height = viewport.height * devicePixelRatio;
        canvas.style.width = `${viewport.width}px`;
        canvas.style.height = `${viewport.height}px`;

        const context = canvas.getContext('2d');
        if (!context) throw new Error('Canvas context not available');

        context.scale(devicePixelRatio, devicePixelRatio);

        // Render the page
        await page.render({
          canvasContext: context,
          viewport,
        }).promise;

        if (cancelled) return;
        setIsLoading(false);
      } catch (error) {
        if (cancelled) return;
        console.error('Error rendering PDF thumbnail:', error);
        setHasError(true);
        setIsLoading(false);
      }
    };

    renderPdf();

    return () => {
      cancelled = true;
    };
  }, [isVisible, fileUrl, width, height]);

  return (
    <div
      ref={containerRef}
      className={`relative flex items-center justify-center overflow-hidden ${className}`}
      style={{ width, height }}
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      title={title}
      onKeyDown={onClick ? (e) => e.key === 'Enter' && onClick() : undefined}
    >
      {/* Loading state */}
      {isLoading && !hasError && (
        <div className="absolute inset-0 flex items-center justify-center bg-muted/50">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      )}

      {/* Error state */}
      {hasError && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-muted gap-2">
          <FileText className="h-8 w-8 text-muted-foreground" />
          <span className="text-xs text-muted-foreground">Preview unavailable</span>
        </div>
      )}

      {/* Canvas for PDF rendering */}
      <canvas
        ref={canvasRef}
        className={`${isLoading || hasError ? 'opacity-0' : 'opacity-100'} transition-opacity duration-200`}
      />
    </div>
  );
}
