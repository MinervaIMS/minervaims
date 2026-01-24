import logoWhite from '@/assets/logo-white.svg';
import logoColor from '@/assets/logo-color.svg';

export function PageLoader() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
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
