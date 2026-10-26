import { useCallback, useRef, useState, type ReactNode } from 'react';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';

// =====================================================================
// "Are you sure?", asked in the workspace's own words (Step 98 kit).
// ---------------------------------------------------------------------
// Eight deletions used the browser's grey box: "Are you sure you want to
// delete this alumni?", with OK and Cancel, on a phone a box the page has
// no say over. This asks the same question as the rest of the workspace
// does: a title that names the action, one line that says what happens,
// a red button that says it again ("Delete event") and "Keep it".
//
//   const { confirm, dialog } = useConfirm();
//   if (!(await confirm({ title: 'Delete this event?', body: '...', action: 'Delete event' }))) return;
//   ...
//   {dialog}
//
// It answers true only for the red button; closing it any other way is
// keeping it.
// =====================================================================

export interface ConfirmRequest {
  /** Names the action: "Delete this event?" */
  title: string;
  /** What happens, in one or two sentences. */
  body: ReactNode;
  /** The red button, which says the action again: "Delete event". */
  action: string;
  /** The other button. "Keep it" unless the page says otherwise. */
  cancel?: string;
}

export function useConfirm() {
  const [req, setReq] = useState<ConfirmRequest | null>(null);
  const resolver = useRef<((ok: boolean) => void) | null>(null);

  const confirm = useCallback((r: ConfirmRequest) => new Promise<boolean>((resolve) => {
    resolver.current?.(false);
    resolver.current = resolve;
    setReq(r);
  }), []);

  const settle = (ok: boolean) => {
    resolver.current?.(ok);
    resolver.current = null;
    setReq(null);
  };

  const dialog = (
    <AlertDialog open={!!req} onOpenChange={(o) => { if (!o) settle(false); }}>
      <AlertDialogContent className="font-body">
        <AlertDialogHeader>
          <AlertDialogTitle className="font-serif text-xl">{req?.title}</AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-2 text-sm text-muted-foreground">{req?.body}</div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel className="h-11 lg:h-10">{req?.cancel ?? 'Keep it'}</AlertDialogCancel>
          <AlertDialogAction
            className="h-11 lg:h-10 bg-destructive text-destructive-foreground border-destructive hover:bg-destructive/90"
            onClick={() => settle(true)}
          >
            {req?.action}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );

  return { confirm, dialog };
}

export default useConfirm;
