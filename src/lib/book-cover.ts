import { loadPdfJs } from '@/lib/pdfjs';

// =====================================================================
// A CAREER BOOK'S COVER, DRAWN ONCE (Step 109).
// ---------------------------------------------------------------------
// The greenbook and the two guides of IB Questions are shown beside the
// page's title with their cover: the PDF's first page. It is drawn ONCE,
// in the President's (or the admin account's) browser, when the book is
// uploaded, or the first time they open the page for a book uploaded
// before covers existed, from the first page alone (the function sends
// that page, never a reader's copy). It is kept, small, with the book
// (career_book_covers), and from then on every reader's page shows the
// stored picture with the page's data: no PDF is opened to show a cover.
//
// 200 pixels wide: the cover is drawn at most about 90 pixels wide on the
// page, so this is sharp on a high-density screen and still around 15 kB.
// =====================================================================

export const COVER_WIDTH = 200;
/** The longest cover the functions keep (career-book.ts, COVER_MAX_CHARS). */
export const COVER_MAX_CHARS = 120000;

/** The first page of a PDF, as a small WebP (or JPEG where WebP cannot be written) data URL. */
export async function drawCover(pdf: Blob): Promise<string> {
  const lib = await loadPdfJs();
  const doc = await lib.getDocument({ data: await pdf.arrayBuffer() }).promise;
  const page = await doc.getPage(1);
  const natural = page.getViewport({ scale: 1 });
  const viewport = page.getViewport({ scale: COVER_WIDTH / natural.width });
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(viewport.width);
  canvas.height = Math.round(viewport.height);
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('The cover could not be drawn.');
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  await page.render({ canvasContext: ctx, viewport }).promise;
  for (const quality of [0.82, 0.7, 0.55]) {
    let url = canvas.toDataURL('image/webp', quality);
    if (!url.startsWith('data:image/webp')) url = canvas.toDataURL('image/jpeg', quality);
    if (url.length <= COVER_MAX_CHARS) return url;
  }
  throw new Error('The cover came out too large.');
}

/**
 * Draw a book's cover from its first page and keep it. Returns the book as
 * the function now gives it, with its cover.
 */
export async function makeCover<B>(source: () => Promise<Blob>, save: (cover: string) => Promise<B>): Promise<B> {
  return save(await drawCover(await source()));
}
