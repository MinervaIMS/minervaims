import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react';

// =====================================================================
// WHO IS SIGNED IN, AT THE TOP OF THE WORKSPACE (Step 108).
// ---------------------------------------------------------------------
// The reader's picture (or their initials) in a circle, then their name
// as the register holds it and their role on ONE line, "Name Surname ·
// Role", large and centred in the strip (Step 110; Step 108 put the role
// on a second, smaller line). Nothing is cut: when the line is wider
// than the room it has, it slides through and fades in and out at its
// edges, as one seamless loop that pauses under the pointer. Under
// reduced motion it does not move at all: it wraps instead.
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

export function MarqueeName({ text, className = '', children }: {
  /** The words, as read by assistive technology and measured. */
  text: string;
  className?: string;
  /** How the words are drawn, when they are more than plain text; both copies of the loop draw it. */
  children?: ReactNode;
}) {
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
        <span ref={firstRef} className={reduced ? 'break-words' : 'whitespace-nowrap'}>{children ?? text}</span>
        {moving && (
          <span aria-hidden="true" className="whitespace-nowrap" style={{ paddingLeft: MARQUEE_GAP }}>{children ?? text}</span>
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

  if (desktop) {
    // One line, centred in the strip: the name in the accent, a middle
    // dot, the role in italics. The line is one piece of text for a
    // screen reader ("Name Surname, Role").
    return (
      <div className="flex min-w-0 items-center gap-4" title={email || undefined}>
        <span className="h-14 w-14 shrink-0 overflow-hidden rounded-full border border-separator bg-accent" aria-hidden="true">
          {showPhoto
            ? <img src={photoUrl!} alt="" className="h-full w-full object-cover" onError={() => setBroken(true)} />
            : <span className="flex h-full w-full items-center justify-center font-serif text-2xl text-accent-foreground">{initials}</span>}
        </span>
        <span className="flex min-w-0 flex-1 items-center" style={{ fontFamily: '"Times New Roman", Times, serif' }}>
          <MarqueeName text={`${shownName}, ${roleLabel}`} className="text-[28px] leading-[1.15]" >
            <span aria-hidden="true">
              <span className="text-accent">{shownName}</span>
              <span className="px-2.5 text-foreground/40">·</span>
              <span className="italic text-foreground/85">{roleLabel}</span>
            </span>
            <span className="sr-only">{shownName}, {roleLabel}</span>
          </MarqueeName>
        </span>
      </div>
    );
  }

  return (
    <div className="flex min-w-0 items-center gap-3">
      <span className="h-11 w-11 shrink-0 overflow-hidden rounded-full border border-accent-foreground/25 bg-accent-foreground/10" aria-hidden="true">
        {showPhoto
          ? <img src={photoUrl!} alt="" className="h-full w-full object-cover" onError={() => setBroken(true)} />
          : <span className="flex h-full w-full items-center justify-center font-serif text-lg text-accent-foreground">{initials}</span>}
      </span>
      {/* The name and the role, centred on the picture (Step 112): the
          email address is not shown here, as nobody needs to read their own. */}
      <span className="flex min-w-0 flex-1 flex-col justify-center leading-tight" data-drawer-identity>
        <MarqueeName text={shownName} className="font-serif text-lg text-accent-foreground" />
        <span className="mt-0.5 truncate font-serif text-base italic text-accent-foreground/85">{roleLabel}</span>
      </span>
    </div>
  );
}
