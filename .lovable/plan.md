# Beams animated background on the right side of the login page

Keep the existing navy left panel ("The Minerva Workspace") exactly as it is. Replace the plain white background on the right side (behind the login/signup card) with the animated React Bits Beams effect, using your exact parameters.

## Behavior

- Beams render as a full-bleed layer behind the right-hand `<main>` of `AuthLayout`, covering the area around the card (the white space you marked).
- The card itself stays on a solid surface so the form remains perfectly readable — I'll give the inner card container a solid white background and a subtle shadow so it sits cleanly over the animation.
- Desktop only by default (matches current layout). On tablet/mobile, where the navy aside is hidden, I'll also show the beams so the page still looks intentional.
- Used on `/auth` (login + signup). Other auth utility pages (`/forgot-password`, `/reset-password`, `/check-email`, etc.) all use the same `AuthLayout`, so they'll inherit the beams too — say the word if you'd like to limit it to `/auth` only.

## Beams settings (exactly as provided)

`beamWidth=8.4`, `beamHeight=30`, `beamNumber=38`, `lightColor="#afa2d2"`, `speed=2`, `noiseIntensity=0.6`, `scale=0.2`, `rotation=30`.

## Files

1. **New** `src/components/shared/Beams.tsx` — full React Bits Beams component (Canvas + shader-extended `MeshStandardMaterial` + merged stacked planes + directional light), TypeScript-clean.
2. **New** `src/components/shared/Beams.css` — `.beams-container { position: relative; width: 100%; height: 100%; }`.
3. **Edit** `src/components/shared/AuthLayout.tsx` — wrap the right `<main>` in a relative container; add an absolutely-positioned `<Beams …/>` layer behind it (`z-index: 0`, `pointer-events: none`); lift the card wrapper to `z-index: 1` and give it a solid white background + soft shadow so it reads cleanly over the animation.

## Dependencies (React 18 compatible, exact versions per project memory)

- `three@^0.160.0`
- `@react-three/fiber@^8.18.0`
- `@react-three/drei@^9.122.0`

(React Bits is copy-paste, not a shadcn registry, so we add the component file directly — that's the canonical install path.)

## Notes

- No business logic, routing, or auth code changes.
- This is one scoped animation on the auth surface — consistent with existing documented animation exceptions (e.g. `/join`). If you'd rather keep `/auth` strictly static, I won't proceed.
