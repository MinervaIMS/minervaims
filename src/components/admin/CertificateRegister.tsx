import { useCallback, useEffect, useMemo, useState } from 'react';
import { Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { WorkspacePageHeader } from '@/components/admin/WorkspacePageHeader';
import { WorkspaceLoader } from '@/components/admin/WorkspaceLoader';
import { HelpDot } from '@/components/admin/help/HelpSystem';
import { ColumnFilter } from '@/components/admin/ColumnFilter';
import { ClearFilters } from '@/components/shared/ClearFilters';
import {
  certificateRegister, restoreCertificate, verifyPath, withdrawCertificate,
  type RegisterEntry, type RegisterStatus,
} from '@/lib/certificate-api';

// =====================================================================
// Settings, Certificates: every certificate of membership the Society has
// issued, newest first. The President, the Admin and the Vice President
// can withdraw one, with a reason kept in the register, and restore it.
//
// A withdrawn certificate reads "No longer valid" on minervaims.org/verify
// at once, and its holder cannot download a replacement for the same role
// and semester. A certificate whose holder has been expelled reads the
// same way without anybody withdrawing it; the register says which is
// which. Every withdrawal and restoration is in the activity log.
// =====================================================================

const STATUS_LABEL: Record<RegisterStatus, string> = {
  valid: 'Valid',
  withdrawn: 'Withdrawn',
  expelled: 'Holder expelled',
};

const day = (iso: string) => new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });

