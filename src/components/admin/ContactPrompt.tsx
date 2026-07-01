import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { AlertCircle } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { getMyMember } from '@/lib/members-api';

interface Props {
  /** Navigate to the My Profile page so the member can add their details. */
  onGoToProfile: () => void;
}

/**
 * Shows once per login: if the signed-in member is missing a phone number or
 * email, it asks them to add it. Phone and email are mandatory for members.
 */
export default function ContactPrompt({ onGoToProfile }: Props) {
  const { session } = useAuth();
  const [open, setOpen] = useState(false);
  const [missing, setMissing] = useState<{ phone: boolean; email: boolean }>({ phone: false, email: false });

  useEffect(() => {
    if (!session) return;
    // Only prompt once per browser session.
    if (sessionStorage.getItem('ws-contact-prompted') === '1') return;
    let active = true;
    (async () => {
      try {
        const res = await getMyMember(session);
        if (!active || !res.member || res.isCandidate || res.isAdmin) return;
        const phone = !res.member.phone || res.member.phone.trim().length < 3;
        const email = !res.member.email;
        if (phone || email) { setMissing({ phone, email }); setOpen(true); }
      } catch { /* silent: the prompt is best-effort */ }
    })();
    return () => { active = false; };
  }, [session]);

  const dismiss = () => { sessionStorage.setItem('ws-contact-prompted', '1'); setOpen(false); };
  const go = () => { dismiss(); onGoToProfile(); };

  const message = missing.phone && missing.email
    ? 'Please add your phone number and email address to continue.'
    : missing.phone ? 'Please add your phone number.'
    : 'Please add your email address to continue.';

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) dismiss(); }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="font-serif flex items-center gap-2"><AlertCircle className="h-5 w-5 text-amber-600" />Complete your profile</DialogTitle>
          <DialogDescription className="font-body">{message} A phone number and email are required for every member.</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={dismiss}>Later</Button>
          <Button onClick={go}>Go to My Profile</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
