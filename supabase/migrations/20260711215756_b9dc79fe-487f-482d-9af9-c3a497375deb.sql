INSERT INTO public.auto_email_templates (key, name, subject, body, connected)
VALUES (
  'interview_booking_confirmation',
  'Interview booking confirmation',
  'Your interview is confirmed | Minerva IMS',
  '<p>Dear {{first_name}},</p><p>Your interview for the <strong>{{division_name}}</strong> division is confirmed. The details are below.</p><table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border:1px solid #E0E0E0;margin:12px 0 20px;"><tr><td style="padding:12px 16px;border-bottom:1px solid #EFEFEF;"><span style="color:#737373;font-size:11px;letter-spacing:.04em;text-transform:uppercase;">Date</span><br /><strong>{{interview_date}}</strong></td></tr><tr><td style="padding:12px 16px;border-bottom:1px solid #EFEFEF;"><span style="color:#737373;font-size:11px;letter-spacing:.04em;text-transform:uppercase;">Time</span><br /><strong>{{interview_time}}</strong></td></tr><tr><td style="padding:12px 16px;border-bottom:1px solid #EFEFEF;"><span style="color:#737373;font-size:11px;letter-spacing:.04em;text-transform:uppercase;">Division · Examiner</span><br /><strong>{{division_name}} · {{examiner_name}}</strong></td></tr><tr><td style="padding:12px 16px;"><span style="color:#737373;font-size:11px;letter-spacing:.04em;text-transform:uppercase;">Meeting link</span><br /><span style="color:#737373;">A member of the association will share the meeting link before the interview.</span></td></tr></table><p>You may cancel your slot up to <strong>90 minutes</strong> before it begins, through the application management system.</p><p style="text-align:center;margin:28px 0;"><a class="btn" href="{{status_url}}">Manage your booking</a></p><p>We look forward to meeting you.</p>',
  true
)
ON CONFLICT (key) DO UPDATE SET
  name = EXCLUDED.name,
  subject = EXCLUDED.subject,
  body = EXCLUDED.body,
  connected = true,
  trigger_description = 'Sent automatically when a candidate successfully books an interview slot from the workspace Interview Calendar.',
  recipient_description = 'The candidate who booked the slot.',
  schedule_description = 'Immediately after successful booking.';