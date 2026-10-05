import { Video } from 'lucide-react';
import { joinLabel } from '@/lib/event-place';

// =====================================================================
// The way into an online event, for somebody who holds a place at it.
// ---------------------------------------------------------------------
// The link itself is private (migration 20261005100000): it reaches only
// the people registered, through my_event_registrations, so this is
// rendered only where that answer says there is one.
// =====================================================================

export function JoinMeetingLink({ url, className = '', variant = 'link' }: {
  url: string;
  className?: string;
  /** 'link' reads in a line of text; 'button' is the solid action. */
  variant?: 'link' | 'button';
}) {
  const look = variant === 'button'
    ? 'inline-flex h-9 items-center justify-center gap-2 rounded-md bg-accent px-4 font-body text-sm text-accent-foreground transition-colors hover:bg-accent/90'
    : 'inline-flex items-center gap-1.5 font-body text-[14px] text-accent underline underline-offset-4 hover:no-underline';
  return (
    <a data-ro href={url} target="_blank" rel="noopener noreferrer" className={`${look} ${className}`}>
      <Video aria-hidden className="h-4 w-4 shrink-0" />{joinLabel(url)}
    </a>
  );
}
