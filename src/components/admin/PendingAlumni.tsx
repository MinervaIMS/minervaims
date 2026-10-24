import { useCallback, useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { friendlyError } from '@/lib/errors';
import { dismissPendingAlumnus, fetchPendingAlumni, type PendingAlumnus } from '@/lib/rosters-api';

// =====================================================================
// People > Alumni: former members to complete (Step 94).
// ---------------------------------------------------------------------
// Former members who held a role and left, and are not in the directory
// yet. The directory needs a graduation year, which only a person can
// supply, so each one is added here through the ordinary form; the new
// entry is linked to the person's roster history by the database. Listed
// for the President and the Vice-President only (the database returns an
// empty list to everybody else).
// =====================================================================

interface Props {
  /** Opens the directory's own form, filled in with this name. */
  onAdd?: (first: string, surname: string) => void;
  /** Changes when the directory changes, so an added person leaves the list. */
  refreshKey: number;
}

export function PendingAlumni({ onAdd, refreshKey }: Props) {
  const { session } = useAuth();
  const { toast } = useToast();
  const [items, setItems] = useState<PendingAlumnus[]>([]);
  const [open, setOpen] = useState(false);
  const [dismissing, setDismissing] = useState<PendingAlumnus | null>(null);

  const load = useCallback(() => {
    fetchPendingAlumni().then(setItems).catch(() => setItems([]));
  }, []);

  useEffect(() => { load(); }, [load, refreshKey]);

  if (items.length === 0) return null;

  const dismiss = async () => {
    if (!dismissing) return;
    try {
      await dismissPendingAlumnus(session, dismissing.id);
      toast({ title: `${dismissing.first_name} ${dismissing.surname} will not join the directory` });
      load();
    } catch (e) {
      toast({ title: 'Not changed', description: friendlyError(e), variant: 'destructive' });
    } finally {
      setDismissing(null);
    }
  };

  return (
    <section className="mb-6 border border-separator bg-muted/30">
      <button type="button" className="w-full flex items-center justify-between gap-3 px-4 py-3 text-left" onClick={() => setOpen((v) => !v)} aria-expanded={open}>
        <span className="font-body text-body">
          <span className="font-medium">To complete:</span> {items.length} former {items.length === 1 ? 'member' : 'members'} not yet in the directory
        </span>
        <span className="font-body text-small text-accent">{open ? 'Hide' : 'Show'}</span>
      </button>
      {open && (
        <div className="divide-y divide-separator border-t border-separator">
          {items.map((p) => (
            <div key={p.id} className="px-4 py-3 flex flex-col md:flex-row md:items-center md:justify-between gap-2">
              <div className="min-w-0">
                <div className="font-body text-body">{p.first_name} {p.surname}</div>
                <div className="font-body text-small text-muted-foreground">Last seen {p.last_semester}, {p.last_role}</div>
                <div className="font-body text-xs text-muted-foreground/80 mt-0.5">{p.career}</div>
              </div>
              <div className="flex gap-2 shrink-0">
                {onAdd && <Button size="sm" onClick={() => onAdd(p.first_name, p.surname)}>Add</Button>}
                <Button size="sm" variant="outline" onClick={() => setDismissing(p)}>Not an alumnus</Button>
              </div>
            </div>
          ))}
        </div>
      )}
      <AlertDialog open={!!dismissing} onOpenChange={(o) => { if (!o) setDismissing(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Not an alumnus?</AlertDialogTitle>
            <AlertDialogDescription>
              {dismissing ? `${dismissing.first_name} ${dismissing.surname} leaves this list and does not join the alumni directory. Their semesters stay in the rosters.` : ''}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={dismiss}>Confirm</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </section>
  );
}
