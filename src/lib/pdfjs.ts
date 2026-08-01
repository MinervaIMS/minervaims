// =====================================================================
// pdf.js, loaded once for the whole application.
// ---------------------------------------------------------------------
// Its own module rather than a corner of a component file, so anything
// that needs a page rasterised can reach it without importing a React
// component, and a fast refresh of a thumbnail never reloads the library.
// =====================================================================

// The subset of the pdf.js surface this application uses.
export interface PDFDocumentProxy {
  numPages: number;
  getPage(pageNumber: number): Promise<PDFPageProxy>;
}

export interface PDFPageProxy {
  getViewport(params: { scale: number }): PDFPageViewport;
  render(params: { canvasContext: CanvasRenderingContext2D; viewport: PDFPageViewport }): { promise: Promise<void> };
}

export interface PDFPageViewport {
  width: number;
  height: number;
}

export interface PDFJSLib {
  getDocument(params: { url?: string; data?: ArrayBuffer; disableRange?: boolean; disableStream?: boolean }): { promise: Promise<PDFDocumentProxy> };
  GlobalWorkerOptions: { workerSrc: string };
}

// A4 aspect ratio: 1:√2 ≈ 1:1.4142
export const A4_ASPECT_RATIO = 1.4142;

// Load PDF.js from CDN - lazy loaded only when needed
let pdfjsLib: PDFJSLib | null = null;
let loadingPromise: Promise<PDFJSLib> | null = null;

export const loadPdfJs = (): Promise<PDFJSLib> => {
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
