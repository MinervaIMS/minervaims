Four small changes to `/statute`.

## 1. Remove em dashes from the preamble

In `src/pages/Statute.tsx`, replace the em dash in both preamble strings with a colon:

- EN `preamble`: "Bilingual version: Italian (binding) / English. The Association is a non-profit student association promoted and managed by students of Università Bocconi, with registered office in Via Roberto Sarfatti 26/6, 20136 Milan (MI)."
- IT `preamble`: "Versione bilingue: italiano (vincolante) / inglese. L'Associazione è un'associazione studentesca senza scopo di lucro promossa e gestita da studenti dell'Università Bocconi, con sede legale in Via Roberto Sarfatti 26/6, 20136 Milano (MI)."

No other em dashes exist in the preamble/notice copy.

## 2. Render Art. 14 "The Board of Directors" table

The Board composition rows are currently stored in `bodyIt`/`bodyEn` of Art. 14 in `src/lib/statute-content.ts` as flat alternating strings ("Office", "Voting right", "President", "Yes, with double vote in case of tie", ...) so they render as a column of `<p>` tags with no table.

Fix in three parts:

**a. Extend the article body type** in `src/lib/statute-content.ts`:

```ts
export interface StatuteTableBlock {
  kind: 'table';
  header: [string, string];
  rows: [string, string][];
}
export type StatuteBlock = string | StatuteTableBlock;

export interface StatuteArticle {
  n: number;
  titleIt: string;
  titleEn: string;
  bodyIt: StatuteBlock[];
  bodyEn: StatuteBlock[];
}
```

**b. Rewrite Art. 14 bodies** so the header line ("Composition…") is followed by a single table block, then the rest of the paragraphs continue unchanged. Rows (both languages):

```text
Office / Carica                                     | Voting right / Diritto di voto
President / Presidente                              | Yes, with double vote in case of tie / Sì, con voto doppio in caso di parità
Vice-President / Vicepresidente                     | Yes / Sì
Head of Asset Management (where covered) / (se coperto) | Yes / Sì
Head of Equity Research                             | Yes / Sì
Head of Investment Research                         | Yes / Sì
Head of Macro Research                              | Yes / Sì
Head of Portfolio Management                        | Yes / Sì
Head of Quantitative Research                       | Yes / Sì
Head of Media & Communication                       | No / No
Head of Operations                                  | No / No
```

Only Art. 14 changes; every other article keeps its flat string arrays (they satisfy `StatuteBlock[]` automatically).

**c. Update the renderer** in `src/pages/Statute.tsx` — replace the `body.map((para, i) => <p>{para}</p>)` with a loop that checks `typeof block === 'string'` and renders a `<p>`, otherwise renders a `<div className="lp-table-scroll"><table>…</table></div>` using the existing `.lp-table-scroll` styles already present in `src/styles/legal-system.css`. Also pass `wide` to `LegalSectionBlock` for Art. 14 so the table gets full column width.

## 3. Tighten TOC line spacing (desktop only)

In `src/styles/legal-system.css` at the `.legal-doc .lp-toc a` rule (line 74–76), reduce vertical padding from `padding: 10px 0 10px 16px` to `padding: 5px 0 5px 16px` and set `line-height: 1.25`. This only affects the sticky desktop TOC (`.lp-toc`), not the mobile `.lp-toc-collapse` and not article content. Also add `font-size: 13px` to shave one more line off long entries like "Head of Media & Communication and Media Analyst" so the whole TOC fits in the viewport at desktop widths.

## 4. Keep hero title/description in English regardless of selected language

In `src/pages/Statute.tsx`, decouple hero copy from `lang`:

- `title` passed to `<LegalLayout>` and `<title>` / `og:title` metadata always uses the EN values ("Society Statute" and "The official statute of the Minerva Investment Management Society (MIMS).").
- Same for `metaTitle` / `metaDescription` — always EN.
- Language toggle continues to switch: `preamble`, `noticeLabel`, `bindingNote`, `langLabel`, and every article's title + body.

Practically: read `COPY.en` for `title` / `description` / `metaTitle` / `metaDescription`; read `COPY[lang]` for `preamble` / `noticeLabel` / `bindingNote` / `langLabel`.

## Files touched

- `src/lib/statute-content.ts` — new types, Art. 14 body restructured.
- `src/pages/Statute.tsx` — preamble copy (no em dash), hero always EN, renderer supports table blocks, `wide` on Art. 14.
- `src/styles/legal-system.css` — tighter `.lp-toc a` padding/line-height/font-size.

No route, data, or business logic changes.
