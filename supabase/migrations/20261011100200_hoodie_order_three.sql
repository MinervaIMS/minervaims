-- =====================================================================
-- STEP 89. Giuseppe Marcarelli's hoodie order: three hoodies, one answer.
-- ---------------------------------------------------------------------
-- Before forms could take more than one item, Giuseppe ordered one hoodie
-- (M, White) and wrote the other two in a text answer: "1. White, S
-- 2. Black, S". This puts all three into his answer, the way the form now
-- records them, and sets the hoodie form to take more than one:
--
--   * the hoodie form (title containing "hoodie"): up to 5 hoodies per
--     answer, each called "Hoodie"; Size and Colour are asked again for
--     each extra hoodie, every other question once (as before);
--   * his answer: hoodie 1 stays M, White; hoodies 2 and 3 are S, White
--     and S, Black;
--   * what he owes: the form's amount for each hoodie (and the price of
--     any priced size or colour), so EUR 30 x 3 = EUR 90;
--   * Paid stays as it is, and his text answer is kept as he wrote it; a
--     team note on the answer says what was changed and why.
--
-- Nothing else changes. If the form, his answer, or a Size or Colour
-- question with those choices cannot be found unambiguously, nothing is
-- written and a NOTICE says why. Safe to run twice: an answer that
-- already holds extra hoodies is left alone.
-- =====================================================================

DO $$
DECLARE
  v_resp      record;
  v_form      record;
  v_size      jsonb;
  v_colour    jsonb;
  v_n         int;
  v_s         text;
  v_white     text;
  v_black     text;
  v_fields    jsonb;
  v_items     jsonb;
  v_fixed     numeric;
  v_ps        numeric;
  v_pw        numeric;
  v_pb        numeric;
  v_due       numeric;
  v_note      text := 'Step 89: the two extra hoodies written in the text answer (S, White and S, Black) were added to this order as hoodies 2 and 3. Amount due updated for three hoodies; the payment record was not changed.';
