# Stop the same automatic email arriving two or three times

## What is happening

The duplicates are real and I can see them in the send records. Both cases are the
"application received" email:

- 06 Sep 00:33 — one candidate got 3 copies, queued 15 milliseconds apart
- 06 Sep 00:30 — another got 2 copies, queued 2 milliseconds apart

No other automatic email in the register shows duplicates, so this is not a
general sending problem: it is the "application received" message specifically,
and it happens because the success screen after submitting an application asks
the system to send that email more than once at nearly the same instant.

## Why the existing safeguard doesn't catch it

There is already a "send only once" check: the application record stores the
moment the received email was sent, and the code refuses to send if that moment
is already filled in. But the check and the writing of the moment are two
separate steps. When two or three requests arrive within milliseconds, all of
them read "not sent yet" before any of them writes, so all of them send.

Nothing further downstream stops it either: the queue's duplicate-protection
label is built from a freshly generated random identifier, so every copy looks
like a brand-new email to the queue.

## The fix (three layers, so it cannot come back)

1. **Make the "only once" claim atomic.** Instead of reading and then writing,
   the record is claimed in a single conditional write; only the request that
   wins the claim sends the email, the others quietly stop. This is the same
   claiming pattern already used for the offer reminder and offer expiry emails.
2. **Stop the page asking twice.** The success screen currently re-runs its
   start-up work whenever its dependency identity changes and again under
   development double-mounting. It will fire once per page load only.
3. **Add a general duplicate guard for every automatic email.** Before queueing,
   the helper skips the send if the identical template was already queued to the
   same address within the last few minutes. This protects the other 20+
   automatic emails from ever developing the same fault.

## Technical detail

- `supabase/functions/applicant-notify/index.ts` — replace the
  read-then-update guard on `received_email_sent_at` with
  `update applications set received_email_sent_at = now() where id = ... and received_email_sent_at is null returning id`;
  send only when a row comes back. Redeploy the function.
- `src/pages/Apply.tsx` (`SuccessScreen`) — run the notify call from an effect
  with an empty dependency list plus a module/ref-level "already fired" guard so
  double invocation cannot repeat the request; `refreshProfile` is read from a ref.
- Migration: update `public.enqueue_app_email` to short-circuit when
  `email_send_log` already holds a row with the same `template_name` and
  normalised recipient created within the last 5 minutes, and to derive the
  queue `idempotency_key` from that pair plus a time bucket instead of the random
  `message_id`. No table or grant changes.
- No change to templates, layouts, wording, or any other automatic email trigger.

## Verification

Submit a test application end to end and confirm exactly one row per recipient in
the send register, then re-run the duplicate query over the send log to confirm no
burst of more than one copy remains.
