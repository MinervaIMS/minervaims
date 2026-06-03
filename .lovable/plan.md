# Rebuild Members page — Direction C

Refactor `src/pages/Team.tsx` (route `/people/members`) to closely match the attached reference, while keeping the existing data source (Supabase `team_members`) and the global Header / Hero / Footer.

## Page structure (top → bottom)

1. **Hero** — keep `PageIntroduction` with `title="Members"`, `backgroundImage={teamBg}`. Add the subtitle *"The students who research, build and manage MIMS' virtual funds."* (passed via existing `subtitle` prop if available; otherwise rendered just below the title in the intro section).
2. **Intro block** — H2 "The Team Behind the Work" with hairline underline, right-aligned small count `{N} Members · 6 Divisions`. Below: paragraph (≤ 46rem) on the left, outline CTA "How We Are Structured" (→ `/about#organisational-structure`) on the right at `lg+`. Copy from brief.
3. **Division tab-bar** (new component, in-file) — horizontal flex row sitting on a 1px `hsl(var(--separator))` baseline. Tabs in order: `Executive Board · Equity · Investment · Macro · Portfolio · Quant · Media & Ops`. Each tab: serif ~1.05rem, padding `.8rem 1.15rem`, `border-bottom: 2px solid transparent; margin-bottom: -1px;`. Hover → accent. Active → accent + bold + `border-bottom-color: accent`. Mobile: `flex-nowrap overflow-x-auto`, smaller font/padding. Client state only (`useState`), default `executive`.
4. **Selected-group section** — division header: serif H2 = division name + small muted "{n} members" count on the right, one-sentence blurb below. Then:
   - **Executive Board** → FEATURE grid (4a).
   - **Research divisions (Equity / Investment / Macro / Portfolio / Quant)** → Leadership block (heads + PMs) then Analysts block (seniors + analysts), each preceded by uppercase sub-label, both as COMPACT grid (4b).
   - **Media & Ops** → empty state: "M&O" monogram tile, "Roster coming soon", muted sentence from brief.

### 4a. Executive Board feature card
- Grid: 5 cols desktop / 3 tablet / 3 mobile. Gap ~1.25rem / 0.7rem.
- Card: flat `hsl(var(--muted))` block, ~1.1rem padding, flex-col.
- Avatar: full-width square (`aspect-square w-full`), white tile with serif initials in accent (~2.3rem). Drop-in `<img>` slot when `photoUrl` exists.
- Name: serif ~1.12rem, foreground. Role: uppercase Calibri ~0.74rem, tracking .08em, muted.
- Flex spacer → LinkedIn icon pinned to bottom-left.
- Hover: card fills accent, name → background, role → light-purple (`#AFA2D2`, add to tokens or use inline hsl), LinkedIn glyph → background, `translateY(-3px)` + soft shadow.

### 4b. Compact row card
- Grid: 3 cols desktop / 2 tablet / 1 mobile.
- Card: white, 1px separator border, ~0.9rem padding, horizontal flex row.
- Left: 84×84 (76 on mobile) square avatar, white/grey tile with accent serif initials. Drop-in `<img>` slot.
- Middle: name (serif ~1.08rem) over role (sans ~0.8rem muted). For Portfolio Management append `· {fundLabel}` in muted accent italic.
- Right: LinkedIn icon.
- Leadership variant: muted background, accent name. Hover: border → accent (no lift).

### LinkedIn icon
- Inline SVG glyph (path from `components.jsx`), 22–24px, color = accent, no box, no own hover state. Open in new tab.

## Data wiring

Keep current Supabase fetch in `Team.tsx`. Map DB rows to a typed `Member` with a derived `tier`:
- `President | Vice President | Head of Asset Management | Advisor` → `exec` (Executive Board; also flagged by `is_board`).
- `Head of …` → `head`
- `Portfolio Manager` → `pm`
- `Senior Analyst` → `senior`
- `Analyst` → `analyst`
- `Head of Operations | Head of Media | Operations | Media` → grouped under Media & Ops.

Group by tab key:
- `executive`: `is_board === true` (uses existing POSITION_ORDER for ordering).
- `equity | investment | macro | portfolio | quant`: `division === key && !is_board`; split into Leadership (`head`, `pm`) and Analysts (`senior`, `analyst`); within each, sort by position rank then `display_order`.
- `media-ops`: empty state for now (even if some Operations/Media members exist in DB, brief explicitly says empty — gate behind a constant `SHOW_MEDIA_OPS_EMPTY = true` so we can flip later).

Division metadata (label + one-sentence blurb) defined in a local `DIVISIONS` array in the file; labels reuse `divisionLabels` from `src/lib/types.ts`.

## Files to change

- **`src/pages/Team.tsx`** — rewrite to implement the structure above. Keep Helmet, loader, Supabase fetch, `useSearchParams` (default the active tab from `?division=` when present, else `executive`).
- **New `src/components/shared/MembersDirectory.tsx`** — exports `MembersDirectory` plus internal `TabBar`, `FeatureCard`, `CompactCard`, `EmptyDivision`, `LinkedInGlyph`, `Mono` (initials avatar). Drives everything off a `members: Member[]` prop and active-tab state.
- **`src/components/shared/index.ts`** — export the new component.
- **`src/index.css`** — add a `--accent-soft` token mapped to `#AFA2D2` (HSL) for the Board card hover role color, used as `text-[hsl(var(--accent-soft))]`. No other token changes.

`TeamDirectory.tsx` stays in place (still used elsewhere? check) — if no other consumers, leave it for now; do not delete in this task.

## Acceptance check (will self-verify before closing)

- Tabs render as serif underline-style nav with navy active border; default `Executive Board`.
- Board grid is 5/3/3, avatars are full-column 1:1 squares, names baseline-align across the row.
- Division grids are 3/2/1, avatars ~84px, Leadership shown above Analysts with uppercase sub-labels.
- LinkedIn glyph is borderless ~22–24px navy with no own hover.
- Media & Ops shows the empty state.
- Zero border-radius added; only existing semantic tokens + the new `--accent-soft`.
- British English copy from the brief.
