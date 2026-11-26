- [x] Put the meeting link prominently in interview confirmations.
- [x] Add a once-only half-hour interview reminder with link.
- [x] Send division reassignment email after successful evaluation move.
- [x] Synchronize stored templates, deploy affected functions, and verify three test emails.
- [x] Add a 24-hour attendance reminder to registered event guests (template, job stage, Forms page, test email).
- [x] Rename the attendance email to “See you tomorrow” and send a fresh test.
- [x] Apply Step 90 migrations in order and verify database results (notices not exposed by the migration tool).
- [x] Copy Step 90 files unchanged and deploy the 34 listed functions.
- [x] Run coverage and ten rule checks; verify name-based count, CSV, attendance closing date, certificates, and export activity.
- [x] Repair the pre-existing activity category restriction without changing supplied files.
- [x] Publish Step 90: included in Step 96B publication request.
- [ ] Complete role-specific live checks: requires approved sessions for President, member, alumnus, Operations, and advisor accounts.
- [x] Apply Step 93B V2: 44 files copied unchanged, migration run via a short-lived helper (deleted), all 8 checks pass, 9 functions deployed, both daily jobs tested (200, expected bodies), all rule tests pass.
- [ ] Complete Step 93B role-specific live checks: publication requested in Step 96B; distinct role sessions still required.
- [x] Remove Riccardo Colombo's Sella interest entry; verified absent in database and signed-in attendance page, no email sent.
- [x] Show the company-visit CV ZIP button and use CV_<event name>.zip; filename test passes, invited-only access preserved, disabled state verified (Sella has no invited CVs to download).
- [x] Restore the public Board photo grid without Officers/Heads sections; all 12 photos verified on desktop and phone.
- [x] Add available public LinkedIn links to past Board members; verified 135 links across 14 semesters, public privacy protections preserved.

- [x] Step 96B: prerequisite 38 templates confirmed; copy all 13 supplied files unchanged.
- [x] Step 96B: deploy 10 functions; publication scheduled for minervaims.org, hosted preview succeeded without diagnostics.
- [ ] Step 96B: verify the published static-page build log reports 166 reports (full successful build log unavailable).
- [ ] Step 96B: apply 387KB stored-template SQL verbatim; available SQL tool takes inline SQL only, restricted shell cannot update rows. Stored templates still unchanged.
- [x] Step 96B: signed-in Sella and hoodie form returns, homepage Login, and Role Permissions verified; two return-path regression tests pass.
- [ ] Step 96B: send company-visit test script (missing attachment) and check actual inbox, password reset, and President-only help; requires script and President session.
- [x] Remove location and timing from company-visit interest and reserve emails, use a positive reserve subject; three email functions deployed, both stored copies saved and read back byte-exact with no location or date/time variables.
- [x] Align every app email's header and footer with "interest received" (re-sync 36 stored, fix 4 legacy; rechecked retained legacy stored copies).
- [x] Check the 16 switched-off emails are unused; delete them if so (rechecked: zero switched-off rows remain).
- [x] Step 97 V2: check Step 96B templates (42), application window (Fall 2026, closed), and first-package remnants (none).
- [x] Step 97 V2: copy all 61 supplied files unchanged; 61/61 byte comparisons pass.
- [x] Step 97 V2: apply recruiting schema with required explicit grants and plain user UUIDs; initialize settings separately; store ten exact supplied email bodies and metadata through authorized email management and data updates. All three switches off, three schedules correct, zero campaigns/signatures; all ten body hashes match.
- [x] Step 97 V2: deploy only the 11 listed functions.
- [x] Step 97 V2: 20/20 supplied tests pass; combined regressions 66 pass, 8 skip, 0 fail; audit coverage passes. Public Division Fit reaches result and closed Apply page; signed-in admin preview preselection, switch confirmations cancelled, Declarations and Phone Calls verified; no browser runtime errors.
- [x] Step 97 V2: four test emails sent to requesting admin account; email register confirms sent. No campaign launched.
- [x] Step 97 V2: publication requested for minervaims.org; hosted preview succeeds and is in sync.
- [x] Step 97 V2: published Division Fit page confirmed at minervaims.org/join/division-fit with its Start the test button.
- [ ] Step 97 V2: confirm required static-page build-log line (successful publication log is not exposed).
- [ ] Step 97 V2: President, Vice President, Division Head and candidate-specific live checks, including help and booking; requires those authorized sessions and actual call data. Supplied Members code shows Commitment only after a campaign exists, unlike prompt; no campaign created merely to test it.
- [ ] Step 97 V2: actual inbox receipt confirmation requires the recipient; email send register confirms all four sent.

