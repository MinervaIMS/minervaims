-- =====================================================================
-- STEP 66: four independent additions, none of which changes a rule that
-- already runs.
--
--   1. Screening marks: "To reject" and "Maybe", the reviewers' own
--      shorthand, kept APART from the candidate status.
--   2. A count of how many times a candidate has booked an interview,
--      so a slot can be changed once and not endlessly.
--   3. A kind on notes, so the workspace can write its own without them
--      reading as somebody's opinion.
--   4. Invitations, so an advisor or an alumnus without a university
--      address can be given an account.
--
-- Nothing is dropped, nothing is rewritten, and every column added has a
-- default that makes every existing row correct without touching it.
-- =====================================================================

-- ─────────────────────────────────────────────────────────────────────
-- 1. SCREENING MARKS, AND WHY THEY ARE NOT STATUSES.
-- ---------------------------------------------------------------------
-- These were asked for as two more candidate statuses. They cannot be,
-- and the reason is the rule that already governs the status column: a
-- candidacy only ever moves FORWARD. Both the client (`STATUS_FLOW`) and
-- the screening function (`STATUSES`) enforce that by comparing positions
-- in an ordered list, and the server refuses anything that does not move
-- later in it.
--
-- Put "Maybe" in that list and the mark becomes a trap. "Maybe" means
-- exactly "we may yet interview this person if we are short" - so a
-- candidate marked Maybe must still be invitable afterwards. As a status
-- it would sit at some fixed position and forbid every stage before it,
-- and the one thing the mark exists to allow would be the one thing it
-- prevented. "To reject" has the same problem in reverse: it is a note to
-- self before the decision is taken, not the decision.
--
-- So they are a SEPARATE FIELD, set and cleared freely in any order, at
-- any stage, with no bearing on where the candidacy has got to. That is
-- what replaces the spreadsheet: a column that can be set, changed and
-- unset while the real process carries on underneath it.
--
-- NO EMAIL AND NO ACTION IS ATTACHED, which was the explicit request.
-- Setting a mark writes one row and nothing else happens.
-- ─────────────────────────────────────────────────────────────────────
ALTER TABLE public.applications
  ADD COLUMN IF NOT EXISTS screening_mark text NOT NULL DEFAULT 'none';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
     WHERE conname = 'applications_screening_mark_check'
       AND conrelid = 'public.applications'::regclass
  ) THEN
    ALTER TABLE public.applications
      ADD CONSTRAINT applications_screening_mark_check
      CHECK (screening_mark IN ('none', 'to_reject', 'maybe'));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS applications_screening_mark_idx
  ON public.applications (screening_mark)
  WHERE screening_mark <> 'none';

-- ─────────────────────────────────────────────────────────────────────
-- 2. HOW MANY TIMES A CANDIDATE HAS TAKEN A SLOT.
-- ---------------------------------------------------------------------
-- Counted on the APPLICATION and not on the booking, because cancelling
-- deletes the booking row: a count kept there would be reset by the very
-- act it exists to measure. It only ever increases, and the only thing
-- that puts it back to zero is a transfer to another division, where the
-- candidate genuinely starts again with new examiners.
-- ─────────────────────────────────────────────────────────────────────
ALTER TABLE public.applications
  ADD COLUMN IF NOT EXISTS interview_bookings_made integer NOT NULL DEFAULT 0;

-- Rows that predate the counter: anybody holding a booking has made at
-- least one. Counted once, from the bookings that exist right now, so an
-- existing candidate is not handed a free extra change.
UPDATE public.applications a
   SET interview_bookings_made = 1
 WHERE a.interview_bookings_made = 0
   AND EXISTS (SELECT 1 FROM public.interview_bookings b WHERE b.application_id = a.id);

-- ─────────────────────────────────────────────────────────────────────
-- 3. WHO WROTE A NOTE.
-- ---------------------------------------------------------------------
-- The workspace now records an interview booking, and a change of
-- booking, in the candidate's own notes, which is where a reviewer
-- already looks for the history of a candidacy. A line the system wrote
-- must be distinguishable from a line a person wrote: the notes are
-- explicitly "shared with reviewers" and carry opinions, and a fact
-- printed in the same style as an opinion is read as one.
--
-- DEFAULT 'human', so every note already stored stays exactly what it was.
-- ─────────────────────────────────────────────────────────────────────
ALTER TABLE public.application_notes
  ADD COLUMN IF NOT EXISTS kind text NOT NULL DEFAULT 'human';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
     WHERE conname = 'application_notes_kind_check'
       AND conrelid = 'public.application_notes'::regclass
  ) THEN
    ALTER TABLE public.application_notes
      ADD CONSTRAINT application_notes_kind_check
      CHECK (kind IN ('human', 'system'));
  END IF;
END $$;

-- ─────────────────────────────────────────────────────────────────────
-- 4. INVITATIONS.
-- ---------------------------------------------------------------------
-- Step 66 restricted new accounts to the university's three domains,
-- which is right for students and wrong for the two groups the
-- association also needs: advisors and alumni, who have left Bocconi and
-- whose address is now their own.
--
-- THE INVITE DOES NOT BYPASS THE DOMAIN RULE, IT AVOIDS IT. Nobody signs
-- up: a role that may manage this page creates the account server-side
-- with the service key, and the auth server sends its `invite` email,
-- which the hook has always allowed through because an invitation is
-- issued BY the association rather than requested of it. There is no
-- token in the browser, no flag on the sign-up form and no path by which
-- an uninvited person reaches the exemption.
--
-- THE ROW IS THE RECORD, not the mechanism. The account exists from the
-- moment the invitation is sent; this table says who invited whom, when,
-- as what, and whether it has been taken up, so the register can be read
-- and an unanswered invitation can be chased or revoked.
-- ─────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.account_invites (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email        text NOT NULL,
  full_name    text NOT NULL,
  -- Only the two groups this exists for. A staff role is never handed out
  -- by invitation: those are granted in Settings, to an account that
  -- already exists and has been seen.
  role         text NOT NULL CHECK (role IN ('advisor', 'alumni')),
  division     public.org_division,
  note         text,
  user_id      uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  invited_by   uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  invited_name text,
  created_at   timestamptz NOT NULL DEFAULT now(),
  last_sent_at timestamptz NOT NULL DEFAULT now(),
  send_count   integer NOT NULL DEFAULT 1,
  accepted_at  timestamptz,
  revoked_at   timestamptz
);

CREATE UNIQUE INDEX IF NOT EXISTS account_invites_email_uidx
  ON public.account_invites (lower(email));
CREATE INDEX IF NOT EXISTS account_invites_created_idx
  ON public.account_invites (created_at DESC);

ALTER TABLE public.account_invites ENABLE ROW LEVEL SECURITY;

-- Readable by staff, written only by the edge function under the service
-- key. No write policy exists, which is deliberate: an invitation is
-- never created from the browser.
DROP POLICY IF EXISTS "account invites readable by staff" ON public.account_invites;
CREATE POLICY "account invites readable by staff"
  ON public.account_invites FOR SELECT TO authenticated
  USING (public.is_staff(auth.uid()));

GRANT SELECT ON public.account_invites TO authenticated;
GRANT ALL ON public.account_invites TO service_role;
REVOKE ALL ON public.account_invites FROM anon;
