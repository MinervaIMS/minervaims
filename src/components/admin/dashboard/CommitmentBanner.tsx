import { useEffect, useState } from 'react';
import { ClipboardCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';

// =====================================================================
// THE SEMESTER COMMITMENT, WAITING FOR AN ANSWER (Step 97).
// ---------------------------------------------------------------------
// A slim line under the greeting while the member's commitment for the
// semester is pending; answered, or never asked, it is not there. It is
// read with the rest of the Dashboard (the page waits for it), so it never
// arrives late and pushes the cards down. The answer itself is given in
// My Profile.
// =====================================================================

export function useMyCommitment(userId: string | null | undefined) {
  const [state, setState] = useState<{ settled: boolean; semester: string | null }>({ settled: false, semester: null });
  useEffect(() => {
    let active = true;
    (async () => {
      if (!userId) { if (active) setState({ settled: true, semester: null }); return; }
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const sb = supabase as any;
        const { data: reqs } = await sb.from('commitment_requests').select('campaign_id').eq('user_id', userId).eq('status', 'pending');
        let semester: string | null = null;
        if (reqs?.length) {
          const { data: camps } = await sb.from('commitment_campaigns').select('semester_label, launched_at, closed_at')
            .in('id', reqs.map((r: { campaign_id: string }) => r.campaign_id)).is('closed_at', null).order('launched_at', { ascending: false }).limit(1);
          semester = camps?.[0]?.semester_label ?? null;
        }
        if (active) setState({ settled: true, semester });
      } catch {
        if (active) setState({ settled: true, semester: null });
      }
    })();
    return () => { active = false; };
  }, [userId]);
  return state;
}

export default function CommitmentBanner({ semester, onOpen }: { semester: string; onOpen: () => void }) {
  return (
    <div className="shrink-0 flex flex-wrap items-center gap-3 rounded-xl border border-accent/40 bg-accent/5 px-4 py-3 font-body text-sm" role="status">
      <ClipboardCheck className="h-4 w-4 text-accent shrink-0" aria-hidden="true" />
      <span className="flex-1 min-w-[12rem]">Your commitment for <strong>{semester}</strong> is waiting for your answer: confirm or decline, in a minute.</span>
      <Button size="sm" onClick={onOpen}>Answer now</Button>
    </div>
  );
}
