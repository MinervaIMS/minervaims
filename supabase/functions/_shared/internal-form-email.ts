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

import { box, keyRow, keyWrap, para as layoutPara, SANS, subhead, T } from './email-layout.ts';
import {
  allItems, answerText, eur, hasPrices, isChoice, isOrder, isQuestion, itemsTotal, MORE_KEY, optionPrice, pickedOptions, repeats, visibleIds,
  type Answers, type FormField, type OrderLine,
} from './internal-forms.ts';

/** "Hoodie", or "Item" when the organisers named nothing. */
export const itemName = (label: string | null | undefined) => (label && label.trim() ? label.trim() : 'Item');

// The Step 96 layout (email-layout.ts): its tokens, and the classes that
// carry the dark mode, on every cell that has a colour.
const FONT = SANS;
const PURPLE = T.navy;
const INK = T.ink;
const GREY = T.muted;
const LINE = T.line;

export function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

const text = (s: string) => escapeHtml(s).replace(/\n/g, '<br />');

/** A short heading above each part of the receipt. */
const heading = (label: string) => subhead(label);

const para = (html: string) => layoutPara(html);

/** A grey second line under a value. */
const note = (html: string) => `<br /><span class="m-muted" style="color:${GREY};font-size:14px;">${html}</span>`;

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

/** Did it arrive, what is owed, and can it still be changed: the key block. */
export function summaryBlock(s: SummaryInput): string {
  const rows = [
    keyRow('Form', `<strong>${escapeHtml(s.formTitle)}</strong>`),
    keyRow('Received', `${escapeHtml(s.submittedOn)}${note(`from ${escapeHtml(s.memberName)}`)}`),
  ];
  if (s.due !== null) {
    rows.push(keyRow('To pay', s.due > 0
      ? `<strong>${eur(s.due)}</strong>${note('How to pay is explained below.')}`
      : 'Nothing to pay'));
  } else if (s.paymentAsked) {
    rows.push(keyRow('To pay', 'A payment is due: see below.'));
  }
  rows.push(keyRow('Changes', !s.allowEdits
    ? 'Not possible: your answers are final.'
    : s.deadlineText
      ? `Possible until <strong>${escapeHtml(s.deadlineText)}</strong>, from the form.`
      : 'Possible from the form, for as long as it stays open.'));
  return keyWrap(rows.join(''));
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
  // Several items: the order table lists every item with its own answers.
  if (allItems(fields, answers).length > 1) return fields.filter(repeats).map((f) => f.id);
  return orderRows(fields, answers, visibleIds(fields, answers), due !== null && hasPrices(fields)).listed;
}

/**
 * Several items ("Want another one?"): one line per item, its own answers
 * underneath, and what it costs (the fixed amount, if any, plus its own
 * priced choices); anything priced that is asked once is an extra.
 */
