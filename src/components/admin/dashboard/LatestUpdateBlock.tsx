import { PdfThumbnail } from '@/components/shared/PdfThumbnail';
import { Block, BlockSkeleton } from './DashboardKit';
import type { LatestUpdate } from './useDashboardData';

// =====================================================================
// Latest update: the one actionable block on the page.
// ---------------------------------------------------------------------
// Resolved in priority order upstream, in `useDashboardData`:
//   1. the membership fee, while a collection is open
//   2. Association on Display, while registration is open
//   3. the next public event within thirty days
//   4. the next internal event within thirty days
//   5. the latest published report
//
// The fifth always exists, so there is no empty state. A failed query is
// a different thing from nothing to show, and says so.
//
// Two layouts, and the image one never distorts its picture: a fixed
// aspect box with object-cover, so a portrait poster and a landscape one
// occupy exactly the same space.
// =====================================================================

function formatDate(value: string): string {
  return new Date(value).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
}

export function LatestUpdateBlock({ update, ok, loading, delay }: {
  update: LatestUpdate | null; ok: boolean; loading: boolean; delay: number;
}) {
  if (loading) return <BlockSkeleton title="Latest update" filled />;
  if (!ok) {
    return (
      <section className="h-[300px] flex flex-col overflow-hidden border border-accent bg-accent text-accent-foreground p-5 font-body">
        <h2 className="font-serif text-lg leading-tight">Latest update</h2>
        <div className="flex-1 min-h-0 mt-3 flex items-center justify-center">
          <p className="text-xs text-accent-foreground/70">Update unavailable.</p>
        </div>
      </section>
    );
  }

  if (!update) return <BlockSkeleton title="Latest update" filled />;

  const hasImage = !!update.imageUrl || !!update.pdfUrl;

  const text = (
    <div className="min-w-0 flex flex-col justify-center h-full">
      <span className="text-[11px] uppercase tracking-wider text-accent-foreground/70">{update.category}</span>
      <h3 className="font-serif text-xl leading-snug mt-1.5 line-clamp-3">{update.title}</h3>
      {update.detail && (
        <p className="text-xs text-accent-foreground/75 mt-2 line-clamp-2">{update.detail}</p>
      )}
      {update.date && (
        <span className="text-xs text-accent-foreground/70 mt-auto pt-3">{formatDate(update.date)}</span>
      )}
    </div>
  );

  return (
    <Block title="Latest update" filled delay={delay}>
      {hasImage ? (
        <div className="h-full grid grid-cols-[7.5rem_1fr] sm:grid-cols-[9rem_1fr] gap-4">
          <div className="h-full overflow-hidden bg-accent-foreground/10">
            {update.imageUrl ? (
              <img
                src={update.imageUrl}
                alt=""
                loading="lazy"
                className="h-full w-full object-cover"
              />
            ) : (
              <PdfThumbnail
                url={update.pdfUrl!}
                alt=""
                className="h-full w-full object-cover"
                renderWidth={220}
              />
            )}
          </div>
          {text}
        </div>
      ) : (
        <div className="h-full">{text}</div>
      )}
    </Block>
  );
}

export default LatestUpdateBlock;
