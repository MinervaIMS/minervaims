# Make dashboard greetings rotate correctly

## Confirmed diagnosis

The displayed sentence is not role-based. The greeting function receives only the user ID, current date, and live dashboard figures; no role is passed into it.

The repetition is caused by the current selection rule: it hashes `user ID + date block`, deliberately assigning one fixed sentence to each person for an entire special period or half-month. Therefore, during Welcome Week the same person can repeatedly receive “Nothing due, everyone back. Best week of the year.” on every visit.

There is a second fault: the component captures the date inside a memo that only updates when user/data values change. If the dashboard remains open, a sentence from an expired date block can remain visible because the passage of time itself does not trigger a refresh.

## Change

1. Replace the fixed user-and-fortnight selection with a per-dashboard-visit selection.
   - Choose from the currently eligible special-date or monthly pool whenever the dashboard is entered.
   - Keep the selected sentence stable while that dashboard visit remains open, including while unrelated dashboard data rerenders.
   - Remember the immediately previous sentence for that user and date pool in the browser, and exclude it when at least two eligible sentences exist. This guarantees visible rotation between consecutive visits rather than leaving repetition to chance.
   - If a pool contains only one eligible sentence, keep that sentence; no new editorial copy will be invented.

2. Make date handling explicit and reliable.
   - Resolve greeting dates in the Europe/Rome calendar, matching Minerva’s Milan context rather than each device’s timezone.
   - Refresh the selection when a continuously open dashboard crosses a Rome date/pool boundary, so an expired Welcome Week or other special sentence cannot remain stuck.
   - Preserve the existing priority order: special date ranges first, then the relevant half-month pool.

3. Preserve role independence and existing content.
   - Keep one shared sentence system for candidates, analysts, division heads, board members, and the President.
   - Do not add role checks, role-specific pools, or role-based wording.
   - Keep all existing sentence text, variable substitution, special-date ranges, and fallback behaviour unchanged.

## Verification

- Exercise repeated dashboard entries for the same user and confirm consecutive visits rotate without changing during a single visit.
- Check dates around 10/11 September and 15/16 September in Rome time to confirm the correct pool changes.
- Check a long-open dashboard crossing a date boundary refreshes automatically.
- Confirm identical inputs produce the same eligible pool regardless of role and that unresolved variables never appear.
- Run the project build and inspect the current diagnostics before reporting completion.
