import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useKeyFigures } from '@/hooks/useKeyFigures';
import { PdfThumbnail } from '@/components/shared/PdfThumbnail';
import {
  HISTORY_ALUMNI_FALLBACK,
  HISTORY_EVENTS,
  HistoryEvent,
  HistoryMedia,
  isQuietYear,
} from '@/data/historyTimeline';
import { listHistoryEvents, type HistoryEventRow } from '@/lib/history-api';

// =====================================================================
// HistoryTimeline — "Our History" on /about.
// ---------------------------------------------------------------------
// A decade of the Society on a horizontal rail: the line fills behind
// the years, each circle lights as its column arrives, and every card
// rises into place with its media a beat behind.
//
// THE SECTION NO LONGER TAKES THE PAGE'S SCROLLING. It used to reserve
// several viewports of height, stick itself to the top of the window and
// convert vertical scrolling into horizontal travel, which meant a
// reader could not get past Our History without playing all of it
// through. The years now live in an ordinary horizontally scrollable
// element: the page scrolls down as a page should, and the timeline is
// there to be pushed sideways by anyone who wants to. Exploring it is
// optional, and a single quiet nudge when it first appears is what says
// so - see the invitation effect below.
//
// Card reveals are read from getBoundingClientRect rather than an
// IntersectionObserver, because a card can move either by the page
// scrolling or by the rail scrolling and both have to count.
//
// Under 560px tall, or with reduced motion, the same entries are laid
// out as a vertical spine instead.
// =====================================================================

/**
 * Below this viewport height the section falls back to the vertical list.
 *
 * A card needs room for a title, a paragraph and an image; on a short
 * window the horizontal rail would show them cropped, and a stacked list
 * reads better than a squeezed row. (The constant kept its name from the
 * pinned era; the threshold it sets is unchanged.)
 */
const PINNED_MIN_HEIGHT = 560;
/** Body copy taller than three lines earns a "Read more" control. */
const COLLAPSED_COPY_PX = 84;

/**
 * 'rail' is the horizontal timeline; 'vertical' is the stacked list used
 * under reduced motion and on viewports too short to read a card in.
 *
 * IT USED TO BE CALLED 'pinned', AND IT USED TO PIN. The section reserved
 * several viewports of height, stuck itself to the top of the screen and
 * converted the page's vertical scrolling into horizontal travel, so a
 * reader could not pass Our History without playing the whole of it
 * through. The name is changed with the behaviour so that nothing here
 * still claims to pin.
 */
type Mode = 'rail' | 'vertical';

function reducedMotion(): boolean {
  return typeof window !== 'undefined' && typeof window.matchMedia === 'function'
    ? window.matchMedia('(prefers-reduced-motion: reduce)').matches
    : false;
}

// --- The timeline itself ----------------------------------------------
// The years come from the workspace (Website > History). The seeded module
// is the fallback, so the section still reads correctly on a cold cache or
// if the register cannot be reached: it is never blank.

function rowToEvent(row: HistoryEventRow): HistoryEvent {
  if (!row.is_active) return { year: row.year, minor: true };

  let media: HistoryMedia;
  if (row.media_kind === 'number') {
    media = { kind: 'counter', label: row.number_label ?? 'Alumni Network', value: row.number_value ?? 0 };
  } else if (row.media_kind === 'report') {
    media = { kind: 'pdf', note: row.title, fileId: row.report_file_id ?? undefined };
  } else if (row.media_kind === 'image') {
    media = { kind: 'photo', src: row.image_url, alt: row.image_alt ?? row.title, note: row.image_alt ?? row.title };
  } else {
    media = { kind: 'photo', src: null, alt: row.title, note: row.title };
  }

  return {
    year: row.year,
    title: row.title,
    href: row.href ?? '/about',
    description: row.description,
    media,
  };
}

function useTimelineEvents(): HistoryEvent[] {
  const [events, setEvents] = useState<HistoryEvent[] | null>(null);

  useEffect(() => {
    let active = true;
    listHistoryEvents()
      .then((rows) => {
        if (!active || rows.length === 0) return;
        setEvents(rows.map(rowToEvent));
      })
      .catch((error) => {
        // The seeded module carries the story: a failed read changes nothing.
        console.error('Error loading the history timeline:', error);
      });
    return () => { active = false; };
  }, []);

  return events ?? HISTORY_EVENTS;
}

