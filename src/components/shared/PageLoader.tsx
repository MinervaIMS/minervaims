import { useEffect, useState } from 'react';
import logoColorAsset from '@/assets/logo-color-loader.webp.asset.json';
import logoWhiteAsset from '@/assets/logo-white-loader.webp.asset.json';

const SHOW_DELAY_MS = 180;

export function PageLoader() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const t = window.setTimeout(() => setVisible(true), SHOW_DELAY_MS);
    return () => {
      window.clearTimeout(t);
      document.body.removeAttribute('data-page-loading');
    };
  }, []);

  useEffect(() => {
    if (visible) {
      document.body.setAttribute('data-page-loading', 'true');
    } else {
      document.body.removeAttribute('data-page-loading');
    }
  }, [visible]);

  if (!visible) return null;

  return (
    <div className="fixed inset-0 z-[100] bg-background flex items-center justify-center">
      <div className="animate-pulse">
        <img
          src={logoColorAsset.url}
          alt="Loading..."
          width={65}
          height={48}
          className="h-12 w-auto dark:hidden"
          decoding="sync"
          fetchPriority="high"
        />
        <img
          src={logoWhiteAsset.url}
          alt="Loading..."
          width={65}
          height={48}
          className="h-12 w-auto hidden dark:block"
          decoding="sync"
          fetchPriority="high"
        />
      </div>
    </div>
  );
}
