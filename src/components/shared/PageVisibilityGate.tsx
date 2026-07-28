import { ReactNode, useEffect, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import { usePageVisibility } from '@/hooks/usePageVisibility';
import { usePermissions } from '@/hooks/usePermissions';
import { PageLoader } from '@/components/shared/PageLoader';

interface Props {
  pageKey: string;
  children: ReactNode;
}

const findHero = (root: HTMLElement): HTMLElement | null => {
  const first = root.children[0] as HTMLElement | undefined;
  if (!first) return null;
  // Default: first DOM child is the hero
  if (root.children.length > 1) return first;
  // Single-wrapper page (e.g. LegalLayout). Look inside.
  const wrapper = first;
  const tagged = wrapper.querySelector(':scope > [data-page-hero]') as HTMLElement | null;
  if (tagged) return tagged;
  const lpHero = wrapper.querySelector(':scope > header.lp-hero') as HTMLElement | null;
  if (lpHero) return lpHero;
  return wrapper.children[0] as HTMLElement | null;
};

export const PageVisibilityGate = ({ pageKey, children }: Props) => {
  const { isHidden, loading } = usePageVisibility();
  const { isFullAccess } = usePermissions();
  const wrapperRef = useRef<HTMLDivElement | null>(null);

  const hiddenByDb = !loading && isHidden(pageKey);
  // Only blur once we DEFINITIVELY know the page is hidden. Previously the gate
  // also treated the brief client-side loading window as hidden, which made
  // visible pages (e.g. /about) flash the blur + "unavailable" card before
  // revealing. We now render the normal site loader while the state is unknown
  // (see `pending` below), so a visible page never flashes the overlay, and a
  // hidden page never leaks readable content.
  const treatHidden = hiddenByDb && !isFullAccess;
  const showAdminBanner = hiddenByDb && isFullAccess;
  // Non-admins, first cold load only: visibility not yet known. Show the same
  // pulsing-logo loader used everywhere else instead of guessing.
  const pending = loading && !isFullAccess;

  const [heroBottom, setHeroBottom] = useState<number>(0);
  const [noticeTop, setNoticeTop] = useState<number | null>(null);
  const [noticeVisible, setNoticeVisible] = useState(false);
  const [scrimBottom, setScrimBottom] = useState<number>(0);

  // Keep --page-hidden-hero-height in sync with the actual hero bottom
  useEffect(() => {
    const root = wrapperRef.current;
    if (!root || !treatHidden) return;

    let rafId = 0;
    const measure = () => {
      rafId = 0;
      const hero = findHero(root);
      const bottom = hero ? hero.getBoundingClientRect().bottom + window.scrollY : 0;
      setHeroBottom(bottom);
    };
    const schedule = () => {
      if (!rafId) rafId = requestAnimationFrame(measure);
    };

    measure();
    const ro = new ResizeObserver(schedule);
    const mo = new MutationObserver(schedule);
    ro.observe(root);
    mo.observe(root, { childList: true, subtree: true });
    window.addEventListener('resize', schedule);
    window.addEventListener('scroll', schedule, { passive: true });
    const t1 = window.setTimeout(measure, 120);
    const t2 = window.setTimeout(measure, 500);

    return () => {
      if (rafId) cancelAnimationFrame(rafId);
      ro.disconnect();
      mo.disconnect();
      window.removeEventListener('resize', schedule);
      window.removeEventListener('scroll', schedule);
      window.clearTimeout(t1);
      window.clearTimeout(t2);
    };
  }, [treatHidden, children]);

  // Notice position + footer fade
  useEffect(() => {
    if (!treatHidden) {
      setNoticeTop(null);
      setNoticeVisible(false);
      return;
    }
    let rafId = 0;
    const recompute = () => {
      rafId = 0;
      const root = wrapperRef.current;
      if (!root) return;
      const hero = findHero(root);
      const footer = document.querySelector('footer');
      const vh = window.innerHeight;
      let top = Math.max(vh * 0.22, 120);
      if (hero) {
        const hb = hero.getBoundingClientRect().bottom + 24;
        top = Math.max(top, hb);
      }
      top = Math.min(top, vh * 0.6);
      let visible = true;
      let sb = 0;
      if (footer) {
        const ft = footer.getBoundingClientRect().top;
        if (ft < vh - 40) visible = false;
        // Pin scrim bottom to footer top so footer is never blurred
        sb = Math.max(0, vh - ft);
      }
      setNoticeTop(top);
      setNoticeVisible(visible);
      setScrimBottom(sb);
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
      window.removeEventListener('scroll', schedule);
      window.removeEventListener('resize', schedule);
      window.clearTimeout(t1);
      window.clearTimeout(t2);
    };
  }, [treatHidden, children]);

  // Block copy/cut/contextmenu outside the hero
  useEffect(() => {
    if (!treatHidden) return;
    const root = wrapperRef.current;
    if (!root) return;
    const block = (e: Event) => {
      const target = e.target as Node | null;
      const hero = findHero(root);
      if (hero && target && hero.contains(target)) return;
      e.preventDefault();
    };
    root.addEventListener('copy', block);
    root.addEventListener('cut', block);
    root.addEventListener('contextmenu', block);
    return () => {
      root.removeEventListener('copy', block);
      root.removeEventListener('cut', block);
      root.removeEventListener('contextmenu', block);
    };
  }, [treatHidden, children]);

  // While we genuinely don't know yet (cold first visit, non-admin), show the
  // standard loader rather than the content or the blur overlay. All hooks
  // above run unconditionally, so this early return is safe.
  if (pending) return <PageLoader />;

  return (
    <>
      {showAdminBanner && (
        <div
          className="fixed left-0 right-0 z-40 bg-accent text-accent-foreground font-body text-sm px-6 py-3 text-center shadow-md"
          style={{ top: 'calc(84px + env(safe-area-inset-top))' }}
        >
          This page is currently hidden from the public. Toggle visibility in
          Workspace › Website › Pages.
        </div>
      )}

      <div
        ref={wrapperRef}
        className={treatHidden ? 'page-gate-blurred' : ''}
        style={{ display: 'contents' }}
      >
        {children}
      </div>


      {treatHidden && noticeTop !== null && (
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

/**
 * Visibility gate for dynamic routes: derives the page key from a URL param, so
 * each division/fund page can be toggled individually. e.g. on /divisions/equity
 * with prefix="division" param="division" → key "division-equity".
 */
export const ParamVisibilityGate = ({
  prefix,
  param,
  children,
}: {
  prefix: string;
  param: string;
  children: ReactNode;
}) => {
  const params = useParams();
  const slug = params[param];
  return <PageVisibilityGate pageKey={slug ? `${prefix}-${slug}` : prefix}>{children}</PageVisibilityGate>;
};

export default PageVisibilityGate;