BEGIN
  SELECT r.* INTO v_resp
    FROM public.internal_form_responses r
    JOIN public.internal_forms f ON f.id = r.form_id
   WHERE lower(r.member_email) = 'giuseppe.marcarelli@studbocconi.it'
     AND f.title ILIKE '%hoodie%'
   ORDER BY r.submitted_at DESC
   LIMIT 1;
  IF NOT FOUND THEN
    RAISE NOTICE 'Hoodie order: no answer from giuseppe.marcarelli@studbocconi.it to a hoodie form. Nothing changed.';
    RETURN;
  END IF;
  SELECT * INTO v_form FROM public.internal_forms WHERE id = v_resp.form_id;

  IF v_resp.answers ? '+items' THEN
    RAISE NOTICE 'Hoodie order: the answer already holds extra hoodies. Nothing changed.';
    RETURN;
  END IF;

  -- The Size question: a one-choice question offering S and M.
  SELECT count(*) INTO v_n FROM jsonb_array_elements(v_form.fields) q
   WHERE q->>'type' IN ('single_choice', 'dropdown')
     AND EXISTS (SELECT 1 FROM jsonb_array_elements_text(q->'options') o WHERE lower(btrim(o)) = 's')
     AND EXISTS (SELECT 1 FROM jsonb_array_elements_text(q->'options') o WHERE lower(btrim(o)) = 'm');
  IF v_n <> 1 THEN
    RAISE NOTICE 'Hoodie order: % questions offer the sizes S and M (one was expected). Nothing changed.', v_n;
    RETURN;
  END IF;
  SELECT q INTO v_size FROM jsonb_array_elements(v_form.fields) q
   WHERE q->>'type' IN ('single_choice', 'dropdown')
     AND EXISTS (SELECT 1 FROM jsonb_array_elements_text(q->'options') o WHERE lower(btrim(o)) = 's')
     AND EXISTS (SELECT 1 FROM jsonb_array_elements_text(q->'options') o WHERE lower(btrim(o)) = 'm');

  -- The Colour question: a one-choice question offering White and Black.
  SELECT count(*) INTO v_n FROM jsonb_array_elements(v_form.fields) q
   WHERE q->>'type' IN ('single_choice', 'dropdown')
     AND EXISTS (SELECT 1 FROM jsonb_array_elements_text(q->'options') o WHERE lower(btrim(o)) = 'white')
     AND EXISTS (SELECT 1 FROM jsonb_array_elements_text(q->'options') o WHERE lower(btrim(o)) = 'black');
  IF v_n <> 1 THEN
    RAISE NOTICE 'Hoodie order: % questions offer the colours White and Black (one was expected). Nothing changed.', v_n;
    RETURN;
  END IF;
  SELECT q INTO v_colour FROM jsonb_array_elements(v_form.fields) q
   WHERE q->>'type' IN ('single_choice', 'dropdown')
     AND EXISTS (SELECT 1 FROM jsonb_array_elements_text(q->'options') o WHERE lower(btrim(o)) = 'white')
     AND EXISTS (SELECT 1 FROM jsonb_array_elements_text(q->'options') o WHERE lower(btrim(o)) = 'black');

  -- The choices exactly as the form spells them.
  SELECT o INTO v_s FROM jsonb_array_elements_text(v_size->'options') o WHERE lower(btrim(o)) = 's' LIMIT 1;
  SELECT o INTO v_white FROM jsonb_array_elements_text(v_colour->'options') o WHERE lower(btrim(o)) = 'white' LIMIT 1;
  SELECT o INTO v_black FROM jsonb_array_elements_text(v_colour->'options') o WHERE lower(btrim(o)) = 'black' LIMIT 1;

  -- Size and Colour asked again for each extra hoodie; every other
  -- question once, as on the form until now. (A question stores "repeat"
  -- only where it differs from the default: on for questions, off for
  -- agreements.)
  SELECT jsonb_agg(
           CASE
             WHEN q->>'id' IN (v_size->>'id', v_colour->>'id') THEN q - 'repeat'
             WHEN q->>'type' IN ('section', 'image', 'consent') THEN q - 'repeat'
             ELSE (q - 'repeat') || '{"repeat": false}'::jsonb
           END ORDER BY ord)
    INTO v_fields
    FROM jsonb_array_elements(v_form.fields) WITH ORDINALITY AS t(q, ord);

  UPDATE public.internal_forms
     SET fields = v_fields,
         items_max = 5,
         item_label = coalesce(nullif(btrim(item_label), ''), 'Hoodie')
   WHERE id = v_form.id;

  v_items := jsonb_build_array(
    jsonb_build_object(v_size->>'id', v_s, v_colour->>'id', v_white),
    jsonb_build_object(v_size->>'id', v_s, v_colour->>'id', v_black)
  );

  -- What the two extra hoodies add: the fixed amount each, plus the price
  -- of the size and colour chosen, where those choices carry one.
  IF v_form.track_payments THEN
    v_fixed := coalesce(v_form.payment_amount, 0);
    SELECT coalesce(((v_size->'optionPrices')->>((i - 1)::int))::numeric, 0) INTO v_ps
      FROM jsonb_array_elements_text(v_size->'options') WITH ORDINALITY AS t(o, i) WHERE o = v_s LIMIT 1;
    SELECT coalesce(((v_colour->'optionPrices')->>((i - 1)::int))::numeric, 0) INTO v_pw
      FROM jsonb_array_elements_text(v_colour->'options') WITH ORDINALITY AS t(o, i) WHERE o = v_white LIMIT 1;
    SELECT coalesce(((v_colour->'optionPrices')->>((i - 1)::int))::numeric, 0) INTO v_pb
      FROM jsonb_array_elements_text(v_colour->'options') WITH ORDINALITY AS t(o, i) WHERE o = v_black LIMIT 1;
    -- Hoodie 2 is S, White; hoodie 3 is S, Black.
    v_due := round(coalesce(v_resp.amount_due, v_fixed)
                   + (v_fixed + coalesce(v_ps, 0) + coalesce(v_pw, 0))
                   + (v_fixed + coalesce(v_ps, 0) + coalesce(v_pb, 0)), 2);
  ELSE
    v_due := v_resp.amount_due;
  END IF;

  UPDATE public.internal_form_responses
     SET answers = answers || jsonb_build_object('+items', v_items),
         amount_due = v_due,
         staff_note = CASE WHEN coalesce(btrim(staff_note), '') = '' THEN v_note ELSE staff_note || E'\n' || v_note END
   WHERE id = v_resp.id;

  RAISE NOTICE 'Hoodie order: % now has 3 hoodies (%, %; %, %; %, %), amount due %, paid %.',
    v_resp.member_name, v_resp.answers->>(v_size->>'id'), v_resp.answers->>(v_colour->>'id'), v_s, v_white, v_s, v_black, v_due, v_resp.paid;
END $$;
