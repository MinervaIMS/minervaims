import { useEffect } from 'react';
import logoWhite from '@/assets/logo-white.svg';
import logoColor from '@/assets/logo-color.svg';

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
          src={logoColor}
          alt="Loading..."
          className="h-12 w-auto dark:hidden"
        />
        <img
          src={logoWhite}
          alt="Loading..."
          className="h-12 w-auto hidden dark:block"
        />
      </div>
    </div>
  );
}
