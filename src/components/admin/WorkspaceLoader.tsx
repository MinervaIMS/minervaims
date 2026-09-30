import { useLayoutEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import logoColorAsset from '@/assets/logo-color-loader.webp.asset.json';
import logoWhiteAsset from '@/assets/logo-white-loader.webp.asset.json';
import { pulsePhaseStyle } from '@/lib/loader-pulse';

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
    // The same slow breath as the public page loader, on the same clock and
    // in the same phase: moving between subsections mounts this repeatedly,
    // and a restart per subsection is what made it look hurried.
    <div className="animate-markPulse" style={pulsePhaseStyle()}>
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

  return <PaneLoader className={className}>{logo}</PaneLoader>;
}

/**
 * ALWAYS THE MIDDLE OF THE PANE.
 *
 * `absolute inset-0` fills the nearest POSITIONED ancestor, which is the
 * content pane only when nothing in between is positioned. A page whose
 * own wrapper is `relative` (the file libraries are, for their drop zone)
 * got a loader the size of its header, with the logo near the top of the
 * screen. So the loader now finds the pane it is drawn in and places
 * itself there, over exactly the part of the pane that is on screen,
 * whatever sits in between and however far the pane is scrolled. Outside
 * a pane (a dialog, a card) it keeps filling its own container.
 */
function PaneLoader({ className, children }: { className?: string; children: ReactNode }) {
  const anchor = useRef<HTMLSpanElement>(null);
  const [pane, setPane] = useState<HTMLElement | null>(null);
  const [box, setBox] = useState<{ top: number; height: number } | null>(null);

  useLayoutEffect(() => {
    const found = anchor.current?.closest<HTMLElement>('[data-ws-pane]') ?? null;
    if (!found) return;
    const measure = () => setBox({ top: found.scrollTop, height: found.clientHeight });
    measure();
    setPane(found);
    found.addEventListener('scroll', measure, { passive: true });
    window.addEventListener('resize', measure);
    return () => {
      found.removeEventListener('scroll', measure);
      window.removeEventListener('resize', measure);
    };
  }, []);

  const cover = (style?: CSSProperties) => (
    <div
      data-workspace-loader
      style={style}
      className={`absolute z-30 flex items-center justify-center bg-background ${style ? 'inset-x-0' : 'inset-0'} ${className ?? ''}`}
    >
      {children}
    </div>
  );

  if (pane && box) {
    return (
      <>
        <span ref={anchor} hidden />
        {createPortal(cover({ top: box.top, height: box.height }), pane)}
      </>
    );
  }
  return <><span ref={anchor} hidden />{cover()}</>;
}

export default WorkspaceLoader;
