# Make the written-answer formatting rules impossible to skip

## Goal
Turn the current plain paragraph of PDF/page rules on `/join` into a clearly visible "Important" callout so candidates notice the constraints before they write.

## What will change
- Replace the single lead paragraph in `src/components/join/WrittenQuestions.tsx` with a bordered callout box.
- Keep the text source in `src/lib/join-content.ts`, but split it into a short lead sentence plus a list of constraints.
- Fix the apparent typo `fontx` → `font` while the sentence is being edited.

## Proposed design
- A bordered panel (`border border-separator bg-muted`) with a left accent rule (`border-l-4 border-accent`) to match the existing division question panels.
- An uppercase/small-caps "Important" label using the existing serif/tracking style.
- A small info icon (`lucide-react`) next to the label.
- The constraints rendered as a short bulleted list, with the numeric limits in stronger weight (`text-foreground`).
- No animations, no new colors, no hover effects — consistent with the B&W minimal + deep-purple accent aesthetic.

## Files to edit
1. `src/lib/join-content.ts` — update `JOIN_WRITTEN.lead` and add a `constraints` array.
2. `src/components/join/WrittenQuestions.tsx` — render the new callout using the updated content.

## Out of scope
- No changes to division questions, the application form, or PDF upload logic.
- No backend or email changes.
