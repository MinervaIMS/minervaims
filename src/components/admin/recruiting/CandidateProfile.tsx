import { useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import {
  ChevronDown, Download, FileText, Loader2, Mail, MessageSquare, Sparkles,
} from 'lucide-react';
import { divisionLabels } from '@/lib/roles';
import {
  ACADEMIC_YEAR_LABELS, STATUS_LABELS, statusBadgeClass, signDocumentUrl,
  applyDivisionLabel, evaluationDivision, emailStatusTone, EMAIL_STATUS_MEANING,
  isSystemNote,
  type ApplicationEmail,
} from '@/lib/applications-api';
import { openReportInTab } from '@/lib/open-report';
import type { CandidateDetail } from './useCandidateDetail';
import { documentTitle, documentFileName } from './document-title';
import { safeLinkedInUrl } from '@/lib/linkedin';
import linkedinIcon from '@/assets/linkedin-icon.png';

// =====================================================================
// CandidateProfile - everything about a candidate that is the same
// wherever the candidate is being looked at.
// ---------------------------------------------------------------------
// Candidate Screening and Offers show the same person, and the person
// does not change depending on which page you reached them from. So the
// identity, the application, the documents and the screening notes are
// described once, here, and both pages compose it.
//
// WHAT IS NOT HERE is anything that MOVES a candidacy: the status
// control, the division transfer and the offer form all stay with the
// page that owns that decision. This component reads and comments; it
// never advances anybody.
//
// ---------------------------------------------------------------------
// WHAT CHANGED, AND WHY THE ORDER OF THINGS IS THE WHOLE POINT.
// ---------------------------------------------------------------------
// This window is where an entire recruiting round is actually worked
// through, one candidate at a time, a hundred times over. It used to
// open on a block of TEN equally weighted fields - email, phone,
// matriculation number, submitted-at - through which a reviewer had to
// read to reach the three that decide anything: what they study, what
// year they are in, and which division is assessing them.
//
// So the block is now split by the question "does this change a
// decision?". What does stays out. What does not - the contact details,
// which matter when writing to somebody and never when judging them -
// goes behind one line that opens it. Nothing was removed.
//
// THE SAME REASONING PUT THE DOWNLOADS UNDER THE DOCUMENTS. They were a
// pair of buttons in the left column, three feet from the previews they
// belonged to, so the thing you press after reading a CV was nowhere
// near the CV. They now sit under the document they save.
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
  const [moreOpen, setMoreOpen] = useState(false);
  const [emailsOpen, setEmailsOpen] = useState(false);
  const [downloading, setDownloading] = useState<'cv' | 'answer' | null>(null);
  const app = detail.application;

  /**
   * OPENED IN A TAB THAT SAYS WHOSE IT IS.
   *
   * A signed storage URL ends in an object key, so the browser called the
   * tab something like `a3f1...-cv.pdf` and a reviewer with four candidates
   * open could not tell them apart. `openReportInTab` is the wrapper the
   * whole site already uses for reports: it opens a tab it controls, titles
   * it, and names the download to match.
   */
  const openDoc = async (kind: 'cv' | 'answer') => {
    try {
      const url = await signDocumentUrl(session, app.id, kind, 'preview');
      openReportInTab(documentTitle(app, kind), url);
    } catch (e) {
      onError(e instanceof Error ? e.message : 'Could not open the document.');
    }
  };

  // =====================================================================
  // A DOWNLOAD THAT DOES NOT OPEN A TAB, AND SAVES UNDER A NAME.
  // ---------------------------------------------------------------------
  // The old one built an anchor with `target="_blank"` and a `download`
  // attribute. Those two contradict each other: a cross-origin `download`
  // is IGNORED by every browser, and `target="_blank"` then wins, so the
  // press opened a new tab, showed the PDF in it, and if anything was
  // saved it was saved under the storage object key.
  //
  // The file is fetched instead, and saved from a blob on this origin,
  // where `download` is honoured and the name is ours to choose:
  // `CV_Name_Surname.pdf` and `WA_Name_Surname.pdf`. No tab is opened, and
  // the object URL is revoked immediately afterwards.
  // =====================================================================
  const downloadDoc = async (kind: 'cv' | 'answer') => {
    if (downloading) return;
    setDownloading(kind);
    let objectUrl: string | null = null;
    try {
      const url = await signDocumentUrl(session, app.id, kind, 'download');
      const res = await fetch(url);
      if (!res.ok) throw new Error('The document could not be fetched.');
      const blob = await res.blob();
      objectUrl = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = objectUrl;
      a.download = `${documentFileName(app, kind)}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
    } catch (e) {
      onError(e instanceof Error ? e.message : 'Download failed.');
    } finally {
      // Revoked on the next tick: revoking synchronously can cancel the
      // save in browsers that read the blob after the click returns.
      if (objectUrl) setTimeout(() => URL.revokeObjectURL(objectUrl as string), 10_000);
      setDownloading(null);
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

  const linkedIn = safeLinkedInUrl(app.linkedin_url);

  return (
    <div className="font-body">
    <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
      {/* Left: who they are, the page's own controls, then the notes. */}
      <div className="space-y-5">
        {/* ============================================================
            WHAT DECIDES SOMETHING, AT A GLANCE.
            Programme and year say whether they can do the work; the three
            divisions say who is judging them and what they asked for.
            Everything else is one line below.
            ============================================================ */}
        <div>
          <div className="grid grid-cols-2 gap-x-3 gap-y-2.5 text-sm">
            <Info label="Programme" value={app.degree_course} />
            <Info label="Academic year" value={ACADEMIC_YEAR_LABELS[app.academic_year]} />
            <div>
              <div className="text-xs uppercase tracking-wider text-muted-foreground">LinkedIn</div>
              {/* THE ICON, NOT THE ADDRESS. A LinkedIn URL is sixty
                  characters of noise that wrapped over three lines and
                  pushed everything else down the column. The mark is
                  understood by everybody and is one click. The address
                  itself is still shown, as text, under Show more details,
                  because a mistyped one is worth being able to read.
                  `safeLinkedInUrl` still decides whether it is openable:
                  the value comes from the public form unvalidated. */}
              {linkedIn ? (
                <a
                  href={linkedIn}
                  target="_blank"
                  rel="noopener noreferrer"
                  title={`Open ${app.first_name} ${app.surname}'s LinkedIn profile`}
                  aria-label={`Open ${app.first_name} ${app.surname}'s LinkedIn profile`}
                  className="mt-0.5 inline-flex"
                >
                  <img src={linkedinIcon} alt="" width={20} height={20} className="h-5 w-5 object-contain opacity-80 hover:opacity-100" />
                </a>
              ) : (
                <div className="text-muted-foreground">-</div>
              )}
            </div>
            {/* The evaluation reads under the association's own division
                names, because it is the association's decision. The two
                preferences read under the names the APPLICANT saw on the
                form, where "Media and Operations" is one intake. */}
            <Info label="Evaluated for" value={divisionLabels[evaluationDivision(app)]} />
            <Info label="First choice" value={applyDivisionLabel(app.first_choice)} />
            <Info label="Second choice" value={app.second_choice ? applyDivisionLabel(app.second_choice) : '-'} />
          </div>

          <button
            data-ro
            type="button"
            onClick={() => setMoreOpen((v) => !v)}
            aria-expanded={moreOpen}
            className="mt-3 inline-flex items-center gap-1 text-xs text-accent hover:underline"
          >
            <ChevronDown className={`h-3.5 w-3.5 transition-transform ${moreOpen ? 'rotate-180' : ''}`} aria-hidden />
            {moreOpen ? 'Hide extra details' : 'Show more details'}
          </button>

          {moreOpen && (
            <div className="mt-3 grid grid-cols-2 gap-x-3 gap-y-2.5 text-sm border-t border-separator pt-3">
              <Info label="Email" value={app.email} />
              <Info label="Phone" value={app.phone} />
              <Info label="Bocconi ID" value={app.bocconi_id} />
              <Info label="Submitted" value={new Date(app.created_at).toLocaleString()} />
              <Info label="LinkedIn address" value={app.linkedin_url || '-'} link={linkedIn || undefined} />
              {app.interview_division && (
                <Info label="Interviewed by" value={divisionLabels[app.interview_division]} />
              )}
              {app.withdrawn_at && (
                <Info label="Withdrawn on" value={new Date(app.withdrawn_at).toLocaleString()} />
              )}
            </div>
          )}
        </div>

        {children}

        <NoteThread
          notes={detail.notes}
          canAddNotes={canAddNotes}
          notesAllowedInReadOnly={notesAllowedInReadOnly}
          noteText={noteText}
          setNoteText={setNoteText}
          savingNote={savingNote}
          onSubmit={submitNote}
        />

        {/* ============================================================
            THE EMAIL REGISTER, OUT OF THE WAY UNTIL IT IS WANTED.
            It answers one question - did we write, when, and did it
            arrive - and that question is asked about perhaps one
            candidate in twenty. It used to occupy a full-width table
            under every candidate, so nineteen readers in twenty scrolled
            past it. It is one line now, and opens in place.
            ============================================================ */}
        <div>
          <button
            data-ro
            type="button"
            onClick={() => setEmailsOpen((v) => !v)}
            aria-expanded={emailsOpen}
            className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-accent"
          >
            <Mail className="h-3.5 w-3.5" aria-hidden />
            {emailsOpen ? 'Hide emails sent' : 'Emails sent to this candidate'}
            {detail.emails && detail.emails.length > 0 && (
              <span className="text-[11px] text-muted-foreground">({detail.emails.length})</span>
            )}
          </button>
        </div>
      </div>

      {/* Centre and right: the two documents. THEY FILL IN SEPARATELY.
          Each pane carries its own small placeholder while its URL is being
          signed, so a slow document delays itself and nothing else: the
          candidate is readable long before either arrives. */}
      <DocPane
        title="CV preview" url={cvUrl} loading={docsLoading}
        onOpen={() => openDoc('cv')} empty="No CV uploaded"
        onDownload={() => downloadDoc('cv')}
        downloading={downloading === 'cv'}
        downloadLabel="Download CV"
        savesAs={`${documentFileName(app, 'cv')}.pdf`}
      />
      <DocPane
        title="Submitted work preview" url={answerUrl} loading={docsLoading}
        onOpen={() => openDoc('answer')} empty="No document uploaded"
        onDownload={() => downloadDoc('answer')}
        downloading={downloading === 'answer'}
        /* "Download answer", not "Download work": the file is the
           applicant's answer to the written question set by the division,
           and "work" reads as though the society were downloading a
           portfolio of past employment. */
        downloadLabel="Download answer"
        savesAs={`${documentFileName(app, 'answer')}.pdf`}
      />
    </div>

    {emailsOpen && <EmailHistory emails={detail.emails} email={app.email} />}
    </div>
  );
}

