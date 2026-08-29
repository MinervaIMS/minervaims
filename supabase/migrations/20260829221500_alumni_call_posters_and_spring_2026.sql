-- =====================================================================
-- Alumni calls: a poster, a public event, and the five Spring 2026 calls.
-- ---------------------------------------------------------------------
-- Two things happen here.
--
-- 1. `alumni_calls` gains a poster and a link to the public event it is
--    mirrored into. A call with a poster AND a date is published: the
--    `admin-alumni-calls` edge function writes a row in `events` of type
--    `alumni_call` and stores its id in `event_id`. Removing either the
--    poster or the date unpublishes it and deletes that event. Nothing
--    on the public site reads `alumni_calls` directly, so its staff-only
--    row-level security is untouched, and the public Events page, its
--    filters, its poster lightbox and the Alumni page's carousel all keep
--    reading the one table they already read.
--
-- 2. The five alumni calls of Spring 2026 are recorded, each with its
--    poster and its published event. They are inserted idempotently:
--    the script can be run twice without producing ten calls.
-- =====================================================================

ALTER TABLE public.alumni_calls
  ADD COLUMN IF NOT EXISTS poster_url text;

ALTER TABLE public.alumni_calls
  ADD COLUMN IF NOT EXISTS event_id uuid REFERENCES public.events(id) ON DELETE SET NULL;

-- One call per event, so a mirror can never be pointed at twice.
CREATE UNIQUE INDEX IF NOT EXISTS alumni_calls_event_id_key
  ON public.alumni_calls (event_id) WHERE event_id IS NOT NULL;


-- ---------------------------------------------------------------------
-- The five calls of Spring 2026.
--
-- The guest lists, the dates and the times are taken from the posters
-- themselves. Participants are matched to the alumni directory by name
-- where a match exists and recorded by name where it does not: the
-- directory is not a precondition for having held the call.
-- ---------------------------------------------------------------------
DO $$
DECLARE
  v_call   record;
  v_event  uuid;
  v_callid uuid;
  v_part   text;
  v_name   text;
  v_role   text;
  v_alumni uuid;
