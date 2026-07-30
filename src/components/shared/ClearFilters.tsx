import { X } from 'lucide-react';

// =====================================================================
// ClearFilters — the way back out of a filtered view.
// ---------------------------------------------------------------------
// Anywhere a filter can be applied, it must also be possible to undo it
// without hunting through every control to remember what was set. This
// button appears the moment anything is filtered, says how many filters
// are on, and clears them all in one press.
//
// It is deliberately quiet when nothing is filtered: it renders nothing
// at all, so a clean list is never cluttered by a control with no work
// to do.
// =====================================================================

interface Props {
  /** How many filters are currently applied. Nothing renders at zero. */
  count: number;
  onClear: () => void;
  /** Tighter styling for toolbars that are already dense. */
  size?: 'default' | 'sm';
  className?: string;
}

export function ClearFilters({ count, onClear, size = 'default', className = '' }: Props) {
  if (count <= 0) return null;
  const pad = size === 'sm' ? 'h-8 px-2.5 text-xs' : 'h-10 px-3 text-sm';
  return (
    <button
      type="button"
      onClick={onClear}
      title="Remove every filter currently applied"
      className={`inline-flex items-center gap-1.5 shrink-0 border border-separator bg-background font-body text-muted-foreground transition-colors hover:border-accent hover:text-accent ${pad} ${className}`}
    >
      <X className={size === 'sm' ? 'h-3.5 w-3.5' : 'h-4 w-4'} />
      <span>Clear filters{count > 1 ? ` (${count})` : ''}</span>
    </button>
  );
}

export default ClearFilters;
