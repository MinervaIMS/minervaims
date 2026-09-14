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

ALTER TABLE public.applications
  ADD COLUMN IF NOT EXISTS interview_bookings_made integer NOT NULL DEFAULT 0;

UPDATE public.applications a
   SET interview_bookings_made = 1
 WHERE a.interview_bookings_made = 0
   AND EXISTS (SELECT 1 FROM public.interview_bookings b WHERE b.application_id = a.id);

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

CREATE TABLE IF NOT EXISTS public.account_invites (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email        text NOT NULL,
  full_name    text NOT NULL,
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

DROP POLICY IF EXISTS "account invites readable by staff" ON public.account_invites;
CREATE POLICY "account invites readable by staff"
  ON public.account_invites FOR SELECT TO authenticated
  USING (public.is_staff(auth.uid()));

GRANT SELECT ON public.account_invites TO authenticated;
GRANT ALL ON public.account_invites TO service_role;
REVOKE ALL ON public.account_invites FROM anon;