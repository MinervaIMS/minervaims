import { useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Download, FileText, Loader2, Mail } from 'lucide-react';
import { divisionLabels } from '@/lib/roles';
import {
  ACADEMIC_YEAR_LABELS, STATUS_LABELS, statusBadgeClass, signDocumentUrl,
  applyDivisionLabel, evaluationDivision, emailStatusTone, EMAIL_STATUS_MEANING,
  type ApplicationEmail,
} from '@/lib/applications-api';
import { openReportInTab } from '@/lib/open-report';
import type { CandidateDetail } from './useCandidateDetail';
import { documentTitle } from './document-title';
import { safeLinkedInUrl } from '@/lib/linkedin';

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
  /**
   * The page is read-only for this reader, but notes are a permission they
   * genuinely hold (`candidates_notes_only`). Marks the note controls so the
   * workspace-wide read-only sweep leaves them alive.
   */
  notesAllowedInReadOnly?: boolean;

  onNoteAdded: () => void | Promise<void>;
  addNote: (body: string) => Promise<void>;
  onError: (message: string) => void;
  /** Slot for the page's own controls, above the notes. */
  children?: React.ReactNode;
}

export function CandidateProfile({
  session, detail, cvUrl, answerUrl, docsLoading,
  canAddNotes, notesAllowedInReadOnly = false,
  onNoteAdded, addNote, onError, children,
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
    <div className="font-body">
    <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
      {/* Left: who they are, the page's own controls, then the notes. */}
      <div className="space-y-5">
        <div className="grid grid-cols-2 gap-3 text-sm">
          <Info label="Email" value={app.email} />
          <Info label="Phone" value={app.phone} />
          <Info label="Bocconi ID" value={app.bocconi_id} />
          <Info label="Academic year" value={ACADEMIC_YEAR_LABELS[app.academic_year]} />
          <Info label="Programme" value={app.degree_course} />
          {/* The same stranger-supplied string the list column renders, put
              through the same check: `linkedin_url` comes from the public
              application form and is stored unvalidated. The candidate's
              own text is still SHOWN whatever it says, so a reviewer can
              read a mistyped address and act on it; only the link is
              withheld when there is nothing safe to open. */}
          <Info
            label="LinkedIn"
            value={app.linkedin_url || '-'}
            link={safeLinkedInUrl(app.linkedin_url) || undefined}
          />
          {/* The preferences read under the names the APPLICANT saw on the
              form, where "Media and Operations" is one intake. The
              evaluation reads under the association's own division names,
              because it is the association's decision, not their request. */}
          <Info label="Evaluated for" value={divisionLabels[evaluationDivision(app)]} />
          <Info label="First choice" value={applyDivisionLabel(app.first_choice)} />
          <Info label="Second choice" value={app.second_choice ? applyDivisionLabel(app.second_choice) : '-'} />
          <Info label="Submitted" value={new Date(app.created_at).toLocaleString()} />
          {app.interview_division && (
            <Info label="Interviewed by" value={divisionLabels[app.interview_division]} />
          )}
        </div>

        {children}

        <div className="flex gap-2 flex-wrap">
          <Button variant="outline" size="sm" onClick={() => downloadDoc('cv')}><Download className="h-4 w-4 mr-2" />Download CV</Button>
          {/* "Download answer", not "Download work": the file is the
              applicant's answer to the written question set by the division,
              and "work" reads as though the society were downloading a
              portfolio of past employment. */}
          <Button variant="outline" size="sm" onClick={() => downloadDoc('answer')}><Download className="h-4 w-4 mr-2" />Download answer</Button>
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
            <div className="space-y-2" {...(notesAllowedInReadOnly ? { 'data-ro-allow': '' } : {})}>
              <Textarea value={noteText} onChange={(e) => setNoteText(e.target.value)} placeholder="Add a technical, formal note…" rows={2} />
              <Button size="sm" onClick={submitNote} disabled={savingNote || !noteText.trim()}>
                {savingNote ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}Add note
              </Button>
            </div>
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

    <EmailHistory emails={detail.emails} email={app.email} />
    </div>
  );
}

// =====================================================================
// WHAT THIS CANDIDATE HAS BEEN SENT.
// ---------------------------------------------------------------------
// A candidate who has not replied is the commonest thing a reviewer has
// to make sense of, and until now the workspace could not tell them the
// one fact that decides it: whether the association had actually written,
// when, and whether it arrived. The answer existed - every automatic
// email is logged - but only on a Settings page, in one undifferentiated
// register of every email ever sent to anybody.
//
// FULL WIDTH, AND UNDER EVERYTHING ELSE. It is a table, and a table put
// in the left column beside two document previews would be four words
// wide. It is also the last thing a reviewer consults rather than the
// first, so it sits below the candidate rather than beside them.
//
// THE STATUS COLUMN IS NOT DECORATION. "Bounced" or "Suppressed" against
// the interview invitation is the whole explanation of a silence, and it
// is the reason this table is worth more than a list of dates.
// =====================================================================
function EmailHistory({ emails, email }: { emails: ApplicationEmail[] | undefined; email: string }) {
  // `undefined` means the endpoint did not send the field, which is not
  // the same as "no emails" and must not be reported as one.
  if (!emails) return null;
  return (
    <div className="mt-6 pt-5 border-t border-separator">
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1 mb-2">
        <div className="text-xs uppercase tracking-wider text-muted-foreground inline-flex items-center gap-1.5">
          <Mail className="h-3.5 w-3.5" />Emails sent to this candidate
        </div>
        <span className="text-xs text-muted-foreground">
          {emails.length === 0 ? 'none yet' : emails.length === 1 ? '1 email' : `${emails.length} emails`}
          {' · '}to {email}
        </span>
      </div>

      {emails.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Nothing has been sent to this address yet. Automatic emails go out when a candidacy moves stage,
          so a candidate at an early stage will have none.
        </p>
      ) : (
        <div className="max-w-full border border-separator overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-muted/40 text-muted-foreground">
              <tr>
                <th className="px-3 py-2 font-normal whitespace-nowrap">Date</th>
                <th className="px-3 py-2 font-normal whitespace-nowrap">Time</th>
                <th className="px-3 py-2 font-normal">Email</th>
                <th className="px-3 py-2 font-normal">Outcome</th>
              </tr>
            </thead>
            <tbody>
              {emails.map((m) => {
                const at = new Date(m.created_at);
                return (
                  <tr key={m.id} className="border-t border-separator">
                    <td className="px-3 py-2 whitespace-nowrap text-foreground">
                      {at.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })}
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap tabular-nums text-muted-foreground">
                      {at.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}
                    </td>
                    <td className="px-3 py-2">
                      <span className="text-foreground">{m.template_label || m.template_name}</span>
                      {m.template_label && <span className="text-xs text-muted-foreground ml-2">{m.template_name}</span>}
                    </td>
                    <td className={`px-3 py-2 ${emailStatusTone(m.status)}`}>
                      <span className="capitalize" title={EMAIL_STATUS_MEANING[m.status] || undefined}>{m.status}</span>
                      {m.error_message && (
                        <div className="text-xs text-muted-foreground mt-0.5 break-words">{m.error_message}</div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
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
        {/* `data-ro`: this opens the document in a tab, which is a read. */}
        <button data-ro type="button" onClick={onOpen} className="text-xs text-accent hover:underline inline-flex items-center gap-1">
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
