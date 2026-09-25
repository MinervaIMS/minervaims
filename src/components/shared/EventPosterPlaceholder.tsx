import fullLogoColor from '@/assets/full_logo_color.svg.asset.json';

// =====================================================================
// What an event without a poster looks like ON THE PUBLIC WEBSITE.
// ---------------------------------------------------------------------
// The public Events page used to show a grey box saying "Event Photo" or
// "No poster": a gap, announced as a gap. An event without a poster now
// carries the association's full logo and one line about what events are
// to Minerva, filling the same box a poster would, so a page mixing both
// keeps its rhythm.
//
// Public pages only. The workspace keeps its plain image icon: there the
// thumbnail is a working aid, not a visual, and the full logo repeated
// down a list of internal events read as noise. The workspace dashboard's
// event card is the one exception, because it is a showcase like the
// public page.
// =====================================================================

export const EVENT_PLACEHOLDER_LINE = 'Events: a core part of the Minerva experience';

interface Props {
  /** Size and shape come from the caller, exactly as for a poster. */
  className?: string;
  /** A small thumbnail: smaller logo and line. */
  compact?: boolean;
  /** Draw its own thin frame (default). Off when the surrounding box already has one. */
  framed?: boolean;
  /** Colours for a dark background (the dashboard's event card). */
  onDark?: boolean;
}

export function EventPosterPlaceholder({ className = '', compact = false, framed = true, onDark = false }: Props) {
  return (
    <div
      className={`flex flex-col items-center justify-center gap-3 text-center ${framed ? 'border border-separator' : ''} ${onDark ? 'bg-background/95' : 'bg-background'} ${compact ? 'p-2' : 'p-6'} ${className}`}
      role="img"
      aria-label={EVENT_PLACEHOLDER_LINE}
    >
      <img
        src={fullLogoColor.url}
        alt=""
        aria-hidden="true"
        loading="lazy"
        className={compact ? 'w-full max-w-[72px] h-auto' : 'w-1/2 max-w-[220px] h-auto'}
      />
      <p className={`font-serif text-accent leading-snug ${compact ? 'text-[9px]' : 'text-sm md:text-base'}`}>
        {EVENT_PLACEHOLDER_LINE}
      </p>
    </div>
  );
}

export default EventPosterPlaceholder;
