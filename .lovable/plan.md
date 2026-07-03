Plan to fix the homepage “Our Team” swarm once and for all:

1. **Make every visible member equal size**
   - Remove board-vs-analyst size differences.
   - Use one radius for all nodes on desktop.
   - Use one slightly smaller radius for all nodes on mobile/tablet.

2. **Reduce visible member count on mobile**
   - Desktop: keep a richer group, sized to fit safely in the available section.
   - Mobile: cap the displayed people around 15–20, prioritizing no overlap and readable spacing.
   - If the canvas is too narrow, automatically lower the count rather than forcing crowded circles.

3. **Replace the current orbit/collision behavior with a stable layout**
   - Stop pushing circles around every frame, which is causing the glitchy movement.
   - Compute a non-overlapping layout once on load/resize using fixed target positions.
   - Add only very slow, subtle movement around those safe positions.
   - Keep a hard minimum gap between every pair of image circles.

4. **Use the centre without creating a fixed hierarchy**
   - Place some members near the middle, but not as a special larger or central figure.
   - Distribute everyone as equal peers across centre, middle, and outer areas.

5. **Add more connections**
   - Draw a denser mesh: each member connects to several nearby members.
   - Add a small number of stable longer-range links so the group feels connected.
   - Keep the lines subtle and academic, aligned with the existing minimal site tone.

6. **Preserve existing good behavior**
   - Keep proportional photo cropping so faces are not stretched.
   - Keep roster randomization only on page reload, not during viewing.
   - Respect reduced-motion preferences.

Technical approach:
- Update only `src/components/shared/TeamSwarm.tsx`.
- Replace frame-by-frame collision relaxation with a deterministic packed layout generated at mount/resize.
- Use a minimum distance formula: `radius * 2 + gap`, where `gap` is always positive.
- Validate visually on desktop and mobile after implementation.