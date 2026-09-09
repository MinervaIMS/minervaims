INSERT INTO public.application_email_map (trigger_code, template_key, description) VALUES
  ('event:staff_interview_booked',  'staff_interview_booked',  'A candidate books an interview slot: written to the member who opened that slot.'),
  ('event:staff_interview_released','staff_interview_released','A candidate releases an interview slot: written to the member who opened that slot.'),
  ('event:staff_offer_sent',        'staff_offer_sent',        'An offer is sent: written to the heads of that division and the President.'),
  ('event:staff_offer_accepted',    'staff_offer_accepted',    'A candidate accepts an offer: written to the heads of that division and the President.'),
  ('event:staff_offer_declined',    'staff_offer_declined',    'A candidate declines an offer: written to the heads of that division and the President.'),
  ('event:staff_offer_expired',     'staff_offer_expired',     'An offer expires unanswered: written to the heads of that division and the President.')
ON CONFLICT (trigger_code) DO NOTHING;