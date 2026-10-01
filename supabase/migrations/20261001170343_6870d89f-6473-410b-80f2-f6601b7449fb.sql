CREATE TABLE IF NOT EXISTS public.internal_forms (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL CHECK (char_length(title) BETWEEN 1 AND 200),
  description text,
  fields jsonb NOT NULL DEFAULT '[]'::jsonb,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'open', 'closed')),
  closes_at timestamptz,
  allow_edits boolean NOT NULL DEFAULT true,
  track_payments boolean NOT NULL DEFAULT false,
  payment_amount numeric(10, 2),
  payment_instructions text,
  confirmation_message text,
  created_by uuid,
  created_by_name text,
  updated_by_name text,
  published_at timestamptz,
  closed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.internal_form_responses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  form_id uuid NOT NULL REFERENCES public.internal_forms(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  member_name text,
  member_email text,
  member_role text,
  member_division text,
  answers jsonb NOT NULL DEFAULT '{}'::jsonb,
  submitted_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  edit_count integer NOT NULL DEFAULT 0,
  paid boolean NOT NULL DEFAULT false,
  paid_at timestamptz,
  paid_by_name text,
  staff_note text,
  UNIQUE (form_id, user_id)
);

CREATE INDEX IF NOT EXISTS internal_form_responses_form_idx ON public.internal_form_responses (form_id);
CREATE INDEX IF NOT EXISTS internal_form_responses_user_idx ON public.internal_form_responses (user_id);
CREATE INDEX IF NOT EXISTS internal_forms_status_idx ON public.internal_forms (status, closes_at);

ALTER TABLE public.internal_forms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.internal_form_responses ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.internal_forms FROM anon, authenticated;
REVOKE ALL ON public.internal_form_responses FROM anon, authenticated;
GRANT ALL ON public.internal_forms TO service_role;
GRANT ALL ON public.internal_form_responses TO service_role;
