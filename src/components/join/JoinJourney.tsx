import { useEffect, useRef } from 'react';
import { JOIN_JOURNEY } from '@/lib/join-content';

/**
 * The four admission stages on the glowing spine. The progressive
 * illumination is the pattern already used on this page and is kept as is;
 * under prefers-reduced-motion every step renders fully lit immediately.
 */
export function JoinJourney() {
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;

    const lightAll = () => {
      root.querySelectorAll<HTMLElement>('.jstep').forEach((step) => {
        step.classList.add('lit');
        const fill = step.querySelector<HTMLElement>('.jline .fill');
        if (fill) fill.style.height = 'calc(100% + 2.5rem)';
      });
    };

    const prefersReduced =
      typeof window !== 'undefined' &&
      typeof window.matchMedia === 'function' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (prefersReduced) {
      lightAll();
      return;
    }

    const timers: number[] = [];
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          const steps = Array.from(root.querySelectorAll<HTMLElement>('.jstep'));
          steps.forEach((step, i) => {
            timers.push(
              window.setTimeout(() => {
                step.classList.add('lit');
                const fill = step.querySelector<HTMLElement>('.jline .fill');
                if (fill) fill.style.height = 'calc(100% + 2.5rem)';
              }, 250 + i * 400),
            );
          });
          observer.unobserve(entry.target);
        });
      },
      { threshold: 0.2 },
    );

    observer.observe(root);
    return () => {
      observer.disconnect();
      timers.forEach((t) => window.clearTimeout(t));
    };
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
              {step.n} &middot; {step.title}
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
