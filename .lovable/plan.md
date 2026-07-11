## Changes

**1. Redirect after "Create account and submit application" (`src/pages/Apply.tsx`)**

In `submit()`, when sign-up succeeds without an immediate session (email confirmation required), currently we fall back to an inline `setStage('sent')` screen. Change it to navigate to the existing CheckEmail route:

```
navigate(`/check-email?email=${encodeURIComponent(f.email)}&purpose=verify`, { replace: true });
```

Remove the now-unused `stage === 'sent'` branch and the `stage` state (and the `MailCheck` import). The `submitted=1` return path (post email-confirmation) that renders `<SuccessScreen />` stays unchanged.

**2. Success card logo (`src/pages/Apply.tsx`)**

Replace the `fullLogo` import currently sourced from `@/assets/legal-hero-logo.svg` with `@/assets/full_logo_color.svg` in the `SuccessScreen` `<img>`. (The form `Shell` header keeps its current logo — only the success card image is swapped, per the request.)

**3. Pixel animation timing (`src/pages/Apply.tsx` — the `<PixelCard>` used in `SuccessScreen`)**

Tune the props so the fill-in is more intense/quicker and the fade-out is slower:
- `variant="navy"` → keep
- Add `speed={70}` (up from the navy default of 40) for a faster, more intense appear
- `activeDuration={900}` (down from 1400) — shorter hold before reversing
- `fadeMs={2800}` (up from 1700) — slower opacity fade-out

No changes to `PixelCard.tsx` itself; all tuning is via props.

## Out of scope
No backend, edge function, or CheckEmail page changes.
