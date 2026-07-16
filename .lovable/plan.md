## Goal
Give the floating "?" help button (bottom-right of the workspace) the same "reached step" treatment used by the numbered dots in /join's "The Application Journey": a brief ignition animation that leaves a lasting soft, semi‑transparent light‑purple halo around the button.

## Reference
The journey dots use this "lit" style (already in `src/index.css`):

```css
.jstep.lit .jdot {
  background: hsl(var(--accent));
  color: #fff;
  box-shadow:
    0 0 0 6px hsl(var(--accent) / 0.10),   /* the soft halo the user sees */
    0 10px 28px hsl(var(--accent) / 0.30);
  transition: background-color .55s ease, color .55s ease, box-shadow .55s ease;
}
```

The wide `0 0 0 6px hsl(var(--accent) / 0.10)` inset‑style ring is what creates the persistent light‑purple semi‑transparent border in the screenshot.

## Changes

1. `src/index.css` — add a new dedicated class for the help button, mirroring the journey dot treatment:

   ```css
   .help-dot-lit {
     box-shadow:
       0 0 0 6px hsl(var(--accent) / 0.10),
       0 10px 28px hsl(var(--accent) / 0.30);
     transition: box-shadow .55s ease, transform .15s ease;
   }
   @keyframes help-dot-ignite {
     0%   { box-shadow: 0 0 0 0    hsl(var(--accent) / 0.00),
                        0 10px 28px hsl(var(--accent) / 0.00); }
     60%  { box-shadow: 0 0 0 14px hsl(var(--accent) / 0.18),
                        0 10px 28px hsl(var(--accent) / 0.35); }
     100% { box-shadow: 0 0 0 6px  hsl(var(--accent) / 0.10),
                        0 10px 28px hsl(var(--accent) / 0.30); }
   }
   .help-dot-ignite { animation: help-dot-ignite .9s ease-out both; }
   @media (prefers-reduced-motion: reduce) {
     .help-dot-ignite { animation: none; }
   }
   ```

2. `src/components/admin/help/HelpSystem.tsx` — `PageHelpButton`:
   - Drop the hard `ring-2 ring-accent ring-offset-4 ring-offset-background` classes (they compete with the halo).
   - Add `help-dot-lit help-dot-ignite` so the button plays the ignition once on mount and then keeps the soft halo.
   - Preserve existing behaviour: `bg-accent text-accent-foreground`, fixed position, size, click toggle, hover scale.

No other files change; behaviour, position, size, and accessibility of the button stay identical — only the visual "ring" is replaced with the journey‑dot halo + one‑time ignition.