BEGIN
  FOR v_call IN
    SELECT * FROM (VALUES
      (
        'portfolio'::public.org_division,
        DATE '2026-03-01', TIME '17:00',
        'Alumni Call: Portfolio Management',
        '/media/alumni-calls/2026-03-01-portfolio-management.jpg',
        ARRAY[
          'Lorenzo de Felice|Rates Option Trader at Barclays, former Head of Investment Research',
          'Anna Maruccio|Incoming Option Trader at the DE Shaw Group, former President',
          'Thomas Ferradini|ETFs Portfolio Manager at Goldman Sachs, Fixed Income, former Risk Division',
          'Giuseppe Palermo|Equity Derivatives Trader at Equita, former Head of Portfolio Management'
        ]
      ),
      (
        'quant'::public.org_division,
        DATE '2026-03-08', TIME '17:00',
        'Alumni Call: Quantitative Research',
        '/media/alumni-calls/2026-03-08-quantitative-research.jpg',
        ARRAY[
          'Jacopo Prevedello|Precious Metals Options Trader at Citi, former Head of Asset Management and Vice President',
          'Francesco Casapenta|EGB Trading at Barclays, former Macro Research Analyst',
          'Alessandro Gallo|Incoming Sales and Trading at Goldman Sachs, MSc Quantitative Finance at ETH, former Quant Analyst',
          'Tobia Boselli|Equity Trading at J.P. Morgan, former Head of Portfolio Management'
        ]
      ),
      (
        'equity'::public.org_division,
        DATE '2026-03-22', TIME '15:00',
        'Alumni Call: Equity Research',
        '/media/alumni-calls/2026-03-22-equity-research.jpg',
        ARRAY[
          'Matteo Mozzi|Private Equity Associate at Deutsche Bank',
          'Martina Perrone|Investment Banking Analyst at J.P. Morgan, former Analyst in Portfolio Management',
          'Francesco Nardinocchi|Equity Research Analyst at Goldman Sachs, former Analyst in Equity Research',
          'Davide Giuliano|Equity Research Analyst at Equita'
        ]
      ),
      (
        'macro'::public.org_division,
        DATE '2026-04-12', TIME '16:00',
        'Alumni Call: Macro Research',
        '/media/alumni-calls/2026-04-12-macro-research.jpg',
        ARRAY[
          'Simone Vittorio Percoco|Macro and Capital Markets Intern at Allianz, former Head of Macro Research',
          'Francesco Nardinocchi|Equity Research Analyst at Goldman Sachs',
          'Rachele Negro|Internal Models Inspector, Traded Risks, at the European Central Bank'
        ]
      ),
      (
        'investment'::public.org_division,
        DATE '2026-05-03', TIME '17:00',
        'Alumni Call: Investment Research',
        '/media/alumni-calls/2026-05-03-investment-research.jpg',
        ARRAY[
          'Lucrezia Cimiotti|Former Vice President at J.P. Morgan, Fixed Income Structuring, Founder of Minerva IMS',
          'Francesca Rigante|Vice President at Citi, Hedge Fund Sales, Founder of Minerva IMS',
          'Luigi Tamburini|Euro Government Bonds Trader at Nomura, ex Citi Rates Structuring, Founder of the Investment Research Division and former President'
        ]
      )
    ) AS t(division, call_date, call_time, title, poster, participants)
  LOOP
    -- Already recorded? Then leave it exactly as it is.
    SELECT id INTO v_callid FROM public.alumni_calls
      WHERE planned_date = v_call.call_date AND division = v_call.division
      LIMIT 1;
    IF v_callid IS NOT NULL THEN
      CONTINUE;
    END IF;

    -- The public event. "Our Stories Are Endless" is the series the
    -- posters carry; the description records the time, which the events
    -- table's DATE column cannot hold on its own.
    SELECT id INTO v_event FROM public.events
      WHERE title = v_call.title AND date = v_call.call_date LIMIT 1;

    IF v_event IS NULL THEN
      INSERT INTO public.events (
        title, date, start_at, place, event_type, division, online,
        guest, moderator, description, poster_url,
        show_on_website, registration_enabled, in_archive
      ) VALUES (
        v_call.title,
        v_call.call_date,
        (v_call.call_date + v_call.call_time) AT TIME ZONE 'Europe/Rome',
        'Online',
        'alumni_call',
        v_call.division,
        true,
        ARRAY(
          SELECT split_part(p, '|', 1) || ' - ' || split_part(p, '|', 2)
          FROM unnest(v_call.participants) AS p
        ),
        NULL,
        'Our Stories Are Endless: meet our alumni. An online meeting at '
          || to_char(v_call.call_time, 'HH24:MI')
          || ' with alumni of the association, on academic choices, recruitment and the realities of the roles they hold today.',
        v_call.poster,
        true, false, false
      )
      RETURNING id INTO v_event;
    END IF;

    INSERT INTO public.alumni_calls (
      division, planned_date, status, notes, poster_url, event_id, organiser_name
    ) VALUES (
      v_call.division, v_call.call_date, 'completed',
      'Our Stories Are Endless: meet our alumni. Online meeting at '
        || to_char(v_call.call_time, 'HH24:MI') || '.',
      v_call.poster, v_event, 'Minerva IMS'
    )
    RETURNING id INTO v_callid;

    FOREACH v_part IN ARRAY v_call.participants LOOP
      v_name := split_part(v_part, '|', 1);
      v_role := split_part(v_part, '|', 2);
      -- Match the directory where we can; record the name where we cannot.
      SELECT id INTO v_alumni FROM public.alumni
        WHERE lower(btrim(name || ' ' || surname)) = lower(btrim(v_name))
        LIMIT 1;
      INSERT INTO public.alumni_call_participants (call_id, alumni_id, alumnus_name, former_role)
      VALUES (v_callid, v_alumni, v_name, v_role);
      v_alumni := NULL;
    END LOOP;
  END LOOP;
END $$;
