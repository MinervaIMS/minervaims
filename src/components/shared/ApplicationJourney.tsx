import { useEffect, useRef, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface WrittenAnswer {
  div: string;
  key: string; // org_division key, used to read the live question
  q: string;
}

interface JourneyStep {
  n: number;
  t: string;
  d: React.ReactNode;
  written?: WrittenAnswer[];
}

const STEPS: JourneyStep[] = [
  {
    n: 1,
    t: 'Prepare Your Application',
    d: (
      <>
        Get your materials ready before you submit: a CV, a motivation letter, and the
        written answer for your first-choice division. In the form you rank your division
        preferences from 1 (first choice) to 5 (fifth choice); prepare your response as a
        single PDF named <span className="file">Surname_Name_Answer.pdf</span>.
      </>
    ),
    written: [
      {
        div: 'Equity Research', key: 'equity',
        q: 'Submit an equity investment pitch (maximum one page). Place any charts/tables in an Appendix after the first page.',
      },
      {
        div: 'Investment Research', key: 'investment',
        q: 'How do you keep your knowledge of business and finance current? Which recent financial markets story has interested you most, and why? Explain in detail.',
      },
      {
        div: 'Macro Research', key: 'macro',
        q: 'Choose a macroeconomic topic and explain how it may impact any of Minerva’s funds.',
      },
      {
        div: 'Portfolio Management', key: 'portfolio',
        q: 'Submit a one-page investment pitch. It may cover a stock, bond, ETP, derivatives strategy, or a full portfolio. Place any charts/tables/math formulas in an Appendix after the first page.',
      },
      {
        div: 'Quantitative Research', key: 'quant',
        q: 'Provide brief answers to both: a topic in quantitative finance, risk management, or financial machine learning you are interested in; and a project (academic/personal/work) in which you wrote code (what you built and what you learned).',
      },
    ],
  },
  {
    n: 2,
    t: 'Online Application',
    d: 'Complete the application form and submit your CV, motivation letter, and the required written answers and/or investment pitch for the division you are applying for.',
  },
  {
    n: 3,
    t: 'Interview',
    d: 'Selected candidates are invited to interview with current members and Board representatives to discuss their application, assess cultural fit, and test hard skills and market knowledge. Historically, more than 50% of applicants are invited to interview.',
  },
  {
    n: 4,
    t: 'Onboarding',
    d: 'Successful candidates join MIMS and begin the training programme, including research methodology and financial modelling. Historically, c.4% of applicants are selected; intake capacity is typically higher at the start of the academic year.',
  },
];

export function ApplicationJourney() {
  const rootRef = useRef<HTMLDivElement>(null);
  // Live, editable per-division questions (managed in the workspace). Falls
  // back to the defaults above if the fetch fails.
  const [liveQuestions, setLiveQuestions] = useState<Record<string, string>>({});

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const { data } = await supabase
          .from('application_questions' as never)
          .select('division, question');
        if (!active || !data) return;
        const map: Record<string, string> = {};
        for (const row of data as unknown as { division: string; question: string }[]) {
          if (row.question?.trim()) map[row.division] = row.question;
        }
        setLiveQuestions(map);
      } catch { /* keep defaults */ }
    })();
    return () => { active = false; };
  }, []);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;

    const prefersReduced =
      typeof window !== 'undefined' &&
      window.matchMedia &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    const lightAll = () => {
      const steps = Array.from(root.querySelectorAll<HTMLElement>('.jstep'));
      steps.forEach((step) => {
        step.classList.add('lit');
        const fill = step.querySelector<HTMLElement>('.jline .fill');
        if (fill) fill.style.height = 'calc(100% + 2.5rem)';
      });
    };

    if (prefersReduced) {
      lightAll();
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          const steps = Array.from(root.querySelectorAll<HTMLElement>('.jstep'));
          steps.forEach((step, i) => {
            window.setTimeout(() => {
              step.classList.add('lit');
              const fill = step.querySelector<HTMLElement>('.jline .fill');
              if (fill) fill.style.height = 'calc(100% + 2.5rem)';
            }, 250 + i * 400);
          });
          observer.unobserve(entry.target);
        });
      },
      { threshold: 0.2 },
    );

    observer.observe(root);
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={rootRef} className="journey">
      {STEPS.map((s) => (
        <div key={s.n} className="jstep">
          <div className="jrail">
            <div className="jdot">{s.n}</div>
            <div className="jline" aria-hidden>
              <div className="fill" />
            </div>
          </div>
          <div>
            <h3 className="jt-t">{s.t}</h3>
            <div className="jt-d">{s.d}</div>
            {s.written && (
              <div className="jwritten">
                <p className="jw-note">
                  Answer the question for your first-choice division below. You may answer
                  additional divisions too — if you do, combine everything into the same PDF.
                </p>
                {s.written.map((w) => (
                  <div key={w.div} className="jw-row">
                    <div className="jw-div">{w.div}</div>
                    <div className="jw-q">{liveQuestions[w.key] ?? w.q}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
