## Change

Update the `<PixelCard>` call in `src/pages/Apply.tsx` (`SuccessScreen`) so the success-card animation feels more deliberate and fades away more gradually.

## Proposed values

| Prop | Current | Proposed | Effect |
|------|---------|----------|--------|
| `gap` | default `5` (navy variant) | `4` | Denser pixel field → more intense visual |
| `speed` | `70` | `45` | Slower pixel shimmer/growth |
| `activeDuration` | `900` | `1400` | Hold the filled card slightly longer before fade begins |
| `fadeMs` | `2800` | `4200` | Slower, more gradual opacity fade-out |

## Files touched

- `src/pages/Apply.tsx` — adjust the `<PixelCard variant="navy" ... />` props in `SuccessScreen`.

No other logic or UI changes.