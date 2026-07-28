import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

// =====================================================================
// /join content that the Board edits between intakes: the admissions FAQs
// and the written question set for each division.
//
// Both read paths degrade to an empty, non-broken state rather than to an
// error: the page renders its headings either way and surfaces an
// admin-only warning when the tables come back empty.
// =====================================================================

export type FaqGroup = 'eligibility' | 'application' | 'preparing' | 'membership';

export interface JoinFaq {
  id: string;
  group: FaqGroup;
  question: string;
  answer: string;
  /** Optional routed link rendered after the answer, e.g. Read The Statute. */
  linkLabel: string | null;
  linkTo: string | null;
}

export interface WrittenQuestion {
  division: string;
  label: string;
  /** Null or blank until the Board publishes the question for this intake. */
  question: string | null;
}

export const FAQ_GROUPS: { key: FaqGroup; title: string }[] = [
  { key: 'eligibility', title: 'Eligibility' },
  { key: 'application', title: 'The Application' },
  { key: 'preparing', title: 'Preparing' },
  { key: 'membership', title: 'Membership' },
];

interface FaqRow {
  id: string;
  faq_group: string;
  question: string;
  answer: string;
  link_label: string | null;
  link_to: string | null;
}

interface QuestionRow {
  division: string;
  label: string;
  question: string | null;
}

export function useJoinFaqs() {
  const [faqs, setFaqs] = useState<JoinFaq[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const { data, error } = await supabase
          .from('join_faqs' as never)
          .select('id, faq_group, question, answer, link_label, link_to')
          .eq('is_published', true)
          .order('faq_group', { ascending: true })
          .order('position', { ascending: true });

        if (cancelled) return;
        if (error) throw error;

        const rows = (data ?? []) as unknown as FaqRow[];
        setFaqs(
          rows.map((r) => ({
            id: r.id,
            group: r.faq_group as FaqGroup,
            question: r.question,
            answer: r.answer,
            linkLabel: r.link_label,
            linkTo: r.link_to,
          })),
        );
      } catch (error) {
        if (cancelled) return;
        console.error('Error fetching join FAQs:', error);
        setFailed(true);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  /** Entries in display order, grouped, with empty groups dropped. */
  const groups = FAQ_GROUPS.map((g) => ({
    ...g,
    entries: faqs.filter((f) => f.group === g.key),
  })).filter((g) => g.entries.length > 0);

  return { groups, isLoading, isEmpty: !isLoading && faqs.length === 0, failed };
}

export function useWrittenQuestions() {
  const [questions, setQuestions] = useState<WrittenQuestion[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const { data, error } = await supabase
          .from('join_written_questions' as never)
          .select('division, label, question')
          .order('position', { ascending: true });

        if (cancelled) return;
        if (error) throw error;

        const rows = (data ?? []) as unknown as QuestionRow[];
        setQuestions(
          rows.map((r) => ({
            division: r.division,
            label: r.label,
            question: r.question?.trim() ? r.question.trim() : null,
          })),
        );
      } catch (error) {
        if (cancelled) return;
        console.error('Error fetching written questions:', error);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  const anyPublished = questions.some((q) => q.question !== null);

  return { questions, isLoading, anyPublished };
}
