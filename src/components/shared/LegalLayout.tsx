import { useEffect, useState, ReactNode } from 'react';
import { Link } from 'react-router-dom';
import heroLogo from '@/assets/legal-hero-logo.svg';
import '@/styles/legal-system.css';

export interface LegalSection {
  id: string;
  title: string;
}

export interface RelatedDoc {
  id: string;
  title: string;
  category: string;
  href: string;
}

interface LegalLayoutProps {
  title: string;
  description?: string;
  lastUpdated?: string;
  sections: LegalSection[];
  children: ReactNode;
  /** Element rendered below metadata in the hero (e.g. EN/IT toggle) */
  languageToggle?: ReactNode;
  /** Element rendered inside the sticky TOC, below the progress bar (e.g. cookie preferences button) */
  tocFooter?: ReactNode;
  /** Related legal pages strip */
  related?: RelatedDoc[];
  currentId?: string;
}

const DEFAULT_RELATED: RelatedDoc[] = [
  { id: 'disclaimer', title: 'Disclaimer', category: 'Legal', href: '/disclaimer' },
  { id: 'statute', title: 'Society Statute', category: 'Governance', href: '/statute' },
  { id: 'privacy', title: 'Privacy Policy', category: 'Policy', href: '/privacy-policy' },
  { id: 'terms', title: 'Terms of Use', category: 'Legal', href: '/terms-of-use' },
  { id: 'cookie', title: 'Cookie Policy', category: 'Policy', href: '/cookie-policy' },
];

function stripLeadingNumber(t: string) {
  return t.replace(/^\s*\d+[.)]\s*/, '');
}

const pad = (n: number) => String(n).padStart(2, '0');

