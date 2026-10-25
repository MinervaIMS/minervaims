// =====================================================================
// The Society's emails: the single source of every template (Step 96).
// ---------------------------------------------------------------------
// Each email is written here as content (heading, two or three short
// sentences, the key facts, one button, secondary links) and laid out by
// email-layout.ts, so all of them look and read the same: light and dark,
// phone and desktop, with a plain-text part written from the same HTML.
//
// The database sends the STORED copy (auto_email_templates, read by
// enqueue_app_email), so every change here is synchronised there by
// migration: the stored body is withResponsiveShell(normalizeEmailLinks(
// body)), which leaves these documents exactly as written (AGENTS.md).
//
// Keys, triggers and variables are those the senders already use. Four
// groups share one design and one text with a single line that changes
// (the interview booking reminders, the event registration reminders,
// the interview slot notices and the offer notices); each keeps its own
// key, so the senders, the email log and the once-only markers are
// untouched.
// =====================================================================

import { a, contactLink, emailDocument, type EmailDoc, type Section, SITE } from './email-layout.ts';

export interface TransactionalTemplate { key: string; name: string; subject: string; body: string; }

const RECRUITING = 'The Talent Recruiting Team';
const OPERATIONS = 'The Operations Team';
const BOARD = 'The Board of Directors';

const STATUS = `${SITE}/workspace/applications/status`;
const INTERVIEW = `${SITE}/workspace/applications/interview`;
const OFFER = `${SITE}/workspace/applications/offer`;
const OFFERS = `${SITE}/workspace/applications/offers`;
const INTERVIEW_CALENDAR = `${SITE}/workspace/applications/interview-calendar`;
const DASHBOARD = `${SITE}/workspace/dashboard`;
const PROFILE = `${SITE}/workspace/my-profile`;
// My Profile, Commitment: the semester answer and every signature (Step 97B).
const COMMITMENT_PAGE = `${SITE}/workspace/my-profile/commitment`;
// Step 97: the phone call (the candidate's page and the callers').
const CALL = `${SITE}/workspace/applications/phone-call`;
const CALLS = `${SITE}/workspace/applications/phone-calls`;

const t = (key: string, name: string, subject: string, doc: Omit<EmailDoc, 'subject'>): TransactionalTemplate =>
  ({ key, name, subject: `${subject} | Minerva IMS`, body: emailDocument({ ...doc, subject: `${subject} | Minerva IMS` }) });

// ── Shared lines ───────────────────────────────────────────────────────

const PREPARE: Section = { small: `To prepare, read the interview questions and our advice on the ${a(`${SITE}/join`, 'Join page')}. {{division_reading}}` };
const CANCEL_AND_DELAY = 'You can cancel your slot up to 90 minutes before it begins, from the same page; we cannot always guarantee a new one. An interview may start 5 to 10 minutes late if the one before it overruns.';
const ONLINE_INTERVIEW = 'Online. The meeting link comes with your booking.';
const WHEN_WHERE: Section = { key: [['When', '{{event_date}}<br />{{event_time}}'], ['Where', '{{event_location}}']] };
const BE_EARLY: Section = { small: 'Please be there a few minutes early so that we can begin on time.' };

// The company visit rules, as the Privacy Policy (sections 4, 5, 13, 15)
// and Step 93B wrote them. Word for word.
const VISIT_SELECTION = 'Participants are selected solely on their active participation in the Society&rsquo;s activities and their demonstrated interest in the topic of the visit, as the Society&rsquo;s own records show. Your CV does not count towards the selection.';
const VISIT_CVS = 'Only the CVs of the members invited may be shared with the host company, and only if the host asks for them. All CVs are deleted automatically six months after the visit. You can replace your CV from the visit&rsquo;s page while the form is open.';
const VISIT_COMMITMENT: Section[] = [
  { subhead: 'A commitment to the other members' },
  { p: `Places are limited and other members asked to come. Forfeiting your place and not attending is a severe offence towards the other interested members. If you can no longer attend, write to ${contactLink()} as soon as possible, so that your place can go to a member on the reserve list.` },
  { small: 'If the host company asks for them, we will send it the CVs of the members invited, yours included, for this visit only. Please arrive a few minutes early so that we can welcome you and begin on time.' },
];

/** The optional emails only: event reminders and thank-you notes. */
const EVENTS_OPT_OUT = (reason: string): EmailDoc['unsubscribe'] => ({ topic: 'events', reason, label: 'Unsubscribe from these emails' });

// ── Groups that share one design ───────────────────────────────────────

function bookingReminder(key: string, name: string, second: boolean): TransactionalTemplate {
  return t(key, name, second ? 'Second reminder: book your interview slot' : 'Reminder: book your interview slot', {
    preheader: second ? 'Your interview slot is still not booked, and the window closes on {{deadline}}.' : 'Your interview slot is not booked yet. Please choose a time by {{deadline}}.',
    heading: second ? 'Second reminder: book your interview' : 'A reminder to book your interview',
    sections: [
      { p: second
        ? 'Two days have passed since you were invited to interview for the <strong>{{division_name}}</strong> division, and your slot is still not booked.'
        : 'You were invited to interview for the <strong>{{division_name}}</strong> division about a day ago, and your slot is not booked yet.' },
      { key: [['Book by', '{{deadline}}'], ['Where', ONLINE_INTERVIEW]] },
      { p: 'If the deadline passes, we cannot guarantee a second invitation. The members who interview plan their schedules around these slots, so a prompt booking genuinely helps them.' },
      { button: ['Choose your slot', INTERVIEW] },
      { small: `None of the slots fits your commitments? Write to ${contactLink()} explaining your circumstances; only motivated and exceptional cases can be considered.` },
      PREPARE,
      { small: CANCEL_AND_DELAY },
    ],
    signature: [RECRUITING],
  });
}

