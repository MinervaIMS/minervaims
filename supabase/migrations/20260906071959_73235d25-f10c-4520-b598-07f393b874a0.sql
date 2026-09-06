-- =====================================================================
-- Editorial calendar: an item can go to more than one place.
-- ---------------------------------------------------------------------
-- "Where it goes" was one value, so a post that goes out on LinkedIn AND
-- Instagram - which is most of them - had to be entered twice, as two
-- rows with the same title and the same date, and then kept in step by
-- hand. Two rows for one piece of work is not a plan, it is a chore.
--
-- WHY THE OLD COLUMNS STAY. `platform` and `format` are not dropped and
-- not renamed. They keep the FIRST entry of the new arrays, maintained by
-- the trigger below, so:
--
--   * every existing row is already correct on the day this runs;
--   * the day chip, which is coloured by platform, keeps working
--     unchanged, as does anything else that reads a single value;
--   * a client that has not been updated yet reads a sensible answer
--     rather than a null - which matters because the workspace deploys
--     as one bundle and the database migrates ahead of it.
--
-- The arrays are the truth; the scalars are a maintained view of their
-- first element. The trigger is what stops those two ever disagreeing,
-- including for a write that does not go through the edge function.
--
-- FORMAT IS PER PLATFORM, and that is why `formats` is an array in step
-- with `platforms` rather than a single value. A piece that runs as a
-- reel on Instagram runs as a post on LinkedIn; storing one format for
-- both would mean recording something that is not true of either.
-- =====================================================================

ALTER TABLE public.editorial_items
  ADD COLUMN IF NOT EXISTS platforms text[],
  ADD COLUMN IF NOT EXISTS formats   text[];

-- Existing rows: one platform, one format, exactly as they read today.
UPDATE public.editorial_items
   SET platforms = ARRAY[platform],
       formats   = ARRAY[format]
 WHERE platforms IS NULL OR formats IS NULL;

ALTER TABLE public.editorial_items
  ALTER COLUMN platforms SET DEFAULT ARRAY['instagram']::text[],
  ALTER COLUMN formats   SET DEFAULT ARRAY['ig_post']::text[];

ALTER TABLE public.editorial_items
  ALTER COLUMN platforms SET NOT NULL,
  ALTER COLUMN formats   SET NOT NULL;

-- The same closed sets the single columns already enforce, applied to
-- every element, plus the two rules that only make sense for a pair of
-- arrays: neither may be empty, and they must be the same length,
-- because element i of one describes element i of the other.
ALTER TABLE public.editorial_items
  DROP CONSTRAINT IF EXISTS editorial_items_platforms_valid;
ALTER TABLE public.editorial_items
  ADD CONSTRAINT editorial_items_platforms_valid CHECK (
    array_length(platforms, 1) BETWEEN 1 AND 3
    AND platforms <@ ARRAY['instagram','linkedin','other']::text[]
  );

ALTER TABLE public.editorial_items
  DROP CONSTRAINT IF EXISTS editorial_items_formats_valid;
ALTER TABLE public.editorial_items
  ADD CONSTRAINT editorial_items_formats_valid CHECK (
    array_length(formats, 1) = array_length(platforms, 1)
    AND formats <@ ARRAY['ig_story','ig_post','ig_reel','li_post','other']::text[]
  );

-- ---------------------------------------------------------------------
-- The scalars follow the arrays, always.
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.editorial_sync_primary()
  RETURNS trigger
  LANGUAGE plpgsql
  SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.platforms IS NOT NULL AND array_length(NEW.platforms, 1) >= 1 THEN
    NEW.platform := NEW.platforms[1];
  END IF;
  IF NEW.formats IS NOT NULL AND array_length(NEW.formats, 1) >= 1 THEN
    NEW.format := NEW.formats[1];
  END IF;
  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS editorial_sync_primary_trg ON public.editorial_items;
CREATE TRIGGER editorial_sync_primary_trg
  BEFORE INSERT OR UPDATE ON public.editorial_items
  FOR EACH ROW EXECUTE FUNCTION public.editorial_sync_primary();