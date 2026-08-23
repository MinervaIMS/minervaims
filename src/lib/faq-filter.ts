import type { JoinFaqGroup } from '@/hooks/useJoinFaqs';

// =====================================================================
// faq-filter — one definition of "which questions am I looking at".
// ---------------------------------------------------------------------
// The admissions FAQ is now shown in two places: at the foot of the public
// /join page, and inside the workspace for candidates. They look different,
// because a public page and a workspace page should, but they must never
// disagree about WHICH questions match a search or belong to a category.
//
// So the content comes from one table through `useJoinFaqs`, and the
// filtering comes from here. The four macro-categories are not defined
// anywhere in code: they are the groups the data already has, in the order
// the data already gives them.
// =====================================================================

/** The category chips a surface should offer, straight from the data. */
export function faqCategories(groups: JoinFaqGroup[]): { key: string; label: string; count: number }[] {
  return groups.map((g) => ({ key: g.key, label: g.label, count: g.entries.length }));
}

/**
 * The groups as displayed.
 *
 * `category` of null means every category. `query` is matched with every
 * whitespace-separated word required, in any order, across the question, the
 * answer and any link label - so "deadline application" finds the same entry
 * as "application deadline", which is how people actually type.
 *
 * With no search and no category this returns the original array BY
 * IDENTITY, so an idle filter costs nothing and re-renders nothing.
 */
export function filterFaqGroups(
  groups: JoinFaqGroup[],
  query: string,
  category: string | null,
): JoinFaqGroup[] {
  const terms = query.toLowerCase().split(/\s+/).filter(Boolean);
  if (terms.length === 0 && !category) return groups;

  return groups
    .filter((g) => !category || g.key === category)
    .map((g) => (terms.length === 0 ? g : {
      ...g,
      entries: g.entries.filter((entry) => {
        const haystack = `${entry.question} ${entry.answer} ${entry.linkLabel ?? ''}`.toLowerCase();
        return terms.every((t) => haystack.includes(t));
      }),
    }))
    .filter((g) => g.entries.length > 0);
}

/** How many questions a filtered set holds. */
export function countFaqEntries(groups: JoinFaqGroup[]): number {
  return groups.reduce((n, g) => n + g.entries.length, 0);
}
