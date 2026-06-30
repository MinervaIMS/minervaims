import { useEffect, useRef, useState } from 'react';
import { Loader2, Upload, User as UserIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { useAccess } from '@/hooks/useAccess';
import { roleLabel as composeRoleLabel, divisionLabels } from '@/lib/roles';
import { statuteExtractFor } from '@/lib/statute-extracts';
import { getMyMember, updateMyProfile, uploadMyPhoto, type MemberRow } from '@/lib/members-api';
import { WorkspacePageHeader } from '@/components/admin/WorkspacePageHeader';

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-xs uppercase tracking-wider text-muted-foreground mb-1">{label}</div>
      <div className="text-foreground">{value || '—'}</div>
    </div>
  );
}

export default function MyProfile() {
  const { user, session } = useAuth();
  const { primaryRole, primaryDivision, isCandidate } = useAccess();
  const { toast } = useToast();

  const [loading, setLoading] = useState(true);
  const [member, setMember] = useState<MemberRow | null>(null);
  const [phone, setPhone] = useState('');
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const roleText = primaryRole ? composeRoleLabel(primaryRole, primaryDivision) : isCandidate ? 'Candidate' : 'No role';
  const divisionText = primaryDivision && primaryDivision !== 'none' ? divisionLabels[primaryDivision] : '—';
  const extract = primaryRole ? statuteExtractFor(primaryRole) : null;

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const res = await getMyMember(session);
        if (!active) return;
        setMember(res.member);
        setPhone(res.member?.phone ?? '');
        setPhotoUrl(res.member?.photo_url ?? null);
      } catch (e) {
        console.error(e);
        toast({ title: 'Could not load your profile', variant: 'destructive' });
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => { active = false; };
  }, [session, toast]);

  const handleUpload = async (file: File) => {
    if (!file.type.startsWith('image/')) {
      toast({ title: 'Invalid file', description: 'Please choose an image.', variant: 'destructive' });
      return;
    }
    setUploading(true);
    try {
      const url = await uploadMyPhoto(session, file);
      setPhotoUrl(url);
      toast({ title: 'Photo uploaded', description: 'Remember to save to apply the change.' });
    } catch (e) {
      toast({ title: 'Upload failed', description: e instanceof Error ? e.message : undefined, variant: 'destructive' });
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async () => {
    if (phone.trim().length < 3) {
      toast({ title: 'Phone number required', description: 'A phone number is required and cannot be removed.', variant: 'destructive' });
      return;
    }
    setSaving(true);
    try {
      const updated = await updateMyProfile(session, { phone: phone.trim(), photo_url: photoUrl });
      setMember(updated);
      toast({ title: 'Profile updated' });
    } catch (e) {
      toast({ title: 'Could not save', description: e instanceof Error ? e.message : undefined, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div>
        <WorkspacePageHeader title="My profile" description="Your account details and current workspace role." />
        <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
      </div>
    );
  }

  // Candidates do not have a member record; show a minimal, read-only view.
  if (isCandidate || !member) {
    return (
      <div>
        <WorkspacePageHeader title="My profile" description="Your account details and current workspace role." />
        <div className="max-w-2xl space-y-4 font-body">
          <Field label="Email" value={user?.email ?? ''} />
          <Field label="Role" value={roleText} />
          {extract && (
            <Card className="mt-6"><CardContent className="py-5">
              <div className="text-xs uppercase tracking-wider text-muted-foreground mb-2">Your role in the statute</div>
              <p className="font-body text-foreground leading-relaxed">{extract}</p>
            </CardContent></Card>
          )}
        </div>
      </div>
    );
  }

  const dirty = phone.trim() !== (member.phone ?? '') || (photoUrl ?? '') !== (member.photo_url ?? '');

  return (
    <div>
      <WorkspacePageHeader
        title="My profile"
        description="Your personal information. You can update your phone number and profile picture; the picture is also used on the public Members page."
      />

      <div className="max-w-3xl">
        <div className="flex flex-col sm:flex-row gap-8">
          {/* Photo */}
          <div className="shrink-0">
            <div className="w-40 h-48 border border-separator bg-muted/40 overflow-hidden flex items-center justify-center">
              {photoUrl
                ? <img src={photoUrl} alt="Profile" className="w-full h-full object-cover" />
                : <UserIcon className="h-12 w-12 text-muted-foreground" />}
            </div>
            <input
              ref={fileRef} type="file" accept="image/*" className="hidden"
              onChange={(e) => { const f = e.target.files?.[0]; if (f) handleUpload(f); e.target.value = ''; }}
            />
            <Button
              variant="outline" size="sm" className="mt-3 w-40 font-body"
              disabled={uploading} onClick={() => fileRef.current?.click()}
            >
              {uploading ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Uploading</> : <><Upload className="h-4 w-4 mr-2" />Change photo</>}
            </Button>
          </div>

          {/* Details */}
          <div className="flex-1 space-y-4 font-body min-w-0">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="First name" value={member.first_name} />
              <Field label="Surname" value={member.surname} />
              <Field label="Email" value={member.email ?? user?.email ?? ''} />
              <Field label="Role" value={roleText} />
              <Field label="Division" value={divisionText} />
            </div>

            <div className="space-y-2 max-w-sm">
              <Label htmlFor="phone" className="font-body">Phone number <span className="text-muted-foreground">(required)</span></Label>
              <Input id="phone" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="e.g. +39 333 000 0000" />
            </div>

            <Button onClick={handleSave} disabled={saving || !dirty} className="font-body">
              {saving ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Saving</> : 'Save changes'}
            </Button>
          </div>
        </div>

        {extract && (
          <Card className="mt-8"><CardContent className="py-5">
            <div className="text-xs uppercase tracking-wider text-muted-foreground mb-2">Your role in the statute</div>
            <p className="font-body text-foreground leading-relaxed">{extract}</p>
          </CardContent></Card>
        )}
      </div>
    </div>
  );
}
