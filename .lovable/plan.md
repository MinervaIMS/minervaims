## Problem

On `/statute`, above Article 1, there is a "preamble" block that renders:

1. An `<h2>` heading "Statute of the Minerva Investment Management Society (MIMS)" — this simply repeats the page H1 already shown in the hero ("Society Statute" + description).
2. A paragraph "Bilingual version — Italian (binding) / English. The Association is a non‑profit student association…".
3. An italic paragraph with the binding-language notice ("This Statute is originally drafted…" / Art. 28).

Two things make it look broken in both EN and IT:

- The block is rendered as a `.lp-section`, whose CSS grid reserves a 56px left column for the article number (`.lp-num`). The preamble has no number, so the heading sits shifted into the right column with an empty gutter on the left — visually misaligned versus the article list below.
- The long heading "Statute of the Minerva Investment Management Society (MIMS)" wraps awkwardly inside that narrow right column, producing an orphan line ("of the Minerva Investment Management Society (MIMS)") right above the "Bilingual version…" paragraph. That is the exact fragment the user quoted.
- The binding-language notice is rendered as a plain italic `<p>`, so it visually blends into the preamble paragraph instead of reading as a formal notice.

## Fix (frontend / presentation only)

Edit `src/pages/Statute.tsx`, replacing the current `<div className="lp-section" id="preamble">…</div>` block with a dedicated preamble block that:

- Does not use `.lp-section` (so no phantom 56px number gutter, no false article-style heading).
- Removes the duplicated "Statute of the Minerva Investment Management Society (MIMS)" heading — the hero already shows the title and description.
- Keeps the short intro sentence ("Bilingual version — Italian (binding) / English. The Association is…") as a lead paragraph.
- Presents the binding-language notice as a distinct callout with a small uppercase label ("Binding language" / "Lingua vincolante") and the sentence beneath it, separated from the intro and from Article 1 by a rule.

Add matching styles in `src/styles/legal-system.css` under the existing `.legal-doc` scope:

- `.lp-preamble` — full-width block (no grid), sits above the first `.lp-section`, with bottom border acting as the separator to Article 1.
- `.lp-preamble p.lead` — same body size as `.lp-content p`, no italic.
- `.lp-preamble .lp-notice` — bordered/inset callout using existing tokens (`--mims-line`, `--mims-muted`, `--mims-light-purple`) with:
  - a small uppercase `label` (Calibri, 12px, letter-spacing, muted purple),
  - the notice text (Calibri, normal weight, not italic, `--mims-ink`).
- Also add `.lp-preamble + .lp-section { border-top: none; padding-top: 6px; }` so Article 1 doesn't get a double top rule.

Copy strings to add to the `COPY` object in `Statute.tsx`:

- EN: `noticeLabel: 'Binding language'`
- IT: `noticeLabel: 'Lingua vincolante'`

The existing `preambleHeading` field becomes unused and is removed from the `COPY` type and both language entries.

## Files touched

- `src/pages/Statute.tsx` — replace preamble JSX, drop `preambleHeading`, add `noticeLabel`.
- `src/styles/legal-system.css` — add `.lp-preamble`, `.lp-preamble .lp-notice`, sibling-selector reset for the following `.lp-section`.

No changes to statute content, articles, TOC, routing, or business logic.