export function LegalLayout({
  title,
  description,
  lastUpdated,
  sections,
  children,
  languageToggle,
  tocFooter,
  related = DEFAULT_RELATED,
  currentId,
}: LegalLayoutProps) {
  const [activeId, setActiveId] = useState<string>(sections[0]?.id ?? '');
  const [tocOpen, setTocOpen] = useState(false);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    if (!sections.length) return;
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible[0]) setActiveId(visible[0].target.id);
      },
      { rootMargin: '-25% 0px -65% 0px', threshold: 0 }
    );
    sections.forEach((s) => {
      const el = document.getElementById(s.id);
      if (el) observer.observe(el);
    });
    return () => observer.disconnect();
  }, [sections]);

  useEffect(() => {
    const onScroll = () => {
      const h = document.documentElement;
      const scrollable = h.scrollHeight - h.clientHeight;
      const pct = scrollable > 0 ? Math.min(100, Math.max(0, (h.scrollTop / scrollable) * 100)) : 0;
      setProgress(pct);
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
    };
  }, []);

  const handleNav = (e: React.MouseEvent<HTMLAnchorElement>, id: string) => {
    e.preventDefault();
    const wasOpen = tocOpen;
    setTocOpen(false);
    const doScroll = () => {
      const el = document.getElementById(id);
      if (!el) return;
      const headerEl = document.querySelector('header');
      const headerH = headerEl?.getBoundingClientRect().height ?? 96;
      const top = el.getBoundingClientRect().top + window.scrollY - (headerH + 16);
      window.scrollTo({ top, behavior: 'smooth' });
      history.replaceState(null, '', `#${id}`);
    };
    if (wasOpen) {
      requestAnimationFrame(() => requestAnimationFrame(doScroll));
    } else {
      doScroll();
    }
  };

  const handleBackTop = () => window.scrollTo({ top: 0, behavior: 'smooth' });

  return (
    <article className="legal-doc">
      <header className="lp-hero">
        <div className="lp-hero-top">
          <div className="lp-hero-head">
            <h1 className="lp-title">{title}</h1>
            {description && <p className="lp-intro">{description}</p>}
          </div>
          <img className="lp-hero-logo" src={heroLogo} alt="" aria-hidden="true" />
        </div>

        {lastUpdated && (
          <div className="lp-meta">
            <div className="item">
              <span className="k">Last updated</span>
              <span className="v">{lastUpdated}</span>
            </div>
          </div>
        )}

        {languageToggle && <div className="lp-lang">{languageToggle}</div>}
      </header>

      <div className="lp-body">
        <aside className="lp-toc" aria-label="On this page">
          <div className="toc-h">In this page</div>
          <nav>
            {sections.map((s, i) => {
              const active = activeId === s.id;
              return (
                <a
                  key={s.id}
                  className={active ? 'active' : ''}
                  href={`#${s.id}`}
                  onClick={(e) => handleNav(e, s.id)}
                >
                  <span className="n">{pad(i + 1)}</span>
                  <span className="lab">{stripLeadingNumber(s.title)}</span>
                </a>
              );
            })}
          </nav>

          <div className="lp-progress" aria-label="Reading progress">
            <div className="lp-progress-meta">
              <span>Reading progress</span>
            </div>
            <div className="lp-progress-track">
              <div className="lp-progress-bar" style={{ width: `${progress}%` }} />
            </div>
          </div>

          {tocFooter && <div className="lp-toc-footer">{tocFooter}</div>}
        </aside>

        <div className="lp-content">
          <details
            className="lp-toc-collapse"
            open={tocOpen}
            onToggle={(e) => setTocOpen((e.target as HTMLDetailsElement).open)}
          >
            <summary>
              Contents <span className="chev">▾</span>
            </summary>
            <nav>
              {sections.map((s, i) => (
                <a key={s.id} href={`#${s.id}`} onClick={(e) => handleNav(e, s.id)}>
                  <span className="n">{pad(i + 1)}</span>
                  <span className="lab">{stripLeadingNumber(s.title)}</span>
                </a>
              ))}
            </nav>
            <div className="lp-progress">
              <div className="lp-progress-meta">
                <span>Reading progress</span>
              </div>
              <div className="lp-progress-track">
                <div className="lp-progress-bar" style={{ width: `${progress}%` }} />
              </div>
            </div>
            {tocFooter && <div className="lp-toc-footer">{tocFooter}</div>}
          </details>

          {children}
        </div>
      </div>

      <div className="lp-backtop-row">
        <button type="button" className="lp-backtop" onClick={handleBackTop}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <line x1="12" y1="19" x2="12" y2="5" />
            <polyline points="5 12 12 5 19 12" />
          </svg>
          Back to top
        </button>
      </div>

      {related && related.length > 0 && (
        <nav className="lp-related" aria-label="Other legal pages">
          <div className="container">
            <div className="r-h">Other legal &amp; technical pages</div>
            <div className="r-list">
              {related.map((r) => {
                const isCurrent = r.id === currentId;
                return (
                  <Link
                    key={r.id}
                    to={r.href}
                    aria-current={isCurrent ? 'page' : undefined}
                    onClick={(e) => {
                      if (isCurrent) e.preventDefault();
                    }}
                  >
                    <span className="r-cat">{r.category}</span>
                    <span className="r-title">{r.title}</span>
                    <span className="r-arr">{isCurrent ? 'You are here' : '→'}</span>
                  </Link>
                );
              })}
            </div>
          </div>
        </nav>
      )}
    </article>
  );
}

interface LegalSectionBlockProps {
  id: string;
  number?: string;
  title: string;
  children: ReactNode;
  /** When true, lifts the 68ch max-width to let wide content (tables) span full column */
  wide?: boolean;
}

export function LegalSectionBlock({ id, number, title, children, wide }: LegalSectionBlockProps) {
  const cleanTitle = stripLeadingNumber(title);
  const match = title.match(/^\s*(\d+)/);
  const num = number ?? (match ? pad(parseInt(match[1], 10)) : '');
  return (
    <section className={`lp-section${wide ? ' lp-section-wide' : ''}`} id={id} aria-labelledby={`h-${id}`}>
      <div className="lp-num" aria-hidden="true">{num}</div>
      <div className="lp-h2-wrap">
        <h2 className="lp-h2" id={`h-${id}`}>
          {cleanTitle}
          <a className="anchor" href={`#${id}`} aria-label="Link to this section">#</a>
        </h2>
        {children}
      </div>
    </section>
  );
}
