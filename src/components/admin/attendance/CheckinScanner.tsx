import { useCallback, useEffect, useRef, useState } from 'react';
import { CheckCircle2, AlertTriangle, XCircle, Loader2 } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { checkInTicket, type CheckinResult } from '@/lib/events-api';
import { formatTime } from '@/lib/event-time';

// =====================================================================
// Scan tickets: Events, Attendance, at the door.
// ---------------------------------------------------------------------
// The phone's back camera reads the QR code in a registrant's email and
// ticks them as present, one after another, without closing. Each scan
// answers in large type: checked in (with Member or Guest), already
// checked in (and when), a ticket for another event, or not a ticket.
//
// It is an addition, never a replacement: the list underneath keeps its
// tick boxes, its search and the walk-in form, for anybody without a code.
// The decoder (jsQR) is loaded only when the scanner opens, and works on
// every phone, iPhones included; the camera is released on closing.
// =====================================================================

type Outcome =
  | { kind: 'ok'; name: string; member: boolean }
  | { kind: 'already'; name: string; at: string | null }
  | { kind: 'other'; name: string; event: string | null }
  | { kind: 'invalid'; text: string }
  | { kind: 'error'; text: string };

const time = (iso: string | null) => formatTime(iso);

export default function CheckinScanner({ open, onOpenChange, eventId, eventTitle, onCheckedIn }: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  eventId: string;
  eventTitle: string;
  onCheckedIn: (id: string, checkedInAt: string | null) => void;
}) {
  const { session } = useAuth();
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const busyRef = useRef(false);
  const lastRef = useRef<{ text: string; at: number }>({ text: '', at: 0 });
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [starting, setStarting] = useState(false);
  const [checking, setChecking] = useState(false);
  const [outcome, setOutcome] = useState<Outcome | null>(null);
  const [count, setCount] = useState(0);
  // The page hands a new callback on every render (each scan re-renders it),
  // so it is read through a ref: the camera depends on `open` alone and is
  // never closed and reopened by the scan it has just made.
  const onCheckedInRef = useRef(onCheckedIn);
  onCheckedInRef.current = onCheckedIn;

  const stop = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  }, []);

  const handle = useCallback(async (text: string) => {
    busyRef.current = true;
    setChecking(true);
    try {
      const r: CheckinResult = await checkInTicket(session, eventId, text);
      if (r.result === 'checked_in') {
        setOutcome({ kind: 'ok', name: r.name, member: r.member });
        setCount((c) => c + 1);
        onCheckedInRef.current(r.id, r.checked_in_at);
        navigator.vibrate?.(60);
      } else if (r.result === 'already') {
        setOutcome({ kind: 'already', name: r.name, at: r.checked_in_at });
        onCheckedInRef.current(r.id, r.checked_in_at);
      } else if (r.result === 'other_event') {
        setOutcome({ kind: 'other', name: r.name, event: r.event_title });
      } else if (r.result === 'unknown') {
        setOutcome({ kind: 'invalid', text: 'This ticket is not on any registration list. Look the person up in the list.' });
      } else {
        setOutcome({ kind: 'invalid', text: 'This code is not a Minerva ticket.' });
      }
    } catch (e) {
      setOutcome({ kind: 'error', text: e instanceof Error ? e.message : 'The ticket could not be checked.' });
    } finally {
      setChecking(false);
      busyRef.current = false;
    }
  }, [session, eventId]);
  const handleRef = useRef(handle);
  handleRef.current = handle;

  useEffect(() => {
    if (!open) { stop(); return; }
    let cancelled = false;
    let raf = 0;
    let lastFrame = 0;
    setOutcome(null);
    setCount(0);
    setCameraError(null);
    setStarting(true);
    (async () => {
      try {
        const [{ default: jsQR }, stream] = await Promise.all([
          import('jsqr'),
          navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: 'environment' } }, audio: false }),
        ]);
        if (cancelled) { stream.getTracks().forEach((t) => t.stop()); return; }
        streamRef.current = stream;
        const video = videoRef.current;
        if (!video) return;
        video.srcObject = stream;
        await video.play().catch(() => undefined);
        setStarting(false);
        const canvas = canvasRef.current ?? (canvasRef.current = document.createElement('canvas'));
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        const tick = (now: number) => {
          if (cancelled) return;
          raf = requestAnimationFrame(tick);
          // About eight reads a second: plenty for a code held up to the
          // camera, and gentle on a phone's battery.
          if (now - lastFrame < 120 || busyRef.current || !ctx || video.readyState < 2) return;
          lastFrame = now;
          const w = Math.min(640, video.videoWidth);
          const h = Math.round((video.videoHeight / video.videoWidth) * w) || 0;
          if (!w || !h) return;
          canvas.width = w; canvas.height = h;
          ctx.drawImage(video, 0, 0, w, h);
          const found = jsQR(ctx.getImageData(0, 0, w, h).data, w, h, { inversionAttempts: 'dontInvert' });
          if (!found?.data) return;
          // The same code held in front of the camera is read once, not
          // eight times a second; it can be read again after a pause.
          const last = lastRef.current;
          if (found.data === last.text && now - last.at < 3000) return;
          lastRef.current = { text: found.data, at: now };
          handleRef.current(found.data);
        };
        raf = requestAnimationFrame(tick);
      } catch (e) {
        if (cancelled) return;
        setStarting(false);
        const name = e instanceof Error ? e.name : '';
        setCameraError(name === 'NotAllowedError'
          ? 'The camera was not allowed. Allow camera access for this site in the browser settings, or tick people in the list.'
          : 'The camera could not be opened on this device. Tick people in the list instead.');
      }
    })();
    return () => { cancelled = true; cancelAnimationFrame(raf); stop(); };
  }, [open, stop]);

  const panel = (() => {
    if (checking) return { cls: 'border-separator bg-muted/40 text-foreground', icon: <Loader2 className="h-6 w-6 animate-spin" />, title: 'Checking the ticket…', text: '' };
    if (!outcome) return { cls: 'border-separator bg-muted/40 text-muted-foreground', icon: null, title: 'Hold the ticket in the frame', text: 'The QR code is in the registration email and in the reminder the day before.' };
    switch (outcome.kind) {
      case 'ok': return { cls: 'border-accent bg-accent text-accent-foreground', icon: <CheckCircle2 className="h-6 w-6" />, title: outcome.name, text: `Checked in · ${outcome.member ? 'Member' : 'Guest'}` };
      case 'already': return { cls: 'border-amber-600 bg-amber-50 text-amber-900', icon: <AlertTriangle className="h-6 w-6" />, title: outcome.name, text: `Already checked in${outcome.at ? ` at ${time(outcome.at)}` : ''}` };
      case 'other': return { cls: 'border-destructive bg-destructive/10 text-destructive', icon: <XCircle className="h-6 w-6" />, title: outcome.name, text: `This ticket is for another event${outcome.event ? `: ${outcome.event}` : ''}.` };
      case 'invalid': return { cls: 'border-destructive bg-destructive/10 text-destructive', icon: <XCircle className="h-6 w-6" />, title: 'Not checked in', text: outcome.text };
      default: return { cls: 'border-destructive bg-destructive/10 text-destructive', icon: <XCircle className="h-6 w-6" />, title: 'Not checked in', text: outcome.text };
    }
  })();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md p-4 sm:p-6 font-body">
        <DialogHeader>
          <DialogTitle className="font-serif">Scan tickets</DialogTitle>
          <DialogDescription>{eventTitle}</DialogDescription>
        </DialogHeader>

        <div className="relative aspect-square w-full overflow-hidden rounded-md bg-[#05030F]">
          <video ref={videoRef} className="h-full w-full object-cover" playsInline muted aria-label="Camera" />
          {/* The frame to aim at. */}
          {!cameraError && (
            <div className="pointer-events-none absolute inset-[18%] rounded-md border-2 border-white/80 shadow-[0_0_0_9999px_rgba(5,3,15,0.35)]" aria-hidden />
          )}
          {(starting || cameraError) && (
            <div className="absolute inset-0 flex items-center justify-center p-6 text-center text-sm text-white/85">
              {cameraError ?? <span className="inline-flex items-center gap-2"><Loader2 className="h-4 w-4 animate-spin" />Opening the camera…</span>}
            </div>
          )}
        </div>

        <div className={`flex min-h-[76px] items-center gap-3 rounded-md border px-4 py-3 ${panel.cls}`} role="status" aria-live="polite">
          {panel.icon}
          <div className="min-w-0">
            <div className="font-serif text-lg leading-tight break-words">{panel.title}</div>
            {panel.text && <div className="mt-0.5 text-sm opacity-90">{panel.text}</div>}
          </div>
        </div>

        <div className="flex items-center justify-between gap-3">
          <span className="text-xs text-muted-foreground tabular-nums">
            {count === 1 ? '1 person checked in' : `${count} people checked in`} while scanning
          </span>
          <Button data-ro variant="outline" size="sm" onClick={() => onOpenChange(false)}>Done</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
