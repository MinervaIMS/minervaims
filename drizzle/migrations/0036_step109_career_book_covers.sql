-- =====================================================================
-- STEP 109: THE COVER OF EACH CAREER BOOK, MADE ONCE.
-- ---------------------------------------------------------------------
-- Career > Brainteasers (the greenbook) and Career > IB Questions (the
-- RedBook and Banker Blueprint) now show each book beside the page's
-- title, with its cover and its download button, always in view.
--
-- The cover is the first page of the PDF, drawn ONCE, small (a WebP or
-- JPEG of about 20 kB), and stored here: when the President or the admin
-- account uploads a book, and once for a book already uploaded, the first
-- time either opens the page. From then on every reader sees the stored
-- picture, with the page's data, without the PDF being opened again.
--
-- A table of its own rather than a column of career_files: a cover is not
-- a change to the book, so the book's "updated" date (career_files has an
-- updated_at trigger) never moves because its cover was drawn. A book that
-- is replaced or removed takes its cover with it (ON DELETE CASCADE).
--
-- Only the career functions read and write it, with the service role:
-- row level security is on and no policy is given to anybody else.
-- Adds a table; changes and deletes nothing. Safe to run twice.
-- =====================================================================

CREATE TABLE IF NOT EXISTS public.career_book_covers (
  file_id uuid PRIMARY KEY REFERENCES public.career_files(id) ON DELETE CASCADE,
  cover text NOT NULL,
  made_by uuid,
  made_at timestamptz NOT NULL DEFAULT now()
);

DO $c$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'career_book_covers_cover_format') THEN
    ALTER TABLE public.career_book_covers ADD CONSTRAINT career_book_covers_cover_format
      CHECK (cover ~ '^data:image/(webp|jpeg);base64,[A-Za-z0-9+/]+={0,2}$' AND length(cover) <= 120000);
  END IF;
END $c$;

ALTER TABLE public.career_book_covers ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.career_book_covers FROM anon, authenticated;
GRANT ALL ON public.career_book_covers TO service_role;

COMMENT ON TABLE public.career_book_covers IS
  'Step 109: the first page of each Career book (career_files), drawn once as a small picture; read and written only by the career functions.';
