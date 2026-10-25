import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { Seo } from '@/components/shared/Seo';
import { PageIntroduction, PageLoader } from '@/components/shared';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { useImagePreload } from '@/hooks/useImagePreload';
import { HERO_OVERLAY_URL } from '@/lib/hero-overlay';
import milanBgAsset from '@/assets/MIMS_Milan_Background-v2.webp.asset.json';
import { friendlyError } from '@/lib/errors';
import {
  FIT_HEADINGS, FIT_PARTS, FIT_YEARS, explainEvidence, nextFitStep,
  type FitAnswers, type FitPlace, type FitQuestion, type FitResult, type FitYear,
} from '@/lib/division-fit';

// =====================================================================
// THE DIVISION FIT TEST (Step 97).
// ---------------------------------------------------------------------
// An orientation quiz, not a selection test: it suggests which research
// division or fund may suit how a student likes to think and work. The
// engine runs on the Society's server (see lib/division-fit.ts), so the
// page shows one question at a time and never holds the scoring.
//
// THE FLOW IS FORWARD ONLY, AS THE BRIEF ASKS: introduction, year, the
// everyday situations (Part 1), the two interest questions (Part 2), the
// result. There is no Back and no Skip, Next stays disabled until an
// answer is chosen, and the options of a question are fixed when it
// appears: choosing one changes only the selection, and the next set is
// worked out when Next is pressed. Nothing is stored, so a refresh
// starts the test again.
// =====================================================================

type Phase =
  | { kind: 'intro' }
  | { kind: 'year' }
  | { kind: 'question'; question: FitQuestion }
  | { kind: 'result'; result: FitResult };

