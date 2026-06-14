import { ReactNode, useEffect, useRef } from 'react';
import { usePageVisibility } from '@/hooks/usePageVisibility';
import { usePermissions } from '@/hooks/usePermissions';

interface Props {
  pageKey: string;
  children: ReactNode;
}

/**
 * Wraps a route's page. When the page is marked hidden in `page_visibility`:
 *   - Full-access users see the normal page with a small "hidden" banner.
 *   - Everyone else: the first <section> (the hero/header) remains visible,
 *     and everything below it is heavily blurred with an accent-coloured
 *     "currently updating" notice overlayed on top.
 */
export const PageVisibilityGate = ({ pageKey, children }: Props) => {
  const { isHidden, loading } = usePageVisibility();
  const { isFullAccess } = usePermissions();
  const containerRef = useRef<HTMLDivElement>(null);

  const hidden = !loading && isHidden(pageKey);

  // Apply blur to all siblings of the first <section> when hidden for the public
  useEffect(() => {
    const root = containerRef.current;
    if (!root) return;
    const blockBlurClass = 'page-blur-block';
    const sections = Array.from(root.children) as HTMLElement[];
    const shouldBlur = hidden && !isFullAccess;
    // First element stays visible (the hero/header). Blur the rest.
    sections.forEach((el, idx) => {
      if (idx === 0) {
        el.classList.remove(blockBlurClass);
        el.removeAttribute('aria-hidden');
        el.style.pointerEvents = '';
      } else {
        if (shouldBlur) {
          el.classList.add(blockBlurClass);
          el.setAttribute('aria-hidden', 'true');
          el.style.pointerEvents = 'none';
        } else {
          el.classList.remove(blockBlurClass);
          el.removeAttribute('aria-hidden');
          el.style.pointerEvents = '';
        }
      }
    });
  }, [hidden, isFullAccess, children]);

  return (
    <>
      {hidden && isFullAccess && (
        <div
          role="status"
          className="w-full bg-accent text-background font-body text-sm py-2 px-4 text-center"
        >
          This page is currently <strong>hidden from the public</strong>. Toggle visibility in
          Workspace › Website › Pages.
        </div>
      )}

      <div ref={containerRef} className="relative">
        {children}

        {hidden && !isFullAccess && (
          <div
            className="fixed inset-x-0 bottom-0 z-50 flex items-start justify-center pointer-events-none"
            style={{ top: 'var(--page-hidden-overlay-top, 40vh)' }}
          >
            <div
              role="alert"
              className="pointer-events-auto max-w-xl mx-6 mt-12 bg-background/95 backdrop-blur-sm px-8 py-10 text-center shadow-[0_10px_40px_rgba(0,0,0,0.15)]"
              style={{ border: '1px solid hsl(var(--accent))' }}
            >
              <h2 className="font-serif text-2xl text-accent mb-4">Page Under Update</h2>
              <p className="font-body text-foreground leading-relaxed">
                This page is currently being updated. For urgent enquiries, please{' '}
                <a
                  href="mailto:as.minerva@unibocconi.it"
                  className="text-accent underline underline-offset-4"
                >
                  contact us
                </a>
                . Thank you for your understanding.
              </p>
            </div>
          </div>
        )}
      </div>
    </>
  );
};
