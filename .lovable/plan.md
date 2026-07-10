## Situation

The unsubscribe link in newsletter footers points to `https://minervaims.org/unsubscribe?token=...`. That URL 404s in production, but not because the page is missing:

- `src/pages/Unsubscribe.tsx` already implements the full flow: validate token on load → show confirm button → POST to `handle-email-unsubscribe` → success / already-unsubscribed / invalid / error states, styled with the project's B&W + deep-purple system.
- `src/App.tsx` (line 111) registers the route: `/unsubscribe` → `<Unsubscribe />`.
- The edge function `handle-email-unsubscribe` is deployed and handles both GET (validate) and POST (confirm) with atomic token consumption and `suppressed_emails` upsert.

The 404 is a deployment-lag issue: the live site at `minervaims.org` (and the other custom domains) was last published before this route existed, so the production bundle has no `/unsubscribe` route and the SPA fallback lands on `NotFound`.

## Plan

Single step: **re-publish the app**. That ships the current `main` bundle — including the `/unsubscribe` route — to `minervaims.org`, `minervaims.com`, and the `.lovable.app` mirror. No code changes, no schema changes, no edge function redeploys needed (all already in place).

After publishing:
1. Verify `https://minervaims.org/unsubscribe?token=<real-token>` loads the confirmation page instead of the 404.
2. Click "Confirm unsubscribe" once with a disposable address to check the full round-trip: `email_unsubscribe_tokens.used_at` gets set, and a row appears in `suppressed_emails` with `reason = 'unsubscribe'`.
3. Confirm a subsequent send to that address is blocked at the suppression check in `send-transactional-email` (returns `email_suppressed`).

## Nothing else needs building

- No new page — `Unsubscribe.tsx` already covers all four states the user sees (validating, ready, success, already-unsubscribed, invalid, error).
- No new confirmation page — the same page transitions to the success state in place after the POST.
- No token or DB changes — `email_unsubscribe_tokens` is one-token-per-email, atomic check-and-update prevents double-use, and links reuse the same token across sends (so old newsletter links stay valid until the recipient actually unsubscribes).

If, after publishing, you want any copy or visual tweaks to the unsubscribe page (e.g. add the Minerva logo, a "resubscribe by contacting us" line, or a link back to the site), tell me and I'll do that as a follow-up.
