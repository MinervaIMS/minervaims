-- Step 90 compatibility: the original five-category constraint rejects
-- the shared registry's server categories and all browser exports.
-- Preserve required nonempty, bounded categories without constraining
-- the registry to the original event/alumni/file/team_member/reading set.
ALTER TABLE public.activity_logs DROP CONSTRAINT IF EXISTS activity_logs_entity_type_check;
ALTER TABLE public.activity_logs ADD CONSTRAINT activity_logs_entity_type_check CHECK (length(btrim(entity_type)) BETWEEN 1 AND 100);