- [x] Step 97B: verify Step 97 prerequisite templates (4) and signed documents.
- [x] Step 97B: copy all 35 supplied files byte-exact, without changing legal pages; originals backed up in /tmp.
- [x] Step 97B: apply own-member history and project reads through the migration tool; conditionally update email data separately. All four stored HTML hashes match the supplied SQL, privileges are true/true/false, and links match.
- [x] Step 97B: deploy only the six specified functions.
- [x] Step 97B: 33 combined profile, declaration, return-path and operations tests pass; audit coverage passes; preview build OK.
- [x] Step 97B: signed-in admin verifies all three profile pages, history read, old base and commitment links, and phone layouts (no overflow or runtime errors).
- [ ] Step 97B: analyst editing, applicant page and pending commitment/signature live checks require those authorized accounts and real pending data; no campaign created for testing.
- [x] Step 97B: publication requested for minervaims.org; declaration switches remain off, zero campaigns and signatures.
- [ ] Step 97B: confirm completed publication and required 166-report build-log line; deployment completion and successful publication build log are not exposed.

- [x] Step 98 B0: verify all 18 starting SHA-256 prefixes; all match.
- [x] Step 98 B0: copy all 23 supplied files byte-exact and delete RostersManagement.tsx; final hash comparison 23/23.
- [x] Step 98 B0: apply schema via migration tool and supplied data operations separately, then phone invitation update; NOTICE output is not returned by data tool. Verified 1 merge, 491 people, 1042 roster rows (16 register rows), and both subjects/titles. Anon Time Machine execution false.
- [x] Step 98 B0: deploy admin-auto-emails, preview-transactional-email and send-transactional-email.
- [ ] Step 98 B0: admin-rosters deployment and PDF download blocked by pre-existing sibling membership-certificate/assets.ts import in pdf.ts; fixing it would require changing a file outside this exact package.
- [x] Step 98 B0: 88 regression checks: 80 pass, 8 skipped, 0 fail; activity coverage passes; automatic preview build OK.
- [x] Step 98 B0: signed-in admin verifies newest semester/Board first, cross-semester search, person records from all three pages, CSV without codes, old roster link, Members and Alumni Since/Reports, removed frozen-register block, My Profile text/link, Role Permissions label, subjects and anonymous denial; no runtime errors.
- [ ] Step 98 B0: President and analyst live checks require their authorized sessions; commitment block/column visibility requires an actual campaign (zero remain, no campaign launched).
- [ ] Step 98 B0: published homepage still has twitter:site; publishing was not requested. Exact 166-report successful build-log line is not exposed by automatic preview diagnostics.

## Step 101 (IB Questions)
- [x] 0 starting check
- [x] 1 files
- [x] 2 migration
- [x] 3 deploy career-ib
- [x] 4 build/tests
- [ ] 5 guide uploads (needs the President and the two PDFs)
- [ ] 6 role checks (Analyst, VP/Head of Ops, applicant, phone)

## Step 101 fix (My Profile reports)
- [x] 0 starting check
- [x] 1 files
- [x] 2 migration
- [x] 4 tests
- [ ] 5 live checks: check 2 passed (admin); checks 1 and 3 need a member account with reports

