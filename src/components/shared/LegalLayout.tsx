import { useEffect, useState, ReactNode } from 'react';
import { Link } from 'react-router-dom';
import footerLogo from '@/assets/footer-logo.svg';
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
  effectiveDate?: string;
  sections: LegalSection[];
  children: ReactNode;
  /** Optional element rendered above metadata (e.g. cookie preferences button) */
  toolbar?: ReactNode;
  /** Optional element rendered below metadata (e.g. EN/IT language toggle) */
  languageToggle?: ReactNode;
  /** Related legal pages strip (defaults to standard set if omitted) */
  related?: RelatedDoc[];
  /** Current doc id for related-strip highlight */
  currentId?: string;
}

const DEFAULT_RELATED: RelatedDoc[] = [
  { id: 'disclaimer', title: 'Disclaimer', category: 'Legal', href: '/disclaimer' },
  { id: 'statute', title: 'Society Statute', category: 'Governance', href: '/statute' },
  { id: 'privacy', title: 'Privacy Policy', category: 'Policy', href: '/privacy-policy' },
  { id: 'terms', title: 'Terms of Use', category: 'Legal', href: '/terms-of-use' },
  { id: 'cookie', title: 'Cookie Policy', category: 'Policy', href: '/cookie-policy' },
];

// Strip a leading "1." / "01." / "1)" numbering from section titles so we
// don't duplicate the rendered numeral.
function stripLeadingNumber(t: string) {
  return t.replace(/^\s*\d+[.)]\s*/, '');
}

const pad = (n: number) => String(n).padStart(2, '0');

export function LegalLayout({
  title,
  description,
  lastUpdated,
  effectiveDate,
  sections,
  children,
  toolbar,
  languageToggle,
  related = DEFAULT_RELATED,
  currentId,
}: LegalLayoutProps) {
  const [activeId, setActiveId] = useState<string>(sections[0]?.id ?? '');
  const [tocOpen, setTocOpen] = useState(false);

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

  const handleNav = (e: React.MouseEvent<HTMLAnchorElement>, id: string) => {
    e.preventDefault();
    const el = document.getElementById(id);
    if (el) {
      const top = el.getBoundingClientRect().top + window.scrollY - 112;
      window.scrollTo({ top, behavior: 'smooth' });
      history.replaceState(null, '', `#${id}`);
      setTocOpen(false);
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
          <img className="lp-hero-logo" src={footerLogo} alt="" aria-hidden="true" />
        </div>

        {(lastUpdated || effectiveDate) && (
          <div className="lp-meta">
            {lastUpdated && (
              <div className="item">
                <span className="k">Last updated</span>
                <span className="v">{lastUpdated}</span>
              </div>
            )}
            {effectiveDate && (
              <div className="item">
                <span className="k">Effective date</span>
                <span className="v">{effectiveDate}</span>
              </div>
            )}
          </div>
        )}

        {languageToggle && <div className="lp-lang">{languageToggle}</div>}
        {toolbar && <div className="lp-toolbar">{toolbar}</div>}
      </header>

      <div className="lp-body">
        {/* Sticky numbered TOC — desktop */}
        <aside className="lp-toc" aria-label="On this page">
          <div className="toc-h">On this page</div>
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
        </aside>

        <div className="lp-content">
          {/* Collapsible TOC — tablet/mobile */}
          <details
            className="lp-toc-collapse"
            open={tocOpen}
            onToggle={(e) => setTocOpen((e.target as HTMLDetailsElement).open)}
          >
            <summary>
              On this page <span className="chev">▾</span>
            </summary>
            <nav>
              {sections.map((s, i) => (
                <a key={s.id} href={`#${s.id}`} onClick={(e) => handleNav(e, s.id)}>
                  <span className="n">{pad(i + 1)}</span>
                  <span className="lab">{stripLeadingNumber(s.title)}</span>
                </a>
              ))}
            </nav>
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
}

export function LegalSectionBlock({ id, number, title, children }: LegalSectionBlockProps) {
  // Auto-strip leading numbering and derive the numeral from `number` prop or title prefix.
  const cleanTitle = stripLeadingNumber(title);
  const match = title.match(/^\s*(\d+)/);
  const num = number ?? (match ? pad(parseInt(match[1], 10)) : '');
  return (
    <section className="lp-section" id={id} aria-labelledby={`h-${id}`}>
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
