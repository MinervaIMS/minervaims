import { useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import { Button } from '@/components/ui/button';
import { FileText, Eye, Download, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { signMyDocument } from '@/lib/applications-api';
import { openReportInTab } from '@/lib/open-report';

// =====================================================================
// CandidateDocRow — one document a candidate submitted, as they see it.
// ---------------------------------------------------------------------
// A candidate's own CV and written answer, read-only: they can look at
// what they sent and keep a copy, and nothing here can change it.
//
// IT ONLY EVER READS THE SIGNED-IN CANDIDATE'S OWN FILE. `signMyDocument`
// takes no application id: the endpoint resolves the application from the
// session, so this component cannot be pointed at somebody else's
// document even by mistake.
//
// The tab it opens is named after the document, through the same wrapper
// the site uses for reports, rather than showing a storage key.
// =====================================================================

export function CandidateDocRow({ label, kind, present, session }: {
  label: string;
  kind: 'cv' | 'answer';
  present: boolean;
  session: Session | null;
}) {
  const { toast } = useToast();
  const [busy, setBusy] = useState<'preview' | 'download' | null>(null);

  const open = async (mode: 'preview' | 'download') => {
    setBusy(mode);
    try {
      const url = await signMyDocument(session, kind, mode);
      if (mode === 'download') {
        const a = document.createElement('a');
        a.href = url;
        a.download = `${label}.pdf`;
        a.rel = 'noopener';
        document.body.appendChild(a); a.click(); a.remove();
      } else {
        openReportInTab(label, url);
      }
    } catch (e) {
      toast({ title: 'Could not open the document', description: e instanceof Error ? e.message : undefined, variant: 'destructive' });
    } finally { setBusy(null); }
  };

  return (
    <div className="flex items-center justify-between gap-3 border border-separator px-3 py-2 text-sm">
      <span className="flex min-w-0 items-center gap-2 text-foreground">
        <FileText className="h-4 w-4 shrink-0 text-accent" />
        <span className="truncate">{label}</span>
      </span>
      {present ? (
        <div className="flex shrink-0 items-center gap-2">
          <Button variant="outline" size="sm" disabled={busy !== null} onClick={() => open('preview')}>
            {busy === 'preview' ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <><Eye className="h-3.5 w-3.5 mr-1" />Preview</>}
          </Button>
          <Button variant="outline" size="sm" disabled={busy !== null} onClick={() => open('download')}>
            {busy === 'download' ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <><Download className="h-3.5 w-3.5 mr-1" />Download</>}
          </Button>
        </div>
      ) : (
        <span className="shrink-0 border border-separator bg-muted px-2 py-0.5 text-xs text-muted-foreground">Not provided</span>
      )}
    </div>
  );
}

export default CandidateDocRow;
