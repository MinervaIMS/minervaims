// =====================================================================
// Shared types and helpers for the Reading Recommendations bookcase.
// The Reading shape mirrors the Supabase `readings` table exactly; no
// field is invented here and nothing is rendered that is not on the
// record (publication_year appears only for academic papers).
// =====================================================================

export type ReadingType = 'academic_papers' | 'technical_textbooks' | 'free_time_readings';

export interface Reading {
  id: string;
  title: string;
  author: string;
  description: string;
  reading_type: ReadingType;
  contributor_name: string;
  contributor_surname: string;
  contributor_role: string;
  display_order: number;
  created_at: string;
  publication_year?: number | null;
}

// Fixed left-to-right order of the bookcase columns.
export const READING_TYPE_ORDER: ReadingType[] = [
  'academic_papers',
  'technical_textbooks',
  'free_time_readings',
];

export const readingTypeLabels: Record<ReadingType, string> = {
  academic_papers: 'Academic Papers',
  technical_textbooks: 'Technical Textbooks',
  free_time_readings: 'Free Time Readings',
};

export function readingAuthorLine(r: Reading): string {
  const year =
    r.reading_type === 'academic_papers' && r.publication_year ? ` (${r.publication_year})` : '';
  return `by ${r.author}${year}`;
}

// Same matching rule the page has always used for the search input.
export function readingMatchesSearch(r: Reading, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  return (
    r.title.toLowerCase().includes(q) ||
    r.author.toLowerCase().includes(q) ||
    r.description.toLowerCase().includes(q) ||
    `${r.contributor_name} ${r.contributor_surname}`.toLowerCase().includes(q)
  );
}

// Deterministic spine geometry derived from the record id, so every
// shelf looks naturally uneven yet never reshuffles between renders.
export function spineGeometry(id: string): { w: number; h: number } {
  let h = 5381;
  for (let i = 0; i < id.length; i++) h = ((h << 5) + h + id.charCodeAt(i)) | 0;
  const a = Math.abs(h);
  return {
    w: 26 + (a % 4) * 4, // 26 to 38px
    h: 86 + (Math.floor(a / 7) % 5) * 6, // 86 to 110px
  };
}