// --- Report covers -----------------------------------------------------
// Each cover is described by what it IS, not by an id, and resolved from
// the published archive when the section mounts.

function useArchiveCovers(events: HistoryEvent[]) {
  const [covers, setCovers] = useState<Record<number, string>>({});

  const lookups = useMemo(
    () => events
      .filter((e): e is Extract<HistoryEvent, { media: HistoryMedia }> => !isQuietYear(e))
      .filter((e) => e.media.kind === 'pdf' && ((e.media as { lookup?: unknown }).lookup || (e.media as { fileId?: string }).fileId))
      .map((e) => ({
        year: e.year,
        lookup: (e.media as { lookup?: NonNullable<Extract<HistoryMedia, { kind: 'pdf' }>['lookup']> }).lookup,
        fileId: (e.media as { fileId?: string }).fileId,
      })),
    [events],
  );

  useEffect(() => {
    let active = true;
    (async () => {
      const found: Record<number, string> = {};
      await Promise.all(lookups.map(async ({ year, lookup, fileId }) => {
        try {
          // A cover chosen by hand in the workspace wins over a description.
          if (fileId) {
            const { data } = await supabase
              .from('archive_files').select('file_url').eq('id', fileId)
              // /about is a public page: a cover chosen by hand still has to
              // be a report the public may see.
              .eq('status', 'published').is('deleted_at', null)
              .maybeSingle();
            if (data?.file_url) { found[year] = data.file_url; return; }
          }
          if (!lookup) return;
          let query = supabase
            .from('archive_files')
            .select('id, title, file_url, date')
            // Public surface: published reports only, and never a deleted one.
            .eq('status', 'published')
            .is('deleted_at', null)
            .not('file_url', 'is', null);
          if (lookup.fund) query = query.eq('fund', lookup.fund);
          if (lookup.division) query = query.eq('division', lookup.division);
          if (lookup.titleContains) query = query.ilike('title', `%${lookup.titleContains}%`);
          if (lookup.year) {
            query = query.gte('date', `${lookup.year}-01-01`).lte('date', `${lookup.year}-12-31`);
          }
          const { data, error } = await query
            .order('date', { ascending: !!lookup.oldestFirst })
            .limit(1);
          if (error) throw error;
          const url = data?.[0]?.file_url;
          if (url) found[year] = url;
        } catch (error) {
          // A missing cover is not a failure: the grey frame keeps its caption.
          console.error('Error resolving history cover:', error);
        }
      }));
      if (active) setCovers(found);
    })();
    return () => { active = false; };
  }, [lookups]);

  return covers;
}

// --- Counter -----------------------------------------------------------

