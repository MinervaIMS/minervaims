## Replace existing cookie consent with the new MIMS Cookie Consent component

The site currently uses a custom cookie system in `src/components/cookies/` (CookieContext + CookieBanner + CookiePreferences) wired into `App.tsx` and referenced from `CookiePolicy.tsx`. We'll swap this for the supplied component while keeping its styling 1:1.

### 1. Add the CSS
- Create `src/components/cookies/mims-cookie-consent.css` containing the uploaded CSS verbatim (no token/color/font changes).
- Import it globally in `src/main.tsx` so it's available app-wide.

### 2. Add the new CookieConsent component
- Create `src/components/cookies/CookieConsent.tsx` — TSX port of the uploaded JSX, preserving all class names, markup, inline styles, copy, and behavior:
  - `localStorage` key `mims-cookie-consent`
  - Banner shown on first visit only
  - Accept All / Reject Non-Essential / Save Preferences persist `{ preferences, analytics, media }` and hide the banner
  - "Manage Settings" opens the accordion modal
  - "Cookie Policy" link → `/cookie-policy`
- After persisting, dispatch `window.dispatchEvent(new CustomEvent('cookie-consent', { detail: next }))` (uncomment the hook) so analytics/embeds code can listen and gate loading by category.
- Expose a tiny helper (e.g. `openCookieSettings()` that dispatches `window.dispatchEvent(new Event('open-cookie-settings'))` plus a listener inside the component) so the Cookie Policy page can still trigger the modal.

### 3. Mount once at app root
- In `src/App.tsx`, remove `CookieProvider`, `CookieBanner`, `CookiePreferences` imports/usages and render `<CookieConsent />` once near the other global overlays (after `<Sonner />`). It appears on every page since it sits outside `<Routes>`.

### 4. Update Cookie Policy page
- `src/pages/CookiePolicy.tsx` currently calls `useCookieConsent().openPreferences`. Replace with a button that calls `window.dispatchEvent(new Event('open-cookie-settings'))` (handled by the new component). Update the cookie-name row in the table from `mims_cookie_consent` to `mims-cookie-consent` to match the new storage key.

### 5. Remove the old system
- Delete `src/components/cookies/CookieContext.tsx`, `CookieBanner.tsx`, `CookiePreferences.tsx`, and update `src/components/cookies/index.ts` to export only `CookieConsent` (and the helper).
- Search for any other `useCookieConsent` references and migrate them to the event/helper, or remove if unused.

### 6. Consent gating hook (integration point)
- Document via a comment in `CookieConsent.tsx` that any analytics/embed code should subscribe to the `cookie-consent` window event and read `detail.analytics` / `detail.media` / `detail.preferences` before loading scripts. No analytics/embeds are currently wired in the codebase, so there is nothing to retrofit — the hook is in place for future use. (If you want me to also audit the codebase for existing third-party embeds to gate now, say so and I'll include that in the build.)

### Files touched
- add: `src/components/cookies/mims-cookie-consent.css`
- add: `src/components/cookies/CookieConsent.tsx`
- edit: `src/components/cookies/index.ts`
- edit: `src/main.tsx` (CSS import)
- edit: `src/App.tsx` (mount new component, drop old provider)
- edit: `src/pages/CookiePolicy.tsx` (open settings via event, fix cookie name)
- delete: `src/components/cookies/CookieContext.tsx`, `CookieBanner.tsx`, `CookiePreferences.tsx`

### Notes
- Styling, copy, markup, and class names from the uploaded files are preserved exactly — no Tailwind tokens substituted in.
- The new storage key (`mims-cookie-consent`) differs from the old one (`mims_cookie_consent`), so existing visitors will see the banner once after deploy. This is intentional since the consent shape also changes (`media` instead of `externalMedia`, no `necessary`/`timestamp`/`version`).
