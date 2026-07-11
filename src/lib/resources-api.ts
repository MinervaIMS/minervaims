// =====================================================================
// resources-api — typed access for workspace_resources (the reusable
// file/link/note store). Reads via RLS (staff); writes via admin-resources.
// =====================================================================

import { supabase } from '@/integrations/supabase/client';
import type { Session } from '@supabase/supabase-js';
import type { OrgDivision } from '@/lib/roles';

export type ResourceType = 'text' | 'file' | 'link' | 'code' | 'other';

/** A single source inside an item. Its kind is inferred from the field used. */
export type ResourceSourceKind = 'text' | 'link' | 'file';
export interface ResourceSource {
  kind: ResourceSourceKind;
  /** Text body, URL, or stored file object-path. */
  value: string;
  /** Optional label — e.g. the original file name or a link title. */
  label?: string | null;
}

export interface ResourceRow {
  id: string;
  category: string;
  division: OrgDivision;
  type: ResourceType;
  title: string;
  description: string | null;
  /** New multi-source array (up to 5 texts + 5 links + 5 files). */
  sources: ResourceSource[];
  // Legacy single-source columns, still populated (first of each kind).
  file_url: string | null;
  link_url: string | null;
  body: string | null;
  is_favourite: boolean;
  author_name: string | null;
  author_role: string | null;
  created_at: string;
}

export interface ResourceInput {
  id?: string;
  category: string;
  division: OrgDivision;
  title: string;
  description?: string | null;
  sources: ResourceSource[];
  is_favourite?: boolean;
}

export const RESOURCE_TYPE_LABELS: Record<ResourceType, string> = {
  text: 'Text', file: 'File', link: 'Link', code: 'Code', other: 'Other',
};

export const SOURCE_KIND_LABELS: Record<ResourceSourceKind, string> = {
  text: 'Text', link: 'Link', file: 'File',
};

export const MAX_FAVOURITES = 5;
/** Per-item cap for each source kind, and the overall minimum. */
export const MAX_SOURCES_PER_KIND = 5;
export const MIN_SOURCES_PER_ITEM = 1;

/** Count sources of a given kind. */
export const countKind = (sources: ResourceSource[], kind: ResourceSourceKind) =>
  sources.filter((s) => s.kind === kind).length;

/** Normalise a row coming back from the DB into a guaranteed sources array. */
export function normalizeSources(row: Partial<ResourceRow>): ResourceSource[] {
  if (Array.isArray(row.sources) && row.sources.length > 0) {
    return row.sources.filter((s) => s && s.value && String(s.value).trim() !== '');
  }
  // Legacy row with only the single columns — fold them in.
  const out: ResourceSource[] = [];
  if (row.body && row.body.trim()) out.push({ kind: 'text', value: row.body });
  if (row.link_url && row.link_url.trim()) out.push({ kind: 'link', value: row.link_url });
  if (row.file_url && row.file_url.trim()) out.push({ kind: 'file', value: row.file_url });
  return out;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const sb = supabase as unknown as { from: (t: string) => any };

export async function listResources(category: string): Promise<ResourceRow[]> {
  const { data, error } = await sb.from('workspace_resources').select('*').eq('category', category).order('created_at', { ascending: false });
  if (error) throw new Error(error.message);
  return ((data || []) as ResourceRow[]).map((r) => ({ ...r, sources: normalizeSources(r) }));
}

async function invoke(session: Session | null, body: Record<string, unknown>) {
  const { data, error } = await supabase.functions.invoke('admin-resources', {
    body, headers: { Authorization: `Bearer ${session?.access_token}` },
  });
  if (error) throw error;
  if (data?.error) throw new Error(data.error);
  return data;
}

export function saveResource(session: Session | null, resource: ResourceInput) {
  return invoke(session, { action: resource.id ? 'update' : 'create', resource });
}
export function deleteResource(session: Session | null, id: string) {
  return invoke(session, { action: 'delete', id });
}
export function setResourceFavourite(session: Session | null, id: string, is_favourite: boolean) {
  return invoke(session, { action: 'favourite', id, is_favourite });
}
/** Get a short-lived signed URL for a stored file (private bucket). */
export async function signResourceFile(session: Session | null, file_url: string): Promise<string> {
  const data = await invoke(session, { action: 'sign', file_url });
  return data.url as string;
}
export async function uploadResourceFile(session: Session | null, file: File): Promise<string> {
  const fd = new FormData();
  fd.append('file', file);
  const { data, error } = await supabase.functions.invoke('admin-resources', {
    body: fd, headers: { Authorization: `Bearer ${session?.access_token}` },
  });
  if (error) throw error;
  if (data?.error) throw new Error(data.error);
  return data.file_url as string;
}
