DO $$
DECLARE
  uid uuid := 'd29222b8-26f2-490c-9f6e-9a42145f749c';
BEGIN
  UPDATE public.ads_spending           SET created_by = NULL       WHERE created_by = uid;
  UPDATE public.alumni_calls           SET created_by = NULL       WHERE created_by = uid;
  UPDATE public.aod_days               SET created_by = NULL       WHERE created_by = uid;
  DELETE FROM public.aod_signups                                    WHERE user_id = uid;
  UPDATE public.application_notes      SET author_id = NULL        WHERE author_id = uid;
  UPDATE public.application_questions  SET updated_by = NULL       WHERE updated_by = uid;
  UPDATE public.application_settings   SET updated_by = NULL       WHERE updated_by = uid;
  DELETE FROM public.applications                                   WHERE user_id = uid;
  UPDATE public.applications           SET cv_viewed_by = NULL     WHERE cv_viewed_by = uid;
  UPDATE public.archive_files          SET created_by = NULL       WHERE created_by = uid;
  UPDATE public.auto_email_templates   SET updated_by = NULL       WHERE updated_by = uid;
  UPDATE public.calendar_entries       SET created_by = NULL       WHERE created_by = uid;
  UPDATE public.editorial_items        SET created_by = NULL       WHERE created_by = uid;
  UPDATE public.event_registrations    SET added_by = NULL         WHERE added_by = uid;
  DELETE FROM public.event_registrations                            WHERE user_id = uid;
  UPDATE public.events                 SET created_by = NULL       WHERE created_by = uid;
  UPDATE public.exam_sessions          SET created_by = NULL       WHERE created_by = uid;
  UPDATE public.fee_periods            SET created_by = NULL       WHERE created_by = uid;
  UPDATE public.fund_performance_years SET updated_by = NULL       WHERE updated_by = uid;
  UPDATE public.fund_performances      SET created_by = NULL       WHERE created_by = uid;
  DELETE FROM public.interview_bookings                             WHERE candidate_user_id = uid;
  UPDATE public.interview_slots        SET created_by = NULL       WHERE created_by = uid;
  UPDATE public.interview_slots        SET examiner_id = NULL      WHERE examiner_id = uid;
  UPDATE public.membership_fees        SET collected_by = NULL     WHERE collected_by = uid;
  UPDATE public.page_visibility        SET updated_by = NULL       WHERE updated_by = uid;
  UPDATE public.report_deadlines       SET created_by = NULL       WHERE created_by = uid;
  UPDATE public.testimonials           SET created_by = NULL       WHERE created_by = uid;
  UPDATE public.treasury_entries       SET created_by = NULL       WHERE created_by = uid;
  UPDATE public.user_roles             SET assigned_by = NULL      WHERE assigned_by = uid;
  UPDATE public.workspace_resources    SET author_id = NULL        WHERE author_id = uid;

  DELETE FROM public.user_roles WHERE user_id = uid;
  DELETE FROM public.profiles   WHERE id = uid;
  DELETE FROM auth.users        WHERE id = uid;

  UPDATE public.members
     SET user_id = NULL, account_status = 'to_redeem'
   WHERE id = 'd836fe67-e76d-43c6-b14d-c15def0bbb2c';
END $$;