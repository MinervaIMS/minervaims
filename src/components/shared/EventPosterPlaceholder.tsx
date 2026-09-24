import fullLogoColor from '@/assets/full_logo_color.svg.asset.json';

// =====================================================================
// What an event without a poster looks like.
// ---------------------------------------------------------------------
// It used to be a grey rectangle saying "No poster" on the public Events
// page, and an image icon in the workspace archive: a gap, announced as a
// gap. Plenty of the association's events never get a poster - internal
// meetings, calls, the stand at Association on Display - and now that the
// archive lists every one of them, the gap would have been most of the
// page.
//
// So an event without a poster carries the association's own mark and one
// line about what events are to Minerva. It fills the same box a poster
// would, at whatever size that box is, so a list mixing both keeps its
// rhythm.
// =====================================================================

export const EVENT_PLACEHOLDER_LINE = 'Events: a core part of the Minerva experience';

interface Props {
  /** Size and shape come from the caller, exactly as for a poster. */
  className?: string;
  /** A small thumbnail shows the mark only; the line would be unreadable. */
  compact?: boolean;
}

export function EventPosterPlaceholder({ className = '', compact = false }: Props) {
  return (
    <div
      className={`flex flex-col items-center justify-center gap-3 border border-separator bg-background text-center ${compact ? 'p-2' : 'p-5'} ${className}`}
      role="img"
      aria-label={EVENT_PLACEHOLDER_LINE}
    >
      <img
        src={fullLogoColor.url}
        alt=""
        aria-hidden="true"
        loading="lazy"
        className={compact ? 'w-full max-w-[72px] h-auto' : 'w-3/4 max-w-[200px] h-auto'}
      />
      <p className={`font-serif text-accent leading-snug ${compact ? 'text-[9px]' : 'text-sm'}`}>
        {EVENT_PLACEHOLDER_LINE}
      </p>
    </div>
  );
}

export default EventPosterPlaceholder;
