DO $$
DECLARE definition text;
BEGIN
 SELECT pg_get_functiondef('public.fund_track_record(text)'::regprocedure) INTO definition;
 definition := replace(definition, '''recovery_month'', CASE WHEN rec_i IS NOT NULL THEN rec_i - mdd_ti END,', '''recovery_month'', CASE WHEN rec_i IS NOT NULL THEN to_char(v_m[rec_i], ''YYYY-MM'') END,');
 EXECUTE definition;
END $$;