export default function DivisionFit() {
  const milanBg = milanBgAsset.url;
  const imagesLoaded = useImagePreload([milanBg, HERO_OVERLAY_URL]);

  const [phase, setPhase] = useState<Phase>({ kind: 'intro' });
  const [year, setYear] = useState<FitYear | null>(null);
  const [answers, setAnswers] = useState<FitAnswers>({});
  const [topic, setTopic] = useState<string | undefined>();
  const [selected, setSelected] = useState<string>('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);

  // A new screen moves the focus to its heading, so a keyboard or screen
  // reader user starts from the question rather than from the old button.
  useEffect(() => {
    if (phase.kind !== 'intro') headingRef.current?.focus();
  }, [phase]);

  const restart = () => {
    setPhase({ kind: 'intro' }); setYear(null); setAnswers({}); setTopic(undefined);
    setSelected(''); setError(null);
  };

  const go = async (y: FitYear, a: FitAnswers, t?: string, c?: string) => {
    setBusy(true); setError(null);
    try {
      const step = await nextFitStep(y, a, t, c);
      setSelected('');
      setPhase(step.step === 'result' ? { kind: 'result', result: step } : { kind: 'question', question: step });
    } catch (e) {
      setError(friendlyError(e));
    } finally { setBusy(false); }
  };

  const next = async () => {
    if (!selected || busy) return;
    if (phase.kind === 'year') {
      const y = selected as FitYear;
      setYear(y);
      await go(y, {});
      return;
    }
    if (phase.kind !== 'question' || !year) return;
    const q = phase.question;
    if (q.key === 'topic') {
      setTopic(selected);
      await go(year, answers, selected);
    } else if (q.key === 'classes') {
      await go(year, answers, topic, selected);
    } else {
      const a = { ...answers, [q.key]: selected };
      setAnswers(a);
      await go(year, a);
    }
  };

  if (!imagesLoaded) return <PageLoader />;

  const part = phase.kind === 'question' ? phase.question.part : phase.kind === 'year' ? 1 : null;
  const isLastQuestion = phase.kind === 'question' && phase.question.key === 'classes';

  return (
    <>
      <Seo page="/join/division-fit" />

      <div data-page-hero className="relative">
        <div className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: `url(${milanBg})` }} />
        <div className="absolute inset-0 hero-overlay" />
        <div className="relative z-10">
          <PageIntroduction
            title="Division Fit"
            description="A three-minute guide to which of our research divisions and funds may suit the way you like to think and work."
            transparentBackground
          />
        </div>
      </div>

      <section aria-labelledby="fit-heading" className="py-section-sm md:py-section bg-background">
        <div className="container">
          <div className="max-w-3xl">
            {/* THE TWO PARTS, not a question count: the fourth everyday
                question appears only when the answers call for it, so a
                count would promise a length the test may not have. */}
            {part && (
              <div className="mb-8" aria-label={`Part ${part} of 2: ${FIT_PARTS[part]}`}>
                <div className="flex gap-2" aria-hidden="true">
                  <span className="h-1 flex-1 bg-accent" />
                  <span className={`h-1 flex-1 ${part === 2 ? 'bg-accent' : 'bg-separator'}`} />
                </div>
                <p className="mt-3 font-body text-sm text-muted-foreground">
                  Part {part} of 2: {FIT_PARTS[part]}
                </p>
              </div>
            )}

            {phase.kind === 'intro' && (
              <div>
                <h2 id="fit-heading" className="font-serif text-heading mb-6 pb-3 border-b border-separator text-accent">
                  Not sure which division suits you?
                </h2>
                <p className="font-body text-body-lg text-muted-foreground">
                  Answer a few questions about everyday situations and about what interests you, and the test suggests
                  which of our four research divisions or two funds may suit you.
                </p>
                <ul className="mt-6 space-y-3 font-body text-foreground">
                  <li className="pl-5 relative before:content-['·'] before:absolute before:left-0 before:text-accent">It is guidance, not selection: it has no effect on an application, and you can apply to any division whatever it suggests.</li>
                  <li className="pl-5 relative before:content-['·'] before:absolute before:left-0 before:text-accent">There are no right or wrong answers, and you need no knowledge of finance.</li>
                  <li className="pl-5 relative before:content-['·'] before:absolute before:left-0 before:text-accent">It asks for no personal details and stores nothing. Refreshing the page starts it again.</li>
                  <li className="pl-5 relative before:content-['·'] before:absolute before:left-0 before:text-accent">Media &amp; Communication and Operations are not part of the test: read about them on the Join page.</li>
                </ul>
                <div className="mt-8">
                  <button type="button" className="cta-link-invert disabled:pointer-events-none disabled:opacity-50" onClick={() => setPhase({ kind: 'year' })}>Start the test</button>
                </div>
              </div>
            )}

            {(phase.kind === 'year' || phase.kind === 'question') && (
              <fieldset disabled={busy}>
                {phase.kind === 'question' && phase.question.label && (
                  <p className="font-body text-xs uppercase tracking-wider text-accent mb-2">{phase.question.label}</p>
                )}
                <h2 id="fit-heading" ref={headingRef} tabIndex={-1} className="font-serif text-subheading text-accent outline-none">
                  {phase.kind === 'year'
                    ? FIT_HEADINGS.year
                    : phase.question.title ?? FIT_HEADINGS[phase.question.key as 'topic' | 'classes']}
                </h2>
                {phase.kind === 'year' && (
                  <p className="mt-2 font-body text-sm text-muted-foreground">It changes only the wording of the questions.</p>
                )}

                <RadioGroup value={selected} onValueChange={setSelected} aria-labelledby="fit-heading" className="mt-6 gap-3">
                  {(phase.kind === 'year'
                    ? FIT_YEARS.map((y) => ({ id: y.value, text: y.label }))
                    : phase.question.options
                  ).map((o) => {
                    const on = selected === o.id;
                    return (
                      <label
                        key={o.id}
                        htmlFor={`fit-${o.id}`}
                        className={`flex cursor-pointer items-start gap-3 border p-4 font-body text-foreground transition-colors ${on ? 'border-accent bg-accent/5' : 'border-separator hover:border-accent/50'}`}
                      >
                        <RadioGroupItem id={`fit-${o.id}`} value={o.id} className="mt-1 border-accent text-accent" />
                        <span className="leading-relaxed">{o.text}</span>
                      </label>
                    );
                  })}
                </RadioGroup>

                {error && <p role="alert" className="mt-4 font-body text-sm text-destructive">{error}</p>}

                <div className="mt-8 flex flex-wrap items-center gap-3">
                  <button type="button" className="cta-link-invert disabled:pointer-events-none disabled:opacity-50 inline-flex items-center gap-2" disabled={!selected || busy} onClick={next}>
                    {busy && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
                    {isLastQuestion ? 'See my result' : 'Next'}
                  </button>
                  {error && <button type="button" className="cta-link" onClick={restart}>Start again</button>}
                </div>
              </fieldset>
            )}

            {phase.kind === 'result' && <Result result={phase.result} headingRef={headingRef} onRestart={restart} />}
          </div>
        </div>
      </section>
    </>
  );
}

