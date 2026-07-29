import { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useKeyFigures } from '@/hooks/useKeyFigures';
import { PdfThumbnail } from './PdfThumbnail';
import {
  HISTORY_EVENTS,
  SCROLL_PACE,
  ALUMNI_FALLBACK,
  isQuietYear,
  type HistoryEvent,
  type HistoryMedia,
} from '@/data/historyTimeline';

// =====================================================================
// "Our History" — horizontally pinned timeline for the About page.
// The section fills the viewport; as the user scrolls, the track travels
// sideways and each year lights on the rail as it is reached. Narrow or
// short viewports (and prefers-reduced-motion) fall back to a vertical
// spine. All geometry lives in the .tl-* CSS variables in index.css.
// =====================================================================

const prefersReduced = () =>
  typeof window !== 'undefined' &&
  !!window.matchMedia &&
  window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/* ---------------------------------------------------------------- media */

function PhotoFrame({ media }: { media: Extract<HistoryMedia, { kind: 'photo' }> }) {
  // Rendered as a background-image so an absent src never fires a request.
  return (
    <div
      className="tl-media tl-media--photo"
      role="img"
      aria-label={media.alt}
      style={media.src ? { backgroundImage: `url(${media.src})`, backgroundSize: 'cover', backgroundPosition: 'center' } : undefined}
    >
      {!media.src && <span className="tl-note">{media.note}</span>}
    </div>
  );
}

function PdfFrame({ media, url }: { media: Extract<HistoryMedia, { kind: 'pdf' }>; url: string | null }) {
  return (
    <div className="tl-media tl-media--pdf">
      {url ? (
        <PdfThumbnail url={url} className="h-full" alt={media.note || 'Report cover'} renderWidth={200} />
      ) : (
        <span className="tl-note">{media.note}</span>
      )}
    </div>
  );
}

function CounterFrame({ media, total }: { media: Extract<HistoryMedia, { kind: 'counter' }>; total: number }) {
  return (
    <div className="tl-media tl-media--counter">
      <span className="tl-count">
        <span data-count={total}>0</span>
        <span>+</span>
      </span>
      <span className="tl-count-label">{media.label}</span>
    </div>
  );
}

/* ----------------------------------------------------------- pdf lookup */

/** Resolve report covers from archive_files — by query shape or by title. */
function useResolvedCovers() {
  const [urls, setUrls] = useState<Record<number, string>>({});

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      const out: Record<number, string> = {};
      await Promise.all(
        HISTORY_EVENTS.map(async (e) => {
          if (isQuietYear(e) || e.media.kind !== 'pdf') return;
          const m = e.media;
          if (m.url) { out[e.year] = m.url; return; }
          try {
            let q = supabase.from('archive_files').select('id, title, file_url, date, fund');
            if (m.query?.eq) for (const [k, v] of Object.entries(m.query.eq)) q = q.eq(k, v);
            if (m.title) q = q.eq('title', m.title);
            if (m.query?.order) q = q.order(m.query.order.column, { ascending: m.query.order.ascending });
            const { data } = await q.limit(m.query?.limit ?? 1);
            const file = (data || [])[0] as { file_url?: string } | undefined;
            if (file?.file_url) out[e.year] = file.file_url;
          } catch { /* the grey frame with its caption is the fallback */ }
        }),
      );
      if (!cancelled) setUrls(out);
    };
    run();
    return () => { cancelled = true; };
  }, []);

  return urls;
}

/* ------------------------------------------------------------ the card */

interface CardProps {
  event: Extract<HistoryEvent, { title: string }>;
  index: number;
  vertical: boolean;
  alumniTotal: number;
  coverUrl: string | null;
}

function TimelineCard({ event, index, vertical, alumniTotal, coverUrl }: CardProps) {
  const descId = `tl-desc-${vertical ? 'v' : 'h'}${event.year}`;
  const copy = event.description.split('[n]').join(String(alumniTotal));
  return (
    <>
      <h3 className="tl-title" data-title>
        <Link to={event.href}>{event.title}</Link>
      </h3>
      <div className="tl-desc" id={descId}>
        <p>{copy}</p>
      </div>
      <button className="tl-toggle" type="button" data-toggle={index} aria-expanded="false" aria-controls={descId}>
        Read more
      </button>
      {event.media.kind === 'counter' ? (
        <CounterFrame media={event.media} total={alumniTotal} />
      ) : event.media.kind === 'pdf' ? (
        <PdfFrame media={event.media} url={coverUrl} />
      ) : (
        <PhotoFrame media={event.media} />
      )}
    </>
  );
}

