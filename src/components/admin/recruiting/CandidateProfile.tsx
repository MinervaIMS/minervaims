import { useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Download, FileText, Loader2 } from 'lucide-react';
import { divisionLabels } from '@/lib/roles';
import {
  ACADEMIC_YEAR_LABELS, STATUS_LABELS, statusBadgeClass, signDocumentUrl,
} from '@/lib/applications-api';
import { openReportInTab } from '@/lib/open-report';
import type { CandidateDetail } from './useCandidateDetail';
import { documentTitle } from './document-title';

// =====================================================================
// CandidateProfile — everything about a candidate that is the same
// wherever the candidate is being looked at.
// ---------------------------------------------------------------------
// Candidate Screening and Offers now show the same person, and the person
// does not change depending on which page you reached them from. So the
// identity, the application, the documents and the screening notes are
// described once, here, and both pages compose it.
//
// WHAT IS NOT HERE is anything that MOVES a candidacy: the status control,
// the division transfer and the offer form all stay with the page that
// owns that decision. This component reads and comments; it never advances
// anybody.
// =====================================================================

interface Props {
  session: Session | null;
  detail: CandidateDetail;
  cvUrl: string | null;
  answerUrl: string | null;
  /** The two previews are still being signed. */
  docsLoading: boolean;
  /** Notes may be added. Reading them is never restricted. */
  canAddNotes: boolean;
  onNoteAdded: () => void | Promise<void>;
  addNote: (body: string) => Promise<void>;
  onError: (message: string) => void;
  /** Slot for the page's own controls, above the notes. */
  children?: React.ReactNode;
}

