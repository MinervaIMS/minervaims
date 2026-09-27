import type { Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { invokeFunction } from '@/lib/errors';
import { downloadFrom } from '@/lib/career-api';

// =====================================================================
// The design system package on Brand & Design (edge function `brand-kit`).
// Private storage: downloads go through a one-minute signed link, and a
// replacement is sent straight to storage with a one-time upload link.
// =====================================================================

export interface BrandPackage {
  file_name: string;
  size_bytes: number | null;
  updated_at: string | null;
}

export async function brandKitStatus(session: Session | null): Promise<{ package: BrandPackage | null; can_manage: boolean }> {
  const res = await invokeFunction<{ package: BrandPackage | null; can_manage: boolean }>('brand-kit', { body: { action: 'status' }, session });
  return { package: res?.package ?? null, can_manage: !!res?.can_manage };
}

export async function downloadBrandKit(session: Session | null): Promise<void> {
  const res = await invokeFunction<{ url: string; file_name: string }>('brand-kit', { body: { action: 'download' }, session });
  if (!res?.url) throw new Error('The download could not be prepared. Please try again.');
  downloadFrom(res.url, res.file_name);
}

/** Replaces the package with a new ZIP. */
export async function uploadBrandKit(session: Session | null, file: File): Promise<void> {
  const name = file.name.toLowerCase();
  if (!name.endsWith('.zip')) throw new Error('The package must be a ZIP file.');
  if (file.size > 50 * 1024 * 1024) throw new Error('The package must be under 50 MB.');
  const link = await invokeFunction<{ bucket: string; path: string; token: string }>('brand-kit', { body: { action: 'upload-url' }, session });
  const { error } = await supabase.storage.from(link.bucket).uploadToSignedUrl(link.path, link.token, file, { contentType: 'application/zip', upsert: true });
  if (error) throw new Error(error.message);
}

export function formatSize(bytes: number | null): string {
  if (bytes == null) return '';
  return bytes >= 1024 * 1024 ? `${(bytes / (1024 * 1024)).toFixed(1)} MB` : `${Math.max(1, Math.round(bytes / 1024))} KB`;
}