export default function CertificateRegister() {
  const { session } = useAuth();
  const { toast } = useToast();
  const [rows, setRows] = useState<RegisterEntry[] | null>(null);
  const [canManage, setCanManage] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [semesters, setSemesters] = useState<string[]>([]);
  const [statuses, setStatuses] = useState<string[]>([]);
  const [withdrawing, setWithdrawing] = useState<RegisterEntry | null>(null);
  const [reason, setReason] = useState('');
  const [restoring, setRestoring] = useState<RegisterEntry | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await certificateRegister(session);
      setRows(res.certificates);
      setCanManage(res.can_manage);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'The register could not be read.');
      setRows([]);
    }
  }, [session]);

  useEffect(() => { load(); }, [load]);

  const semesterOptions = useMemo(() => {
    const seen = new Map<string, string>();
    for (const r of rows ?? []) if (!seen.has(r.semester_key)) seen.set(r.semester_key, r.semester_label);
    return [...seen.entries()].map(([value, label]) => ({ value, label }));
  }, [rows]);
  const statusOptions = (Object.keys(STATUS_LABEL) as RegisterStatus[]).map((s) => ({ value: s, label: STATUS_LABEL[s] }));

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return (rows ?? []).filter((r) => {
      if (semesters.length && !semesters.includes(r.semester_key)) return false;
      if (statuses.length && !statuses.includes(r.status)) return false;
      if (!q) return true;
      return [r.holder_name, r.role_label, r.code, r.semester_label].some((v) => v.toLowerCase().includes(q));
    });
  }, [rows, search, semesters, statuses]);

  const counts = useMemo(() => ({
    valid: filtered.filter((r) => r.status === 'valid').length,
    withdrawn: filtered.filter((r) => r.status === 'withdrawn').length,
  }), [filtered]);

  const activeFilters = (search.trim() ? 1 : 0) + (semesters.length ? 1 : 0) + (statuses.length ? 1 : 0);
  const clear = () => { setSearch(''); setSemesters([]); setStatuses([]); };

  const confirmWithdraw = async () => {
    if (!withdrawing) return;
    setBusy(true);
    try {
      await withdrawCertificate(session, withdrawing.id, reason.trim());
      toast({ title: 'Certificate withdrawn', description: `${withdrawing.code} now reads "No longer valid".` });
      setWithdrawing(null);
      setReason('');
      await load();
    } catch (e) {
      toast({ title: 'Could not withdraw the certificate', description: e instanceof Error ? e.message : undefined, variant: 'destructive' });
    } finally { setBusy(false); }
  };

  const confirmRestore = async () => {
    if (!restoring) return;
    setBusy(true);
    try {
      await restoreCertificate(session, restoring.id);
      toast({ title: 'Certificate restored', description: `${restoring.code} is valid again.` });
      setRestoring(null);
      await load();
    } catch (e) {
      toast({ title: 'Could not restore the certificate', description: e instanceof Error ? e.message : undefined, variant: 'destructive' });
    } finally { setBusy(false); }
  };

  const header = (
    <WorkspacePageHeader
      title="Certificates"
      description="Every certificate of membership issued, as it was issued. A withdrawn certificate reads No longer valid on the public verification page."
    />
  );

  if (rows === null) return <div>{header}<WorkspaceLoader /></div>;

  return (
    <div className="font-body">
      {header}

      <div className="mb-4 flex flex-col sm:flex-row gap-3 sm:items-center flex-wrap">
        <div className="relative max-w-md flex-1 min-w-[220px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input className="pl-10 font-body" placeholder="Search by name, role or certificate number" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <ClearFilters count={activeFilters} onClear={clear} size="sm" />
        <HelpDot page="settings-certificates" topic="register" />
      </div>

      <p className="text-small text-muted-foreground mb-4">
        {filtered.length} {filtered.length === 1 ? 'certificate' : 'certificates'}: {counts.valid} valid, {counts.withdrawn} withdrawn
      </p>

      {error && <p className="mb-4 rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>}

      {filtered.length === 0 ? (
        <Card><CardContent className="py-12 text-center">
          <p className="text-muted-foreground">
            {rows.length === 0 ? 'No certificate has been issued yet. Members download theirs from My Profile.' : 'No certificate matches the current filters.'}
          </p>
        </CardContent></Card>
      ) : (
        <div className="max-w-full border border-separator overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-muted/40 text-muted-foreground">
              <tr>
                <th className="px-3 py-2 font-normal whitespace-nowrap">Number</th>
                <th className="px-3 py-2 font-normal">Holder</th>
                <th className="px-3 py-2 font-normal">Role</th>
                <th className="px-3 py-2 font-normal"><ColumnFilter label="Semester" options={semesterOptions} selected={semesters} onChange={setSemesters} /></th>
                <th className="px-3 py-2 font-normal whitespace-nowrap">Issued</th>
                <th className="px-3 py-2 font-normal"><ColumnFilter label="Status" options={statusOptions} selected={statuses} onChange={setStatuses} /></th>
                <th className="px-3 py-2 font-normal text-right"><span className="sr-only">Actions</span></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((r) => (
                <tr key={r.id} className="border-t border-separator align-top">
                  <td className="px-3 py-2 whitespace-nowrap tabular-nums">
                    <a data-ro href={verifyPath(r.code)} target="_blank" rel="noopener noreferrer" className="text-accent underline-offset-2 hover:underline" title="Open the public verification page">
                      {r.code}
                    </a>
                  </td>
                  <td className="px-3 py-2 text-foreground">{r.holder_name}</td>
                  <td className="px-3 py-2">{r.role_label}</td>
                  <td className="px-3 py-2 whitespace-nowrap">{r.semester_label}</td>
                  <td className="px-3 py-2 whitespace-nowrap text-muted-foreground">{day(r.issued_at)}</td>
                  <td className="px-3 py-2">
                    <span className={`whitespace-nowrap text-[11px] px-1.5 py-0.5 ${
                      r.status === 'valid' ? 'bg-accent/10 text-accent' : 'bg-destructive/10 text-destructive'
                    }`}>
                      {STATUS_LABEL[r.status]}
                    </span>
                    {r.status === 'withdrawn' && (
                      <p className="mt-1 max-w-xs text-xs text-muted-foreground">
                        {r.withdrawn_at ? day(r.withdrawn_at) : ''}{r.withdrawn_by ? `, by ${r.withdrawn_by}` : ''}{r.withdrawn_reason ? `: ${r.withdrawn_reason}` : ''}
                      </p>
                    )}
                  </td>
                  <td className="px-3 py-2 text-right whitespace-nowrap">
                    {canManage && r.status === 'valid' && (
                      <Button variant="outline" size="sm" onClick={() => { setReason(''); setWithdrawing(r); }}>Withdraw</Button>
                    )}
                    {canManage && r.status === 'withdrawn' && (
                      <Button variant="outline" size="sm" onClick={() => setRestoring(r)}>Restore</Button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <AlertDialog open={!!withdrawing} onOpenChange={(o) => { if (!o && !busy) setWithdrawing(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Withdraw this certificate?</AlertDialogTitle>
            <AlertDialogDescription>
              {withdrawing ? `${withdrawing.code}, ${withdrawing.holder_name}, ${withdrawing.role_label}, ${withdrawing.semester_label}. ` : ''}
              From now on the verification page shows it as No longer valid, and its holder cannot download a replacement for this role and semester. You can restore it later.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-2">
            <Label htmlFor="withdraw-reason">Reason, kept in the register</Label>
            <Textarea id="withdraw-reason" value={reason} maxLength={300} rows={3} onChange={(e) => setReason(e.target.value)} placeholder="For example: issued with the wrong role" />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={busy}>Keep it valid</AlertDialogCancel>
            <AlertDialogAction
              disabled={busy || reason.trim().length < 3}
              onClick={(e) => { e.preventDefault(); confirmWithdraw(); }}
            >
              Withdraw
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!restoring} onOpenChange={(o) => { if (!o && !busy) setRestoring(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Restore this certificate?</AlertDialogTitle>
            <AlertDialogDescription>
              {restoring ? `${restoring.code}, ${restoring.holder_name}. ` : ''}
              The verification page shows it as valid again, and the withdrawal reason is removed from the register. The activity log keeps both steps.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={busy}>Cancel</AlertDialogCancel>
            <AlertDialogAction disabled={busy} onClick={(e) => { e.preventDefault(); confirmRestore(); }}>Restore</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