const REGISTRATION_REMINDER = {
  two: { subject: 'Two weeks to go', line: '<strong>{{event_title}}</strong> takes place in two weeks and registration is open. Your name is not on the list yet, so this is a reminder to save your place.' },
  one: { subject: 'One week to go', line: '<strong>{{event_title}}</strong> takes place next week and registration is still open. If you plan to attend, please register so that we can prepare for the right number of people.' },
  three: { subject: 'Three days to go', line: '<strong>{{event_title}}</strong> takes place in three days and this is the last reminder. If you plan to attend, please register now.' },
};

function registrationReminder(key: string, name: string, when: keyof typeof REGISTRATION_REMINDER): TransactionalTemplate {
  const r = REGISTRATION_REMINDER[when];
  return t(key, name, `${r.subject}: {{event_title}}`, {
    preheader: when === 'three' ? 'Last reminder: registration for {{event_title}} is still open.' : 'Registration for {{event_title}} is open. Save your place.',
    heading: r.subject,
    sections: [
      { p: r.line },
      WHEN_WHERE,
      { raw: '{{description_block}}' },
      { button: ['Register now', '{{register_url}}'] },
      { small: 'It takes a minute: sign in with your Minerva account and your details are filled in for you. If you registered in the last hour, please disregard this message.' },
    ],
    signature: [OPERATIONS],
    unsubscribe: EVENTS_OPT_OUT('You receive these reminders as a member who has not registered yet.'),
  });
}

function slotNotice(key: string, name: string, booked: boolean): TransactionalTemplate {
  return t(key, name, `${booked ? 'Interview slot booked' : 'Interview slot released'}: {{division_name}}`, {
    preheader: `{{candidate_name}} has ${booked ? 'booked' : 'released'} one of your interview slots.`,
    heading: booked ? 'An interview slot has been booked' : 'An interview slot has been released',
    sections: booked
      ? [
        { p: '<strong>{{candidate_name}}</strong>, a candidate for the {{division_name}} division, has booked one of the interview slots you opened. It is no longer offered to other candidates.' },
        { key: [['Candidate', '{{candidate_name}}'], ['Interview', '{{interview_when}}']] },
        { raw: '{{calendar_block}}' },
        { small: `No action is needed unless the arrangements change; you will hear from us if the candidate releases or moves the slot. The whole calendar is in the ${a(INTERVIEW_CALENDAR, 'Interview Calendar')}.` },
      ]
      : [
        { p: '<strong>{{candidate_name}}</strong>, a candidate for the {{division_name}} division, has cancelled their booking of one of the slots you opened. It is open again for the other candidates.' },
        { key: [['Candidate', '{{candidate_name}}'], ['Slot released', '{{interview_when}}']] },
        { button: ['Open the Interview Calendar', INTERVIEW_CALENDAR] },
        { small: 'If the candidate is moving to another time, a second notice with the new booking follows shortly. No action is needed.' },
      ],
    signature: [OPERATIONS],
  });
}

const OFFER_NOTICE = {
  sent: {
    subject: 'Offer sent', preheader: 'An offer to join {{division_name}} has been sent to {{candidate_name}}.', heading: 'An offer has been sent for your division',
    line: 'An offer to join the <strong>{{division_name}}</strong> division has been sent to {{candidate_name}}. The candidate has 72 hours to accept or decline, and you will hear the outcome as soon as it is recorded.',
    key: [['Candidate', '{{candidate_name}}, {{offer_role}}'], ['Reply by', '{{offer_deadline}}']] as Array<[string, string]>,
    after: 'No action is needed from you at this stage.',
  },
  accepted: {
    subject: 'Offer accepted', preheader: '{{candidate_name}} has accepted the offer to join {{division_name}}.', heading: 'An offer has been accepted',
    line: '<strong>{{candidate_name}}</strong> has accepted the offer to join the {{division_name}} division. Their account is now a member account, with the Workspace sections their role allows.',
    key: [['New joiner', '{{candidate_name}}, {{offer_role}}'], ['Division', '{{division_name}}']] as Array<[string, string]>,
    after: 'Please make sure the new joiner is included in the division&rsquo;s onboarding.',
  },
  declined: {
    subject: 'Offer declined', preheader: '{{candidate_name}} has declined the offer to join {{division_name}}.', heading: 'An offer has been declined',
    line: '<strong>{{candidate_name}}</strong> has declined the offer to join the {{division_name}} division. The candidacy is closed and the place remains unfilled; no further email goes to the candidate.',
    key: [['Candidate', '{{candidate_name}}, {{offer_role}}'], ['Division', '{{division_name}}']] as Array<[string, string]>,
    after: 'If the division wishes to offer the place to another candidate, a new offer is prepared in Offers.',
  },
  expired: {
    subject: 'Offer expired', preheader: 'The offer to {{candidate_name}} has expired without an answer.', heading: 'An offer has expired',
    line: 'The offer to join the <strong>{{division_name}}</strong> division made to {{candidate_name}} has expired without an answer. The candidacy has been closed automatically and the place remains unfilled.',
    key: [['Candidate', '{{candidate_name}}, {{offer_role}}'], ['Deadline passed', '{{offer_deadline}}']] as Array<[string, string]>,
    after: 'If the division wishes to offer the place to another candidate, a new offer is prepared in Offers.',
  },
};

