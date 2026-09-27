// =====================================================================
// The design system package's README, split into its chapters for
// Media & Communication, Brand & Design. See
// src/components/admin/brand/DesignSystemMarkdown.tsx for how it is drawn.
// =====================================================================

export interface MdChapter {
  /** "6" for "## 6 · Colour". */
  number: string;
  /** "6. Colour". */
  title: string;
  /** Anchor id, derived from the title. */
  id: string;
  /** The chapter's Markdown, without its heading. */
  body: string;
}

/** House style: no em dashes. Between words one reads as a colon; alone in a cell, as nothing. */
export const dash = (t: string) => t.replace(/\s+\u2014\s+/g, ': ').replace(/^\u2014$/, '').replace(/\u2014/g, ', ');

export const chapterId = (title: string) =>
  `ds-${title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')}`;

/** The introduction (before the first chapter) and the numbered chapters. */
export function splitReadme(md: string): { intro: string; chapters: MdChapter[] } {
  const lines = md.replace(/\r\n/g, '\n').split('\n');
  const chapters: MdChapter[] = [];
  const intro: string[] = [];
  let current: { number: string; title: string; lines: string[] } | null = null;
  for (const line of lines) {
    const h = /^##\s+(\d+)\s*·\s*(.+)$/.exec(line);
    if (h) {
      if (current) chapters.push(finish(current));
      current = { number: h[1], title: `${h[1]}. ${dash(h[2].trim())}`, lines: [] };
      continue;
    }
    if (/^#\s/.test(line)) continue; // the document's own title
    (current ? current.lines : intro).push(line);
  }
  if (current) chapters.push(finish(current));
  return { intro: intro.join('\n').trim(), chapters };
}

function finish(c: { number: string; title: string; lines: string[] }): MdChapter {
  return { number: c.number, title: c.title, id: chapterId(c.title), body: c.lines.join('\n').trim() };
}

