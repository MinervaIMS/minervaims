import { useEffect, useState, type MouseEvent, type ReactNode } from 'react';
import '@/styles/legal-system.css';

// =====================================================================
// PageIndex: the legal pages' "In this page", for any long page (Step 105).
// ---------------------------------------------------------------------
// The same numbered index, the same active marker and reading progress,
// and on a phone the same collapsible "Contents", drawn with the legal
// pages' own classes (src/styles/legal-system.css). LegalLayout is left
// exactly as it is, so the legal pages do not change: this is a copy of
// its index for pages that are not legal pages, first Minerva's Track
// Record. It must sit inside an element with the `legal-doc` class, which
// is what scopes those styles.
//
//   <div className="legal-doc">
//     <PageIndex sections={[{ id, title }]}>...the sections...</PageIndex>
//   </div>
// =====================================================================

export interface IndexSection { id: string; title: string }

const pad = (n: number) => String(n).padStart(2, '0');

export function PageIndex({ sections, children }: { sections: IndexSection[]; children: ReactNode }) {
  const [activeId, setActiveId] = useState<string>(sections[0]?.id ?? '');
  const [open, setOpen] = useState(false);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    if (!sections.length || typeof IntersectionObserver === 'undefined') return;
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter((e) => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible[0]) setActiveId(visible[0].target.id);
      },
      { rootMargin: '-25% 0px -65% 0px', threshold: 0 },
    );
    sections.forEach((s) => { const el = document.getElementById(s.id); if (el) observer.observe(el); });
    return () => observer.disconnect();
  }, [sections]);

  useEffect(() => {
    const onScroll = () => {
      const h = document.documentElement;
      const scrollable = h.scrollHeight - h.clientHeight;
      setProgress(scrollable > 0 ? Math.min(100, Math.max(0, (h.scrollTop / scrollable) * 100)) : 0);
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    return () => { window.removeEventListener('scroll', onScroll); window.removeEventListener('resize', onScroll); };
  }, []);

  const go = (e: MouseEvent<HTMLAnchorElement>, id: string) => {
    e.preventDefault();
    const wasOpen = open;
    setOpen(false);
    const scroll = () => {
      const el = document.getElementById(id);
      if (!el) return;
      const headerH = document.querySelector('header')?.getBoundingClientRect().height ?? 96;
      window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY - (headerH + 16), behavior: 'smooth' });
      history.replaceState(null, '', `#${id}`);
    };
    if (wasOpen) requestAnimationFrame(() => requestAnimationFrame(scroll)); else scroll();
  };

  const bar = (
    <div className="lp-progress" aria-label="Reading progress">
      <div className="lp-progress-meta"><span>Reading progress</span></div>
      <div className="lp-progress-track"><div className="lp-progress-bar" style={{ width: `${progress}%` }} /></div>
    </div>
  );

  return (
    <div className="lp-body">
      <aside className="lp-toc" aria-label="On this page">
        <div className="toc-h">In this page</div>
        <nav>
          {sections.map((s, i) => (
            <a key={s.id} className={activeId === s.id ? 'active' : ''} href={`#${s.id}`} onClick={(e) => go(e, s.id)}>
              <span className="n">{pad(i + 1)}</span>
              <span className="lab">{s.title}</span>
            </a>
          ))}
        </nav>
        {bar}
      </aside>
      <div className="min-w-0">
        <details className="lp-toc-collapse" open={open} onToggle={(e) => setOpen((e.target as HTMLDetailsElement).open)}>
          <summary>Contents <span className="chev">&#9662;</span></summary>
          <nav>
            {sections.map((s, i) => (
              <a key={s.id} href={`#${s.id}`} onClick={(e) => go(e, s.id)}>
                <span className="n">{pad(i + 1)}</span>
                <span className="lab">{s.title}</span>
              </a>
            ))}
          </nav>
        </details>
        {children}
      </div>
    </div>
  );
}

export default PageIndex;
