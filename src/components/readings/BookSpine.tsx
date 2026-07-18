import { spineGeometry, type Reading } from './types';

// =====================================================================
// One book on a shelf: a slim line-art spine in the light-purple stroke,
// title (and author, when the spine is wide enough) set vertically.
// A real <button>, so it is keyboard focusable and opens with Enter/Space.
// =====================================================================

interface Props {
  reading: Reading;
  // The column is dimmed by the category filter: not interactive.
  dimmed?: boolean;
  // This book is currently lifted out into the reader overlay.
  vanished?: boolean;
  onOpen: (id: string, el: HTMLButtonElement) => void;
}

export function BookSpine({ reading, dimmed, vanished, onOpen }: Props) {
  const { w, h } = spineGeometry(reading.id);
  return (
    <button
      type="button"
      data-book-id={reading.id}
      disabled={dimmed}
      aria-hidden={vanished || undefined}
      aria-label={`${reading.title}, ${reading.author}. Open this reading.`}
      onClick={(e) => onOpen(reading.id, e.currentTarget)}
      className="relative shrink-0 border-[1.5px] border-[hsl(var(--accent-soft))] bg-[hsl(var(--accent-soft)/0.06)] outline-none transition-transform duration-200 hover:-translate-y-1.5 focus-visible:-translate-y-1.5 focus-visible:border-accent disabled:cursor-default"
      style={{ width: w, height: h, visibility: vanished ? 'hidden' : undefined }}
    >
      {/* Head and tail bands of the spine. */}
      <span aria-hidden className="absolute left-[3px] right-[3px] top-2 border-t border-[hsl(var(--accent-soft))]" />
      <span aria-hidden className="absolute left-[3px] right-[3px] bottom-2 border-t border-[hsl(var(--accent-soft))]" />
      {/* Vertical spine text: title, plus the author on wider spines. */}
      <span aria-hidden className="absolute inset-x-0 top-[15px] bottom-[15px] flex items-center justify-center gap-[2px] overflow-hidden">
        <span
          className="max-h-full overflow-hidden whitespace-nowrap font-serif text-[11px] leading-none text-accent/85"
          style={{ writingMode: 'vertical-rl', textOverflow: 'ellipsis' }}
        >
          {reading.title}
        </span>
        {w >= 34 && (
          <span
            className="max-h-full overflow-hidden whitespace-nowrap font-body text-[8px] leading-none text-[hsl(var(--accent-soft))]"
            style={{ writingMode: 'vertical-rl', textOverflow: 'ellipsis' }}
          >
            {reading.author}
          </span>
        )}
      </span>
    </button>
  );
}
