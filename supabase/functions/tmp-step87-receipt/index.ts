// supabase/functions/tmp-step87-receipt/index.ts  (TEMPORARY: delete after the test)
import { createClient } from 'npm:@supabase/supabase-js@2';
import { receiptVars, sampleAnswers } from '../_shared/internal-form-email.ts';
import { amountDue } from '../_shared/internal-forms.ts';
Deno.serve(async (req) => {
  const b = await req.json().catch(() => ({}));
  if (b.k !== 'mnr-step87') return new Response('no', { status: 403 });
  const s = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
  const q = s.from('internal_forms').select('*');
  const { data: f } = b.form_id ? await q.eq('id', b.form_id).maybeSingle()
    : await q.order('updated_at', { ascending: false }).limit(1).maybeSingle();
  if (!f) return new Response(JSON.stringify({ error: 'no form' }));
  const to = 'as.minerva@unibocconi.it';
  const answers = sampleAnswers(f.fields || [], to);
  const fixed = f.payment_amount === null ? null : Number(f.payment_amount);
  const when = (iso: string) => new Date(iso).toLocaleString('en-GB', { timeZone: 'Europe/Rome', dateStyle: 'full', timeStyle: 'short' });
  const { error } = await s.rpc('enqueue_app_email', { p_key: 'internal_form_receipt', p_to: to, p_vars: receiptVars({
    formTitle: f.title, formUrl: `https://minervaims.org/forms/${f.id}`, fields: f.fields || [], answers,
    firstName: 'Test', memberName: 'Test Member', submittedOn: when(new Date().toISOString()),
    trackPayments: f.track_payments, fixedAmount: fixed, due: amountDue(f.track_payments, fixed, f.fields || [], answers),
    paymentInstructions: f.payment_instructions, allowEdits: f.allow_edits,
    deadlineText: f.closes_at ? when(f.closes_at) : null, confirmationMessage: f.confirmation_message,
  }) });
  return new Response(JSON.stringify({ error, form: f.title }));
});
