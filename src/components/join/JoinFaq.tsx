import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Search, X } from 'lucide-react';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { usePermissions } from '@/hooks/usePermissions';
import { useJoinFaqs } from '@/hooks/useJoinFaqs';
import { JOIN_FAQ_HEADING } from '@/lib/join-content';

/**
 * Four FAQ groups driven by the join_faqs table.
 *
 * Hierarchy, from largest to smallest: the section heading, then each category
 * title set in the serif at heading size in accent on its own white panel, then
 * the questions in the serif at subheading size, then the answers in the body
 * font. Each category sits on a white card against the grey page panel so the
 * four groups separate at a glance rather than running together.
 *
 * A SEARCH FIELD SITS ABOVE THE GROUPS. By the time a reader reaches this
 * section they usually have one question in mind, and finding it meant opening
 * four categories and reading past everything else. The field filters every
 * category at once, on the questions AND the answers, so a word that appears
 * only in an answer still finds its question. Categories with nothing left in
 * them are hidden rather than shown empty, and a search that matches nothing
 * says so and offers a way back.
 *
 * Radix Accordion supplies the button-in-heading semantics, aria-expanded and
 * keyboard handling. Empty data renders the heading with the groups omitted and
 * an admin-only notice, never a broken accordion.
 */
export function JoinFaq() {
  const { groups, isLoading } = useJoinFaqs();
  const { isFullAccess } = usePermissions();

  const [query, setQuery] = useState('');
  /**
   * Which answers are open, across every category. The accordions are
   * controlled from here rather than each holding its own state, because a
   * search has to be able to open what it found: an uncontrolled accordion
   * would filter the list and still leave every answer shut.
   */
  const [openIds, setOpenIds] = useState<string[]>([]);

  /**
   * Every whitespace-separated word must appear somewhere in the entry. That
   * makes the field order-independent, so "deadline application" finds the same
   * entry as "application deadline", which is how people actually type into a
   * search box.
   */
  const terms = useMemo(
    () => query.toLowerCase().split(/\s+/).filter(Boolean),
    [query],
  );

  /**
   * The groups as displayed: filtered, with the empty ones dropped. With no
   * search running this is the original array, by identity, so an idle field
   * costs nothing and cannot re-render anything downstream.
   */
  const visibleGroups = useMemo(() => {
    if (terms.length === 0) return groups;
    return groups
      .map((group) => ({
        ...group,
        entries: group.entries.filter((entry) => {
          const haystack =
            `${entry.question} ${entry.answer} ${entry.linkLabel ?? ''}`.toLowerCase();
          return terms.every((term) => haystack.includes(term));
        }),
      }))
      .filter((group) => group.entries.length > 0);
  }, [groups, terms]);

  const resultCount = visibleGroups.reduce((n, group) => n + group.entries.length, 0);
  const isSearching = terms.length > 0;
  const noResults = isSearching && !isLoading && resultCount === 0;
  const isEmpty = !isLoading && groups.length === 0;

  /**
   * A search opens what it finds, so the answer is on screen rather than one
   * click further on. Two characters is the floor: a single letter matches most
   * of the page, and opening twenty answers at once is not an answer.
   * Clearing the field closes everything again.
   */
  useEffect(() => {
    if (query.trim().length < 2) {
      setOpenIds([]);
      return;
    }
    setOpenIds(visibleGroups.flatMap((group) => group.entries.map((entry) => entry.id)));
  }, [query, visibleGroups]);

  return (
    <div className="bg-secondary">
      <div className="container py-section-sm md:py-section">
        <h2
          id="join-faq-heading"
          className="font-serif text-heading mb-6 pb-3 border-b border-separator text-accent md:mb-8"
        >
          {JOIN_FAQ_HEADING}
        </h2>

        {/*
          The field carries the same treatment as the one on the readings page:
          square corners, a hairline in accent, the glyph inside the field on
          the left. It is only offered once there is something to search.
        */}
        {!isLoading && groups.length > 0 && (
          <div className="mb-10 md:mb-14">
            <label htmlFor="join-faq-search" className="sr-only">
              Search the questions
            </label>
            <div className="relative max-w-xl">
              <Search
                aria-hidden="true"
                className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-accent/60"
              />
              <input
                id="join-faq-search"
                type="search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search the questions"
                autoComplete="off"
                className="w-full rounded-none border border-accent/40 bg-transparent py-2.5 pl-9 pr-10 font-body text-sm text-accent transition-all duration-200 placeholder:text-accent/50 focus:border-accent focus:outline-none sm:py-2 sm:text-base [&::-webkit-search-cancel-button]:appearance-none"
              />
              {isSearching && (
                <button
                  type="button"
                  onClick={() => setQuery('')}
                  aria-label="Clear the search"
                  className="absolute right-2 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center text-accent/60 transition-colors hover:text-accent focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent"
                >
                  <X aria-hidden="true" className="h-4 w-4" />
                </button>
              )}
            </div>

            {/* Announced to a screen reader on every keystroke; the sighted
                reader has the filtered list itself. */}
            <p className="sr-only" role="status" aria-live="polite">
              {isSearching
                ? `${resultCount} ${resultCount === 1 ? 'question' : 'questions'} match your search.`
                : ''}
            </p>
          </div>
        )}

        {isLoading && (
          <p className="font-body text-body text-muted-foreground" role="status">
            Loading questions.
          </p>
        )}

        <div className="flex flex-col gap-6 md:gap-8">
          {visibleGroups.map((group) => (
            <section
              key={group.key}
              aria-labelledby={`faq-group-${group.key}`}
              className="bg-background p-6 md:p-10"
            >
              {/*
                The title sits directly on its rule. A decorative numeral used
                to sit to its left; a round-trip left it holding only a newline,
                so it rendered as an empty flex item plus its gap, which is the
                unexplained blank space that appeared before every heading.
              */}
              <div className="mb-2 border-b-2 border-accent pb-4 md:mb-4">
                <h3
                  id={`faq-group-${group.key}`}
                  className="font-serif text-heading leading-tight text-accent"
                >
                  {group.label}
                </h3>
              </div>

              <Accordion
                type="multiple"
                className="w-full"
                /*
                  Each accordion is handed only the open ids that belong to it,
                  and reports back only its own, so the four stay independent
                  while sharing one piece of state.
                */
                value={openIds.filter((id) => group.entries.some((entry) => entry.id === id))}
                onValueChange={(next) =>
                  setOpenIds((current) => [
                    ...current.filter((id) => !group.entries.some((entry) => entry.id === id)),
                    ...next,
                  ])
                }
              >
                {group.entries.map((entry) => (
                  <AccordionItem
                    key={entry.id}
                    value={entry.id}
                    className="border-separator"
                  >
                    <AccordionTrigger className="py-5 text-left font-serif text-lg leading-snug text-foreground hover:no-underline hover:text-accent md:text-subheading [&>svg]:h-5 [&>svg]:w-5 [&>svg]:shrink-0 [&>svg]:text-accent">
                      {entry.question}
                    </AccordionTrigger>
                    <AccordionContent className="pb-6">
                      <p className="font-body text-body leading-relaxed text-muted-foreground md:text-body-lg">
                        {entry.answer}
                      </p>
                      {entry.linkLabel && entry.linkHref && (
                        <Link
                          to={entry.linkHref}
                          className="mt-4 inline-flex items-center gap-2 font-serif text-base text-accent underline-offset-4 hover:underline md:text-lg"
                        >
                          {entry.linkLabel}
                          <span aria-hidden="true">{"\n"}</span>
                        </Link>
                      )}
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </section>
          ))}
        </div>

        {/* A search that finds nothing is a state of its own, on the same white
            panel the groups use, so the section never collapses to a heading
            over blank grey. */}
        {noResults && (
          <div className="bg-background p-6 md:p-10">
            <p className="font-body text-body text-muted-foreground md:text-body-lg">
              No question matches that search.
            </p>
            <button
              type="button"
              onClick={() => setQuery('')}
              className="mt-4 font-serif text-base text-accent underline-offset-4 hover:underline md:text-lg"
            >
              Show every question
            </button>
          </div>
        )}

        {isFullAccess && isEmpty && (
          <p className="font-body text-sm text-muted-foreground">
            Visible to administrators only. No FAQ entries are published, so this
            section has no content beneath its heading. Add entries in Workspace,
            Website, Join FAQ.
          </p>
        )}
      </div>
    </div>
  );
}

export default JoinFaq;
