import { supabase } from '@/integrations/supabase/client';

export type OrgDivision = 'equity' | 'investment' | 'macro' | 'portfolio' | 'quant' | 'operations' | 'media';

export const DIVISION_LABELS: Record<OrgDivision, string> = {
  equity: 'Equity Research',
  investment: 'Investment Research',
  macro: 'Macro Research',
  portfolio: 'Portfolio Management',
  quant: 'Quantitative Research',
  operations: 'Operations',
  media: 'Media',
};

export type ReportDeadline = {
  id: string;
  title: string;
  division: OrgDivision | null;
  due_date: string;
  notes: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const sb = supabase as unknown as { from: (t: string) => any };

export async function listDeadlines(): Promise<ReportDeadline[]> {
  const { data, error } = await sb.from('report_deadlines').select('*').order('due_date', { ascending: true });
  if (error) throw error;
  return (data || []) as ReportDeadline[];
}

export async function createDeadline(input: { title: string; division: OrgDivision | null; due_date: string; notes?: string | null }) {
  const { data: u } = await supabase.auth.getUser();
  const { data, error } = await sb.from('report_deadlines').insert({
    title: input.title,
    division: input.division,
    due_date: input.due_date,
    notes: input.notes ?? null,
    created_by: u.user?.id ?? null,
  }).select('*').single();
  if (error) throw error;
  return data as ReportDeadline;
}

export async function updateDeadline(id: string, patch: Partial<Pick<ReportDeadline, 'title' | 'division' | 'due_date' | 'notes'>>) {
  const { data, error } = await sb.from('report_deadlines').update(patch).eq('id', id).select('*').single();
  if (error) throw error;
  return data as ReportDeadline;
}

export async function deleteDeadline(id: string) {
  const { error } = await sb.from('report_deadlines').delete().eq('id', id);
  if (error) throw error;
}
