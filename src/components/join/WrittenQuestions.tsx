import { useWrittenQuestions } from '@/hooks/useJoinContent';
import { AdminNotice } from './AdminNotice';

// =====================================================================
// 05 · The Written Question
//
// The five questions are set by the Board ahead of each intake. Between
// intakes they are unset, and that is the normal resting state of this
// block rather than a fault.
//
// The empty state is a designed one: the five divisions are still listed,
// and a single neutral line explains the absence once, at the top. It is
// never repeated five times, and no placeholder wording is dressed up as
// page copy.
// =====================================================================

interface Props {
  still: boolean;
}

export function WrittenQuestions(_props: Props) {
  const { questions, isLoading, anyPublished } = useWrittenQuestions();

  return (
    <section aria-labelledby="join-question" className="container py-20 md:py-28">
      <div
        className="join-reveal flex items-baseline gap-5 pb-5"
        style={{ borderBottom: '1px solid var(--join-hairline)' }}
      >
        <span className="join-label">05</span>
        <h2 id="join-question" className="font-serif text-heading" style={{ color: 'var(--join-ink)' }}>
          The Written Question
        </h2>
      </div>

      <p
        className="join-reveal font-body text-body-lg leading-relaxed mt-8 max-w-3xl"
        style={{ color: 'var(--join-body)' }}
      >
        The written question for each division is set by the Board of Directors ahead of every intake and published
        here once confirmed.
      </p>

      {!isLoading && !anyPublished && questions.length > 0 && (
        <p className="join-reveal font-body text-small mt-6" style={{ color: 'var(--join-dim)' }}>
          Published ahead of the next intake.
        </p>
      )}

      <div className="mt-12 md:mt-16">
        {isLoading ? (
          <div aria-hidden className="space-y-px">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-16" style={{ background: 'rgba(255,255,255,0.04)' }} />
            ))}
          </div>
        ) : (
          <ul className="list-none p-0 m-0">
            {questions.map((q, i) => (
              <li
                key={q.division}
                className="join-reveal grid gap-x-10 gap-y-2 py-6 md:py-8 md:grid-cols-[minmax(0,1fr)_minmax(0,1.7fr)]"
                data-reveal-delay={i * 70}
                style={{ borderTop: '1px solid var(--join-hairline)' }}
              >
                <h3 className="font-serif text-subheading" style={{ color: 'var(--join-ink)' }}>
                  {q.label}
                </h3>
                {q.question ? (
                  <p className="font-body text-body-lg leading-relaxed" style={{ color: 'var(--join-body)' }}>
                    {q.question}
                  </p>
                ) : (
                  <span className="sr-only">Not yet published.</span>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>

      {!isLoading && questions.length === 0 && (
        <AdminNotice message="No divisions are listed for the written question. Seed the join_written_questions table so the five divisions appear here." />
      )}
    </section>
  );
}

export default WrittenQuestions;
