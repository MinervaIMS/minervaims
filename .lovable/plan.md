Implement a targeted rewrite of the Application Journey timeline in `src/pages/Join.tsx` so it follows the reference HTML structure and animation behavior exactly.

**Plan**

1. **Replace the current custom flex timeline with the reference structure**
   - Use a two-column step layout equivalent to the HTML reference:
     ```text
     60px rail column | content column
     ```
   - Render each step as a `relative grid grid-cols-[60px_1fr] gap-[1.4rem] pb-10` row.
   - Keep the final step without bottom padding.

2. **Restore the reference rail/dot proportions**
   - Dot: fixed `60px × 60px`, circular, serif number, white background, accent border.
   - Rail: positioned inside the rail column, centered under the dot.
   - Line: `top: 60px`, `bottom: -2.5rem`, `left: 50%`, `width: 2px`, clipped with `overflow-hidden`.
   - Hide the line only on the last step.

3. **Restore the exact fill animation behavior**
   - Fill starts at `height: 0`.
   - When each step is lit, fill becomes `height: calc(100% + 2.5rem)`.
   - Use `transition: height 1s ease`, matching the reference.
   - Use the same sequential timing already in place: `250 + index * 400`.

4. **Match the reference active state**
   - When lit, dot background becomes accent, number turns background/white, and shadow matches the uploaded HTML.
   - Use a vertical gradient fill from accent to light purple token if available; otherwise use the existing accent tone while preserving the same timing and geometry.

5. **Keep content and FAQs unchanged**
   - No copy changes.
   - No layout changes outside the Application Journey section.

6. **Verify visually**
   - Check `/join` after implementation and confirm the line starts beneath each dot, connects into the next step without gaps, and lights sequentially like the reference HTML.