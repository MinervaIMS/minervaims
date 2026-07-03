## Refinements to `src/components/shared/TeamSwarm.tsx`

### 1. Bigger circles (esp. desktop)
Make node sizes responsive to canvas width:
- Board: 30 → ~42 on desktop (>=768px), ~34 on mobile.
- Others: 22 → ~32 on desktop, ~26 on mobile.
Recomputed on each `resize()` so it updates with viewport.

### 2. No overlap, with breathing room
Add a post-position pass every frame: after computing target `x,y` for all nodes, run a simple relaxation step (1–2 iterations) that pushes any two nodes apart when `distance < n1.size + n2.size + PADDING` (PADDING ≈ 8px). Each overlapping pair is displaced along their axis by half the deficit. Guarantees visible white space between any two photos even when drift brings them close.

### 3. Use the centre — no fixed centrepiece
Shrink the inner ring so board members naturally pass through/near the middle:
- Board `ringR` base 0.30 → 0.14, with ±40% radial jitter (some near centre, some further).
- Give board nodes larger drift amplitude (12px instead of 6px) and slightly varied `dir` (mix of +1 / -1) so paths cross the middle over time.
- No dedicated centre node — the movement fills the space.

### 4. Many more connections
Denser mesh to convey "all connected":
- Board↔board: connect each board node to its 3 nearest (was 2), plus a few random long-range links (each board node picks 1 random non-neighbour with 40% chance per frame-independent seed set at mount).
- Outer↔board: each outer connects to its 2 nearest board nodes (was 1).
- Outer↔outer: each outer connects to its 2 nearest outer nodes (was 1).
- Keep line opacities subtle (0.10–0.18) so the mesh stays elegant rather than noisy.
Random long-range picks are seeded once at mount so they don't flicker.

### Technical notes
- Collision loop: O(n²) with n≈28 is fine.
- Clamp positions inside the ellipse `rx,ry` after relaxation so nodes don't drift off canvas.
- Everything else (shuffle-once roster, cover-fit photo crop, reduced-motion, visibility pause) stays as-is.

No other files touched.