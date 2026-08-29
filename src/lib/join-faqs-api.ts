import { supabase } from '@/integrations/supabase/client';
import type { Session } from '@supabase/supabase-js';

// =====================================================================
// join-faqs-api — the admissions FAQ, as the workspace manages it.
// ---------------------------------------------------------------------
// The same rows the public /join page and the applicant's own FAQs page
// already read through `useJoinFaqs`. Reading is open (the page is
// public); every write goes through the `admin-join-faqs` edge function,
// which checks the role and re-applies the rules the table promises.
//
// ONE TABLE, TWO SURFACES, AND NOW ONE PLACE TO EDIT IT. Until now the
// questions could only be changed in the database: there was no screen
// for them anywhere, so a change to the admissions FAQ meant asking
// somebody with SQL access. This is that screen's data layer.
// =====================================================================

/** The four macro-categories the table's CHECK constraint allows. */
export const FAQ_GROUPS = [
  { key: 'eligibility', label: 'Eligibility', order: 1 },
  { key: 'process', label: 'The process', order: 2 },
  { key: 'preparing', label: 'Preparing', order: 3 },
  { key: 'membership', label: 'Membership', order: 4 },
] as const;

export type FaqGroupKey = (typeof FAQ_GROUPS)[number]['key'];

export const isFaqGroupKey = (k: string): k is FaqGroupKey =>
  FAQ_GROUPS.some((g) => g.key === k);

export interface JoinFaqRow {
  id: string;
  group_key: FaqGroupKey;
  group_label: string;
  group_order: number;
  sort_order: number;
  question: string;
  answer: string;
  link_label: string | null;
  link_href: string | null;
  is_published: boolean;
}

export type JoinFaqInput = Omit<JoinFaqRow, 'id' | 'group_label' | 'group_order'> & { id?: string };

export const EMPTY_FAQ = (group: FaqGroupKey): JoinFaqInput => ({
  group_key: group,
  sort_order: 0,
  question: '',
  answer: '',
  link_label: null,
  link_href: null,
  is_published: true,
});

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const sb = supabase as unknown as { from: (t: string) => any };

/**
 * Every question, published or not, in the order the page shows them.
 *
 * NOT the public read. `useJoinFaqs` filters to published rows by RLS,
 * which is right for a visitor and wrong for an editor: an unpublished
 * question that cannot be seen cannot be published again. This goes
 * through the edge function, which returns the lot.
 */
export async function listAllFaqs(session: Session | null): Promise<JoinFaqRow[]> {
  const data = await invoke(session, { action: 'list' });
  return (data?.faqs ?? []) as JoinFaqRow[];
}

async function invoke(session: Session | null, body: Record<string, unknown>) {
  const { data, error } = await supabase.functions.invoke('admin-join-faqs', {
    body, headers: { Authorization: `Bearer ${session?.access_token}` },
  });
  if (error) throw error;
  if (data?.error) throw new Error(data.error);
  return data;
}

export function saveFaq(session: Session | null, faq: JoinFaqInput) {
  return invoke(session, { action: 'save', faq });
}

export function deleteFaq(session: Session | null, id: string) {
  return invoke(session, { action: 'delete', id });
}

/**
 * Move one question within its category, or into another one.
 *
 * The order is expressed as the full list of ids in their new sequence
 * rather than as a single "move up" instruction, because `sort_order` is
 * UNIQUE per group: shifting one row means renumbering its neighbours,
 * and doing that a row at a time collides with the constraint halfway
 * through. The server renumbers the whole group in one transaction.
 */
export function reorderFaqs(session: Session | null, group: FaqGroupKey, ids: string[]) {
  return invoke(session, { action: 'reorder', group, ids });
}

/** Read the public row set the way a visitor sees it, for the preview count. */
export const groupLabel = (key: FaqGroupKey): string =>
  FAQ_GROUPS.find((g) => g.key === key)?.label ?? key;

export const groupOrder = (key: FaqGroupKey): number =>
  FAQ_GROUPS.find((g) => g.key === key)?.order ?? 99;
