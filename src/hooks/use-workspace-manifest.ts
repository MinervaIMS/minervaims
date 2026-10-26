import { useEffect } from 'react';

// =====================================================================
// Installing the workspace (Step 98).
// ---------------------------------------------------------------------
// The site's manifest installs the public website and opens it on the
// homepage. While the workspace is open, its own manifest takes the place
// of the site's, so "Add to Home Screen" or "Install" from here installs
// "Minerva Workspace", which opens on /workspace with shortcuts to the
// Calendar, Attendance and My Profile. Leaving the workspace puts the
// site's manifest back, so installing from the website is unchanged.
//
// There is no service worker: nothing is cached across updates, and the
// attendance scanner's own handling of a lost connection is untouched.
// =====================================================================

const WORKSPACE_MANIFEST = '/workspace-manifest.json';

export function useWorkspaceManifest(): void {
  useEffect(() => {
    const link = document.querySelector<HTMLLinkElement>('link[rel="manifest"]');
    if (!link) return;
    const before = link.getAttribute('href');
    link.setAttribute('href', WORKSPACE_MANIFEST);
    return () => {
      if (before) link.setAttribute('href', before);
    };
  }, []);
}