## Step 102 (website speed)
- [x] 0 starting check: all 31 SHA-256 prefixes match; all 14 new files absent.
- [x] 1 copy all 45 package files byte-for-byte; 31 replaced, 14 new, originals backed up in /tmp.
- [x] 2 database: no migration required.
- [x] 3 functions: nothing to deploy.
- [x] 4 regression tests: 17 files, 143 tests, 135 passed, 8 skipped because dist is absent, 0 failed; activity coverage passes; automatic preview diagnostics say build OK.
- [ ] 4 production-only evidence: separate app/Node type-check results and required static-page/prerender build lines are not exposed by the preview harness; manual builds/typechecks are prohibited.
- [x] Preview checks at 1280 and 390 pixels: homepage renders, carousel clicks and two quick arrow keys select the expected reports, 144 ticker images load, About/Archive/Equity/Join/Workspace render without horizontal overflow or runtime errors.
- [ ] 5 published checks: desktop first screen, phone intro/reload, other addresses, carousel keyboard/touch, alumni logos and live PageSpeed scores; requires publication.

## Step 103
- [x] Starting check
- [x] Copy 12 files
- [x] Redeploy admin-fees
- [x] Tests and checks
- [ ] Live checks: Safari, Operations Analyst account, menus/drag (need user or other accounts)

## Membership fee eligibility repair
- [x] Include members on exchange and one-semester leave in collections, payments, reminders and semester registers; 22 fee regression checks pass.
- [x] Restore missing open-collection rows (Gian Nicola Buda, Boris Penev, Annadele Tortora) without changing payments or sending receipts; signed-in fee list confirms 62/93 paid and all four exchange members visible.

## Membership fee email cycle
- [x] Add confirmed payment receipts and one-time implementation snapshot for 9 November, 09:00 Rome (77 eligible paid rows, including closed collections).
- [x] Repeat unpaid reminders every four Italian working days from opening, with registration-delay disclaimer.
- [x] Hide second deadline until the first expires across emails and workspace.
- [x] Synchronize email layouts, deploy, send admin test copies, and verify rules and live confirmation/cancel on desktop and phone.
- [ ] Confirm actual paid-save email end-to-end with an approved real payment; no member payment changed solely for testing.

## Step 105
- [x] Start-file SHA-256 check
- [x] Copy package files, delete src/pages/Numbers.tsx
- [x] Seven database changes and the six read-only checks
- [x] Deploy admin-partnerships; redeploy admin-fees, admin-event-reg, report-file, admin-events, admin-auto-emails
- [x] Tests, type checks, activity coverage, build
- [x] Public page checks (track record, events numbers, company relations, partnerships, author filter)
- [ ] Signed-in workspace checks (fee exemption, selection attendance, alumni-call prefill, event places, Website > Partnerships, download name) — not run this turn
- [ ] Siddhanth spelling script — waits for the President's confirmation

## Step 105B
- [x] Starting-point fingerprints checked
- [x] Package files copied; manual Siddhanth script deleted
- [x] Siddhanth spelling migration applied
- [x] Partnerships one-list migration applied
- [x] admin-partnerships and register-event redeployed
- [x] Tests, type checks, activity coverage, build
- [ ] Signed-in and phone checks (section 5, items 3, 5, 6, 7)

## Step 106C
- [x] Starting check: all eight complete SHA-256 hashes matched; new test absent.
- [x] Copy all nine supplied files byte-for-byte; no migration or existing-data changes.
- [x] Redeploy admin-event-reg.
- [x] Tests: 36 files, 251 tests, 243 passed, 8 skipped (production dist absent), 0 failed; activity coverage passes; automatic preview build OK.
- [x] Section 5 checks 1, 2, 3 and 5: admin session at 390px, temporary hidden internal event only; rapid ticks persisted, double tap added one guest, existing admin registration ticked without duplicate, event deleted and zero registrations remain. Used two no-address guests and one admin registration, not two owned test addresses or a President account.
- [ ] Section 4 standalone app/Node type checks and production build evidence: manual execution prohibited by harness; automatic preview diagnostics only.
- [ ] Section 5 check 4 and exact President/two-address setup: require President session, two owned test addresses and a physical phone camera/confirmation-email ticket; synthetic QR regression tests pass.

