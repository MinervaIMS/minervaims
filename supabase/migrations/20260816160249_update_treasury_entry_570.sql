-- Update the 31/12/2025 End of Fall 2025 treasury entry to €570
UPDATE treasury_entries
SET amount = 570
WHERE execution_date = '2025-12-31'
  AND description = 'End of Fall 2025'
  AND source = 'manual'
  AND academic_semester = 'Sep 2025-Jan 2026';
