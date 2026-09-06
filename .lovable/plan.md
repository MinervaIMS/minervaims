# Document automatic email triggers

## Goal
Add a readable trigger map for the 12 connected automatic emails so workspace users can see exactly when each one fires, without changing any send logic.

## What will change

1. **Workspace guide entry**
   - Add a new Operations subsection, key `ops-auto-emails`, label "Automatic emails", in `src/lib/workspace-guide.ts`.
   - Include a concise topic that lists each connected template, its recipient, and the event/status/cron that triggers it.
   - Explicitly note that the three "Workspace • …" templates are connected but have no automatic trigger yet.

2. **Auto emails page metadata**
   - Populate `trigger_description`, `recipient_description`, and `schedule_description` on the connected `auto_email_templates` rows so the existing AutoEmails UI shows them in the Trigger / Recipient / Schedule columns.
   - Use a small SQL migration that updates only the description fields; no send behavior changes.

## Out of scope
- Wiring the three Workspace emails to real events.
- Changing email copy, subjects, or send conditions.
- Adding new templates or triggers.

## Verification
- Build passes.
- The new guide entry renders in the workspace help panel.
- The AutoEmails page shows trigger/recipient/schedule text for the connected application emails.