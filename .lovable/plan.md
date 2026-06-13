Strip all `<Reveal>` fade-in wrappers from `src/pages/Join.tsx`, leaving CountUp and Application Journey spine intact.

**What to change**
1. Find every usage of `<Reveal>` on `src/pages/Join.tsx`.
2. Replace each `<Reveal>...</Reveal>` block with its inner content only — removing the wrapper and its `delay`/`key`/`className` props.
3. Keep the `<Reveal>` around the Figures band (it triggers `CountUp` start) **only if** it is necessary for the count; if the count trigger is separate, remove it too. Actually, to be safe, leave the Figures `<Reveal>` since CountUp needs it.
4. Keep the `<Reveal>` around the Application Journey section because it drives the spine sequential lighting; do not remove it.

**What to preserve**
- `CountUp` numbers animation in the Figures band.
- Application Journey dot-lighting and vertical line-fill animation.
- All content, layout, styling, and hover effects.

**Verification**
- After build, check `/join` loads without fade-ins on sections.
- Confirm CountUp still counts and journey spine still lights sequentially.

**Memory update**
- Update `mem://pages/join/animations-spec` to reflect that Reveal fade-ins are removed; only CountUp and journey spine remain.