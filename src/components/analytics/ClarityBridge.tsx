import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { syncClarity } from '@/lib/analytics/clarity';

/**
 * Keeps Microsoft Clarity in step with the visitor's cookie choice and the
 * page they are on (see lib/analytics/clarity.ts). Renders nothing.
 */
export function ClarityBridge() {
  const { pathname } = useLocation();

  useEffect(() => { syncClarity(pathname); }, [pathname]);

  useEffect(() => {
    const onConsent = (e: Event) => {
      const detail = (e as CustomEvent<{ analytics?: boolean }>).detail;
      syncClarity(window.location.pathname, detail?.analytics === true);
    };
    window.addEventListener('cookie-consent', onConsent);
    return () => window.removeEventListener('cookie-consent', onConsent);
  }, []);

  return null;
}
