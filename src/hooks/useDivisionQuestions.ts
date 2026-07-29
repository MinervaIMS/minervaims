import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

export type DivisionQuestionKey = 'equity' | 'investment' | 'macro' | 'portfolio' | 'quant';

/**
 * The application_questions table ships with a placeholder row per division
 * ("... written question to be set by the Head of Division."). That wording is
 * scaffolding, not page copy, so it is treated as unset: the page shows its own
 * designed empty state until the Board publishes the real question.
 */
const isPlaceholder = (value: string) =>
  /to be set by the head of division/i.test(value) ||
  /^\s*(tbd|tba|n\/?a)\s*$/i.test(value);

export function useDivisionQuestions() {
  const [questions, setQuestions] = useState<Partial<Record<DivisionQuestionKey, string>>>({});
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let active = true;

    (async () => {
      try {
        const { data, error } = await supabase
          .from('application_questions' as never)
          .select('division, question');

        if (!active) return;
        if (error) {
          console.error('Error fetching division questions:', error);
          return;
        }

        const map: Partial<Record<DivisionQuestionKey, string>> = {};
        for (const row of (data ?? []) as unknown as { division: string; question: string }[]) {
          const question = row.question?.trim();
          if (!question || isPlaceholder(question)) continue;
          map[row.division as DivisionQuestionKey] = question;
        }
        setQuestions(map);
      } catch (error) {
        console.error('Error fetching division questions:', error);
      } finally {
        if (active) setIsLoading(false);
      }
    })();

    return () => {
      active = false;
    };
  }, []);

  const publishedCount = Object.keys(questions).length;

  return { questions, publishedCount, isLoading };
}
