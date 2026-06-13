## Issues to fix in `src/pages/Join.tsx`

### 1. Application Journey animation — match the reference spine behavior

Reference (`template.html`, `.jline` + IntersectionObserver):
- Single vertical separator line per step rendered with `position:absolute; left:29px; top:60px; bottom:0` so the rail is **continuous** through the step's `padding-bottom: 2.5rem`.
- The fill `<div>` animates `height` from `0` → `calc(100% + 2.5rem)` (overshooting into the next step's padding) with `transition: height 1.2s ease`. This makes the navy line visibly flow into the next dot rather than fill segment-by-segment with a gap.
- Sequential lighting: `setTimeout(..., 250 + i * 400)` per step — already matches current `useEffect` timing.

Current code (lines 483–501) puts the line inside a flex column with `my-2` margin and animates from `0%` → `100%` within its own bounded segment, leaving a visible gap between the fill and the next dot and making each segment feel disconnected — what the user describes as "off".

**Fix:**
- Replace the per-step flex column line with an absolutely-positioned rail anchored to the dot column: `absolute left-[19px] sm:left-[23px] top-12 sm:top-14 bottom-0 w-px bg-separator overflow-hidden` on the outer row (which becomes `relative`).
- Inside that rail render a fill `<div className="absolute inset-x-0 top-0 bg-accent transition-[height] duration-[1200ms] ease-out" style={{ height: lit ? 'calc(100% + 2.5rem)' : '0%' }} />`.
- Hide the rail on the last step.
- Bump dot transition to `duration-[600ms]` to match the reference's softer fade, and keep the box-shadow ring as-is.

### 2. FAQs — match the reference 7-item list and copy

Reference order (`template.html` lines 1184–1192) and current `FAQS` array (lines 122–158) differ in the **last item only**:

- Current #7: *"Are referrals a thing?"* — long answer permitting 2 referrals per member.
- Reference #7: **"Are referrals available?"** — *"No. We no longer accept referrals. In our experience they did not add value for candidates or for the Society. Our selection process is designed so that strong candidates can prove their value on the merits of their application, so we encourage everyone to apply directly. You are still welcome to connect with members on LinkedIn."*

All other 6 questions and answers already match.

**Fix:** replace FAQ #7 question + answer with the reference copy. No other FAQ changes.

> Note: the existing `mem://pages/join/ui-elements-spec-v7` records the old "2 referrals" policy. Per the user's explicit instruction to match the reference HTML, the new "No referrals" copy supersedes it; I will update that memory after the edit lands.

### Files touched
- `src/pages/Join.tsx` — FAQ array entry #7; journey row markup (lines ~480–501) restructured to a continuous absolute rail. No copy, color, typography, or layout changes elsewhere.

### Verification
- Scroll to "The Application Journey": dots light sequentially every 400ms; each fill flows continuously into the next dot with no visible gap; the line under the last step is hidden.
- Open FAQs: 7 items, last reads "Are referrals available?" with the "No" answer.