function CountUp({ target, run }: { target: number; run: boolean }) {
  const [value, setValue] = useState(0);
  const started = useRef(false);
  const hostRef = useRef<HTMLSpanElement>(null);
  // The figure must not start climbing before the section is actually on
  // screen, so the card's own reveal is paired with a visibility check.
  const [onScreen, setOnScreen] = useState(false);

  useEffect(() => {
    const el = hostRef.current;
    if (!el) return;
    if (typeof IntersectionObserver === 'undefined') { setOnScreen(true); return; }
    const io = new IntersectionObserver((entries) => {
      if (entries.some((e) => e.isIntersecting)) { setOnScreen(true); io.disconnect(); }
    }, { threshold: 0.2 });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  useEffect(() => {
    if (!run || !onScreen || started.current || target <= 0) return;
    started.current = true;
    if (reducedMotion()) { setValue(target); return; }
    const t0 = performance.now();
    const duration = 1600;
    let frame = 0;
    const step = (now: number) => {
      const k = Math.min(1, (now - t0) / duration);
      setValue(Math.round(target * (1 - Math.pow(1 - k, 3))));
      if (k < 1) frame = requestAnimationFrame(step);
    };
    frame = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frame);
  }, [run, onScreen, target]);

  return <span ref={hostRef}>{value}</span>;
}

// --- Media -------------------------------------------------------------

function Media({ media, coverUrl, revealed, alumniTotal }: {
  media: HistoryMedia;
  coverUrl?: string;
  revealed: boolean;
  alumniTotal: number;
}) {
  if (media.kind === 'counter') {
    return (
      <div className="tl-media tl-media--counter">
        <span className="tl-count">
          <CountUp target={media.value} run={revealed} />
          <span>+</span>
        </span>
        <span className="tl-count-label">{media.label}</span>
      </div>
    );
  }

  if (media.kind === 'pdf') {
    const url = media.url || coverUrl;
    return (
      <div className="tl-media tl-media--pdf">
        {url
          ? <PdfThumbnail url={url} alt={media.note || 'Report cover'} renderWidth={360} />
          : <span className="tl-note">{media.note}</span>}
      </div>
    );
  }

  // The frame is painted with a background-image rather than an <img>, and
  // only after the file has decoded: a photograph that has not been added
  // yet leaves the caption in place instead of a blank frame.
  return <PhotoFrame media={media} />;
}

function PhotoFrame({ media }: { media: Extract<HistoryMedia, { kind: 'photo' }> }) {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!media.src) return;
    let active = true;
    const img = new Image();
    img.onload = () => { if (active) setReady(true); };
    img.src = media.src;
    return () => { active = false; };
  }, [media.src]);

  return (
    <div
      className="tl-media tl-media--photo"
      role="img"
      aria-label={media.alt}
      style={ready && media.src
        ? { backgroundImage: `url(${media.src})`, backgroundSize: 'cover', backgroundPosition: 'center' }
        : undefined}
    >
      {!ready && <span className="tl-note">{media.note}</span>}
    </div>
  );
}

// --- Card --------------------------------------------------------------

interface CardProps {
  event: Extract<HistoryEvent, { title: string }>;
  index: number;
  vertical: boolean;
  revealed: boolean;
  coverUrl?: string;
  alumniTotal: number;
  titleMinHeight: number | null;
  registerTitle: (index: number, el: HTMLHeadingElement | null) => void;
}

