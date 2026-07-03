## Changes to `src/components/shared/TeamSwarm.tsx`

Refine the "Our Team" swarm on the homepage. No other files touched.

### 1. Fix stretched photos
Currently images are drawn `r*2 × r*2` regardless of source aspect ratio. Compute a cover-fit crop from the loaded image's `naturalWidth/Height` and draw the largest centered square from the source into the circular clip so proportions are preserved (no stretch).

### 2. Remove the president as a fixed centrepiece
- Drop tier 0 entirely. Treat the President as just another board member (same size ~30px, same ring, same styling — no thick accent ring).
- The centre of the swarm becomes empty (no solid bubble).
- Board members (including President) are placed on the inner ring; analysts/others on the outer rings.

### 3. More random positioning
- Board members: base angle evenly spaced, then jitter each angle by ±(π / boardCount) × 0.55 and jitter ring radius by ±15%.
- Outer members: same idea with larger angular jitter and radius jitter across two rings.
- Jitter values are seeded per page load (fresh on reload) so the layout is stable during the session but different next visit.

### 4. More cross-connections
Add extra edges beyond board→outer-nearest:
- Each board node connects to its 2 nearest board neighbours (inner mesh).
- Each outer node connects to its nearest board node AND its nearest outer neighbour (analyst↔analyst, senior↔analyst links).
- Keep line opacity low (~0.10–0.18) so the mesh stays subtle.

### 5. No live rotation of members
Remove the 5-second swap loop and the fade-in/out target-opacity easing tied to swaps. Members shown are chosen once at mount:
- Shuffle `board` and `others` arrays with `Math.random()` on mount, then pick the first N for each tier.
- Reloading the page re-shuffles (user's desired behaviour). During a session the same faces stay put.
- Keep the slow global drift/rotation animation for visual life — only the identity swaps are removed.

### Technical notes
- Keep the canvas, ResizeObserver, reduced-motion handling, and visibility pause.
- Drop `pool`, `lastSwap`, `targetOpacity` swap logic, and the tier-0 branch.
- Keep `opacity` as a static 1 (or remove entirely) since no fades remain.
- Image draw helper: `const ar = img.naturalWidth / img.naturalHeight; let sw, sh; if (ar > 1) { sh = img.naturalHeight; sw = sh; } else { sw = img.naturalWidth; sh = sw; }` then `drawImage(img, (img.naturalWidth-sw)/2, (img.naturalHeight-sh)/2, sw, sh, n.x-r, n.y-r, r*2, r*2)`.

No data/API/backend changes.