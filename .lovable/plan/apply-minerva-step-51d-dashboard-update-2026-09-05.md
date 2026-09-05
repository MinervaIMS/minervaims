# Apply Minerva Step 51d Dashboard Update

## Scope

Replace these two existing files exactly with the versions supplied in `minerva-step-51d.zip`:

- `src/components/admin/WorkspaceDashboard.tsx`
- `src/components/admin/dashboard/ReportsMixBlock.tsx`

Nothing else will be added, changed, deleted, migrated, or redeployed. In particular, Association on Display and the existing dashboard exemption in the read-only handling will remain untouched.

## Changes Included

- Let the KPI row reduce from 156px to 116px on short desktop windows so the chart area retains more room.
- Add minimum heights to both chart rows so charts cannot collapse into unreadable strips.
- Give the reports-by-division chart 30% of the lower row and stack the three lower charts below the extra-large breakpoint.
- Increase only the percentage text inside the reports-by-division chart from 9 to 10 view-box units; preserve the existing ring geometry and division-name sizing.

## Verification

- Confirm the archive files replaced the intended project files byte for byte.
- Check the current preview build result after replacement.
- Run the relevant project tests or checks available for these files.
- Verify the dashboard at representative desktop and short-window sizes, checking chart readability, scrolling behaviour, and that no dashboard controls are faded.
- Confirm Association on Display remains unchanged.

## Implementation Report

Report the two replaced files, verification results, and any limitation encountered. No unrelated work will be included.
