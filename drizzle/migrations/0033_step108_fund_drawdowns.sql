-- =====================================================================
-- STEP 108: EVERY DRAWDOWN, NOT ONLY THE DEEPEST.
-- ---------------------------------------------------------------------
-- The fund charts (the homepage, Portfolio Management and each fund's
-- page) gain a Drawdowns switch that shades each spell a fund spent
-- below its previous high, from the month it entered to the month it
-- came back, the way a fund factsheet shows them, with a strip beneath
-- the chart reading how far below the high each month stood and a table
-- of the spells.
--
-- Every derived fund figure is computed once, here, from the monthly
-- returns (root AGENTS.md), so the figures the chart draws are added to
-- public.fund_track_record rather than worked out in the browser:
--
--   monthly[].drawdown   how far below its previous high the fund stood
--                        at the end of the month, in percent (0 at a
--                        high); the high before the first month is the
--                        starting value, as for the maximum drawdown
--   drawdowns[]          every spell below a high, oldest first:
--                        peak_month (the last month at the high; null
--                        when it is the start), from_inception,
--                        start_month (the first month below it),
--                        trough_month, depth (percent), recovery_month
--                        (the first month back at or above the high;
--                        null while it lasts), months_to_trough (high to
--                        trough) and months_to_recover (trough to
--                        recovery; null while it lasts)
--
-- Everything the function returned before is returned exactly as before:
-- this file is the same function with those two additions, and
-- scripts/fund-stats.test.mjs recomputes all of it, the additions
-- included, from the monthly returns alone. The deepest spell is the
-- maximum drawdown, to the month.
--
-- Nothing is written; no email. Safe to run twice.
-- =====================================================================

CREATE OR REPLACE FUNCTION public.fund_track_record(p_fund text)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_m      date[];
  v_r      numeric[];
  v_rf     numeric[];
  v_w      numeric[];
  n        int;
  i        int;
  j        int;
  w        numeric := 1;
  peak     numeric := 1;
  peak_i   int := 0;
  mdd      numeric := 0;
  mdd_pi   int := 0;
  mdd_ti   int := 0;
  rec_i    int;
  dd       numeric;
  peak_w   numeric;
  v_dd     numeric[];
  v_eps    jsonb := '[]'::jsonb;
  e_on     boolean := false;
  e_peak   int;
  e_start  int;
  e_trough int;
  e_depth  numeric;
  v_years  jsonb;
  v_refs   jsonb;
  v_rfinfo jsonb;
  v_itd    jsonb;