function itemsOrderBlock(fields: FormField[], answers: Answers, due: number | null, fixed: number | null, label: string): string {
  const items = allItems(fields, answers);
  const rep = fields.filter(repeats);
  const once = fields.filter((f) => isQuestion(f) && !repeats(f));
  const money = due !== null;
  const cell = `font-family:${FONT};font-size:16px;line-height:1.45;color:${INK};vertical-align:top;`;
  const head = (h: string, align: string, width: string) =>
    `<td class="m-muted" style="padding:0 0 8px;font-family:${FONT};font-size:14px;color:${GREY};text-align:${align};${width}">${h}</td>`;
  const rows: string[] = [`<tr>${head(label, 'left', '')}${money ? head('Amount', 'right', 'width:110px;') : ''}</tr>`];
  items.forEach((it, i) => {
    const shown = visibleIds(fields, it);
    const detail = rep.filter((f) => shown.has(f.id))
      .map((f) => {
        const v = f.type === 'consent' ? (it[f.id] === true ? 'Agreed' : '') : answerText(f, it[f.id]);
        return v ? `${f.label}: ${v.length > 160 ? `${v.slice(0, 160)}...` : v}` : '';
      })
      .filter(Boolean).join(' · ');
    const amount = (Number(fixed) || 0) + itemsTotal(rep, it);
    rows.push('<tr>'
      + `<td class="m-ink m-line" style="padding:10px 0;border-top:1px solid ${LINE};${cell}"><strong>${escapeHtml(`${label} ${i + 1}`)}</strong>${detail ? `<br /><span class="m-muted" style="color:${GREY};font-size:14px;">${text(detail)}</span>` : ''}</td>`
      + (money ? `<td class="m-ink m-line" style="padding:10px 0;border-top:1px solid ${LINE};${cell}text-align:right;white-space:nowrap;">${eur(amount)}</td>` : '')
      + '</tr>');
  });
  const extras = money ? itemsTotal(once, items[0]) : 0;
  if (extras) {
    rows.push(`<tr><td class="m-ink m-line" style="padding:10px 0;border-top:1px solid ${LINE};${cell}">Extras<br /><span class="m-muted" style="color:${GREY};font-size:14px;">Chosen once for the whole order</span></td><td class="m-ink m-line" style="padding:10px 0;border-top:1px solid ${LINE};${cell}text-align:right;white-space:nowrap;">${eur(extras)}</td></tr>`);
  }
  if (money) {
    rows.push(`<tr><td class="m-ink m-rule" style="padding:12px 0 2px;border-top:2px solid ${PURPLE};font-family:${FONT};font-size:15px;font-weight:700;color:${INK};">Total to pay${fixed ? `<br /><span class="m-muted" style="font-weight:400;color:${GREY};font-size:14px;">${escapeHtml(`${eur(Number(fixed))} for each of ${items.length}`)}${hasPrices(fields) ? ', plus what each one adds' : ''}</span>` : ''}</td><td class="m-ink m-rule" style="padding:12px 0 2px;border-top:2px solid ${PURPLE};font-family:${FONT};font-size:17px;font-weight:700;color:${INK};text-align:right;white-space:nowrap;vertical-align:top;">${eur(due!)}</td></tr>`);
  }
  return heading(`Your order (${items.length})`)
    + `<tr><td class="m-pad" style="padding:4px 40px 22px;"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">${rows.join('')}</table></td></tr>`;
}

/**
 * What the member ordered, as a table with the total underneath. Empty
 * when the form has no order question and no priced choice.
 */
