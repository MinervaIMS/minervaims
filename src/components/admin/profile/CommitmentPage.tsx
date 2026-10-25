import { useState } from 'react';
import { Link } from 'react-router-dom';
import { CalendarCheck, ExternalLink, FileSignature, Scale, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { CommitmentPanel } from '@/components/admin/CommitmentPanel';
import { DeclarationBody } from '@/components/shared/DeclarationBody';
import {
  ONE_ASSOCIATION, textOfSignature, type DeclarationSwitches, type MyDeclarations, type SignedDocument,
} from '@/lib/declarations-api';
import { BOCCONI_ASSOCIATIONS_URL } from '@/lib/declaration-text';
import { MEMBERSHIP_RULES } from '@/lib/statute-extracts';
import {
  Bullets, Disclosure, EmptyState, ProfileCard, StatusChip, longDate,
} from '@/components/admin/profile/profile-ui';

// =====================================================================
// MY PROFILE, COMMITMENT (Step 97B).
// ---------------------------------------------------------------------
// What you have committed to and signed, with the rules they rest on.
//
// STATUS FIRST. The page opens on the one question that may be waiting:
// this semester's commitment. Waiting, it is the form itself (the
// email's button lands here); answered, it is the answer and its date;
// not asked, it says why. Below it, on the left, every signature the
// member has given, each one readable again word for word; on the right,
// the one-association policy (only while the Board asks for it) and the
// Society Statute, with what it asks of every member.
// =====================================================================

const docTitle = (d: SignedDocument) => (d.kind === 'one_association'
  ? 'One-association declaration'
  : `Semester commitment, ${d.semester_label}`);

const docMeta = (d: SignedDocument) => {
  const how = d.kind === 'one_association'
    ? (d.context === 'offer' ? 'On accepting your offer' : `With your commitment for ${d.semester_label}`)
    : (d.decision === 'declined' ? 'You could not commit' : 'You confirmed your commitment');
  return `${how} · ${longDate(d.signed_at)}`;
};

function ThisSemester({ data, onDone, canSign }: { data: MyDeclarations | null; onDone: () => void; canSign: boolean }) {
  if (!data) {
    return (
      <ProfileCard title="This semester" headingId="cm-now">
        <p className="text-sm text-muted-foreground">Reading your commitment.</p>
      </ProfileCard>
    );
  }
  const campaign = data.campaign;
  const request = data.request;
  if (campaign && request?.status === 'pending' && canSign) {
    return <CommitmentPanel data={data} onDone={onDone} />;
  }
  if (campaign && request && request.status !== 'pending') {
    const confirmed = request.status === 'confirmed';
    return (
      <ProfileCard
        title={`Your commitment for ${campaign.semester_label}`}
        headingId="cm-now"
        action={<StatusChip tone={confirmed ? 'positive' : 'negative'}>{confirmed ? 'Confirmed' : 'Declined'}</StatusChip>}
      >
        <div className="flex items-start gap-3">
          <CalendarCheck className="mt-0.5 h-5 w-5 shrink-0 text-accent" aria-hidden="true" />
          <div className="space-y-1 text-sm leading-relaxed">
            <p className="text-foreground">
              {confirmed ? 'You confirmed your commitment' : 'You told the Board you cannot commit this semester'}
              {request.responded_at ? `, on ${longDate(request.responded_at)}` : ''}. A receipt was sent to your email address.
            </p>
            <p className="text-muted-foreground">
              {confirmed
                ? 'If you can no longer take part during the semester, tell your Head of Division or the Board at once.'
                : 'The Board will contact you about what it means for your membership, such as a semester of leave (Article 9 of the Statute).'}
            </p>
          </div>
        </div>
      </ProfileCard>
    );
  }
  return (
    <ProfileCard title="This semester" headingId="cm-now" action={<StatusChip tone="neutral">Nothing to answer</StatusChip>}>
      <div className="flex items-start gap-3">
        <CalendarCheck className="mt-0.5 h-5 w-5 shrink-0 text-muted-foreground" aria-hidden="true" />
        <p className="text-sm leading-relaxed text-muted-foreground">
          {campaign
            ? `You were not asked to confirm your commitment for ${campaign.semester_label}: the request went to the members on the register when it was sent, and Advisors are not asked.`
            : 'Every active member is asked once a semester, when the application window opens. The request arrives by email and waits here, and on your Dashboard, until you answer.'}
        </p>
      </div>
    </ProfileCard>
  );
}

function SignedList({ docs }: { docs: SignedDocument[] }) {
  // The document stays set while the dialog closes, so its words do not
  // change under the reader during the fade.
  const [open, setOpen] = useState<SignedDocument | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const text = open ? textOfSignature(open.text_version, open.semester_label, open.decision) : null;
  return (
    <ProfileCard
      title="What you have signed"
      headingId="cm-signed"
      action={docs.length > 0 ? <span className="text-xs text-muted-foreground tabular-nums">{docs.length}</span> : undefined}
    >
      {docs.length === 0 ? (
        <EmptyState icon={<FileSignature className="h-5 w-5" />} title="Nothing signed yet">
          Your semester commitments and, where it is asked, the one-association declaration are listed here, each with the
          words you signed, your typed name and the date.
        </EmptyState>
      ) : (
        <>
          <ul id="signed-documents" className="divide-y divide-separator">
            {docs.map((d) => (
              <li key={d.id} className="flex items-start gap-3 py-3 first:pt-0 last:pb-0">
                <FileSignature className="mt-0.5 h-4 w-4 shrink-0 text-accent" aria-hidden="true" />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-foreground">{docTitle(d)}</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">{docMeta(d)}</p>
                </div>
                <Button data-ro type="button" size="sm" variant="outline" onClick={() => { setOpen(d); setIsOpen(true); }} aria-label={`Read ${docTitle(d)}`}>
                  Read
                </Button>
              </li>
            ))}
          </ul>
          <p className="mt-4 border-t border-separator pt-3 text-xs leading-relaxed text-muted-foreground">
            The signature in the Workspace is the record: there is no PDF and nobody countersigns it. Signatures are kept while
            you are a member and for twelve months after, as the Privacy Policy says.
          </p>
        </>
      )}
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="font-serif text-accent">{text?.title ?? 'What you signed'}</DialogTitle>
            <DialogDescription>
              {open ? `Signed by ${open.typed_name} on ${longDate(open.signed_at)}, text version ${open.text_version}.` : ''}
            </DialogDescription>
          </DialogHeader>
          {text ? (
            <DeclarationBody text={text} className="space-y-2 border border-separator p-3 text-sm text-foreground" />
          ) : (
            <p className="text-sm text-muted-foreground">This version of the text is no longer shown here; ask the Board for it.</p>
          )}
        </DialogContent>
      </Dialog>
    </ProfileCard>
  );
}

function PolicyCard({ switches, data }: { switches: DeclarationSwitches; data: MyDeclarations | null }) {
  const signed = (data?.documents ?? []).filter((d) => d.kind === 'one_association');
  const latest = signed[0];
  const pendingWithCommitment = switches.declaration_at_commitment && data?.request?.status === 'pending' && !data.declarationSigned;
  const status = latest
    ? <StatusChip tone="positive">Signed</StatusChip>
    : pendingWithCommitment ? <StatusChip tone="waiting">With your commitment</StatusChip> : undefined;
  return (
    <ProfileCard title="One association at a time" headingId="cm-policy" action={status}>
      <div className="space-y-3 text-sm leading-relaxed">
        <div className="flex items-start gap-3">
          <Users className="mt-0.5 h-5 w-5 shrink-0 text-accent" aria-hidden="true" />
          <p className="text-foreground/85">
            Members do not belong, at the same time, to another Bocconi student association in the categories Management,
            Finance, or Economics and Social Sciences, as Bocconi lists its student associations. Minerva IMS is listed under
            Finance. The Board of Directors has made this a condition of membership.
          </p>
        </div>
        <p className="text-muted-foreground">
          {latest
            ? `You signed the declaration on ${longDate(latest.signed_at)}${latest.context === 'semester' ? `, with your commitment for ${latest.semester_label}` : ', on accepting your offer'}.`
            : pendingWithCommitment
              ? 'You sign it with your commitment for this semester, above, as a separate signature.'
              : switches.declaration_at_commitment
                ? 'Members sign it with their semester commitment.'
                : 'New members sign it when they accept their offer.'}
        </p>
        <p>
          <a href={BOCCONI_ASSOCIATIONS_URL} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-accent underline underline-offset-2">
            Bocconi’s list of student associations<ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
            <span className="sr-only"> (opens in a new tab)</span>
          </a>
        </p>
        <Disclosure title="Read the declaration" meta={ONE_ASSOCIATION.version}>
          <DeclarationBody text={ONE_ASSOCIATION} className="space-y-2 text-sm text-foreground" />
        </Disclosure>
      </div>
    </ProfileCard>
  );
}

function StatuteCard() {
  return (
    <ProfileCard
      title="Society Statute"
      headingId="cm-statute"
      action={(
        <Button asChild size="sm" variant="solid">
          <Link to="/statute" target="_blank" rel="noopener noreferrer">
            Open<ExternalLink aria-hidden="true" /><span className="sr-only"> the statute (opens in a new tab)</span>
          </Link>
        </Button>
      )}
    >
      <div className="flex items-start gap-3">
        <Scale className="mt-0.5 h-5 w-5 shrink-0 text-accent" aria-hidden="true" />
        <p className="text-sm leading-relaxed text-foreground/85">
          The authoritative reference for the Society’s rules: roles, governance, eligibility, progression, and what every
          member commits to. Your semester commitment rests on Article 8.
        </p>
      </div>
      <div className="mt-4">
        <Disclosure title="What every member commits to" meta="Artt. 4, 7, 8">
          <Bullets items={MEMBERSHIP_RULES.duties} />
        </Disclosure>
        <Disclosure title="Taking a semester of leave" meta="Art. 9">
          <p className="text-sm leading-relaxed text-foreground/85">{MEMBERSHIP_RULES.leave}</p>
        </Disclosure>
        <Disclosure title="Grounds for expulsion" meta="Art. 9">
          <Bullets items={MEMBERSHIP_RULES.expulsion} />
          {/* The grounds without the procedure read far harsher than the
              statute is: there is a warning and thirty days to put it
              right before anything is resolved. */}
          <p className="mt-2 text-xs leading-relaxed text-muted-foreground">{MEMBERSHIP_RULES.expulsionProcedure}</p>
        </Disclosure>
        <Disclosure title="Report publication and blocking" meta="Artt. 14, 17">
          <p className="text-sm leading-relaxed text-foreground/85">{MEMBERSHIP_RULES.publicationControl}</p>
        </Disclosure>
      </div>
    </ProfileCard>
  );
}

export function CommitmentPage({ data, onDone, switches, canSign }: {
  data: MyDeclarations | null;
  onDone: () => void;
  switches: DeclarationSwitches | null;
  /** False for the association account, which signs nothing. */
  canSign: boolean;
}) {
  const policyActive = !!switches && (switches.declaration_at_offer || switches.declaration_at_commitment);
  return (
    <div className="space-y-4">
      <ThisSemester data={data} onDone={onDone} canSign={canSign} />
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-12 lg:items-start">
        <div className="min-w-0 lg:col-span-7">
          <SignedList docs={data?.documents ?? []} />
        </div>
        <div className="min-w-0 space-y-4 lg:col-span-5">
          {policyActive && switches && <PolicyCard switches={switches} data={data} />}
          <StatuteCard />
        </div>
      </div>
    </div>
  );
}
