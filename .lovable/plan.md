## Plan — Port reference animations into `/join`

Scope: `src/pages/Join.tsx` only. No shared components, no other routes. Content, copy, layout, colors and spacing stay as they are now. Only motion behavior is added.

### What's missing vs the reference (from `Join_MIMS_-_Lovable_Reference-2.html`)

1. **`.reveal` scroll-in** — opacity 0 → 1 and `translateY(22px)` → 0, `transition: .7s ease-out`, triggered by IntersectionObserver, with per-element `data-delay` stagger (90ms for Why cards, 70ms for Gain rows).
2. **Figures band count-up** — `2017` static; `80+`, `250+`, `120+`, `5` count from 0 with ease-out (~1.6s) once the band enters view.
3. **Journey spine "lights up"** — when the journey section enters view, each step (sequentially, 250ms + i×400ms):
   - `.jdot` fills with accent color + soft glow ring
   - `.jline .fill` height animates 0 → 100% via 1s `height` transition
4. **Hover choreography (already-known small effects)** — Why card: 6px lift + accent left bar grows top→bottom on hover; Gain row: light grey bg + 1.25rem padding-left shift on hover. These are the reference's "restrained hover choreography" and complement the reveals.
5. **`prefers-reduced-motion`** — all of the above disabled; elements appear immediately.

### Implementation (single file: `src/pages/Join.tsx`)

- Add a local `useReveal()` hook + `<Reveal>` wrapper (IntersectionObserver, `threshold: 0.15`, unobserve after first trigger). Applies `opacity-0 translate-y-[22px]` → `opacity-100 translate-y-0` with `transition-[opacity,transform] duration-700 ease-out` and an inline `transitionDelay` prop. Wrap: hero lede, status band, each Why card (delay = i×90), each Figures cell, Selectivity block, each Gain row (delay = i×70), each Journey step container, Prepare section, FAQ list.
- Add a local `<CountUp value suffix start />` that animates 0 → value over 1600ms with ease-out cubic via `requestAnimationFrame`, starting only after the Figures band intersects. Used for the four non-`2017` figures.
- Add a local `useJourneyLight()` effect: when the journey `<section>` first intersects, stagger `setTimeout(i * 400 + 250)` to toggle `lit` on each step; render a CSS-driven `.jline` fill with `transition: height 1s ease`.
- Add hover styles inline via Tailwind: Why card → `group hover:-translate-y-1.5 hover:shadow-elevated` + a `::before` accent bar via an absolute `<span>` whose height transitions on group-hover. Gain row → `hover:bg-secondary hover:pl-5 transition-[background-color,padding] duration-300`.
- All transitions short-circuit when `window.matchMedia('(prefers-reduced-motion: reduce)').matches`.

### Out of scope

- FAQ copy / referrals policy (protected by `mem://pages/join/ui-elements-spec-v7`) — unchanged.
- The dark "Final CTA" footer block from the reference — not introduced by this change; left as the existing closing layout.
- No new dependencies (no GSAP, no framer-motion).
- No edits to `index.css`, Tailwind config, other pages, or the global "no animations" rule (this page is an explicit, documented exception).

### Memory

After implementation, save `mem://pages/join/animations-spec` documenting that `/join` is the single page-level exception to the "no animations" core rule, listing the three motion primitives (reveals, count-ups, journey spine) so future edits don't strip them.

### Verification

After the edit: view the page in the preview, scroll through it, confirm reveals trigger once and counters animate once; verify reduced-motion still renders content statically.
