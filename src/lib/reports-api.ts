// =====================================================================
// Reading published reports, for the report page and the archive.
// ---------------------------------------------------------------------
// One database function, public.public_reports(), answers both: every
// published report (newest first) or one by its address, with its
// authors already linked to the people the website lists.
// =====================================================================

import { supabase } from '@/integrations/supabase/client';
import { isPublicReport, relatedReports, toListItem, type PublicReport, type ReportPageData } from '@/lib/reports-public';

type Rpc = (fn: string, args?: Record<string, unknown>) => Promise<{ data: unknown; error: unknown }>;
// Called as a method (the client reads `this`), only typed loosely.
const rpc: Rpc = (fn, args) => (supabase.rpc as unknown as Rpc)(fn, args);

let all: Promise<PublicReport[]> | null = null;

/** Every published report, read once per visit. */
export function listPublicReports(): Promise<PublicReport[]> {
  if (!all) {
    all = rpc('public_reports').then(({ data, error }) => {
      if (error) throw error;
      return Array.isArray(data) ? data.filter(isPublicReport) : [];
    });
    all.catch(() => { all = null; });
  }
  return all;
}

/**
 * Whether the report at this address is still published: false only when
 * the database clearly says it is not (blocked or deleted since the last
 * Publish), null when it could not be asked.
 */
export async function reportStillPublished(slug: string): Promise<boolean | null> {
  try {
    const { data, error } = await rpc('public_reports', { p_slug: slug });
    if (error || !Array.isArray(data)) return null;
    return data.some((r) => isPublicReport(r) && r.slug === slug);
  } catch {
    return null;
  }
}

/** One report and the reports to read next, or null for an unknown address. */
export async function fetchReportPage(slug: string): Promise<ReportPageData | null> {
  const reports = await listPublicReports();
  const report = reports.find((r) => r.slug === slug);
  if (!report) return null;
  return { report, related: relatedReports(report, reports).map(toListItem) };
}
