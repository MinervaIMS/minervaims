CREATE OR REPLACE FUNCTION public.admit_event_waitlist(p_event_id uuid, p_waitlist_id uuid, p_actor uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE w public.event_waitlist%ROWTYPE; r public.event_registrations%ROWTYPE;
BEGIN
  PERFORM 1 FROM public.events WHERE id = p_event_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Event not found'; END IF;
  SELECT * INTO w FROM public.event_waitlist WHERE id = p_waitlist_id AND event_id = p_event_id FOR UPDATE;
  IF NOT FOUND THEN RETURN jsonb_build_object('success', true, 'already_processed', true); END IF;
  SELECT * INTO r FROM public.event_registrations WHERE event_id = p_event_id
    AND (lower(btrim(email)) = lower(btrim(w.email)) OR (w.user_id IS NOT NULL AND user_id = w.user_id)) LIMIT 1;
  IF NOT FOUND THEN
    PERFORM set_config('minerva.waitlist_override', p_event_id::text, true);
    INSERT INTO public.event_registrations
      (event_id, user_id, name, email, is_member, is_external, is_bocconi, programme, academic_year, affiliation, added_by, attended)
    VALUES (p_event_id, w.user_id, w.name, w.email, w.is_member, w.is_external, w.is_bocconi, w.programme, w.academic_year, w.affiliation, p_actor, false)
    RETURNING * INTO r;
    PERFORM set_config('minerva.waitlist_override', '', true);
    PERFORM public.send_event_notice('waitlist_promoted', p_event_id, w.email);
  END IF;
  DELETE FROM public.event_waitlist WHERE id = w.id;
  RETURN jsonb_build_object('success', true, 'name', r.name, 'registration_id', r.id);
END;
$$;
REVOKE ALL ON FUNCTION public.admit_event_waitlist(uuid, uuid, uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.admit_event_waitlist(uuid, uuid, uuid) TO service_role;

CREATE OR REPLACE FUNCTION public.event_registrations_capacity_guard()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_cap integer; v_taken integer;
BEGIN
  IF coalesce(NEW.attended, false) THEN RETURN NEW; END IF;
  IF current_setting('minerva.waitlist_override', true) = NEW.event_id::text THEN RETURN NEW; END IF;
  SELECT capacity INTO v_cap FROM public.events WHERE id = NEW.event_id;
  IF v_cap IS NULL THEN RETURN NEW; END IF;
  PERFORM 1 FROM public.events WHERE id = NEW.event_id FOR UPDATE;
  SELECT count(*) INTO v_taken FROM public.event_registrations WHERE event_id = NEW.event_id;
  IF v_taken >= v_cap THEN RAISE EXCEPTION 'EVENT_FULL' USING HINT = 'The event has no places left.'; END IF;
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.event_registrations_capacity_guard() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.event_registrations_capacity_guard() TO service_role;