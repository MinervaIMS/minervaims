import { useCallback, useEffect, useRef, useState, type KeyboardEvent } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, CalendarClock, ClipboardList } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { MyFormSummary } from '@/lib/internal-forms-api';
import { deadlineRelative } from '@/components/admin/forms/forms-model';

// =====================================================================
// Forms waiting for this member, in the place of Research by division.
// ---------------------------------------------------------------------
// While an internal form is open and the member has not answered it, it
// takes the card on the left of the event registration; once they answer
// or it closes, Research by division (or Getting started) comes back.
//
// SEVERAL FORMS ARE A SMART STACK, as on an iPhone's home screen: one
// card at a time, the next one underneath, a vertical swipe (or scroll,
// or the arrow keys) to move between them, and the dots on the right to
// say where you are and to jump. It is built on the browser's own
// scroll snapping, so it moves under a finger exactly as the system
// does, and at either end the page carries on scrolling rather than
// getting stuck. Where the browser can link an animation to a scroll
// position, the cards also shrink and fade as they leave, the depth the
// iPhone gives them; elsewhere, and for anyone who asks for reduced
// motion, they simply slide.
//
// The cover picture, when the form has one, fills the side of the card
// (its top on a phone), cut by the card's rounded corners.
// =====================================================================

const STYLES = `
  .forms-stack { scrollbar-width: none; overscroll-behavior-y: auto; }
  .forms-stack::-webkit-scrollbar { display: none; }
  @supports (animation-timeline: view()) {
    @media (prefers-reduced-motion: no-preference) {
      .forms-stack-card > .forms-stack-face {
        animation: forms-stack-depth linear both;
        animation-timeline: view(block);
        animation-range: entry 0% exit 100%;
        transform-origin: 50% 50%;
      }
    }
  }
  @keyframes forms-stack-depth {
    entry 0%   { transform: scale(.9) translate3d(0, 4%, 0); opacity: .35; }
    entry 100% { transform: none; opacity: 1; }
    exit 0%    { transform: none; opacity: 1; }
    exit 100%  { transform: scale(.9) translate3d(0, -4%, 0); opacity: .35; }
  }
`;

function urgent(iso: string | null): boolean {
  return !!iso && new Date(iso).getTime() - Date.now() < 2 * 86400000;
}

function FormFace({ f }: { f: MyFormSummary }) {
  return (
    <div className="forms-stack-face flex h-full w-full flex-col overflow-hidden sm:flex-row">
      {f.cover_url && (
        <div className="relative h-[42%] w-full shrink-0 bg-muted/40 sm:h-full sm:w-[42%]">
          <img src={f.cover_url} alt="" loading="lazy" className="absolute inset-0 h-full w-full object-cover" />
        </div>
      )}
      <div className="flex min-h-0 min-w-0 flex-1 flex-col p-4 pr-9">
        <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
          <ClipboardList aria-hidden className="h-3.5 w-3.5 text-accent" />Form for you
        </p>
        <h2 className="mt-1.5 line-clamp-2 font-serif text-[22px] leading-tight text-accent">{f.title}</h2>
        {f.description && <p className="mt-1.5 line-clamp-3 text-sm leading-relaxed text-muted-foreground">{f.description}</p>}
        <div className="mt-auto flex flex-wrap items-center justify-between gap-x-3 gap-y-2 pt-3">
          <span className={`inline-flex items-center gap-1.5 text-xs ${urgent(f.closes_at) ? 'font-medium text-destructive' : 'text-muted-foreground'}`}>
            <CalendarClock aria-hidden className="h-3.5 w-3.5" />{f.closes_at ? deadlineRelative(f.closes_at) : 'No deadline'}
          </span>
          <Button asChild size="sm" variant="solid">
            <Link to={`/forms/${f.id}`} aria-label={`Answer: ${f.title}`}>Answer<ArrowRight className="h-4 w-4" /></Link>
          </Button>
        </div>
      </div>
    </div>
  );
}

export default function FormsStackBlock({ forms }: { forms: MyFormSummary[] }) {
  const scroller = useRef<HTMLDivElement>(null);
  const [index, setIndex] = useState(0);
  const frame = useRef(0);
  const many = forms.length > 1;

  // Which card is in view, read from the scroll position once per frame.
  const onScroll = useCallback(() => {
    cancelAnimationFrame(frame.current);
    frame.current = requestAnimationFrame(() => {
      const el = scroller.current;
      if (!el || !el.clientHeight) return;
      setIndex(Math.max(0, Math.min(forms.length - 1, Math.round(el.scrollTop / el.clientHeight))));
    });
  }, [forms.length]);
  useEffect(() => () => cancelAnimationFrame(frame.current), []);
  // A form answered elsewhere leaves the stack: stay within it.
  useEffect(() => { if (index > forms.length - 1) setIndex(Math.max(0, forms.length - 1)); }, [forms.length, index]);

  const go = (i: number) => {
    const el = scroller.current;
    if (!el) return;
    const reduce = typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    el.scrollTo({ top: i * el.clientHeight, behavior: reduce ? 'auto' : 'smooth' });
  };
  const onKey = (e: KeyboardEvent) => {
    if (!many) return;
    const next = e.key === 'ArrowDown' || e.key === 'PageDown' ? index + 1 : e.key === 'ArrowUp' || e.key === 'PageUp' ? index - 1 : e.key === 'Home' ? 0 : e.key === 'End' ? forms.length - 1 : null;
    if (next === null) return;
    e.preventDefault();
    go(Math.max(0, Math.min(forms.length - 1, next)));
  };

  if (!forms.length) return null;
  return (
    <section
      aria-roledescription={many ? 'stack' : undefined}
      aria-label={many ? `${forms.length} forms waiting for your answer` : 'A form waiting for your answer'}
      className="relative h-full min-h-0 overflow-hidden rounded-xl border border-separator bg-background font-body"
    >
      <style>{STYLES}</style>
      <div
        ref={scroller} onScroll={onScroll} onKeyDown={onKey} tabIndex={many ? 0 : -1}
        aria-label={many ? 'Swipe, scroll or use the arrow keys to see the other forms' : undefined}
        className={`forms-stack h-full ${many ? 'snap-y snap-mandatory overflow-y-auto focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring' : 'overflow-hidden'}`}
      >
        {forms.map((f, i) => (
          <article
            key={f.id}
            className="forms-stack-card h-full snap-start snap-always"
            aria-roledescription={many ? 'card' : undefined}
            aria-label={many ? `${i + 1} of ${forms.length}: ${f.title}` : undefined}
            // The cards out of view take no focus and no clicks until they are scrolled in.
            {...(many && i !== index ? { inert: '' } : {})}
          >
            <FormFace f={f} />
          </article>
        ))}
      </div>
      {many && (
        <div className="absolute right-2.5 top-1/2 flex -translate-y-1/2 flex-col items-center gap-1.5" role="group" aria-label="Choose a form">
          {forms.map((f, i) => (
            <button
              key={f.id} type="button" data-ro onClick={() => go(i)}
              aria-label={`Form ${i + 1} of ${forms.length}: ${f.title}`} aria-current={i === index ? 'true' : undefined}
              className="flex h-5 w-5 items-center justify-center"
            >
              <span className={`block w-1.5 rounded-full transition-all duration-200 ${i === index ? 'h-3.5 bg-accent' : 'h-1.5 bg-accent/30 hover:bg-accent/60'}`} />
            </button>
          ))}
        </div>
      )}
    </section>
  );
}
