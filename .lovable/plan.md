# Migrate to Lovable App Emails + Read-Only Viewer

## Goal
Make all 22 app-email templates visible in Cloud → Emails as the single source of truth, and replace the in-app editor with a read-only informational viewer at Minerva Workspace → Operations → Auto Emails.

## Part 1 — Scaffold Lovable's app-email system

1. Run `email_domain--scaffold_transactional_email`. This creates:
   - `supabase/functions/send-transactional-email/index.ts`
   - `supabase/functions/handle-email-unsubscribe/index.ts`
   - `supabase/functions/handle-email-suppression/index.ts`
   - `supabase/functions/_shared/transactional-email-templates/registry.ts`
2. In the registry, register all 22 templates as thin React Email components (one `.tsx` per template under `_shared/transactional-email-templates/`) using the HTML/subject already stored in `supabase/functions/_shared/transactional-emails.ts`. Each entry exports `{ component, subject, displayName, previewData }` per `TemplateEntry`.
3. Deploy the three functions. Result: all 22 templates appear in **Cloud → Emails → App emails**, editable via code (source of truth).

## Part 2 — Drop the custom editor, add read-only viewer

Location: **Minerva Workspace → Operations → Auto Emails** (existing tab).

Rewrite the tab as a read-only catalog for the 22 templates. For each template, show:
- Template name + key
- Subject line
- **Preview** of the rendered HTML (iframe with sandboxed srcDoc, using the body from `auto_email_templates` for now; later switchable to registry preview)
- **Trigger description** (free-text, e.g. "When an application is submitted") — read from `auto_email_templates.trigger_description` (add column) or a static map keyed by template key. Show "Not yet configured" when missing.
- **Recipient description** (free-text, e.g. "Applicant email address") — same pattern.
- **Schedule** (free-text, e.g. "Immediately after submission", "24h before event") — same pattern.
- **Connected badge** — green if the template has a live trigger (code invokes `send-transactional-email` with this key), red otherwise. Reuse existing `connected` boolean already in `auto_email_templates`.

Remove all edit/save/delete UI. Keep filtering + search.

## Part 3 — Access control

The viewer stays visible only to workspace users already permitted on the Operations tab (unchanged from current matrix).

## Technical details

- Registry pattern: each template file imports HTML string from `_shared/transactional-emails.ts` and renders `<Html><Head/><Body dangerouslySetInnerHTML={{__html: BODY}} /></Html>` — acceptable here because HTML is authored by us, not user input. Alternative: rewrite each as native React Email components. Use the dangerouslySetInnerHTML shortcut initially to avoid rewriting 22 templates by hand.
- Keep `auto_email_templates` table as the metadata store (trigger/recipient/schedule descriptions, connected flag) — no longer edited via UI, updated by migration/admin scripts.
- Add nullable columns `trigger_description text`, `recipient_description text`, `schedule_description text` to `auto_email_templates` for the viewer to display.
- Preview iframe: `<iframe sandbox="" srcDoc={template.body_html} />` sized responsively; no scripts allowed.
- No trigger wiring in this phase — that stays deferred until user provides rules per template.

## Out of scope
- Wiring actual triggers (deferred).
- Newsletter send flow.
- Editing templates from the UI (intentionally removed).
