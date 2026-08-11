import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useKeyFigures } from '@/hooks/useKeyFigures';
import { PdfThumbnail } from '@/components/shared/PdfThumbnail';
import {
  HISTORY_ALUMNI_FALLBACK,
  HISTORY_EVENTS,
  HISTORY_SCROLL_PACE,
  HistoryEvent,
  HistoryMedia,
  isQuietYear,
} from '@/data/historyTimeline';
import { listHistoryEvents, type HistoryEventRow } from '@/lib/history-api';
import { bindPinnedScroll } from '@/lib/pinned-scroll';

// =====================================================================
// HistoryTimeline — "Our History" on /about.
// ---------------------------------------------------------------------
// The section pins to the screen and the years travel sideways as the
// page is scrolled: the rail fills behind them, each circle lights the
// moment it is reached, and every card rises into place with its media
// trailing a beat behind. It is the same reading gesture as the Join
// page's Application Journey, turned into a decade of the Society.
//
// Card reveals are read from getBoundingClientRect rather than an
// IntersectionObserver: the track moves by transform, so the observer
// would report every card as visible from the start.
//
// Below 768px wide, under 680px tall, or with reduced motion, the same
// eight entries are laid out as a vertical spine. The height rule is not
// cosmetic: a pinned card needs roughly 371px of content inside
// calc(100dvh - 19rem), so a shorter viewport would clip the media frame.
// =====================================================================

/**
 * A pinned card needs roughly this much room for its title, copy, toggle
 * and media frame. Below it the media would be clipped, so the vertical
 * spine takes over. Width is deliberately NOT a condition: the sideways
 * run is the point of the section and a phone gets it too, with narrower
 * columns and a smaller dot (see the .tl-* mobile block in index.css).
 */
const PINNED_MIN_HEIGHT = 560;
/** Body copy taller than three lines earns a "Read more" control. */
const COLLAPSED_COPY_PX = 84;

type Mode = 'pinned' | 'vertical';

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
              .from('archive_files').select('file_url').eq('id', fileId).maybeSingle();
            if (data?.file_url) { found[year] = data.file_url; return; }
          }
          if (!lookup) return;
          let query = supabase
            .from('archive_files')
            .select('id, title, file_url, date')
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
    if (typeof window === 'undefined') return 'pinned';
    return reducedMotion() || window.innerHeight < PINNED_MIN_HEIGHT ? 'vertical' : 'pinned';
  });
  const [revealed, setRevealed] = useState<Set<number>>(new Set());
  const [lit, setLit] = useState<Set<number>>(new Set());
  const [titleMinHeight, setTitleMinHeight] = useState<number | null>(null);

  const wrapRef = useRef<HTMLDivElement>(null);
  const stickyRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const railRef = useRef<HTMLDivElement>(null);
  const fillRef = useRef<HTMLDivElement>(null);
  const contRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLOListElement>(null);
  const vlistRef = useRef<HTMLOListElement>(null);
  const titleRefs = useRef<Map<number, HTMLHeadingElement>>(new Map());

  const geometry = useRef({ thresholds: [] as number[], range: 0, budget: 1, wrapTop: 0, pinned: false });
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
        reducedMotion() || window.innerHeight < PINNED_MIN_HEIGHT ? 'vertical' : 'pinned';
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
    const sticky = stickyRef.current;
    const wrap = wrapRef.current;
    const rail = railRef.current;
    const cont = contRef.current;
    if (!list || !track || !sticky || !wrap || !rail || !cont) return;

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
    const range = Math.max(0, Math.min(track.scrollWidth, contentEnd) - sticky.clientWidth);

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
    geometry.current.pinned = range > 8;
    if (geometry.current.pinned) {
      geometry.current.budget = Math.max(1, range * HISTORY_SCROLL_PACE);
      wrap.style.height = `${sticky.offsetHeight + geometry.current.budget}px`;
      sticky.style.position = 'sticky';
      sticky.style.height = '';
      sticky.style.padding = '';
    } else {
      // Everything already fits: show it in place rather than pinning.
      geometry.current.budget = 1;
      wrap.style.height = 'auto';
      sticky.style.position = 'static';
      sticky.style.height = 'auto';
      sticky.style.padding = '9rem 0 3rem';
    }
    geometry.current.wrapTop = wrap.getBoundingClientRect().top + window.scrollY;
  }, []);

  const paint = useCallback(() => {
    const track = trackRef.current;
    const fill = fillRef.current;
    const list = listRef.current;
    const { thresholds, pinned, range, budget, wrapTop } = geometry.current;
    if (!track || !fill || !list || !thresholds.length) return;

    let p = 1;
    if (pinned) p = Math.max(0, Math.min(1, (window.scrollY - wrapTop) / budget));
    progressRef.current = p;

    track.style.transform = `translate3d(${-p * (pinned ? range : 0)}px,0,0)`;
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
    if (mode !== 'pinned') return;
    measure();
    paint();
    let scrollFrame = 0;
    let resizeFrame = 0;
    const onScroll = () => {
      if (scrollFrame) return;
      scrollFrame = requestAnimationFrame(() => { scrollFrame = 0; paint(); });
    };
    const onResize = () => {
      if (resizeFrame) return;
      resizeFrame = requestAnimationFrame(() => { resizeFrame = 0; measure(); paint(); });
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onResize);
    // A sideways gesture over the pinned run advances it too, so reaching
    // for the direction the years are travelling in actually works.
    const unbind = wrapRef.current
      ? bindPinnedScroll(wrapRef.current, {
          progress: () => progressRef.current,
          enabled: () => geometry.current.pinned,
        })
      : undefined;
    if (typeof document !== 'undefined' && document.fonts?.ready) {
      document.fonts.ready.then(() => { measure(); paint(); }).catch(() => undefined);
    }
    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onResize);
      unbind?.();
      if (scrollFrame) cancelAnimationFrame(scrollFrame);
      if (resizeFrame) cancelAnimationFrame(resizeFrame);
    };
  }, [mode, measure, paint, titleMinHeight, covers, alumniTotal]);

  // Release the height the pinned layout claimed when switching away.
  useEffect(() => {
    if (mode === 'pinned') return;
    if (wrapRef.current) wrapRef.current.style.height = '';
  }, [mode]);

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
    const { pinned, thresholds, wrapTop, budget } = geometry.current;
    if (!pinned || !thresholds.length) return;
    window.scrollTo({ top: wrapTop + thresholds[index] * budget, behavior: smooth });
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
              <li key={event.year} className="tl-vitem" data-ev={i} data-minor={quiet ? 1 : 0}>
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
    <section id="our-history" className="tl tl-section tl-section--pinned" aria-label={heading}>
      <div className="tl-wrap" ref={wrapRef}>
        <div className="tl-sticky" ref={stickyRef}>
          <h2 className="tl-h2 tl-h2--pinned">{heading}</h2>
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
                  <li key={event.year} className="tl-item" data-ev={i} data-minor={quiet ? 1 : 0}>
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
    </section>
  );
}

export default HistoryTimeline;
