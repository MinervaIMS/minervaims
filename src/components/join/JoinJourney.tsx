import { useEffect, useRef } from 'react';
import { JOIN_JOURNEY } from '@/lib/join-content';

/**
 * The four admission stages on the glowing spine. Each stage lights as the
 * reader reaches it, so the illumination tracks progress through the process
 * rather than firing all at once on a single section-level trigger. Under
 * prefers-reduced-motion every step renders fully lit immediately.
 */
export function JoinJourney() {
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;

    const steps = Array.from(root.querySelectorAll<HTMLElement>('.jstep'));
    const light = (step: HTMLElement) => {
      step.classList.add('lit');
      const fill = step.querySelector<HTMLElement>('.jline .fill');
      if (fill) fill.style.height = 'calc(100% + 2.5rem)';
    };

    const prefersReduced =
      typeof window !== 'undefined' &&
      typeof window.matchMedia === 'function' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (prefersReduced) {
      steps.forEach(light);
      return;
    }

    /*
      Each step is observed on its own, so a stage only illuminates once the
      reader has actually reached it. A single section-level trigger lit the
      whole journey at once, which told the reader nothing about the sequence.

      rootMargin pulls the trigger line up to roughly the lower third of the
      viewport, so a step lights as it settles into reading position rather
      than the instant its top edge appears. Once lit, a step stays lit and is
      unobserved, so the spine reads as a path already travelled.
    */
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          light(entry.target as HTMLElement);
          observer.unobserve(entry.target);
        });
      },
      { rootMargin: '0px 0px -32% 0px', threshold: 0.35 },
    );

    steps.forEach((step) => observer.observe(step));
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={rootRef} className="journey">
      {JOIN_JOURNEY.steps.map((step) => (
        <div key={step.n} className="jstep">
          <div className="jrail">
            <div className="jdot">{step.n}</div>
            <div className="jline" aria-hidden="true">
              <div className="fill" />
            </div>
          </div>
          <div>
            <h3 className="jt-t">
              {step.title}
            </h3>
            <div className="jt-d">
              {step.files.length === 0
                ? step.body
                : // The two file names are set in the same sentence but marked
                  // up so they read as filenames rather than prose.
                  step.body
                    .split(new RegExp(`(${step.files.join('|')})`, 'g'))
                    .map((part, i) =>
                      (step.files as readonly string[]).includes(part) ? (
                        <span className="file" key={i}>
                          {part}
                        </span>
                      ) : (
                        part
                      ),
                    )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

export default JoinJourney;
