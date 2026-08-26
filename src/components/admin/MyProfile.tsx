import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
// ScrollText, TrendingUp and LifeBuoy have gone with the card headings they
// decorated; UserIcon stays because it is the empty state of the photograph,
// which is a picture rather than an ornament.
import {
  Loader2, Upload, Download, Trash2, User as UserIcon, AlertCircle, ExternalLink,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { useAccess } from '@/hooks/useAccess';
import { roleLabel as composeRoleLabel, divisionLabels } from '@/lib/roles';
import {
  roleGuideFor, MEMBERSHIP_RULES, promotionFor, MERIT_NOTE, MERIT_FACTORS,
} from '@/lib/statute-extracts';
import { getMyMember, updateMyProfile, uploadMyPhoto, type MemberRow } from '@/lib/members-api';
import { getMyApplication, ACADEMIC_YEAR_LABELS, type ApplicationRow } from '@/lib/applications-api';
import { WorkspacePageHeader } from '@/components/admin/WorkspacePageHeader';
import { useIsDesktop } from '@/hooks/use-desktop';
import { WorkspaceLoader } from '@/components/admin/WorkspaceLoader';
import { CandidateDocRow } from '@/components/admin/recruiting/CandidateDocRow';

function Field({ label, value }: { label: string; value: string }) {
  return (
    // `min-w-0` and `break-words` together: an email address is one unbroken
    // token, and without both of them it sets the card's minimum width and
    // everything else is pushed out of the frame with it.
    <div className="min-w-0">
      <div className="text-xs uppercase tracking-wider text-muted-foreground mb-1">{label}</div>
      <div className="text-foreground text-sm break-words">{value || 'Not set'}</div>
    </div>
  );
}

function Bullets({ items }: { items: string[] }) {
  return (
    <ul className="space-y-2">
      {items.map((t, i) => (
        <li key={i} className="flex gap-2.5 text-sm text-foreground leading-relaxed">
          <span aria-hidden className="mt-[7px] w-1.5 h-1.5 bg-accent shrink-0" />
          <span className="text-foreground/85">{t}</span>
        </li>
      ))}
    </ul>
  );
}

// =====================================================================
// The profile is built from ONE card shape, used at two weights.
// ---------------------------------------------------------------------
// The three columns of the page differ in what they carry, not in how
// they are drawn: the same rounded container, the same hairline, the
// same padding and the same serif heading, so the page reads as one
// instrument rather than as a stack of unrelated panels. Rounded
// corners and the separator hairline are the workspace's own card, as
// used on the Dashboard.
// =====================================================================

function ProfileCard({ title, titleItalic = false, subtitle, action, children, className = '', scrollBody = false }: {
  title: string;
  /** Set the heading in italic. Used where the title is a person's role. */
  titleItalic?: boolean;
  /**
   * The line that qualifies the title - a division, an organ, a body.
   *
   * IT BELONGS TO THE HEADER, NOT TO THE BODY, and that is the whole reason
   * this prop exists. The role card used to print its division as the first
   * line INSIDE the scrolling body, pulled up with a negative margin to sit
   * close to the heading. A negative margin inside an `overflow: auto` box is
   * simply outside the box: the top of the word was clipped by the scroll
   * container, so "BOARD" arrived as a row of half-letters under the rule.
   *
   * Here it is part of the fixed header block. It cannot be clipped, it does
   * not scroll away, and it works for any role and any division without the
   * geometry having to be tuned for a particular word.
   */
  subtitle?: string;
  /** A single action, aligned to the right of the heading. */
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  /**
   * On a laptop, let the card's CONTENT scroll inside it.
   *
   * The page is fixed on desktop (see the note at the foot of this file), so a
   * card whose content is longer than its share of the viewport has to carry
   * that content itself rather than lengthening the page. The heading stays
   * put and only the body moves, which is what keeps the card readable while
   * it is being scrolled.
   *
   * Below `lg` this does nothing at all: the phone layout stacks the cards at
   * their natural height and the page scrolls normally, as it always has.
   */
  scrollBody?: boolean;
}) {
  return (
    <section
      className={`w-full rounded-xl border border-separator bg-background p-5 sm:p-6 ${
        scrollBody ? 'flex flex-col lg:min-h-0' : ''
      } ${className}`}
    >
      {/* The header block: title, its qualifier and one action. `shrink-0`
          keeps it out of the flex distribution, so it is a fixed anchor at
          the top of the card however short the card becomes. */}
      <div className="mb-4 pb-3 border-b border-separator shrink-0">
        <div className="flex items-start justify-between gap-3">
          {/* `titleItalic` is for the card whose heading is a ROLE rather than
              a section name: "President" is the person's title, and a title
              is set in italic. The other cards keep the upright serif. */}
          <h2 className={`font-serif text-xl text-accent leading-tight min-w-0 ${titleItalic ? 'italic' : ''}`}>{title}</h2>
          {action && <div className="shrink-0">{action}</div>}
        </div>
        {subtitle && (
          <div className="mt-1.5 text-xs uppercase tracking-wider text-muted-foreground">{subtitle}</div>
        )}
      </div>
      {scrollBody ? (
        // `-mr-2 pr-2` keeps the thin bar clear of the text without moving the
        // text: the padding it adds is taken straight back off the margin, so
        // the card's inner measure is unchanged whether or not a bar appears.
        <div className="lg:ws-card-scroll lg:min-h-0 lg:-mr-2 lg:pr-2">{children}</div>
      ) : (
        children
      )}
    </section>
  );
}

/** A hairline-topped group inside a card, for its secondary sections. */
function Group({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <section>
      <div className="text-[11px] uppercase tracking-wider text-accent font-semibold mb-2 pb-1.5 border-b border-separator">
        {label}
      </div>
      {children}
    </section>
  );
}

export default function MyProfile() {
  const { user, session } = useAuth();
  const { primaryRole, primaryDivision, isCandidate } = useAccess();
  const { toast } = useToast();

  const [loading, setLoading] = useState(true);
  const [member, setMember] = useState<MemberRow | null>(null);
  const [candidateApp, setCandidateApp] = useState<ApplicationRow | null>(null);
  const [phone, setPhone] = useState('');
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const roleText = primaryRole ? composeRoleLabel(primaryRole, primaryDivision) : isCandidate ? 'Candidate' : 'No role';
  const divisionText = primaryDivision && primaryDivision !== 'none' ? divisionLabels[primaryDivision] : 'Board';
  const guide = primaryRole ? roleGuideFor(primaryRole) : null;
  // My profile is read-only in the mobile shell: no photo or phone editing.
  const isDesktop = useIsDesktop();
  const email = member?.email || user?.email || '';

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const res = await getMyMember(session);
        if (!active) return;
        setMember(res.member);
        setPhone(res.member?.phone ?? '');
        setPhotoUrl(res.member?.photo_url ?? null);
        // Candidates have no member record; load their application to complete
        // the profile (name, LinkedIn, phone, etc.).
        if (!res.member && isCandidate) {
          try { const app = await getMyApplication(); if (active) setCandidateApp(app); } catch { /* ignore */ }
        }
      } catch (e) {
        console.error(e);
        toast({ title: 'Could not load your profile', variant: 'destructive' });
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => { active = false; };
  }, [session, toast, isCandidate]);

  const handleUpload = async (file: File) => {
    if (!file.type.startsWith('image/')) { toast({ title: 'Please choose an image', variant: 'destructive' }); return; }
    setUploading(true);
    try {
      const url = await uploadMyPhoto(session, file);
      setPhotoUrl(url);
      // Persist immediately if a phone number is already present.
      if (phone.trim().length >= 3) {
        const updated = await updateMyProfile(session, { phone: phone.trim(), photo_url: url });
        setMember(updated);
      }
      toast({ title: 'Photo updated' });
    } catch (e) {
      toast({ title: 'Upload failed', description: e instanceof Error ? e.message : undefined, variant: 'destructive' });
    } finally { setUploading(false); }
  };

  const handleDeletePhoto = async () => {
    if (phone.trim().length < 3) { setPhotoUrl(null); toast({ title: 'Photo removed', description: 'Add your phone number and save to apply.' }); return; }
    try {
      const updated = await updateMyProfile(session, { phone: phone.trim(), photo_url: null });
      setMember(updated); setPhotoUrl(null);
      toast({ title: 'Photo removed' });
    } catch (e) { toast({ title: 'Could not remove', description: e instanceof Error ? e.message : undefined, variant: 'destructive' }); }
  };

  const handleDownloadPhoto = async () => {
    if (!photoUrl) return;
    try {
      const res = await fetch(photoUrl);
      const blob = await res.blob();
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `${member?.first_name || 'profile'}_${member?.surname || 'photo'}.jpg`;
      document.body.appendChild(a); a.click(); a.remove();
    } catch { window.open(photoUrl, '_blank'); }
  };

  const handleSave = async () => {
    if (phone.trim().length < 3) { toast({ title: 'Phone number required', description: 'A phone number is required and cannot be removed.', variant: 'destructive' }); return; }
    setSaving(true);
    try {
      const updated = await updateMyProfile(session, { phone: phone.trim(), photo_url: photoUrl });
      setMember(updated);
      toast({ title: 'Profile updated' });
    } catch (e) {
      toast({ title: 'Could not save', description: e instanceof Error ? e.message : undefined, variant: 'destructive' });
    } finally { setSaving(false); }
  };

  if (loading) {
    return <div><WorkspacePageHeader title="My profile" description="Your account details and current workspace role." /><WorkspaceLoader /></div>;
  }

  // Candidate profile: no member record yet, populated from the application.
  //
  // THIS IS WHERE AN APPLICANT'S OWN SUBMISSION LIVES NOW. The documents and
  // the division preferences used to sit inside Applications, Status, which is
  // the page about what happens NEXT; what a candidate SENT belongs to their
  // profile. Status keeps the process, this page keeps the submission, and
  // neither repeats the other.
  //
  // Three plain groups, in the order a candidate thinks about them: who they
  // are, what they asked for, and what they attached. Everything is read from
  // their own application - `getMyApplication` resolves it from the session
  // and takes no id - so no candidate can address another's record.
  if (isCandidate) {
    const app = candidateApp;
    return (
      <div>
        <WorkspacePageHeader
          title="My profile"
          description={app?.semester_label
            ? `Your application for ${app.semester_label}. These details come from the form you submitted and cannot be edited here.`
            : 'Your applicant account. These details come from your application and cannot be edited here.'}
        />
        <div className="max-w-4xl space-y-6 font-body">
          {/* 1. Who you are. */}
          <section>
            <h2 className="mb-3 border-b border-separator pb-2 font-serif text-lg text-accent">Your details</h2>
            <div className="grid grid-cols-1 gap-x-6 gap-y-5 sm:grid-cols-2">
              <Field label="First name" value={app?.first_name ?? ''} />
              <Field label="Surname" value={app?.surname ?? ''} />
              <Field label="Email" value={app?.email || email} />
              <Field label="Phone number" value={app?.phone ?? ''} />
              <Field label="Bocconi ID" value={app?.bocconi_id ?? ''} />
              <Field label="Role" value="Applicant" />
              <div className="sm:col-span-2">
                <div className="mb-1 text-xs uppercase tracking-wider text-muted-foreground">LinkedIn</div>
                {app?.linkedin_url
                  ? <a href={app.linkedin_url} target="_blank" rel="noopener noreferrer" className="break-all text-sm text-accent underline">{app.linkedin_url}</a>
                  : <div className="text-sm text-foreground">Not set</div>}
              </div>
            </div>
          </section>

          {/* 2. What you asked for. Every value is shown in the words the
                 website uses, never as a stored key. */}
          <section>
            <h2 className="mb-3 border-b border-separator pb-2 font-serif text-lg text-accent">Your application</h2>
            <div className="grid grid-cols-1 gap-x-6 gap-y-5 sm:grid-cols-2">
              <Field label="Programme" value={app?.degree_course ?? ''} />
              <Field label="Academic year" value={app ? ACADEMIC_YEAR_LABELS[app.academic_year] : ''} />
              <Field label="First choice division" value={app ? divisionLabels[app.first_choice] : ''} />
              <Field label="Second choice division" value={app?.second_choice ? divisionLabels[app.second_choice] : 'None'} />
              {app?.interview_division && (
                <Field label="Interview division" value={divisionLabels[app.interview_division]} />
              )}
              <Field label="Submitted" value={app ? new Date(app.created_at).toLocaleString() : ''} />
            </div>
          </section>

          {/* 3. What you attached. */}
          <section>
            <h2 className="mb-3 border-b border-separator pb-2 font-serif text-lg text-accent">Your documents</h2>
            <div className="space-y-2">
              <CandidateDocRow label="Curriculum Vitae (CV)" kind="cv" present={!!app?.cv_path} session={session} />
              <CandidateDocRow label="Written answer" kind="answer" present={!!app?.answer_path} session={session} />
            </div>
            <p className="mt-2 text-xs text-muted-foreground">
              You can preview and download what you submitted. Your application and its documents cannot be changed or replaced; if you need a correction, contact the association.
            </p>
          </section>

          <Card><CardContent className="py-5">
            <div className="mb-2 text-xs uppercase tracking-wider text-muted-foreground">You are an applicant</div>
            <p className="text-sm leading-relaxed text-foreground">
              Follow your application in <strong>My Application → Status</strong>. If you are invited to interview, you will be able to book a slot in <strong>My Application → Interview Calendar</strong>. Questions about the process are answered in <strong>FAQs</strong>. Once you accept an offer to join, this page becomes your full member profile.
            </p>
          </CardContent></Card>
        </div>
      </div>
    );
  }

  // ===================================================================
  // MEMBER PROFILE. Everything below this line is the NON-CANDIDATE
  // page: the candidate branch above returned already, so a candidate
  // can never reach this layout. The distinction is made on the access
  // hook's `isCandidate`, which reads the role, not on any visual test.
  // ===================================================================

  const missingPhone = !!member && phone.trim().length < 3;
  const missingEmail = !email;
  const dirty = !!member && (phone.trim() !== (member.phone ?? '') || (photoUrl ?? '') !== (member.photo_url ?? ''));
  const promotion = primaryRole ? promotionFor(primaryRole) : null;

  // --- left column: who you are ---------------------------------------
  const personalCard = (
    <ProfileCard title="Personal Information" scrollBody>
      {(missingPhone || missingEmail) && (
        <div className="mb-5 flex items-start gap-2 border border-amber-300 bg-amber-50 px-3.5 py-2.5 text-sm text-amber-800">
          <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
          <span>
            {missingPhone && missingEmail ? 'Please add your phone number and email address to continue.'
              : missingPhone ? 'Please add your phone number to continue.'
              : 'Please add your email address to continue.'}
          </span>
        </div>
      )}

      {member ? (
        <div className="space-y-6">
          {/* The picture keeps its own controls, its own rules and its own
              desktop-only editing. Nothing about how it is uploaded,
              replaced, removed or stored changes here: only where it sits. */}
          <div className="flex flex-col xl:flex-row gap-5">
            <div className="shrink-0">
              <div className="w-40 xl:w-36 aspect-square rounded-lg border border-separator bg-muted/40 overflow-hidden flex items-center justify-center">
                {photoUrl
                  ? <img src={photoUrl} alt="Profile" className="w-full h-full object-cover" />
                  : <UserIcon className="h-12 w-12 text-muted-foreground" />}
              </div>
              <input ref={fileRef} type="file" accept="image/*" className="hidden"
                onChange={(e) => { const f = e.target.files?.[0]; if (f) handleUpload(f); e.target.value = ''; }} />
              {isDesktop && (
                <div className="mt-3 flex flex-wrap gap-2 w-40 xl:w-36">
                  <Button variant="outline" size="sm" disabled={uploading} onClick={() => fileRef.current?.click()} title="Upload a new picture">
                    {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                  </Button>
                  <Button variant="outline" size="sm" disabled={!photoUrl} onClick={handleDownloadPhoto} title="Download"><Download className="h-4 w-4" /></Button>
                  <Button variant="outline" size="sm" disabled={!photoUrl} onClick={handleDeletePhoto} title="Remove"><Trash2 className="h-4 w-4" /></Button>
                </div>
              )}
            </div>

            {/* NAME AND SURNAME ARE READ-ONLY, as they have always been:
                they come from the association register and are changed
                there, not here. Presenting them in a new place does not
                make them editable.

                THEY ARE STACKED, NOT SIDE BY SIDE. Beside the photograph
                this column is only as wide as the card minus 164px, which
                on a 1280 or 1440 screen is about 145 to 190px; halving
                that gave each name roughly 62px, and at 62px the WORDS OF
                THE LABEL wrapped - "FIRST NAME" arrived as two lines above
                a one-word value. One field per line uses the whole of the
                narrow column and cannot wrap at any card width.

                `xl:justify-center` sets the pair against the middle of the
                portrait rather than its top edge, so the space the picture
                is taller by falls evenly above and below the name instead
                of collecting underneath it as a void. */}
            <div className="flex-1 min-w-0 space-y-4 xl:flex xl:flex-col xl:justify-center xl:gap-4 xl:space-y-0">
              <Field label="First name" value={member.first_name} />
              <Field label="Surname" value={member.surname} />
            </div>
          </div>

          {/* =========================================================
              EMAIL AND PHONE RUN THE FULL WIDTH OF THE CARD.

              The email address used to sit in the narrow column beside
              the photograph, and an address is a single unbroken token:
              at 1440 it had 193px to fit 32 characters and broke across
              two lines, splitting the domain in the middle. There is no
              width at which that column is reliably wide enough, because
              its width is the card's minus the picture's.

              Below the picture it has the card's whole measure - 337px at
              1920, 359 at 1440, 311 at 1280 - and sets on one line at all
              three. The wrapping guard on `Field` stays as the last
              resort for an unusually long address.
              ========================================================= */}
          <Field label="Email" value={email} />

          {/* The one editable field, on the one surface that may edit it.

              ITS LABEL IS NOW THE SAME LABEL AS EVERY OTHER ROW'S. It read
              "PHONE NUMBER (REQUIRED)" in a component whose own line-height
              is `none`, so it was both the longest label in the card and
              the only one sitting on a different baseline - which is what
              made this one row look bolted on rather than part of the
              sequence. The word "required" is still there, in the hint
              beneath, where an instruction belongs. */}
          {isDesktop ? (
            <div className="min-w-0">
              <Label
                htmlFor="phone"
                className="mb-1 block text-xs font-normal uppercase leading-normal tracking-wider text-muted-foreground"
              >
                Phone number
              </Label>
              <Input
                id="phone"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="e.g. +39 333 000 0000"
                aria-describedby="phone-hint"
                className="h-9 text-sm"
              />
              <p id="phone-hint" className="mt-1.5 text-xs text-muted-foreground">
                Required. The association uses it to reach you.
              </p>
            </div>
          ) : (
            <Field label="Phone number" value={phone || '-'} />
          )}

          <div className="grid grid-cols-2 gap-x-5 gap-y-4 pt-1">
            <Field label="Role" value={roleText} />
            <Field label="Division" value={divisionText} />
          </div>

          {isDesktop ? (
            <Button onClick={handleSave} disabled={saving || !dirty}>
              {saving ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Saving</> : 'Save changes'}
            </Button>
          ) : (
            <p className="text-xs text-muted-foreground">
              Editing your phone number and picture is available on desktop.
            </p>
          )}

          <p className="text-xs text-muted-foreground leading-relaxed border-t border-separator pt-4">
            Your name, email and role come from the association register and are maintained by the
            President or the Admin. Your picture is also used on the public Members page.
          </p>
        </div>
      ) : (
        // The association account: no member record to edit, so the card
        // states what it knows and offers no controls that would fail.
        <div className="space-y-4">
          <Field label="Email" value={email} />
          <Field label="Role" value={roleText} />
          <p className="text-xs text-muted-foreground leading-relaxed border-t border-separator pt-4">
            This account has no member record, so there is nothing to edit here.
          </p>
        </div>
      )}
    </ProfileCard>
  );

  // --- centre column: the role, named by the role itself ---------------
  const roleCard = (
    // The central card: the one most likely to outrun its share of a laptop
    // screen, because a Head's responsibilities and guidance run long.
    <ProfileCard title={roleText} titleItalic subtitle={divisionText || undefined} scrollBody>
      {guide ? (
        <div className="space-y-6">
          <p className="text-sm text-foreground leading-relaxed border-l-2 border-accent bg-accent/[0.05] px-4 py-3">
            {guide.summary}
          </p>

          <Group label="Your responsibilities"><Bullets items={guide.responsibilities} /></Group>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <Group label="You report to">
              <p className="text-sm text-foreground/85 leading-relaxed">{guide.reportsTo}</p>
            </Group>
            {guide.oversees && (
              <Group label="You coordinate">
                <p className="text-sm text-foreground/85 leading-relaxed">{guide.oversees.join(', ')}</p>
              </Group>
            )}
          </div>

          <Group label="Your rights"><Bullets items={guide.rights} /></Group>

          <Group label="Your duties as a member"><Bullets items={MEMBERSHIP_RULES.duties} /></Group>

          <div className="space-y-4 border-t border-separator pt-5">
            <div>
              <div className="text-xs uppercase tracking-wider text-muted-foreground mb-1.5">Grounds for expulsion</div>
              <Bullets items={MEMBERSHIP_RULES.expulsion} />
              {/* The grounds without the procedure read far harsher than the
                  statute is: there is a warning and thirty days to put it
                  right before anything is resolved. */}
              <p className="mt-2 text-xs text-muted-foreground leading-relaxed">{MEMBERSHIP_RULES.expulsionProcedure}</p>
            </div>
            <div>
              <div className="text-xs uppercase tracking-wider text-muted-foreground mb-1">Taking a semester of leave</div>
              <p className="text-sm text-foreground/80 leading-relaxed">{MEMBERSHIP_RULES.leave}</p>
            </div>
            <div>
              <div className="text-xs uppercase tracking-wider text-muted-foreground mb-1">Report publication and blocking</div>
              <p className="text-sm text-foreground/80 leading-relaxed">{MEMBERSHIP_RULES.publicationControl}</p>
            </div>
          </div>
        </div>
      ) : (
        <p className="text-sm text-muted-foreground leading-relaxed">
          The statute does not define a brief for this role. The association statute remains the
          reference for the duties and rights attached to it.
        </p>
      )}
    </ProfileCard>
  );

  // --- right column: statute, progression, support ---------------------
  const statuteCard = (
    // THE ACTION SITS BESIDE THE TITLE. It used to be an outline button at the
    // foot of the paragraph, which put the one thing this card exists for
    // below the explanation of why it exists, and gave it the weight of a
    // secondary control. In the header it is the first thing the eye reaches
    // after the heading, and it costs the body no height at all.
    //
    // THE FILLED PAIRING, WHICH IS NOT THE BUTTON'S DEFAULT. The shadcn
    // `default` variant in this project is white with an accent border and
    // fills on hover, so asking for "the deep purple button" by leaving the
    // variant alone would have produced a white one. `bg-accent` with
    // `text-accent-foreground` is the workspace's own filled pairing - the
    // mobile header, the help drawer's title band and every active toggle
    // use exactly these two tokens - and the hover inverts to the resting
    // state of the outline button, which is the site's button language.
    // No new variant, no new class: the same `<Button>`, in the palette the
    // workspace already owns.
    <ProfileCard
      title="Society Statute"
      scrollBody
      className="lg:shrink-0"
      action={
        <Button
          asChild
          size="sm"
          className="font-body bg-accent text-accent-foreground border border-accent hover:bg-background hover:text-accent"
        >
          <Link to="/statute" target="_blank" rel="noopener noreferrer">
            Open the statute <ExternalLink className="h-4 w-4 ml-1.5" />
          </Link>
        </Button>
      }
    >
      <p className="text-sm text-foreground/85 leading-relaxed">
        The statute is the authoritative reference for the association&rsquo;s formal rules: roles,
        responsibilities, governance, eligibility and the requirements for progression. It is the
        document every rule on this page is drawn from.
      </p>
    </ProfileCard>
  );

  const promotionCard = (
    // Criteria, appointment note and statute references: the tallest of the
    // three cards in the right-hand column, and the other one that scrolls.
    <ProfileCard title="Role Promotion" scrollBody className="lg:flex-1 lg:min-h-[12rem]">
      {promotion ? (
        <div className="space-y-4">
          <div>
            <div className="text-[11px] uppercase tracking-wider text-accent font-semibold mb-1">Next office</div>
            <p className="text-sm text-foreground leading-relaxed">{promotion.next}</p>
          </div>

          <div>
            <div className="text-[11px] uppercase tracking-wider text-accent font-semibold mb-2">
              What the statute requires
            </div>
            <Bullets items={promotion.criteria} />
          </div>

          {promotion.appointment && (
            <p className="text-xs text-muted-foreground leading-relaxed">{promotion.appointment}</p>
          )}

          {/* FORMAL ELIGIBILITY, THEN MERIT. The two are separated on
              purpose: the list above is the gate, this is what decides. */}
          <div className="border-t border-separator pt-4">
            <div className="text-[11px] uppercase tracking-wider text-accent font-semibold mb-2">
              And then, merit
            </div>
            <p className="text-sm text-foreground/85 leading-relaxed mb-2.5">{MERIT_NOTE}</p>
            <Bullets items={MERIT_FACTORS} />
          </div>

          <p className="text-xs text-muted-foreground border-t border-separator pt-3">
            Source: association statute, {promotion.articles}.
          </p>
        </div>
      ) : (
        // THE TOP OF THE STRUCTURE STILL HAS SOMETHING TO READ. For a
        // President or an Admin there is no next office, and the card used to
        // be a single sentence stretched over a column's worth of height.
        // What the statute says about the office instead is how it is judged,
        // which is the same three factors that decide every progression - so
        // the card carries them rather than empty space. MERIT_NOTE stays out
        // of this branch: it is explicitly about promotion, and there is none.
        <div className="space-y-4">
          <p className="text-sm text-foreground/85 leading-relaxed">
            The statute defines no office above the one you hold. Its articles remain the reference
            for the term of your office and for how it is renewed.
          </p>
          <div className="border-t border-separator pt-4">
            <div className="text-[11px] uppercase tracking-wider text-accent font-semibold mb-2">
              How the office is judged
            </div>
            <Bullets items={MERIT_FACTORS} />
          </div>
        </div>
      )}
    </ProfileCard>
  );

  // ===================================================================
  // THE PAGE. Three areas on a wide screen: who you are, what your role
  // is, and the three shorter references beside them. Below `lg` the
  // same cards stack in the same order, at full width, so a phone reads
  // the page top to bottom instead of scrolling a compressed grid
  // sideways. Nothing is laid out in fixed pixels.
  //
  // ON A LAPTOP THE PAGE ITSELF DOES NOT SCROLL, in the manner of the
  // Dashboard. The composition is one screen: the header, then three
  // columns filling the height that is left. What outruns that height is
  // carried INSIDE the card it belongs to - the role card and the Role
  // Promotion card each scroll their own body - so the three columns
  // never slide out of alignment with each other and the reader never
  // loses the shape of the page while reading one part of it.
  //
  // `lg:h-full` resolves because the workspace's content pane is a flex
  // child with a definite height; `lg:min-h-0` is what allows a flex item
  // to be SHORTER than its content, which is the whole mechanism - without
  // it the grid would grow and the pane would scroll after all.
  //
  // Every one of those rules is prefixed `lg:`. Below that breakpoint the
  // page has no height constraint, no card scrolls internally, and the
  // stacked layout scrolls normally, exactly as it did before.
  // ===================================================================
  return (
    <div className="font-body lg:flex lg:h-full lg:min-h-0 lg:flex-col">
      {/* NO PAGE HEADER. The title said "My profile" on a page reached by
          clicking My profile, under a breadcrumb that already reads
          Minerva Workspace / My Profile, above a subtitle describing what
          the three cards below it plainly are. Three lines and a rule, at
          the top of a composition whose whole difficulty is that it has to
          fit the screen. The breadcrumb belongs to the workspace shell and
          stays; the cards are now the first thing on the page. */}

      {/* 30 / 40 / 20 in twelve columns is not expressible, so the grid is
          TEN columns: 3 / 4 / 3 is exactly 30 / 40 / 30. The left and right
          columns are equal, and the centre - which carries by far the most
          text - takes the extra tenth from each of them.

          Below `lg` this collapses to one column and every card takes its
          natural height, as before. */}
      <div className="grid grid-cols-1 lg:grid-cols-10 gap-4 lg:min-h-0 lg:flex-1 lg:items-stretch">
        <div className="lg:col-span-3 min-w-0 flex lg:min-h-0">{personalCard}</div>
        <div className="lg:col-span-4 min-w-0 flex lg:min-h-0">{roleCard}</div>
        {/* Two cards now, not three. Society Statute is a paragraph and a
            button and keeps its natural height; Role Promotion takes
            EVERYTHING that is left, so the column is filled to the bottom
            rather than stopping where the third card used to begin. Its
            floor of 12rem means a very tall statute card can never squeeze
            it away on a short screen. */}
        <div className="lg:col-span-3 min-w-0 space-y-4 lg:flex lg:flex-col lg:space-y-0 lg:gap-4 lg:min-h-0">
          {statuteCard}
          {promotionCard}
        </div>
      </div>

      <p className="mt-4 shrink-0 text-center text-xs text-muted-foreground lg:mt-3">
        Activity across the workspace is recorded for accountability and security.
      </p>
    </div>
  );
}
