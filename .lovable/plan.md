## Goal

From the attached schedule, pre-populate the workspace Calendar with the nine CASA Committee meeting dates, and add a companion entry type for the corresponding request-submission deadlines. Both are visible only to Board members (same rule already used for `casa_committee`).

## Dates to insert

| Meeting (`casa_committee`) | Request deadline (`casa_deadline`) |
| --- | --- |
| 2026-09-23 | 2026-09-16 |
| 2026-10-14 | 2026-10-07 |
| 2026-11-11 | 2026-11-04 |
| 2027-01-27 | 2027-01-20 |
| 2027-02-17 | 2027-02-10 |
| 2027-03-22 | 2027-03-15 |
| 2027-04-14 | 2027-04-07 |
| 2027-05-19 | 2027-05-12 |
| 2027-07-07 | 2027-06-30 |

Meeting title: "CASA Committee meeting". Deadline title: "CASA Committee — request submission deadline".

## Changes

### 1. Database migration
- Drop and re-add `calendar_entries_entry_type_check` to include `casa_deadline`.
- Update the RLS SELECT policy `calendar entries readable by staff` so both `casa_committee` AND `casa_deadline` are gated behind `is_board_member(auth.uid())`.
- Insert the 18 rows above (9 meetings + 9 deadlines), `created_by = NULL`, `author_name = 'System'`, `author_role = NULL`.

### 2. Edge function
- `supabase/functions/admin-calendar/index.ts`: add `'casa_deadline'` to the Zod `entry_type` enum.

### 3. Frontend
- `src/lib/calendar-api.ts`: extend `CalendarEntryType` and `CALENDAR_ENTRY_LABELS` with `casa_deadline: 'CASA Committee — Request Deadline'`.
- `src/components/admin/WorkspaceCalendar.tsx`:
  - Add `casa_deadline` to the type Select in the add/edit dialog.
  - Add a distinct color (e.g. `bg-fuchsia-100 text-fuchsia-800`) for `casa_deadline` chips and a matching legend entry "CASA request deadline (board only)".
  - Keep the board-only info note visible for both CASA types in the dialog.

Nothing else in the calendar pipeline changes — RLS + edge function enum are the only visibility surfaces.
