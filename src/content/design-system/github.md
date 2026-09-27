repo: MinervaIMS/minervaims
branch: main
path: src

## Last sync
date: 2026-07-30T19:10:00Z
### Updated in this project
- Audited the live implementation for undocumented visual patterns and formalised them as components.
- Added the background systems (Beams, DotField, static patterns) and the full motion contract.
- Promoted the application-step circle and the workspace help button into one documented circle language.
- Added chart, cover, social and slide systems plus deck, report and social templates.

## Screen map
| Design-system artefact | Built from |
|---|---|
| `components/backgrounds/BeamsBackground.jsx` | `src/components/shared/Beams.tsx`, `Beams.css`, `AuthLayout.tsx` |
| `components/backgrounds/DotFieldBackground.jsx` | `src/components/shared/DotField.tsx`, `ApplyBackground.tsx` |
| `components/backgrounds/PatternField.jsx`, `SectionSurface.jsx` | `src/index.css` (surface + overlay rules) |
| `components/indicators/StepIndicator.jsx`, `ProcessJourney.jsx` | `src/components/shared/ApplicationJourney.tsx`, `src/index.css` `.journey/.jdot/.jline` |
| `components/indicators/HelpIndicator.jsx` | `src/components/admin/help/HelpSystem.tsx`, `src/index.css` `.ws-help-fab`, `help-dot-ignite` |
| `components/indicators/CircleButton.jsx` | `src/index.css` `.rplus`, `.rarrow`, `.v3-cta-circle` |
| `components/surfaces/Tile.jsx`, `Callout.jsx` | `src/index.css` `.div-tile`, `.v3-card`, help-panel sections |
| `components/data/Chart.jsx` | `src/components/shared/FundPerformanceChart.tsx` |
| `components/media/ReportCover.jsx` | `src/index.css` `.rcover` / `.rc-*` |
| `components/media/SocialPost.jsx`, `SlideFrame.jsx` | Brand grammar extrapolated from the site's section layouts |
| `colors_and_type.css`, `surfaces.css`, `motion.css` | `src/index.css` `:root`, `tailwind.config.ts`, component CSS |
| `README.md` §14 (workspace) | `src/index.css` `.ws-flat` / `html.ws-active` rules, `HelpSystem.tsx` |