export function orderBlock(fields: FormField[], answers: Answers, due: number | null, fixed: number | null, itemLabel?: string | null): string {
  if (allItems(fields, answers).length > 1) return itemsOrderBlock(fields, answers, due, fixed, itemName(itemLabel));
  const shown = visibleIds(fields, answers);
  const priced = due !== null && hasPrices(fields);
  const { groups, count } = orderRows(fields, answers, shown, priced);
  if (!count) return '';
  const cell = `font-family:${FONT};font-size:16px;line-height:1.45;color:${INK};vertical-align:top;`;
  const head = (label: string, align: string, width: string) =>
    `<td class="m-muted" style="padding:0 0 8px;font-family:${FONT};font-size:14px;color:${GREY};text-align:${align};${width}">${label}</td>`;
  const rows: string[] = [
    `<tr>${head('Item', 'left', '')}${head('Qty', 'right', 'width:52px;')}${priced ? head('Amount', 'right', 'width:110px;') : ''}</tr>`,
  ];
  for (const g of groups) {
    if (g.label) {
      rows.push(`<tr><td colspan="${priced ? 3 : 2}" class="m-muted m-line" style="padding:12px 0 4px;border-top:1px solid ${LINE};font-family:${FONT};font-size:14px;font-weight:700;color:${GREY};">${escapeHtml(g.label)}</td></tr>`);
    }
    g.rows.forEach((r, i) => {
      const top = !g.label || i > 0 ? `border-top:1px solid ${LINE};` : '';
      rows.push('<tr>'
        + `<td class="m-ink m-line" style="padding:10px 0;${top}${cell}"><strong>${escapeHtml(r.item)}</strong>${r.detail ? `<br /><span class="m-muted" style="color:${GREY};font-size:14px;">${escapeHtml(r.detail)}</span>` : ''}</td>`
        + `<td class="m-ink m-line" style="padding:10px 0;${top}${cell}text-align:right;white-space:nowrap;">${r.qty === null ? '' : `&times;&nbsp;${r.qty}`}</td>`
        + (priced ? `<td class="m-ink m-line" style="padding:10px 0;${top}${cell}text-align:right;white-space:nowrap;">${r.amount === null ? '' : eur(r.amount)}</td>` : '')
        + '</tr>');
    });
  }
  if (priced && fixed) {
    rows.push(`<tr><td class="m-ink m-line" style="padding:10px 0;border-top:1px solid ${LINE};${cell}">Fixed amount<br /><span class="m-muted" style="color:${GREY};font-size:14px;">Set by the organisers for everyone</span></td><td class="m-line" style="border-top:1px solid ${LINE};"></td><td class="m-ink m-line" style="padding:10px 0;border-top:1px solid ${LINE};${cell}text-align:right;white-space:nowrap;">${eur(fixed)}</td></tr>`);
  }
  if (priced && due !== null) {
    rows.push(`<tr><td colspan="2" class="m-ink m-rule" style="padding:12px 0 2px;border-top:2px solid ${PURPLE};font-family:${FONT};font-size:15px;font-weight:700;color:${INK};">Total to pay</td><td class="m-ink m-rule" style="padding:12px 0 2px;border-top:2px solid ${PURPLE};font-family:${FONT};font-size:17px;font-weight:700;color:${INK};text-align:right;white-space:nowrap;">${eur(due)}</td></tr>`);
  }
  return heading('Your order')
    + `<tr><td class="m-pad" style="padding:4px 40px 22px;"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">${rows.join('')}</table></td></tr>`;
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
    + box(
      (amount !== null
        ? `<p class="m-ink" style="margin:0 0 6px;font-family:${FONT};font-size:22px;font-weight:700;line-height:1.2;color:${INK};">${eur(amount)}</p>`
        : `<p class="m-ink" style="margin:0 0 6px;font-family:${FONT};font-size:16px;font-weight:700;color:${INK};">A payment is due for this form.</p>`)
      + `<p class="m-ink" style="margin:0 0 10px;font-family:${FONT};font-size:16px;line-height:1.6;color:${INK};">${how}</p>`
      + `<p class="m-muted" style="margin:0;font-family:${FONT};font-size:14px;line-height:1.6;color:${GREY};">The Operations team marks your answer as paid once the payment reaches the Society. The form page shows whether it has been received.</p>`);
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
      : `<span class="m-muted" style="color:${GREY};">Not answered</span>`;
    const top = i === 0 ? '' : `border-top:1px solid ${LINE};`;
    return `<tr><td class="m-line" style="padding:12px 0;${top}">`
      + `<p class="m-muted" style="margin:0 0 4px;font-family:${FONT};font-size:14px;line-height:1.5;font-weight:700;color:${GREY};">${escapeHtml(f.label)}</p>`
      + `<p class="m-ink" style="margin:0;font-family:${FONT};font-size:16px;line-height:1.55;color:${INK};">${value}</p>`
      + '</td></tr>';
  });
  if (!rows.length) return '';
  return heading(skip.size ? 'Your other answers' : 'Your answers')
    + `<tr><td class="m-pad" style="padding:0 40px 22px;"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" class="m-line" style="border-bottom:1px solid ${LINE};">${rows.join('')}</table></td></tr>`;
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
  /** How many items the form allows, and what one is called ("Hoodie"). */
  itemsMax?: number;
  itemLabel?: string | null;
}

/** Every variable of `internal_form_receipt`, escaped and ready. */
export function receiptVars(r: ReceiptInput): Record<string, string> {
  const due = r.trackPayments ? r.due : null;
  const order = orderBlock(r.fields, r.answers, due, r.fixedAmount, r.itemLabel);
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
export function sampleAnswers(fields: FormField[], email: string, itemsMax = 1): Answers {
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
  // A second item, so the test shows how several read: the repeated
  // questions again, with the second choice where there is one.
  if (itemsMax > 1) {
    const second: Answers = {};
    for (const f of fields.filter(repeats)) {
      const pick = (f.options ?? []).filter((o) => o.trim())[1];
      second[f.id] = pick && (f.type === 'single_choice' || f.type === 'dropdown') && !isOrder(f) ? pick : out[f.id];
    }
    (out as Record<string, unknown>)[MORE_KEY] = [second];
  }
  return out;
}
