import type { Session } from '@supabase/supabase-js';
import { invokeFunction } from '@/lib/errors';

// =====================================================================
// The verified certificate of membership (edge function
// `membership-certificate`). A member downloads a PDF of the role they
// hold this semester, signed by the Board in office; anybody can confirm
// a certificate number on minervaims.org/verify.
// =====================================================================

export interface CertificateSummary {
  code: string;
  holder_name: string;
  role_label: string;
  semester_label: string;
  issued_at: string;
}

export interface CertificateStatus {
  eligible: boolean;
  /** Why not, in a sentence, when not eligible. */
  reason: string | null;
  semester_label: string;
  role_label: string | null;
  /** This semester's certificate for the current role, if already issued. */
  certificate: CertificateSummary | null;
}

export interface CertificateCheck {
  found: boolean;
  valid?: boolean;
  reason?: 'format' | 'unknown';
  code?: string;
  holder_name?: string;
  role_label?: string;
  semester_label?: string;
  issued_at?: string;
}

export function certificateStatus(session: Session | null): Promise<CertificateStatus> {
  return invokeFunction<CertificateStatus>('membership-certificate', { body: { action: 'status' }, session });
}

/** Asks for the PDF and saves it. Returns what was certified. */
export async function downloadCertificate(session: Session | null): Promise<CertificateSummary> {
  const res = await invokeFunction<{ certificate: CertificateSummary; file_name: string; pdf: string }>(
    'membership-certificate', { body: { action: 'issue' }, session },
  );
  const bin = atob(res.pdf);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  const url = URL.createObjectURL(new Blob([bytes], { type: 'application/pdf' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = res.file_name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
  return res.certificate;
}

export function verifyCertificate(code: string): Promise<CertificateCheck> {
  return invokeFunction<CertificateCheck>('membership-certificate', { body: { action: 'verify', code } });
}

/** The public page for a certificate number. */
export const verifyPath = (code: string) => `/verify/${encodeURIComponent(code)}`;
