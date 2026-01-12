import { useEffect, useRef, useState } from 'react';
import { FileText } from 'lucide-react';

interface PdfThumbnailProps {
  url: string;
  className?: string;
  alt?: string;
}

// Use dynamic import to avoid top-level await issues
let pdfjsLib: typeof import('pdfjs-dist') | null = null;

const loadPdfJs = async () => {
  if (!pdfjsLib) {
    // Use legacy build which doesn't require top-level await
    pdfjsLib = await import('pdfjs-dist/legacy/build/pdf.mjs');
    // Set worker from CDN (legacy version)
    pdfjsLib.GlobalWorkerOptions.workerSrc = 
      'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.0.379/pdf.worker.min.mjs';
  }
  return pdfjsLib;
};

export function PdfThumbnail({ url, className = '', alt = 'PDF Preview' }: PdfThumbnailProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const renderPdf = async () => {
      if (!canvasRef.current || !containerRef.current) return;

      try {
        setLoading(true);
        setError(false);

        const pdfjs = await loadPdfJs();

        const loadingTask = pdfjs.getDocument({
          url,
          // Disable range requests for better compatibility
          disableRange: true,
          disableStream: true,
        });

        const pdf = await loadingTask.promise;
        
        if (cancelled) return;

        const page = await pdf.getPage(1);
        
        if (cancelled) return;

        // Get container dimensions
        const container = containerRef.current;
        const containerWidth = container.clientWidth || 200;
        const containerHeight = container.clientHeight || 200;

        // Calculate scale to fit container while maintaining aspect ratio
        const viewport = page.getViewport({ scale: 1 });
        const scale = Math.min(
          containerWidth / viewport.width,
          containerHeight / viewport.height
        );

        const scaledViewport = page.getViewport({ scale });

        // Set canvas size
        const canvas = canvasRef.current;
        const context = canvas.getContext('2d');
        
        if (!context) {
          throw new Error('Could not get canvas context');
        }

        // Use device pixel ratio for sharper rendering
        const pixelRatio = window.devicePixelRatio || 1;
        canvas.width = scaledViewport.width * pixelRatio;
        canvas.height = scaledViewport.height * pixelRatio;
        canvas.style.width = `${scaledViewport.width}px`;
        canvas.style.height = `${scaledViewport.height}px`;

        context.scale(pixelRatio, pixelRatio);

        // Render the page
        await page.render({
          canvasContext: context,
          viewport: scaledViewport,
        }).promise;

        if (!cancelled) {
          setLoading(false);
        }
      } catch (err) {
        console.error('PDF render error:', err);
        if (!cancelled) {
          setError(true);
          setLoading(false);
        }
      }
    };

    renderPdf();

    return () => {
      cancelled = true;
    };
  }, [url]);

  return (
    <div 
      ref={containerRef} 
      className={`relative flex items-center justify-center overflow-hidden ${className}`}
    >
      {loading && !error && (
        <div className="absolute inset-0 flex items-center justify-center bg-muted animate-pulse">
          <FileText className="h-8 w-8 text-muted-foreground/50" />
        </div>
      )}
      {error && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-muted gap-2">
          <FileText className="h-8 w-8 text-muted-foreground/50" />
          <span className="text-muted-foreground text-xs text-center px-2">Preview unavailable</span>
        </div>
      )}
      <canvas 
        ref={canvasRef} 
        className={`max-w-full max-h-full object-contain ${loading || error ? 'opacity-0' : 'opacity-100'}`}
        title={alt}
      />
    </div>
  );
}
