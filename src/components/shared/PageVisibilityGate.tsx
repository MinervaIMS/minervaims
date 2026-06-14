import { ReactNode, useEffect, useRef, useState } from 'react';
import { usePageVisibility } from '@/hooks/usePageVisibility';
import { usePermissions } from '@/hooks/usePermissions';

interface Props {
  pageKey: string;
  children: ReactNode;
}

export const PageVisibilityGate = ({ pageKey, children }: Props) => {
  const { isHidden, loading } = usePageVisibility();
  const { isFullAccess } = usePermissions();
  const containerRef = useRef<HTMLDivElement | null>(null);

  const hidden = !loading && isHidden(pageKey);
  const shouldBlur = hidden && !isFullAccess;

  const [noticeTop, setNoticeTop] = useState<number | null>(null);
  const [noticeVisible, setNoticeVisible] = useState(false);

  useEffect(() => {
    const root = containerRef.current;
    if (!root) return;
    const cls = 'page-blur-block';
    (Array.from(root.children) as HTMLElement[]).forEach((el, idx) => {
      if (el.dataset.pageGateOverlay === 'true') return;
      if (idx === 0 || !shouldBlur) {
        el.classList.remove(cls);
        el.removeAttribute('aria-hidden');
        el.style.pointerEvents = '';
      } else {
        el.classList.add(cls);
        el.setAttribute('aria-hidden', 'true');
        el.style.pointerEvents = 'none';
      }
    });
  }, [shouldBlur, children]);

  useEffect(() => {
    if (!shouldBlur) {
      setNoticeTop(null);
      setNoticeVisible(false);
      return;
    }
    let rafId = 0;
    const recompute = () => {
      rafId = 0;
      const root = containerRef.current;
      if (!root) return;
      const hero = root.children[0] as HTMLElement | undefined;
      const footer = document.querySelector('footer');
      const vh = window.innerHeight;
      let top = Math.max(vh * 0.22, 120);
      if (hero) top = Math.max(top, hero.getBoundingClientRect().bottom + 24);
      top = Math.min(top, vh * 0.6);
      let visible = true;
      if (footer && footer.getBoundingClientRect().top < vh - 40) visible = false;
      setNoticeTop(top);
      setNoticeVisible(visible);
    };
    const schedule = () => {
      if (!rafId) rafId = requestAnimationFrame(recompute);
    };
    recompute();
    window.addEventListener('scroll', schedule, { passive: true });
    window.addEventListener('resize', schedule);
    const t1 = window.setTimeout(recompute, 120);
    const t2 = window.setTimeout(recompute, 500);
    return () => {
      if (rafId) cancelAnimationFrame(rafId);
      window.clearTimeout(t1);
      window.clearTimeout(t2);
      window.removeEventListener('scroll', schedule);
      window.removeEventListener('resize', schedule);
    };
  }, [shouldBlur, children]);

  return (
    <>
      {hidden && isFullAccess && (
        <div
          className="fixed left-0 right-0 z-40 bg-accent text-accent-foreground font-body text-sm px-6 py-3 text-center shadow-md"
          style={{ top: 'calc(84px + env(safe-area-inset-top))' }}
        >
          This page is currently hidden from the public. Toggle visibility in
          Workspace › Website › Pages.
        </div>
      )}

      <div ref={containerRef} className="relative contents">
        {children}
      </div>

      {shouldBlur && noticeTop !== null && (
        <div
          className={`fixed left-0 right-0 z-30 flex justify-center pointer-events-none px-6 transition-opacity duration-300 ${
            noticeVisible ? 'opacity-100' : 'opacity-0'
          }`}
          style={{ top: `${noticeTop}px` }}
          data-page-gate-overlay="true"
        >
          <div className="pointer-events-auto max-w-xl w-full bg-background border-2 border-accent p-8 text-center shadow-xl">
            <h2 className="font-serif text-heading text-accent mb-4">
              Page Temporarily Unavailable
            </h2>
            <p className="font-body text-body text-foreground">
              This page is currently being updated. For urgent enquiries, please contact us. Thank you for your patience and understanding.
            </p>
          </div>
        </div>
      )}
    </>
  );
};

export default PageVisibilityGate;
