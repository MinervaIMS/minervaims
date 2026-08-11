# Fix the "+" button and card colour in the reports rail (divisions & funds)

## What is wrong

On the division and fund pages, the "Previously published" cards sit on the deep purple section. Two problems:

1. The "+" button is invisible at rest. A generic rule for buttons inside the reports section (`.rsec button { background: none; color: inherit }`) beats the "+" button's own styling, so the icon simply inherits the section's white text colour — white on a light card. On the homepage the same rail sits on a white section, where the inherited colour is near-black, so it stays visible there.
2. The cards use the grey surface at rest and only turn light lavender on hover.

## What changes

Both fixes are CSS-only, scoped to the purple ("navy") reports section used by every division page and every fund page. The homepage rail is untouched.

- The "+" icon is deep purple (the page accent) at rest, so it reads clearly on the light card. Hover stays exactly as it is today: purple filled disc with a white "+".
- The cards use the lavender `#ece9f4` at rest instead of the grey — the same colour they currently show on hover — including the closing "Browse the archive" card, so the row is one consistent colour. Hover keeps the cover lift.

## Technical detail

In `src/index.css`, inside the reports section block:

- Add `.rsec--navy .v3-card .rplus { color: hsl(var(--accent)); }` — specificity 0,2,0 beats `.rsec button`, and the existing `.rplus:hover` rule already outranks it, so hover is unaffected.
- Add `.rsec--navy .v3-card, .rsec--navy .v3-card:hover, .rsec--navy .v3-card:focus-within { background: #ece9f4; }` and the matching `.rsec--navy .v2-cta-frame` / `.v3-cta-coverhold` override so the CTA card matches.

No component, data, or logic changes.
