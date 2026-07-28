import { ADMISSION_STEPS } from './content';
import { useScrollProgress } from './useJoinMotion';

// =====================================================================
// 04 · Admissions
//
// The progressive illumination from the old page, refined: a thin
// vertical line draws itself down the block as the reader scrolls, and
// each step number ignites as the line reaches it.
//
// Under still mode the line is fully drawn and every step is lit from the
// start, so the same information is present without any motion.
// =====================================================================

interface Props {
  still: boolean;
}

export function AdmissionsSteps({ still }: Props) {
  const { ref, progress } = useScrollProgress(still);
  const count = ADMISSION_STEPS.length;

  return (
    <section aria-labelledby="join-admissions" className="container py-20 md:py-28">
      <div
        className="join-reveal flex items-baseline gap-5 pb-5"
        style={{ borderBottom: '1px solid var(--join-hairline)' }}
      >
        <span className="join-label">04</span>
        <h2 id="join-admissions" className="font-serif text-heading" style={{ color: 'var(--join-ink)' }}>
          Admissions
        </h2>
      </div>

      <p
        className="join-reveal font-body text-body-lg leading-relaxed mt-8 max-w-3xl"
        style={{ color: 'var(--join-body)' }}
      >
        Admissions run once each academic semester. The process has four stages.
      </p>

      <ol
        ref={ref as React.RefObject<HTMLOListElement>}
        className="relative mt-14 md:mt-20 list-none p-0 m-0"
      >
        {/* The rail: a hairline track with a fill that scales to the
            reader's progress through the block. */}
        <span
          aria-hidden
          className="join-rail absolute top-2 bottom-2 left-[1.375rem] w-px md:left-[1.75rem]"
        />
        <span
          aria-hidden
          className="join-rail-fill absolute top-2 bottom-2 left-[1.375rem] w-px md:left-[1.75rem]"
          style={{ ['--join-rail-progress' as string]: still ? 1 : progress }}
        />

        {ADMISSION_STEPS.map((step, i) => {
          // Each step lights as the rail passes its own position.
          const threshold = (i + 0.35) / count;
          const lit = still || progress >= threshold;
          return (
            <li
              key={step.number}
              className={`join-step relative pl-16 md:pl-24 ${i === 0 ? '' : 'mt-12 md:mt-16'} ${lit ? 'is-lit' : ''}`}
            >
              <span
                aria-hidden
                className="join-step-num absolute left-0 top-0 flex h-11 w-11 items-center justify-center border font-serif text-base md:h-14 md:w-14 md:text-lg"
                style={{ backgroundColor: 'var(--join-bg)' }}
              >
                {step.number}
              </span>
              <h3 className="font-serif text-subheading" style={{ color: 'var(--join-ink)' }}>
                <span className="sr-only">{`Step ${step.number}. `}</span>
                {step.title}
              </h3>
              <p
                className="font-body text-body-lg leading-relaxed mt-3 max-w-3xl"
                style={{ color: 'var(--join-body)' }}
              >
                {step.body}
              </p>
            </li>
          );
        })}
      </ol>
    </section>
  );
}

export default AdmissionsSteps;
