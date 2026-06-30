import logoColorAsset from '@/assets/logo-color-loader.webp.asset.json';
import logoWhiteAsset from '@/assets/logo-white-loader.webp.asset.json';

/**
 * Inline loading indicator using the same pulsing logo as the public site's
 * PageLoader, for use inside the workspace content area (not full-screen).
 */
export function WorkspaceLoader({ className = 'py-16' }: { className?: string }) {
  return (
    <div className={`flex items-center justify-center ${className}`}>
      <div className="animate-pulse">
        <img
          src={logoColorAsset.url} alt="Loading…" width={65} height={48}
          className="h-10 w-auto dark:hidden" decoding="sync"
        />
        <img
          src={logoWhiteAsset.url} alt="Loading…" width={65} height={48}
          className="h-10 w-auto hidden dark:block" decoding="sync"
        />
      </div>
    </div>
  );
}

export default WorkspaceLoader;
