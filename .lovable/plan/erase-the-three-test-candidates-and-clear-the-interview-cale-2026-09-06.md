# Erase the three test candidates and clear the interview calendar

## Accounts to remove

Confirmed in the system (all Fall 2026 applications):

| Name | Email | Current status |
| --- | --- | --- |
| Mario Colombo | giordano.brunolucio@gmail.com | Accepted (has an interview booking) |
| Giovanni Parlati | contact.recruito@gmail.com | Received |
| Bruno Giordano | bruno.giordano@studbocconi.it | Joined (has an interview booking) |

None of them appear in the member register, the team page or the semester snapshots, so nothing public is affected.

## What will be removed

For each of the three:

- Their application from candidate screening, together with its internal note (1 note in total).
- Their interview bookings (2 bookings).
- Their uploaded CV and written answer files.
- Their login account, their profile record and their assigned access (two "candidate", one "alumni" leftover).
- Their newsletter subscription (all three are subscribed).
- Their entries in the email send log and the activity log, so no trace of them is left in the workspace history.

After this they are gone from every screen: candidate screening, offers, the interview calendar, users, activity and the newsletter list.

## Interview calendar

All 21 interview slots currently in the calendar are removed, including the 2 that were booked by these test candidates. The calendar is left empty, ready for real availability to be published for the next round.

## Technical notes

Deletion order to respect foreign keys: `interview_bookings` -> `application_notes` -> `applications` -> `interview_slots` (all rows) -> `user_roles`, `profiles`, `newsletter_subscribers`, `email_send_log`, `activity_logs` -> the three `auth.users` rows (removed through the admin API, not SQL, since the auth schema is managed). Storage objects under each user id prefix in the applications bucket are deleted with the storage admin API.

No schema change and no code change are required.
