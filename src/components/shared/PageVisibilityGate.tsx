import { ReactNode, useEffect, useRef } from 'react';
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

  useEffect(() => {
    const root = containerRef.current;
    if (!root) return;
    const cls = 'page-blur-block';
    (Array.from(root.children) as HTMLElement[]).forEach((el, idx) => {
      // Skip the overlay notice itself
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
  });

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

      {shouldBlur && (
        <div
          className="fixed inset-0 z-30 flex items-center justify-center pointer-events-none px-6 pb-48"
          data-page-gate-overlay="true"
        >
          <div className="pointer-events-auto max-w-xl w-full bg-background border-2 border-accent p-8 text-center shadow-xl">
            <h2 className="font-serif text-heading text-accent mb-4">
              Page Temporarily Unavailable
            </h2>
            <p className="font-body text-body text-foreground whitespace-pre-line">
              This page is currently being updated.&nbsp;{"\n"}
              For urgent enquiries, please contact us.&nbsp;{"\n"}
              Thank you for your patience and understanding.
            </p>
          </div>
        </div>
      )}
    </>
  );
};

export default PageVisibilityGate;
