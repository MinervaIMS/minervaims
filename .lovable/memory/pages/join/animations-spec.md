---
name: Join page animation exception
description: /join is the single page-level exception to the no-animations rule; lists the three motion primitives that must be preserved
type: design
---

`/join` (src/pages/Join.tsx) is the ONLY page-level exception to the project-wide "no animations" core rule. These primitives are intentional and must not be stripped:

1. **Scroll reveal** — local `<Reveal>` wrapper + `useInView` hook. opacity 0 → 1, translateY(22px) → 0, 700ms ease-out, IntersectionObserver threshold 0.15, unobserve after first trigger. Per-element `delay` prop for stagger (Why cards 90ms, Gain rows 70ms, Figures 80ms, Journey steps 70ms).

2. **Figures count-up** — local `<CountUp>` component, rAF-driven, ~1600ms, ease-out cubic. `2017` stays static; `80+`, `250+`, `120+`, `5` count from 0 once the band intersects (threshold 0.3).

3. **Journey spine "lights up"** — sequential `litStep` state. When the journey container intersects (threshold 0.2), each step lights with `setTimeout(250 + i*400)`: `.jdot` fills with accent + soft glow ring, vertical connector fills top→bottom via `height` transition (1000ms ease-out).

Hover micro-interactions (also intentional): Why cards lift -6px + accent left bar grows 0 → 100% height on group-hover; Gain rows hover:bg-secondary + hover:pl-5.

All animations respect `prefers-reduced-motion: reduce` — short-circuit to final state.

Source of truth: `Join_MIMS_-_Lovable_Reference-2.html` (user-provided reference).
