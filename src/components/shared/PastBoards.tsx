import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { PastBoard } from '@/lib/board';
import { normalizeLinkedInProfile } from '@/lib/linkedin';
// The workspace's and the Members page's own LinkedIn mark: the square
// with rounded corners (Step 110; the round black one read as another site's).
import linkedinIcon from '@/assets/linkedin-icon.png';

// =====================================================================
// The Boards of past semesters, on the public Members page (Step 94).
// ---------------------------------------------------------------------
// Each past semester's Board of Directors, officers then heads, by name
// and office, with existing public LinkedIn links, as a governance record. The list
// comes from the semester rosters (public.public_past_boards), which
// leave out anybody who asked not to be listed (Privacy Policy, section 9).
// The most recent semester is open; the others open on request.
// =====================================================================

type Rpc = (fn: string) => Promise<{ data: unknown; error: unknown }>;

export function PastBoards() {
  const [boards, setBoards] = useState<PastBoard[] | null>(null);

  useEffect(() => {
    let live = true;
    (supabase.rpc as unknown as Rpc)('public_past_boards')
      .then(({ data, error }) => { if (live) setBoards(error ? [] : ((data as PastBoard[]) ?? [])); })
      .catch(() => { if (live) setBoards([]); });
    return () => { live = false; };
  }, []);

  if (!boards || boards.length === 0) return null;

  return (
    <section id="past-boards" className="bg-background pb-section-sm md:pb-section">
      <div className="container">
        <h2 className="font-serif text-heading mb-6 pb-3 border-b border-separator text-accent">Past Boards</h2>
        <p className="font-body text-body-lg text-muted-foreground max-w-[46rem] mb-8">
          The Board of Directors of each past semester: the officers, then the heads of the divisions and teams.
        </p>
        <div className="divide-y divide-separator border-y border-separator">
          {boards.map((b, i) => (
            <details key={b.key} open={i === 0} className="group">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 py-4 font-serif text-subheading text-foreground hover:text-accent">
                {b.label}
                <span aria-hidden="true" className="font-body text-small text-accent transition-transform duration-200 group-open:rotate-45">+</span>
              </summary>
              {/* Two columns only where both fit at full width: each row is
                  the office, then the name in a box of one width, then the
                  LinkedIn mark, so the marks stand in one column (Step 110). */}
              <div className="grid gap-x-10 gap-y-6 pb-6 xl:grid-cols-2">
                {(['officer', 'head'] as const).map((group) => {
                  const people = b.board.filter((p) => p.group === group);
                  if (!people.length) return null;
                  return (
                    <div key={group}>
                      <p className="font-body text-[.72rem] uppercase tracking-[.16em] text-muted-foreground mb-3">
                        {group === 'officer' ? 'Officers' : 'Heads'}
                      </p>
                      <dl className="space-y-2">
                        {people.map((p) => {
                          const profile = normalizeLinkedInProfile(p.linkedin_url).url;
                          return (
                            <div key={`${p.office}-${p.name}`} className="flex flex-col sm:flex-row sm:items-center sm:gap-3" data-past-board-row>
                              <dt className="font-body text-[.78rem] uppercase tracking-[.06em] text-muted-foreground sm:w-[16rem] sm:shrink-0">{p.office}</dt>
                              <dd className="flex min-w-0 items-center gap-2">
                                <span className="min-w-0 flex-1 font-serif text-[1.05rem] text-foreground sm:w-[12.5rem] sm:flex-none">{p.name}</span>
                                <span className="flex h-5 w-5 shrink-0 items-center justify-center" data-linkedin-slot>
                                  {profile && (
                                    <a
                                      href={profile}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      aria-label={`${p.name} LinkedIn profile`}
                                      title={`${p.name} LinkedIn profile`}
                                      className="inline-flex"
                                    >
                                      <img src={linkedinIcon} alt="" width={20} height={20} className="h-5 w-5 object-contain" />
                                    </a>
                                  )}
                                </span>
                              </dd>
                            </div>
                          );
                        })}
                      </dl>
                    </div>
                  );
                })}
              </div>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}
