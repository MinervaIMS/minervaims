import type { ReactNode } from 'react';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { X } from 'lucide-react';

// =====================================================================
// A sheet from the bottom of a phone (Step 98, the workspace kit).
// ---------------------------------------------------------------------
// The filters of a register and the actions of a row open here on a
// phone: within reach of the thumb, over the page they act on, and
// closed by the 44 px button in their own header, by the grey behind
// them or by Back.
//
// It is built on the dialog primitive itself rather than on
// `components/ui/sheet`, whose close button is 16 px and cannot be
// changed without changing the shared component, which the Step 98 rules
// leave alone. Square, on a hairline, with the page's own type.
//
// Being a dialog, it is inside the read-only guard's reach (see
// ReadOnlyRegion): a sheet that only changes what the reader sees says
// so with `readOnly`, which marks it `data-ro` as a whole.
// =====================================================================

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  /** One line under the title, for screen readers and sighted readers alike. */
  description?: string;
  children: ReactNode;
  /** Held at the foot of the sheet, above the home bar, whatever scrolls. */
  footer?: ReactNode;
  /** The sheet changes only what is shown (filters), never what is stored. */
  readOnly?: boolean;
}

export function BottomSheet({ open, onOpenChange, title, description, children, footer, readOnly = false }: Props) {
  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-[80] bg-foreground/40 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
        <DialogPrimitive.Content
          {...(readOnly ? { 'data-ro': '' } : {})}
          {...(description ? {} : { 'aria-describedby': undefined })}
          className="fixed inset-x-0 bottom-0 z-[80] flex max-h-[85dvh] flex-col border-t border-separator bg-background font-body data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:slide-out-to-bottom data-[state=open]:slide-in-from-bottom motion-reduce:animate-none"
          style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
        >
          <div className="flex shrink-0 items-center gap-2 border-b border-separator py-1 pl-4 pr-1">
            <div className="min-w-0 flex-1">
              <DialogPrimitive.Title className="truncate font-serif text-lg text-accent">{title}</DialogPrimitive.Title>
              {description && (
                <DialogPrimitive.Description className="truncate text-xs text-muted-foreground">{description}</DialogPrimitive.Description>
              )}
            </div>
            <DialogPrimitive.Close data-ro className="flex h-11 w-11 shrink-0 items-center justify-center text-muted-foreground hover:text-accent" aria-label="Close">
              <X className="h-5 w-5" aria-hidden="true" />
            </DialogPrimitive.Close>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">{children}</div>
          {footer && <div className="shrink-0 border-t border-separator px-4 py-3">{footer}</div>}
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}

export default BottomSheet;
