import { useCallback, useRef, useState, type ReactNode } from 'react';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Mail } from 'lucide-react';

// =====================================================================
// useEmailConfirm — a reusable, promise-based confirmation for ANY workspace
// action that triggers an automatic email. It renders a clear "this will send
// an email / are you sure?" dialog with Yes / No, and resolves to the choice.
//
// Usage:
//   const { confirm, dialog } = useEmailConfirm();
//   const handleSend = async () => {
//     const ok = await confirm({
//       title: 'Send newsletter to all subscribers?',
//       description: <>An email will be sent to every registered subscriber…</>,
//       confirmLabel: 'Yes, send',
//     });
//     if (!ok) return;
//     // …perform the email-triggering action…
//   };
//   return (<>{/* … */}{dialog}</>);
//
// Every place that can fire an automatic email should route through this so the
// user always gets an explicit, descriptive confirmation first.
// =====================================================================

export interface EmailConfirmOptions {
  /** Dialog heading. Defaults to a generic email warning. */
  title?: string;
  /** What exactly will happen — who gets emailed and any irreversibility. */
  description: ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
}

export function useEmailConfirm() {
  const [open, setOpen] = useState(false);
  const [opts, setOpts] = useState<EmailConfirmOptions | null>(null);
  const resolver = useRef<((v: boolean) => void) | null>(null);

  const confirm = useCallback((options: EmailConfirmOptions) => {
    setOpts(options);
    setOpen(true);
    return new Promise<boolean>((resolve) => { resolver.current = resolve; });
  }, []);

  const settle = useCallback((value: boolean) => {
    setOpen(false);
    resolver.current?.(value);
    resolver.current = null;
  }, []);

  const dialog = (
    <AlertDialog open={open} onOpenChange={(o) => { if (!o) settle(false); }}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5 text-accent shrink-0" />
            {opts?.title ?? 'This will send an automatic email'}
          </AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-2">{opts?.description}</div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={() => settle(false)}>{opts?.cancelLabel ?? 'No'}</AlertDialogCancel>
          <AlertDialogAction onClick={() => settle(true)}>{opts?.confirmLabel ?? 'Yes, proceed'}</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );

  return { confirm, dialog };
}
