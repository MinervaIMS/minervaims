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
        // =============================================================
        // ONE MEASURE, AND IT IS A READING MEASURE.
        //
        // The FAQ used to run the full width of the workspace content
        // area, which on a desktop is well over a thousand pixels: a
        // two-clause answer became one line of a hundred and forty
        // characters, and the eye has to travel the whole width and find
        // its way back to a line start that is nowhere near where it
        // started. Typographic convention puts a comfortable line at
        // sixty to eighty characters, and 42rem is about eighty at the
        // size this text is set.
        //
        // The cap is on the whole column, filters included, so the search
        // field, the category select, the group headings and the
        // questions all share one left and one right edge instead of the
        // text sitting in a narrow band inside a wide one.
        // =============================================================
        <div className="font-body max-w-2xl">
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
            <div className="space-y-8">
              {visible.map((group) => (
                <section key={group.key} aria-labelledby={`faq-${group.key}`}>
                  {/* The group name is a label, not a headline: small caps
                      in the body font, so the QUESTIONS are the largest
                      type in the column and the eye lands on them first.
                      It used to be set in the serif at text-lg, a step
                      ABOVE the questions it introduced. */}
                  <h2
                    id={`faq-${group.key}`}
                    className="mb-1 text-xs uppercase tracking-[0.12em] text-muted-foreground"
                  >
                    {group.label}
                  </h2>
                  <Accordion type="multiple" className="w-full border-t border-separator">
                    {group.entries.map((entry) => (
                      <AccordionItem key={entry.id} value={entry.id} className="border-separator">
                        {/* THE QUESTION READS AS A QUESTION.
                            - items-start, so on a question that wraps the
                              chevron stays beside the FIRST line rather
                              than floating down to the vertical middle of
                              a two-line block;
                            - gap-6, so the chevron never touches the last
                              word;
                            - leading-normal rather than leading-snug,
                              because a wrapped question set tight reads as
                              one long phrase;
                            - and the open question takes the accent
                              colour, so it is obvious which of several
                              expanded answers belongs to which question. */}
                        <AccordionTrigger className="items-start gap-6 py-4 text-left font-serif text-base leading-normal text-foreground transition-colors hover:text-accent hover:no-underline data-[state=open]:text-accent [&>svg]:mt-1 [&>svg]:h-4 [&>svg]:w-4 [&>svg]:shrink-0 [&>svg]:text-accent">
                          {entry.question}
                        </AccordionTrigger>
                        {/* The answer is indented to sit under the question
                            it answers and away from the group's left rule,
                            which is what separates an answer from the next
                            question at a glance. */}
                        <AccordionContent className="pb-5 pl-4 border-l-2 border-accent/20 ml-px">
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
