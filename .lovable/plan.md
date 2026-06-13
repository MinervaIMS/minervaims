# Homepage Testimonials Section – Updates

Single file to edit: `src/components/shared/TestimonialsSection.tsx` (plus one animation duration tweak in `tailwind.config.ts`).

## 1. Fixed section height per breakpoint

The section currently grows/shrinks because the quote paragraph's `min-height` is the only height lock and the name/role block sits outside it. Lock the entire content wrapper to a per-breakpoint minimum height so every quote (shortest → longest) fits without expansion:

- Mobile: `min-h-[560px]`
- Tablet (`sm`): `sm:min-h-[520px]`
- Desktop (`md`): `md:min-h-[480px]`
- Large (`lg`): `lg:min-h-[460px]`

Applied to the inner `max-w-4xl` wrapper, with `flex flex-col justify-center` so the quote + author stay vertically centered regardless of content length. The current `minHeight: 'calc(1.375em * 7)'` on the `<p>` is removed (the wrapper now governs height). Values chosen against the longest quote (Matteo Consalvo) at each breakpoint with the existing font sizes.

## 2. Duration 40% longer

`AUTO_ADVANCE_MS`: `7000` → `9800` ms.

## 3. Transition 70% slower + smoother

In `tailwind.config.ts`, change both keyframe animation durations and easing:
- `testimonial-in-left`: `0.6s ease-out` → `1.02s cubic-bezier(0.22, 1, 0.36, 1)` (easeOutExpo-like, smoother)
- `testimonial-in-right`: same change

(Keyframes themselves unchanged.)

## 4. Append current company from alumni (live)

In `TestimonialsSection.tsx`:

- On mount, fetch alumni matching the 5 testimonial contributors:
  ```ts
  supabase.from('alumni')
    .select('name, surname, company')
    .or('and(name.eq.Anna,surname.eq.Maruccio),...')
  ```
  (Use `.in('surname', [...])` then filter by name client-side for simplicity — small dataset.)
- Build a `Map<"Name Surname", company>` in state.
- Subscribe to realtime changes on the `alumni` table (`postgres_changes`, event `*`) and refetch when any row changes. Cleanup channel on unmount.
- Render role as:
  - If a company is found and non-empty: `${role}, currently at ${company}`
  - Otherwise: `role` unchanged (current behavior).
- All five contributors already have companies in the DB (verified): Anna Maruccio → D.E. Shaw Group, Luigi Savarese → Galileo Capital, Matteo Consalvo → EPAP, Michele Rinaldi → Citi, Marco Neri → Goldman Sachs. So output e.g. "Former Vice-president, currently at Citi".

### Resilience
- Wrap fetch + subscription in `try/catch`; on error keep the original role string (no UI break).
- Guard against missing/empty `company` (trim + length check).
- No throws bubble up — failures degrade silently to current text.
- Lookup key is case-insensitive trimmed `"name surname"`.

## Verification
- Cycle through all 5 testimonials at desktop/tablet/mobile widths: section height stays constant.
- Quote stays visible ~9.8s; cross-fade lasts ~1s with smooth easing.
- Each author line shows `Former …, currently at <Company>` matching DB.
- Edit a company in the admin Alumni table → testimonial role text updates without reload.
