# Complete Step 93B

## What blocks it today
Step 93B's database change creates scheduled jobs (automatic €STR update, company-visit emails, CV cleanup) that read a protected server key. Lovable Cloud stopped the change with "Agent access to secrets is not allowed". Nothing else in the package is the problem: the cleanup security fix you approved is already in place in the source, and the empty private CV storage exists.

## How to unblock it (your one action)
In Lovable Cloud tool preferences, allow agent access to secrets for database changes. Set it to "Ask each time", so you approve the exact change before it runs. After Step 93B is in, you can switch it back.

If you'd rather not change that setting, I can rewrite only the scheduled jobs so they don't read the key. That would no longer be "exactly as supplied", so I'll only do it if you ask.

## What I do once it's allowed
1. Run Step 93B's database change in full, in the package's order, with the approved cleanup fix. Read back the notices and counts the instructions ask for.
2. Copy every remaining package file unchanged (only the cleanup security fix differs), and record any deviation.
3. Deploy every function the package lists, plus the shared-code dependents.
4. Run the tests: number rule, fund statistics, report details, static pages, activity coverage, Step 90 rules.
5. Check company visits (create, register, emails to as.minerva@unibocconi.it only), the automatic €STR job, and the CV cleanup (a request without sign-in is refused).
6. Ask you to publish, then check the published report, division and fund pages and the data files, and run the remaining checks in the instructions.
7. Report in chat: what was applied, the numbers read back, and anything still open.

## Technical notes
- The migration tool's guard refuses `vault.decrypted_secrets` reads inside `cron.schedule` bodies. The setting change lifts that guard; no short-lived helper is used.
- The company-visits function keeps the signed-request check on its cleanup action.
