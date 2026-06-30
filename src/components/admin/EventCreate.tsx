import { useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, X, Loader2, Upload } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { divisionLabels, type OrgDivision } from '@/lib/roles';
import { WorkspacePageHeader } from '@/components/admin/WorkspacePageHeader';
import {
  saveEvent, uploadEventPoster, EVENT_TYPE_LABELS, AUDIENCE_LABELS,
  type EventType, type RegistrationAudience,
} from '@/lib/events-api';

const DIVISIONS: OrgDivision[] = ['equity', 'investment', 'macro', 'portfolio', 'quant', 'media', 'operations'];

export default function EventCreate() {
  const { session } = useAuth();
  const { toast } = useToast();
  const fileRef = useRef<HTMLInputElement>(null);

  const [form, setForm] = useState({
    title: '', event_type: 'other' as EventType, division: '' as OrgDivision | '',
    start_local: '', end_local: '', place: '', online: false,
    moderator: '', description: '', poster_url: '',
    registration_enabled: false, registration_audience: 'members' as RegistrationAudience,
  });
  const [guests, setGuests] = useState<string[]>(['']);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);

  const upload = async (file: File) => {
    setUploading(true);
    try { const url = await uploadEventPoster(file); setForm((f) => ({ ...f, poster_url: url })); toast({ title: 'Poster uploaded' }); }
    catch (e) { toast({ title: 'Upload failed', description: e instanceof Error ? e.message : undefined, variant: 'destructive' }); }
    finally { setUploading(false); }
  };

  const submit = async () => {
    if (!form.title.trim() || !form.start_local) { toast({ title: 'Title and start time are required', variant: 'destructive' }); return; }
    if (!form.online && !form.place.trim()) { toast({ title: 'Add a location (or mark the event online)', variant: 'destructive' }); return; }
    setSaving(true);
    try {
      await saveEvent(session, {
        title: form.title, date: form.start_local.slice(0, 10), place: form.online ? (form.place || 'Online') : form.place,
        moderator: form.moderator || null, guest: guests.filter((g) => g.trim()), description: form.description || null,
        poster_url: form.poster_url || null, event_type: form.event_type, division: form.division || null,
        start_at: new Date(form.start_local).toISOString(), end_at: form.end_local ? new Date(form.end_local).toISOString() : null,
        online: form.online, registration_enabled: form.registration_enabled, registration_audience: form.registration_audience,
      });
      toast({ title: 'Event created', description: 'Find it in the Calendar and Archive.' });
      setForm({ title: '', event_type: 'other', division: '', start_local: '', end_local: '', place: '', online: false, moderator: '', description: '', poster_url: '', registration_enabled: false, registration_audience: 'members' });
      setGuests(['']);
    } catch (e) { toast({ title: 'Could not create event', description: e instanceof Error ? e.message : undefined, variant: 'destructive' }); }
    finally { setSaving(false); }
  };

  return (
    <div>
      <WorkspacePageHeader title="Create" description="Create a new event: meetings, assemblies, division events, online calls, guest events, alumni calls or association-wide events. Enable registration to collect attendees." />

      <div className="max-w-2xl space-y-5 font-body">
        <div className="space-y-1"><Label>Title *</Label><Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Event title" /></div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1">
            <Label>Type</Label>
            <Select value={form.event_type} onValueChange={(v) => setForm({ ...form, event_type: v as EventType })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{(Object.keys(EVENT_TYPE_LABELS) as EventType[]).map((t) => <SelectItem key={t} value={t}>{EVENT_TYPE_LABELS[t]}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label>Division (optional)</Label>
            <Select value={form.division || 'none'} onValueChange={(v) => setForm({ ...form, division: v === 'none' ? '' : v as OrgDivision })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">—</SelectItem>
                {DIVISIONS.map((d) => <SelectItem key={d} value={d}>{divisionLabels[d]}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1"><Label>Starts *</Label><Input type="datetime-local" value={form.start_local} onChange={(e) => setForm({ ...form, start_local: e.target.value })} /></div>
          <div className="space-y-1"><Label>Ends</Label><Input type="datetime-local" value={form.end_local} onChange={(e) => setForm({ ...form, end_local: e.target.value })} /></div>
        </div>

        <div className="flex items-center justify-between border border-separator p-3">
          <Label htmlFor="online">Online event</Label>
          <Switch id="online" checked={form.online} onCheckedChange={(v) => setForm({ ...form, online: v })} />
        </div>
        <div className="space-y-1"><Label>{form.online ? 'Meeting link / platform' : 'Location *'}</Label><Input value={form.place} onChange={(e) => setForm({ ...form, place: e.target.value })} placeholder={form.online ? 'e.g. Zoom link' : 'e.g. Room AS01'} /></div>

        <div className="space-y-1"><Label>Moderator (optional)</Label><Input value={form.moderator} onChange={(e) => setForm({ ...form, moderator: e.target.value })} /></div>

        <div className="space-y-2">
          <Label>Guests (optional)</Label>
          {guests.map((g, i) => (
            <div key={i} className="flex gap-2">
              <Input value={g} onChange={(e) => { const n = [...guests]; n[i] = e.target.value; setGuests(n); }} placeholder={`Guest ${i + 1}`} />
              {guests.length > 1 && <Button type="button" variant="outline" size="icon" onClick={() => setGuests(guests.filter((_, idx) => idx !== i))}><X className="h-4 w-4" /></Button>}
            </div>
          ))}
          <Button type="button" variant="outline" size="sm" onClick={() => setGuests([...guests, ''])}><Plus className="h-4 w-4 mr-2" />Add guest</Button>
        </div>

        <div className="space-y-1"><Label>Description</Label><Textarea rows={3} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>

        <div className="space-y-2">
          <Label>Poster (optional)</Label>
          <input ref={fileRef} type="file" accept="image/jpeg,image/png,application/pdf,.jpg,.jpeg,.png,.pdf" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) upload(f); e.target.value = ''; }} />
          <div className="flex items-center gap-3">
            <Button type="button" variant="outline" size="sm" disabled={uploading} onClick={() => fileRef.current?.click()}>{uploading ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Uploading</> : <><Upload className="h-4 w-4 mr-2" />Upload poster</>}</Button>
            {form.poster_url && <span className="text-xs text-green-700">Poster attached</span>}
          </div>
        </div>

        <div className="border border-separator p-3 space-y-3">
          <div className="flex items-center justify-between">
            <Label htmlFor="reg">Collect registrations</Label>
            <Switch id="reg" checked={form.registration_enabled} onCheckedChange={(v) => setForm({ ...form, registration_enabled: v })} />
          </div>
          {form.registration_enabled && (
            <div className="space-y-1">
              <Label>Who can register</Label>
              <Select value={form.registration_audience} onValueChange={(v) => setForm({ ...form, registration_audience: v as RegistrationAudience })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{(Object.keys(AUDIENCE_LABELS) as RegistrationAudience[]).map((a) => <SelectItem key={a} value={a}>{AUDIENCE_LABELS[a]}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          )}
        </div>

        <Button onClick={submit} disabled={saving || uploading}>{saving ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Creating</> : 'Create event'}</Button>
      </div>
    </div>
  );
}
