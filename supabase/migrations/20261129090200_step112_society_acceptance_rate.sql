-- =====================================================================
-- STEP 112: THE ACCEPTANCE RATE ON /about IS THE SOCIETY'S.
-- ---------------------------------------------------------------------
-- "Minerva in numbers" on /about showed the acceptance rate of the most
-- selective division, which is too low for a page about the whole
-- Society. It now shows the Society's: the acceptance rates of the five
-- divisions of the latest full recruiting round, added together (each is
-- the division's places over all the round's applications, so the sum is
-- the share of applications that ended in a place in any division).
--
--   acceptance_rate_society  a new figure, kept equal to that sum: every
--                            time refresh_key_numbers writes the round's
--                            acceptance rate (after the five division
--                            rates), a trigger adds the five up
--   about, position 6        shows the new figure in place of the old
--
-- Nothing else changes: the division rates on /join and the old figure
-- (acceptance_rate) stay as they are, and refresh_key_numbers is not
-- rewritten. Safe to run twice: the figure is added only if missing, the
-- trigger replaced, the /about row moved only if it still shows the old
-- figure. Nothing is deleted.
-- =====================================================================

INSERT INTO public.key_numbers (slug, label, format, decimals, kind, definition_template, virtual_portfolio, source)
VALUES ('acceptance_rate_society', 'Acceptance rate', 'percent', 1, 'percentage',
        'Share of applications in the {round} recruiting round that ended in a place in any division: the acceptance rates of the five divisions, added together.',
        false, 'auto: refresh_key_numbers, applications (the division rates, added together)')
ON CONFLICT (slug) DO NOTHING;

-- The sum, written whenever the round's acceptance rate is.
CREATE OR REPLACE FUNCTION public.kn_society_acceptance_rate()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_sum numeric;
  v_n int;
BEGIN
  SELECT sum(value), count(value) INTO v_sum, v_n
    FROM public.key_numbers
   WHERE slug IN ('join_rate_equity', 'join_rate_investment', 'join_rate_macro', 'join_rate_portfolio', 'join_rate_quant')
     AND period IS NOT DISTINCT FROM NEW.period;
  PERFORM public.kn_put('acceptance_rate_society', CASE WHEN v_n > 0 THEN v_sum END, NEW.as_of, NEW.period,
    jsonb_build_object('round', NEW.period), NEW.period IS NOT NULL AND coalesce(v_sum, 0) > 0);
  RETURN NULL;
END;
$$;
REVOKE ALL ON FUNCTION public.kn_society_acceptance_rate() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS kn_society_acceptance_rate_trg ON public.key_numbers;
CREATE TRIGGER kn_society_acceptance_rate_trg
  AFTER INSERT OR UPDATE ON public.key_numbers
  FOR EACH ROW WHEN (NEW.slug = 'acceptance_rate')
  EXECUTE FUNCTION public.kn_society_acceptance_rate();

-- The figure now, from the rates already there.
DO $$
DECLARE v_sum numeric; v_n int; v_period text; v_as_of date;
BEGIN
  SELECT period, as_of INTO v_period, v_as_of FROM public.key_numbers WHERE slug = 'acceptance_rate';
  SELECT sum(value), count(value) INTO v_sum, v_n
    FROM public.key_numbers
   WHERE slug IN ('join_rate_equity', 'join_rate_investment', 'join_rate_macro', 'join_rate_portfolio', 'join_rate_quant')
     AND period IS NOT DISTINCT FROM v_period;
  PERFORM public.kn_put('acceptance_rate_society', CASE WHEN v_n > 0 THEN v_sum END, coalesce(v_as_of, current_date), v_period,
    jsonb_build_object('round', v_period), v_period IS NOT NULL AND coalesce(v_sum, 0) > 0);
END $$;

-- /about shows the Society's rate where it showed the most selective division's.
UPDATE public.key_number_pages
   SET slug = 'acceptance_rate_society'
 WHERE page_key = 'about' AND slug = 'acceptance_rate'
   AND NOT EXISTS (SELECT 1 FROM public.key_number_pages WHERE page_key = 'about' AND slug = 'acceptance_rate_society');
