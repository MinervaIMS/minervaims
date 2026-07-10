## Goal
Stop newsletter emails from being flagged as spam by giving recipients a clear, working way to unsubscribe — both visibly in the email body and via the RFC 8058 one-click header that Gmail and Outlook check.

## Current state (confirmed by audit)
- `email_unsubscribe_tokens` table exists.
- `handle-email-unsubscribe` supports GET (validate), POST (JSON confirm from the app), and POST (form-encoded one-click per RFC 8058).
- `send-transactional-email` already generates a per-recipient token and forwards it as `unsubscribe_token` to the queue.
- `process-email-queue` passes it to the provider so Lovable's send layer can attach the standard headers.
- Public page `src/pages/Unsubscribe.tsx` shows the confirm/success UI.
- The three newsletter templates in `supabase/functions/_shared/transactional-emails.ts` — `newsletter_applications_open`, `newsletter_applications_closing`, `newsletter_public_event` — do **not** contain a visible Unsubscribe link.

## Two solutions considered

### Option A — Visible in-body link only (minimal)
Add an "Unsubscribe" link to the footer of the three newsletter templates. The link resolves to `https://minervaims.org/unsubscribe?token={{unsubscribe_url_token}}`. Rely on the provider (Lovable Send) to attach the RFC 8058 headers automatically from the `unsubscribe_token` we already pass.

- Pros: smallest change, no header plumbing, no risk to transactional emails.
- Cons: if the provider does not attach `List-Unsubscribe-Post`, Gmail's "one-click unsubscribe" UI won't show and bulk-sender scoring stays weaker.

### Option B — Visible link + guaranteed RFC 8058 headers (recommended)
Do Option A **and** explicitly set the outbound headers so we don't depend on provider behavior:
- `List-Unsubscribe: <https://minervaims.org/unsubscribe?token={{TOKEN}}>, <mailto:unsubscribe@minervaims.org?subject=unsubscribe:{{TOKEN}}>`
- `List-Unsubscribe-Post: List-Unsubscribe=One-Click`

Gmail bulk-sender requirements (Feb 2024) and Yahoo's equivalent both look for these two headers together. This is what materially reduces the spam score for newsletter-style messages.

Recommendation: **Option B**, scoped to the newsletter templates only. Transactional emails (application receipts, offers, role changes, etc.) do not need the visible link — the system already appends its standard footer and adding an "Unsubscribe" link there would be wrong, because those recipients cannot opt out of receiving essential account communications.

## Implementation plan (Option B)

### 1. Template-level: three newsletter templates only
In `supabase/functions/_shared/transactional-emails.ts`, edit the footer `<td>` block of `newsletter_applications_open`, `newsletter_applications_closing`, `newsletter_public_event`.

Add a short sentence just above the legal disclaimer, using the existing 11px muted style:

```html
<p style="margin:0 0 10px;font-family:Calibri,...;font-size:11px;line-height:1.7;color:#737373;">
  You received this because you are subscribed to Minerva IMS updates.
  <a href="{{unsubscribe_url}}" style="color:#737373;text-decoration:underline;">Unsubscribe</a>.
</p>
```

The placeholder name `{{unsubscribe_url}}` is new; it is substituted at render time (step 2). Keep colors, font sizes, and spacing consistent with the surrounding footer to preserve the black-and-white minimal aesthetic.

### 2. Renderer: inject `unsubscribe_url` into `templateData`
In `supabase/functions/_shared/transactional-email-templates/registry.ts`, before calling `substitute()`, merge an `unsubscribe_url` field derived from the token:

```
unsubscribe_url = `https://minervaims.org/unsubscribe?token=${data.unsubscribe_token}`
```

We already have `unsubscribe_token` available in the send pipeline; we just need to expose it to the template renderer. Two clean paths:

- **Path 1 (preferred):** in `send-transactional-email/index.ts` where we build the payload for the queue, add `unsubscribe_url` to the `templateData` we pass into rendering.
- Path 2: build the URL inside `registry.ts` when `data.unsubscribe_token` is present.

Path 1 is preferred because the send function already knows the site origin and the token; the registry stays a pure substitute layer. Non-newsletter templates that don't reference `{{unsubscribe_url}}` simply ignore the extra field.

### 3. SMTP headers: add List-Unsubscribe + List-Unsubscribe-Post
Extend the payload passed to Lovable Send to include a `headers` object (or the equivalent field the SDK exposes) for newsletter sends:

```
List-Unsubscribe: <https://minervaims.org/unsubscribe?token=TOKEN>, <mailto:unsubscribe@minervaims.org?subject=unsubscribe:TOKEN>
List-Unsubscribe-Post: List-Unsubscribe=One-Click
```

We wire this in `process-email-queue/index.ts` at the `sendLovableEmail(...)` call so all queue-sent emails carry it (safe: adding these headers to transactional emails is harmless and actually improves inbox reputation across the domain).

If the Lovable send API does not accept custom headers, we fall back to relying on the `unsubscribe_token` field alone; the visible in-body link from step 1 still satisfies the "visible unsubscribe" spam-filter heuristic. We verify with a curl to the provider before writing this step.

### 4. Verify `handle-email-unsubscribe` accepts the one-click POST
Already implemented per the audit — no change needed. We will manually POST a form-encoded body during verification to confirm the RFC 8058 flow still returns 200.

### 5. Deploy and verify
- Redeploy `send-transactional-email` and `process-email-queue`.
- Send a test `newsletter_applications_open` to `criccardo480@gmail.com` and `test-*@mail-tester.com`.
- Check mail-tester score (target: no penalty for missing unsubscribe).
- In Gmail, confirm the "Unsubscribe" chip appears next to the sender name (only appears when `List-Unsubscribe-Post` header is present).
- Click the link, confirm the token validates, POST confirms, and the address is inserted into `suppressed_emails` with `reason='unsubscribe'`.
- Send a follow-up newsletter to that same address and confirm `send-transactional-email` short-circuits with the suppression check.

## Scope guardrails
- **Only the three `newsletter_*` templates get the visible link.** All other transactional templates remain unchanged — offers, role changes, application status, etc. are essential communications that must not carry an opt-out affordance.
- **No schema changes.** Existing tables and RLS are sufficient.
- **No new edge functions.** We reuse `handle-email-unsubscribe`.
- **No changes to auth emails.** Password reset, magic link, etc. are not marketing-adjacent.

## Files that will change
- `supabase/functions/_shared/transactional-emails.ts` — footer HTML of three newsletter templates.
- `supabase/functions/send-transactional-email/index.ts` — inject `unsubscribe_url` into `templateData` and pass a `headers` object.
- `supabase/functions/process-email-queue/index.ts` — forward `headers` to `sendLovableEmail`.

## Risks & mitigations
- **Risk:** provider ignores custom `headers` field. **Mitigation:** step 1's visible link already covers the primary spam heuristic; step 3 is additive.
- **Risk:** users click Unsubscribe on a newsletter and stop receiving transactional emails too. **Mitigation:** the current `suppressed_emails` check blocks all sends to that address. If we want newsletter-only suppression later, we'd add a `scope` column — out of scope for this change; call it out to the user so they explicitly accept the current all-or-nothing behavior.
- **Risk:** dark-mode client inverts the muted grey. **Mitigation:** existing `<meta name="color-scheme" content="light only">` in newsletter templates already pins light mode.
