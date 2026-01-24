-- Create a function to maintain max 250 rows in activity_logs
CREATE OR REPLACE FUNCTION public.trim_activity_logs()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  row_count INTEGER;
  rows_to_delete INTEGER;
BEGIN
  -- Count total rows
  SELECT COUNT(*) INTO row_count FROM public.activity_logs;
  
  -- If more than 250 rows, delete the oldest ones
  IF row_count > 250 THEN
    rows_to_delete := row_count - 250;
    
    DELETE FROM public.activity_logs
    WHERE id IN (
      SELECT id FROM public.activity_logs
      ORDER BY created_at ASC
      LIMIT rows_to_delete
    );
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger that runs after each insert
DROP TRIGGER IF EXISTS trim_activity_logs_trigger ON public.activity_logs;

CREATE TRIGGER trim_activity_logs_trigger
AFTER INSERT ON public.activity_logs
FOR EACH STATEMENT
EXECUTE FUNCTION public.trim_activity_logs();