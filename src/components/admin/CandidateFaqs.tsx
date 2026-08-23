import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Search } from 'lucide-react';
import {
  Accordion, AccordionContent, AccordionItem, AccordionTrigger,
} from '@/components/ui/accordion';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { WorkspacePageHeader } from '@/components/admin/WorkspacePageHeader';
import { WorkspaceLoader } from '@/components/admin/WorkspaceLoader';
import { useJoinFaqs } from '@/hooks/useJoinFaqs';
import { faqCategories, filterFaqGroups, countFaqEntries } from '@/lib/faq-filter';

// =====================================================================
// CandidateFaqs — the admissions FAQ, inside the workspace.
// ---------------------------------------------------------------------
// THE SAME QUESTIONS, FROM THE SAME TABLE. This reads `useJoinFaqs`, which
// is the hook the public /join page reads, and filters with the same
// helper. There is no second copy of the content and no second definition
// of the categories: an answer edited in Workspace, Website, Join FAQ
// changes in both places at once, which is the only way two surfaces
// showing the same information stay true to each other.
//
// It looks like the workspace rather than like the public page, because it
// is the workspace: the page header, the workspace input, the workspace
// card. The behaviour is what is shared, not the styling.
// =====================================================================

export default function CandidateFaqs() {
  const { groups, isLoading } = useJoinFaqs();
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState<string | null>(null);

  const categories = useMemo(() => faqCategories(groups), [groups]);
  const visible = useMemo(() => filterFaqGroups(groups, query, category), [groups, query, category]);
  const count = countFaqEntries(visible);
  const filtered = query.trim().length > 0 || category !== null;

  return (
    <div>
      <WorkspacePageHeader
        title="FAQs"
        description="The questions we are asked most often about applying and about joining the association. These are the same answers published on the public Join page."
      />

      {isLoading ? <WorkspaceLoader /> : groups.length === 0 ? (
        <Card><CardContent className="py-12 text-center"><p className="font-body text-muted-foreground">No questions have been published yet.</p></CardContent></Card>
      ) : (
        <div className="font-body">
          {/* THE SAME FILTER ROW THE PUBLIC SITE USES on Archive, Readings and
              the /join FAQ: flat corners, the body font, no labels above the
              fields, the search taking whatever width is left and the category
              beside it as a select. The two compose - the select narrows the
              set, the field searches whatever is left. */}
          <div className="mb-5">
            <div className="flex flex-col sm:flex-row gap-3 flex-wrap">
              {/* Search */}
              <div className="flex-1 min-w-[200px] relative">
                <Search aria-hidden className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search the questions"
                  aria-label="Search the questions"
                  autoComplete="off"
                  className="pl-10 font-body h-10 rounded-none border-separator"
                />
              </div>

              {/* Category filter: the data's own groups, in the order the data
                  gives them. One row on any width, so a narrow screen gains
                  neither a sideways bar nor three lines of wrapped chips. */}
              {categories.length > 1 && (
                <select
                  value={category ?? 'all'}
                  onChange={(e) => setCategory(e.target.value === 'all' ? null : e.target.value)}
                  aria-label="Filter the questions by category"
                  /* The same type size as the search field beside it: the Input
                     component is `text-base md:text-sm`, a bare select is not. */
                  className="font-body text-base md:text-sm bg-background border border-separator px-3 h-10 min-w-[200px]"
                >
                  <option value="all">All questions</option>
                  {categories.map((c) => (
                    <option key={c.key} value={c.key}>{c.label}</option>
                  ))}
                </select>
              )}
            </div>

            <p className="sr-only" role="status" aria-live="polite">
              {filtered ? `${count} ${count === 1 ? 'question' : 'questions'} shown.` : ''}
            </p>
          </div>

          {count === 0 ? (
            <Card>
              <CardContent className="py-10 text-center">
                <p className="text-sm text-muted-foreground">No question matches that search{category ? ' in this category' : ''}.</p>
                <button
                  type="button"
                  onClick={() => { setQuery(''); setCategory(null); }}
                  className="mt-3 text-sm text-accent underline-offset-4 hover:underline"
                >
                  Show every question
                </button>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-5">
              {visible.map((group) => (
                <section key={group.key} aria-labelledby={`faq-${group.key}`}>
                  <h2 id={`faq-${group.key}`} className="mb-2 border-b border-separator pb-2 font-serif text-lg text-accent">
                    {group.label}
                  </h2>
                  <Accordion type="multiple" className="w-full">
                    {group.entries.map((entry) => (
                      <AccordionItem key={entry.id} value={entry.id} className="border-separator">
                        <AccordionTrigger className="py-4 text-left font-serif text-base leading-snug text-foreground hover:text-accent hover:no-underline [&>svg]:h-4 [&>svg]:w-4 [&>svg]:shrink-0 [&>svg]:text-accent">
                          {entry.question}
                        </AccordionTrigger>
                        <AccordionContent className="pb-4">
                          <p className="text-sm leading-relaxed text-muted-foreground">{entry.answer}</p>
                          {entry.linkLabel && entry.linkHref && (
                            <Link
                              to={entry.linkHref}
                              className="mt-3 inline-block text-sm text-accent underline-offset-4 hover:underline"
                            >
                              {entry.linkLabel}
                            </Link>
                          )}
                        </AccordionContent>
                      </AccordionItem>
                    ))}
                  </Accordion>
                </section>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
