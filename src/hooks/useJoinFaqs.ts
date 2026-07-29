import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface JoinFaqEntry {
  id: string;
  question: string;
  answer: string;
  /** Optional inline routed link rendered beneath the answer. */
  linkLabel: string | null;
  linkHref: string | null;
}

export interface JoinFaqGroup {
  key: string;
  label: string;
  entries: JoinFaqEntry[];
}

interface Row {
  id: string;
  group_key: string;
  group_label: string;
  group_order: number;
  sort_order: number;
  question: string;
  answer: string;
  link_label: string | null;
  link_href: string | null;
}

/**
 * Reads the admissions FAQ from Supabase, grouped and ordered for rendering.
 * An empty result is a valid state: the page renders its heading and an
 * admin-only notice rather than an empty accordion.
 */
export function useJoinFaqs() {
  const [groups, setGroups] = useState<JoinFaqGroup[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let active = true;

    (async () => {
      try {
        const { data, error } = await supabase
          .from('join_faqs' as never)
          .select('id, group_key, group_label, group_order, sort_order, question, answer, link_label, link_href')
          .order('group_order', { ascending: true })
          .order('sort_order', { ascending: true });

        if (!active) return;
        if (error) {
          console.error('Error fetching join FAQs:', error);
          return;
        }

        const rows = (data ?? []) as unknown as Row[];
        const byGroup = new Map<string, JoinFaqGroup>();
        for (const row of rows) {
          if (!byGroup.has(row.group_key)) {
            byGroup.set(row.group_key, {
              key: row.group_key,
              label: row.group_label,
              entries: [],
            });
          }
          byGroup.get(row.group_key)!.entries.push({
            id: row.id,
            question: row.question,
            answer: row.answer,
            linkLabel: row.link_label,
            linkHref: row.link_href,
          });
        }
        setGroups([...byGroup.values()]);
      } catch (error) {
        console.error('Error fetching join FAQs:', error);
      } finally {
        if (active) setIsLoading(false);
      }
    })();

    return () => {
      active = false;
    };
  }, []);

  return { groups, isLoading };
}
