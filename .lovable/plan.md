## Diagnosis: why test-send subjects are wrong

App-email subjects in `supabase/functions/_shared/transactional-emails.ts` contain `{{placeholders}}` (e.g. `"You are invited: {{event_title}} | Minerva IMS"`, `"Overdue: {{task_name}} | Minerva IMS"`, `"Membership fee · {{semester_label}} | Minerva IMS"`).

In `transactional-email-templates/registry.ts` the subject is registered as a plain static string (`subject: t.subject`). The `substitute()` helper only runs on the HTML body, never on the subject. So:

- The Lovable Cloud "test send" and the `preview-transactional-email` function ship the subject with literal `{{event_title}}` / `{{task_name}}` / `{{semester_label}}` still in it.
- Real production sends have the same bug — placeholders in subjects are never replaced.

## Plan

### 1. Fix subject rendering (registry.ts)

Change registry so `subject` becomes a function that:
- Substitutes `{{placeholders}}` against the caller's `templateData` using the existing `substitute()` helper.
- Collapses leftover empty tokens (e.g. `"You are invited:  | Minerva IMS"` after empty event_title in preview) into a clean subject.
- Guarantees the final subject ends with ` | Minerva IMS` (append if missing, idempotent — a scan of all 23 current subjects shows they already end with it, but the guard prevents regressions from future template edits).

`send-transactional-email/index.ts` already handles `typeof template.subject === 'function'`, so no change is needed there. `preview-transactional-email/index.ts` already handles the function form too.

### 2. Unified logo across every email (auth + app)

Upload the attached PNG (`user-uploads://email_logo.png`, purple M with lions, square ~1:1) as a Lovable asset:

```
lovable-assets create --file /mnt/user-uploads/email_logo.png \
  --filename minerva-email-logo.png > src/assets/minerva-email-logo.png.asset.json
```

Read the resulting CDN URL from the generated `.asset.json`.

**App emails (`_shared/transactional-emails.ts`)** — 23 occurrences of the current header `<img …mims-full-logo-color.png width="68" height="54"…>`:
- Replace URL with the new asset URL.
- Replace dimensions with `width="60" height="60"` (source is square; keeps proportions fixed via matching `width`/`height` attrs plus inline `style="width:60px;height:60px"`).
- Keep the wrapping `<td>` layout, alt text, and border-left divider column unchanged.

**Auth emails (`_shared/email-templates/*.tsx`, all 6 files: signup, magic-link, recovery, invite, email-change, reauthentication)**:
- Add `Img` to the `@react-email/components` import.
- In the `<Section style={header}>` block, insert an `<Img src={LOGO_URL} width={60} height={60} alt="Minerva IMS" style={{ display:'block', margin:'0 auto 12px', width:60, height:60 }} />` above the existing `MINERVA IMS` wordmark.
- Define `LOGO_URL` as a module-level constant containing the CDN URL (hardcoded; auth templates have no template-data pipeline for it).

### 3. Enforce "| Minerva IMS" subject suffix everywhere

- **App emails**: enforced at render time by the registry function wrapper (step 1). Also do a one-time audit pass over the 23 static `subject:` strings in `transactional-emails.ts` — all already end with `| Minerva IMS`, leave text as-is.
- **Auth emails**: Lovable's managed auth-email pipeline sets the subject line per action (Confirm your email, Reset your password, etc.) outside the template TSX. Append `" | Minerva IMS"` inside the auth-email-hook where the subject is passed to the Email API (or, if the hook does not set a subject, add a `subject` override there). Read `supabase/functions/auth-email-hook/index.ts` first to locate the correct field, then patch it with an idempotent suffix guard.

### Files touched

- `supabase/functions/_shared/transactional-email-templates/registry.ts` — subject function + suffix guard.
- `supabase/functions/_shared/transactional-emails.ts` — 23 logo URL/size swaps (single `sed`-style pass).
- `supabase/functions/_shared/email-templates/signup.tsx`
- `supabase/functions/_shared/email-templates/magic-link.tsx`
- `supabase/functions/_shared/email-templates/recovery.tsx`
- `supabase/functions/_shared/email-templates/invite.tsx`
- `supabase/functions/_shared/email-templates/email-change.tsx`
- `supabase/functions/_shared/email-templates/reauthentication.tsx`
- `supabase/functions/auth-email-hook/index.ts` — auth subject suffix guard.
- `src/assets/minerva-email-logo.png.asset.json` — new Lovable asset pointer.

### Deploy

After edits, redeploy:
- `send-transactional-email`
- `preview-transactional-email`
- `auth-email-hook`

### Out of scope

- Rewriting the DB-backed `admin-auto-emails` source of truth (separate migration already discussed).
- Editing template body copy or trigger wiring.
- Any dashboard/UI changes.
