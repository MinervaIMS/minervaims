## The bug

When you reach the bottom of any page and try to scroll past it, a white sliver flashes for a moment before the page settles. It happens on desktop browsers (Chrome/Safari) and on iOS Safari's rubber-band.

## Root cause

We already paint `<html>` dark (`hsl(var(--foreground))`) so the overscroll area should be dark. But `<body>` still carries `@apply bg-background` — i.e. **white** — and `min-height: 100dvh`. The compositor paints body's white rectangle over html's dark rectangle for the entire body box. During the overscroll bounce, the browser briefly extends the body's painted area past its layout edge before the scroll snaps back — and that paint is white. That is the flash.

`overscroll-behavior-y: none` on `<html>` does not stop this on every engine, because the scrolling root that propagates the behavior is `<body>` in many cases, and the flash is a paint artefact, not actual scroll.

## Fix (one file, three small changes)

Move the white "page surface" off `<body>` and onto the Layout wrapper, so `<body>` is transparent and the overscroll area always shows the dark `<html>` underneath.

**1. `src/index.css` — make `<body>` transparent and damp the bounce on body too.**
- Remove `bg-background` from the body `@apply` line (keep `text-foreground font-body antialiased`).
- Add `overscroll-behavior-y: none;` on body as well as html (belt-and-braces; some engines read it from the scrolling element).
- Keep `min-height: 100dvh`.

**2. `src/components/layout/Layout.tsx` — paint the page surface on the Layout wrapper.**
- Add `bg-background` to the existing root `<div className="min-h-screen flex flex-col overflow-x-clip">`.
- This is the visible "white page". It sits above the dark html, exactly as body did, but its bounds end at content — no overscroll paint.

**3. `src/pages/Auth.tsx` and any other route that renders **outside** `<Layout>`** — if a route renders without the Layout wrapper, add `bg-background` to its outermost container so it still has a white page surface. I'll grep `App.tsx` and confirm before editing; in practice only `/auth` and `/admin` skip parts of the layout, and admin already has its own background.

## Why this is safe

- No section/component currently relies on body's bg — every section paints its own `bg-background` / `bg-black` / hero image.
- The visible page looks identical in normal scrolling (Layout wrapper paints the same white).
- The dark overscroll area we already wanted (footer-coloured rubber-band on iOS) becomes consistent on desktop too.
- No JS, no layout shift, no impact on the header/footer/safe-area work from the previous turn.

## Verification

- Scroll to the bottom of `/`, `/about`, `/people/alumni`, `/archive`, `/auth` and try to overscroll past it on desktop Chrome and Safari — bounce area is dark, no white flash.
- iOS Safari rubber-band at the bottom — still dark (unchanged from previous fix, now also true on desktop).
- Top of every hero page — hero image still reaches the top, no regression.
- `/auth` and any non-Layout route — page surface still white.
