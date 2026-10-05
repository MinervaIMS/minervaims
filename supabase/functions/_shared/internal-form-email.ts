// =====================================================================
// The parts of the "answers received" email that change with each form.
// ---------------------------------------------------------------------
// The email itself is `internal_form_receipt` in transactional-emails.ts,
// stored in auto_email_templates and sent by enqueue_app_email. Its
// variables are pasted into the stored HTML as they are, so every piece
// of text a member or an organiser typed is escaped HERE, before it
// reaches the email.
//
// THE RECEIPT READS IN THE ORDER A MEMBER ASKS ITS QUESTIONS:
//   1. did it arrive, and can I still change it?  (the summary box)
//   2. what did I order, and what does it cost?   (the order table)
//   3. how do I pay?                               (the payment box)
//   4. what exactly did I answer?                  (question, then answer)
//   5. anything else the organisers want me to know (their note)
// The answers used to come first, as a table of small grey capitals
// beside each answer, with the amount and the deadline for changes in
// sentences after it: everything was there, and nothing could be found.
//
// `receiptVars` builds every variable at once, for the internal-forms
// function, the email preview and the test send alike.
// =====================================================================

import {
  answerText, eur, hasPrices, isChoice, isOrder, isQuestion, optionPrice, pickedOptions, visibleIds,
  type Answers, type FormField, type OrderLine,
} from './internal-forms.ts';

const FONT = "Calibri,'Segoe UI',Helvetica,Arial,sans-serif";
const SERIF = "'EB Garamond','Times New Roman',Georgia,serif";
const PURPLE = '#1F0F4D';
const INK = '#141414';
const GREY = '#737373';
const LINE = '#E0E0E0';

export function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

const text = (s: string) => escapeHtml(s).replace(/\n/g, '<br />');

/** A small heading in the brand purple, as the event emails use. */
const heading = (label: string) =>
  `<tr><td style="padding:4px 40px 8px;"><p style="margin:0;font-family:${FONT};font-size:11px;font-weight:700;letter-spacing:.12em;text-transform:uppercase;color:${PURPLE};">${label}</p></td></tr>`;

const para = (html: string, extra = '') =>
  `<tr><td style="padding:0 40px;"><p style="margin:0 0 18px;font-family:${FONT};font-size:15px;line-height:1.75;color:${INK};${extra}">${html}</p></td></tr>`;

// ---------------------------------------------------------------------
// 1. The summary
// ---------------------------------------------------------------------

export interface SummaryInput {
  formTitle: string;
  submittedOn: string;
  memberName: string;
  /** What the member owes, or null when the form takes no payment. */
  due: number | null;
  /** A payment is asked for, even without an amount. */
  paymentAsked: boolean;
  allowEdits: boolean;
  /** "Friday 10 October 2026, 11:59 pm CEST", or null with no deadline. */
  deadlineText: string | null;
}

/** Did it arrive, what is owed, and can it still be changed: one box. */
export function summaryBlock(s: SummaryInput): string {
  const row = (label: string, value: string, first = false) =>
    `<tr><td style="padding:9px 0;${first ? '' : `border-top:1px solid #DCD6EC;`}font-family:${FONT};font-size:11px;letter-spacing:.09em;text-transform:uppercase;color:#5B5470;width:34%;vertical-align:top;">${label}</td>`
    + `<td style="padding:9px 0 9px 14px;${first ? '' : `border-top:1px solid #DCD6EC;`}font-family:${FONT};font-size:15px;line-height:1.5;color:${INK};vertical-align:top;">${value}</td></tr>`;
  const rows = [
    row('Form', `<strong>${escapeHtml(s.formTitle)}</strong>`, true),
    row('Received', `${escapeHtml(s.submittedOn)}<br /><span style="color:${GREY};font-size:13px;">from ${escapeHtml(s.memberName)}</span>`),
  ];
  if (s.due !== null) {
    rows.push(row('To pay', s.due > 0
      ? `<strong style="color:${PURPLE};">${eur(s.due)}</strong><br /><span style="color:${GREY};font-size:13px;">How to pay is explained below.</span>`
      : 'Nothing to pay'));
  } else if (s.paymentAsked) {
    rows.push(row('To pay', 'A payment is due: see below.'));
  }
  rows.push(row('Changes', !s.allowEdits
    ? 'Not possible: your answers are final.'
    : s.deadlineText
      ? `Possible until <strong>${escapeHtml(s.deadlineText)}</strong>, from the form.`
      : 'Possible from the form, for as long as it stays open.'));
  return `<tr><td style="padding:4px 40px 28px;"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#F3F1F9;border-left:4px solid ${PURPLE};"><tr><td style="padding:16px 22px 14px;">`
    + `<p style="margin:0 0 6px;font-family:${FONT};font-size:11px;font-weight:700;letter-spacing:.12em;text-transform:uppercase;color:${PURPLE};">&#10003;&nbsp; Received</p>`
    + `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">${rows.join('')}</table>`
    + '</td></tr></table></td></tr>';
}

