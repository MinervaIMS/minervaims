## Goal
Ensure all 22 app-email templates from the design pack are present in `auto_email_templates` as editable rows, with **no automatic triggers wired**. Firing logic and recipients will be decided later.

## Current state
Phase 2a already seeded all 22 templates into `auto_email_templates` via the `transactional-emails.ts` definitions. No trigger code was added — no edge function currently calls `send-transactional-email` for these keys.

## What this plan does
1. Verify all 22 template rows exist in `auto_email_templates` with correct `key`, `name`, `subject`, `body_html`, and `connected = true` (meaning "available for editing/use"), and that no stray trigger code was introduced.
2. Register the same 22 templates in the app-email registry (`supabase/functions/_shared/transactional-email-templates/registry.ts`) so `send-transactional-email` can send them on demand (from admin UI or manual invocation) — still without any automatic trigger.
   - Each template becomes a thin React Email wrapper that renders the HTML body stored in `auto_email_templates` (single source of truth for copy).
3. Deploy `send-transactional-email` so the new registry entries are live.
4. Leave every existing edge function untouched — no `admin-applications`, `admin-fees`, `admin-events`, `admin-alumni-calls`, `admin-members`, `admin-settings`, or cron changes.

## Result
- All 22 templates editable in the admin Email Templates UI.
- Any of them can be sent manually later once you tell me the trigger + recipient rules.
- Zero emails will fire automatically from this change.

## Technical notes
- Registry entries use `component` = simple `<Html><Body dangerouslySetInnerHTML>`-free wrapper that pulls subject/body from `templateData` (or from a compile-time constant per key). Templates are static HTML from the design pack, no per-recipient props required beyond `{{name}}` etc., which callers will pass via `templateData` when they eventually wire triggers.
- No DB migration needed — rows already exist.
- No new secrets, no cron, no new tables.

## Open items deferred (not part of this plan)
- When each template fires and to whom (07, 11, 12, 13, 17, and the rest).
- Whether newsletter sends go to all subscribers or a staged list.