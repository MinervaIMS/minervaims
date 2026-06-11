Modify the preloader animation so the deep-navy panel starts fully visible rather than expanding from a narrow strip.

Current sequence:
1. Overlay scales from 0 to full width (vertical wipe in)
2. Logo fades in
3. Hold
4. Logo fades out
5. Overlay scales back to 0 (vertical wipe out)

Proposed sequence:
1. Overlay is already at full width from the first frame
2. Logo fades in
3. Hold
4. Logo fades out
5. Overlay scales back to 0 (vertical wipe out)

Technical change: In `src/components/shared/Preloader.tsx`, remove the initial `.to(overlay, { scaleX: 1, ... })` tween from the GSAP timeline and set `gsap.set(overlay, { scaleX: 1 })` instead. The rest of the timeline (logo fade-in, hold, logo fade-out, overlay contraction) remains unchanged.

No new dependencies needed.