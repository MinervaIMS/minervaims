# The duplicate application from Toma-Ioan Dumitrescu

## What actually happened

Not a system fault, and not a real duplicate: he applied twice, one minute apart, with two different email addresses.

| Submitted | Email | Account |
| --- | --- | --- |
| 17:46 (12 Sep) | tomaioan.dumitrescu@**srud**bocconi.it (typo) | separate account |
| 17:47 (12 Sep) | tomaioan.dumitrescu@**stud**bocconi.it (correct) | separate account |

Everything else in the two applications is identical (Investment first choice, Portfolio second, same documents re-uploaded). He clearly mistyped the address, created an account with it, submitted, then repeated the whole thing correctly.

The one-application-per-person rule only compares the email address and the account, so two different addresses read as two different people. That check worked as designed; the address is what was wrong.

Why the misspelled address was accepted at all: the rule that requires a real @studbocconi.it address is currently switched off in the submission step (it was disabled for testing). With it on, the first attempt would have been refused immediately and no duplicate would exist.

Three emails were already sent to the misspelled address; none of them can have arrived.

## Proposed fix

1. Remove the mistaken submission (the "srud" one) completely: its application, its login account and profile, its candidate access, its newsletter entry, its send-log rows, and the two uploaded files. It has no notes and no interview booking, so nothing else is attached to it. The correct application stays untouched, keeping its current "CV opened" state.
2. Turn the student-address requirement back on in the submission step, so a mistyped domain is refused at the point of submitting instead of creating a second candidate. This is a one-line restoration of an existing rule.

Point 2 is worth confirming: it means anyone without a valid @studbocconi.it address can no longer apply at all, so if you are still testing with outside addresses, say so and I will leave it off.

## Technical notes

- Rows to delete for application `89a4d8e7-…` / user `62b07dbf-…`: `applications`, `user_roles` (1 candidate row), `profiles`, `newsletter_subscribers`, `email_send_log` (3 rows), then the auth account via the admin API, then the two storage objects under the user-id prefix in the `applications` bucket.
- `supabase/functions/submit-application/index.ts`: re-enable the `STUD_EMAIL` check in the eligibility block (currently commented out as "Domain check temporarily disabled for testing"), returning a clear message naming the required address format.
- No schema change, no migration.
