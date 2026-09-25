UPDATE public.join_faqs
   SET answer = replace(answer, 'An online meeting of approximately thirty minutes.',
                        'An online meeting of fifteen to thirty minutes, depending on the division; the length of your slot is shown when you book it.')
 WHERE answer LIKE '%An online meeting of approximately thirty minutes.%';