// =====================================================================
// A quick look at one file, at the size of the screen it is on.
// ---------------------------------------------------------------------
// A picture is drawn as a picture, fitted whole (an <iframe> around an
// image lays it out at its natural size, cropped, with two scrollbars).
// A video plays in place. Everything else keeps the browser's own viewer
// in a frame, which already fits a PDF to the width. When the item holds
// several files, Previous and Next (and the arrow keys) step through
// them without closing.
// =====================================================================

import { useEffect, useState } from 'react';
import { ChevronLeft, ChevronRight, Download, ExternalLink, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { fileKindOf } from '@/lib/library-files';
import { useImageBackdrop } from './library-data';
import { backdropProps } from './library-look';

export interface PreviewState {
  /** Every file of the item, so Previous and Next can walk them. */
  files: { value: string; label: string }[];
  index: number;
  /** The signed address of the file at `index`, once known. */
  url: string | null;
}

export function FilePreview({ state, onClose, onIndex, onDownload }: {
  state: PreviewState | null;
  onClose: () => void;
  onIndex: (index: number) => void;
  onDownload: (file: { value: string; label: string }) => void;
}) {
  const file = state ? state.files[state.index] : null;
  const count = state?.files.length ?? 0;
  const kind = file ? fileKindOf(file) : 'other';
  // A picture's backdrop: chosen for it (dark behind a white logo), or
  // set by hand to see it on light, on dark, or on the chequerboard.
  const [bgChoice, setBgChoice] = useState<'auto' | 'light' | 'dark' | 'checker'>('auto');
  const auto = useImageBackdrop(kind === 'image' ? state?.url : null, file?.value);
  const bg = backdropProps(bgChoice === 'auto' ? auto : bgChoice);

  useEffect(() => {
    if (!state || count < 2) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') onIndex((state.index + 1) % count);
      if (e.key === 'ArrowLeft') onIndex((state.index - 1 + count) % count);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [state, count, onIndex]);

  return (
    <Dialog open={!!state} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="flex h-[94vh] w-[96vw] max-w-[1600px] flex-col gap-3 p-4 sm:p-5">
        <DialogHeader className="shrink-0 pr-8">
          <DialogTitle className="truncate font-serif">{file?.label}</DialogTitle>
          <DialogDescription className="font-body text-xs">
            {count > 1 ? `File ${(state?.index ?? 0) + 1} of ${count}. The arrow keys move between them.` : 'Preview'}
          </DialogDescription>
        </DialogHeader>
        <div className="relative min-h-0 flex-1 border border-separator bg-muted/20">
          {!state?.url ? (
            <div className="flex h-full items-center justify-center text-muted-foreground"><Loader2 className="h-6 w-6 animate-spin" aria-label="Loading" /></div>
          ) : kind === 'image' ? (
            <div className={`flex h-full w-full items-center justify-center p-3 ${bg.className}`} style={bg.style} data-backdrop={bgChoice === 'auto' ? auto ?? 'none' : bgChoice}>
              <img src={state.url} alt={file?.label ?? ''} className="max-h-full max-w-full object-contain" />
            </div>
          ) : kind === 'video' ? (
            <div className="flex h-full w-full items-center justify-center bg-black">
              <video src={state.url} controls className="max-h-full max-w-full" />
            </div>
          ) : (
            <iframe title={`Preview of ${file?.label ?? 'the file'}`} src={state.url} className="block h-full w-full" />
          )}
          {count > 1 && (
            <>
              <button type="button" data-ro onClick={() => onIndex(((state?.index ?? 0) - 1 + count) % count)} aria-label="Previous file"
                className="absolute left-2 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center border border-separator bg-background/90 text-accent hover:bg-background">
                <ChevronLeft className="h-5 w-5" />
              </button>
              <button type="button" data-ro onClick={() => onIndex(((state?.index ?? 0) + 1) % count)} aria-label="Next file"
                className="absolute right-2 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center border border-separator bg-background/90 text-accent hover:bg-background">
                <ChevronRight className="h-5 w-5" />
              </button>
            </>
          )}
        </div>
        <div className="flex shrink-0 flex-wrap items-center justify-end gap-2 font-body">
          {kind === 'image' && state?.url && (
            <div role="group" aria-label="Background" className="mr-auto inline-flex border border-separator">
              {(['auto', 'light', 'dark', 'checker'] as const).map((b) => (
                <button key={b} type="button" data-ro aria-pressed={bgChoice === b} onClick={() => setBgChoice(b)}
                  className={`h-9 px-3 text-sm transition-colors ${bgChoice === b ? 'bg-accent text-accent-foreground' : 'text-muted-foreground hover:bg-accent/5 hover:text-accent'}`}>
                  {b === 'auto' ? 'Auto' : b === 'light' ? 'Light' : b === 'dark' ? 'Dark' : 'Transparent'}
                </button>
              ))}
            </div>
          )}
          <Button variant="outline" disabled={!state?.url} onClick={() => state?.url && window.open(state.url, '_blank', 'noopener')}>
            <ExternalLink className="h-4 w-4" />Open in a new tab
          </Button>
          <Button variant="solid" disabled={!file} onClick={() => file && onDownload(file)}>
            <Download className="h-4 w-4" />Download
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
