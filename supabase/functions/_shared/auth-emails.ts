// The sign-in emails: one per Supabase auth action (Step 96 layout).
// Tokens: {{first_name}}, {{confirmation_url}}, {{token}}, {{old_email}}, {{new_email}}.
// Sent by auth-email-hook; not stored in auto_email_templates.

import { normalizeEmailSubject } from './email-subjects.ts';
import { normalizeEmailLinks } from './email-links.ts';
import { withResponsiveShell } from './email-responsive.ts';
import { contactLink, emailDocument, nowrap } from './email-layout.ts';
import { emailText } from './email-text.ts';

export const AUTH_SUBJECTS: Record<string, string> = {
  signup: "Confirm your email | Minerva IMS",
  recovery: "Reset your password | Minerva IMS",
  invite: "You have been invited | Minerva IMS",
  magiclink: "Your sign-in link | Minerva IMS",
  email_change: "Confirm your new email | Minerva IMS",
  reauthentication: "Your verification code | Minerva IMS",
};

const OPERATIONS = 'The Operations Team';
const CODE = nowrap('<strong style="font-size:20px;letter-spacing:.12em;">{{token}}</strong>');

export const AUTH_HTML: Record<string, string> = {
  signup: emailDocument({
    subject: AUTH_SUBJECTS.signup,
    preheader: 'Confirm your email address to activate your Minerva account.',
    heading: 'Confirm your email address',
    sections: [
      { p: 'Please confirm your email address to activate your account and open the Minerva Workspace.' },
      { button: ['Confirm my email', '{{confirmation_url}}'] },
      { small: 'If you did not create an account with Minerva IMS, you can safely ignore this email.' },
    ],
    signature: [OPERATIONS],
  }),
  recovery: emailDocument({
    subject: AUTH_SUBJECTS.recovery,
    preheader: 'A request was made to reset your Minerva account password.',
    heading: 'Reset your password',
    sections: [
      { p: 'We received a request to reset the password of your Minerva Workspace account. The link expires shortly, for your security.' },
      { button: ['Choose a new password', '{{confirmation_url}}'] },
      { key: [['Or use this code', CODE]] },
      { small: 'If you did not ask for this, you can safely ignore this email: your password stays as it is.' },
    ],
    signature: [OPERATIONS],
  }),
  invite: emailDocument({
    subject: AUTH_SUBJECTS.invite,
    preheader: 'You have been invited to join the Minerva Workspace.',
    heading: 'You are invited to the Workspace',
    sections: [
      { p: 'You have been invited to join the Minerva IMS Workspace. Accept the invitation to set up your account and sign in.' },
      { button: ['Accept the invitation', '{{confirmation_url}}'] },
      { small: 'If you were not expecting this invitation, you can safely ignore this email.' },
    ],
    signature: [OPERATIONS],
  }),
  magiclink: emailDocument({
    subject: AUTH_SUBJECTS.magiclink,
    preheader: 'Your secure, one-time sign-in link for the Minerva Workspace.',
    heading: 'Your sign-in link',
    sections: [
      { p: 'Use this secure link to sign in to the Minerva Workspace. It works once and expires shortly.' },
      { button: ['Sign in', '{{confirmation_url}}'] },
      { key: [['Or use this code', CODE]] },
      { small: 'If you did not ask for this link, you can safely ignore this email.' },
    ],
    signature: [OPERATIONS],
  }),
  email_change: emailDocument({
    subject: AUTH_SUBJECTS.email_change,
    preheader: 'Confirm the change of email on your Minerva account.',
    heading: 'Confirm your new email address',
    sections: [
      { p: 'We received a request to change the email address of your Minerva Workspace account.' },
      { key: [['Current', '{{old_email}}'], ['New', '{{new_email}}']] },
      { button: ['Confirm the new address', '{{confirmation_url}}'] },
      { small: `If you did not ask for this change, please ignore this email and write to ${contactLink()}.` },
    ],
    signature: [OPERATIONS],
  }),
  reauthentication: emailDocument({
    subject: AUTH_SUBJECTS.reauthentication,
    preheader: 'Your verification code for a sensitive account action.',
    heading: 'Your verification code',
    sections: [
      { p: 'To confirm a sensitive action on your account, please enter this code. It expires shortly.' },
      { key: [['Your code', CODE]] },
      { small: `If you did not ask for it, please write to ${contactLink()}.` },
    ],
    signature: [OPERATIONS],
  }),
};

function escapeHtml(v: unknown): string {
  return String(v ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function substitute(template: string, vars: Record<string, unknown>, rawKeys: Set<string> = new Set()): string {
  return template.replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (_m, key) => {
    if (!(key in vars)) return '';
    return rawKeys.has(key) ? String(vars[key] ?? '') : escapeHtml(vars[key]);
  });
}

export function renderAuthEmail(
  action: string,
  props: { confirmationUrl?: string; token?: string; oldEmail?: string; newEmail?: string; firstName?: string },
): { html: string; text: string; subject: string } | null {
  const html = AUTH_HTML[action];
  const subject = normalizeEmailSubject(AUTH_SUBJECTS[action]);
  if (!html || !subject) return null;
  const substituted = withResponsiveShell(normalizeEmailLinks(substitute(html, {
    first_name: (props.firstName ?? '').trim() || 'User',
    confirmation_url: props.confirmationUrl ?? '',
    token: props.token ?? '',
    old_email: props.oldEmail ?? '',
    new_email: props.newEmail ?? '',
  })));
  // The plain-text part, from the same HTML (email-text.ts).
  const text = emailText(substituted);
  return { html: substituted, text, subject };
}
