import { Link } from 'react-router-dom';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { useJoinFaqs } from '@/hooks/useJoinContent';
import { AdminNotice } from './AdminNotice';

// =====================================================================
// 06 · Frequently Asked Questions
//
// The one long section on the page. A reader who opens an accordion has
// asked to be persuaded, so the answers stay in full.
//
// Entries come from Supabase, grouped and ordered there. The shadcn
// accordion is used as-is for its keyboard and aria behaviour, restyled
// for the dark ground.
// =====================================================================

export function JoinFaqs() {
  const { groups, isLoading, isEmpty } = useJoinFaqs();

  return (
    <section aria-labelledby="join-faqs" className="container py-20 md:py-28">
      <div
        className="join-reveal flex items-baseline gap-5 pb-5"
        style={{ borderBottom: '1px solid var(--join-hairline)' }}
      >
        <span className="join-label">06</span>
        <h2 id="join-faqs" className="font-serif text-heading" style={{ color: 'var(--join-ink)' }}>
          Frequently Asked Questions
        </h2>
      </div>

      {isLoading && (
        <div aria-hidden className="mt-12 space-y-px max-w-3xl">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="h-16" style={{ background: 'rgba(255,255,255,0.04)' }} />
          ))}
        </div>
      )}

      {isEmpty && (
        <AdminNotice message="No published FAQ entries were found. Add entries to the join_faqs table, or check that they are marked as published." />
      )}

      <div className="mt-12 md:mt-16 max-w-3xl">
        {groups.map((group, gi) => (
          <div key={group.key} className={gi === 0 ? '' : 'mt-14 md:mt-20'}>
            <h3 className="join-label mb-4">{group.title}</h3>
            <Accordion type="multiple" className="w-full">
              {group.entries.map((faq) => (
                <AccordionItem
                  key={faq.id}
                  value={faq.id}
                  className="border-b"
                  style={{ borderColor: 'var(--join-hairline)' }}
                >
                  <AccordionTrigger
                    className="font-serif text-lg sm:text-subheading text-left hover:no-underline py-6 [&>svg]:w-5 [&>svg]:h-5"
                    style={{ color: 'var(--join-ink)' }}
                  >
                    {faq.question}
                  </AccordionTrigger>
                  <AccordionContent className="font-body text-base sm:text-lg leading-relaxed pb-7">
                    <span style={{ color: 'var(--join-body)' }}>{faq.answer}</span>
                    {faq.linkLabel && faq.linkTo && (
                      <span className="block mt-5">
                        <Link to={faq.linkTo} className="join-link">
                          {faq.linkLabel} <span aria-hidden>&rarr;</span>
                        </Link>
                      </span>
                    )}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </div>
        ))}
      </div>
    </section>
  );
}

export default JoinFaqs;