// =====================================================================
// THE NOTES, AS A CONVERSATION RATHER THAN A BOX.
// ---------------------------------------------------------------------
// This is the part of the window reviewers actually use, and it was the
// least worked part of it: a warning paragraph, then a 160-pixel scroller
// holding every note in an identical grey rectangle, then a two-row
// textarea. Three reviewers disagreeing about a candidate produced a
// stack of boxes with no shape, inside a scroller shorter than two of
// them.
//
// WHAT CHANGED:
//   * the box to write in comes FIRST, because adding a note is why this
//     section is opened;
//   * the warning is one quiet line under the box rather than a
//     highlighted paragraph above the thread, since it is a standing
//     rule and not news;
//   * the thread is no longer trapped in a short scroller: it grows, and
//     only caps once it is genuinely long;
//   * the author and the date are the emphasis, so a thread can be
//     scanned for who said what;
//   * a line the WORKSPACE wrote is drawn differently from a line a
//     person wrote, because the notes carry opinions and a fact printed
//     as an opinion is read as one.
// =====================================================================
function NoteThread({
  notes, canAddNotes, notesAllowedInReadOnly, noteText, setNoteText, savingNote, onSubmit,
}: {
  notes: CandidateDetail['notes'];
  canAddNotes: boolean;
  notesAllowedInReadOnly: boolean;
  noteText: string;
  setNoteText: (v: string) => void;
  savingNote: boolean;
  onSubmit: () => void;
}) {
  const humanCount = notes.filter((n) => !isSystemNote(n)).length;
  return (
    <div className="space-y-3">
      <div className="flex items-baseline justify-between gap-2">
        <div className="text-xs uppercase tracking-wider text-muted-foreground inline-flex items-center gap-1.5">
          <MessageSquare className="h-3.5 w-3.5" aria-hidden />Notes
        </div>
        <span className="text-[11px] text-muted-foreground">
          {humanCount === 0 ? 'no notes yet' : humanCount === 1 ? '1 note' : `${humanCount} notes`}
        </span>
      </div>

      {canAddNotes && (
        <div className="space-y-1.5" {...(notesAllowedInReadOnly ? { 'data-ro-allow': '' } : {})}>
          <Textarea
            value={noteText}
            onChange={(e) => setNoteText(e.target.value)}
            placeholder="Add a technical, formal note…"
            rows={3}
            className="resize-y"
            /* Ctrl/Cmd+Enter submits, which is the convention for a
               multi-line box whose Enter key has to stay a newline. */
            onKeyDown={(e) => {
              if ((e.metaKey || e.ctrlKey) && e.key === 'Enter' && noteText.trim() && !savingNote) onSubmit();
            }}
          />
          <div className="flex items-center justify-between gap-2">
            <p className="text-[11px] text-muted-foreground">
              Visible to <strong>everyone with access to this page</strong>. Technical and formal remarks only.
            </p>
            <Button size="sm" onClick={onSubmit} disabled={savingNote || !noteText.trim()}>
              {savingNote ? <><Loader2 className="h-3.5 w-3.5 mr-2 animate-spin" />Saving</> : 'Add note'}
            </Button>
          </div>
        </div>
      )}

      <div className="space-y-2 max-h-[26rem] overflow-y-auto pr-1">
        {notes.length === 0 && (
          <p className="text-sm text-muted-foreground">
            Nothing recorded yet. Notes are how the division keeps its reasoning where the next reader can find it.
          </p>
        )}
        {notes.map((n) => (isSystemNote(n) ? (
          /* A LINE THE WORKSPACE WROTE. Deliberately not a card: no
             border, no author block, an icon and a muted line, so it
             reads as something that happened rather than as something
             somebody thinks. */
          <div key={n.id} className="flex items-start gap-2 py-1 text-xs text-muted-foreground">
            <Sparkles className="h-3.5 w-3.5 mt-px shrink-0 text-accent/60" aria-hidden />
            <div>
              <span className="text-foreground/80">{n.body}</span>
              <span className="ml-1.5 whitespace-nowrap">
                · {new Date(n.created_at).toLocaleDateString(undefined, { day: 'numeric', month: 'short' })}
              </span>
            </div>
          </div>
        ) : (
          <div key={n.id} className="border border-separator bg-background p-2.5">
            <div className="flex items-baseline justify-between gap-2 mb-1">
              <span className="text-xs font-medium text-foreground">{n.author_name || 'Unknown'}</span>
              <span className="text-[11px] text-muted-foreground whitespace-nowrap">
                {new Date(n.created_at).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })}
              </span>
            </div>
            <div className="text-sm text-foreground whitespace-pre-wrap break-words">{n.body}</div>
          </div>
        )))}
      </div>
    </div>
  );
}

// =====================================================================
// WHAT THIS CANDIDATE HAS BEEN SENT.
// ---------------------------------------------------------------------
// A candidate who has not replied is the commonest thing a reviewer has
// to make sense of, and the one fact that decides it is whether the
// association actually wrote, when, and whether it arrived.
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

function DocPane({ title, url, loading, onOpen, empty, onDownload, downloading, downloadLabel, savesAs }: {
  title: string; url: string | null; loading: boolean; onOpen: () => void; empty: string;
  onDownload: () => void; downloading: boolean; downloadLabel: string; savesAs: string;
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
      {/* UNDER THE DOCUMENT IT SAVES, and it says what it will be called,
          because a reviewer downloading fifty of these needs to know they
          will be able to tell them apart afterwards. */}
      <div className="mt-2 flex items-center justify-between gap-2">
        <Button data-ro variant="outline" size="sm" onClick={onDownload} disabled={downloading || !url}>
          {downloading
            ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Saving</>
            : <><Download className="h-4 w-4 mr-2" />{downloadLabel}</>}
        </Button>
        <span className="text-[11px] text-muted-foreground truncate" title={savesAs}>{savesAs}</span>
      </div>
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
