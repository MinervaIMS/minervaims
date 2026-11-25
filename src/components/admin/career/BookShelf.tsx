import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Download, Info, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { makeCover } from '@/lib/book-cover';
import type { Greenbook } from '@/lib/brainteasers-api';
import { BookCover, useBookDownload, type BookActions, type BookCopy } from './BookView';

// =====================================================================
// THE BOOKS, BESIDE THE PAGE'S TITLE (Step 109).
// ---------------------------------------------------------------------
// Career > Brainteasers has the greenbook and Career > IB Questions its
// two guides. They used to sit behind a view of their own ("Greenbook",
// "The guide"), which replaced the whole page and which few found. Each
// book is now always in view at the top right of the page, beside its
// title: its cover, its name, and the button that downloads the reader's
// own copy. "About" opens the book's full view over the page (what it is,
// how to read it with the questions; for the President and the admin
// account, replacing it and who has a copy), and closing it leaves the
// page exactly where it was.
//
// THE COVER IS THE PDF'S FIRST PAGE, DRAWN ONCE (lib/book-cover.ts) and
// kept with the book, so it arrives with the page's data and no reader's
// page ever opens the PDF. A book uploaded before covers existed has its
// cover drawn the first time the President or the admin account opens the
// page; until then the Society's plain cover with the book's name stands.
// =====================================================================

export interface ShelfBook {
  key: string;
  book: Greenbook | null;
  copy: BookCopy;
  actions: BookActions;
  onChange: (g: Greenbook | null) => void;
  /** What "About" opens over the page: the book's own view (BookView). */
  details: ReactNode;
}

const mb = (n: number | null | undefined) => (n ? `${(n / 1024 / 1024).toFixed(1)} MB` : '');

function ShelfItem({ item }: { item: ShelfBook }) {
  const [open, setOpen] = useState(false);
  const download = useBookDownload();
  const { book, copy } = item;
  return (
    <div
      className="flex min-w-0 items-center gap-3 rounded-lg border border-separator bg-background p-2 pr-2.5 lg:w-[16.5rem]"
      data-book-shelf={item.key}
    >
      <button
        type="button" data-ro onClick={() => setOpen(true)}
        className="shrink-0 rounded-[3px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2"
        aria-label={`About ${copy.inSentence}`}
      >
        <BookCover book={book} name={copy.name} size="sm" />
      </button>
      <div className="min-w-0 flex-1">
        <p className="truncate font-serif text-[15px] leading-tight text-foreground">{copy.cardTitle}</p>
        <p className="mt-0.5 truncate text-xs text-muted-foreground">
          {book ? ['PDF', mb(book.size_bytes), book.pages ? `${book.pages} pages` : ''].filter(Boolean).join(' · ') : 'Not uploaded yet'}
        </p>
        <div className="mt-1.5 flex items-center gap-1">
          {book && (
            <Button
              data-ro type="button" size="sm" variant="solid" className="h-8 gap-1.5 px-2.5"
              onClick={() => void download.run(item.actions.download, copy)} disabled={download.busy}
              aria-label={`Download my copy of ${copy.inSentence}`}
            >
              {download.busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />}
              {download.busy ? 'Preparing' : 'Download'}
            </Button>
          )}
          <Button data-ro type="button" size="sm" variant="ghost" className="h-8 gap-1.5 px-2" onClick={() => setOpen(true)}>
            <Info className="h-3.5 w-3.5" />About
          </Button>
        </div>
      </div>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[90vh] max-w-[min(96vw,64rem)] overflow-y-auto font-body">
          {/* Named for screen readers; the book's own card heads the view. */}
          <DialogHeader className="sr-only">
            <DialogTitle className="font-serif text-2xl font-normal text-accent">{copy.cardTitle}</DialogTitle>
            <DialogDescription>{copy.cardSubtitle}</DialogDescription>
          </DialogHeader>
          {item.details}
        </DialogContent>
      </Dialog>
    </div>
  );
}

export function BookShelf({ items, canReplace }: { items: ShelfBook[]; canReplace: boolean }) {
  // The cover of a book uploaded before covers existed: drawn once, the
  // first time the President or the admin account opens the page.
  const tried = useRef(new Set<string>());
  useEffect(() => {
    if (!canReplace) return;
    for (const it of items) {
      const b = it.book;
      const c = it.actions.cover;
      if (!b || b.cover || !c || tried.current.has(b.id)) continue;
      tried.current.add(b.id);
      void makeCover(c.source, (cover) => c.save(b.id, cover)).then(it.onChange).catch((e) => console.warn('cover not drawn', e));
    }
  }, [items, canReplace]);

  return (
    <div
      className={`grid w-full gap-2 lg:flex lg:w-auto lg:flex-nowrap lg:justify-end ${items.length > 1 ? 'min-[440px]:grid-cols-2' : ''}`}
      aria-label={items.length > 1 ? 'The guides to download' : 'The book to download'}
      role="group"
    >
      {items.map((it) => <ShelfItem key={it.key} item={it} />)}
    </div>
  );
}

export default BookShelf;
