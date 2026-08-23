# Increase /join hero height and keep figures centered

## Goal
Make the dark first section on `/join` noticeably taller while keeping the three key figures vertically centered in the space between the subtitle and the white section below.

## Current state
- `src/components/join/JoinHeroStage.tsx` already uses a flex column layout and a `flex-1` figures wrapper with `items-center justify-center`.
- Bottom padding is currently `pb-28 md:pb-44`.
- `src/components/join/JoinFigures.tsx` renders the three figures as a centered grid.

## Changes
1. Increase the hero container's bottom padding further so the dark band extends deeper.
2. Keep the existing `flex-1` centering wrapper so the figures stay vertically centered between the subtitle and the bottom edge of the dark section.
3. Run TypeScript typecheck to confirm no regressions.

## Files
- `src/components/join/JoinHeroStage.tsx`

## Verification
- `bunx tsc --noEmit -p tsconfig.app.json` passes.
- Visual check in preview: hero is taller and figures sit centered in the dark band.