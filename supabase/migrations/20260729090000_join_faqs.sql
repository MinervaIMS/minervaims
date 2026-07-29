-- =====================================================================
-- Join page FAQ entries
-- ---------------------------------------------------------------------
-- The /join FAQ is the part of the admissions page most likely to change
-- between intakes, so it is stored as data rather than JSX. One row per
-- question, grouped into the four published groups and ordered within
-- each group. An entry may carry a single inline routed link, rendered
-- after the answer (e.g. "Read The Statute" -> /statute).
--
-- Read path: public (anon + authenticated) SELECT of published rows.
-- Write path: service_role only, so the admin workspace edits go through
-- the same edge-function pattern used by the other website tables.
-- =====================================================================

CREATE TABLE IF NOT EXISTS public.join_faqs (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  group_key    text NOT NULL CHECK (group_key IN ('eligibility', 'process', 'preparing', 'membership')),
  group_label  text NOT NULL,
  group_order  int  NOT NULL,
  sort_order   int  NOT NULL,
  question     text NOT NULL,
  answer       text NOT NULL,
  -- Optional inline routed link shown beneath the answer. Both columns are
  -- set together; link_href is an internal route, never an external URL.
  link_label   text,
  link_href    text,
  is_published boolean NOT NULL DEFAULT true,
  updated_at   timestamptz NOT NULL DEFAULT now(),
  updated_by   uuid REFERENCES auth.users(id),
  UNIQUE (group_key, sort_order),
  CONSTRAINT join_faqs_link_pair CHECK (
    (link_label IS NULL AND link_href IS NULL) OR
    (link_label IS NOT NULL AND link_href IS NOT NULL)
  ),
  CONSTRAINT join_faqs_link_internal CHECK (
    link_href IS NULL OR link_href LIKE '/%'
  )
);

CREATE INDEX IF NOT EXISTS join_faqs_order_idx
  ON public.join_faqs (group_order, sort_order);

DROP TRIGGER IF EXISTS update_join_faqs_updated_at ON public.join_faqs;
CREATE TRIGGER update_join_faqs_updated_at
  BEFORE UPDATE ON public.join_faqs
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.join_faqs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "join faqs are public" ON public.join_faqs;
CREATE POLICY "join faqs are public"
  ON public.join_faqs FOR SELECT
  USING (is_published);

GRANT SELECT ON public.join_faqs TO anon, authenticated;
GRANT ALL    ON public.join_faqs TO service_role;

-- ---------------------------------------------------------------------
-- Seed: the published admissions FAQ, four groups.
-- ---------------------------------------------------------------------
INSERT INTO public.join_faqs
  (group_key, group_label, group_order, sort_order, question, answer, link_label, link_href)