// ---------------------------------------------------------------------
// 2. The order
// ---------------------------------------------------------------------

interface OrderRow { item: string; detail: string | null; qty: number | null; amount: number | null }

/** Every line of what was ordered, with the extras that cost something. */
function orderRows(fields: FormField[], answers: Answers, shown: Set<string>, priced: boolean): { groups: { label: string | null; rows: OrderRow[] }[]; count: number; listed: string[] } {
  const listed: string[] = [];
  const groups: { label: string | null; rows: OrderRow[] }[] = [];
  const orders = fields.filter((f) => isOrder(f) && shown.has(f.id));
  const extras: OrderRow[] = [];
  for (const f of orders) {
    const lines = (Array.isArray(answers[f.id]) ? answers[f.id] : []) as OrderLine[];
    const rows = lines.filter((l) => l && l.qty > 0).map((l) => {
      const price = optionPrice(f, l.option);
      return { item: l.option, detail: l.size ? `Size ${l.size}` : null, qty: l.qty, amount: priced && price !== null ? price * l.qty : null };
    });
    if (rows.length) { groups.push({ label: orders.length > 1 ? f.label : null, rows }); listed.push(f.id); }
  }
  if (priced) {
    for (const f of fields) {
      if (!shown.has(f.id) || !isChoice(f.type) || isOrder(f) || !f.optionPrices) continue;
      for (const o of pickedOptions(f, answers[f.id])) {
        const price = optionPrice(f, o);
        if (price) { extras.push({ item: f.label, detail: o, qty: null, amount: price }); if (!listed.includes(f.id)) listed.push(f.id); }
      }
    }
  }
  if (extras.length) groups.push({ label: groups.length ? 'Extras' : null, rows: extras });
  return { groups, count: groups.reduce((a, g) => a + g.rows.length, 0), listed };
}

/** The questions the order table shows, so the answers do not repeat them. */
export function orderedIds(fields: FormField[], answers: Answers, due: number | null): string[] {
  return orderRows(fields, answers, visibleIds(fields, answers), due !== null && hasPrices(fields)).listed;
}

/**
 * What the member ordered, as a table with the total underneath. Empty
 * when the form has no order question and no priced choice.
 */
export function orderBlock(fields: FormField[], answers: Answers, due: number | null, fixed: number | null): string {
  const shown = visibleIds(fields, answers);
  const priced = due !== null && hasPrices(fields);
  const { groups, count } = orderRows(fields, answers, shown, priced);
  if (!count) return '';
  const cell = `font-family:${FONT};font-size:15px;line-height:1.45;color:${INK};vertical-align:top;`;
  const head = (label: string, align: string, width: string) =>
    `<td style="padding:0 0 8px;font-family:${FONT};font-size:11px;letter-spacing:.09em;text-transform:uppercase;color:${GREY};text-align:${align};${width}">${label}</td>`;
  const rows: string[] = [
    `<tr>${head('Item', 'left', '')}${head('Qty', 'right', 'width:52px;')}${priced ? head('Amount', 'right', 'width:110px;') : ''}</tr>`,
  ];
  for (const g of groups) {
    if (g.label) {
      rows.push(`<tr><td colspan="${priced ? 3 : 2}" style="padding:12px 0 4px;border-top:1px solid ${LINE};font-family:${FONT};font-size:13px;font-weight:600;color:#4D4D4D;">${escapeHtml(g.label)}</td></tr>`);
    }
    g.rows.forEach((r, i) => {
      const top = !g.label || i > 0 ? `border-top:1px solid ${LINE};` : '';
      rows.push('<tr>'
        + `<td style="padding:10px 0;${top}${cell}"><strong>${escapeHtml(r.item)}</strong>${r.detail ? `<br /><span style="color:${GREY};font-size:13px;">${escapeHtml(r.detail)}</span>` : ''}</td>`
        + `<td style="padding:10px 0;${top}${cell}text-align:right;white-space:nowrap;">${r.qty === null ? '' : `&times;&nbsp;${r.qty}`}</td>`
        + (priced ? `<td style="padding:10px 0;${top}${cell}text-align:right;white-space:nowrap;">${r.amount === null ? '' : eur(r.amount)}</td>` : '')
        + '</tr>');
    });
  }
  if (priced && fixed) {
    rows.push(`<tr><td style="padding:10px 0;border-top:1px solid ${LINE};${cell}">Fixed amount<br /><span style="color:${GREY};font-size:13px;">Set by the organisers for everyone</span></td><td style="border-top:1px solid ${LINE};"></td><td style="padding:10px 0;border-top:1px solid ${LINE};${cell}text-align:right;white-space:nowrap;">${eur(fixed)}</td></tr>`);
  }
  if (priced && due !== null) {
    rows.push(`<tr><td colspan="2" style="padding:12px 0 2px;border-top:2px solid ${PURPLE};font-family:${FONT};font-size:15px;font-weight:700;color:${INK};">Total to pay</td><td style="padding:12px 0 2px;border-top:2px solid ${PURPLE};font-family:${FONT};font-size:17px;font-weight:700;color:${PURPLE};text-align:right;white-space:nowrap;">${eur(due)}</td></tr>`);
  }
  return heading('Your order')
    + `<tr><td style="padding:4px 40px 28px;"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">${rows.join('')}</table></td></tr>`;
}

