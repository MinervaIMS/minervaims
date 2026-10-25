import { useMemo } from 'react';
import { divisionLabels, type OrgDivision } from '@/lib/roles';
import type { CommitmentCampaign, CommitmentRequestRow } from '@/lib/declarations-api';

// =====================================================================
// The semester commitment, as the Board reads it (Step 97).
// ---------------------------------------------------------------------
// Each member's answer as a pill, and above the register the completion
// by division: how many were asked, how many confirmed, declined or have
// still to answer, and how many received the one reminder.
// =====================================================================

export type CommitmentKey = 'confirmed' | 'pending' | 'declined' | 'not_asked';

export const COMMITMENT_LABELS: Record<CommitmentKey, string> = {
  confirmed: 'Confirmed', pending: 'Pending', declined: 'Declined', not_asked: 'Not asked',
};

const TONE: Record<CommitmentKey, string> = {
  confirmed: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  pending: 'bg-amber-50 text-amber-700 border-amber-200',
  declined: 'bg-red-50 text-red-700 border-red-200',
  not_asked: 'bg-muted text-muted-foreground border-separator',
};

export function CommitmentPill({ status }: { status: CommitmentKey }) {
  return <span className={`inline-block px-2 py-0.5 text-xs border ${TONE[status]}`}>{COMMITMENT_LABELS[status]}</span>;
}

const divisionName = (d: string | null) =>
  !d || d === 'none' || d === 'board' ? 'Board and others' : divisionLabels[d as OrgDivision] ?? d;

export function CommitmentBoard({ campaign, requests }: { campaign: CommitmentCampaign; requests: CommitmentRequestRow[] }) {
  const rows = useMemo(() => {
    const map = new Map<string, { asked: number; confirmed: number; declined: number; pending: number; reminded: number }>();
    for (const r of requests) {
      const k = divisionName(r.division);
      const row = map.get(k) ?? { asked: 0, confirmed: 0, declined: 0, pending: 0, reminded: 0 };
      row.asked++;
      row[r.status]++;
      if (r.reminder_sent_at) row.reminded++;
      map.set(k, row);
    }
    return [...map.entries()].sort(([a], [b]) => a.localeCompare(b));
  }, [requests]);
  const total = requests.length;
  const answered = requests.filter((r) => r.status !== 'pending').length;
  const pct = (n: number, of: number) => (of ? Math.round((n / of) * 100) : 0);

  return (
    <section aria-labelledby="commitment-board-heading" className="mb-6 border border-separator p-4 font-body">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h3 id="commitment-board-heading" className="font-serif text-lg text-accent">Commitment, {campaign.semester_label}</h3>
        <p className="text-sm text-muted-foreground">
          {answered} of {total} answered ({pct(answered, total)}%), launched {new Date(campaign.launched_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
        </p>
      </div>
      <div className="mt-3 overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs uppercase tracking-wider text-muted-foreground border-b border-separator">
              <th className="py-1.5 pr-3 font-normal">Division</th>
              <th className="py-1.5 pr-3 font-normal text-right">Asked</th>
              <th className="py-1.5 pr-3 font-normal text-right">Confirmed</th>
              <th className="py-1.5 pr-3 font-normal text-right">Declined</th>
              <th className="py-1.5 pr-3 font-normal text-right">Pending</th>
              <th className="py-1.5 pr-3 font-normal text-right">Reminded</th>
              <th className="py-1.5 font-normal w-40">Completion</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(([name, r]) => {
              const done = pct(r.confirmed + r.declined, r.asked);
              return (
                <tr key={name} className="border-b border-separator/60">
                  <td className="py-1.5 pr-3">{name}</td>
                  <td className="py-1.5 pr-3 text-right tabular-nums">{r.asked}</td>
                  <td className="py-1.5 pr-3 text-right tabular-nums">{r.confirmed}</td>
                  <td className="py-1.5 pr-3 text-right tabular-nums">{r.declined}</td>
                  <td className="py-1.5 pr-3 text-right tabular-nums">{r.pending}</td>
                  <td className="py-1.5 pr-3 text-right tabular-nums">{r.reminded}</td>
                  <td className="py-1.5">
                    <div className="flex items-center gap-2">
                      <div className="h-1.5 flex-1 bg-separator" aria-hidden="true"><div className="h-1.5 bg-accent" style={{ width: `${done}%` }} /></div>
                      <span className="tabular-nums text-xs text-muted-foreground w-9 text-right">{done}%</span>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}
