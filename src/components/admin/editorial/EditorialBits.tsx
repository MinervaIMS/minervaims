import {
  ED_STATUS_LABELS, FORMAT_SHORT_LABELS, PLATFORM_LABELS, normalisedDestinations,
  type EditorialFormat, type EditorialItem, type EditorialStatus,
} from '@/lib/smm-api';
import { PLATFORM_ICON, STATUS_STYLE } from './editorial-model';

// Small pieces drawn wherever an editorial item appears.

export function StatusBadge({ status }: { status: EditorialStatus }) {
  const s = STATUS_STYLE[status];
  return (
    <span className={`inline-flex h-6 shrink-0 items-center gap-1 px-2 font-body text-[12px] ${s.badge}`}>
      {s.icon('h-3.5 w-3.5')}{ED_STATUS_LABELS[status]}
    </span>
  );
}

/** "Instagram reel · LinkedIn post" with the icons. */
export function Destinations({ item, withText = true }: { item: EditorialItem; withText?: boolean }) {
  const { platforms, formats } = normalisedDestinations(item);
  return (
    <span className="inline-flex flex-wrap items-center gap-x-2 gap-y-0.5">
      {platforms.map((p, i) => (
        <span key={p} className="inline-flex items-center gap-1" title={PLATFORM_LABELS[p]}>
          {PLATFORM_ICON[p]('h-3.5 w-3.5')}
          {withText && <span>{FORMAT_SHORT_LABELS[formats[i] as EditorialFormat]}</span>}
        </span>
      ))}
    </span>
  );
}