// ---------------------------------------------------------------------
// 3. The payment
// ---------------------------------------------------------------------

/** What to pay and how, when the form collects a payment. */
export function paymentBlock(amount: number | null, instructions: string | null): string {
  if (amount === 0) return '';
  if (amount === null && !instructions) return '';
  const how = instructions && instructions.trim()
    ? text(instructions.trim())
    : 'The Operations team will tell you how to pay.';
  return heading('How to pay')
    + `<tr><td style="padding:4px 40px 28px;"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border:1px solid ${LINE};"><tr><td style="padding:18px 22px 18px;">`
    + (amount !== null
      ? `<p style="margin:0 0 10px;font-family:${SERIF};font-size:26px;line-height:1.2;color:${PURPLE};">${eur(amount)}</p>`
      : `<p style="margin:0 0 10px;font-family:${FONT};font-size:15px;font-weight:700;color:${PURPLE};">A payment is due for this form.</p>`)
    + `<p style="margin:0 0 12px;font-family:${FONT};font-size:15px;line-height:1.65;color:${INK};">${how}</p>`
    + `<p style="margin:0;font-family:${FONT};font-size:13px;line-height:1.6;color:${GREY};">The Operations team marks your answer as paid once the payment reaches the Society. The form page shows whether it has been received.</p>`
    + '</td></tr></table></td></tr>';
}

// ---------------------------------------------------------------------
// 4. The answers
// ---------------------------------------------------------------------

/**
 * Every question and its answer, the question above the answer so a long
 * question reads as a sentence. Questions shown in the order table are
 * not repeated; a question the member's own answers hid (show-if) is
 * left out, as it was never theirs to answer.
 */
export function answersBlock(fields: FormField[], answers: Answers, skip: Set<string> = new Set()): string {
  const shown = visibleIds(fields, answers);
  const list = fields.filter((f) => isQuestion(f) && shown.has(f.id) && !skip.has(f.id));
  const rows = list.map((f, i) => {
    const v = answers[f.id];
    const raw = f.type === 'consent' ? (v === true ? 'Agreed' : '') : answerText(f, v);
    const value = raw
      ? text(raw.length > 600 ? `${raw.slice(0, 600)}...` : raw)
      : `<span style="color:${GREY};">Not answered</span>`;
    const top = i === 0 ? '' : `border-top:1px solid ${LINE};`;
    return `<tr><td style="padding:12px 0;${top}">`
      + `<p style="margin:0 0 4px;font-family:${FONT};font-size:13px;line-height:1.5;font-weight:600;color:#4D4D4D;">${escapeHtml(f.label)}</p>`
      + `<p style="margin:0;font-family:${FONT};font-size:15px;line-height:1.55;color:${INK};">${value}</p>`
      + '</td></tr>';
  });
  if (!rows.length) return '';
  return heading(skip.size ? 'Your other answers' : 'Your answers')
    + `<tr><td style="padding:4px 40px 28px;"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border-top:2px solid ${PURPLE};border-bottom:1px solid ${LINE};">${rows.join('')}</table></td></tr>`;
}

// ---------------------------------------------------------------------
// 5. The organisers' note
// ---------------------------------------------------------------------

