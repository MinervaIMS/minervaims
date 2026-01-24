import { forwardRef } from 'react';
import logoWhite from '@/assets/logo-white.svg';
import logoColor from '@/assets/logo-color.svg';

export const PageLoader = forwardRef<HTMLDivElement>(function PageLoader(_, ref) {
  return (
    <div ref={ref} className="min-h-screen bg-background flex items-center justify-center">
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
});
