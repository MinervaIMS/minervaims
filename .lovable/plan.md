## Why the companies don't show

The homepage testimonials block calls `listAlumniLite()` which does `select id, name, surname, company from alumni`. The `alumni` table has a single RLS policy: `SELECT` only for `authenticated` users where `is_staff(auth.uid())`. Anonymous homepage visitors therefore get an empty array (confirmed in the network log: `/rest/v1/alumni?...` → `[]`), so `resolveAlumnus` never matches and the "currently at <company>" suffix is dropped for every quote.

Testimonials themselves load fine — only the alumni join is blocked.

## Fix

Add a narrow, public read path that returns just what the testimonials section needs (company per published testimonial), without opening the `alumni` table to anon.

### 1. Database migration

Create a `SECURITY DEFINER` function `public.public_testimonial_companies()` returning one row per published testimonial:

```
testimonial_id uuid, company text
```

Resolution mirrors `resolveAlumnus`:
- If `testimonials.alumni_id` is set → join `alumni` by id.
- Else → match `alumni.name || ' ' || alumni.surname` against `testimonials.name` (case-insensitive, whitespace-normalised).

Return only `company` (nothing else from `alumni`). `search_path = public`, `stable`. Grant `EXECUTE` to `anon` and `authenticated`.

### 2. Frontend

- `src/lib/testimonials-api.ts`: replace `listAlumniLite` usage for the homepage with a new `listTestimonialCompanies()` that calls the RPC and returns `Map<testimonialId, company>`. Keep `listAlumniLite` for the staff-only workspace control centre (it still works there because staff are authenticated).
- `src/components/shared/TestimonialsSection.tsx`: fetch the map instead of the alumni list, and look up `company` by `current.id`. Realtime subscription stays on `testimonials` and `alumni` so edits still refresh.

### Out of scope

Leaves the `alumni` table RLS unchanged (still staff-only). Does not touch the security findings shown in the More panel — those are unrelated to this bug.