function offerNotice(key: string, name: string, kind: keyof typeof OFFER_NOTICE): TransactionalTemplate {
  const o = OFFER_NOTICE[kind];
  return t(key, name, `${o.subject}: {{division_name}}`, {
    preheader: o.preheader,
    heading: o.heading,
    sections: [{ p: o.line }, { key: o.key }, { button: ['Open Offers', OFFERS] }, { small: o.after }],
    signature: [OPERATIONS],
  });
}

// ── The phone call (Step 97) ─────────────────────────────────────────
// What the call is, said the same way in every email and on the page: it
// is about the Society as a whole, not a technical conversation.
const CALL_ABOUT = 'Minerva Investment Management Society as a whole: how it works, what membership involves and what you hope to find in it';
const CALL_NOT_TECHNICAL = 'It is not a technical conversation about markets, and there is nothing to prepare.';
const CALL_FACTS: Section = { key: [['When', '{{call_date}}<br />{{call_time}}'], ['We call you on', '{{candidate_phone}}'], ['From', '{{caller_name}}, {{caller_phone}}']] };

// ── Event emails that confirm a place ──────────────────────────────────

const PLACE_ROWS: Section[] = [
  WHEN_WHERE,
  { raw: '{{join_block}}' },
  { raw: '{{checkin_block}}' },
  { raw: '{{calendar_block}}' },
  { raw: '{{description_block}}' },
  BE_EARLY,
  { raw: '{{cancel_block}}' },
];

// ── Every template ─────────────────────────────────────────────────────