function Place({ place, kicker, note, badge }: { place: FitPlace; kicker: string; note?: string; badge?: string | null }) {
  return (
    <div className="border border-separator p-6">
      <div className="flex flex-wrap items-center gap-2">
        <p className="font-body text-xs uppercase tracking-wider text-accent">{kicker}</p>
        {badge && <span className="border border-accent/40 px-2 py-0.5 font-body text-xs text-accent">{badge}</span>}
      </div>
      <h3 className="mt-2 font-serif text-subheading text-accent">{place.name}</h3>
      <p className="mt-3 font-body text-foreground leading-relaxed">{place.description}</p>
      {note && <p className="mt-3 font-body text-sm text-muted-foreground">{note}</p>}
      <Link to={place.href} className="mt-4 inline-block font-body text-sm text-accent underline underline-offset-4">
        Read about {place.name}
      </Link>
    </div>
  );
}

function Result({ result, headingRef, onRestart }: { result: FitResult; headingRef: React.RefObject<HTMLHeadingElement>; onRestart: () => void }) {
  if (result.noMatch || !result.first) {
    return (
      <div>
        <h2 id="fit-heading" ref={headingRef} tabIndex={-1} className="font-serif text-heading mb-6 pb-3 border-b border-separator text-accent outline-none">
          No clear match
        </h2>
        <p className="font-body text-body-lg text-muted-foreground">
          Your answers point in several different directions, so the test cannot suggest one division with confidence.
          That is a perfectly good outcome: it often means more than one kind of work appeals to you.
        </p>
        <p className="mt-4 font-body text-foreground">
          Read what each division and fund does on the Join page, or come and meet the members at one of our events,
          then choose the division you would most like to join.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Link to="/join" className="cta-link-invert disabled:pointer-events-none disabled:opacity-50">Read about the divisions</Link>
          <button type="button" className="cta-link" onClick={onRestart}>Take the test again</button>
        </div>
      </div>
    );
  }

  const first = result.first;
  const firstWhy = explainEvidence(result.firstEvidence);
  return (
    <div>
      <h2 id="fit-heading" ref={headingRef} tabIndex={-1} className="font-serif text-heading mb-6 pb-3 border-b border-separator text-accent outline-none">
        Your result
      </h2>
      <div className="space-y-5">
        <Place place={first} kicker="Your first choice" note={firstWhy ? `Why it may fit: ${firstWhy}` : undefined} />
        {result.second && (
          <Place
            place={result.second}
            kicker="Your second choice"
            badge={result.secondStrength}
            note={result.secondStrength === 'Supported'
              ? `Your answers support it too. ${explainEvidence(result.secondEvidence)}`
              : `The evidence for it is lighter. ${explainEvidence(result.secondEvidence)}`}
          />
        )}
        {result.secondOmitted && (
          <p className="font-body text-sm text-muted-foreground">
            Your answers do not support a reliable second suggestion, so only your first choice is shown.
          </p>
        )}
      </div>

      <p className="mt-8 font-body text-sm text-muted-foreground">
        This is guidance, not selection. On the application form your first choice is filled in for you, and you can
        change it to any division.
      </p>
      <div className="mt-6 flex flex-wrap gap-3">
        <Link to={`/apply?fit=${first.id}`} className="cta-link-invert disabled:pointer-events-none disabled:opacity-50">Apply with this choice</Link>
        <button type="button" className="cta-link" onClick={onRestart}>Take the test again</button>
      </div>
    </div>
  );
}
