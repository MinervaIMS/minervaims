# Minerva Investment Management Society — Design System

The central visual reference for MIMS: the public website, the member workspace, research
publications, presentations, documents, social media and any future asset — human-made or
AI-generated. It is reverse-engineered from the live implementation
([`MinervaIMS/minervaims`](https://github.com/MinervaIMS/minervaims)) and the brand kit, then
formalised so that everything the Society produces is recognisably one organisation.

Read this document first. Then open the **Design System tab** for live specimens of every
foundation and component, `colors_and_type.css` for the tokens, and `templates/` for
ready-made starting points.

---

## 1 · The organisation

MIMS is the student association at **Bocconi University** dedicated to asset management.
**Founded in 2017**, it is Bocconi's first and only association running student-managed
*virtual funds* with processes, reports and disclosures that replicate professional standards.
It is structured like an investment firm — five research divisions feeding a central Portfolio
Management team.

| Division | Focus |
|---|---|
| **Equity Research** | Fundamental analysis of listed companies — business models, valuation, theses with catalysts & risks |
| **Investment Research** | Cross-asset views (equity, fixed income, FX, commodities), global outlook, trade ideas |
| **Macro Research** | Monetary policy, the global cycle, structural trends and their market implications |
| **Portfolio Management** | Runs the virtual funds — construction, rebalancing, risk management, reporting |
| **Quantitative Research** | Statistical & ML models, derivatives pricing, risk measures (CVaR/EVaR), forecasting |

**Active funds:** *Multi-Asset Global Opportunities Fund* and the *Long-Short Equity Fund*.
(Closed: *Diversified Passive Selection*, *Italian Equity PIR*.) Reports are published at
**minervaims.org** — public pages: `/` · `/about` · `/divisions/*` · `/funds/*` · `/people/*` ·
`/events` · `/archive` · `/readings` · `/join` · `/alumni` · `/partnerships` · legal pages.
Members also use the **Minerva Workspace** (`/admin`), an internal application with its own
rules — see §14.

### Audience — three concentric circles
1. **Bocconi students (core)** — 19–24, international, ambitious, finance-oriented. Readers of the
   publications and the pool of future members.
2. **Alumni & current members** — now at Goldman, JPMorgan, McKinsey, hedge funds. They value
   rigour, continuity and institutional seriousness.
3. **Industry & academia** — professionals, professors, potential partners. They must perceive
   credibility and competence.

---

## 2 · Core identity principles

Six rules. Everything else in this document follows from them.

1. **Institutional, not promotional.** The work looks like a research house, not a student club.
   Restraint reads as competence.
2. **One accent.** Deep navy `#1F0F4D` on white, plus greys. If a design seems to need a second
   colour, it needs less content.
3. **Sharp.** `--radius: 0`. Zero border-radius on everything except true circles. This is the
   single most recognisable trait of the identity.
4. **Hairlines, not boxes.** A 1px `#D9D9D9` rule under a heading does the structural work that
   borders and cards do elsewhere.
5. **Serif authority, sans clarity.** Serif headings, sans body — in every medium, without
   exception.
6. **Motion confirms, never entertains.** Quick, restrained, purposeful; and everything must read
   correctly with animation frozen.

---

## 3 · Content fundamentals — how MIMS writes

**Language:** English for *all* public content. **British spelling** — organised, programme,
specialised, centres.

**Voice:** authoritative, direct, free of inflated rhetoric. Written by intelligent people for
intelligent people. MIMS is serious because its content is serious, not because it says so.

**Register:** formal but not bureaucratic. No slang, no forced enthusiasm, no superlatives you
cannot evidence.

**Lead with substance.** Headings are plain nouns — *"What We Do"*, *"Our Divisions"*,
*"Fund Overview"*, *"Latest Reports"*. No taglines, no exclamation marks, no rhetorical questions
("Ready to join?" is off-brand).

**Casing.** Serif H2s: Title Case. Navigation and buttons: frequently ALL CAPS with wide tracking.
Eyebrows and stat labels: UPPERCASE, 0.08–0.22em tracking.

**Person:** institutional first-person plural — *"We are organised as an investment management
firm"*. Speaks about *members*, *the Society*, *the team*.

**Emoji: never.** Anywhere, including social copy.

**Numbers:** stats appear as an animated count-up to a round figure + "+" (*"120+ Research
Reports"*) with an uppercase label. Three key figures maximum on a page.

**Disclaimer:** every artefact touching fund performance carries the standing note — the funds are
virtual and educational, and MIMS is independent of Bocconi University.

---

## 4 · Logo, marks and iconography

| Asset | Use |
|---|---|
| `assets/logo-mark-color.png` | Navy *M* mark (two Ionic columns flanked by lions) on light backgrounds |
| `assets/logo-mark-white.png` | White *M* mark on dark, navy or photographic backgrounds |
| `assets/logo-full-color.png` | Full lock-up (mark + society name), light backgrounds |
| `assets/logo-full-white.png` | Full lock-up, dark backgrounds — the footer lock-up, 144–192px tall |
| `assets/community-logo.png` | Lion-head Community/Alumni badge (navy circle) |
| `assets/cta-lion.png` | Round white lion badge for calls to action |
| `assets/linkedin-black.svg` · `linkedin-white.svg` | LinkedIn icon, 65×65px |
| `assets/instagram-black.svg` · `instagram-white.svg` | Instagram icon, 65×65px |

**Rules.** Keep clear space of at least the mark's cap-height on all sides. Never recolour outside
navy/white, never stretch, rotate, outline or add effects. On photographs the white mark carries a
`drop-shadow` filter for legibility. On the site the header shows the white mark when transparent
over a hero and the navy mark when solid.

**Icons: [Lucide](https://lucide.dev)** only — thin, consistent stroke, 14–36px, default weight.
The only Unicode glyphs in the system are the dropdown caret `▾`/`▴` and the `+` on a report cover.
Never emoji as icons. Never a second icon library.

---

## 5 · Typography

- **Serif — authority.** Times New Roman is self-hosted here and leads `--font-serif`. The live
  website renders **EB Garamond** first (`--font-serif-web`) because TNR is not self-hosted there.
  Use `--font-serif-web` when matching the site exactly; `--font-serif` for print and DS artefacts.
- **Sans — legibility.** **Calibri**, substituted on the web by **Carlito** (open metric clone).
  Body, captions, footnotes, tables, chart labels, UI controls.
- **LaTeX** for mathematics in quantitative content.
- Headings carry tight tracking (−0.01 to −0.02em) and sit at weight 400 — the serif does the work,
  not the weight. **There is exactly one weight in the system: 400.** Nothing is ever bold,
  semibold or medium — not headings, not report-cover titles, not table headers, not `<b>`/
  `<strong>`. Emphasis is made with colour (navy), capitals with 0.08–0.22em tracking, size,
  italic, or a hairline rule. `colors_and_type.css` forces `font-weight: 400` on the elements
  browsers embolden by default and disables faux-bold synthesis, so a stray weight cannot smear
  the serif. In PowerPoint, Word and Canva: turn bold **off** and raise the size instead.

| Token | Size | Role |
|---|---|---|
| `--text-hero` | 64px | Hero headline, key figures |
| `--text-display` | 48px | H1 |
| `--text-heading` | 32px | Section H2 (fluids down to 26px on narrow viewports) |
| `--text-subheading` | 24px | H3, footer headings |
| `--text-body-lg` | 18px | Lead paragraphs |
| `--text-body` | 16px | Body |
| `--text-small` | 14px | Captions |
| `--text-xs` | 12px | Fine print, disclaimers |

Nav links are **19px** — deliberately between body-lg and subheading, to keep the header compact.
Presentation scale (`--slide-title` 112 / `--slide-heading` 72 / `--slide-sub` 44 /
`--slide-body` 32 / floor 24px) is in §11. Print floor is 12pt.

---

## 6 · Colour

**Core.** Navy `#1F0F4D` is the entire accent system. White `#FFFFFF` is the page. Ink `#141414` is
body text and non-footer dark blocks. Pure black `#000000` is the footer only — deliberately
blacker than ink so iOS overscroll matches.

**Greys, and only these.** `#F5F5F5` the single light surface · `#D9D9D9` hairline separators ·
`#E0E0E0` UI chrome borders (header, dropdowns, inputs) · `#737373` secondary text. Separator and
border are *different roles*; do not conflate them.

**Extended purple ramp** — the identity is one hue family, and this is all of it:
`#05030F` void (animated backdrops) · `#150B33` deep navy (division pages) · `#1F0F4D` navy ·
`#241068` alumni accent · `#7E5BC2` mid purple (dot field, chart 3) · `#AFA2D2` light purple
(text on navy, chart 2) · `#ECE9F4` tint (the hover tint). Never invent a purple outside it.

**Status — colour is a signal, never decoration.** Three signals: positive `#047857` (a permission
held, a step completed), caution `#F59E0B` (read before acting), destructive `#E5484D`. Each has a
pale wash for callout backgrounds.

**Chart palette, ordered:** `--chart-1` … `--chart-6` = navy, light purple, mid purple, grey,
alumni navy, pale lavender. Take them in sequence; never reorder for variety.

**Page-scoped accents.** `.mims-theme-alumni` and `.mims-theme-division` swap `--accent` for those
page families; everything else inherits unchanged.

---

## 7 · Layout, spacing and grid

- **Container 1280px**, centred, 1.5rem gutters. Nothing wider.
- **Vertical rhythm in two steps only:** section = 8rem (128px), section-sm = 5rem (80px).
- **Header** fixed at 84px; mobile breakpoint **880px** (not 768px); logo 52px tall.
- **Grids:** 2/3/4/5-up with 1rem gaps for tiles; 1.5–2rem for content columns. Collapse 5→2→1.
- **Measure:** body copy capped at 48rem, leads at 36rem.
- **Alignment:** left, always. Centre only inside a tile, a circle, or a social post's statement.
- **The standard section:** serif heading + hairline + one paragraph at the measure + an outline CTA
  pushed right on wide screens. That single arrangement carries most of the website.
- `html` has `scrollbar-gutter: stable` and a black background (iOS overscroll); `body` is
  transparent with `min-height: 100dvh` and a black safe-area band pinned by `body::after`.

---

## 8 · Surfaces & background systems

**Five surfaces, and a page alternates between them:**

| Surface | Colour | Use |
|---|---|---|
| paper | `#FFFFFF` | The default reading surface |
| muted | `#F5F5F5` | Quiet bands, tile fields, alternating sections |
| navy | `#1F0F4D` | One emphasis band per page — reports, testimonials, closing |
| ink | `#141414` | Rare inverted blocks |
| void | `#05030F` | Backdrop for animated backgrounds only |

Never two navy bands in a row. Never more than one animated surface per screen. Never a pattern
*and* an animation on the same section.

**Photographic heroes.** Full-bleed `.webp` — cool, desaturated, serious images of finance,
architecture and Bocconi. The photo is shown **true to colour**; a **dark-purple shade is
composited as a separate layer on top** (`--hero-overlay` / `--intro-overlay`). Never bake the tint
into the image, never use a neutral black scrim. White serif type with a heavy drop shadow sits over
the shade.

**Static patterns** (`PatternField`) — printable, zero-JS, always radially fade-masked:
`dots` fills empty space with texture · `grid` signals structure (diagrams, data) · `rules` gives
rhythm to covers and section breaks. Scale 2–3× on slides and posters.

**Animated backgrounds.** Two, each with a job:

- **Beams** (`BeamsBackground`) — the *dark* environment. Soft light-purple planes drifting one way
  over the void at 30°, 18–34s per cycle, with a vignette that keeps the centre readable. Used for
  **member-facing** dark moments: sign in, sign up, password reset, event registration, dark deck
  openers. Never behind body copy — a white card sits on top. Never on a light surface, never above
  0.7 intensity, never two on one screen.
- **Dot field** (`DotFieldBackground`) — the *application* environment. A 1px purple dot grid at
  17px spacing that bulges away from the cursor and eases back; it is still when the reader is
  still. Used **only** for the application journey (`/join` → the form → confirmation), so applying
  feels like one continuous act. Cursor bloom off by default.

**Behaviour, in full** — speed, direction, intensity, loop, mobile/desktop and reduced-motion
rules — is documented in the *Animated Background Behaviour* card in the Design System tab.

---

## 9 · Motion

**The numbers.** `--dur-fast` 200ms (button fills, underlines, colour shifts) · `--dur-base` 320ms
(card hovers, tile lifts, header crossfade, cover lift-and-tilt) · `--dur-slow` 550ms (a state that
must be *seen* changing: a step lighting) · `--dur-reveal` 900ms (one-off entrance: the help
button's ignition) · `--dur-draw` 1000ms (a line drawing itself: the process spine) ·
`--stagger-step` 400ms between sequenced steps (first fires 250ms after entering view) ·
`--stagger-item` 34ms between siblings in a revealed group, twelve items maximum.

**The easings.** `--ease-standard` `cubic-bezier(.22,.61,.36,1)` for every UI transition ·
`--ease-spring` `cubic-bezier(.22,1,.36,1)` for entrances that should feel arrived-at ·
`--ease-camera` `cubic-bezier(.32,.72,0,1)` for long pans and zooms only · `--ease-exit` for things
leaving.

**The six approved keyframes** (`motion.css`): `fade`, `rise`, `slide-down`, `ignite`, `drift`,
`breathe`. Anything outside this list is off-brand. No bounce, no parallax, no pulsing, no
attention-seeking loops on interface elements.

**Signature motions.** Animated count-ups on key figures · card hover lift `translateY(-6px)
rotate(-1deg)` on report covers · tile lift `translateY(-4px)` with a navy fill · the scale-x
underline on text links · header transparent↔solid crossfade · the process spine lighting in
sequence · the help button's single halo ignition · testimonials sliding in from ±40px over 1.5s
with `--ease-spring`, auto-advancing every ~15.7s.

**Reduced motion is mandatory** and resolves to the **final** state — a lit spine, never an empty
one. Animated backgrounds freeze on a still frame; they are never removed or left blank.

---

## 10 · Graphic details — the parts that look secondary and are not

- **Hairline** — 1px `#D9D9D9` under every section heading and between key-figure columns. The most
  used graphic element in the system.
- **Borders** — 1px `#E0E0E0` on UI chrome only (header bottom, dropdown frames, inputs).
- **Rings** — 1.5px navy on an unreached step or hollow circle; 1px `#D9D9D9` on a minor step or an
  inline help dot.
- **Halo / glow** — `--halo-lit`: `0 0 0 6px rgba(31,15,77,.10), 0 10px 28px rgba(31,15,77,.30)`.
  It means *"live"*. **Circles only** — never on a rectangle.
- **Shadows** — three tiers plus two paper tiers: `subtle`, `elevated`, `card-hover`, `cover`
  (report paper), `float` (a white card over an animated background). Resting state is **no
  shadow**; elevation is earned on interaction.
- **Dividers** — `mims-rule` (hairline), `--strong` (navy), `--short` (64px, 2px, navy — a section
  mark), `--dark` (on navy).
- **Bullets** — a 6px navy **square**, never a disc.
- **Gradients** — exactly two are approved: the progress fill (navy → light purple, on spines and
  rails) and the photo shade. No gradient anywhere else, ever.
- **Blur** — only the fixed transparent header and the member-only page gate
  (`blur(20px) saturate(.5)`). No frosted-glass panels.
- **Focus** — 2px navy outline at 3px offset. Never removed.

---

## 11 · Non-web outputs

| Artefact | Size | Notes |
|---|---|---|
| Slide | 1920 × 1080 | 96px margins · title 112 / heading 72 / sub 44 / body 32 / **floor 24px** |
| Instagram feed | **1080 × 1350** | The default post — 4:5 portrait, 88px margins, one statement, one supporting line, lock-up footer |
| Instagram square | 1080 × 1080 | Carousels and grid-consistency sets only |
| Instagram story | 1080 × 1920 | Keep the top 250px and bottom 320px clear of type |
| LinkedIn card | 1200 × 627 | 64px margins, title ≤ 12 words |
| Report cover | A4, 1 : 1.414 | Navy head-rule, lock-up, division eyebrow, serif title, chart, hairline footer |
| Document | A4 / Letter | 20mm margins, 12pt body minimum, serif headings, hairline rules, source footnotes |
| Poster / event | A3 or 1080 × 1350 | Photo + purple shade, or void + pattern at 3× scale |

**Deck grammar.** Navy title slide → paper content slides → navy divider between chapters → at most
one quote slide → navy closing → **disclaimer slide (mandatory, always last)**. The two main slides (title and
closing) carry the full lock-up in the top-right corner (300px tall) and no corner mark; every other slide carries the simple
mark in the top-right corner. One idea per slide; three paragraphs means two slides.

**Document grammar.** Masthead with the navy rule, uppercase division eyebrow, serif title,
one-line thesis, authors and reviewer, an abstract callout, numbered serif section headings over
hairlines, house-style charts with source notes, a data table with an uppercase hairline header row,
and the standing disclaimer in justified fine print.

**Social grammar.** Eyebrow → hairline → serif statement → one supporting line → lock-up footer.
One idea per post. A carousel keeps one theme across every slide and varies only the statement.
Photographs always take the purple scrim.

---

## 12 · Components

Reusable React primitives. Each lives at `components/<group>/<Name>.jsx` with a sibling `.d.ts`
(prop documentation) and `.prompt.md` (usage rules). Load them from `_ds_bundle.js` as
`window.<Namespace>.<Name>`.

**Buttons** — `Button` (primary · outline · solid · ghost · link)
**Typography** — `SectionTitle` (serif H2 + hairline)
**Layout** — `PageIntro` (full-bleed photo hero + purple shade)
**Backgrounds** — `SectionSurface` (the five surfaces + rhythm + container) · `PatternField`
(dots · grid · rules) · `BeamsBackground` (animated dark) · `DotFieldBackground` (the application
field)
**Indicators** — `StepIndicator` (the circular process-step indicator) · `ProcessJourney` (the
vertical glowing spine) · `HelpIndicator` (the workspace question-mark button and its inline
sibling) · `CircleButton` (the circular affordance family)
**Surfaces** — `Tile` (fill-navy destination / lavender-tint content) · `Callout` (signal-coloured
guidance block)
**Cards** — `DivisionCard` · `ReportCard` · `MemberCard`
**Data** — `KeyFigures` (count-up stat row) · `Chart` (house-style line, area and bar)
**Media** — `ReportCover` (A4 publication cover) · `SocialPost` (Instagram & LinkedIn artwork) ·
`SlideFrame` (1920×1080 slide)
**Navigation** — `Header` · `Dropdown` · `Footer`

Framework-free equivalents of most of these exist as CSS classes in `surfaces.css` and `motion.css`
(`.mims-tile`, `.mims-card`, `.mims-callout`, `.mims-circle`, `.mims-journey`, `.mims-help-fab`,
`.mims-status`, `.mims-chart`, `.mims-pattern`, `.mims-surface`, `.mims-underline`, …) so the same
patterns work in a plain HTML file, an email or a slide.

### The circle language

Every circle in Minerva is one object at four sizes, and that is what makes them read as a family
in a system where nothing else is round.

- **Filled navy disc** = an action, or a state that has been reached.
- **Hollow ring** (1.5px navy) = available, not yet reached.
- **Halo** = live. Circles only.
- **Serif numeral or glyph** inside, always.

It appears as: the **application-step indicator** (`StepIndicator`, 60px, numbered, lighting in
sequence down the `ProcessJourney` spine with the connector filling navy → light purple); the
**workspace help button** (`HelpIndicator variant="fab"` — 48px on mobile, 56px on desktop, fixed
bottom-right, serif "?", resting halo plus one 900ms ignition on mount); the **inline help dot**
(20px hairline ring, quiet until hover); the **"+"** that opens a report preview; the **carousel
arrows**; and the **disc that closes a card rail**.

---

## 13 · Interaction states

| Element | Hover | Focus | Active / disabled |
|---|---|---|---|
| Primary button | Inverts: navy → white fill, navy label (200ms) | 2px navy outline, 3px offset | Disabled: grey fill, muted label |
| Outline button | Fills navy, white label, soft drop shadow | Same ring | Disabled: hairline border, no hover |
| Text link | 1.5px rule grows from the left (240ms) — **never an arrow glyph** | Ring around the label box | Visited is not styled |
| Tile (destination) | Fills navy, text white, lifts 4px, elevated shadow (320ms) | Ring, 3px offset | Static inside the workspace |
| Card (content) | Tints `#ECE9F4`; cover inside lifts 6px, tilts −1° | Same on `:focus-within` | Never both hovers in one grid |
| Circle / step | Scales 1.06–1.08 (outline circles fill instead) | Ring, 3px offset | Lit carries the halo; disabled 35% opacity |
| Table row | Background `--muted / .4`; no lift | Row outline, −2px offset | Selected: 2px navy left rule |
| General | Opacity ≈ 0.8 on incidental interactive elements | — | No press-scale beyond the hover lift |

---

## 14 · The Minerva Workspace

The member application (`/admin`) is the same identity under stricter rules, because it is a place
of record rather than a place of persuasion.

- **Flat.** Radius 0 on every input, select and combobox; native `appearance` stripped so the OS
  cannot round them. No card or hover shadows anywhere.
- **Static.** Only buttons, links, table rows and form controls may react to hover. Panels and cards
  do not move — reliability is the message.
- **Contextual help.** `HelpIndicator` in both forms; the panel slides in from the right (200ms) at
  380px wide, with a navy header band, an accent "What you are looking at" callout, square-bulleted
  action lists (navy = consult, green = actions your role unlocks), an amber "Good to know" band and
  hairline-separated topics. Help content is **role-aware**: members only read about actions they
  can perform.
- **Gated pages** blur their content (`blur(20px) saturate(.5)`) behind a scrim rather than hiding
  it, so a member sees that something exists and why it is closed.
- **Inputs below 768px are 16px** so iOS never auto-zooms a focused field.

---

## 15 · Templates

Ready-made starting points in `templates/`. Each is a Design Component that loads this system via
its own `ds-base.js`.

| Template | What it gives you |
|---|---|
| `templates/pitch-deck/PitchDeck.dc.html` | An eleven-slide presentation: navy opener, agenda with step circles, section divider, three-tile content slide, house-style chart, key figures, four-step process, statement slide, next steps, closing |
| `templates/research-report/ResearchReport.dc.html` | A printable research note: masthead, abstract callout, numbered sections, chart with source note, conviction table, disclaimer, running header and footer |
| `templates/social-kit/SocialKit.dc.html` | Instagram feed, Instagram story and LinkedIn artwork at true export size, with the carousel rules |

---

## 16 · Do & don't

**Do** — keep every corner square except true circles · let hairlines carry the structure · one
accent colour per page · serif headings with sans body, always · headings as plain nouns · generous
white space · earn elevation on interaction · source every number · British English.

**Don't** — no rounded corners or pills · no gradients in interface chrome · no emoji · no arrow
glyphs as button labels · no invented colours · no second icon library · no exclamation marks or
rhetorical headings · no stacked effects (one background, one accent, one idea per surface) · no
animation that cannot be justified as feedback, structure or continuity.

---

## 17 · Brief for AI design agents

Work in this order: **medium → size → surface → composition → check.**

1. Pick the medium and its canonical size (§11).
2. Choose **one** surface per section from the five (§8).
3. Compose from the system: heading + hairline + measure; groups as tiles in a 2/3/4/5 grid;
   sequences as `ProcessJourney`/`StepIndicator`; data as `Chart` with a source note.
4. Check: every corner square? one accent? serif over sans? any heading a slogan? any emoji, arrow
   labels, gradients or pills? British English? every statistic sourced? does it still read with
   animation frozen?

One-line brief you can paste anywhere:

> Design in the Minerva IMS system: deep navy `#1F0F4D` on white, serif headings (Times New Roman /
> EB Garamond) with Calibri body, zero border-radius, hairline `#D9D9D9` rules instead of boxes,
> flat grey `#F5F5F5` tiles that fill navy on hover, circular navy step indicators with a soft halo,
> no emoji, no gradients, no arrow glyphs, British English, institutional register.

---

## 18 · Repository index

| File / folder | What it is |
|---|---|
| `README.md` | This document — the complete reference |
| `SKILL.md` | Agent-skill manifest so the system can be invoked inside Claude Code |
| `styles.css` | Entry point — imports the three stylesheets below |
| `colors_and_type.css` | All design tokens: colour, type, spacing, radius, shadows, halos, patterns, motion, chart palette, output formats; plus type classes and button primitives |
| `surfaces.css` | Framework-free classes: surfaces, patterns, tiles, cards, panels, callouts, circles, the process spine, rules, status visuals, chart frame, grids |
| `motion.css` | The six approved keyframes, motion utilities and the reduced-motion contract |
| `thumbnail.html` | The system's tile on the homepage |
| `assets/` | Logos, lion badges, social icons, full-bleed photographic backgrounds |
| `fonts/` | Self-hosted Times New Roman (4 styles) |
| `components/` | React primitives — see §12 |
| `preview/` | Specimen cards for the Design System tab (colours, type, spacing, motion, animated-background behaviour, layout, formats, interaction states, chart rules, do & don't, AI brief) |
| `templates/` | Deck, report and social starting points |
| `ui_kits/website/` | High-fidelity recreation of minervaims.org — `index.html` + modular JSX |
| `github.md` | Which repository this system tracks, and when it was last synced |

---

## 19 · Website component inventory (implementation source of truth)

All live in `src/components/` in [`MinervaIMS/minervaims`](https://github.com/MinervaIMS/minervaims)
(Vite + React + TypeScript + Tailwind + shadcn-ui). Consult these when building production code.

| Component | What it does |
|---|---|
| `layout/Header.tsx` | Fixed 84px, three-zone (logo · centred nav · account). Transparent on hero routes, solid white on scroll. 880px breakpoint, 19px serif nav, scale-x underline, 220ms dropdown close delay, full-screen white mobile overlay |
| `layout/Footer.tsx` | Pure black, three bands: large lock-up (scroll-to-top) + newsletter + social icons · five link columns · copyright bar |
| `shared/ReportsSection.tsx` | The publication component. v3 card carousel (lavender hover, cover lift+tilt) and v2 navy stage (featured cover + description + secondary strip), PDF lightbox, `+` affordance, scroll-fade rail mask, dot + arrow controls |
| `shared/ApplicationJourney.tsx` | The vertical glowing spine on `/join` — the source of `StepIndicator` and `ProcessJourney` |
| `admin/help/HelpSystem.tsx` | `HelpDot`, `PageHelpButton` (`.ws-help-fab`) and the role-aware sliding help panel |
| `shared/Beams.tsx` | Three.js beams — the animated dark background (recreated dependency-free as `BeamsBackground`) |
| `shared/DotField.tsx` | The canvas dot field behind the application flow (ported as `DotFieldBackground`) |
| `shared/ApplyBackground.tsx` / `AuthLayout.tsx` | Which environment sits behind which card: dot field for applicants, beams for members |
| `shared/SpecularFx.tsx` | WebGL specular rim on primary auth buttons; `.specular-fx` extends 20px past the button |
| `shared/OrgChart.tsx` | The pannable org chart — camera easing, recessed branches, drawn connectors |
| `shared/HistoryTimeline.tsx` | The pinned horizontal timeline: 80px year circles lighting as the rail fills |
| `shared/DivisionScrollStack.tsx` | Phone-only sideways run of the five division cards |
| `shared/TestimonialsSection.tsx` | Navy testimonial carousel, ~15.7s auto-advance, ±40px slide-in |
| `shared/MembersDirectory.tsx` | Tabbed directory — 5-up feature cards for the Board, compact cards per division |
| `shared/AlumniGlobe.tsx` · `AlumniTicker.tsx` | 3D alumni globe and the scrolling alumni ticker |
| `shared/PageVisibilityGate.tsx` | Blurs member-only content behind a scrim |
| `shared/PdfThumbnail.tsx` · `CarouselScrollIndicator.tsx` · `Preloader.tsx` | Report previews, rail progress, first-load splash |
| `shared/FundPerformanceChart.tsx` | Fund performance graphics — the reference for `Chart` |
| `shared/LegalLayout.tsx` | Legal pages (`src/styles/legal-system.css`) |

Admin components live in `src/components/admin/` and follow §14.
