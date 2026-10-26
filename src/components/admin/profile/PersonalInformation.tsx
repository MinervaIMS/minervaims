import { useEffect, useRef, useState, type FormEvent, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { AlertCircle, Download, Loader2, Trash2, Upload, User as UserIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { updateMyProfile, uploadMyPhoto, type MemberRow } from '@/lib/members-api';
import { normalizeLinkedInProfile } from '@/lib/linkedin';
import { workspacePath } from '@/lib/workspace-nav';
import { roleGuideFor, promotionFor, MERIT_NOTE, MERIT_FACTORS } from '@/lib/statute-extracts';
import type { AppRole } from '@/lib/roles';
import {
  Bullets, Disclosure, Eyebrow, Field, ProfileCard, ShowMore, SummaryRow,
} from '@/components/admin/profile/profile-ui';

// =====================================================================
// MY PROFILE, PERSONAL INFORMATION (Step 97B).
// ---------------------------------------------------------------------
// Who you are, what your role is, and where it leads. Two columns on a
// computer: your details on the left, your role and its promotion on the
// right; one column on a phone, in the same order.
//
// READ FIRST, CHANGE ON REQUEST. Every detail is a line of text with its
// own action. Pressing Change opens that one field in place, with Save
// and Cancel beside it; Enter saves, Escape cancels, and the focus goes
// back to the button it came from. Nothing else on the page moves, and
// nothing is half-saved: the fields used to be open all at once under a
// single Save, which made a page you mostly read look like a form you
// had to fill in.
//
// WHAT CAN BE CHANGED IS WHAT ALWAYS COULD. The phone number (required),
// the LinkedIn link and the picture, on a computer; the server accepts
// exactly these and nothing else (member-profile). The name, the email
// and the role come from the register.
// =====================================================================

const TOTAL_ITEMS = 3;

/** Phone, photo and LinkedIn: how many of the three are there. */
export function profileCompleteness(member: MemberRow | null, photoUrl: string | null): { done: number; total: number } | null {
  if (!member) return null;
  const done = [(member.phone ?? '').trim().length >= 3, !!photoUrl, !!member.linkedin_url].filter(Boolean).length;
  return { done, total: TOTAL_ITEMS };
}

function InlineEdit({ id, label, value, display, placeholder, hint, validate, onSave, editable, inputMode, autoComplete, extraAction }: {
  id: string;
  label: string;
  value: string;
  display: ReactNode;
  placeholder: string;
  hint: ReactNode;
  validate: (v: string) => string | undefined;
  onSave: (v: string) => Promise<void>;
  editable: boolean;
  inputMode?: 'tel' | 'url' | 'text';
  autoComplete?: string;
  /** A second action beside Change, such as Remove. */
  extraAction?: ReactNode;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const [error, setError] = useState<string | undefined>();
  const [busy, setBusy] = useState(false);
  const trigger = useRef<HTMLButtonElement>(null);
  const returnFocus = useRef(false);

  const open = () => { setDraft(value); setError(undefined); setEditing(true); };
  const close = () => { returnFocus.current = true; setEditing(false); };
  // Back to the button that opened the field, once it is drawn again, so a
  // keyboard reader carries on from where they were.
  useEffect(() => {
    if (!editing && returnFocus.current) {
      returnFocus.current = false;
      trigger.current?.focus();
    }
  }, [editing]);
  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const problem = validate(draft);
    if (problem) { setError(problem); return; }
    setBusy(true);
    try {
      await onSave(draft.trim());
      close();
    } catch (x) {
      setError(x instanceof Error ? x.message : 'It could not be saved. Try again in a moment.');
    } finally {
      setBusy(false);
    }
  };

  if (editing) {
    return (
      <div className="py-3.5 first:pt-0 last:pb-0">
        <dt id={`${id}-label`} className="text-xs uppercase tracking-wider text-muted-foreground">{label}</dt>
        <dd className="mt-1.5">
          <form
            onSubmit={submit}
            onKeyDown={(e) => { if (e.key === 'Escape') { e.preventDefault(); close(); } }}
            className="space-y-2"
          >
            <Input
              id={id}
              autoFocus
              value={draft}
              onChange={(e) => { setDraft(e.target.value); if (error) setError(undefined); }}
              placeholder={placeholder}
              inputMode={inputMode}
              autoComplete={autoComplete}
              aria-labelledby={`${id}-label`}
              aria-invalid={!!error}
              aria-describedby={`${id}-msg`}
              className={`h-11 text-base lg:h-9 lg:text-sm ${error ? 'border-destructive' : ''}`}
            />
            <p id={`${id}-msg`} role={error ? 'alert' : undefined} className={`text-xs leading-relaxed ${error ? 'text-destructive' : 'text-muted-foreground'}`}>
              {error ?? hint}
            </p>
            <div className="flex flex-wrap gap-2">
              <Button type="submit" size="sm" variant="solid" className="h-11 lg:h-9" disabled={busy}>
                {busy ? <><Loader2 className="animate-spin" aria-hidden="true" />Saving</> : 'Save'}
              </Button>
              <Button type="button" size="sm" variant="outline" className="h-11 lg:h-9" onClick={close} disabled={busy}>Cancel</Button>
            </div>
          </form>
        </dd>
      </div>
    );
  }

  return (
    <SummaryRow
      label={label}
      hint={hint}
      action={editable ? (
        <div className="flex items-center gap-1">
          <Button ref={trigger} type="button" variant="link" size="sm" className="h-11 min-w-11 px-2 lg:h-auto lg:min-w-0 lg:px-1 lg:py-0.5" onClick={open}>
            {value ? 'Change' : 'Add'}<span className="sr-only"> {label.toLowerCase()}</span>
          </Button>
          {extraAction}
        </div>
      ) : undefined}
    >
      {display}
    </SummaryRow>
  );
}

export function PersonalInformation({
  member, onMemberChange, photoUrl, onPhotoChange, email, roleText, divisionText, primaryRole, careerHints, semestersServed,
}: {
  member: MemberRow | null;
  onMemberChange: (m: MemberRow) => void;
  photoUrl: string | null;
  onPhotoChange: (url: string | null) => void;
  email: string;
  roleText: string;
  divisionText: string;
  primaryRole: AppRole | null;
  /** The reader can open Career, LinkedIn (the photo and profile tools). */
  careerHints: boolean;
  /** Semesters in the Society, from the rosters, when known. */
  semestersServed: number | null;
}) {
  const { session } = useAuth();
  const { toast } = useToast();
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const guide = primaryRole ? roleGuideFor(primaryRole) : null;
  const promotion = primaryRole ? promotionFor(primaryRole) : null;
  const careerLinkedIn = workspacePath('career', 'career-linkedin');

  const storedPhone = (member?.phone ?? '').trim();
  const hasPhone = storedPhone.length >= 3;
  // A picture uploaded before a phone number exists waits for it: the
  // server saves the three together and requires the phone (as before).
  const photoPending = !!member && (photoUrl ?? '') !== (member.photo_url ?? '');

  const save = async (input: { phone: string; photo_url?: string | null; linkedin_url?: string | null }) => {
    const updated = await updateMyProfile(session, input);
    onMemberChange(updated);
    return updated;
  };

  const savePhone = async (phone: string) => {
    await save({ phone, ...(photoPending ? { photo_url: photoUrl } : {}) });
    toast({ title: 'Phone number saved', description: photoPending ? 'Your picture is saved with it.' : undefined });
  };

  const saveLinkedIn = async (raw: string) => {
    const li = normalizeLinkedInProfile(raw);
    if (li.error) throw new Error(li.error);
    const updated = await save({ phone: storedPhone, linkedin_url: li.url });
    toast({ title: updated.linkedin_url ? 'LinkedIn link saved' : 'LinkedIn link removed' });
  };

  const removeLinkedIn = async () => {
    try {
      await save({ phone: storedPhone, linkedin_url: null });
      toast({ title: 'LinkedIn link removed', description: 'It is no longer shown on the public Members page.' });
    } catch (e) {
      toast({ title: 'Could not remove the link', description: e instanceof Error ? e.message : undefined, variant: 'destructive' });
    }
  };

  const handleUpload = async (file: File) => {
    if (!file.type.startsWith('image/')) { toast({ title: 'Please choose an image', variant: 'destructive' }); return; }
    setUploading(true);
    try {
      const url = await uploadMyPhoto(session, file);
      onPhotoChange(url);
      if (hasPhone) {
        await save({ phone: storedPhone, photo_url: url });
        toast({ title: 'Picture updated' });
      } else {
        toast({ title: 'Picture ready', description: 'Add your phone number and it is saved with it.' });
      }
    } catch (e) {
      toast({ title: 'Upload failed', description: e instanceof Error ? e.message : undefined, variant: 'destructive' });
    } finally {
      setUploading(false);
    }
  };

  const handleDeletePhoto = async () => {
    if (!hasPhone) { onPhotoChange(null); toast({ title: 'Picture removed' }); return; }
    try {
      await save({ phone: storedPhone, photo_url: null });
      onPhotoChange(null);
      toast({ title: 'Picture removed', description: 'It is no longer shown on the public Members page.' });
    } catch (e) {
      toast({ title: 'Could not remove the picture', description: e instanceof Error ? e.message : undefined, variant: 'destructive' });
    }
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

  // --- your details -----------------------------------------------------
  const details = member ? (
    <ProfileCard title="Your details" headingId="pi-details">
      {!hasPhone && (
        <div className="mb-5 flex items-start gap-2 rounded-lg border border-amber-300 bg-amber-50 px-3.5 py-2.5 text-sm text-amber-800 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-200" role="status">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          <span>Please add your phone number: the association uses it to reach you.</span>
        </div>
      )}

      {/* The picture, with its three actions written out: an icon alone
          says less than a word, and these are done rarely enough that
          nobody has learnt the icons. The actions run under the picture
          and its line, at the card's full width, so they stay on one row
          however narrow the column is. */}
      <div>
        <div className="flex items-center gap-4">
          <div className="h-20 w-20 shrink-0 overflow-hidden rounded-lg border border-separator bg-muted/40">
            {photoUrl
              ? <img src={photoUrl} alt="Your profile picture" className="h-full w-full object-cover" />
              : <div className="flex h-full w-full items-center justify-center"><UserIcon className="h-8 w-8 text-muted-foreground" aria-hidden="true" /></div>}
          </div>
          <div className="min-w-0">
            <div className="text-xs uppercase tracking-wider text-muted-foreground">Picture</div>
            <p className="mt-0.5 text-sm text-foreground">
              {photoUrl ? (photoPending ? 'Ready, saved with your phone number' : 'Added') : 'Not added'}
            </p>
            <p className="mt-0.5 text-xs text-muted-foreground">Optional. Shown on the public Members page.</p>
          </div>
        </div>
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          className="hidden"
          aria-hidden="true"
          tabIndex={-1}
          onChange={(e) => { const f = e.target.files?.[0]; if (f) handleUpload(f); e.target.value = ''; }}
        />
        {/* On a phone too (Step 98): the picture comes from the camera or
            the photo library through the phone's own picker. */}
        <div className="mt-3 flex flex-wrap gap-2">
          <Button type="button" size="sm" variant="outline" className="h-11 lg:h-9" disabled={uploading} onClick={() => fileRef.current?.click()}>
            {uploading ? <Loader2 className="animate-spin" aria-hidden="true" /> : <Upload aria-hidden="true" />}
            {photoUrl ? 'Replace' : 'Upload'}
          </Button>
          {photoUrl && (
            <>
              <Button type="button" size="sm" variant="ghost" className="h-11 lg:h-9" onClick={handleDownloadPhoto}>
                <Download aria-hidden="true" />Download
              </Button>
              <Button type="button" size="sm" variant="ghost" className="h-11 lg:h-9" onClick={handleDeletePhoto}>
                <Trash2 aria-hidden="true" />Remove
              </Button>
            </>
          )}
        </div>
        <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
          A square portrait works best.
          {careerHints && (
            <> Need a professional photo? Make one on the Minerva background in{' '}
              <Link to={careerLinkedIn} className="text-accent underline underline-offset-2">Career, LinkedIn</Link>.</>
          )}
        </p>
      </div>

      <dl className="mt-5 divide-y divide-separator border-t border-separator pt-4">
        <SummaryRow label="Name">{`${member.first_name} ${member.surname}`.trim() || 'Not set'}</SummaryRow>
        <SummaryRow label="Email" hint="Your name and email come from the association register; the President or the Admin changes them.">
          {email || 'Not set'}
        </SummaryRow>
        <InlineEdit
          id="phone"
          label="Phone number"
          value={storedPhone}
          display={storedPhone || <span className="text-muted-foreground">Not added</span>}
          placeholder="e.g. +39 333 000 0000"
          hint="Required. The association uses it to reach you."
          inputMode="tel"
          autoComplete="tel"
          editable
          validate={(v) => (v.trim().length < 3 ? 'A phone number is required and cannot be removed.' : undefined)}
          onSave={savePhone}
        />
        <InlineEdit
          id="linkedin"
          label="LinkedIn profile"
          value={member.linkedin_url ?? ''}
          display={member.linkedin_url
            ? <a href={member.linkedin_url} target="_blank" rel="noopener noreferrer" className="break-all text-accent underline underline-offset-2 max-lg:inline-flex max-lg:min-h-11 max-lg:items-center">{member.linkedin_url.replace(/^https?:\/\/(www\.)?/, '')}</a>
            : <span className="text-muted-foreground">Not added</span>}
          placeholder="https://www.linkedin.com/in/your-name"
          hint={hasPhone
            ? 'Optional. Adding it publishes it on the public Members page; remove it here at any time.'
            : 'Optional. Add your phone number first: the two are saved together.'}
          inputMode="url"
          autoComplete="url"
          editable={hasPhone}
          validate={(v) => (v.trim() ? normalizeLinkedInProfile(v).error : undefined)}
          onSave={saveLinkedIn}
          extraAction={member.linkedin_url && hasPhone ? (
            <Button type="button" variant="link" size="sm" className="h-11 px-2 text-muted-foreground lg:h-auto lg:px-1 lg:py-0.5" onClick={removeLinkedIn}>
              Remove<span className="sr-only"> LinkedIn link</span>
            </Button>
          ) : undefined}
        />
      </dl>

      {careerHints && member.linkedin_url && (
        <p className="mt-4 border-l-2 border-accent pl-2.5 text-xs leading-relaxed text-muted-foreground">
          Refine your LinkedIn profile with the About prompt, the photo and the banner in{' '}
          <Link to={careerLinkedIn} className="text-accent underline underline-offset-2">Career, LinkedIn</Link>.
        </p>
      )}
    </ProfileCard>
  ) : (
    // The association account: no member record to edit, so the card
    // states what it knows and offers no controls that would fail.
    <ProfileCard title="Your details" headingId="pi-details">
      <div className="space-y-4">
        <Field label="Email" value={email} />
        <Field label="Role" value={roleText} />
        <p className="border-t border-separator pt-4 text-xs leading-relaxed text-muted-foreground">
          This account has no member record, so there is nothing to edit here.
        </p>
      </div>
    </ProfileCard>
  );

  // --- your role ----------------------------------------------------------
  const role = (
    <ProfileCard title={roleText} titleItalic subtitle={divisionText || undefined} headingId="pi-role">
      {guide ? (
        <div className="space-y-5">
          <p className="border-l-2 border-accent bg-accent/[0.05] px-4 py-3 text-sm leading-relaxed text-foreground">{guide.summary}</p>

          <section aria-labelledby="pi-resp">
            <Eyebrow className="mb-2"><span id="pi-resp">Your responsibilities</span></Eyebrow>
            <ShowMore
              items={guide.responsibilities}
              initial={4}
              noun="responsibilities"
              className="space-y-2"
              render={(t, i) => (
                <li key={i} className="flex gap-2.5 text-sm leading-relaxed">
                  <span aria-hidden className="mt-[7px] h-1.5 w-1.5 shrink-0 bg-accent" />
                  <span className="text-foreground/85">{t}</span>
                </li>
              )}
            />
          </section>

          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            <div>
              <Eyebrow className="mb-1">You report to</Eyebrow>
              <p className="text-sm leading-relaxed text-foreground/85">{guide.reportsTo}</p>
            </div>
            {guide.oversees && (
              <div>
                <Eyebrow className="mb-1">You coordinate</Eyebrow>
                <p className="text-sm leading-relaxed text-foreground/85">{guide.oversees.join(', ')}</p>
              </div>
            )}
          </div>

          <div>
            <Disclosure title="Your rights" meta={`${guide.rights.length}`}>
              <Bullets items={guide.rights} />
            </Disclosure>
            <div className="border-t border-separator pt-3 text-xs leading-relaxed text-muted-foreground">
              What the Statute asks of every member (duties, leave, expulsion) is with your semester commitment, in{' '}
              <Link to={workspacePath('my-role', 'my-commitment')} className="text-accent underline underline-offset-2">Commitment</Link>.
            </div>
          </div>
        </div>
      ) : (
        <p className="text-sm leading-relaxed text-muted-foreground">
          The statute does not define a brief for this role. The association statute remains the reference for the
          duties and rights attached to it.
        </p>
      )}
    </ProfileCard>
  );

  // --- promotion ------------------------------------------------------------
  const promotionCard = (
    <ProfileCard title="Promotion" headingId="pi-promotion">
      {promotion ? (
        <div className="space-y-4">
          <div className="rounded-lg border border-separator px-4 py-3">
            <Eyebrow className="mb-1">Next office</Eyebrow>
            <p className="font-serif text-lg italic leading-snug text-foreground">{promotion.next}</p>
          </div>
          <div>
            <Eyebrow className="mb-2">What the statute requires</Eyebrow>
            <Bullets items={promotion.criteria} />
          </div>
          {semestersServed !== null && semestersServed > 0 && (
            <p className="text-sm text-foreground/85">
              Your time in the Society so far: <strong className="font-semibold">{semestersServed} {semestersServed === 1 ? 'semester' : 'semesters'}</strong>.{' '}
              <Link to={workspacePath('my-role', 'my-membership')} className="text-accent underline underline-offset-2">See your career</Link>
            </p>
          )}
          <div>
            <Disclosure title="And then, merit">
              <p className="mb-2.5 text-sm leading-relaxed text-foreground/85">{MERIT_NOTE}</p>
              <Bullets items={MERIT_FACTORS} />
            </Disclosure>
            {promotion.appointment && (
              <Disclosure title="How the appointment is made">
                <p className="text-sm leading-relaxed text-foreground/85">{promotion.appointment}</p>
              </Disclosure>
            )}
          </div>
          <p className="border-t border-separator pt-3 text-xs text-muted-foreground">Source: association statute, {promotion.articles}.</p>
        </div>
      ) : (
        // The top of the structure still has something to read: how the
        // office is judged, the same factors that decide every progression.
        <div className="space-y-4">
          <p className="text-sm leading-relaxed text-foreground/85">
            The statute defines no office above the one you hold. Its articles remain the reference for the term of
            your office and for how it is renewed.
          </p>
          <div className="border-t border-separator pt-4">
            <Eyebrow className="mb-2">How the office is judged</Eyebrow>
            <Bullets items={MERIT_FACTORS} />
          </div>
        </div>
      )}
    </ProfileCard>
  );

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-12 lg:items-start">
      <div className="min-w-0 lg:col-span-5">{details}</div>
      <div className="min-w-0 space-y-4 lg:col-span-7">
        {role}
        {promotionCard}
      </div>
    </div>
  );
}
