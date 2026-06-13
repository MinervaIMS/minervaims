The current implementation in `src/pages/Join.tsx` already matches the reference structure (60px rail, dot/line geometry, sequential `250 + i*400` timing, `calc(100% + 2.5rem)` overshoot). Three small details still diverge from the uploaded `journey-spine-demo.html` — align them exactly.

**Changes to `src/pages/Join.tsx` (Application Journey only)**

1. **Line fill = gradient, not solid accent.**
   Replace the fill `bg-accent` with an inline `background: linear-gradient(180deg, hsl(var(--accent)), hsl(var(--mims-light-purple)))` so the glow runs navy → light-purple top-to-bottom, matching `.jline .fill` in the spec. If a `--mims-light-purple` token isn't in `index.css`, fall back to the literal `#AFA2D2` as the gradient stop (the spec explicitly says do not substitute).

2. **Transition easing = `ease` (not `ease-out` / `ease-linear`).**
   - Dot: `transition: all .55s ease` → change `ease-out` to `ease` on the dot.
   - Fill: `transition: height 1s ease` → change `ease-linear` to `ease`, keep 1000ms.

3. **Keep everything else as-is** (geometry, sequential timing, IntersectionObserver threshold 0.2, content, FAQs, section heading style).

**Verification**
- Reload `/join`, scroll to the Application Journey, confirm: dots light navy in sequence with the soft glow, and the connecting line fills with a navy→light-purple gradient that reaches into the next step.