VALUES
  ('eligibility', 'Eligibility', 1, 1,
   'Who should apply?',
   'Minerva is open to students currently enrolled at Bocconi University, undergraduate, exchange or graduate, who hold a genuine interest in financial markets and investment research and who are prepared to participate actively in the Society. Prior experience in finance is not required. We value academic integrity, humility, eagerness to learn, respect for other members, and full compliance with Bocconi''s Honour Code.',
   NULL, NULL),

  ('eligibility', 'Eligibility', 1, 2,
   'Does my academic performance affect my application?',
   'No. Our statute is explicit on this point: academic performance is in no circumstance a criterion for admission to the Society, nor for the assignment of positions within it.',
   NULL, NULL),

  ('eligibility', 'Eligibility', 1, 3,
   'Are first-year undergraduate students considered?',
   'Yes, and every intake admits them. Assessment is calibrated to your academic year: for first-year candidates, the emphasis falls more on motivation, awareness of markets and general technical understanding of financial markets and investments, rather than on specialised depth. A strong first-year answer to the written question tends to be narrow and well argued rather than broad and thin: take a single company, theme or method and treat it properly.',
   NULL, NULL),

  ('eligibility', 'Eligibility', 1, 4,
   'Do I need prior experience in finance? Do I need to be able to code?',
   'No prior working experience in finance is required for any division. Intermediate programming skills in Python may be expected to join some teams, at a level well beyond the curricular first-year computer science course of the undergraduate programme.',
   NULL, NULL),

  ('eligibility', 'Eligibility', 1, 5,
   'Can I apply while I am on exchange abroad?',
   'No. Applications submitted while a student is on exchange are not considered, as being present and active on campus is a strict requirement of membership. Members who join and subsequently go on exchange are covered by the pause semester provisions of our statute.',
   'Read The Statute', '/statute'),

  ('eligibility', 'Eligibility', 1, 6,
   'Can I apply if I am enrolled on a specialising master?',
   'Yes. Students regularly enrolled on a specialising master at Bocconi University are welcome to apply and may join upon successful completion of the process.',
   NULL, NULL),

  ('eligibility', 'Eligibility', 1, 7,
   'Can I apply if I am in my final semester before graduating?',
   'Yes, applications from students in their final semester are accepted. Bear in mind, however, that the Talent Recruiting Team may favour candidates who have time to grow and learn within the Society. Every place given to one person is an opportunity withheld from another, and a candidate with a longer horizon is sometimes the preferable choice.',
   NULL, NULL),

  ('eligibility', 'Eligibility', 1, 8,
   'Can I be a member of another Bocconi association at the same time?',
   'Membership of another society is not in itself an obstacle. That said, since we value active participation and sustained commitment, several commitments from other demanding finance or consulting societies will be a matter for reflection by the Talent Recruiting Team and the Head of Division. We have had members who managed both their academic duties and commitments across demanding societies well (Minerva and others), but they are the exception that proves the rule. In most cases, members have been asked to focus on one associations-related endeavour at a time.',
   NULL, NULL),

  ('eligibility', 'Eligibility', 1, 9,
   'Is there a membership fee?',
   'Yes. All members pay a membership fee each semester, due at the start of the academic term and set by our statute. It exists solely to self-fund the Society''s activities and is never a means of distributing profit. All positions within the Society are held on an unpaid basis.',
   NULL, NULL),

  ('eligibility', 'Eligibility', 1, 10,
   'What language does the Society work in?',
   'English. Interviews are conducted entirely in English, and English is the Society''s working language internally, since, on average, more than 60% of its members are international students. All published research is in English. If English is not your first language, we recommend practising interview questions aloud in English beforehand, for which the voice mode of ChatGPT is a straightforward and effective tool.',
   NULL, NULL),

  ('process', 'Application Process', 2, 1,
   'When are applications open?',
   'Once each semester, in the opening weeks of the academic term, indicatively during three weeks of September and of February. The September intake typically has more positions available than the February intake due to a higher turnover of exiting members at the end of the previous academic year.',
   NULL, NULL),

  ('process', 'Application Process', 2, 2,
   'How many places are available?',
   'The number of new members admitted to each division in a given semester is set by that division''s Head of Division together with the Board of Directors of the Society. Every division admits at least one new member each semester, and the number of places is capped. Total membership of the Society is capped by our statute at 110.',
   NULL, NULL),

  ('process', 'Application Process', 2, 3,
   'Which division''s written question do I need to answer?',
   'The question for your first-choice division. If you consider it appropriate, you may also answer the question for your second-choice division, combining both answers into the same file. This is not mandatory and is worth doing only if the second answer meets the same standard as the first.',
   NULL, NULL),

  ('process', 'Application Process', 2, 4,
   'What is my second-choice division used for?',
   'Two things. The Talent Recruiting Team, working with the Heads of Division, may conclude that a given profile is better suited to another division. It is also considered where a candidate is not selected for their first choice but is strong nonetheless. A final rejection counts as a rejection across all divisions.',
   NULL, NULL),

  ('process', 'Application Process', 2, 5,
   'Are the written and interview questions the same for everyone?',
   'The written question is identical for every candidate applying to a given division. Interview questions are evaluated based on your academic year and individual profile, and assess both present knowledge and longer-term potential.',
   NULL, NULL),

  ('process', 'Application Process', 2, 6,
   'Should I apply as soon as applications open, or closer to the deadline?',
   'Applications are reviewed on a rolling basis, so submitting early in the window can work in your favour.',
   NULL, NULL),

  ('process', 'Application Process', 2, 7,
   'What form does the interview take?',
   'An online meeting of approximately thirty minutes. Candidates invited to interview book their own slot through the scheduling system available in the account from which they track their application.',
   NULL, NULL),

  ('process', 'Application Process', 2, 8,
   'What is assessed during the interview?',
   'Four areas. Your awareness of capital markets news, treated as a direct indicator of how much time you spend following markets. Your familiarity with current macroeconomic figures and financial data, including inflation, rates, foreign exchange and government yields across the most relevant economies. Your motivation, and specifically why you are applying to Minerva IMS rather than elsewhere. And technical questions, some of which may be drawn from the topic of the written answer you submitted, and always calibrated to the stage of your studies.',
   NULL, NULL),

  ('process', 'Application Process', 2, 9,
   'On what grounds can an application be rejected?',
   'Legitimate grounds include the semester''s admission cap for that division having been reached, an incomplete or formally irregular application, and not meeting the membership requirements set out in our statute. A rejection may never rest on discriminatory grounds. Every rejection is communicated to the candidate in writing, with reasons.',
   NULL, NULL),

  ('process', 'Application Process', 2, 10,
   'When will I hear back?',
   'Hearing back is a right of every applicant. We undertake to respond properly to everyone within a maximum of three weeks from the closure of the application period. In the unfortunate event that nothing reaches you, the error is likely ours: please get in touch through the contacts page.',
   'Contact Us', '/contacts'),

  ('process', 'Application Process', 2, 11,
   'May I use artificial intelligence tools in preparing my application?',
   'We believe in technological advancement and in the way it extends human capability, so applicants are encouraged to use every tool at their disposal, whether artificial intelligence, the Bocconi library resources or anything else. Be aware, however, that everything submitted in your curriculum vitae and written answer is open to questioning at interview, and that students like us find it fairly easy to spot a model of disproportionate complexity or one that has been invented. If you use artificial intelligence, be ready to explain every word and every concept, from the practical application through to the underlying theory. Do not use or mention material you do not fully understand. Present yourself as the person you are. The most common error by far is to overstate in the written answer and then be unable to explain the theory and the rationale behind a given concept during the interview.',
   NULL, NULL),

  ('process', 'Application Process', 2, 12,
   'Are referrals available?',
   'No. We no longer accept referrals, as in our experience they added value neither for candidates nor for the Society. The selection process is designed so that strong candidates can demonstrate their value on the merits of the application itself. You remain welcome to connect with members on LinkedIn.',
   NULL, NULL),

  ('process', 'Application Process', 2, 13,
   'Can I apply again if I am not selected?',
   'Yes, and we encourage it, particularly for first-year undergraduates. Around 30% of members join the society at the start of their second year of a bachelor''s degree, most of whom had already applied once in their first year. A second application is an opportunity to show how far you have progressed in the meantime.',
   NULL, NULL),

  ('preparing', 'Preparing', 3, 1,
   'How should I prepare for the written question?',
   'Read the published research of the division you intend to list as your first choice. The archive is open and will show you the structure, depth and recurring themes expected of work carrying the Society''s name.',
   NULL, NULL),

  ('preparing', 'Preparing', 3, 2,
   'How should I prepare for the interview?',
   'Read the last two reports published by the division you have applied to, and be sure you understand them well enough to explain what was done and why. Follow markets daily: the Financial Times, the Wall Street Journal and Il Sole 24 Ore are all available to you at no cost through Bocconi''s subscriptions. If English is not your first language, practise answering questions aloud in English before the interview.',
   NULL, NULL),

  ('preparing', 'Preparing', 3, 3,
   'Can I contact current members with questions?',
   'Yes. You are welcome to approach members on LinkedIn with specific, thoughtful questions. The best way to get to know us, however, is to attend Associations on Display in mid-September or mid-February, as well as the aperitivo open to applicants.',
   NULL, NULL),

  ('membership', 'Membership', 4, 1,
   'Is this worth the time?',
   'Membership asks for thorough and unwavering commitment across the academic year. What it returns is published work carrying your name, coverage you own, and a network of more than 300 former members who made the same trade. Whether that is a good use of your time is your judgement to make.',
   NULL, NULL),

  ('membership', 'Membership', 4, 2,
   'How much time does membership require each week?',
   'It depends considerably on the division, on your academic year and on the person you are. As a guide, allow four hours of research and study, one hour of in-person meetings or calls, and one hour of events, whether guest panels, alumni calls or social gatherings, for an average of six hours a week. A strong student may complete the research in an hour a week without artificial intelligence; a student at the beginning of their journey may need six hours even with it. Note that from at least a week before the exam sessions and throughout them, division work and events stop entirely: academic performance remains an absolute priority.',
   NULL, NULL),

  ('membership', 'Membership', 4, 3,
   'What is expected of me as a member?',
   'To carry out the work assigned to you by your team, to meet the deadlines set by your Head of Division, and to participate actively in the Society''s initiatives across the semester. As an analyst you support your team leader or portfolio manager, produce analysis and written content, and attend your team''s working meetings, of which there are at least three in person each semester, alongside at least one in-person division event.',
   NULL, NULL),

  ('membership', 'Membership', 4, 4,
   'What does the first semester look like once I have joined?',
   'From day one within your division, you contribute to work reviewed by more experienced peers before publication. Members also attend the Society''s flagship semester event with industry professionals, company visits, and internal presentations at which teams present and defend their work.',
   NULL, NULL)
ON CONFLICT (group_key, sort_order) DO NOTHING;
