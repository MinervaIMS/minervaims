import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Loader2, Upload, Download, Trash2, User as UserIcon, AlertCircle, ScrollText, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { useAccess } from '@/hooks/useAccess';
import { roleLabel as composeRoleLabel, divisionLabels } from '@/lib/roles';
import { roleGuideFor, MEMBERSHIP_RULES } from '@/lib/statute-extracts';
import { getMyMember, updateMyProfile, uploadMyPhoto, type MemberRow } from '@/lib/members-api';
import { getMyApplication, type ApplicationRow } from '@/lib/applications-api';
import { WorkspacePageHeader } from '@/components/admin/WorkspacePageHeader';
import { useIsDesktop } from '@/hooks/use-desktop';
import { WorkspaceLoader } from '@/components/admin/WorkspaceLoader';

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-xs uppercase tracking-wider text-muted-foreground mb-1">{label}</div>
      <div className="text-foreground text-sm">{value || 'Not set'}</div>
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

/** A prominent link from the profile to the full association statute page. */
function StatuteLink() {
  return (
    <Card>
      <CardContent className="py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-start gap-3">
          <ScrollText className="h-5 w-5 text-accent shrink-0 mt-0.5" />
          <div>
            <div className="text-sm text-foreground font-medium">The association statute</div>
            <p className="text-xs text-muted-foreground">Your role, rights and duties are drawn from it. Read the full, binding text any time.</p>
          </div>
        </div>
        <Button asChild variant="outline" size="sm" className="shrink-0">
          <Link to="/statute" target="_blank" rel="noopener noreferrer">
            Open the statute <ExternalLink className="h-4 w-4 ml-2" />
          </Link>
        </Button>
      </CardContent>
    </Card>
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
  if (isCandidate) {
    return (
      <div>
        <WorkspacePageHeader title="My profile" description="Your applicant account. These details come from your application and cannot be edited here." />
        <div className="max-w-4xl font-body">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-5">
            <Field label="First name" value={candidateApp?.first_name ?? ''} />
            <Field label="Surname" value={candidateApp?.surname ?? ''} />
            <Field label="Email" value={candidateApp?.email || email} />
            <Field label="Phone number" value={candidateApp?.phone ?? ''} />
            <div>
              <div className="text-xs uppercase tracking-wider text-muted-foreground mb-1">LinkedIn</div>
              {candidateApp?.linkedin_url
                ? <a href={candidateApp.linkedin_url} target="_blank" rel="noopener noreferrer" className="text-accent underline break-all text-sm">{candidateApp.linkedin_url}</a>
                : <div className="text-foreground text-sm">Not set</div>}
            </div>
            <Field label="Role" value="Applicant" />
          </div>
          <Card className="mt-6"><CardContent className="py-5">
            <div className="text-xs uppercase tracking-wider text-muted-foreground mb-2">You are an applicant</div>
            <p className="text-sm text-foreground leading-relaxed">
              Follow your application in <strong>Applications → Status</strong>. If you are invited to interview, you will be able to book a slot in <strong>Applications → Interview Calendar</strong>. Once you accept an offer to join, this page becomes your full member profile.
            </p>
          </CardContent></Card>
        </div>
      </div>
    );
  }

  // The admin user (no member record, not a candidate): minimal view.
  if (!member) {
    return (
      <div>
        <WorkspacePageHeader title="My profile" description="Your account details and current workspace role." />
        <div className="max-w-4xl space-y-4 font-body">
          <Field label="Email" value={email} />
          <Field label="Role" value={roleText} />
          {guide && (
            <Card className="mt-6"><CardContent className="py-5">
              <div className="text-xs uppercase tracking-wider text-muted-foreground mb-2">Your role</div>
              <p className="text-sm text-foreground leading-relaxed">{guide.summary}</p>
            </CardContent></Card>
          )}
          <div className="mt-6"><StatuteLink /></div>
        </div>
      </div>
    );
  }

  const missingPhone = phone.trim().length < 3;
  const missingEmail = !email;
  const dirty = phone.trim() !== (member.phone ?? '') || (photoUrl ?? '') !== (member.photo_url ?? '');

  return (
    <div className="font-body">
      <WorkspacePageHeader
        title="My profile"
        description="Your personal information. You can update your phone number and profile picture; the picture is also used on the public Members page."
      />

      {(missingPhone || missingEmail) && (
        <div className="max-w-4xl mb-6 flex items-start gap-2 border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
          <span>
            {missingPhone && missingEmail ? 'Please add your phone number and email address to continue.'
              : missingPhone ? 'Please add your phone number to continue.'
              : 'Please add your email address to continue.'}
          </span>
        </div>
      )}

      {/* Two halves on desktop: the personal profile on the left, the role
          brief on the right. Static panels, hairline separations, no hover
          effects: the workspace design rules apply. */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-x-0 gap-y-10 items-start">
        {/* LEFT: the profile itself */}
        <div className="lg:pr-12 space-y-6">
          <div className="flex flex-col sm:flex-row gap-8">
            {/* Square photo */}
            <div className="shrink-0">
              <div className="w-44 aspect-square border border-separator bg-muted/40 overflow-hidden flex items-center justify-center">
                {photoUrl ? <img src={photoUrl} alt="Profile" className="w-full h-full object-cover" /> : <UserIcon className="h-14 w-14 text-muted-foreground" />}
              </div>
              <input ref={fileRef} type="file" accept="image/*" className="hidden"
                onChange={(e) => { const f = e.target.files?.[0]; if (f) handleUpload(f); e.target.value = ''; }} />
              {isDesktop && (
                <div className="mt-3 flex flex-wrap gap-2 w-44">
                  <Button variant="outline" size="sm" disabled={uploading} onClick={() => fileRef.current?.click()}>
                    {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                  </Button>
                  <Button variant="outline" size="sm" disabled={!photoUrl} onClick={handleDownloadPhoto}><Download className="h-4 w-4" /></Button>
                  <Button variant="outline" size="sm" disabled={!photoUrl} onClick={handleDeletePhoto}><Trash2 className="h-4 w-4" /></Button>
                </div>
              )}
            </div>

            {/* Details, grouped: name+surname, email+phone, role+division */}
            <div className="flex-1 min-w-0 space-y-5">
              <div className="grid grid-cols-2 gap-x-6 gap-y-1">
                <Field label="First name" value={member.first_name} />
                <Field label="Surname" value={member.surname} />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-5">
                <Field label="Email" value={email} />
                {isDesktop ? (
                  <div>
                    <Label htmlFor="phone" className="text-xs uppercase tracking-wider text-muted-foreground">Phone number (required)</Label>
                    <Input id="phone" className="mt-1" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="e.g. +39 333 000 0000" />
                  </div>
                ) : (
                  <Field label="Phone number" value={phone || '-'} />
                )}
              </div>
              <div className="grid grid-cols-2 gap-x-6 gap-y-1">
                <Field label="Role" value={roleText} />
                <Field label="Division" value={divisionText} />
              </div>

              {isDesktop ? (
                <Button onClick={handleSave} disabled={saving || !dirty}>
                  {saving ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Saving</> : 'Save changes'}
                </Button>
              ) : (
                <p className="text-xs text-muted-foreground">Editing your phone number and photo is available on desktop.</p>
              )}
            </div>
          </div>
        </div>

        {/* RIGHT: the role brief, from "Your role" down. */}
        {guide && (
          <div className="lg:border-l lg:border-separator lg:pl-12 space-y-7">
            {/* Role header band: the one tinted element of the page. */}
            <div className="border-l-2 border-accent bg-accent/[0.05] px-5 py-4">
              <div className="text-[11px] uppercase tracking-[0.14em] text-accent font-semibold mb-1">Your role</div>
              <div className="font-serif text-2xl text-accent leading-tight">{roleText}</div>
              {divisionText && <div className="text-xs uppercase tracking-wider text-muted-foreground mt-1">{divisionText}</div>}
              <p className="text-sm text-foreground leading-relaxed mt-3">{guide.summary}</p>
            </div>

            <section>
              <div className="text-[11px] uppercase tracking-wider text-accent font-semibold mb-2 pb-1.5 border-b border-separator">Responsibilities</div>
              <Bullets items={guide.responsibilities} />
            </section>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <section>
                <div className="text-[11px] uppercase tracking-wider text-accent font-semibold mb-1.5 pb-1.5 border-b border-separator">You report to</div>
                <p className="text-sm text-foreground">{guide.reportsTo}</p>
              </section>
              {guide.oversees && (
                <section>
                  <div className="text-[11px] uppercase tracking-wider text-accent font-semibold mb-1.5 pb-1.5 border-b border-separator">You coordinate</div>
                  <p className="text-sm text-foreground">{guide.oversees.join(', ')}</p>
                </section>
              )}
            </div>

            <section>
              <div className="text-[11px] uppercase tracking-wider text-accent font-semibold mb-2 pb-1.5 border-b border-separator">Your rights</div>
              <Bullets items={guide.rights} />
            </section>

            <section>
              <div className="text-[11px] uppercase tracking-wider text-accent font-semibold mb-1.5 pb-1.5 border-b border-separator">Who to contact</div>
              <p className="text-sm text-foreground">{guide.contact}</p>
            </section>

            {/* Shared membership rules */}
            <Card><CardContent className="py-5 space-y-5">
              <div>
                <div className="text-xs uppercase tracking-wider text-muted-foreground mb-2">Your duties as a member</div>
                <Bullets items={MEMBERSHIP_RULES.duties} />
              </div>
              <div>
                <div className="text-xs uppercase tracking-wider text-muted-foreground mb-2">Grounds for expulsion</div>
                <Bullets items={MEMBERSHIP_RULES.expulsion} />
              </div>
              <div>
                <div className="text-xs uppercase tracking-wider text-muted-foreground mb-1">Report publication and blocking</div>
                <p className="text-sm text-foreground leading-relaxed">{MEMBERSHIP_RULES.publicationControl}</p>
              </div>
              <div>
                <div className="text-xs uppercase tracking-wider text-muted-foreground mb-1">Hierarchy</div>
                <p className="text-sm text-foreground leading-relaxed">{MEMBERSHIP_RULES.hierarchyNote}</p>
              </div>
            </CardContent></Card>
          </div>
        )}
      </div>

      {/* Connection to the full statute: the closing element of the page. */}
      <div className="mt-10">
        <StatuteLink />
      </div>
    </div>
  );
}
