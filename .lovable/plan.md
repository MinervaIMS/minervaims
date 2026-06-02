## Diagnosis

**Issue 1 — "Open report" looks wrong (still bordered/outlined like a ghost button)**

In `src/index.css` there are two competing rules for buttons inside the navy section:

- Line 234–235: `.rsec--navy .rbtn { border-color:rgba(255,255,255,.55); color:#fff; }` and `.rsec--navy .rbtn:hover { background:#fff; color:hsl(var(--accent)); border-color:#fff; }`
- Line 344–348: `.rbtn--onnavy { background:#fff; color:hsl(var(--accent)); border-color:hsl(var(--accent)); ... }` and its hover swap to purple bg / white text.

Specificity: `.rsec--navy .rbtn` = 0,2,0 wins over `.rbtn--onnavy` = 0,1,0. So the navy override always wins → the button renders transparent with a translucent white border (exactly what the screenshot shows), and on hover it goes white-bg/purple-text instead of the requested purple-bg/white-text.

**Issue 2 — White borders around report cards**

`.rcover` (line 238) and `.rcover--pdf` (line 262) set `background:#fff`. The PDF canvas rendered inside doesn't fill the container down to the last pixel (aspect-ratio rounding + canvas sizing), so the white background bleeds at the edges, producing the thin white border visible in the screenshot on the navy background.

## Fix

In `src/index.css`:

1. Raise specificity of the on-navy button rules so they beat `.rsec--navy .rbtn`:
   - Change `.rbtn--onnavy` → `.rsec--navy .rbtn.rbtn--onnavy` (default = white bg, purple text, purple border, squared corners).
   - Change the hover/focus/active block → `.rsec--navy .rbtn.rbtn--onnavy:hover, ...:focus-visible, ...:active, ....is-active` (purple bg, white text, white border).
   - Do the same for `.rbtn--onnavy-ghost` so the "Browse The Archive" button keeps its current look.

2. Remove the white edge on the report covers:
   - Set `.rcover` and `.rcover--pdf` `background` to `transparent` (or to `hsl(var(--accent))` so any sub-pixel gap matches the navy section instead of showing white).
   - Keep the existing box-shadow on `.v2-card .rcover`.

No component/JSX changes needed; this is purely CSS specificity + background color.

## Files

- `src/index.css` — update rules at lines 238, 262, 344–352.
