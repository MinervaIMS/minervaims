import { Fragment, type ReactNode } from 'react';
import { dash } from '@/lib/design-system-md';

// =====================================================================
// The design system's README, drawn in the workspace's own type.
// ---------------------------------------------------------------------
// Brand & Design shows the design system package's README.md exactly as
// the package ships it (src/content/design-system/README.md), so a new
// edition of the package updates the page by replacing that one file.
// This reads the part of Markdown the README uses: headings, paragraphs,
// lists, tables, quotes, rules, and inline code, links, bold and italic.
//
// House style on the way in: the workspace sets no bold (a bold label is
// drawn as the navy serif the old page used) and no em dashes (between
// words one becomes a colon, which reads the same in every sentence of
// the README).
// =====================================================================

// ── inline ────────────────────────────────────────────────────────────

function inline(text: string, key = 'i'): ReactNode[] {
  const out: ReactNode[] = [];
  // code first, then links, bold, italic
  const re = /(`[^`]+`)|(\[[^\]]+\]\([^)]+\))|(\*\*[^*]+\*\*)|(\*[^*\s][^*]*\*)/g;
  let last = 0;
  let m: RegExpExecArray | null;
  let n = 0;
  while ((m = re.exec(text))) {
    if (m.index > last) out.push(dash(text.slice(last, m.index)));
    const tok = m[0];
    const k = `${key}-${n++}`;
    if (m[1]) {
      out.push(<code key={k} className="font-body text-[0.9em] text-accent bg-muted/60 px-1 break-words">{tok.slice(1, -1)}</code>);
    } else if (m[2]) {
      const lm = /^\[([^\]]+)\]\(([^)]+)\)$/.exec(tok)!;
      const href = lm[2];
      const external = /^https?:/.test(href);
      out.push(
        <a key={k} href={href} className="text-accent underline underline-offset-2" {...(external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}>
          {inline(lm[1], k)}
        </a>,
      );
    } else if (m[3]) {
      out.push(<span key={k} className="font-serif text-accent">{inline(tok.slice(2, -2), k)}</span>);
    } else if (m[4]) {
      out.push(<em key={k}>{inline(tok.slice(1, -1), k)}</em>);
    }
    last = m.index + tok.length;
  }
  if (last < text.length) out.push(dash(text.slice(last)));
  return out;
}

// ── blocks ────────────────────────────────────────────────────────────

type Block =
  | { t: 'p'; text: string }
  | { t: 'h3'; text: string }
  | { t: 'ul' | 'ol'; items: string[] }
  | { t: 'quote'; text: string }
  | { t: 'table'; head: string[]; rows: string[][] }
  | { t: 'hr' };

const cells = (row: string) => row.trim().replace(/^\||\|$/g, '').split('|').map((c) => c.trim());

function blocks(md: string): Block[] {
  const lines = md.split('\n');
  const out: Block[] = [];
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    if (!line.trim()) { i++; continue; }
    if (/^-{3,}\s*$/.test(line)) { out.push({ t: 'hr' }); i++; continue; }
    const h3 = /^###\s+(.+)$/.exec(line);
    if (h3) { out.push({ t: 'h3', text: h3[1].trim() }); i++; continue; }
    if (line.trim().startsWith('|')) {
      const rows: string[] = [];
      while (i < lines.length && lines[i].trim().startsWith('|')) rows.push(lines[i++]);
      const body = rows.filter((r) => !/^\s*\|?\s*:?-{2,}/.test(r));
      out.push({ t: 'table', head: cells(body[0] ?? ''), rows: body.slice(1).map(cells) });
      continue;
    }
    if (/^>\s?/.test(line)) {
      const q: string[] = [];
      while (i < lines.length && /^>\s?/.test(lines[i])) q.push(lines[i++].replace(/^>\s?/, ''));
      out.push({ t: 'quote', text: q.join(' ') });
      continue;
    }
    const bullet = /^[-*]\s+/;
    const numbered = /^\d+\.\s+/;
    if (bullet.test(line) || numbered.test(line)) {
      const kind = bullet.test(line) ? 'ul' : 'ol';
      const marker = kind === 'ul' ? bullet : numbered;
      const items: string[] = [];
      while (i < lines.length) {
        const l = lines[i];
        if (marker.test(l)) { items.push(l.replace(marker, '')); i++; continue; }
        if (/^\s{2,}\S/.test(l) && items.length) { items[items.length - 1] += ` ${l.trim()}`; i++; continue; }
        break;
      }
      out.push({ t: kind, items });
      continue;
    }
    const para: string[] = [];
    while (i < lines.length && lines[i].trim() && !/^(###\s|>|\||-{3,}\s*$|[-*]\s+|\d+\.\s+)/.test(lines[i])) para.push(lines[i++].trim());
    // A run of "**Label** text" lines is a list of definitions: one per line.
    if (para.length > 1 && para.every((p) => /^\*\*[^*]+\*\*/.test(p))) {
      para.forEach((p) => out.push({ t: 'p', text: p }));
    } else {
      out.push({ t: 'p', text: para.join(' ') });
    }
  }
  return out;
}

export function DesignSystemMarkdown({ source }: { source: string }) {
  return (
    <>
      {blocks(source).map((b, k) => {
        switch (b.t) {
          case 'hr': return null;
          case 'h3': return <h3 key={k} className="font-serif text-subheading text-accent mt-6 mb-3">{inline(dash(b.text), `h${k}`)}</h3>;
          case 'p': return <p key={k}>{inline(b.text, `p${k}`)}</p>;
          case 'quote': return <blockquote key={k} className="border-l-2 border-accent pl-4 italic text-muted-foreground">{inline(b.text, `q${k}`)}</blockquote>;
          case 'ul': return (
            <ul key={k} className="space-y-2">
              {b.items.map((it, j) => (
                <li key={j} className="relative pl-5">
                  {/* The system's bullet: a 6px navy square, never a disc. */}
                  <span className="absolute left-0 top-[0.62em] h-1.5 w-1.5 bg-accent" aria-hidden />
                  {inline(it, `u${k}-${j}`)}
                </li>
              ))}
            </ul>
          );
          case 'ol': return (
            <ol key={k} className="list-decimal pl-6 space-y-2 marker:text-accent marker:font-serif">
              {b.items.map((it, j) => <li key={j}>{inline(it, `o${k}-${j}`)}</li>)}
            </ol>
          );
          case 'table': return (
            <div key={k} className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr>
                    {b.head.map((h, j) => (
                      <th key={j} className="text-left font-body text-xs uppercase tracking-wider text-muted-foreground border-b border-separator pb-2 pr-4 font-normal">
                        {inline(h, `th${k}-${j}`)}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {b.rows.map((r, j) => (
                    <tr key={j}>
                      {r.map((c, x) => (
                        <td key={x} className={`align-top py-2 pr-4 border-b border-separator font-body text-small ${x === 0 ? 'text-accent' : 'text-muted-foreground'}`}>
                          <Fragment>{inline(c, `td${k}-${j}-${x}`)}</Fragment>
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          );
          default: return null;
        }
      })}
    </>
  );
}
