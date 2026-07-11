## Why this happens

The Apply form calls `supabase.auth.signUp`. When the email already exists (from an earlier unconfirmed attempt), Supabase — with email confirmation on — returns an **obfuscated response**: no error, and a `user` object with no `id` and no `identities`. `src/pages/Apply.tsx` treats this as "Sign-up did not complete" and leaves the user stuck on the form with no next step.

`criccardo480@gmail.com` already has an unconfirmed auth user (the auth logs show three successful `/signup` calls plus a 429 rate-limit), so every subsequent retry hits that branch.

## Plan

### 1. Delete the stuck account and its data
Run one migration that, for `criccardo480@gmail.com`:
- deletes any `applications`, `application_notes`, `interview_bookings`, `profiles`, `user_roles`, `members`, `newsletter_subscribers` rows tied to that user id or email
- deletes storage objects in the `applications` bucket under that user's folder
- deletes the `auth.users` row (cascades what's left)

So the applicant can retry with a clean slate.

### 2. Delete all interview slots
Per the earlier request that wasn't yet actioned, `DELETE FROM public.interview_slots` (cascades `interview_bookings`). Included in the same migration.

### 3. Fix Apply.tsx so users are never stranded

In `src/pages/Apply.tsx`, replace the current "no user id → generic toast" branch with proper detection and routing:

- **Obfuscated response** (no error, but `user.id` missing OR `user.identities` is an empty array) → treat as "email already registered". Show a clear toast ("An account with this email already exists — please sign in, or check your inbox for the confirmation link") and `navigate` to `/check-email?email=…&purpose=verify` so they land on a real next step instead of the empty form.
- **Explicit `signUpErr` containing "already" / "registered"** → same routing (sign-in link + check-email page), not just a red toast that leaves them on the form.
- **True unknown failure** (has `signUpData` but no `user` at all and no error) → keep a toast, but also navigate to `/auth` so the user has somewhere to go.
- Keep the existing successful path (`signUpData.session` → success screen, else → `/check-email`).

No changes to business logic, RLS, or the submit-application edge function. Only the client-side signup branch handling and one data-cleanup migration.

## Files touched
- `supabase/migrations/<new>.sql` — delete criccardo480@gmail.com data + all `interview_slots`
- `src/pages/Apply.tsx` — branch handling around `supabase.auth.signUp` result