function MilestoneCard({
  event, index, vertical, revealed, coverUrl, alumniTotal, titleMinHeight, registerTitle,
}: CardProps) {
  const [open, setOpen] = useState(false);
  const [overflowing, setOverflowing] = useState(false);
  const copyRef = useRef<HTMLParagraphElement>(null);
  const descId = `tl-desc-${vertical ? 'v' : 'h'}-${event.year}`;

  const text = event.description.split('[n]').join(String(alumniTotal));

  useLayoutEffect(() => {
    const measure = () => {
      const el = copyRef.current;
      if (el) setOverflowing(el.offsetHeight > COLLAPSED_COPY_PX);
    };
    measure();
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, [text]);

  return (
    <div
      className={`${vertical ? 'tl-vcard' : 'tl-card'}${revealed ? ' is-in' : ''}`}
      data-card={index}
    >
      <h3
        className="tl-title"
        ref={(el) => registerTitle(index, el)}
        style={titleMinHeight != null ? { minHeight: titleMinHeight } : undefined}
      >
        {event.title}
      </h3>
      <div className={`tl-desc${open ? ' is-open' : ''}`} id={descId}>
        <p ref={copyRef}>{text}</p>
      </div>
      {overflowing && (
        <button
          type="button"
          className="tl-toggle"
          aria-expanded={open}
          aria-controls={descId}
          onClick={() => setOpen((v) => !v)}
        >
          {open ? 'Read less' : 'Read more'}
        </button>
      )}
      <Media media={event.media} coverUrl={coverUrl} revealed={revealed} alumniTotal={alumniTotal} />
    </div>
  );
}

// =====================================================================

export function HistoryTimeline() {
  const events = useTimelineEvents();
  const covers = useArchiveCovers(events);
  const { counts } = useKeyFigures();
  const alumniTotal = counts.alumni > 0 ? counts.alumni : HISTORY_ALUMNI_FALLBACK;

  const [mode, setMode] = useState<Mode>(() => {
    if (typeof window === 'undefined') return 'rail';
    return reducedMotion() || window.innerHeight < PINNED_MIN_HEIGHT ? 'vertical' : 'rail';
  });
  const [revealed, setRevealed] = useState<Set<number>>(new Set());
  const [lit, setLit] = useState<Set<number>>(new Set());
  const [titleMinHeight, setTitleMinHeight] = useState<number | null>(null);

  const wrapRef = useRef<HTMLDivElement>(null);
  /** The horizontal scroll container. The reader drives this directly. */
  const scrollerRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const railRef = useRef<HTMLDivElement>(null);
  const fillRef = useRef<HTMLDivElement>(null);
  const contRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLOListElement>(null);
  const vlistRef = useRef<HTMLOListElement>(null);
  const titleRefs = useRef<Map<number, HTMLHeadingElement>>(new Map());

  const geometry = useRef({ thresholds: [] as number[], range: 0, scrollable: false });
  const progressRef = useRef(0);

  const registerTitle = useCallback((index: number, el: HTMLHeadingElement | null) => {
    if (el) titleRefs.current.set(index, el);
    else titleRefs.current.delete(index);
  }, []);

  const reveal = useCallback((index: number) => {
    setRevealed((prev) => (prev.has(index) ? prev : new Set(prev).add(index)));
  }, []);

  // --- Mode ------------------------------------------------------------

  useEffect(() => {
    const decide = () => {
      const next: Mode =
        reducedMotion() || window.innerHeight < PINNED_MIN_HEIGHT ? 'vertical' : 'rail';
      setMode((prev) => (prev === next ? prev : next));
    };
    decide();
    window.addEventListener('resize', decide);
    return () => window.removeEventListener('resize', decide);
  }, []);

  // --- Equal title heights ---------------------------------------------
  // Every description, and the media block under it, must start at the
  // same height across the row. Measuring beats guessing a line count.

  const equaliseTitles = useCallback(() => {
    const nodes = [...titleRefs.current.values()];
    if (!nodes.length) return;
    setTitleMinHeight(null);
    requestAnimationFrame(() => {
      let max = 0;
      nodes.forEach((n) => { max = Math.max(max, n.offsetHeight); });
      setTitleMinHeight(max || null);
    });
  }, []);

  useEffect(() => {
    equaliseTitles();
    const onResize = () => equaliseTitles();
    window.addEventListener('resize', onResize);
    if (typeof document !== 'undefined' && document.fonts?.ready) {
      document.fonts.ready.then(equaliseTitles).catch(() => undefined);
    }
    return () => window.removeEventListener('resize', onResize);
  }, [equaliseTitles, mode, alumniTotal]);

  // --- Pinned controller -------------------------------------------------

  const measure = useCallback(() => {
    const list = listRef.current;
    const track = trackRef.current;
    const scroller = scrollerRef.current;
    const rail = railRef.current;
    const cont = contRef.current;
    if (!list || !track || !scroller || !rail || !cont) return;

    const items = [...list.querySelectorAll<HTMLLIElement>('li[data-ev]')];
    if (!items.length) return;
    const centres = items.map((li) => li.offsetLeft + li.offsetWidth / 2);
    const first = centres[0];
    const last = centres[centres.length - 1];
    const len = last - first;

    rail.style.left = `${first}px`;
    rail.style.width = `${Math.max(0, len)}px`;
    const lastDot = list.querySelector<HTMLElement>('li[data-ev]:last-of-type [data-dot]');
    // Flush against the last circle: any gap here reads as a rendering
    // fault rather than as the rail carrying on.
    cont.style.left = `${last + (lastDot ? lastDot.offsetWidth / 2 : 44)}px`;

    // Travel stops at the RIGHT EDGE OF THE LAST CARD plus the gutter, not
    // at the end of the track. The track carries a tail and a continuation
    // line past that point, and scrolling through them left the reader
    // pushing against dead space after the story had finished.
    const lastItem = items[items.length - 1];
    const gutter = parseFloat(getComputedStyle(track).paddingLeft) || 0;
    const contentEnd = lastItem.offsetLeft + lastItem.offsetWidth + gutter;
    // THE RANGE IS THE SCROLLER'S OWN, because the reader now moves the
    // scroller rather than the page: how far it can travel is simply how
    // much wider its content is than itself.
    const range = Math.max(0, Math.min(track.scrollWidth, contentEnd) - scroller.clientWidth);

    // A year lights when ITS COLUMN ARRIVES, which has to be measured in
    // the same units as the translate. The thresholds used to be the dot
    // centres normalised between the first and the last, a different scale
    // entirely, so every year lit long after its card was being read.
    //
    // At progress p the track is translated by -p * range, so a column
    // whose left edge is at `l` sits on screen at `l - p * range`. Solving
    // for the moment that edge reaches the gutter gives the threshold
    // below: the dot lights exactly as its own card takes the screen.
    geometry.current.thresholds = items.map((li) => {
      if (range <= 0) return 0;
      const trigger = (li.offsetLeft - gutter) / range;
      return Math.max(0, Math.min(1, trigger));
    });
    geometry.current.range = range;
    geometry.current.scrollable = range > 8;
    // NOTHING IS WRITTEN TO THE LAYOUT HERE ANY MORE. This function used to
    // reserve several viewports of page height on the wrapper and switch the
    // inner block between `sticky` and `static`; the section is now an
    // ordinary block containing an ordinary horizontal scroller, and its
    // height is simply the height of its content.
  }, []);

  const paint = useCallback(() => {
    const track = trackRef.current;
    const fill = fillRef.current;
    const list = listRef.current;
    const scroller = scrollerRef.current;
    const { thresholds, scrollable, range } = geometry.current;
    if (!track || !fill || !list || !scroller || !thresholds.length) return;

    // Progress is READ from the scroller instead of being imposed on the
    // page. The track carries no transform at all now: the browser moves it,
    // natively, which is why a swipe, a trackpad gesture, shift-wheel, a
    // dragged scrollbar and a keyboard arrow all work without a line of code
    // for any of them.
    const p = scrollable && range > 0 ? Math.max(0, Math.min(1, scroller.scrollLeft / range)) : 1;
    progressRef.current = p;
    fill.style.width = `${p * 100}%`;

    setLit((prev) => {
      let changed = false;
      const next = new Set(prev);
      thresholds.forEach((threshold, i) => {
        if (p >= threshold - 0.0005 && !next.has(i)) { next.add(i); changed = true; }
        else if (p < threshold - 0.0005 && next.has(i)) { next.delete(i); changed = true; }
      });
      return changed ? next : prev;
    });

    list.querySelectorAll<HTMLElement>('[data-card]').forEach((card) => {
      const index = Number(card.getAttribute('data-card'));
      const r = card.getBoundingClientRect();
      if (r.left < window.innerWidth * 0.92 && r.right > 0) reveal(index);
    });
  }, [reveal]);

  useEffect(() => {
    if (mode !== 'rail') return;
    const scroller = scrollerRef.current;
    if (!scroller) return;
    measure();
    paint();
    let scrollFrame = 0;
    let resizeFrame = 0;
    // THE SCROLLER'S OWN EVENT, not the window's. The section no longer has
    // any interest in where the page is: it only needs to know how far the
    // reader has moved the timeline.
    const onScroll = () => {
      if (scrollFrame) return;
      scrollFrame = requestAnimationFrame(() => { scrollFrame = 0; paint(); });
    };
    const onResize = () => {
      if (resizeFrame) return;
      resizeFrame = requestAnimationFrame(() => { resizeFrame = 0; measure(); paint(); });
    };
    scroller.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onResize);
    // Cards are revealed as they come into view, which depends on the page's
    // position as well as the rail's, so the window is still watched for
    // that one purpose - passively, and reading nothing it does not need.
    window.addEventListener('scroll', onScroll, { passive: true });
    if (typeof document !== 'undefined' && document.fonts?.ready) {
      document.fonts.ready.then(() => { measure(); paint(); }).catch(() => undefined);
    }
    return () => {
      scroller.removeEventListener('scroll', onScroll);
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onResize);
      if (scrollFrame) cancelAnimationFrame(scrollFrame);
      if (resizeFrame) cancelAnimationFrame(resizeFrame);
    };
  }, [mode, measure, paint, titleMinHeight, covers, alumniTotal]);

  // =====================================================================
  // THE INVITATION: THE RAIL SETS OFF BY ITSELF, AND STOPS WHERE IT IS.
  // ---------------------------------------------------------------------
  // The forced journey did at least make the horizontal dimension
  // impossible to miss. Without it, a reader arriving at a row of cards
  // that happens to continue past the right edge may never think to push
  // it - and the grey scrollbar that used to hint at it has been removed,
  // because on this page it read as a second, thicker rule under the one
  // rule the section is built on.
  //
  // WHAT REPLACES IT IS MOVEMENT. The first time the section is seen the
  // rail sets off forward on its own, slowly, and carries on for a few
  // seconds. Motion is the one signal nobody misses, and unlike a bar it
  // shows what the gesture DOES rather than that one is possible.
  //
  // IT DOES NOT COME BACK. It used to travel 72px out and return to zero,
  // which is a flinch: it says something can move, then undoes it, and a
  // reader who reached for the rail mid-flight had it snatched back to the
  // start under their hand. The drift now simply stops wherever it has
  // reached, and the reader continues from exactly there - which is what
  // makes an interruption feel like taking the wheel rather than losing a
  // page's place.
  //
  // IT YIELDS INSTANTLY. A pointer, a wheel, a touch or a key on the
  // scroller ends it on the spot, as does clicking a year. It never fights
  // a real gesture, it runs once per visit, and under reduced motion it
  // does not run at all.
  // =====================================================================

  /** Cruising speed of the drift, in pixels per second. Slow and readable. */
  const DRIFT_SPEED = 55;
  /** How long the whole drift lasts, easing included. */
  const DRIFT_MS = 7000;
  /** How long it spends easing in, and again easing out. */
  const DRIFT_EASE_MS = 900;
  /** And never past this share of the rail: it is an invitation, not a tour. */
  const DRIFT_MAX_FRACTION = 0.4;

  const nudged = useRef(false);
  /** Cancels the invitation if it is still running. Set by the effect below. */
  const stopNudge = useRef<(() => void) | null>(null);
  useEffect(() => {
    if (mode !== 'rail' || nudged.current) return;
    const scroller = scrollerRef.current;
    if (!scroller || reducedMotion()) return;

    let raf = 0;
    let cancelled = false;
    const stop = () => { cancelled = true; if (raf) cancelAnimationFrame(raf); };
    // Anything that moves the rail deliberately - a click on a year, a
    // gesture - can stop the invitation mid-flight. Without this the
    // animation would keep writing scrollLeft over the top of a jump the
    // reader had just asked for.
    stopNudge.current = stop;

    const run = () => {
      if (nudged.current || !geometry.current.scrollable) return;
      nudged.current = true;
      // At cruising speed the drift would cover this much; it is capped so
      // that on a short timeline the invitation cannot become the tour.
      const cruiseMs = DRIFT_MS - DRIFT_EASE_MS;
      const distance = Math.min(
        geometry.current.range * DRIFT_MAX_FRACTION,
        (DRIFT_SPEED * cruiseMs) / 1000,
      );
      if (distance < 24) return;

      const start = performance.now();
      const from = scroller.scrollLeft;

      // ---------------------------------------------------------------
      // A TRAPEZOID OF SPEED, INTEGRATED.
      //
      // Speed rises on a half-cosine over the first DRIFT_EASE_MS, holds,
      // and falls the same way at the end - so the rail neither jerks into
      // motion nor stops dead. What is written to `scrollLeft` is the
      // DISTANCE covered by that speed, which is its integral; writing the
      // speed curve itself would ease the wrong quantity and the drift
      // would visibly lurch where the phases meet.
      //
      // `ramp(x)` is the area under the rising half-cosine from 0 to x,
      // and by symmetry the area still to cover in the last x milliseconds.
      // Both phases are expressed with it, which is why they agree exactly
      // at the joins rather than to within a rounding error.
      // ---------------------------------------------------------------
      const E = DRIFT_EASE_MS;
      const ramp = (x: number) => 0.5 * x - (E / (2 * Math.PI)) * Math.sin((Math.PI * x) / E);
      // Fraction of the distance covered per millisecond while cruising.
      // The two half-ramps together are worth exactly one full E of cruise,
      // so the whole run is cruiseMs long in cruising terms.
      const perMs = 1 / cruiseMs;
      const easeFraction = (t: number) => {
        if (t <= E) return perMs * ramp(t);
        if (t >= DRIFT_MS - E) return 1 - perMs * ramp(DRIFT_MS - t);
        return perMs * (E / 2 + (t - E));
      };

      const step = (now: number) => {
        if (cancelled) return;
        const t = now - start;
        if (t >= DRIFT_MS) return;               // stops exactly where it is
        const next = from + distance * easeFraction(t);
        // Reaching the end of the rail is an ending too: there is nothing
        // further to invite the reader towards.
        if (next >= geometry.current.range) { scroller.scrollLeft = geometry.current.range; return; }
        scroller.scrollLeft = next;
        raf = requestAnimationFrame(step);
      };
      raf = requestAnimationFrame(step);
    };

    // Only once the section is actually on screen, and only after the
    // measurements it depends on have been taken.
    const io = new IntersectionObserver((entries) => {
      if (entries.some((e) => e.isIntersecting)) {
        io.disconnect();
        window.setTimeout(run, 420);
      }
    }, { threshold: 0.35 });
    io.observe(scroller);

    // Any real interaction wins immediately, and the rail keeps whatever
    // position the drift had reached: `stop` cancels the frame loop and
    // writes nothing, so the browser carries on from there.
    const claim = () => { nudged.current = true; stop(); };
    scroller.addEventListener('pointerdown', claim, { passive: true });
    scroller.addEventListener('wheel', claim, { passive: true });
    scroller.addEventListener('touchstart', claim, { passive: true });
    scroller.addEventListener('keydown', claim);

    return () => {
      io.disconnect();
      stop();
      stopNudge.current = null;
      scroller.removeEventListener('pointerdown', claim);
      scroller.removeEventListener('wheel', claim);
      scroller.removeEventListener('touchstart', claim);
      scroller.removeEventListener('keydown', claim);
    };
  }, [mode, covers, alumniTotal]);

  // --- Vertical controller -----------------------------------------------

  useEffect(() => {
    if (mode !== 'vertical') return;
    const list = vlistRef.current;
    if (!list) return;
    const items = [...list.querySelectorAll<HTMLLIElement>('li[data-ev]')];

    const light = (li: HTMLLIElement) => {
      const index = Number(li.getAttribute('data-ev'));
      setLit((prev) => (prev.has(index) ? prev : new Set(prev).add(index)));
      const fill = li.querySelector<HTMLElement>('.tl-vfill');
      if (fill) fill.style.height = 'calc(100% + 2.5rem)';
      reveal(index);
    };

    if (reducedMotion()) { items.forEach(light); return; }

    const io = new IntersectionObserver((entries) => {
      let k = 0;
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        io.unobserve(entry.target);
        const el = entry.target as HTMLLIElement;
        window.setTimeout(() => light(el), 150 + (k++) * 400);
      });
    }, { threshold: 0, rootMargin: '0px 0px -18% 0px' });
    items.forEach((li) => io.observe(li));
    return () => io.disconnect();
  }, [mode, reveal]);

  // --- Dot navigation ----------------------------------------------------

  const goTo = useCallback((index: number) => {
    const smooth = reducedMotion() ? 'auto' : 'smooth';
    if (mode === 'vertical') {
      const li = vlistRef.current?.querySelectorAll('li')[index];
      if (li) window.scrollTo({ top: li.getBoundingClientRect().top + window.scrollY - 120, behavior: smooth });
      return;
    }
    // Clicking a year moves THE RAIL, not the page. It used to scroll the
    // window to the point in the reserved height that corresponded to that
    // year, which is meaningless now that the section reserves none.
    const scroller = scrollerRef.current;
    const { scrollable, thresholds, range } = geometry.current;
    if (!scroller || !scrollable || !thresholds.length) return;
    nudged.current = true;
    stopNudge.current?.();
    scroller.scrollTo({ left: thresholds[index] * range, behavior: smooth });
  }, [mode]);

  // --- Render ------------------------------------------------------------

  const dotLabel = (event: HistoryEvent) =>
    isQuietYear(event) ? String(event.year) : `Go to ${event.year}: ${event.title}`;

  const heading = 'Our History';

  if (mode === 'vertical') {
    return (
      <section id="our-history" className="tl tl-section" aria-label={heading}>
        <h2 className="tl-h2 tl-h2--flow">{heading}</h2>
        <ol className="tl-vlist" ref={vlistRef}>
          {events.map((event, i) => {
            const quiet = isQuietYear(event);
            return (
              // KEYED BY YEAR AND POSITION, NOT BY YEAR. The history holds two
              // 2019 entries - the quiet year and the milestone - so a bare year
              // key was a DUPLICATE key: React warns that children may be
              // "duplicated and/or omitted", and the two entries share one
              // reconciliation identity, so the reveal state of one can be
              // applied to the other. The pair is unique.
              <li key={`${event.year}-${i}`} className="tl-vitem" data-ev={i} data-minor={quiet ? 1 : 0}>
                <div className="tl-vrailcell">
                  <button
                    type="button"
                    className={`tl-dot tl-vdot${quiet ? ' tl-dot--minor' : ''}${lit.has(i) ? ' is-lit' : ''}`}
                    data-dot={i}
                    aria-label={dotLabel(event)}
                    onClick={() => goTo(i)}
                  >
                    {event.year}
                  </button>
                  <div className="tl-vrail" aria-hidden="true"><div className="tl-vfill" /></div>
                </div>
                {quiet ? <div /> : (
                  <MilestoneCard
                    event={event}
                    index={i}
                    vertical
                    revealed={revealed.has(i)}
                    coverUrl={covers[event.year]}
                    alumniTotal={alumniTotal}
                    titleMinHeight={null}
                    registerTitle={registerTitle}
                  />
                )}
              </li>
            );
          })}
        </ol>
      </section>
    );
  }

  return (
    <section id="our-history" className="tl tl-section tl-section--rail" aria-label={heading}>
      <div className="tl-wrap" ref={wrapRef}>
        <div className="tl-band">
          {/* The heading stays OUTSIDE the scroller, so it keeps the page's
              gutter and does not travel sideways with the years. */}
          <h2 className="tl-h2 tl-h2--rail">{heading}</h2>
          {/* The scroll container. Everything horizontal belongs to this
              element and nothing above it: the page itself never gains a
              sideways scrollbar, and `overscroll-behavior-x: contain` stops
              a swipe at either end turning into the browser's back gesture. */}
          <div
            className="tl-scroller"
            ref={scrollerRef}
            tabIndex={0}
            role="group"
            aria-label="Timeline, scroll sideways to move through the years"
          >
          <div className="tl-track" ref={trackRef}>
            <div className="tl-rail" ref={railRef} aria-hidden="true">
              <div className="tl-fill" ref={fillRef} />
            </div>
            {/* Beyond the last year the rail simply keeps going and fades
                out, which reads as a story still being written. It starts
                flush against the final circle, so there is no gap to
                mistake for a rendering fault. */}
            <div className="tl-cont" ref={contRef} aria-hidden="true">
              <span className="tl-cont-line" />
            </div>
            <ol className="tl-list" ref={listRef}>
              {events.map((event, i) => {
                const quiet = isQuietYear(event);
                return (
                  // Year and position, for the reason given on the vertical
                  // list above: two entries share the year 2019.
                  <li key={`${event.year}-${i}`} className="tl-item" data-ev={i} data-minor={quiet ? 1 : 0}>
                    <div className="tl-dotcell">
                      <button
                        type="button"
                        className={`tl-dot${quiet ? ' tl-dot--minor' : ''}${lit.has(i) ? ' is-lit' : ''}`}
                        data-dot={i}
                        aria-label={dotLabel(event)}
                        onClick={() => goTo(i)}
                      >
                        {event.year}
                      </button>
                    </div>
                    {!quiet && (
                      <MilestoneCard
                        event={event}
                        index={i}
                        vertical={false}
                        revealed={revealed.has(i)}
                        coverUrl={covers[event.year]}
                        alumniTotal={alumniTotal}
                        titleMinHeight={titleMinHeight}
                        registerTitle={registerTitle}
                      />
                    )}
                  </li>
                );
              })}
              <li className="tl-tail" aria-hidden="true" />
            </ol>
          </div>
          </div>
        </div>
      </div>
    </section>
  );
}

export default HistoryTimeline;
