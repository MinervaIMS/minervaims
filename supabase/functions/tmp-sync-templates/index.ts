/* eslint-disable @typescript-eslint/no-explicit-any */
// Temporary: sends one of each new staff notice to a test address. Deleted after use.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';

const TO = 'riccardo.colombo7@studbocconi.it';

Deno.serve(async () => {
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  );
  const base = {
    first_name: 'Riccardo',
    candidate_name: 'Marco Rossi',
    division_name: 'Equity Research',
    interview_when: 'Monday, 21 September 2026, 15:00–15:30',
    offer_role: 'Analyst',
    offer_deadline: '24 Sep 2026, 18:00',
  };
  const keys = [
    'staff_interview_booked', 'staff_interview_released', 'staff_offer_sent',
    'staff_offer_accepted', 'staff_offer_declined', 'staff_offer_expired',
  ];
  const out: Record<string, string> = {};
  const url = new URL('http://x');
  if (String(base.first_name)) {
    // dispatch only, no new queue entries
  }
  try { await supabase.rpc('email_queue_dispatch'); } catch (e) { out.dispatch = String(e); }
  void keys; void url;
  return new Response(JSON.stringify(out), { headers: { 'Content-Type': 'application/json' } });
});
