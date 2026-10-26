import { useMemo, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import { applyPdfDetails, checkPdfDetails, type PdfCheck } from '@/lib/archive-api';

// =====================================================================
// What the archive's reports are missing, and their PDFs' own details
// (Step 93). Two small blocks above the list:
//
//   Missing details  how many reports have no authors, no summary or no
//                    type; each count filters the list to those reports.
//   PDF details      whether each PDF says what its report page says
//                    (title, authors, summary, tags). Checking only
//                    reads; writing asks first, keeps every original in
//                    a private copy, and reports what it wrote.
// =====================================================================

export type MissingKind = 'authors' | 'summary' | 'type';

export interface DetailsRow {
  authors?: unknown[] | null;
  description?: string | null;
  report_type?: string | null;
}

export const isMissing = (f: DetailsRow, kind: MissingKind) =>
  kind === 'authors' ? !(f.authors && f.authors.length)
    : kind === 'summary' ? !(f.description && f.description.trim())
      : !f.report_type;

const LABELS: Record<MissingKind, string> = { authors: 'No authors', summary: 'No summary', type: 'No type' };

interface Props {
  files: DetailsRow[];
  missing: MissingKind | null;
  onMissing: (kind: MissingKind | null) => void;
  canWrite: boolean;
  session: Session | null;
  onWritten: () => void;
}

export function ArchiveDetailsPanel({ files, missing, onMissing, canWrite, session, onWritten }: Props) {
  const { toast } = useToast();
  const counts = useMemo(() => ({
    authors: files.filter((f) => isMissing(f, 'authors')).length,
    summary: files.filter((f) => isMissing(f, 'summary')).length,
    type: files.filter((f) => isMissing(f, 'type')).length,
  }), [files]);
  const [check, setCheck] = useState<PdfCheck | null>(null);
  const [checking, setChecking] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [writing, setWriting] = useState<{ written: number; total: number } | null>(null);
  const [failures, setFailures] = useState<{ title: string; reason: string }[]>([]);

  const runCheck = async () => {
    setChecking(true);
    try {
      setCheck(await checkPdfDetails(session));
    } catch (e) {
      toast({ title: 'Could not check the PDFs', description: e instanceof Error ? e.message : undefined, variant: 'destructive' });
    } finally {
      setChecking(false);
    }
  };

  const runWrite = async () => {
    if (!check) return;
    const total = check.to_update.length;
    setWriting({ written: 0, total });
    setFailures([]);
    try {
      const { written, failed } = await applyPdfDetails(session, (w) => setWriting({ written: w, total }));
      setFailures(failed.map((f) => ({ title: f.title, reason: f.reason })));
      toast({
        title: `${written} ${written === 1 ? 'PDF' : 'PDFs'} updated`,
        description: failed.length ? `${failed.length} could not be updated; they are listed under PDF details.` : 'Each PDF now carries its report page\'s details.',
        variant: failed.length ? 'destructive' : undefined,
      });
      onWritten();
      setCheck(await checkPdfDetails(session).catch(() => null));
    } catch (e) {
      toast({ title: 'The update stopped', description: e instanceof Error ? e.message : undefined, variant: 'destructive' });
    } finally {
      setWriting(null);
    }
  };

  return (
    <div className="mb-8 grid gap-4 md:grid-cols-2">
      <section className="border border-separator p-4" aria-labelledby="archive-missing-heading">
        <h2 id="archive-missing-heading" className="font-serif text-subheading text-accent">Missing details</h2>
        <p className="font-body text-xs text-muted-foreground mt-1">Reports in this archive without authors, a summary or a type. Choose one to list them.</p>
        <div className="mt-3 flex flex-wrap gap-2">
          {(Object.keys(LABELS) as MissingKind[]).map((k) => (
            <button
              key={k}
              type="button"
              onClick={() => onMissing(missing === k ? null : k)}
              aria-pressed={missing === k}
              className={`font-body text-sm border px-3 py-1.5 max-lg:min-h-11 ${missing === k ? 'bg-accent text-background border-accent' : 'border-separator hover:bg-muted'}`}
            >
              {LABELS[k]}: {counts[k]}
            </button>
          ))}
          {missing && (
            <button type="button" className="font-body text-sm text-primary underline underline-offset-4 max-lg:min-h-11" onClick={() => onMissing(null)}>Show all</button>
          )}
        </div>
      </section>

      <section className="border border-separator p-4" aria-labelledby="archive-pdf-heading">
        <h2 id="archive-pdf-heading" className="font-serif text-subheading text-accent">PDF details</h2>
        <p className="font-body text-xs text-muted-foreground mt-1">
          Each PDF carries its report page&apos;s title, authors, summary and tags, which is what search engines and assistants read first.
        </p>
        {check && (
          <p className="font-body text-sm mt-3" aria-live="polite">
            {check.up_to_date} up to date · {check.to_update.length} to update{check.cannot.length ? ` · ${check.cannot.length} stored elsewhere, not changed` : ''}
          </p>
        )}
        {writing && (
          <div className="mt-3 space-y-1">
            <Progress value={writing.total ? (100 * writing.written) / writing.total : 0} className="h-2" />
            <p className="font-body text-xs text-muted-foreground">{writing.written} of {writing.total} written</p>
          </div>
        )}
        <div className="mt-3 flex flex-wrap gap-2">
          <Button type="button" variant="outline" size="sm" className="font-body h-11 lg:h-9" onClick={runCheck} disabled={checking || !!writing}>
            {checking ? <Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> : null}Check the PDFs
          </Button>
          {canWrite && check && check.to_update.length > 0 && (
            <Button type="button" size="sm" className="font-body h-11 lg:h-9" onClick={() => setConfirming(true)} disabled={!!writing}>
              Update {check.to_update.length} {check.to_update.length === 1 ? 'PDF' : 'PDFs'}
            </Button>
          )}
        </div>
        {failures.length > 0 && (
          <ul className="mt-3 font-body text-xs text-destructive space-y-1">
            {failures.map((f) => <li key={f.title}>{f.title}: {f.reason}</li>)}
          </ul>
        )}
      </section>

      <AlertDialog open={confirming} onOpenChange={setConfirming}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Update {check?.to_update.length ?? 0} PDFs?</AlertDialogTitle>
            <AlertDialogDescription>
              Each report&apos;s title, authors, summary and tags will be written into its PDF as the file&apos;s own details. The pages of the PDF do not change.
              Before a PDF is changed for the first time, the file exactly as it was uploaded is kept in a private copy, so nothing is lost. Links to the PDFs stay the same.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="h-11 lg:h-10">Cancel</AlertDialogCancel>
            <AlertDialogAction className="h-11 lg:h-10" onClick={() => { setConfirming(false); void runWrite(); }}>Update the PDFs</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

export default ArchiveDetailsPanel;
