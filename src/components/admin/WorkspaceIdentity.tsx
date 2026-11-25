import { useEffect, useLayoutEffect, useRef, useState } from 'react';

// =====================================================================
// WHO IS SIGNED IN, AT THE TOP OF THE WORKSPACE (Step 108).
// ---------------------------------------------------------------------
// The reader's picture (or their initials), their name as the register
// holds it on the first line, and their role beneath. A name is never
// cut: when it is wider than the room it has, it slides through the line
// and fades in and out at its edges, as one seamless loop that pauses
// under the pointer or the keyboard. Under reduced motion it does not
// move at all: it wraps onto a second line instead.
//
// The words are read once by assistive technology: the moving copy that
// makes the loop seamless is hidden from it.
// =====================================================================

export function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return '';
  const first = parts[0][0] ?? '';
  const last = parts.length > 1 ? parts[parts.length - 1][0] ?? '' : '';
  return `${first}${last}`.toUpperCase();
}

/** Pixels per second the name moves at: slow enough to read. */
export const MARQUEE_SPEED = 32;
/** The room between the end of the name and its next pass, in pixels. */
export const MARQUEE_GAP = 40;

function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState(() =>
    typeof window !== 'undefined' && !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches);
  useEffect(() => {
    const mq = window.matchMedia?.('(prefers-reduced-motion: reduce)');
    if (!mq) return;
    const on = () => setReduced(mq.matches);
    mq.addEventListener?.('change', on);
    return () => mq.removeEventListener?.('change', on);
  }, []);
  return reduced;
}

export function MarqueeName({ text, className = '' }: { text: string; className?: string }) {
  const boxRef = useRef<HTMLSpanElement>(null);
  const firstRef = useRef<HTMLSpanElement>(null);
  const trackRef = useRef<HTMLSpanElement>(null);
  const animRef = useRef<Animation | null>(null);
  const [overflow, setOverflow] = useState(false);
  const reduced = useReducedMotion();

  // Does the name fit? Measured on the one copy, against the room the
  // line has; asked again whenever either changes size.
  useLayoutEffect(() => {
    const box = boxRef.current;
    const first = firstRef.current;
    if (!box || !first) return;
    if (reduced) { setOverflow(false); return; }
    const measure = () => setOverflow(first.scrollWidth > box.clientWidth + 1);
    measure();
    if (typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(measure);
    ro.observe(box);
    ro.observe(first);
    return () => ro.disconnect();
  }, [text, reduced]);

  // The loop: the track holds the name twice, a gap apart, and moves left
  // by exactly one name and one gap, so the second copy lands where the
  // first began and the restart cannot be seen.
  useEffect(() => {
    animRef.current?.cancel();
    animRef.current = null;
    const track = trackRef.current;
    const first = firstRef.current;
    if (!overflow || reduced || !track || !first || typeof track.animate !== 'function') return;
    const distance = first.scrollWidth + MARQUEE_GAP;
    const anim = track.animate(
      [{ transform: 'translateX(0)' }, { transform: `translateX(-${distance}px)` }],
      { duration: Math.max(4000, (distance / MARQUEE_SPEED) * 1000), iterations: Infinity, easing: 'linear', delay: 1200 },
    );
    animRef.current = anim;
    return () => anim.cancel();
  }, [overflow, reduced, text]);

  const pause = () => animRef.current?.pause();
  const play = () => animRef.current?.play();
  const moving = overflow && !reduced;

  return (
    <span
      ref={boxRef}
      className={`relative block min-w-0 ${reduced ? '' : 'overflow-hidden'} ${className}`}
      style={moving ? {
        WebkitMaskImage: 'linear-gradient(to right, transparent 0, #000 10px, #000 calc(100% - 18px), transparent 100%)',
        maskImage: 'linear-gradient(to right, transparent 0, #000 10px, #000 calc(100% - 18px), transparent 100%)',
      } : undefined}
      onMouseEnter={pause}
      onMouseLeave={play}
      data-marquee={moving ? 'on' : 'off'}
    >
      {/* On one line unless motion is reduced, so the measure above sees
          the name's natural width; reduced, it wraps and never moves. */}
      <span ref={trackRef} className={`inline-flex ${reduced ? 'whitespace-normal' : 'whitespace-nowrap'} ${moving ? 'pl-[10px] will-change-transform' : ''}`}>
        <span ref={firstRef} className={reduced ? 'break-words' : 'whitespace-nowrap'}>{text}</span>
        {moving && (
          <span aria-hidden="true" className="whitespace-nowrap" style={{ paddingLeft: MARQUEE_GAP }}>{text}</span>
        )}
      </span>
    </span>
  );
}

export function WorkspaceIdentity({
  name, roleLabel, email, photoUrl, variant = 'desktop',
}: {
  /** The register's first name and surname, or null for an account without a member record. */
  name: string | null;
  roleLabel: string;
  email: string;
  photoUrl: string | null;
  variant?: 'desktop' | 'drawer';
}) {
  const [broken, setBroken] = useState(false);
  useEffect(() => { setBroken(false); }, [photoUrl]);
  const shownName = (name ?? '').trim() || email || 'Your account';
  const initials = initialsOf(name ?? '') || 'M';
  const desktop = variant === 'desktop';
  const showPhoto = !!photoUrl && !broken;

  return (
    <div className={"flex min-w-0 items-center gap-3"} title={desktop && email ? email : undefined}>
      <span
        className={`${desktop ? 'h-12 w-12' : 'h-11 w-11'} shrink-0 overflow-hidden rounded-lg border ${desktop ? 'border-separator bg-accent' : 'border-accent-foreground/25 bg-accent-foreground/10'}`}
        aria-hidden="true"
      >
        {showPhoto
          ? <img src={photoUrl!} alt="" className="h-full w-full object-cover" onError={() => setBroken(true)} />
          : <span className={`flex h-full w-full items-center justify-center font-serif ${desktop ? 'text-xl' : 'text-lg'} text-accent-foreground`}>{initials}</span>}
      </span>
      {/* The workspace's own serif on a computer, as its header always had. */}
      <span className="flex min-w-0 flex-1 flex-col leading-tight" style={desktop ? { fontFamily: '"Times New Roman", Times, serif' } : undefined}>
        <MarqueeName
          text={shownName}
          className={desktop ? 'text-[22px] text-accent' : 'font-serif text-lg text-accent-foreground'}
        />
        <span className={desktop
          ? 'mt-0.5 truncate text-base italic text-foreground/80'
          : 'mt-0.5 truncate font-serif text-base italic text-accent-foreground/85'}
        >
          {roleLabel}
        </span>
        {!desktop && email && (
          <span className="truncate font-body text-xs text-accent-foreground/70">{email}</span>
        )}
      </span>
    </div>
  );
}
