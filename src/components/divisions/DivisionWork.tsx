import { Link } from 'react-router-dom';
import { clip } from '@/lib/report-meta';
import { reportDate } from '@/lib/reports-public';

// =====================================================================
// "How we work" and "Flagship work" on a division page (Step 93).
// ---------------------------------------------------------------------
// Written by the division's Head in Reports > Division Pages: the
// standards a report meets, how it is reviewed, the tools and data it
// draws on, and up to three published reports the Head chooses. A block
// with nothing in it is not shown at all.
// =====================================================================

export interface DivisionPageRow {
  division: string;
  standards: string;
  review: string;
  tools: string;
  flagship_ids: string[];
}

export interface FlagshipReport {
  id: string;
  slug?: string | null;
  title: string;
  date: string;
  description?: string | null;
}

/** The three parts of "How we work", in order, with their headings. */
export const WORK_PARTS: { key: 'standards' | 'review' | 'tools'; title: string }[] = [
  { key: 'standards', title: 'Standards' },
  { key: 'review', title: 'Review' },
  { key: 'tools', title: 'Tools and data' },
];

interface Props {
  page: DivisionPageRow | null;
  flagship: FlagshipReport[];
}

export function DivisionWork({ page, flagship }: Props) {
  const parts = WORK_PARTS.filter((p) => (page?.[p.key] ?? '').trim());
  return (
    <>
      {parts.length > 0 && (
        <section className="pt-0 pb-section-sm md:pb-section bg-background" data-division-block="how-we-work">
          <div className="container">
            <h2 className="font-serif text-heading mb-8 pb-3 border-b border-separator text-accent">How we work</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 md:gap-10">
              {parts.map((p) => (
                <div key={p.key}>
                  <h3 className="font-serif text-subheading text-foreground mb-3">{p.title}</h3>
                  <p className="font-body text-body text-muted-foreground">{page![p.key]}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}
      {flagship.length > 0 && (
        <section className="pt-0 pb-section-sm md:pb-section bg-background" data-division-block="flagship">
          <div className="container">
            <h2 className="font-serif text-heading mb-8 pb-3 border-b border-separator text-accent">Flagship work</h2>
            <ul className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {flagship.map((f) => (
                <li key={f.id} className="bg-muted p-6 flex flex-col">
                  <p className="font-body text-xs uppercase tracking-wider text-muted-foreground">{reportDate(f.date)}</p>
                  <h3 className="font-serif text-subheading text-foreground mt-2 mb-3">
                    {f.slug ? <Link to={`/archive/${f.slug}`} className="hover:text-accent">{f.title}</Link> : f.title}
                  </h3>
                  {f.description && <p className="font-body text-small text-muted-foreground">{clip(f.description, 220)}</p>}
                  {f.slug && (
                    <Link to={`/archive/${f.slug}`} className="mt-auto pt-4 font-body text-small text-primary underline underline-offset-4 hover:text-accent">
                      Read the report
                    </Link>
                  )}
                </li>
              ))}
            </ul>
          </div>
        </section>
      )}
    </>
  );
}

export default DivisionWork;
