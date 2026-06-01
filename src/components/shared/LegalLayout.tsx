import { useEffect, useState, ReactNode } from 'react';
import { PageIntroduction, PageLoader } from '@/components/shared';
import { useImagePreload } from '@/hooks/useImagePreload';
import { ChevronDown } from 'lucide-react';

export interface LegalSection {
  id: string;
  title: string;
}

interface LegalLayoutProps {
  title: string;
  description?: string;
  lastUpdated?: string;
  status?: string;
  backgroundImage?: string;
  sections: LegalSection[];
  children: ReactNode;
  /** Optional element shown above metadata (e.g. action button) */
  toolbar?: ReactNode;
}

export function LegalLayout({
  title,
  description,
  lastUpdated,
  status,
  backgroundImage,
  sections,
  children,
  toolbar,
}: LegalLayoutProps) {
  const imagesLoaded = useImagePreload(backgroundImage ? [backgroundImage] : []);
  const [activeId, setActiveId] = useState<string>(sections[0]?.id ?? '');
  const [mobileTocOpen, setMobileTocOpen] = useState(false);

  useEffect(() => {
    if (!sections.length) return;
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible[0]) setActiveId(visible[0].target.id);
      },
      { rootMargin: '-20% 0px -70% 0px', threshold: 0 }
    );
    sections.forEach((s) => {
      const el = document.getElementById(s.id);
      if (el) observer.observe(el);
    });
    return () => observer.disconnect();
  }, [sections]);

  if (backgroundImage && !imagesLoaded) {
    return <PageLoader />;
  }

  const handleNav = (e: React.MouseEvent<HTMLAnchorElement>, id: string) => {
    e.preventDefault();
    const el = document.getElementById(id);
    if (el) {
      const top = el.getBoundingClientRect().top + window.scrollY - 96;
      window.scrollTo({ top, behavior: 'smooth' });
      history.replaceState(null, '', `#${id}`);
      setMobileTocOpen(false);
    }
  };

  return (
    <>
      <div className="relative">
        {backgroundImage && (
          <div
            className="absolute inset-0 bg-cover bg-center"
            style={{ backgroundImage: `url(${backgroundImage})` }}
          />
        )}
        <div className="relative z-10">
          <PageIntroduction
            title={title}
            description={description}
            transparentBackground={!!backgroundImage}
          />
        </div>
      </div>

      <div className="container py-section-sm md:py-section">
        <div className="grid grid-cols-1 lg:grid-cols-[240px_1fr] xl:grid-cols-[260px_1fr] gap-10 lg:gap-14">
          {/* Sidebar TOC */}
          <aside className="lg:sticky lg:top-24 lg:self-start">
            {/* Mobile collapsible */}
            <div className="lg:hidden border border-separator">
              <button
                type="button"
                onClick={() => setMobileTocOpen((o) => !o)}
                className="w-full flex items-center justify-between px-4 py-3 font-serif text-subheading text-accent"
                aria-expanded={mobileTocOpen}
                aria-controls="legal-toc-mobile"
              >
                <span>On this page</span>
                <ChevronDown
                  className={`h-4 w-4 transition-transform ${mobileTocOpen ? 'rotate-180' : ''}`}
                />
              </button>
              {mobileTocOpen && (
                <nav id="legal-toc-mobile" className="border-t border-separator px-4 py-3">
                  <ol className="space-y-2">
                    {sections.map((s) => (
                      <li key={s.id}>
                        <a
                          href={`#${s.id}`}
                          onClick={(e) => handleNav(e, s.id)}
                          className={`block font-body text-small ${
                            activeId === s.id
                              ? 'text-accent font-semibold'
                              : 'text-muted-foreground hover:text-accent'
                          }`}
                        >
                          {s.title}
                        </a>
                      </li>
                    ))}
                  </ol>
                </nav>
              )}
            </div>

            {/* Desktop TOC */}
            <nav
              aria-label="Table of contents"
              className="hidden lg:block border-l border-separator pl-5"
            >
              <p className="font-serif text-xs uppercase tracking-[0.18em] text-muted-foreground mb-4">
                On this page
              </p>
              <ol className="space-y-3">
                {sections.map((s) => {
                  const active = activeId === s.id;
                  return (
                    <li key={s.id} className="relative">
                      {active && (
                        <span
                          aria-hidden
                          className="absolute -left-5 top-1 bottom-1 w-px bg-accent"
                        />
                      )}
                      <a
                        href={`#${s.id}`}
                        onClick={(e) => handleNav(e, s.id)}
                        className={`block font-body text-small leading-snug transition-colors ${
                          active
                            ? 'text-accent font-semibold'
                            : 'text-muted-foreground hover:text-accent'
                        }`}
                      >
                        {s.title}
                      </a>
                    </li>
                  );
                })}
              </ol>
            </nav>
          </aside>

          {/* Main content */}
          <article className="max-w-3xl">
            {/* Metadata bar */}
            <div className="mb-10 pb-6 border-b border-separator">
              {toolbar && <div className="mb-5">{toolbar}</div>}
              <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
                {lastUpdated && (
                  <p className="font-body text-small text-muted-foreground">
                    <span className="uppercase tracking-[0.12em] text-xs mr-2">Last updated</span>
                    {lastUpdated}
                  </p>
                )}
                {status && (
                  <p className="font-body text-small text-muted-foreground">
                    <span className="uppercase tracking-[0.12em] text-xs mr-2">Status</span>
                    {status}
                  </p>
                )}
              </div>
            </div>

            <div className="legal-content space-y-12">{children}</div>
          </article>
        </div>
      </div>
    </>
  );
}

interface LegalSectionBlockProps {
  id: string;
  number?: string;
  title: string;
  children: ReactNode;
}

export function LegalSectionBlock({ id, number, title, children }: LegalSectionBlockProps) {
  return (
    <section id={id} className="scroll-mt-24">
      <h2 className="font-serif text-heading text-accent mb-5 pb-3 border-b border-separator">
        {number && (
          <span className="text-muted-foreground font-body text-small tracking-[0.12em] uppercase mr-3 align-middle">
            {number}
          </span>
        )}
        {title}
      </h2>
      <div className="font-body text-body text-muted-foreground space-y-4 [&_a]:text-accent [&_a]:underline [&_a:hover]:text-accent/80 [&_ul]:list-disc [&_ul]:pl-6 [&_ul]:space-y-1 [&_h3]:font-serif [&_h3]:text-subheading [&_h3]:text-foreground [&_h3]:mt-6 [&_h3]:mb-2 [&_strong]:text-foreground">
        {children}
      </div>
    </section>
  );
}
