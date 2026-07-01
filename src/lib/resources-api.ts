// =====================================================================
// resources-api — typed access for workspace_resources (the reusable
// file/link/note store). Reads via RLS (staff); writes via admin-resources.
// =====================================================================

import { supabase } from '@/integrations/supabase/client';
import type { Session } from '@supabase/supabase-js';
import type { OrgDivision } from '@/lib/roles';

export type ResourceType = 'text' | 'file' | 'link' | 'code' | 'other';

export interface ResourceRow {
  id: string;
  category: string;
  division: OrgDivision;
  type: ResourceType;
  title: string;
  description: string | null;
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
  type: ResourceType;
  title: string;
  description?: string | null;
  file_url?: string | null;
  link_url?: string | null;
  body?: string | null;
  is_favourite?: boolean;
}

export const RESOURCE_TYPE_LABELS: Record<ResourceType, string> = {
  text: 'Text', file: 'File', link: 'Link', code: 'Code', other: 'Other',
};

export const MAX_FAVOURITES = 5;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const sb = supabase as unknown as { from: (t: string) => any };

export async function listResources(category: string): Promise<ResourceRow[]> {
  const { data, error } = await sb.from('workspace_resources').select('*').eq('category', category).order('created_at', { ascending: false });
  if (error) throw new Error(error.message);
  return (data || []) as ResourceRow[];
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
