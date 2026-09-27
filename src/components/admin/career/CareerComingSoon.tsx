import { CareerPage } from '@/components/admin/career/CareerPage';

// =====================================================================
// Career > GMAT Resources and Career > IB Questions: announced, not yet
// built. They are in the navigation now so members know they are coming
// and when; the page says what they will hold and nothing more.
// =====================================================================

type Which = 'gmat' | 'ib';

const COPY: Record<Which, { title: string; description: string; headline: string; body: string }> = {
  gmat: {
    title: 'GMAT Resources',
    description: 'Prepare the GMAT with the material the association recommends, gathered in one place.',
    headline: 'GMAT Resources are on their way',
    body: 'Study material and guidance for the GMAT, selected by the association and collected on this page.',
  },
  ib: {
    title: 'IB Questions',
    description: 'Practise for investment banking interviews with the questions candidates are actually asked.',
    headline: 'IB Questions are on their way',
    body: 'The technical and behavioural questions asked in investment banking interviews, collected on this page.',
  },
};

export default function CareerComingSoon({ which }: { which: Which }) {
  const c = COPY[which];
  return (
    <CareerPage title={c.title} description={c.description}>
      <div className="flex items-center justify-center rounded-xl border border-dashed border-separator bg-muted/20 px-6 py-16 text-center lg:min-h-0 lg:flex-1">
        <div className="max-w-md">
          <span className="inline-block rounded-full bg-accent px-3 py-1 text-[11px] uppercase tracking-wider text-accent-foreground">
            Coming soon
          </span>
          <p className="mt-4 font-serif text-2xl text-accent">{c.headline}</p>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{c.body}</p>
          <p className="mt-5 text-sm font-medium text-foreground">Available by the end of the semester.</p>
        </div>
      </div>
    </CareerPage>
  );
}
