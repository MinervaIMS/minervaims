// =====================================================================
// Exports made in the browser, recorded in Activity tracking.
// ---------------------------------------------------------------------
// A CSV or a spreadsheet built from the workspace's data is a copy of
// personal data leaving the workspace, so it is recorded like any other
// sensitive read: who took it, from where, when, and how many rows. The
// file itself never reaches the server; only its name and size do.
//
// The entry goes through public.log_activity, which stamps the person and
// their role from the verified session, so nothing about who did it is
// taken from the browser. It never delays the download and never throws.
// Somebody not signed in (the public website) records nothing.
//
// See BROWSER_DOWNLOADS in supabase/functions/_shared/activity-registry.ts
// for every place that saves a file and how it is recorded.
// =====================================================================

import { supabase } from '@/integrations/supabase/client';
import { NAV, parseWorkspaceUrl } from '@/lib/workspace-nav';

/** The workspace section and subsection the page is on, in the menu's words. */
export function workspacePlace(pathname: string = typeof window !== 'undefined' ? window.location.pathname : ''): { section: string; subsection: string } {
  try {
    const { sectionSlug, subSlug } = parseWorkspaceUrl(pathname);
    const section = NAV.find((s) => s.slug === sectionSlug);
    const sub = section?.subItems.find((i) => i.slug === subSlug);
    return { section: section?.label ?? 'Workspace', subsection: sub?.label ?? section?.label ?? '' };
  } catch {
    return { section: 'Workspace', subsection: '' };
  }
}

/** Record one export. Returns immediately. */
export function logExport(fileName: string, details?: Record<string, unknown>): void {
  if (typeof window === 'undefined' || !window.location.pathname.startsWith('/workspace')) return;
  const place = workspacePlace();
  void (async () => {
    try {
      await supabase.rpc('log_activity', {
        p_action: 'download',
        p_entity_type: 'export',
        p_entity_name: fileName.slice(0, 160),
        p_section: place.section,
        p_subsection: place.subsection,
        p_entity_id: null,
        p_details: { kind: 'export', ...(details ?? {}) },
      } as never);
    } catch {
      // A missing log entry must never stop a download.
    }
  })();
}
