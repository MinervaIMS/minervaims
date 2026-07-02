import { useEffect } from 'react';
import logoColorAsset from '@/assets/logo-color-loader.webp.asset.json';
import logoWhiteAsset from '@/assets/logo-white-loader.webp.asset.json';

export function PageLoader() {
  useEffect(() => {
    document.body.setAttribute('data-page-loading', 'true');
    return () => {
      document.body.removeAttribute('data-page-loading');
    };
  }, []);

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
