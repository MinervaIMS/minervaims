-- =====================================================================
-- THE JOIN FAQ SAYS HOW LONG AN INTERVIEW IS, AND IT IS NO LONGER ONE LENGTH.
-- ---------------------------------------------------------------------
-- Smart planning can now open 15-minute slots as well as the 30-minute
-- default, so "approximately thirty minutes" would be wrong for some
-- divisions. The phrase is replaced in place, and only if the answer
-- still contains it: an answer the association has since rewritten is
-- left exactly as it is. Idempotent: a second run matches nothing.
-- =====================================================================
UPDATE public.join_faqs
   SET answer = replace(answer, 'An online meeting of approximately thirty minutes.',
                        'An online meeting of fifteen to thirty minutes, depending on the division; the length of your slot is shown when you book it.')
 WHERE answer LIKE '%An online meeting of approximately thirty minutes.%';
