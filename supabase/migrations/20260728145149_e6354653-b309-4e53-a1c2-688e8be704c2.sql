CREATE TABLE IF NOT EXISTS public.join_faqs (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  faq_group    text NOT NULL CHECK (faq_group IN ('eligibility', 'application', 'preparing', 'membership')),
  position     integer NOT NULL DEFAULT 0,
  question     text NOT NULL,
  answer       text NOT NULL,
  link_label   text,
  link_to      text,
  is_published boolean NOT NULL DEFAULT true,
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT join_faqs_link_pair CHECK (
    (link_label IS NULL AND link_to IS NULL) OR (link_label IS NOT NULL AND link_to IS NOT NULL)
  )
);

GRANT SELECT ON public.join_faqs TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.join_faqs TO authenticated;
GRANT ALL ON public.join_faqs TO service_role;

CREATE INDEX IF NOT EXISTS join_faqs_group_position_idx
  ON public.join_faqs (faq_group, position);

ALTER TABLE public.join_faqs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "join faqs are publicly readable" ON public.join_faqs;
CREATE POLICY "join faqs are publicly readable"
  ON public.join_faqs FOR SELECT
  TO anon, authenticated
  USING (is_published = true);

DROP POLICY IF EXISTS "join faqs readable by workspace" ON public.join_faqs;
CREATE POLICY "join faqs readable by workspace"
  ON public.join_faqs FOR SELECT
  TO authenticated
  USING (public.is_staff(auth.uid()));

DROP POLICY IF EXISTS "join faqs writable by workspace" ON public.join_faqs;
CREATE POLICY "join faqs writable by workspace"
  ON public.join_faqs FOR ALL
  TO authenticated
  USING (public.is_staff(auth.uid()))
  WITH CHECK (public.is_staff(auth.uid()));

CREATE TABLE IF NOT EXISTS public.join_written_questions (
  division   text PRIMARY KEY CHECK (division IN ('equity', 'investment', 'macro', 'portfolio', 'quant')),
  label      text NOT NULL,
  position   integer NOT NULL DEFAULT 0,
  question   text,
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid REFERENCES auth.users (id) ON DELETE SET NULL
);

GRANT SELECT ON public.join_written_questions TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.join_written_questions TO authenticated;
GRANT ALL ON public.join_written_questions TO service_role;

ALTER TABLE public.join_written_questions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "written questions are publicly readable" ON public.join_written_questions;
CREATE POLICY "written questions are publicly readable"
  ON public.join_written_questions FOR SELECT
  TO anon, authenticated
  USING (true);

DROP POLICY IF EXISTS "written questions writable by workspace" ON public.join_written_questions;
CREATE POLICY "written questions writable by workspace"
  ON public.join_written_questions FOR ALL
  TO authenticated
  USING (public.is_staff(auth.uid()))
  WITH CHECK (public.is_staff(auth.uid()));

INSERT INTO public.join_written_questions (division, label, position, question) VALUES
  ('equity',     'Equity Research',        10, NULL),
  ('investment', 'Investment Research',    20, NULL),
  ('macro',      'Macro Research',         30, NULL),
  ('portfolio',  'Portfolio Management',   40, NULL),
  ('quant',      'Quantitative Research',  50, NULL)
ON CONFLICT (division) DO NOTHING;

DELETE FROM public.join_faqs;

INSERT INTO public.join_faqs (faq_group, position, question, answer, link_label, link_to) VALUES

('eligibility', 10,
 $q$Who should apply?$q$,
 $q$Minerva is open to students currently enrolled at Bocconi University, undergraduate, exchange or graduate, who hold a genuine interest in financial markets and investment research and who are prepared to participate actively in the Society. Prior experience in finance is not required. We value academic integrity, humility, eagerness to learn, respect for other members, and full compliance with Bocconi's Honour Code.$q$,
 NULL, NULL),

('eligibility', 20,
 $q$Does my academic performance affect my application?$q$,
 $q$No. Our statute is explicit on this point: academic performance is in no circumstance a criterion for admission to the Society, nor for the assignment of positions within it.$q$,
 NULL, NULL),

('eligibility', 30,
 $q$Are first-year undergraduate students considered?$q$,
 $q$Yes, and every intake admits them. Assessment is calibrated to your academic year: for first-year candidates, the emphasis falls more on motivation, awareness of markets and general technical understanding of financial markets and investments, rather than on specialised depth. A strong first-year answer to the written question tends to be narrow and well argued rather than broad and thin: take a single company, theme or method and treat it properly.$q$,
 NULL, NULL),

('eligibility', 40,
 $q$Do I need prior experience in finance? Do I need to be able to code?$q$,
 $q$No prior working experience in finance is required for any division. Intermediate programming skills in Python may be expected to join some teams, at a level well beyond the curricular first-year computer science course of the undergraduate programme.$q$,
 NULL, NULL),

