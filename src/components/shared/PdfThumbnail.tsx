import { useEffect, useRef, useState } from 'react';
import { FileText } from 'lucide-react';
import { A4_ASPECT_RATIO, loadPdfJs } from '@/lib/pdfjs';

interface PdfThumbnailProps {
  url: string;
  className?: string;
  alt?: string;
  /** Internal canvas render width in CSS px. Larger = sharper for large displays. */
  renderWidth?: number;
}


/**
 * Count the pages of a PDF file using the same PDF.js loader as the
 * thumbnails. Falls back to a structural estimate if PDF.js cannot load,
 * so a count is always produced without any user input.
 */
export async function countPdfPages(file: File): Promise<number | null> {
  const buf = await file.arrayBuffer();
  try {
    const pdfjs = await loadPdfJs();
    const doc = await pdfjs.getDocument({ data: buf }).promise;
    if (doc.numPages > 0) return doc.numPages;
  } catch { /* fall through to the structural estimate */ }
  try {
    const bytes = new Uint8Array(buf);
    let text = '';
    for (let i = 0; i < bytes.length; i += 8192) text += String.fromCharCode(...bytes.subarray(i, Math.min(i + 8192, bytes.length)));
    const counts = [...text.matchAll(/\/Count\s+(\d+)/g)].map((m) => parseInt(m[1], 10));
    const byCount = counts.length ? Math.max(...counts) : 0;
    const byType = (text.match(/\/Type\s*\/Page[^s]/g) || []).length;
    const n = Math.max(byCount, byType);
    return n > 0 && n < 5000 ? n : null;
  } catch { return null; }
}

export function PdfThumbnail({ url, className = '', alt = 'PDF Preview', renderWidth = 200 }: PdfThumbnailProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  // ===================================================================
  // THE PREVIEW IS THE SHAPE OF THE DOCUMENT, not the shape of A4.
  // -------------------------------------------------------------------
  // Both the frame and the canvas used to be A4 whatever the file was.
  // A page that is not A4 - a landscape one-pager, a deck, a US Letter
  // cover - was drawn scaled to fit and CENTRED IN WHITE inside a tall
  // portrait box, so the cover appeared as a small strip surrounded by
  // blank paper that is not in the document at all.
  //
  // The first page's own viewport gives its true ratio, and it is used
  // for both. A4 remains the value until the page has been read, which
  // is what keeps the common case - every report the Society publishes -
  // from shifting at all: it starts A4 and stays A4.
  // ===================================================================
  const [ratio, setRatio] = useState(A4_ASPECT_RATIO);

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
        const viewport = page.getViewport({ scale: 1 });
        // Guarded: a malformed page reporting a zero dimension must not
        // produce a zero-height box or a division by zero below.
        const pageRatio = viewport.width > 0 && viewport.height > 0
          ? viewport.height / viewport.width
          : A4_ASPECT_RATIO;
        if (!cancelled) setRatio(pageRatio);

        const containerWidth = renderWidth;
        const containerHeight = containerWidth * pageRatio;

        // ONE SCALE, NOT THE SMALLER OF TWO. The canvas is now the page's
        // own shape, so the page fills it exactly and there is no letterbox
        // to centre it in.
        const scale = containerWidth / viewport.width;

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
      style={{ aspectRatio: `1 / ${ratio}`, contain: 'layout paint' }}
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
      {/* `object-contain` IS THE SECOND HALF OF THE FIX, and it is needed
          because an aspect ratio is not a guarantee.

          The frame above asks for the page's shape, and gets it wherever
          it is free to take it. Where the caller caps BOTH axes - the
          Dashboard's cover sits in a box with a width and a height, so
          that the text beside it cannot be pushed out - the cap wins over
          the ratio, and the frame is whatever the caller allowed. Without
          this the canvas would be stretched to fill that frame, which is
          the distortion the ratio was meant to prevent.

          A canvas is a replaced element with the intrinsic dimensions of
          its bitmap, so `object-contain` applies to it exactly as it does
          to an image: the page is scaled to fit and centred, whole and in
          proportion, whatever shape the frame turns out to be. For an A4
          cover in an A4 frame - which is every report the Society
          publishes - the two agree and this changes nothing at all. */}
      <canvas
        ref={canvasRef}
        className={`w-full h-full object-contain ${loading || error ? 'opacity-0' : 'opacity-100'}`}
        title={alt}
      />
    </div>
  );
}
