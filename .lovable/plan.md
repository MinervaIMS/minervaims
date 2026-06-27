## Goal
Polish the Minerva Workspace shell + shared page header for better hierarchy, readability and visual restraint.

---

## 1. Page header layout (`WorkspacePageHeader.tsx`)
Restructure so **actions sit below the description**, full-width row, and **remove the bottom border**.

New structure:
```
Title
Description
─ (no rule)
Actions row (right-aligned, under description)
[ content ]
```

- Drop `border-b border-separator pb-4`.
- Keep title on its own row (no actions next to it).
- Render `actions` in a separate row beneath the description, right-aligned, with top margin (`mt-6`).
- Keep spacing below the header block (`mb-8`).

Applies automatically to every page already using this component (Alumni, Team, Users, Activity, Newsletter, Readings, Files, Pages visibility, Application settings, Events, etc.) — no per-page edits needed.

---

## 2. Nav rail typography (left sidebar in `MinervaWorkspace.tsx`)
Increase size of the section labels for better readability and hierarchy:

- Section buttons (line 783): `text-small` → `text-base` (≈16px), keep Times New Roman.
- Section button row height: `h-11` → `h-12` for breathing room.
- Submenu heading (line 842): keep `text-lg`.
- Submenu items (line 858): `text-body` stays, row height `h-10` → `h-11`.
- Collapse label (line 798): keep `text-sm`.

(Points 2 and 3 of the request are the same instruction — applied once.)

---

## 3. Auto-collapse main nav when a submenu opens
In `MinervaWorkspace.tsx`, add an effect:

```ts
useEffect(() => {
  if (submenuOpen && activeSection && activeSection.subItems.length > 0) {
    setNavExpanded(false);
  }
}, [submenuOpen, activeSectionKey]);
```

Behaviour:
- Clicking a section that has sub-items → submenu panel opens → main rail collapses to 72px automatically.
- Clicking a section with no sub-items → submenu stays closed → main rail keeps current state.
- User can still manually re-expand the main rail via the collapse toggle; reopening another submenu will collapse it again.

---

## 4. Remove "useless corners" (decorative card chrome)
Audit pass across workspace pages to strip purely decorative `Card`/`CardHeader`/`CardContent` wrappers that only add a border + rounded corners around a single block of form fields.

Concrete first target (called out in the request):
- **`ApplicationSettings.tsx`** — remove the outer `<Card>` around "Recruitment Status". Render `CardTitle`/`CardDescription` as a plain serif sub-heading + muted paragraph, keep the inner form fields and Save button as-is, no border wrapper.

Same treatment applied where the pattern recurs (single-card pages with no real grouping value). Pages with multiple cards used as genuine grouping (e.g. permission matrices, lists) keep their cards.

---

## 5. Typography consistency pass (workspace only)
Standardise the scale used inside the content slot so hierarchy reads cleanly:

| Level | Token | Font |
|---|---|---|
| Page title (h1) | `text-heading` | serif, accent |
| Section sub-heading inside a page | `text-xl` | serif, accent |
| Description / helper text | `text-body` | body, muted-foreground |
| Form labels | `text-sm` | body |
| Table / list rows | `text-sm` | body |
| Meta (timestamps, counts) | `text-xs` | body, muted-foreground |

Where existing pages drift (e.g. `CardTitle` defaults, ad-hoc `text-lg`/`text-base` mixes), align to the table above. Limited to the workspace pages — public site untouched.

---

## Files touched
- `src/components/admin/WorkspacePageHeader.tsx` — layout rework (point 1).
- `src/pages/MinervaWorkspace.tsx` — nav typography + auto-collapse effect (points 2, 3).
- `src/components/admin/ApplicationSettings.tsx` — strip outer card (point 4 example).
- Other admin components only where a clear "useless card" or typography drift is found during the pass (point 4 + 5). No behavioural/logic changes — visual only.

## Out of scope
- No changes to permissions, data, edge functions, routing, or public website.
- No new dependencies.
