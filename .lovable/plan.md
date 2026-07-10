## Diagnosis

The app-email subject fix was applied only at the template registry/send entry point, but not at the final delivery boundary. That leaves the queue worker trusting whatever `subject` was placed in the queued payload. If a test/enqueue path passes the template key or omits the resolved subject, the delivered email can use `newsletter_applications_open` as the subject even though the template itself says `Applications are now open | Minerva IMS`.

There is also a concrete formatting bug in the current subject normalizer: it collapses whitespace before punctuation using a regex that includes `|`, so a valid subject can become `Applications are now open| Minerva IMS`. That directly conflicts with the requested readable suffix.

The link audit found three categories to address:
- Fixed links: legal pages, archive, join, auth, social links, and contact mailto links.
- Expected dynamic links: auth confirmation URLs, event registration URLs, generic CTA URLs, division URLs, and poster image URLs.
- Unconnected manual unsubscribe text in newsletter-style app emails: the email system already appends the real unsubscribe footer, so these manual `mailto` unsubscribe links should be removed to avoid a disconnected unsubscribe path.

## Implementation plan

1. **Centralize subject formatting**
   - Add a shared subject helper for email functions.
   - Enforce exactly one suffix format: ` | Minerva IMS`.
   - Normalize duplicates and broken variants, including `|Minerva IMS`, `| Minerva IMS`, and repeated suffixes.
   - Substitute `{{placeholder}}` values before suffix normalization.
   - Never remove the space before `|`.

2. **Fix app-email subject resolution at every boundary**
   - Update the app-email registry so every template resolves through the shared helper.
   - Update `send-transactional-email` so it stores both the resolved subject and the original `templateData` in the queued payload.
   - Update the queue processor so, immediately before delivery, it re-validates the subject:
     - If missing, blank, equal to the template key, or still snake_case-like, recover it from the registered template.
     - If dynamic data is available, use it for placeholder substitution.
     - Always enforce the ` | Minerva IMS` suffix.
   - Apply the same suffix guard to auth email subjects in the queue processor and auth hook.

3. **Make previews and test sends robust**
   - Give registered app-email templates realistic preview data for placeholders such as `event_title`, `division_name`, `division_slug`, `registration_url`, `cta_url`, `applications_deadline`, and dates.
   - Ensure the preview endpoint returns the same resolved subject that real sends will use.
   - This prevents empty placeholders and makes the Lovable email overview/test preview consistent with real delivery.

4. **Audit and fix all email links**
   - Extract all `href` and image `src` values from auth and app email templates.
   - Verify fixed public links resolve:
     - `/archive`, `/auth`, `/join`, `/privacy-policy`, `/cookie-policy`, `/terms-of-use`, `/disclaimer`, `/statute`
     - LinkedIn and Instagram pages
     - Contact `mailto:` links
     - Email logo URL
   - Confirm dynamic links are intentionally dynamic and have validation/fallbacks:
     - `{{confirmation_url}}` for auth emails
     - `{{registration_url}}` for event emails
     - `{{cta_url}}` for general app emails
     - `https://minervaims.org/divisions/{{division_slug}}`
     - `{{poster_url}}`
   - Remove manual newsletter unsubscribe `mailto` copy from app-email HTML, relying on the system-managed unsubscribe footer.

5. **Keep the admin auto-email catalogue aligned**
   - Update the read-only auto-email overview so code-defined templates are the source of truth for subject/body/name where applicable.
   - Keep the sent register unchanged.
   - This prevents stale database catalogue rows from displaying a different subject than the actual delivered email.

6. **Deploy and validate**
   - Deploy the affected email functions: app send, app preview, queue processor, auth hook, and admin auto-email overview.
   - Test the specific case `newsletter_applications_open` and confirm the subject is `Applications are now open | Minerva IMS`.
   - Test a dynamic subject and confirm placeholders are substituted before the suffix.
   - Confirm no generated subject can end as `...| Minerva IMS` without the required space.
   - Re-run the static link audit and report any remaining intentionally dynamic links.