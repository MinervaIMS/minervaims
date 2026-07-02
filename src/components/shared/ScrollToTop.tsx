import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

export function ScrollToTop() {
  const { pathname, hash } = useLocation();

  // Take over scroll handling from the browser so it never restores a previous
  // position (which is what makes a new page open "mid-page").
  useEffect(() => {
    if ('scrollRestoration' in window.history) {
      window.history.scrollRestoration = 'manual';
    }
  }, []);

  useEffect(() => {
    if (hash) {
      // Scroll to the anchored element once it is rendered.
      const t = setTimeout(() => {
        const element = document.getElementById(hash.slice(1));
        if (element) element.scrollIntoView({ behavior: 'smooth' });
      }, 100);
      return () => clearTimeout(t);
    }
    // Otherwise jump to the very top. We do it now and again after the next
    // paint, so a late layout shift (lazy page, images) can't leave the user
    // partway down the page.
    const toTop = () => window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
    toTop();
    const raf = requestAnimationFrame(toTop);
    return () => cancelAnimationFrame(raf);
  }, [pathname, hash]);

  return null;
}
