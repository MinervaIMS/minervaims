// =====================================================================
// The Report Archive's Step 93 actions, in one place: several reports at
// once, the PDFs' own details, the people an author can be linked to,
// and the division pages. Every write goes through admin-files, which
// checks the role, the division and the limits again and records the
// action in the activity log.
// =====================================================================

import type { Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { invokeFunction } from '@/lib/errors';
import type { ReportType } from '@/lib/report-meta';

export interface BulkChange {
  ids: string[];
  report_type?: ReportType;
  add_tags?: string[];
  remove_tags?: string[];
  project?: string | null;
}

export async function bulkUpdateReports(change: BulkChange, session: Session | null): Promise<number> {
  const res = await invokeFunction<{ updated: number }>('admin-files', { body: { action: 'bulk-update', file: change }, session });
  return res?.updated ?? 0;
}

export interface PdfCheck {
  total: number;
  up_to_date: number;
  to_update: { id: string; title: string; status: string; first_time: boolean }[];
  cannot: { id: string; title: string; reason: string }[];
  batch: number;
}

export function checkPdfDetails(session: Session | null): Promise<PdfCheck> {
  return invokeFunction<PdfCheck>('admin-files', { body: { action: 'pdf-metadata-check' }, session });
}

export interface PdfApplyResult {
  done: number;
  failed: { id: string; title: string; reason: string }[];
  remaining: number;
}

/**
 * Write the details into every PDF that needs them, a few files per call,
 * until none is left. Files that fail are skipped in the following calls
 * and reported at the end.
 */
export async function applyPdfDetails(
  session: Session | null,
  onProgress: (written: number, remaining: number) => void,
  ids?: string[],
): Promise<{ written: number; failed: PdfApplyResult['failed'] }> {
  let written = 0;
  const failed: PdfApplyResult['failed'] = [];
  for (let round = 0; round < 200; round++) {
    const res = await invokeFunction<PdfApplyResult>('admin-files', {
      body: { action: 'pdf-metadata-apply', file: { confirm: true, ids, skip_ids: failed.map((f) => f.id) } },
      session,
    });
    written += res.done;
    failed.push(...res.failed);
    onProgress(written, res.remaining);
    if (res.remaining === 0 || (res.done === 0 && res.failed.length === 0)) break;
  }
  return { written, failed };
}

/** Somebody an author can be linked to: a Members entry or an Alumni entry. */
export interface PersonOption {
  kind: 'member' | 'alumni';
  id: string;
  name: string;
  detail: string;
}

let people: Promise<PersonOption[]> | null = null;

/** The Members and Alumni entries, for the authors picker. Read once. */
export function listPeople(): Promise<PersonOption[]> {
  if (!people) {
    people = (async () => {
      const [members, alumni] = await Promise.all([
        supabase.from('team_members').select('id, name, surname, position').order('surname'),
        supabase.from('alumni').select('id, name, surname, graduation_year').order('surname'),
      ]);
      const out: PersonOption[] = [];
      for (const m of members.data || []) {
        out.push({ kind: 'member', id: m.id, name: `${m.name} ${m.surname}`.trim(), detail: m.position || 'Member' });
      }
      // Alumni are readable by the roles that edit reports; if not, the
      // picker simply offers the members.
      for (const a of alumni.error ? [] : alumni.data || []) {
        out.push({ kind: 'alumni', id: a.id, name: `${a.name} ${a.surname}`.trim(), detail: a.graduation_year ? `Alumni, class of ${a.graduation_year}` : 'Alumni' });
      }
      return out;
    })();
    people.catch(() => { people = null; });
  }
  return people;
}

export interface DivisionPageInput {
  division: string;
  standards: string;
  review: string;
  tools: string;
  flagship_ids: string[];
}

export function saveDivisionPage(page: DivisionPageInput, session: Session | null) {
  return invokeFunction('admin-files', { body: { action: 'division-page-save', file: page }, session });
}