/** The organisers' own closing note, if they wrote one. */
export function confirmationBlock(message: string | null): string {
  if (!message || !message.trim()) return '';
  return heading('A note from the organisers') + para(text(message.trim()));
}

/** Kept for older callers: whether and until when answers can be changed. */
export function editBlock(allowEdits: boolean, deadlineText: string | null): string {
  if (!allowEdits) return para('Your answers are final: this form does not accept changes after submission. If something is wrong, write to the Operations team.');
  return para(deadlineText
    ? `You can change your answers from the form until <strong>${escapeHtml(deadlineText)}</strong>. Each time you do, a new receipt is sent.`
    : 'You can change your answers from the form for as long as it stays open. Each time you do, a new receipt is sent.');
}

// ---------------------------------------------------------------------
// Everything at once
// ---------------------------------------------------------------------

export interface ReceiptInput {
  formTitle: string;
  formUrl: string;
  fields: FormField[];
  answers: Answers;
  firstName: string;
  memberName: string;
  submittedOn: string;
  trackPayments: boolean;
  fixedAmount: number | null;
  /** amountDue(...) for these answers. */
  due: number | null;
  paymentInstructions: string | null;
  allowEdits: boolean;
  deadlineText: string | null;
  confirmationMessage: string | null;
}

/** Every variable of `internal_form_receipt`, escaped and ready. */
export function receiptVars(r: ReceiptInput): Record<string, string> {
  const due = r.trackPayments ? r.due : null;
  const order = orderBlock(r.fields, r.answers, due, r.fixedAmount);
  // What the order table shows is not listed twice.
  const skip = new Set(order ? orderedIds(r.fields, r.answers, due) : []);
  return {
    first_name: escapeHtml(r.firstName),
    member_name: escapeHtml(r.memberName),
    form_title: escapeHtml(r.formTitle),
    submitted_on: escapeHtml(r.submittedOn),
    form_url: r.formUrl,
    summary_block: summaryBlock({
      formTitle: r.formTitle, submittedOn: r.submittedOn, memberName: r.memberName,
      due: r.trackPayments ? r.due : null, paymentAsked: r.trackPayments && (r.due === null ? !!r.paymentInstructions : r.due > 0),
      allowEdits: r.allowEdits, deadlineText: r.deadlineText,
    }),
    order_block: order,
    payment_block: r.trackPayments ? paymentBlock(r.due, r.paymentInstructions) : '',
    answers_block: answersBlock(r.fields, r.answers, skip),
    confirmation_block: confirmationBlock(r.confirmationMessage),
    // Not in the current template (the summary says it); kept so a copy of
    // the previous template, if one is still stored, reads complete.
    edit_block: editBlock(r.allowEdits, r.deadlineText),
  };
}

// ---------------------------------------------------------------------
// A test receipt
// ---------------------------------------------------------------------

/**
 * Plausible answers to a form, for the test receipt an organiser sends
 * themselves: the first choice of each question, one of the first option
 * in the first size, and a short sample for the rest.
 */
export function sampleAnswers(fields: FormField[], email: string): Answers {
  const out: Answers = {};
  const today = new Date().toISOString().slice(0, 10);
  for (const f of fields) {
    if (!isQuestion(f)) continue;
    const first = (f.options ?? []).find((o) => o.trim()) ?? 'Option 1';
    if (isOrder(f)) {
      const picks = f.type === 'multi_choice' ? (f.options ?? []).filter((o) => o.trim()).slice(0, 2) : [first];
      out[f.id] = picks.map((option) => ({ option, ...(f.sizes?.length ? { size: f.sizes[0] } : {}), qty: 1 }));
      continue;
    }
    switch (f.type) {
      case 'single_choice': case 'dropdown': out[f.id] = first; break;
      case 'multi_choice': out[f.id] = [first]; break;
      case 'consent': out[f.id] = true; break;
      case 'number': out[f.id] = f.min ?? 1; break;
      case 'scale': out[f.id] = f.scaleMax ?? 5; break;
      case 'date': out[f.id] = today; break;
      case 'email': out[f.id] = email; break;
      case 'phone': out[f.id] = '+39 333 123 4567'; break;
      case 'file': out[f.id] = [{ path: '', name: 'sample-file.pdf', size: 0, type: 'application/pdf' }]; break;
      case 'long_text': out[f.id] = 'A sample answer, written for this test.\nIt can run over several lines.'; break;
      default: out[f.id] = 'Sample answer';
    }
  }
  return out;
}
