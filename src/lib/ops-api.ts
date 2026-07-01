// =====================================================================
// ops-api — Operations: membership fees, treasury, auto emails.
// =====================================================================

import { supabase } from '@/integrations/supabase/client';
import type { Session } from '@supabase/supabase-js';
import type { OrgDivision, AppRole } from '@/lib/roles';

export interface FeePeriod { id: string; semester_label: string; fee_amount: number; closed: boolean; closed_at: string | null; first_deadline: string | null; second_deadline: string | null; }
export interface FeeMember { id: string; first_name: string; surname: string; division: OrgDivision; role: AppRole; phone: string | null; email: string | null; }
export interface MembershipFeeRow { id: string; period_id: string; member_id: string; paid: boolean; }

export interface TreasuryEntry {
  id: string; amount: number; flow: 'in' | 'out'; description: string; source: string | null;
  execution_date: string; registration_date: string; academic_semester: string | null;
  is_auto: boolean; locked: boolean; created_at: string;
}
export interface TreasuryInput { amount: number; flow: 'in' | 'out'; description: string; source?: string | null; execution_date: string; }

export interface AutoTemplate { id: string; key: string; name: string; subject: string; body: string; description: string | null; file_url: string | null; connected: boolean; updated_at: string; }
export interface EmailLogRow { id: string; template_name: string; recipient_email: string; status: string; created_at: string; }

async function invoke(fn: string, session: Session | null, body: Record<string, unknown>) {
  const { data, error } = await supabase.functions.invoke(fn, { body, headers: { Authorization: `Bearer ${session?.access_token}` } });
  if (error) throw error;
  if (data?.error) throw new Error(data.error);
  return data;
}

// Fees
export async function getCurrentFees(session: Session | null): Promise<{ period: FeePeriod | null; members: FeeMember[]; fees: MembershipFeeRow[] }> {
  return await invoke('admin-fees', session, { action: 'current' });
}
export function openFeePeriod(session: Session | null, semester_label: string, fee_amount: number, first_deadline: string, second_deadline: string | null) {
  return invoke('admin-fees', session, { action: 'open', semester_label, fee_amount, first_deadline, second_deadline });
}
export function setFeePaid(session: Session | null, period_id: string, member_id: string, paid: boolean) {
  return invoke('admin-fees', session, { action: 'set-paid', period_id, member_id, paid });
}
export function closeFeePeriod(session: Session | null, period_id: string) {
  return invoke('admin-fees', session, { action: 'close', period_id });
}
export async function feeHistory(session: Session | null): Promise<FeePeriod[]> {
  return (await invoke('admin-fees', session, { action: 'history' })).periods;
}

// Treasury
export async function listTreasury(session: Session | null): Promise<TreasuryEntry[]> {
  return (await invoke('admin-treasury', session, { action: 'list' })).entries;
}
export function addTreasuryEntry(session: Session | null, entry: TreasuryInput) {
  return invoke('admin-treasury', session, { action: 'add', entry });
}

// Auto emails
export async function getAutoEmails(session: Session | null): Promise<{ templates: AutoTemplate[]; log: EmailLogRow[] }> {
  return await invoke('admin-auto-emails', session, { action: 'list' });
}
export function saveAutoTemplate(session: Session | null, template: Partial<AutoTemplate> & { id: string }) {
  return invoke('admin-auto-emails', session, { action: 'save-template', template });
}
export function createAutoTemplate(session: Session | null, template: { name: string; description?: string | null; file_url?: string | null }) {
  return invoke('admin-auto-emails', session, { action: 'create-template', template });
}
export async function uploadAutoEmailFile(session: Session | null, file: File): Promise<string> {
  const fd = new FormData();
  fd.append('file', file);
  const { data, error } = await supabase.functions.invoke('admin-auto-emails', {
    body: fd, headers: { Authorization: `Bearer ${session?.access_token}` },
  });
  if (error) throw error;
  if (data?.error) throw new Error(data.error);
  return data.file_url as string;
}
