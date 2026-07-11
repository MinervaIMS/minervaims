## Goal
Temporarily remove the Bocconi-domain restriction on the sign-up form so any valid email can register (needed to test the application flow).

## Change
- `src/pages/Auth.tsx`:
  - In `validateSignup`, drop the `bocconiEmail.test(suEmail)` check (keep the generic email format check).
  - In `signupValid`, remove the same `bocconiEmail.test(...)` condition.
  - Update the email field `hint` from "Use your @studbocconi.it or @unibocconi.it address." to something neutral like "Temporarily open to any email while testing." (or remove the hint entirely — pick one).
  - Leave the `bocconiEmail` regex constant in place (commented note) so it's trivial to re-enable later.

## Out of scope
- No backend/DB/edge-function changes. Any server-side domain checks (if present) are not being touched — flag only if discovered during implementation.

## How to revert
Restore the two removed conditions and the original hint text.