/* --------------------------------------------------------- the section */

export function HistoryTimeline() {
  const { counts } = useKeyFigures();
  const covers = useResolvedCovers();
  const alumniTotal = counts.alumni || ALUMNI_FALLBACK;

  const [mode, setMode] = useState<'pinned' | 'vertical'>(() => {
    if (typeof window === 'undefined') return 'vertical';
    return prefersReduced() || window.innerWidth < 768 || window.innerHeight < 680 ? 'vertical' : 'pinned';
  });

  const wrapRef = useRef<HTMLDivElement>(null);
  const stickyRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const railRef = useRef<HTMLDivElement>(null);
  const fillRef = useRef<HTMLDivElement>(null);
  const contRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLOListElement>(null);
  const vlistRef = useRef<HTMLOListElement>(null);

  const state = useRef({
    thresholds: [] as number[],
    dots: [] as HTMLElement[],
    pinned: false,
    range: 0,
    budget: 1,
    wrapTop: 0,
    countRan: false,
  });

  const events = HISTORY_EVENTS;

  /* --- counter -------------------------------------------------------- */
  const startCounter = useCallback(() => {
    const el = document.querySelector<HTMLElement>('[data-count]');
    if (!el || state.current.countRan) return;
    state.current.countRan = true;
    const target = Number(el.getAttribute('data-count')) || alumniTotal;
    if (prefersReduced()) { el.textContent = String(target); return; }
    const t0 = performance.now();
    const dur = 1600;
    const step = (now: number) => {
      const k = Math.min(1, (now - t0) / dur);
      el.textContent = String(Math.round(target * (1 - Math.pow(1 - k, 3))));
      if (k < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }, [alumniTotal]);

  /* --- shared: title equalisation & toggle visibility ------------------ */
  const equalise = useCallback(() => {
    const root = mode === 'pinned' ? listRef.current : vlistRef.current;
    if (!root) return;
    const titles = Array.from(root.querySelectorAll<HTMLElement>('[data-title]'));
    titles.forEach((n) => { n.style.minHeight = '0px'; });
    let max = 0;
    titles.forEach((n) => { max = Math.max(max, n.offsetHeight); });
    titles.forEach((n) => { n.style.minHeight = `${max}px`; });

    Array.from(root.querySelectorAll<HTMLElement>('[data-toggle]')).forEach((btn) => {
      const desc = document.getElementById(btn.getAttribute('aria-controls') || '');
      const p = desc?.firstElementChild as HTMLElement | null;
      btn.style.display = p && p.offsetHeight > 84 ? 'inline-block' : 'none';
    });
  }, [mode]);

  /* --- pinned: measure & paint ---------------------------------------- */
  const measure = useCallback(() => {
    const list = listRef.current, wrap = wrapRef.current, sticky = stickyRef.current,
      track = trackRef.current, rail = railRef.current, cont = contRef.current;
    if (!list || !wrap || !sticky || !track || !rail || !cont) return;
    const s = state.current;
    s.dots = Array.from(list.querySelectorAll<HTMLElement>('[data-dot]'));
    const items = Array.from(list.querySelectorAll<HTMLElement>('li[data-ev]'));
    if (!items.length) return;
    const centres = items.map((li) => li.offsetLeft + li.offsetWidth / 2);
    const first = centres[0], last = centres[centres.length - 1], len = last - first;
    s.thresholds = centres.map((c) => (len > 0 ? (c - first) / len : 0));
    rail.style.left = `${first}px`;
    rail.style.width = `${Math.max(0, len)}px`;
    const lastDot = s.dots[s.dots.length - 1];
    cont.style.left = `${last + (lastDot ? lastDot.offsetWidth / 2 : 44) + 14}px`;
    s.range = Math.max(0, track.scrollWidth - sticky.clientWidth);
    s.pinned = s.range > 8;
    if (s.pinned) {
      s.budget = Math.max(1, s.range * SCROLL_PACE);
      wrap.style.height = `${sticky.offsetHeight + s.budget}px`;
      sticky.style.position = 'sticky';
      sticky.style.height = '';
      sticky.style.padding = '';
    } else {
      s.budget = 1;
      wrap.style.height = 'auto';
      sticky.style.position = 'static';
      sticky.style.height = 'auto';
      sticky.style.padding = '9rem 0 3rem';
    }
    s.wrapTop = wrap.getBoundingClientRect().top + window.scrollY;
  }, []);

  const paint = useCallback(() => {
    const list = listRef.current, track = trackRef.current, fill = fillRef.current;
    if (mode !== 'pinned' || !list || !track || !fill) return;
    const s = state.current;
    if (!s.thresholds.length) return;
    let p = 1;
    if (s.pinned) {
      p = (window.scrollY - s.wrapTop) / s.budget;
      p = Math.max(0, Math.min(1, p));
    }
    track.style.transform = `translate3d(${-p * (s.pinned ? s.range : 0)}px,0,0)`;
    fill.style.width = `${p * 100}%`;
    s.thresholds.forEach((th, i) => {
      const d = s.dots[i];
      if (d) d.classList.toggle('is-lit', p >= th - 0.0005);
    });
    // The track moves by transform, so reveal is read from rects rather than
    // relying on IntersectionObserver ratios.
    Array.from(list.querySelectorAll<HTMLElement>('[data-card]')).forEach((card) => {
      if (card.classList.contains('is-in')) return;
      const r = card.getBoundingClientRect();
      if (r.left < window.innerWidth * 0.92 && r.right > 0) {
        card.classList.add('is-in');
        if (card.querySelector('[data-count]')) startCounter();
      }
    });
  }, [mode, startCounter]);

  /* --- navigation ----------------------------------------------------- */
  const goTo = useCallback((i: number) => {
    const reduced = prefersReduced();
    if (mode === 'vertical') {
      const li = vlistRef.current?.querySelectorAll('li')[i];
      if (li) window.scrollTo({ top: li.getBoundingClientRect().top + window.scrollY - 120, behavior: reduced ? 'auto' : 'smooth' });
      return;
    }
    const s = state.current;
    if (!s.pinned || !s.thresholds.length) return;
    window.scrollTo({ top: s.wrapTop + s.thresholds[i] * s.budget, behavior: reduced ? 'auto' : 'smooth' });
  }, [mode]);

  const onClick = useCallback((ev: React.MouseEvent<HTMLElement>) => {
    const t = (ev.target as HTMLElement).closest<HTMLElement>('[data-toggle], [data-dot]');
    if (!t) return;
    if (t.hasAttribute('data-toggle')) {
      const desc = document.getElementById(t.getAttribute('aria-controls') || '');
      if (!desc) return;
      const open = desc.classList.toggle('is-open');
      t.setAttribute('aria-expanded', open ? 'true' : 'false');
      t.textContent = open ? 'Read less' : 'Read more';
      if (mode === 'pinned') { measure(); paint(); }
    } else {
      goTo(Number(t.getAttribute('data-dot')));
    }
  }, [goTo, measure, paint, mode]);

  /* --- mode switching ------------------------------------------------- */
  useEffect(() => {
    const resolve = () => (prefersReduced() || window.innerWidth < 768 || window.innerHeight < 680 ? 'vertical' : 'pinned');
    let raf = 0;
    const onResize = () => {
      if (raf) return;
      raf = requestAnimationFrame(() => {
        raf = 0;
        setMode(resolve());
        equalise();
        measure();
        paint();
      });
    };
    setMode(resolve());
    window.addEventListener('resize', onResize);
    return () => { window.removeEventListener('resize', onResize); if (raf) cancelAnimationFrame(raf); };
  }, [equalise, measure, paint]);

  /* --- pinned wiring --------------------------------------------------- */
  useEffect(() => {
    if (mode !== 'pinned') return;
    equalise();
    measure();
    paint();
    let raf = 0;
    const onScroll = () => {
      if (raf) return;
      raf = requestAnimationFrame(() => { raf = 0; paint(); });
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    if (document.fonts?.ready) document.fonts.ready.then(() => { equalise(); measure(); paint(); });
    return () => { window.removeEventListener('scroll', onScroll); if (raf) cancelAnimationFrame(raf); };
  }, [mode, equalise, measure, paint, covers, alumniTotal]);

  /* Focusing a control inside an off-screen card scrolls it into view. */
  useEffect(() => {
    if (mode !== 'pinned') return;
    const list = listRef.current;
    if (!list) return;
    const onFocus = (ev: FocusEvent) => {
      const li = (ev.target as HTMLElement).closest<HTMLElement>('li[data-ev]');
      if (!li) return;
      const i = Number(li.getAttribute('data-ev'));
      const r = li.getBoundingClientRect();
      if (r.left < 0 || r.right > window.innerWidth) goTo(i);
    };
    list.addEventListener('focusin', onFocus);
    return () => list.removeEventListener('focusin', onFocus);
  }, [mode, goTo]);

  /* --- vertical wiring -------------------------------------------------- */
  useEffect(() => {
    if (mode !== 'vertical') return;
    equalise();
    if (document.fonts?.ready) document.fonts.ready.then(equalise);
    const vlist = vlistRef.current;
    if (!vlist) return;
    const items = Array.from(vlist.querySelectorAll('li'));
    const light = (li: Element) => {
      li.querySelector('[data-dot]')?.classList.add('is-lit');
      const f = li.querySelector<HTMLElement>('.tl-vfill');
      if (f) f.style.height = 'calc(100% + 2.5rem)';
      if (li.querySelector('[data-count]')) startCounter();
    };
    if (prefersReduced()) { items.forEach(light); return; }
    const io = new IntersectionObserver((entries) => {
      let k = 0;
      entries.forEach((en) => {
        if (!en.isIntersecting) return;
        io.unobserve(en.target);
        const el = en.target;
        window.setTimeout(() => light(el), 150 + (k++) * 400);
      });
    }, { threshold: 0, rootMargin: '0px 0px -18% 0px' });
    items.forEach((li) => io.observe(li));
    return () => io.disconnect();
  }, [mode, equalise, startCounter, covers, alumniTotal]);

  const dashes = useMemo(() => [1, 0.72, 0.5, 0.32, 0.18], []);

  return (
    <section id="our-history" className="tl-section" aria-label="Our History">
      {mode === 'pinned' ? (
        <div className="tl-wrap" ref={wrapRef}>
          <div className="tl-sticky" ref={stickyRef}>
            <h2 className="tl-h2 tl-h2--pinned">Our History</h2>
            <div className="tl-track" ref={trackRef}>
              <div className="tl-rail" ref={railRef} aria-hidden="true">
                <div className="tl-fill" ref={fillRef} />
              </div>
              <div className="tl-cont" ref={contRef} aria-hidden="true">
                {dashes.map((o, i) => <i key={i} style={{ opacity: o }} />)}
              </div>
              <ol className="tl-list" ref={listRef} onClick={onClick}>
                {events.map((e, i) => {
                  const minor = isQuietYear(e);
                  return (
                    <li className="tl-item" key={e.year} data-ev={i} data-minor={minor ? 1 : 0}>
                      <div className="tl-dotcell">
                        <button
                          type="button"
                          className={`tl-dot${minor ? ' tl-dot--minor' : ''}`}
                          data-dot={i}
                          aria-label={minor ? String(e.year) : `Go to ${e.year}: ${e.title}`}
                        >
                          {e.year}
                        </button>
                      </div>
                      {!minor && (
                        <div className="tl-card" data-card={i}>
                          <TimelineCard event={e} index={i} vertical={false} alumniTotal={alumniTotal} coverUrl={covers[e.year] || null} />
                        </div>
                      )}
                    </li>
                  );
                })}
                <li className="tl-tail" aria-hidden="true" />
              </ol>
            </div>
          </div>
        </div>
      ) : (
        <div>
          <h2 className="tl-h2 tl-h2--flow">Our History</h2>
          <ol className="tl-vlist" ref={vlistRef} onClick={onClick}>
            {events.map((e, i) => {
              const minor = isQuietYear(e);
              return (
                <li className="tl-vitem" key={e.year} data-ev={i} data-minor={minor ? 1 : 0}>
                  <div className="tl-vrailcell">
                    <button
                      type="button"
                      className={`tl-dot tl-vdot${minor ? ' tl-dot--minor' : ''}`}
                      data-dot={i}
                      aria-label={minor ? String(e.year) : e.title}
                    >
                      {e.year}
                    </button>
                    <div className="tl-vrail" aria-hidden="true"><div className="tl-vfill" /></div>
                  </div>
                  {minor ? <div /> : (
                    <div className="tl-vcard is-in" data-card={i}>
                      <TimelineCard event={e} index={i} vertical alumniTotal={alumniTotal} coverUrl={covers[e.year] || null} />
                    </div>
                  )}
                </li>
              );
            })}
          </ol>
        </div>
      )}
    </section>
  );
}

export default HistoryTimeline;
