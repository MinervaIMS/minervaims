import { Link } from 'react-router-dom';
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
 * Radix Accordion supplies the button-in-heading semantics, aria-expanded and
 * keyboard handling. Empty data renders the heading with the groups omitted and
 * an admin-only notice, never a broken accordion.
 */
export function JoinFaq() {
  const { groups, isLoading } = useJoinFaqs();
  const { isFullAccess } = usePermissions();

  const isEmpty = !isLoading && groups.length === 0;

  return (
    <div className="bg-secondary">
      <div className="container py-section-sm md:py-section">
        <h2
          id="join-faq-heading"
          className="font-serif text-heading mb-10 pb-3 border-b border-separator text-accent md:mb-14"
        >
          {JOIN_FAQ_HEADING}
        </h2>

        {isLoading && (
          <p className="font-body text-body text-muted-foreground" role="status">
            Loading questions.
          </p>
        )}

        <div className="flex flex-col gap-6 md:gap-8">
          {groups.map((group) => (
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

              <Accordion type="multiple" className="w-full">
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
