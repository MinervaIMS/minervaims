import { useEffect, useRef, useState } from 'react';
import { FileText } from 'lucide-react';

interface PdfThumbnailProps {
  url: string;
  className?: string;
  alt?: string;
  /** Internal canvas render width in CSS px. Larger = sharper for large displays. */
  renderWidth?: number;
}

// PDF.js types (minimal subset we need)
interface PDFDocumentProxy {
  getPage(pageNumber: number): Promise<PDFPageProxy>;
}

interface PDFPageProxy {
  getViewport(params: { scale: number }): PDFPageViewport;
  render(params: { canvasContext: CanvasRenderingContext2D; viewport: PDFPageViewport }): { promise: Promise<void> };
}

interface PDFPageViewport {
  width: number;
  height: number;
}

interface PDFJSLib {
  getDocument(params: { url: string; disableRange?: boolean; disableStream?: boolean }): { promise: Promise<PDFDocumentProxy> };
  GlobalWorkerOptions: { workerSrc: string };
}

// A4 aspect ratio: 1:√2 ≈ 1:1.4142
const A4_ASPECT_RATIO = 1.4142;

// Load PDF.js from CDN - lazy loaded only when needed
let pdfjsLib: PDFJSLib | null = null;
let loadingPromise: Promise<PDFJSLib> | null = null;

const loadPdfJs = (): Promise<PDFJSLib> => {
  if (pdfjsLib) {
    return Promise.resolve(pdfjsLib);
  }
  
  if (loadingPromise) {
    return loadingPromise;
  }

  loadingPromise = new Promise((resolve, reject) => {
    // Check if already loaded
    if ((window as unknown as { pdfjsLib?: PDFJSLib }).pdfjsLib) {
      pdfjsLib = (window as unknown as { pdfjsLib: PDFJSLib }).pdfjsLib;
      resolve(pdfjsLib);
      return;
    }

    const script = document.createElement('script');
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js';
    script.async = true;
    
    script.onload = () => {
      const lib = (window as unknown as { pdfjsLib?: PDFJSLib }).pdfjsLib;
      if (lib) {
        lib.GlobalWorkerOptions.workerSrc = 
          'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
        pdfjsLib = lib;
        resolve(lib);
      } else {
        reject(new Error('PDF.js failed to load'));
      }
    };
    
    script.onerror = () => {
      reject(new Error('Failed to load PDF.js script'));
    };
    
    document.head.appendChild(script);
  });

  return loadingPromise;
};

export function PdfThumbnail({ url, className = '', alt = 'PDF Preview', renderWidth = 200 }: PdfThumbnailProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [isVisible, setIsVisible] = useState(false);

  // Only load PDF when component is visible (IntersectionObserver)
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      { rootMargin: '200px' } // Start loading slightly before visible
    );

    observer.observe(container);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!isVisible) return;
    
    let cancelled = false;

    const renderPdf = async () => {
      if (!canvasRef.current) return;

      try {
        setLoading(true);
        setError(false);

        const pdfjs = await loadPdfJs();

        const loadingTask = pdfjs.getDocument({
          url,
          disableRange: true,
          disableStream: true,
        });

        const pdf = await loadingTask.promise;
        
        if (cancelled) return;

        const page = await pdf.getPage(1);
        
        if (cancelled) return;

        // Use fixed dimensions to avoid reading clientWidth (prevents forced reflow)
        const containerWidth = renderWidth;
        const containerHeight = containerWidth * A4_ASPECT_RATIO;

        const viewport = page.getViewport({ scale: 1 });
        const scale = Math.min(
          containerWidth / viewport.width,
          containerHeight / viewport.height
        );

        const scaledViewport = page.getViewport({ scale });

        const canvas = canvasRef.current;
        if (!canvas || cancelled) return;
        
        const context = canvas.getContext('2d');
        
        if (!context) {
          setError(true);
          setLoading(false);
          return;
        }

        const pixelRatio = window.devicePixelRatio || 1;
        
        canvas.width = containerWidth * pixelRatio;
        canvas.height = containerHeight * pixelRatio;

        context.scale(pixelRatio, pixelRatio);
        
        context.fillStyle = '#ffffff';
        context.fillRect(0, 0, containerWidth, containerHeight);

        const offsetX = (containerWidth - scaledViewport.width) / 2;
        const offsetY = (containerHeight - scaledViewport.height) / 2;
        
        context.translate(offsetX, offsetY);

        page.render({
          canvasContext: context,
          viewport: scaledViewport,
        }).promise.then(() => {
          if (!cancelled) {
            setLoading(false);
          }
        }).catch((err) => {
          console.error('PDF render error:', err);
          if (!cancelled) {
            setError(true);
            setLoading(false);
          }
        });
      } catch (err) {
        console.error('PDF load error:', err);
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
  }, [url, isVisible, renderWidth]);

  return (
    <div 
      ref={containerRef} 
      className={`relative overflow-hidden ${className}`}
      style={{ aspectRatio: `1 / ${A4_ASPECT_RATIO}`, contain: 'layout paint' }}
    >
      {loading && !error && (
        <div className="absolute inset-0 flex items-center justify-center bg-background animate-pulse">
          <FileText className="h-8 w-8 text-muted-foreground/50" />
        </div>
      )}
      {error && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-background gap-2">
          <FileText className="h-8 w-8 text-muted-foreground/50" />
          <span className="text-muted-foreground text-xs text-center px-2">Preview unavailable</span>
        </div>
      )}
      <canvas 
        ref={canvasRef} 
        className={`w-full h-full ${loading || error ? 'opacity-0' : 'opacity-100'}`}
        title={alt}
      />
    </div>
  );
}