export function CandidateProfile({
  session, detail, cvUrl, answerUrl, docsLoading,
  canAddNotes, onNoteAdded, addNote, onError, children,
}: Props) {
  const [noteText, setNoteText] = useState('');
  const [savingNote, setSavingNote] = useState(false);
  const app = detail.application;

  /**
   * OPENED IN A TAB THAT SAYS WHOSE IT IS.
   *
   * A signed storage URL ends in an object key, so the browser called the
   * tab something like `a3f1...-cv.pdf` and a reviewer with four candidates
   * open could not tell them apart. `openReportInTab` is the wrapper the
   * whole site already uses for reports: it opens a tab it controls, titles
   * it, and names the download to match. It is reused here exactly as it is,
   * with no report id, which is the case it already supports.
   */
  const openDoc = async (kind: 'cv' | 'answer') => {
    try {
      const url = await signDocumentUrl(session, app.id, kind, 'preview');
      openReportInTab(documentTitle(app, kind), url);
    } catch (e) {
      onError(e instanceof Error ? e.message : 'Could not open the document.');
    }
  };

  const downloadDoc = async (kind: 'cv' | 'answer') => {
    try {
      const url = await signDocumentUrl(session, app.id, kind, 'download');
      const a = document.createElement('a');
      a.href = url;
      a.download = `${documentTitle(app, kind)}.pdf`;
      a.target = '_blank';
      document.body.appendChild(a); a.click(); a.remove();
    } catch (e) {
      onError(e instanceof Error ? e.message : 'Download failed.');
    }
  };

  const submitNote = async () => {
    if (!noteText.trim()) return;
    setSavingNote(true);
    try {
      await addNote(noteText.trim());
      setNoteText('');
      await onNoteAdded();
    } catch (e) {
      onError(e instanceof Error ? e.message : 'Could not add the note.');
    } finally { setSavingNote(false); }
  };

  return (
    <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 font-body">
      {/* Left: who they are, the page's own controls, then the notes. */}
      <div className="space-y-5">
        <div className="grid grid-cols-2 gap-3 text-sm">
          <Info label="Email" value={app.email} />
          <Info label="Phone" value={app.phone} />
          <Info label="Bocconi ID" value={app.bocconi_id} />
          <Info label="Academic year" value={ACADEMIC_YEAR_LABELS[app.academic_year]} />
          <Info label="Programme" value={app.degree_course} />
          <Info label="LinkedIn" value={app.linkedin_url || '-'} link={app.linkedin_url || undefined} />
          <Info label="First choice" value={divisionLabels[app.first_choice]} />
          <Info label="Second choice" value={app.second_choice ? divisionLabels[app.second_choice] : '-'} />
          <Info label="Submitted" value={new Date(app.created_at).toLocaleString()} />
          {app.interview_division && (
            <Info label="Interview division" value={divisionLabels[app.interview_division]} />
          )}
        </div>

        {children}

        <div className="flex gap-2 flex-wrap">
          <Button variant="outline" size="sm" onClick={() => downloadDoc('cv')}><Download className="h-4 w-4 mr-2" />Download CV</Button>
          <Button variant="outline" size="sm" onClick={() => downloadDoc('answer')}><Download className="h-4 w-4 mr-2" />Download work</Button>
        </div>

        <div className="space-y-2">
          <div className="text-xs uppercase tracking-wider text-muted-foreground">Notes (shared with reviewers)</div>
          <p className="text-xs text-muted-foreground bg-muted/50 border border-separator p-2">
            Please remember these notes are visible to <strong>all members with access to this area</strong>. Write only technical, formal and relevant comments for evaluating the candidate. Do not include unpleasant or inappropriate remarks.
          </p>
          <div className="space-y-2 max-h-40 overflow-y-auto">
            {detail.notes.length === 0 && <p className="text-sm text-muted-foreground">No notes yet.</p>}
            {detail.notes.map((n) => (
              <div key={n.id} className="text-sm border border-separator p-2">
                <div className="text-xs text-muted-foreground mb-1">{n.author_name} · {new Date(n.created_at).toLocaleDateString()}</div>
                {n.body}
              </div>
            ))}
          </div>
          {canAddNotes && (
            <>
              <Textarea value={noteText} onChange={(e) => setNoteText(e.target.value)} placeholder="Add a technical, formal note…" rows={2} />
              <Button size="sm" onClick={submitNote} disabled={savingNote || !noteText.trim()}>
                {savingNote ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}Add note
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Centre and right: the two documents. THEY FILL IN SEPARATELY.
          Each pane carries its own small placeholder while its URL is being
          signed, so a slow document delays itself and nothing else: the
          candidate is readable long before either arrives. */}
      <DocPane title="CV preview" url={cvUrl} loading={docsLoading} onOpen={() => openDoc('cv')} empty="No CV uploaded" />
      <DocPane title="Submitted work preview" url={answerUrl} loading={docsLoading} onOpen={() => openDoc('answer')} empty="No document uploaded" />
    </div>
  );
}

function DocPane({ title, url, loading, onOpen, empty }: {
  title: string; url: string | null; loading: boolean; onOpen: () => void; empty: string;
}) {
  return (
    <div className="min-h-[400px]">
      <div className="flex items-center justify-between mb-2">
        <div className="text-xs uppercase tracking-wider text-muted-foreground">{title}</div>
        <button type="button" onClick={onOpen} className="text-xs text-accent hover:underline inline-flex items-center gap-1">
          <FileText className="h-3.5 w-3.5" />Open
        </button>
      </div>
      {url ? (
        <iframe title={title} src={url} className="w-full h-[72vh] border border-separator" />
      ) : (
        <div className="h-[72vh] border border-separator flex items-center justify-center text-muted-foreground text-sm">
          {loading ? <span className="inline-flex items-center gap-2"><Loader2 className="h-4 w-4 animate-spin" />Preparing preview</span> : empty}
        </div>
      )}
    </div>
  );
}

/** One labelled field. */
export function Info({ label, value, link }: { label: string; value: string; link?: string }) {
  return (
    <div>
      <div className="text-xs uppercase tracking-wider text-muted-foreground">{label}</div>
      {link ? <a href={link} target="_blank" rel="noopener noreferrer" className="text-accent underline break-all">{value}</a>
            : <div className="text-foreground break-words">{value}</div>}
    </div>
  );
}

/** The candidate's current place in the process, as a read-only line. */
export function CandidateStage({ status }: { status: CandidateDetail['application']['status'] }) {
  return (
    <div className="border border-separator p-3 space-y-1">
      <div className="text-xs uppercase tracking-wider text-muted-foreground">Stage reached</div>
      <span className={`inline-block px-2 py-0.5 text-xs border ${statusBadgeClass(status)}`}>{STATUS_LABELS[status]}</span>
    </div>
  );
}

export default CandidateProfile;
