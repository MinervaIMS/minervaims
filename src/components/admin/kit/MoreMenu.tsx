import { cloneElement, isValidElement, useState, type ComponentType, type ReactElement, type ReactNode } from 'react';
import { MoreHorizontal } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useIsDesktop } from '@/hooks/use-desktop';
import { BottomSheet } from '@/components/admin/kit/BottomSheet';

// =====================================================================
// "More": the actions a row or a page does not show (Step 98 kit).
// ---------------------------------------------------------------------
// A row shows one or two actions, the ones it is opened for. Everything
// else waits here, and anything that removes, withdraws or clears waits
// at the end, in red, after a hairline, so it is never the first thing
// under a finger.
//
// On a computer it is a menu under the button. On a phone it is a sheet
// from the bottom with a 44 px line per action, which a thumb can hit
// and a menu the width of a finger cannot offer.
//
// Choosing an action closes the menu first and then runs it, so an
// action that opens a confirmation window opens it over the page, not
// over a menu that is still closing.
// =====================================================================

export interface MoreAction {
  key: string;
  label: string;
  icon?: ComponentType<{ className?: string }>;
  onSelect: () => void;
  /** Removes, withdraws or clears: drawn last, in red, after a hairline. */
  destructive?: boolean;
  disabled?: boolean;
  /** Only reads (opens, downloads): stays usable for a read-only role. */
  read?: boolean;
}

interface Props {
  actions: MoreAction[];
  /** What the menu is for, for screen readers: "More actions for Marta Rossi". */
  label: string;
  /** The sheet's title on a phone. Defaults to "More". */
  title?: string;
  /** A visible trigger of the page's own (a "Download" button); a ⋯ otherwise. */
  trigger?: ReactNode;
  triggerClassName?: string;
  align?: 'start' | 'end';
}

export function MoreMenu({ actions, label, title = 'More', trigger, triggerClassName = '', align = 'end' }: Props) {
  const isDesktop = useIsDesktop();
  const [open, setOpen] = useState(false);
  if (actions.length === 0) return null;
  const plain = actions.filter((a) => !a.destructive);
  const risky = actions.filter((a) => a.destructive);
  // Closed first, run after: see the note above.
  const run = (a: MoreAction) => { setOpen(false); window.setTimeout(a.onSelect, 0); };

  const triggerButton = trigger ?? (
    <Button
      type="button" variant="outline" size="icon"
      className={`h-11 w-11 lg:h-9 lg:w-9 ${triggerClassName}`}
      aria-label={label} title={label} aria-haspopup="menu"
    >
      <MoreHorizontal className="h-4 w-4" aria-hidden="true" />
    </Button>
  );

  if (isDesktop) {
    return (
      <DropdownMenu open={open} onOpenChange={setOpen}>
        <DropdownMenuTrigger asChild>{triggerButton}</DropdownMenuTrigger>
        <DropdownMenuContent align={align} className="min-w-[13rem] font-body">
          {plain.map((a) => <Item key={a.key} action={a} onRun={run} />)}
          {plain.length > 0 && risky.length > 0 && <DropdownMenuSeparator />}
          {risky.map((a) => <Item key={a.key} action={a} onRun={run} />)}
        </DropdownMenuContent>
      </DropdownMenu>
    );
  }

  return (
    <>
      {isValidElement(triggerButton)
        ? cloneElement(triggerButton as ReactElement<{ onClick?: () => void; 'aria-haspopup'?: string }>, { onClick: () => setOpen(true), 'aria-haspopup': 'dialog' })
        : triggerButton}
      <BottomSheet open={open} onOpenChange={setOpen} title={title}>
        <ul className="py-1">
          {plain.map((a) => <SheetItem key={a.key} action={a} onRun={run} />)}
        </ul>
        {risky.length > 0 && (
          <ul className={`py-1 ${plain.length > 0 ? 'border-t border-separator' : ''}`}>
            {risky.map((a) => <SheetItem key={a.key} action={a} onRun={run} />)}
          </ul>
        )}
      </BottomSheet>
    </>
  );
}

function Item({ action: a, onRun }: { action: MoreAction; onRun: (a: MoreAction) => void }) {
  const Icon = a.icon;
  return (
    <DropdownMenuItem
      disabled={a.disabled}
      onSelect={() => onRun(a)}
      className={`gap-2 ${a.destructive ? 'text-destructive focus:bg-destructive focus:text-destructive-foreground' : ''}`}
    >
      {Icon && <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />}
      {a.label}
    </DropdownMenuItem>
  );
}

function SheetItem({ action: a, onRun }: { action: MoreAction; onRun: (a: MoreAction) => void }) {
  const Icon = a.icon;
  return (
    <li>
      <button
        type="button"
        {...(a.read ? { 'data-ro': '' } : {})}
        disabled={a.disabled}
        onClick={() => onRun(a)}
        className={`flex min-h-12 w-full items-center gap-3 px-4 text-left text-base transition-colors active:bg-muted disabled:opacity-50 ${a.destructive ? 'text-destructive' : 'text-foreground'}`}
      >
        {Icon && <Icon className="h-5 w-5 shrink-0" aria-hidden="true" />}
        {a.label}
      </button>
    </li>
  );
}

export default MoreMenu;