('eligibility', 50,
 $q$Can I apply while I am on exchange abroad?$q$,
 $q$No. Applications submitted while a student is on exchange are not considered, as being present and active on campus is a strict requirement of membership. Members who join and subsequently go on exchange are covered by the pause semester provisions of our statute.$q$,
 $q$Read The Statute$q$, $q$/statute$q$),

('eligibility', 60,
 $q$Can I apply if I am enrolled on a specialising master?$q$,
 $q$Yes. Students regularly enrolled on a specialising master at Bocconi University are welcome to apply and may join upon successful completion of the process.$q$,
 NULL, NULL),

('eligibility', 70,
 $q$Can I apply if I am in my final semester before graduating?$q$,
 $q$Yes, applications from students in their final semester are accepted. Bear in mind, however, that the Talent Recruiting Team may favour candidates who have time to grow and learn within the Society. Every place given to one person is an opportunity withheld from another, and a candidate with a longer horizon is sometimes the preferable choice.$q$,
 NULL, NULL),

('eligibility', 80,
 $q$Can I be a member of another Bocconi association at the same time?$q$,
 $q$Membership of another society is not in itself an obstacle. That said, since we value active participation and sustained commitment, several commitments from other demanding finance or consulting societies will be a matter for reflection by the Talent Recruiting Team and the Head of Division. We have had members who managed both their academic duties and commitments across demanding societies well (Minerva and others), but they are the exception that proves the rule. In most cases, members have been asked to focus on one associations-related endeavour at a time.$q$,
 NULL, NULL),

('eligibility', 90,
 $q$Is there a membership fee?$q$,
 $q$Yes. All members pay a membership fee each semester, due at the start of the academic term and set by our statute. It exists solely to self-fund the Society's activities and is never a means of distributing profit. All positions within the Society are held on an unpaid basis.$q$,
 NULL, NULL),

('eligibility', 100,
 $q$What language does the Society work in?$q$,
 $q$English. Interviews are conducted entirely in English, and English is the Society's working language internally, since, on average, more than 60% of its members are international students. All published research is in English. If English is not your first language, we recommend practising interview questions aloud in English beforehand, for which the voice mode of ChatGPT is a straightforward and effective tool.$q$,
 NULL, NULL),

('application', 10,
 $q$When are applications open?$q$,
 $q$Once each semester, in the opening weeks of the academic term, indicatively during three weeks of September and of February. The September intake typically has more positions available than the February intake due to a higher turnover of exiting members at the end of the previous academic year.$q$,
 NULL, NULL),

('application', 20,
 $q$How many places are available?$q$,
 $q$The number of new members admitted to each division in a given semester is set by that division's Head of Division together with the Board of Directors of the Society. Every division admits at least one new member each semester, and the number of places is capped. Total membership of the Society is capped by our statute at 110.$q$,
 NULL, NULL),

('application', 30,
 $q$Which division's written question do I need to answer?$q$,
 $q$The question for your first-choice division. If you consider it appropriate, you may also answer the question for your second-choice division, combining both answers into the same file. This is not mandatory and is worth doing only if the second answer meets the same standard as the first.$q$,
 NULL, NULL),

('application', 40,
 $q$What is my second-choice division used for?$q$,
 $q$Two things. The Talent Recruiting Team, working with the Heads of Division, may conclude that a given profile is better suited to another division. It is also considered where a candidate is not selected for their first choice but is strong nonetheless. A final rejection counts as a rejection across all divisions.$q$,
 NULL, NULL),

('application', 50,
 $q$Are the written and interview questions the same for everyone?$q$,
 $q$The written question is identical for every candidate applying to a given division. Interview questions are evaluated based on your academic year and individual profile, and assess both present knowledge and longer-term potential.$q$,
 NULL, NULL),

('application', 60,
 $q$Should I apply as soon as applications open, or closer to the deadline?$q$,
 $q$Applications are reviewed on a rolling basis, so submitting early in the window can work in your favour.$q$,
 NULL, NULL),

('application', 70,
 $q$What form does the interview take?$q$,
 $q$An online meeting of approximately thirty minutes. Candidates invited to interview book their own slot through the scheduling system available in the account from which they track their application.$q$,
 NULL, NULL),

('application', 80,
 $q$What is assessed during the interview?$q$,
 $q$Four areas. Your awareness of capital markets news, treated as a direct indicator of how much time you spend following markets. Your familiarity with current macroeconomic figures and financial data, including inflation, rates, foreign exchange and government yields across the most relevant economies. Your motivation, and specifically why you are applying to Minerva IMS rather than elsewhere. And technical questions, some of which may be drawn from the topic of the written answer you submitted, and always calibrated to the stage of your studies.$q$,
 NULL, NULL),

('application', 90,
 $q$Who decides on my application?$q$,
 $q$Applications are received and decided by the Head of the division you have applied to, supported by that division's team leaders. The fairness of the process is monitored by the Head of Asset Management, and the President and Vice-President may review any admission where the transparency or correctness of the process is in question. If you believe your admission process was unfair, please do not hesitate to contact us through the contacts page; please, do keep in mind that false accusations are against the University's Honour Code.$q$,
 NULL, NULL),

