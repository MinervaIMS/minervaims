// =====================================================================
// The parts of the "answers received" email that change with each form.
// ---------------------------------------------------------------------
// The email itself is `internal_form_receipt` in transactional-emails.ts,
// stored in auto_email_templates and sent by enqueue_app_email. Its
// variables are pasted into the stored HTML as they are, so every piece
// of text a member typed is escaped HERE, before it reaches the email.
// The rows use the same type and spacing as the event emails' tables.
// =====================================================================

import { answerText, isQuestion, visibleIds, type Answers, type FormField } from './internal-forms.ts';

const FONT = "Calibri,'Segoe UI',Helvetica,Arial,sans-serif";

export function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

const para = (html: string) =>
  `<tr><td style="padding:0 40px;"><p style="margin:0 0 18px;font-family:${FONT};font-size:15px;line-height:1.75;color:#141414;">${html}</p></td></tr>`;

/** Every question and its answer, as the table the event emails use. */
export function answersBlock(fields: FormField[], answers: Answers): string {
  // Only the questions this member was shown: a question their own answers
  // hid (show-if) is not theirs to have skipped.
  const shown = visibleIds(fields, answers);
  const rows = fields.filter((f) => isQuestion(f) && shown.has(f.id)).map((f, i) => {
    const text = answerText(f, answers[f.id]);
    const value = text ? escapeHtml(text.length > 600 ? `${text.slice(0, 600)}...` : text).replace(/\n/g, '<br />') : '<span style="color:#737373;">No answer</span>';
    const border = i === 0 ? '' : 'border-top:1px solid #E0E0E0;';
    return `<tr><td style="padding:11px 0;${border}font-family:${FONT};font-size:11px;letter-spacing:.09em;text-transform:uppercase;color:#737373;width:38%;vertical-align:top;">${escapeHtml(f.label)}</td><td style="padding:11px 0 11px 16px;${border}font-family:${FONT};font-size:15px;line-height:1.5;color:#141414;vertical-align:top;">${value}</td></tr>`;
  });
  if (!rows.length) return '';
  return `<tr><td style="padding:4px 40px 6px;"><p style="margin:0;font-family:${FONT};font-size:11px;font-weight:700;letter-spacing:.12em;text-transform:uppercase;color:#1F0F4D;">Your answers</p></td></tr>`
    + `<tr><td style="padding:6px 40px 26px;"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border-top:2px solid #1F0F4D;border-bottom:1px solid #E0E0E0;">${rows.join('')}</table></td></tr>`;
}

/** What to pay and how, when the form collects a payment. */
export function paymentBlock(amount: number | null, instructions: string | null): string {
  if (amount == null && !instructions) return '';
  const what = amount != null ? `<strong>Payment due: EUR ${amount.toFixed(2)}.</strong> ` : '<strong>A payment is due for this form.</strong> ';
  const how = instructions ? escapeHtml(instructions).replace(/\n/g, '<br />') : 'The Operations team will tell you how to pay.';
  return para(`${what}${how} The Operations team marks your answer as paid once the payment reaches the Society.`);
}

/** Whether and until when the answers can still be changed. */
export function editBlock(allowEdits: boolean, deadlineText: string | null): string {
  if (!allowEdits) return para('Your answers are final: this form does not accept changes after submission. If something is wrong, write to the Operations team.');
  return para(deadlineText
    ? `You can change your answers from the form until <strong>${escapeHtml(deadlineText)}</strong>. Each time you do, a new receipt is sent.`
    : 'You can change your answers from the form for as long as it stays open. Each time you do, a new receipt is sent.');
}

/** The organisers' own closing note, if they wrote one. */
export function confirmationBlock(message: string | null): string {
  if (!message || !message.trim()) return '';
  return para(escapeHtml(message.trim()).replace(/\n/g, '<br />'));
}