export const TRANSACTIONAL_TEMPLATES: TransactionalTemplate[] = [
  // Recruiting, to candidates
  t('application_received', 'Application received', 'We have received your application', {
    preheader: 'Your application is under review. You will hear from us within 10 days.',
    heading: 'Your application is in',
    sections: [
      { p: 'Thank you for applying to Minerva Investment Management Society. Your application has arrived and is now under review.' },
      { key: [['Division', '{{division_name}}'], ['Next step', 'The outcome of the CV screening, within 10 days at the latest']] },
      { button: ['Follow your application', STATUS] },
      { small: `There is nothing else to do for now. In the meantime, you are welcome to read our ${a(`${SITE}/archive`, 'published research')}.` },
    ],
    signature: [RECRUITING],
  }),

  t('division_reassignment', 'Division reassignment', 'Update on your application', {
    preheader: 'Your application is now with the {{to_division}} division. No action is needed.',
    heading: 'Your application has moved division',
    sections: [
      { p: 'Your application is now being assessed by the <strong>{{to_division}}</strong> division rather than {{from_division}}. Other profiles showed a stronger fit for {{from_division}}, and the committee believes yours may be a better match for {{to_division}}.' },
      { key: [['Now with', '{{to_division}}'], ['Before', '{{from_division}}'], ['Your part', 'Nothing: the new division reviews the application you sent']] },
      { p: 'An application can be assessed by no more than two divisions in each round, so any further move can only be back to {{from_division}}. We hope you will continue the selection with us.' },
      { button: ['Check your application', STATUS] },
    ],
    signature: [RECRUITING],
  }),

  t('rejection_pre_interview', 'Rejection · pre-interview', 'An update on your application', {
    preheader: 'An update on your application to Minerva IMS.',
    heading: 'An update on your application',
    sections: [
      { p: 'Thank you, sincerely, for applying to the <strong>{{division_name}}</strong> division and for the care you put into your application.' },
      { p: 'We received an exceptional number of strong applications, and on this occasion we are not able to take yours forward to the interview stage. This reflects the very limited number of places far more than your ability.' },
      { p: 'We would genuinely welcome a future application, and we hope you will apply again. We wish you every success in what comes next.' },
      { small: `Our ${a(`${SITE}/archive`, 'published research')} and our ${a(`${SITE}/events`, 'public events')} are open to everyone, and a good place to keep building your profile.` },
    ],
    signoff: 'With our thanks and best wishes,',
    signature: [RECRUITING],
  }),

  t('interview_invitation', 'Interview invitation', 'You are invited to interview', {
    preheader: 'Congratulations. Please choose your interview slot within 72 hours.',
    heading: 'You are invited to interview',
    sections: [
      { p: 'Congratulations: your application to the <strong>{{division_name}}</strong> division has passed the CV screening, and we would like to meet you.' },
      { key: [['What', 'Interview, {{division_name}}'], ['Book by', '{{book_by}}<br /><span class="m-muted" style="color:#737373;font-size:14px;">72 hours from this email</span>'], ['Where', ONLINE_INTERVIEW]] },
      { button: ['Choose your slot', INTERVIEW] },
      PREPARE,
      { small: CANCEL_AND_DELAY },
    ],
    signature: [RECRUITING],
  }),

  bookingReminder('interview_booking_reminder_24h', 'Interview booking reminder · 24h', false),
  bookingReminder('interview_booking_reminder_48h', 'Interview booking reminder · 48h', true),

  t('interview_booking_confirmation', 'Interview booking confirmation', 'Your interview is confirmed', {
    preheader: '{{interview_date}}, {{interview_time}}. Your meeting link is inside.',
    heading: 'Your interview is confirmed',
    sections: [
      { p: 'Your interview for the <strong>{{division_name}}</strong> division is booked. We look forward to meeting you.' },
      { key: [['When', '{{interview_date}}<br />{{interview_time}}'], ['Where', `Online: ${a('{{meeting_link}}', 'Join the interview&nbsp;&rarr;')}`], ['Division', '{{division_name}}']] },
      { raw: '{{calendar_block}}' },
      { small: `If the link does not open, copy this address: ${a('{{meeting_link}}', '{{meeting_link}}')}` },
      PREPARE,
      { small: `Need to change it? ${a('{{status_url}}', 'Manage your booking')}: you can cancel up to 90 minutes before it begins, though we cannot always guarantee a new slot. An interview may start 5 to 10 minutes late if the one before it overruns.` },
    ],
    signature: [RECRUITING],
  }),

  t('interview_reminder_30m', 'Interview reminder · 30 minutes', 'Your interview begins in 30 minutes', {
    preheader: 'Your {{division_name}} interview starts soon. The link is inside.',
    heading: 'Your interview begins soon',
    sections: [
      { p: 'Your <strong>{{division_name}}</strong> interview begins in about 30 minutes. We look forward to meeting you.' },
      { key: [['When', '{{interview_date}}<br />{{interview_time}}'], ['Where', 'Online']] },
      { button: ['Join the interview', '{{meeting_link}}'] },
      { small: `If the button does not open, copy this address: ${a('{{meeting_link}}', '{{meeting_link}}')}` },
      { small: 'An interview may start 5 to 10 minutes late if the one before it overruns. Thank you for your patience.' },
    ],
    signature: [RECRUITING],
  }),

  t('rejection_post_interview', 'Rejection · post-interview', 'An update on your application', {
    preheader: 'Thank you for interviewing with Minerva IMS.',
    heading: 'Thank you for interviewing with us',
    sections: [
      { p: 'Thank you for taking the time to interview with us, and for the genuine interest you showed in the <strong>{{division_name}}</strong> division. It was a real pleasure to meet you.' },
      { p: 'After careful and difficult deliberation, we are not able to offer you a place on this occasion. With so many strong candidates and so few places, reaching the interview stage is itself an achievement to be proud of.' },
      { p: `We would warmly welcome a future application, and we are happy to share advice on strengthening your profile. Do stay in touch on ${a('https://it.linkedin.com/company/minerva-investment-management', 'LinkedIn')}, and we hope to see you at our public events.` },
    ],
    signoff: 'With warm regards,',
    signature: [RECRUITING],
  }),

  t('offer_to_join', 'Offer to join', 'Your offer to join Minerva IMS', {
    preheader: 'Congratulations. Please sign your offer within 72 hours.',
    heading: 'Welcome to Minerva IMS',
    sections: [
      { p: 'Congratulations. Following your interview and a highly competitive selection, it is my pleasure, on behalf of the Society, to offer you a place in the <strong>{{division_name}}</strong> division as an analyst.' },
      { p: 'You have been selected because we genuinely believe you have something to teach us. For us, that is the most important criterion of all.' },
      { key: [['Your role', 'Analyst, {{division_name}}'], ['Sign by', '{{acceptance_deadline}}']] },
      { button: ['Sign your offer', OFFER] },
      { small: 'Sign in to the Minerva Workspace, sign your offer and complete your profile. Once we have your confirmation, we will welcome you into the community and give you access to our internal channels.' },
      { p: 'We are very much looking forward to working with you.' },
    ],
    signoff: 'Warm regards,',
    signature: ['{{president_name}}', 'President, Minerva Investment Management Society'],
  }),

  t('acceptance_received', 'Acceptance received', 'Welcome to the Society', {
    preheader: 'We have received your acceptance. One last step: complete your profile.',
    heading: 'Your place is confirmed',
    sections: [
      { p: 'Thank you. We have received your acceptance of a place in the <strong>{{division_name}}</strong> division: welcome to Minerva Investment Management Society.' },
      { p: 'One thing to do next: complete your profile in the Minerva Workspace. We will then be in touch with your onboarding details and access to our internal channels.' },
      { button: ['Complete your profile', PROFILE] },
      { p: 'We are very glad to have you with us.' },
    ],
    signature: [RECRUITING],
  }),

  t('acceptance_reminder', 'Acceptance reminder', 'A gentle reminder: your offer', {
    preheader: 'Your offer to join is still open until {{acceptance_deadline}}.',
    heading: 'A gentle reminder about your offer',
    sections: [
      { p: 'Your offer to join the <strong>{{division_name}}</strong> division is still open, but it expires soon.' },
      { key: [['Sign by', '{{acceptance_deadline}}']] },
      { button: ['Sign your offer', OFFER] },
      { small: `Then complete your profile. If you have a question, or simply need a little more time, write to ${contactLink()}. We would love to have you on board.` },
    ],
    signature: [RECRUITING],
  }),

  t('offer_expired', 'Offer expired', 'Your offer to join has expired', {
    preheader: 'The offer to join the Society has now expired.',
    heading: 'Your offer has expired',
    sections: [
      { p: 'The offer to join the <strong>{{division_name}}</strong> division expired on {{acceptance_deadline}}. As we did not receive your acceptance in time, the place has now been released.' },
      { p: `If this was an oversight, or your circumstances have changed, please write to ${contactLink()} as soon as possible. We cannot promise the place is still available, but we will do our best to help.` },
      { p: 'We would be glad to consider a future application, and you are always welcome at our public events.' },
    ],
    signoff: 'With our thanks and best wishes,',
    signature: [BOARD],
  }),

  t('offer_withdrawn', 'Offer withdrawn', 'An update on your offer', {
    preheader: 'An update on your offer to join Minerva IMS.',
    heading: 'An update on your offer',
    sections: [
      { p: 'Thank you for the time and care you have given to Minerva IMS throughout the selection, and for your interest in the <strong>{{division_name}}</strong> division.' },
      { p: 'We are sorry to tell you that we have had to withdraw the offer to join that we made to you. It can no longer be accepted from the Workspace, and nothing is needed on your part. Being selected for an offer is itself an achievement, and this decision is not a judgement on the qualities that earned it.' },
      { p: `If you have a question about it, please write to ${contactLink()}. We would warmly welcome a future application, and we hope to see you at our public events.` },
    ],
    signoff: 'With warm regards,',
    signature: [BOARD],
  }),

  t('application_withdrawn', 'Application withdrawn', 'Your application has been withdrawn', {
    preheader: 'Your application has been withdrawn at your request. No further action is needed.',
    heading: 'Your application has been withdrawn',
    sections: [
      { p: 'This confirms that you have withdrawn your application to the <strong>{{division_name}}</strong> division. We have recorded your decision and your candidacy is now closed.' },
      { p: 'Only one application per person is accepted in each round, so you cannot apply again for the {{semester_label}} intake; you are very welcome to apply in a future round.' },
      { small: `Did not mean to withdraw? Write to ${contactLink()} as soon as possible.` },
    ],
    signature: [RECRUITING],
  }),

  // Recruiting: the phone call, after the interview (Step 97)
  t('call_invitation', 'Phone call invitation', 'A short phone call with Minerva IMS', {
    preheader: 'Congratulations on your interview. Please choose a time for a short phone call within 72 hours.',
    heading: 'Let us talk on the phone',
    sections: [
      { p: 'Congratulations: your interview went well, and before any decision the President or the Vice President would like a short phone call with you.' },
      { key: [['What', 'A short phone call, about 15 minutes'], ['About', CALL_ABOUT], ['Book by', '{{book_by}}<br /><span class="m-muted" style="color:#737373;font-size:14px;">72 hours from this email</span>']] },
      { p: CALL_NOT_TECHNICAL },
      { button: ['Choose a time', CALL] },
      { small: 'We call you on the phone number in your application. You can move the call once, up to one hour before it starts.' },
    ],
    signature: [RECRUITING],
  }),

  t('call_booking_reminder', 'Phone call booking reminder', 'Reminder: book your phone call', {
    preheader: 'Your phone call is not booked yet. Please choose a time by {{book_by}}.',
    heading: 'A reminder to book your call',
    sections: [
      { p: 'You were invited to a short phone call with the President or the Vice President about a day ago, and your time is not booked yet.' },
      { key: [['Book by', '{{book_by}}'], ['About', 'The Society as a whole, not markets']] },
      { button: ['Choose a time', CALL] },
      { small: `None of the times fits your commitments? Write to ${contactLink()} explaining your circumstances.` },
    ],
    signature: [RECRUITING],
  }),

  t('call_booking_confirmation', 'Phone call booking confirmation', 'Your phone call is confirmed', {
    preheader: '{{call_date}}, {{call_time}}. We will call you on {{candidate_phone}}.',
    heading: 'Your phone call is confirmed',
    sections: [
      { p: `Your phone call with <strong>{{caller_name}}</strong> is booked. It is about ${CALL_ABOUT}. ${CALL_NOT_TECHNICAL}` },
      CALL_FACTS,
      { raw: '{{calendar_block}}' },
      { small: `If the call has not arrived five minutes after the start, call {{caller_phone}}. Need to change it? ${a('{{status_url}}', 'Manage your booking')}: you can move it once, up to one hour before it starts.` },
    ],
    signature: [RECRUITING],
  }),

  t('call_reminder_30m', 'Phone call reminder · 30 minutes', 'Your phone call begins in 30 minutes', {
    preheader: 'We will call you on {{candidate_phone}} in about 30 minutes.',
    heading: 'Your phone call begins soon',
    sections: [
      { p: 'Your phone call with <strong>{{caller_name}}</strong> begins in about 30 minutes. Please keep your phone with you.' },
      CALL_FACTS,
      { small: `If the call has not arrived five minutes after the start, call {{caller_phone}}. ${CALL_NOT_TECHNICAL}` },
    ],
    signature: [RECRUITING],
  }),

  // Recruiting, to the people running it
  slotNotice('staff_interview_booked', 'Head of Division · interview slot booked', true),
  slotNotice('staff_interview_released', 'Head of Division · interview slot released', false),
  offerNotice('staff_offer_sent', 'Head of Division · offer sent', 'sent'),
  offerNotice('staff_offer_accepted', 'Head of Division · offer accepted', 'accepted'),
  offerNotice('staff_offer_declined', 'Head of Division · offer declined', 'declined'),
  offerNotice('staff_offer_expired', 'Head of Division · offer expired', 'expired'),

  t('staff_call_booked', 'President and Vice President · phone call booked', 'Phone call booked: {{candidate_name}}', {
    preheader: '{{candidate_name}} has booked one of your phone call slots.',
    heading: 'A phone call has been booked',
    sections: [
      { p: '<strong>{{candidate_name}}</strong>, a candidate for the {{division_name}} division, has booked one of your phone call slots.' },
      { key: [['Candidate', '{{candidate_name}}'], ['Call them on', '{{candidate_phone}}'], ['When', '{{call_when}}']] },
      { raw: '{{calendar_block}}' },
      { small: `After the call, record the outcome and your notes in ${a(CALLS, 'Recruiting, Phone Calls')}: Pass, Hold or Decline.` },
    ],
    signature: [OPERATIONS],
  }),

  t('staff_call_released', 'President and Vice President · phone call released', 'Phone call released: {{candidate_name}}', {
    preheader: '{{candidate_name}} has released one of your phone call slots.',
    heading: 'A phone call slot is free again',
    sections: [
      { p: '<strong>{{candidate_name}}</strong> has cancelled their phone call to choose another time. The slot is open again for the other candidates.' },
      { key: [['Candidate', '{{candidate_name}}'], ['Slot released', '{{call_when}}']] },
      { button: ['Open Phone Calls', CALLS] },
      { small: 'If the candidate books another time, a second notice with the new booking follows. No action is needed.' },
    ],
    signature: [OPERATIONS],
  }),

  // Membership
  t('ws_complete_profile', 'Workspace · complete your profile', 'Your profile is missing a few details', {
    preheader: 'Your profile is missing a few details: here is what, and how to add them.',
    heading: 'Your profile is missing a few details',
    sections: [
      { p: 'Your profile in the Minerva Workspace is what your colleagues see about you, and your photo appears on the public Members page of minervaims.org. It is still missing:' },
      { raw: '{{missing_block}}' },
      { raw: '{{photo_help_block}}' },
      { button: ['Complete my profile', PROFILE] },
      { small: 'It takes a few minutes, from a computer. This reminder is sent at most twice a semester, at least two weeks apart, and stops as soon as your profile is complete.' },
    ],
    signature: [OPERATIONS],
  }),

  t('ws_fee_collection', 'Workspace · fee collection', 'Membership fee for {{semester_label}}', {
    preheader: '{{fee_amount}}, due by {{fee_deadline}}. Payment details inside.',
    heading: 'Your membership fee for {{semester_label}}',
    sections: [
      { p: 'The membership fee for <strong>{{semester_label}}</strong> is now being collected. It supports the Society&rsquo;s events, materials and running costs throughout the semester.' },
      { key: [['Amount', '<strong>{{fee_amount}}</strong>'], ['Due by', '{{fee_deadline}}'], ['How to pay', '{{payment_method}}']] },
      { button: ['See your fee status', DASHBOARD] },
      { small: 'Once your payment arrives, it is recorded and the Dashboard shows it as paid. A question? Ask the Head of Operations or the Vice President.' },
    ],
    signature: [OPERATIONS],
  }),

  t('ws_membership_reminder', 'Workspace · membership reminder', 'Reminder: membership fee still due', {
    preheader: 'Your membership fee for {{semester_label}} is still outstanding.',
    heading: 'A reminder about your membership fee',
    sections: [
      { p: 'A friendly reminder that your membership fee for <strong>{{semester_label}}</strong> is still outstanding.' },
      { key: [['Amount', '<strong>{{fee_amount}}</strong>'], ['Due by', '{{fee_deadline}}'], ['How to pay', '{{payment_method}}']] },
      { button: ['See your fee status', DASHBOARD] },
      { small: 'Already paid? Thank you: it is recorded once the payment arrives. A question? Ask the Head of Operations or the Vice President.' },
    ],
    signature: [OPERATIONS],
  }),

  // The one-association declaration and the semester commitment (Step 97)
  t('declaration_signed', 'One-association declaration received', 'We have received your one-association declaration', {
    preheader: 'Your acceptance of the one-association policy is recorded.',
    heading: 'Your declaration is received',
    sections: [
      { p: 'Thank you. We have received your acceptance of the one-association policy: you signed the declaration in the Minerva Workspace, and it is recorded with your typed name and the time.' },
      { key: [['Signed by', '{{signer_name}}'], ['On', '{{signed_at}}'], ['Semester', '{{semester_label}}']] },
      { button: ['Read what you signed', COMMITMENT_PAGE] },
      { small: 'There is nothing else to do. If your situation changes while you are a member, tell the President or the Vice President.' },
    ],
    signature: [BOARD],
  }),

  t('commitment_request', 'Semester commitment request', 'Confirm your commitment for {{semester_label}}', {
    preheader: 'A minute in the Workspace: tell us whether you can commit to the Society this semester.',
    heading: 'Your commitment for {{semester_label}}',
    sections: [
      { p: 'A new semester is starting, and with it recruiting. Before the new analysts join, we ask every member to confirm their commitment to the Society for <strong>{{semester_label}}</strong>.' },
      { key: [['What', 'Confirm or decline{{declaration_clause}}, with your typed name'], ['Where', 'My Profile, Commitment, in the Minerva Workspace']] },
      { button: ['Answer now', '{{confirm_url}}'] },
      { small: 'If you cannot commit this semester, say so on the same page: the Board would rather know now. If you have not answered, you will receive one reminder.' },
    ],
    signature: [BOARD],
  }),

  t('commitment_reminder', 'Semester commitment reminder', 'Reminder: your commitment for {{semester_label}}', {
    preheader: 'We have not received your answer for {{semester_label}} yet.',
    heading: 'A reminder about your commitment',
    sections: [
      { p: 'A few days ago we asked every member to confirm their commitment to the Society for <strong>{{semester_label}}</strong>, and we have not received your answer yet.' },
      { key: [['What', 'Confirm or decline{{declaration_clause}}, with your typed name'], ['Where', 'My Profile, Commitment, in the Minerva Workspace']] },
      { button: ['Answer now', '{{confirm_url}}'] },
      { small: 'This is the only reminder.' },
    ],
    signature: [BOARD],
  }),

  t('commitment_recorded', 'Semester commitment recorded', 'Your answer for {{semester_label}} is recorded', {
    preheader: 'Thank you: your answer for {{semester_label}} is recorded.',
    heading: 'Thank you, your answer is recorded',
    sections: [
      { p: 'We have recorded your answer for <strong>{{semester_label}}</strong>: {{decision_label}}.' },
      { key: [['Your answer', '{{decision_label}}'], ['Signed by', '{{signer_name}}'], ['On', '{{signed_at}}']] },
      { button: ['See your answer', COMMITMENT_PAGE] },
      { small: `If anything changes during the semester, write to ${contactLink()}.` },
    ],
    signature: [BOARD],
  }),

  // Events
  t('event_registration_confirmation', 'Event registration confirmation', 'Your place is confirmed: {{event_title}}', {
    preheader: '{{event_date}}, {{event_time}}. Your place is confirmed.',
    heading: 'Your place is confirmed',
    sections: [
      { p: 'Thank you for registering for <strong>{{event_title}}</strong>. Your name is on the attendance list, and we look forward to seeing you.' },
      ...PLACE_ROWS,
    ],
    signature: [OPERATIONS],
  }),

  t('event_waitlist_promoted', 'Event waiting list: a place for you', 'A place has opened up: {{event_title}}', {
    preheader: 'A place at {{event_title}} has opened up, and it is yours.',
    heading: 'A place has opened up',
    sections: [
      { p: 'Good news: a place has opened up at <strong>{{event_title}}</strong>, and it is yours. You have moved from the waiting list to the attendance list, so there is nothing else to do.' },
      ...PLACE_ROWS,
    ],
    signature: [OPERATIONS],
  }),

  t('event_waitlist_joined', 'Event waiting list: joined', 'You are on the waiting list: {{event_title}}', {
    preheader: '{{event_title}} is full. You are number {{waitlist_position}} on the waiting list.',
    heading: 'You are on the waiting list',
    sections: [
      { p: 'Thank you for your interest in <strong>{{event_title}}</strong>. The event is full at the moment, so you are on the waiting list. If a place opens up, it goes to the first person on the list, and we will email you at once with your entry code.' },
      { key: [['Your place', 'Number {{waitlist_position}} on the list'], ['When', '{{event_date}}<br />{{event_time}}'], ['Where', '{{event_location}}']] },
      { raw: '{{description_block}}' },
      { small: 'There is nothing else to do for now: you will hear from us again only if a place becomes available for you.' },
      { raw: '{{cancel_block}}' },
    ],
    signature: [OPERATIONS],
  }),

  t('event_registration_cancelled', 'Event registration cancelled', 'Your registration is cancelled: {{event_title}}', {
    preheader: 'Your registration for {{event_title}} is cancelled.',
    heading: 'Your registration is cancelled',
    sections: [
      { p: 'Your registration for <strong>{{event_title}}</strong> has been cancelled, as you asked. Thank you for letting us know: your place can now go to someone else.' },
      WHEN_WHERE,
      { button: ['Register again', '{{register_url}}'] },
      { small: 'Changed your mind? You can register again while places are available.' },
    ],
    signature: [OPERATIONS],
  }),

  registrationReminder('ws_event_reminder_2w', 'Workspace · event reminder, 2 weeks before', 'two'),
  registrationReminder('ws_event_reminder_1w', 'Workspace · event reminder, 1 week before', 'one'),
  registrationReminder('ws_event_reminder_3d', 'Workspace · event reminder, 3 days before', 'three'),

  t('ws_event_reminder_24h_attending', 'Workspace · event reminder, 24 hours before (registered)', 'See you tomorrow: {{event_title}}', {
    preheader: 'Tomorrow, {{event_time}}: {{event_title}}. Your details are inside.',
    heading: 'See you tomorrow',
    sections: [
      { p: '<strong>{{event_title}}</strong> takes place tomorrow and your name is on the list. We look forward to seeing you.' },
      WHEN_WHERE,
      { raw: '{{join_block}}' },
      { raw: '{{checkin_block}}' },
      { raw: '{{description_block}}' },
      BE_EARLY,
      { raw: '{{cancel_block}}' },
    ],
    signature: [OPERATIONS],
  }),

  t('ws_event_thank_you', 'Workspace · event thank you, the day after (guests who attended)', 'Thank you for joining us', {
    preheader: 'Thank you for attending {{event_title}}.',
    heading: 'Thank you for joining us',
    sections: [
      { p: 'Thank you for attending <strong>{{event_title}}</strong> on {{event_date}}. On behalf of the Board of Directors, thank you for your time and for the interest you showed in our work.' },
      { p: 'Minerva Investment Management Society is a student association at Bocconi University: our members research companies and markets, manage virtual portfolios and publish their analysis, and we open part of what we do to everyone through public events like this one.' },
      { button: ['See our upcoming events', `${SITE}/events`] },
      { small: `Follow our work: our ${a(`${SITE}/archive`, 'published reports')}, ${a('https://it.linkedin.com/company/minerva-investment-management', 'LinkedIn')} and ${a('https://www.instagram.com/minerva.ims/', 'Instagram')}.` },
    ],
    signoff: 'Warm regards,',
    signature: ['{{president_name}}', '{{signature_title}}'],
    unsubscribe: EVENTS_OPT_OUT('You receive this because you attended one of our events.'),
  }),

  // Company visits that select their participants (Step 93B)
  // Interest only: no time and no place, so nobody reads it as a place.
  t('company_visit_interest_received', 'Company visit: interest received', 'Interest received, not yet a place: {{event_title}}', {
    preheader: 'Your interest in {{event_title}} is registered. It is not yet a place: the answer comes by email after the form closes.',
    heading: 'We have received your interest',
    sections: [
      { p: 'Thank you for registering your interest in <strong>{{event_title}}</strong>. Your request and your CV have arrived.' },
      { key: [['Your request', 'Interest registered, <strong>not yet a place</strong>'], ['The answer', 'By email, soon after the interest form closes on {{closes_at}}']] },
      { p: 'Places are limited, so the President and the Vice President select the participants once the form has closed. If you are selected, you will receive your invitation soon after, with the time, the place and your entry code; otherwise we will let you know at the same time.' },
      { subhead: 'How participants are selected' },
      { p: VISIT_SELECTION },
      { p: VISIT_CVS },
      { small: 'There is nothing else to do for now.' },
    ],
    signature: [BOARD],
  }),

  t('company_visit_invited', 'Company visit: invitation', 'You are invited: {{event_title}}', {
    preheader: 'You have a place at {{event_title}}. Your entry code is inside.',
    heading: 'You are invited',
    sections: [
      { p: 'We are pleased to invite you to <strong>{{event_title}}</strong>. You have been selected among the members who asked to take part, and your place is confirmed.' },
      WHEN_WHERE,
      { raw: '{{join_block}}' },
      { raw: '{{checkin_block}}' },
      { raw: '{{calendar_block}}' },
      ...VISIT_COMMITMENT,
    ],
    signature: [BOARD],
  }),

  t('company_visit_not_selected', 'Company visit: not selected this time', 'Your interest in {{event_title}}', {
    preheader: 'Not this time for {{event_title}}: you are on the reserve list.',
    heading: 'Not this time',
    sections: [
      { p: 'Thank you for your interest in <strong>{{event_title}}</strong>. There were more requests than places, and this time you have not been selected.' },
      { p: 'You remain on the reserve list: if a place opens up before the visit, we will write to you at once.' },
      WHEN_WHERE,
      { small: 'The selection looks at participation in the Society&rsquo;s activities through the year and at interest in the topic of the visit. We hope to see you at our next events, and at the next company visit.' },
    ],
    signature: [BOARD],
  }),

  t('company_visit_spot_opened', 'Company visit: a place has opened up', 'A place has opened up: {{event_title}}', {
    preheader: 'A place has opened up at {{event_title}}, and it is yours.',
    heading: 'A place has opened up',
    sections: [
      { p: 'Good news: a place has opened up at <strong>{{event_title}}</strong>, and it is yours. You were on the reserve list, and your place is now confirmed.' },
      WHEN_WHERE,
      { raw: '{{join_block}}' },
      { raw: '{{checkin_block}}' },
      { raw: '{{calendar_block}}' },
      ...VISIT_COMMITMENT,
    ],
    signature: [BOARD],
  }),

  // Forms
  t('internal_form_receipt', 'Form: answers received', 'Answers received: {{form_title}}', {
    preheader: 'Your answers to {{form_title}} have been received.',
    heading: 'Your answers are in',
    sections: [
      { p: 'Thank you for answering <strong>{{form_title}}</strong>. This email is your receipt: it shows what you sent and what happens next.' },
      { raw: '{{summary_block}}' },
      { raw: '{{order_block}}' },
      { raw: '{{payment_block}}' },
      { raw: '{{answers_block}}' },
      { raw: '{{confirmation_block}}' },
      { button: ['View your answers', '{{form_url}}'] },
    ],
    signature: [OPERATIONS],
  }),
];

// Keys whose stored rows are kept but no longer sent or kept in step with
// this file: the legacy set, and since Step 96 the eleven templates that
// nothing sent (their rows were backed up and switched off by migration).
export const LEGACY_KEYS_TO_DISCONNECT = [
  'candidate_status', 'event_registration', 'membership_confirmed', 'fee_reminder', 'newsletter_welcome',
  'newsletter_applications_open', 'newsletter_applications_closing', 'newsletter_public_event', 'general_communication',
  'ws_role_assignment', 'ws_expulsion_alert', 'ws_expulsion', 'ws_deadline_overdue', 'ws_internal_event', 'ws_alumni_call',
  'ws_association_on_display',
];

// Which templates cc as.minerva@unibocconi.it (per email design brief §4).
export const CC_KEYS = new Set([
  'rejection_pre_interview',
  'rejection_post_interview',
  'offer_to_join',
  'offer_expired',
  'offer_withdrawn',
  'ws_fee_collection',
]);
