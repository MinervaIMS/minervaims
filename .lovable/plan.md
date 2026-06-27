## Problem
The division tab navigation on `/people/members` becomes horizontally scrollable on narrower screens as intended, but the nav container also allows vertical scrolling, which is unwanted.

## Root Cause
The `<nav>` element at `src/components/shared/MembersDirectory.tsx:122` has `overflow-x-auto` but no `overflow-y` constraint. On mobile browsers, this can allow slight vertical scrolling within the tab bar container.

## Fix
Add `overflow-y-hidden` to the `<nav>` className on line 122, alongside the existing `overflow-x-auto`.

### File changed
- `src/components/shared/MembersDirectory.tsx` — one className edit on the `<nav>` element.