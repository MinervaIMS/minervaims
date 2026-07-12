Change the role-permissions table header so role names read horizontally instead of vertically rotated.

### What will change
- In `src/components/admin/RolePermissionsTable.tsx`, the role-name header cells currently use `writing-mode:vertical-rl rotate-180` and a fixed `h-28`.
- Remove the vertical rotation and let text flow horizontally.
- Adjust header cell sizing and alignment so the horizontal labels fit cleanly above the permission grid.

### Implementation details
- Replace the rotated `<div>` in each role header with a horizontally rendered label.
- Allow text wrapping or controlled truncation as needed, and reduce the header row height since vertical space is no longer required.
- Keep the sticky first column (`Subsection`) and the existing table/section styling intact.
- Preserve the legend and special-rules section below the table.

### Verification
- Build the project to ensure no TypeScript/Tailwind errors.
- Visually confirm in the preview that role names are horizontal and readable.