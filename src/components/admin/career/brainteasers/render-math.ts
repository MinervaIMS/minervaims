import katex from 'katex';

// =====================================================================
// A question or a solution, as the reader should see it.
// ---------------------------------------------------------------------
// The text is a small, known grammar (the set was normalised before it
// was loaded):
//   * blocks separated by a blank line;
//   * a block that is "$$ ... $$" is displayed maths;
//   * "$...$" inside a line is inline maths, and "\$" is a dollar sign;
//   * a block starting "1." / "a)" / "-" / "•" is a list item;
//   * `code` in backticks.
// Everything that is not maths is HTML-escaped here, and the maths goes
// through KaTeX with `trust: false`, so a question written by an editor
// can never become markup on somebody else's screen.
// =====================================================================

const ESCAPES: Record<string, string> = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ESCAPES[c]);

function tex(body: string, display: boolean): string {
  try {
    return katex.renderToString(body, { displayMode: display, throwOnError: false, strict: false, trust: false, output: 'htmlAndMathml' });
  } catch {
    return `<code>${esc(body)}</code>`;
  }
}

/** Formulas up to this many characters stay on one line with their punctuation. */
const GLUE_MAX = 30;

function inline(text: string): string {
  let out = '';
  let i = 0;
  while (i < text.length) {
    const ch = text[i];
    if (ch === '\\' && text[i + 1] === '$') { out += '$'; i += 2; continue; }
    if (ch === '`') {
      const end = text.indexOf('`', i + 1);
      if (end !== -1) { out += `<code class="bt-code">${esc(text.slice(i + 1, end))}</code>`; i = end + 1; continue; }
    }
    if (ch === '$') {
      let j = i + 1;
      while (j < text.length && !(text[j] === '$' && text[j - 1] !== '\\')) j++;
      if (j < text.length && j > i + 1) {
        const body = text.slice(i + 1, j);
        // A short formula keeps the bracket before it and the punctuation
        // after it on its line: "is 1/16." never leaves the full stop
        // alone at the start of the next one. A long formula keeps its own
        // line breaks.
        const after = body.length <= GLUE_MAX ? (text.slice(j + 1).match(/^[.,;:!?)\]]+/)?.[0] ?? '') : '';
        const before = body.length <= GLUE_MAX && /[([]$/.test(out) ? out.slice(-1) : '';
        if (after || before) {
          out = out.slice(0, out.length - before.length) + `<span class="bt-nw">${before}${tex(body, false)}${esc(after)}</span>`;
          i = j + 1 + after.length;
        } else {
          out += tex(body, false);
          i = j + 1;
        }
        continue;
      }
    }
    if (ch === '*' && text[i + 1] === '*') {
      const end = text.indexOf('**', i + 2);
      if (end !== -1) { out += `<strong>${inline(text.slice(i + 2, end))}</strong>`; i = end + 2; continue; }
    }
    out += esc(ch);
    i++;
  }
  return out;
}

const MARKER = /^(\d+[.)]|[a-z][.)]|[IVXL]+[.)]|[-*+•])\s+/;

export function renderMathText(text: string): string {
  return text.replace(/\r\n?/g, '\n').split(/\n{2,}/).map((block) => {
    const s = block.trim();
    if (!s) return '';
    if (s.startsWith('$$') && s.endsWith('$$') && s.length > 4) {
      return `<div class="bt-display">${tex(s.slice(2, -2).trim(), true)}</div>`;
    }
    const m = s.match(MARKER);
    if (m) {
      const bullet = /^[-*+•]$/.test(m[1]) ? '•' : m[1];
      return `<p class="bt-item"><span class="bt-marker">${esc(bullet)}</span><span>${inline(s.slice(m[0].length).replace(/\n/g, ' '))}</span></p>`;
    }
    return `<p>${inline(s.replace(/\n/g, ' '))}</p>`;
  }).join('');
}