BEGIN
  SELECT array_agg(m ORDER BY m), array_agg(r ORDER BY m)
    INTO v_m, v_r
    FROM (SELECT make_date(y.year, t.idx::int, 1) AS m, public.kn_points(t.v) / 100 AS r
            FROM public.fund_performance_years y,
                 LATERAL jsonb_array_elements_text(
                   CASE WHEN jsonb_typeof(y.months::jsonb) = 'array' THEN y.months::jsonb ELSE '[]'::jsonb END)
                   WITH ORDINALITY AS t(v, idx)
            WHERE y.fund::text = p_fund AND t.idx <= 12 AND public.kn_points(t.v) IS NOT NULL
             AND public.kn_points(t.v) > -100) s;
  n := COALESCE(array_length(v_m, 1), 0);
  IF n = 0 THEN
    RETURN jsonb_build_object('fund', p_fund, 'months_count', 0, 'years', '[]'::jsonb, 'monthly', '[]'::jsonb,
                              'references', '[]'::jsonb);
  END IF;

  -- The monthly risk-free return from the €STR typed for that month.
  SELECT array_agg(CASE WHEN x.value IS NOT NULL THEN power(1 + x.value / 100, 1.0 / 12) - 1 END ORDER BY u.m)
    INTO v_rf
    FROM unnest(v_m) AS u(m)
    LEFT JOIN public.fund_reference_series x ON x.series = 'estr' AND x.month = u.m;

  -- The compounded series and its deepest fall; and, month by month, how
  -- far below its previous high it stands, and every spell below one
  -- (Step 108): entered the first month under the high, deepest at the
  -- trough, left the first month back at or above it.
  v_w := ARRAY[]::numeric[];
  v_dd := ARRAY[]::numeric[];
  FOR i IN 1 .. n LOOP
    w := w * (1 + v_r[i]);
    v_w := v_w || w;
    IF w >= peak THEN peak := w; peak_i := i; END IF;
    dd := w / peak - 1;
    v_dd := v_dd || dd;
    IF dd < mdd THEN mdd := dd; mdd_pi := peak_i; mdd_ti := i; END IF;
    IF dd < 0 AND NOT e_on THEN
      e_on := true; e_peak := peak_i; e_start := i; e_trough := i; e_depth := dd;
    ELSIF dd < 0 AND dd < e_depth THEN
      e_trough := i; e_depth := dd;
    ELSIF dd >= 0 AND e_on THEN
      v_eps := v_eps || jsonb_build_object(
        'peak_month', CASE WHEN e_peak > 0 THEN to_char(v_m[e_peak], 'YYYY-MM') END,
        'from_inception', e_peak = 0,
        'start_month', to_char(v_m[e_start], 'YYYY-MM'),
        'trough_month', to_char(v_m[e_trough], 'YYYY-MM'),
        'depth', round(100 * e_depth, 6),
        'recovery_month', to_char(v_m[i], 'YYYY-MM'),
        'months_to_trough', e_trough - e_peak,
        'months_to_recover', i - e_trough);
      e_on := false;
    END IF;
  END LOOP;
  IF e_on THEN
    v_eps := v_eps || jsonb_build_object(
      'peak_month', CASE WHEN e_peak > 0 THEN to_char(v_m[e_peak], 'YYYY-MM') END,
      'from_inception', e_peak = 0,
      'start_month', to_char(v_m[e_start], 'YYYY-MM'),
      'trough_month', to_char(v_m[e_trough], 'YYYY-MM'),
      'depth', round(100 * e_depth, 6),
      'recovery_month', NULL,
      'months_to_trough', e_trough - e_peak,
      'months_to_recover', NULL);
  END IF;
  rec_i := NULL;
  IF mdd < 0 THEN
    peak_w := CASE WHEN mdd_pi = 0 THEN 1 ELSE v_w[mdd_pi] END;
    FOR j IN mdd_ti + 1 .. n LOOP
      IF v_w[j] >= peak_w THEN
        rec_i := j;
        EXIT;
      END IF;
    END LOOP;
  END IF;

  WITH s AS (
    SELECT u.m, u.r, u.rf FROM unnest(v_m, v_r, v_rf) AS u(m, r, rf)
  ), yr AS (
    SELECT extract(year FROM m)::int AS year, count(*)::int AS cnt, exp(sum(ln(1 + r))) AS g,
           stddev_samp(r) AS sd, bool_and(rf IS NOT NULL) AS rf_ok, exp(sum(ln(1 + COALESCE(rf, 0)))) AS grf
      FROM s GROUP BY 1
  ), cum AS (
    SELECT year, exp(sum(ln(g)) OVER (ORDER BY year)) AS cg FROM yr
  )
  SELECT jsonb_agg(jsonb_build_object(
           'year', yr.year,
           'n', yr.cnt,
           'months', (SELECT jsonb_agg((SELECT round(100 * s.r, 6) FROM s WHERE s.m = make_date(yr.year, mm, 1)) ORDER BY mm)
                        FROM generate_series(1, 12) AS mm),
           'ytd', round(100 * (yr.g - 1), 6),
           'itd', round(100 * (cum.cg - 1), 6),
           'vol', CASE WHEN yr.cnt >= 2 THEN round(100 * yr.sd * sqrt(12::numeric), 6) END,
           'sharpe', CASE WHEN yr.cnt = 12 AND yr.rf_ok AND yr.sd > 0
                          THEN round(((power(yr.g, 12.0 / yr.cnt) - 1) - (power(yr.grf, 12.0 / yr.cnt) - 1))
                                     / (yr.sd * sqrt(12::numeric)), 6) END)
         ORDER BY yr.year)
    INTO v_years
    FROM yr JOIN cum USING (year);

  WITH s AS (
    SELECT u.m, u.r, u.rf FROM unnest(v_m, v_r, v_rf) AS u(m, r, rf)
  ), a AS (
    SELECT exp(sum(ln(1 + r))) AS g, stddev_samp(r) AS sd, bool_and(rf IS NOT NULL) AS rf_ok,
           exp(sum(ln(1 + COALESCE(rf, 0)))) AS grf, count(*) FILTER (WHERE r > 0) AS pos
      FROM s
  )
  SELECT jsonb_build_object(
           'itd', round(100 * (a.g - 1), 6),
           'ann_return', CASE WHEN n >= 12 THEN round(100 * (power(a.g, 12.0 / n) - 1), 6) END,
           'ann_vol', CASE WHEN n >= 12 THEN round(100 * a.sd * sqrt(12::numeric), 6) END,
           'sharpe', CASE WHEN n >= 12 AND a.rf_ok AND a.sd > 0
                          THEN round(((power(a.g, 12.0 / n) - 1) - (power(a.grf, 12.0 / n) - 1))
                                     / (a.sd * sqrt(12::numeric)), 6) END,
           'positive_share', round(100.0 * a.pos / n, 6),
           'positive_months', a.pos,
           'best', (SELECT jsonb_build_object('month', to_char(m, 'YYYY-MM'), 'value', round(100 * r, 6))
                      FROM s ORDER BY r DESC, m LIMIT 1),
           'worst', (SELECT jsonb_build_object('month', to_char(m, 'YYYY-MM'), 'value', round(100 * r, 6))
                       FROM s ORDER BY r ASC, m LIMIT 1))
    INTO v_itd
    FROM a;

  SELECT jsonb_build_object(
           'label', COALESCE(mt.label, '€STR'),
           'months_covered', count(x.value),
           'average_rate', round(avg(x.value), 6),
           'sources', COALESCE(jsonb_agg(DISTINCT x.source) FILTER (WHERE x.source <> ''), '[]'::jsonb),
           'as_of', max(x.as_of),
           'complete', count(x.value) = n)
    INTO v_rfinfo
    FROM unnest(v_m) AS u(m)
    LEFT JOIN public.fund_reference_series x ON x.series = 'estr' AND x.month = u.m
    LEFT JOIN public.fund_reference_meta mt ON mt.series = 'estr'
   GROUP BY mt.label;

  SELECT COALESCE(jsonb_agg(ref ORDER BY pos), '[]'::jsonb) INTO v_refs
    FROM (
      SELECT mt.position AS pos, jsonb_build_object(
               'series', mt.series, 'label', mt.label, 'variant', mt.variant, 'currency', mt.currency,
               'months', count(x.value)::int,
               'from', to_char(min(f.m) FILTER (WHERE x.value IS NOT NULL), 'YYYY-MM'),
               'to', to_char(max(f.m) FILTER (WHERE x.value IS NOT NULL), 'YYYY-MM'),
               'beta', CASE WHEN count(x.value) >= 12 THEN round(regr_slope(f.r, x.value / 100)::numeric, 6) END,
               'correlation', CASE WHEN count(x.value) >= 12 THEN round(corr(f.r, x.value / 100)::numeric, 6) END,
               'sources', COALESCE(jsonb_agg(DISTINCT x.source) FILTER (WHERE x.source <> ''), '[]'::jsonb),
               'as_of', max(x.as_of)) AS ref
        FROM public.fund_reference_meta mt
        LEFT JOIN unnest(v_m, v_r) AS f(m, r) ON true
        LEFT JOIN public.fund_reference_series x ON x.series = mt.series AND x.month = f.m
        WHERE mt.kind = 'index'
       GROUP BY mt.series, mt.position, mt.label, mt.variant, mt.currency
    ) q;

  RETURN jsonb_build_object(
    'fund', p_fund,
    'months_count', n,
    'first_month', to_char(v_m[1], 'YYYY-MM'),
    'last_month', to_char(v_m[n], 'YYYY-MM'),
    'monthly', (SELECT jsonb_agg(jsonb_build_object('month', to_char(u.m, 'YYYY-MM'), 'value', round(100 * u.r, 6),
                                                      'drawdown', round(100 * u.d, 6)) ORDER BY u.m)
                  FROM unnest(v_m, v_r, v_dd) AS u(m, r, d)),
    'years', COALESCE(v_years, '[]'::jsonb),
    'max_drawdown', jsonb_build_object(
       'value', round(100 * mdd, 6),
       'peak_month', CASE WHEN mdd < 0 AND mdd_pi > 0 THEN to_char(v_m[mdd_pi], 'YYYY-MM') END,
       'from_inception', mdd < 0 AND mdd_pi = 0,
       'trough_month', CASE WHEN mdd < 0 THEN to_char(v_m[mdd_ti], 'YYYY-MM') END,
       'recovery_month', CASE WHEN rec_i IS NOT NULL THEN to_char(v_m[rec_i], 'YYYY-MM') END,
       'months_to_recover', CASE WHEN rec_i IS NOT NULL THEN rec_i - mdd_ti END),
    'drawdowns', v_eps,
    'risk_free', v_rfinfo,
    'references', v_refs
  ) || v_itd;
END;
$function$;

REVOKE ALL ON FUNCTION public.fund_track_record(text) FROM PUBLIC, anon, authenticated;