## Step 106D
- [x] Starting fingerprints: all eight SHA-256 hashes matched and all four new files absent.
- [x] Copy all twelve package files byte-for-byte; no migrations or existing-data changes.
- [x] Tests: 37 files, 256 tests, 248 passed, 8 skipped because production dist absent, 0 failed; activity coverage passes; automatic preview build OK.
- [x] Admin browser check: PDF beside CSV on desktop and 390px, PDF remains available when search has no matches, failed download shows an error without breaking Attendance; zero page errors.
- [ ] Deploy event-door-list: supplied pdf.ts imports ../membership-certificate/assets.ts, which deployment excludes; bundle fails Module not found. Requires corrected package or authorization to move the dependency to _shared and update the import/tests/rule.
- [ ] Section 5 checks 1–6: download parts of 1, 3 and 5 failed because function cannot deploy; PDF content (2), audit download (4) and Advisor access (6) unverified. UI portions of 1, 3 and 5 passed as admin, not President.
- [ ] Standalone app/Node type checks and production build output: manual execution prohibited; automatic preview diagnostics only.

## Step 106E
- [x] Manual waiting-list admission: confirmed organiser control on desktop/390px, atomic admission with one ticket and no attendance tick; Zihan Huang moved to Private Banking registration via the UI, verified after reload and database read (one registration, zero waiting rows, not attended); ticket email sent. All 261 tests: 253 pass, eight skip, zero failures; activity coverage and preview build OK.
- [x] All three starting SHA-256 hashes matched; shared letterhead absent.
- [x] Copy all four supplied files byte-for-byte; no migration or stored-data changes.
- [x] Deploy event-door-list; 37 files, 258 tests: 250 pass, 8 skipped (production output absent), zero failures; no unrecorded write paths; preview build OK.
- [x] Section 5 checks 1, 3, 4, 5 passed as requesting admin (not President): desktop and 390px downloads, full 218-person list after no-match search, audit entries; mobile CSV/PDF side by side.
- [x] Section 5 check 2: eight-page PDF, letterhead/metadata/summary, alphabetical names and boxes, final ruled walk-ins page, zero addresses; all downloaded copies identical in text.
- [ ] Section 5 check 2 checked-in tick/time and exact President setup: chosen event has zero attended; needs event with checked-in participants and President session.
- [ ] Section 5 check 6 Advisor download: needs approved Advisor session; admin download does not verify Advisor access.
- [x] Section 5 check 7: past semester roster PDF attempted; no download, failed. admin-rosters and membership-certificate left unchanged as requested.
- [ ] Standalone app/Node type checks: manual execution prohibited; rely on automatic preview checks.

## Step 108
- [x] Run the pre-migration fee-collection check and verify the package against its base.
- [x] Verify all 64 supplied SHA-256 prefixes; copy the 59 application files byte-for-byte.
- [x] Apply the five migrations in order (0029–0033) and verify data backups and no email sends.
- [x] Deploy admin-fees, admin-rosters, admin-event-reg and membership-certificate.
- [x] Run all 294 tests (286 passed, 8 skipped), activity coverage and preview checks.
- [x] Verify short links, drawdowns, Chronometer, Applicant Preview devices, profile URL and phone search in the signed-in preview.
- [x] Request publication of Step 108.
- [x] Resolve the live near-match discrepancy by refreshing the supplied reader; the signed-in Time Machine now returns all four pairs, with no pair approved or merged.

## Step 110
- [x] Audit the 66 supplied files against the clean Step 109 starting point.
- [x] Copy all 63 application files byte-for-byte and delete MobileViewTable.tsx.
- [x] Apply the three supplied SQL migrations unchanged, in order, and verify Elena Michetti's Spring 2026 correction and backups.
- [x] Redeploy all 41 listed functions.
- [x] Run the full regression suite (334 tests: 321 passed, 13 skipped), activity coverage and preview checks.
- [x] Verify the main signed-in and public flows without deleting accounts or rejecting candidates.
- [x] Request publication of Step 110.
- [ ] President-only, deletion, rejection and certificate-preview checks: require a President session, pending accounts, a closed recruitment round or an issued certificate.
