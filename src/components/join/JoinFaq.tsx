import { Link } from 'react-router-dom';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { usePermissions } from '@/hooks/usePermissions';
import { useJoinFaqs } from '@/hooks/useJoinFaqs';

/**
 * Four FAQ groups on the grey panel used by the technical pages, driven by the
 * join_faqs table. Radix Accordion supplies the button-in-heading semantics,
 * aria-expanded and keyboard handling. Empty data renders the heading with the
 * groups omitted and an admin-only notice, never a broken accordion.
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
          className="font-serif text-heading mb-8 pb-3 border-b border-separator text-accent"
        >
          Frequently Asked Questions
        </h2>

        {isLoading && (
          <p className="font-body text-body text-muted-foreground" role="status">
            Loading questions.
          </p>
        )}

        <div className="grid grid-cols-1 gap-x-14 gap-y-12 lg:grid-cols-2">
          {groups.map((group) => (
            <section key={group.key} aria-labelledby={`faq-group-${group.key}`}>
              <h3
                id={`faq-group-${group.key}`}
                className="font-body text-xs uppercase tracking-[0.16em] text-muted-foreground pb-3 border-b border-separator"
              >
                {group.label}
              </h3>
              <Accordion type="multiple" className="w-full">
                {group.entries.map((entry) => (
                  <AccordionItem
                    key={entry.id}
                    value={entry.id}
                    className="border-separator"
                  >
                    <AccordionTrigger className="font-serif text-left text-lg text-accent hover:no-underline py-5 [&>svg]:text-accent [&>svg]:w-4 [&>svg]:h-4">
                      {entry.question}
                    </AccordionTrigger>
                    <AccordionContent className="font-body text-body text-muted-foreground pb-5">
                      <p>{entry.answer}</p>
                      {entry.linkLabel && entry.linkHref && (
                        <Link
                          to={entry.linkHref}
                          className="mt-4 inline-flex items-center gap-2 font-serif text-accent underline-offset-4 hover:underline"
                        >
                          {entry.linkLabel}
                          <span aria-hidden="true">&rarr;</span>
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
          <p className="font-body text-sm text-muted-foreground mt-2">
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
