import type { Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { invokeFunction } from '@/lib/errors';
import type { AverageSettings, CourseRow } from '@/lib/career/grading';

// =====================================================================
// Career: the files behind the templates and LinkedIn pages (through the
// `career-files` edge function, because the bucket is private), and the
// GPA averages a member saves (straight to their own rows: row level
// security lets each person reach only their own).
// =====================================================================

export type CareerFileKind = 'cv_template' | 'cl_template' | 'portrait_background' | 'wallpaper';

export interface CareerFile {
  id: string;
  kind: CareerFileKind;
  label: string | null;
  file_name: string;
  mime_type: string | null;
  size_bytes: number | null;
  width: number | null;
  height: number | null;
  updated_at: string;
  /** Signed link for showing the file, valid for one hour. Downloads go
   *  through `downloadCareerFile`, which records them. */
  view_url: string | null;
}

export interface CareerFiles {
  files: CareerFile[];
  can_manage: Partial<Record<CareerFileKind, boolean>>;
}

export async function listCareerFiles(session: Session | null, kinds: CareerFileKind[]): Promise<CareerFiles> {
  const res = await invokeFunction<CareerFiles>('career-files', { body: { action: 'list', kinds }, session });
  return { files: res?.files ?? [], can_manage: res?.can_manage ?? {} };
}

/** Measure an image before sending it, so the gallery can lay it out at its own proportions. */
export function imageSize(file: File): Promise<{ width: number; height: number } | null> {
  return new Promise((resolve) => {
    if (!file.type.startsWith('image/')) { resolve(null); return; }
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => { resolve({ width: img.naturalWidth, height: img.naturalHeight }); URL.revokeObjectURL(url); };
    img.onerror = () => { resolve(null); URL.revokeObjectURL(url); };
    img.src = url;
  });
}

export async function uploadCareerFile(
  session: Session | null,
  kind: CareerFileKind,
  file: File,
  opts: { label?: string } = {},
): Promise<void> {
  const form = new FormData();
  form.append('kind', kind);
  form.append('file', file);
  if (opts.label) form.append('label', opts.label);
  const size = await imageSize(file);
  if (size) { form.append('width', String(size.width)); form.append('height', String(size.height)); }
  await invokeFunction('career-files', { body: form, session });
}

export async function renameCareerFile(session: Session | null, id: string, label: string): Promise<void> {
  await invokeFunction('career-files', { body: { action: 'rename', id, label }, session });
}

export async function deleteCareerFile(session: Session | null, id: string): Promise<void> {
  await invokeFunction('career-files', { body: { action: 'delete', id }, session });
}

/**
 * Download a Career file. The link is issued by the edge function at the
 * moment of the click, and the download is recorded in the activity log:
 * the templates tell members that downloads are tracked, and this is what
 * makes that true.
 */
export async function downloadCareerFile(session: Session | null, file: Pick<CareerFile, 'id' | 'file_name'>): Promise<void> {
  const res = await invokeFunction<{ url: string; file_name?: string }>('career-files', { body: { action: 'download', id: file.id }, session });
  if (!res?.url) throw new Error('The download could not be prepared. Please try again.');
  downloadFrom(res.url, res.file_name || file.file_name);
}

/** Download through a link, keeping the page where it is. */
export function downloadFrom(url: string, fileName: string) {
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  a.rel = 'noopener';
  document.body.appendChild(a);
  a.click();
  a.remove();
}

// ---------------------------------------------------------------------
// Saved GPA calculations (private to their owner).
// ---------------------------------------------------------------------

export interface SavedCalculation {
  id: string;
  name: string;
  system: string;
  settings: AverageSettings;
  courses: CourseRow[];
  average: number | null;
  total_weight: number | null;
  created_at: string;
  updated_at: string;
}

// The table is newer than the generated types; the one place that says so.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const sb = supabase as unknown as { from: (t: string) => any };

export async function listSavedCalculations(): Promise<SavedCalculation[]> {
  const { data, error } = await sb.from('gpa_calculations')
    .select('id, name, system, settings, courses, average, total_weight, created_at, updated_at')
    .order('updated_at', { ascending: false });
  if (error) throw new Error(error.message);
  return (data || []) as SavedCalculation[];
}

export async function saveCalculation(input: {
  id?: string; name: string; system: string; settings: AverageSettings; courses: CourseRow[];
  average: number | null; total_weight: number | null;
}): Promise<SavedCalculation> {
  const row = {
    name: input.name.trim().slice(0, 120),
    system: input.system,
    settings: input.settings,
    courses: input.courses.slice(0, 200),
    average: input.average,
    total_weight: input.total_weight,
  };
  const q = input.id
    ? sb.from('gpa_calculations').update(row).eq('id', input.id)
    : sb.from('gpa_calculations').insert(row);
  const { data, error } = await q.select('id, name, system, settings, courses, average, total_weight, created_at, updated_at').single();
  if (error) throw new Error(error.message);
  return data as SavedCalculation;
}

export async function deleteCalculation(id: string): Promise<void> {
  const { error } = await sb.from('gpa_calculations').delete().eq('id', id);
  if (error) throw new Error(error.message);
}
