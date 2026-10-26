import { buttonVariants } from '@/components/ui/button';
import { cn } from '@/lib/utils';

// =====================================================================
// The month picker, sized for a thumb on a phone (Step 98 kit).
// ---------------------------------------------------------------------
// `components/ui/calendar` draws 36 px days and 28 px arrows, which is
// right for a mouse and small for a finger. It is shared, and the Step 98
// rules leave it alone, so a page that wants a month a phone can use
// passes these class names to it instead. They are the component's own,
// word for word, plus what happens below `lg`: the days share the width
// of the card and are 44 px tall, and the arrows are 44 px squares. From
// `lg` up nothing changes.
// =====================================================================

export const TOUCH_CALENDAR_CLASSNAMES = {
  caption: 'flex justify-center pt-1 relative items-center max-lg:h-11',
  nav_button: cn(
    buttonVariants({ variant: 'outline' }),
    'h-7 w-7 bg-transparent p-0 opacity-50 hover:opacity-100 max-lg:h-11 max-lg:w-11',
  ),
  head_cell: 'text-muted-foreground rounded-md w-9 font-normal text-[0.8rem] max-lg:flex-1',
  cell: 'h-9 w-9 text-center text-sm p-0 relative [&:has([aria-selected].day-range-end)]:rounded-r-md [&:has([aria-selected].day-outside)]:bg-accent/50 [&:has([aria-selected])]:bg-accent first:[&:has([aria-selected])]:rounded-l-md last:[&:has([aria-selected])]:rounded-r-md focus-within:relative focus-within:z-20 max-lg:h-11 max-lg:w-auto max-lg:flex-1',
  day: cn(buttonVariants({ variant: 'ghost' }), 'h-9 w-9 p-0 font-normal aria-selected:opacity-100 max-lg:h-11 max-lg:w-full'),
};