('application', 100,
 $q$On what grounds can an application be rejected?$q$,
 $q$Legitimate grounds include the semester's admission cap for that division having been reached, an incomplete or formally irregular application, and not meeting the membership requirements set out in our statute. A rejection may never rest on discriminatory grounds. Every rejection is communicated to the candidate in writing, with reasons.$q$,
 NULL, NULL),

('application', 110,
 $q$When will I hear back?$q$,
 $q$Hearing back is a right of every applicant. We undertake to respond properly to everyone within a maximum of three weeks from the closure of the application period. In the unfortunate event that nothing reaches you, the error is likely ours: please get in touch through the contacts page.$q$,
 $q$Contact Us$q$, $q$/contacts$q$),

('application', 120,
 $q$May I use artificial intelligence tools in preparing my application?$q$,
 $q$We believe in technological advancement and in the way it extends human capability, so applicants are encouraged to use every tool at their disposal, whether artificial intelligence, the Bocconi library resources or anything else. Be aware, however, that everything submitted in your curriculum vitae and written answer is open to questioning at interview, and that students like us find it fairly easy to spot a model of disproportionate complexity or one that has been invented. If you use artificial intelligence, be ready to explain every word and every concept, from the practical application through to the underlying theory. Do not use or mention material you do not fully understand. Present yourself as the person you are. The most common error by far is to overstate in the written answer and then be unable to explain the theory and the rationale behind a given concept during the interview.$q$,
 NULL, NULL),

('application', 130,
 $q$Are referrals available?$q$,
 $q$No. We no longer accept referrals, as in our experience they added value neither for candidates nor for the Society. The selection process is designed so that strong candidates can demonstrate their value on the merits of the application itself. You remain welcome to connect with members on LinkedIn.$q$,
 NULL, NULL),

('application', 140,
 $q$Can I apply again if I am not selected?$q$,
 $q$Yes, and we encourage it, particularly for first-year undergraduates. Around 30% of members join the society at the start of their second year of a bachelor's degree, most of whom had already applied once in their first year. A second application is an opportunity to show how far you have progressed in the meantime.$q$,
 NULL, NULL),

('preparing', 10,
 $q$How should I prepare for the written question?$q$,
 $q$Read the published research of the division you intend to list as your first choice. The archive is open and will show you the structure, depth and recurring themes expected of work carrying the Society's name.$q$,
 NULL, NULL),

('preparing', 20,
 $q$How should I prepare for the interview?$q$,
 $q$Read the last two reports published by the division you have applied to, and be sure you understand them well enough to explain what was done and why. Follow markets daily: the Financial Times, the Wall Street Journal and Il Sole 24 Ore are all available to you at no cost through Bocconi's subscriptions. If English is not your first language, practise answering questions aloud in English before the interview.$q$,
 NULL, NULL),

('preparing', 30,
 $q$Can I contact current members with questions?$q$,
 $q$Yes. You are welcome to approach members on LinkedIn with specific, thoughtful questions. The best way to get to know us, however, is to attend Associations on Display in mid-September or mid-February, as well as the aperitivo open to applicants.$q$,
 NULL, NULL),

('membership', 10,
 $q$Is this worth the time?$q$,
 $q$Membership asks for thorough and unwavering commitment across the academic year. What it returns is published work carrying your name, coverage you own, and a network of more than 300 former members who made the same trade. Whether that is a good use of your time is your judgement to make.$q$,
 NULL, NULL),

('membership', 20,
 $q$How much time does membership require each week?$q$,
 $q$It depends considerably on the division, on your academic year and on the person you are. As a guide, allow four hours of research and study, one hour of in-person meetings or calls, and one hour of events, whether guest panels, alumni calls or social gatherings, for an average of six hours a week. A strong student may complete the research in an hour a week without artificial intelligence; a student at the beginning of their journey may need six hours even with it. Note that from at least a week before the exam sessions and throughout them, division work and events stop entirely: academic performance remains an absolute priority.$q$,
 NULL, NULL),

('membership', 30,
 $q$What is expected of me as a member?$q$,
 $q$To carry out the work assigned to you by your team, to meet the deadlines set by your Head of Division, and to participate actively in the Society's initiatives across the semester. As an analyst you support your team leader or portfolio manager, produce analysis and written content, and attend your team's working meetings, of which there are at least three in person each semester, alongside at least one in-person division event.$q$,
 NULL, NULL),

('membership', 40,
 $q$What does the first semester look like once I have joined?$q$,
 $q$From day one within your division, you contribute to work reviewed by more experienced peers before publication. Members also attend the Society's flagship semester event with industry professionals, company visits, and internal presentations at which teams present and defend their work.$q$,
 NULL, NULL);