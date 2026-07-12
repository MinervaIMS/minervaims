## Plan

Create a new dedicated success-screen component and use it on `/apply?submitted=1`. The existing `PixelCard` (used elsewhere with variants) is left untouched.

### 1. New files

**`src/components/shared/PixelCardSuccess.css`** — exactly the CSS provided by the user.

**`src/components/shared/PixelCardSuccess.tsx`** — exactly the component provided by the user (self-contained CONFIG: gap 3, speed 75, activeDuration 1500, fadeMs 5000, navy palette, dpr-aware canvas, two-phase appear/fade with shimmer, resize observer).

### 2. Edit `src/pages/Apply.tsx`

- Replace the import `PixelCard` → `PixelCardSuccess`.
- In `SuccessScreen`, replace the animation wrapper:
  ```tsx
  <div className="absolute inset-0">
    <PixelCardSuccess />
  </div>
  ```
  (No props — the new component is fully self-configured.)

### Out of scope

- No changes to the existing `PixelCard` / `PixelCard.css` (still used with `variant`/`speed`/etc. props elsewhere in the app).
- No layout, copy, or button changes on the success card.
