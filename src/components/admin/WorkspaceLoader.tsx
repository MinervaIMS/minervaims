import logoColorAsset from '@/assets/logo-color-loader.webp.asset.json';
import logoWhiteAsset from '@/assets/logo-white-loader.webp.asset.json';

/**
 * Loading indicator for the workspace.
 *
 * By default it fills the nearest positioned ancestor — the workspace content
 * pane is marked `relative` in MinervaWorkspace — and centres the pulsing logo
 * both horizontally and vertically. This mirrors the public site's full-screen
 * PageLoader, but scoped to the exact portion of the screen that is loading, so
 * the logo always sits in the middle of the area it belongs to (not pinned to
 * the top). Pass `inline` for the old in-flow, top-padded variant when the
 * loader is used inside a small, self-contained container.
 */
export function WorkspaceLoader({ className, inline = false }: { className?: string; inline?: boolean }) {
  const logo = (
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
  );

  if (inline) {
    return <div className={`flex items-center justify-center ${className ?? 'py-16'}`}>{logo}</div>;
  }

  return (
    <div className={`absolute inset-0 z-10 flex items-center justify-center bg-background ${className ?? ''}`}>
      {logo}
    </div>
  );
}

export default WorkspaceLoader;
