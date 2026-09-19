# End-to-end test of a Media and Operations application

Goal: prove that an application to the joint Media and Operations intake now goes all the way through — form accepted, record created, documents stored, confirmation email sent, candidate visible in Candidate Screening — then remove the test entirely.

## What the test does

1. Fill in the apply form in a real browser as a test person with your test address (riccardo.colombo7@studbocconi.it), first choice Media and Operations, second choice left empty, with a small placeholder CV. This intake asks no written question, which is exactly the case that used to fail.
2. Submit and read what the page says back to the applicant.
3. Check the record: the application exists for Fall 2026, first choice Media and Operations, the CV is stored and can be opened, and no written answer is expected.
4. Check the confirmation email was recorded as sent for that address.
5. Open Candidate Screening and confirm the test person is listed, opens, and shows the CV.
6. Remove the test: delete the application, its notes, its stored CV, and the account created for the test address, so nothing is left in the intake, in the count of applicants, or on the register.

## Notes

- One real email will arrive at the test address. Nothing is sent to anybody else.
- The test uses the same public form a real applicant uses, so it also confirms the form is open and the intake is offered.
- If the submission fails, I stop before step 6, report the exact reason, and propose the fix separately rather than changing anything inside this test.

## Technical detail

- Playwright drives `http://localhost:8080/apply` at 1280x1800 against the live backend.
- Verification uses read-only queries on `applications`, `email_send_log`, and the storage path in `cv_path`.
- Cleanup: `application_notes` and `applications` rows for the test id, the objects under the applicant's storage folder, then the auth user; each confirmed by a follow-up read.
