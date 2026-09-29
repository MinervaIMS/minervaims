import { useCallback, useEffect, useRef, useState } from 'react';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { AlertTriangle, Camera, CameraOff, CheckCircle2, CloudOff, CloudUpload, Flashlight, Loader2, ScanLine, X, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { checkInTicket, doorStatus, type CheckinResult, type DoorStatus } from '@/lib/events-api';
import { flushQueue, isConnectionError, queueScan, queuedScans, ticketToken } from '@/lib/checkin-queue';
import { formatTime } from '@/lib/event-time';
import {
  CameraProblem, isIosNonSafari, platform, requestCamera, stopStream, type CameraProblemKind,
} from '@/lib/camera';
import { createQrReader, readQrFromFile, type QrReader } from '@/lib/qr-decode';

// =====================================================================
// Scan tickets: Events, Attendance, at the door.
// ---------------------------------------------------------------------
// A full-screen scanner, the way a phone's own scanning apps look: the
// camera fills the screen with a frame to aim at, and a panel at the foot
// answers each ticket in large type, then clears itself for the next one.
// Green, checked in; amber, already checked in (and when); red, a ticket
// for another event or not a ticket. The count of people in stays in view.
//
// THE CAMERA IS ASKED FOR IN THE TAP. The page calls `requestCamera` in the
// click on "Scan tickets" and hands the answer in (`cameraRequest`); "Try
// again" does the same from its own click. See src/lib/camera.ts.
//
// NEVER A DEAD END. If the camera cannot be used, the scanner says why and
// what to do, and "Take a photo of the ticket" opens the phone's camera app
// instead, which needs no permission from the browser; the photo is read
// the same way. The list underneath keeps its tick boxes for everybody else.
//
// SEVERAL PHONES, ONE COUNT. While the scanner is open it asks the server
// every few seconds who is in (`door-status`), so the count and the list
// include the tickets scanned on the other phones at the same event, and a
// ticket scanned twice at two doors is "already checked in" on the second.
//
// NO SIGNAL, NO STOP. A ticket that cannot reach the server for lack of a
// connection is kept on this phone with the time it was read, and the panel
// says "Saved on this phone". The scans are sent by themselves as soon as
// the connection is back. See src/lib/checkin-queue.ts.
// =====================================================================

type Outcome =
  | { kind: 'ok'; name: string; member: boolean }
  | { kind: 'already'; name: string; at: string | null }
  | { kind: 'other'; name: string; event: string | null }
  | { kind: 'invalid'; text: string }
  | { kind: 'error'; text: string }
  | { kind: 'saved'; again: boolean }
  | { kind: 'synced'; text: string };

type Phase = { kind: 'starting' } | { kind: 'live' } | { kind: 'blocked'; problem: CameraProblemKind };

export interface ScannerStats { checkedIn: number; total: number }

// How long an answer stays on screen before the panel is ready again.
const HOLD_MS: Record<Outcome['kind'], number> = { ok: 2200, already: 3500, other: 4000, invalid: 3500, error: 4000, saved: 2600, synced: 5000 };
// How often the count is refreshed from the other phones, and saved scans retried.
const POLL_MS = 4000;

export default function CheckinScanner({ open, onClose, eventId, eventTitle, cameraRequest, stats, onCheckedIn, onStatus }: {
  open: boolean;
  onClose: () => void;
  eventId: string;
  eventTitle: string;
  /** The camera, already asked for in the tap that opened the scanner. */
  cameraRequest: Promise<MediaStream> | null;
  stats: ScannerStats;
  onCheckedIn: (id: string, checkedInAt: string | null) => void;
  /** Who is in according to the server, every few seconds while open. */
  onStatus?: (status: DoorStatus) => void;
}) {
  const { session } = useAuth();
  const videoRef = useRef<HTMLVideoElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const readerRef = useRef<Promise<QrReader> | null>(null);
  const busyRef = useRef(false);
  const lastRef = useRef<{ text: string; at: number }>({ text: '', at: 0 });
  const [request, setRequest] = useState<Promise<MediaStream> | null>(null);
  const [phase, setPhase] = useState<Phase>({ kind: 'starting' });
  const [checking, setChecking] = useState(false);
  const [outcome, setOutcome] = useState<Outcome | null>(null);
  const [scanned, setScanned] = useState(0);
  const [torch, setTorch] = useState<{ supported: boolean; on: boolean }>({ supported: false, on: false });
  const [readingPhoto, setReadingPhoto] = useState(false);
  const [slowStart, setSlowStart] = useState(false);
  const [offline, setOffline] = useState(() => typeof navigator !== 'undefined' && navigator.onLine === false);
  const [waiting, setWaiting] = useState(0);

  // The page hands a new callback on every render (each scan re-renders it),
  // so it is read through a ref: the camera depends on the request alone and
  // is never closed and reopened by the scan it has just made.
  const onCheckedInRef = useRef(onCheckedIn);
  onCheckedInRef.current = (id: string, at: string | null) => { lastLocalRef.current = Date.now(); onCheckedIn(id, at); };
  // When this phone last ticked somebody, so an older shared count is not applied over it.
  const lastLocalRef = useRef(0);
  const onStatusRef = useRef(onStatus);
  onStatusRef.current = onStatus;

  // A reader that failed to load (no signal at that moment) is asked for
  // again next time rather than remembered as failed.
  const reader = useCallback(() => {
    if (!readerRef.current) {
      const r = createQrReader();
      r.catch(() => { if (readerRef.current === r) readerRef.current = null; });
      readerRef.current = r;
    }
    return readerRef.current;
  }, []);

  // Each opening starts from the request the page made in its tap.
  useEffect(() => {
    if (open) {
      setRequest(cameraRequest);
      setOutcome(null);
      setScanned(0);
      setWaiting(queuedScans(eventId).length);
      lastRef.current = { text: '', at: 0 };
      // Loaded now, while there is signal, so photos can be read without it.
      reader().catch(() => undefined);
    }
  }, [open, cameraRequest, eventId, reader]);

  const handle = useCallback(async (text: string) => {
    const token = ticketToken(text);
    if (!token) {
      setOutcome({ kind: 'invalid', text: 'This code is not a Minerva ticket.' });
      return;
    }
    // Without signal the ticket is kept on the phone at once, rather than
    // after a wait for a request that cannot arrive.
    const keep = () => {
      const fresh = queueScan(eventId, token);
      setWaiting(queuedScans(eventId).length);
      setOffline(true);
      setOutcome({ kind: 'saved', again: !fresh });
      navigator.vibrate?.(fresh ? [30, 40, 30] : [40, 60, 40]);
    };
    if (navigator.onLine === false) { keep(); return; }
    busyRef.current = true;
    setChecking(true);
    try {
      const r: CheckinResult = await checkInTicket(session, eventId, token);
      setOffline(false);
      if (r.result === 'checked_in') {
        setOutcome({ kind: 'ok', name: r.name, member: r.member });
        setScanned((c) => c + 1);
        onCheckedInRef.current(r.id, r.checked_in_at);
        navigator.vibrate?.(60);
      } else if (r.result === 'already') {
        setOutcome({ kind: 'already', name: r.name, at: r.checked_in_at });
        onCheckedInRef.current(r.id, r.checked_in_at);
        navigator.vibrate?.([40, 60, 40]);
      } else if (r.result === 'other_event') {
        setOutcome({ kind: 'other', name: r.name, event: r.event_title });
      } else if (r.result === 'unknown') {
        setOutcome({ kind: 'invalid', text: 'This ticket is not on any registration list. Look the person up in the list.' });
      } else {
        setOutcome({ kind: 'invalid', text: 'This code is not a Minerva ticket.' });
      }
    } catch (e) {
      if (isConnectionError(e)) keep();
      else setOutcome({ kind: 'error', text: e instanceof Error ? e.message : 'The ticket could not be checked. Try again.' });
    } finally {
      setChecking(false);
      busyRef.current = false;
    }
  }, [session, eventId]);
  const handleRef = useRef(handle);
  handleRef.current = handle;

  // ── The shared count, and the scans kept without signal ─────────────
  // Every few seconds while open and in view: send what was kept (oldest
  // first), then ask who is in. Any answer from the server means the
  // connection is back; no answer means it is not.
  const sync = useCallback(async () => {
    if (document.visibilityState === 'hidden') return;
    if (navigator.onLine === false) { setOffline(true); return; }
    if (queuedScans(eventId).length) {
      const rep = await flushQueue(session, eventId);
      setWaiting(queuedScans(eventId).length);
      [...rep.checkedIn, ...rep.already].forEach((x) => onCheckedInRef.current(x.id, x.at));
      if (rep.checkedIn.length) setScanned((c) => c + rep.checkedIn.length);
      const sent = rep.checkedIn.length + rep.already.length + rep.problems.length;
      if (sent) {
        const parts = [
          rep.checkedIn.length ? `${rep.checkedIn.length} checked in` : '',
          rep.already.length ? `${rep.already.length} already in` : '',
          ...rep.problems,
        ].filter(Boolean);
        // Shown when the panel is free, so it never covers a fresh answer.
        setOutcome((o) => o ?? { kind: 'synced', text: `${sent === 1 ? '1 saved ticket' : `${sent} saved tickets`} sent: ${parts.join(', ')}` });
      }
      if (rep.left) { setOffline(true); return; }
    }
    try {
      const asked = Date.now();
      const status = await doorStatus(session, eventId);
      setOffline(false);
      // An answer overtaken by a scan on this phone is older than what the
      // page already shows; the next one includes the scan.
      if (lastLocalRef.current <= asked) onStatusRef.current?.(status);
    } catch (e) {
      if (isConnectionError(e)) setOffline(true);
    }
  }, [session, eventId]);

  useEffect(() => {
    if (!open) return;
    let alive = true;
    let timer = 0;
    let busy = false;
    // One round at a time: a connection that returns in the middle of a
    // round does not start a second one beside it.
    const loop = async () => {
      window.clearTimeout(timer);
      if (busy) return;
      busy = true;
      await sync().catch(() => undefined);
      busy = false;
      if (alive) timer = window.setTimeout(loop, POLL_MS);
    };
    loop();
    const goOnline = () => { loop(); };
    const goOffline = () => setOffline(true);
    window.addEventListener('online', goOnline);
    window.addEventListener('offline', goOffline);
    return () => {
      alive = false;
      window.clearTimeout(timer);
      window.removeEventListener('online', goOnline);
      window.removeEventListener('offline', goOffline);
    };
  }, [open, sync]);

  // An answer clears itself, so the panel is ready for the next person.
  useEffect(() => {
    if (!outcome) return;
    const t = window.setTimeout(() => setOutcome(null), HOLD_MS[outcome.kind]);
    return () => window.clearTimeout(t);
  }, [outcome]);

  // The camera: attach the stream, then read about seven frames a second.
  useEffect(() => {
    if (!open || !request) return;
    let cancelled = false;
    let raf = 0;
    let last = 0;
    let reading = false;
    const video = videoRef.current;
    setPhase({ kind: 'starting' });
    setTorch({ supported: false, on: false });
    (async () => {
      let stream: MediaStream;
      try {
        stream = await request;
      } catch (e) {
        if (!cancelled) setPhase({ kind: 'blocked', problem: e instanceof CameraProblem ? e.kind : 'unknown' });
        return;
      }
      if (cancelled) { stopStream(stream); return; }
      streamRef.current = stream;
      if (!video) return;
      video.srcObject = stream;
      await video.play().catch(() => undefined);
      if (cancelled) return;
      setPhase({ kind: 'live' });
      const track = stream.getVideoTracks()[0];
      const caps = (track?.getCapabilities?.() ?? {}) as { torch?: boolean };
      if (caps.torch) setTorch({ supported: true, on: false });
      const qr = await reader();
      const tick = (now: number) => {
        if (cancelled) return;
        raf = requestAnimationFrame(tick);
        if (reading || busyRef.current || now - last < 140) return;
        const v = video;
        if (v.readyState < 2 || !v.videoWidth) return;
        last = now;
        reading = true;
        qr.read(v, v.videoWidth, v.videoHeight).then((text) => {
          reading = false;
          if (!text || cancelled) return;
          // The same code held in front of the camera is read once, not
          // seven times a second; it can be read again after a pause.
          const prev = lastRef.current;
          const t = performance.now();
          if (text === prev.text && t - prev.at < 3000) return;
          lastRef.current = { text, at: t };
          handleRef.current(text);
        }, () => { reading = false; });
      };
      raf = requestAnimationFrame(tick);
    })();
    // A phone that locks or switches app pauses the camera; resume on return.
    const onVisible = () => { if (document.visibilityState === 'visible') video?.play().catch(() => undefined); };
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      cancelled = true;
      cancelAnimationFrame(raf);
      document.removeEventListener('visibilitychange', onVisible);
      stopStream(streamRef.current);
      streamRef.current = null;
      if (video) video.srcObject = null;
    };
  }, [open, request, reader]);

  // A camera that has not answered after a few seconds: the permission
  // request may be waiting unseen. Say so, and point at the photo.
  useEffect(() => {
    setSlowStart(false);
    if (phase.kind !== 'starting' || !open) return;
    const t = window.setTimeout(() => setSlowStart(true), 6000);
    return () => window.clearTimeout(t);
  }, [phase.kind, open]);

  // Closing always releases the camera, even when no request was made.
  useEffect(() => { if (!open) { stopStream(streamRef.current); streamRef.current = null; } }, [open]);

  const retry = () => {
    // In the tap itself, like "Scan tickets": see src/lib/camera.ts.
    setRequest(requestCamera());
  };

  const toggleTorch = async () => {
    const track = streamRef.current?.getVideoTracks()[0];
    if (!track) return;
    const on = !torch.on;
    try {
      await track.applyConstraints({ advanced: [{ torch: on } as MediaTrackConstraintSet] });
      setTorch({ supported: true, on });
    } catch { setTorch({ supported: false, on: false }); }
  };

  const onPhoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setReadingPhoto(true);
    try {
      const text = await readQrFromFile(file, await reader());
      if (text) await handleRef.current(text);
      else setOutcome({ kind: 'invalid', text: 'No QR code found in the photo. Take it again closer, with the whole code in view.' });
    } catch {
      setOutcome({ kind: 'invalid', text: 'The photo could not be read. Take it again.' });
    } finally {
      setReadingPhoto(false);
    }
  };

  const panel = (() => {
    if (checking || readingPhoto) return { tone: 'idle', icon: <Loader2 className="h-7 w-7 animate-spin text-accent" />, title: readingPhoto ? 'Reading the photo…' : 'Checking the ticket…', text: '' };
    if (!outcome) {
      return phase.kind === 'live'
        ? { tone: 'idle', icon: <ScanLine className="h-7 w-7 text-accent" />, title: 'Ready', text: 'Hold the QR code from the email inside the frame.' }
        : { tone: 'idle', icon: <Camera className="h-7 w-7 text-accent" />, title: 'Ready', text: 'Take a photo of the ticket, or tick people in the list.' };
    }
    switch (outcome.kind) {
      case 'ok': return { tone: 'ok', icon: <CheckCircle2 className="h-7 w-7" />, title: outcome.name, text: `Checked in · ${outcome.member ? 'Member' : 'Guest'}` };
      case 'already': return { tone: 'warn', icon: <AlertTriangle className="h-7 w-7" />, title: outcome.name, text: `Already checked in${outcome.at ? ` at ${formatTime(outcome.at)}` : ''}` };
      case 'saved': return { tone: 'saved', icon: <CloudOff className="h-7 w-7" />, title: outcome.again ? 'Already saved on this phone' : 'Saved on this phone', text: 'No signal. The ticket is sent by itself when the connection returns.' };
      case 'synced': return { tone: 'saved', icon: <CloudUpload className="h-7 w-7" />, title: 'Back online', text: outcome.text };
      case 'other': return { tone: 'bad', icon: <XCircle className="h-7 w-7" />, title: outcome.name, text: `This ticket is for another event${outcome.event ? `: ${outcome.event}` : ''}.` };
      default: return { tone: 'bad', icon: <XCircle className="h-7 w-7" />, title: 'Not checked in', text: outcome.text };
    }
  })();
  const toneCls: Record<string, string> = {
    idle: 'border-separator bg-background text-foreground',
    ok: 'border-emerald-600 bg-emerald-600 text-white',
    warn: 'border-amber-500 bg-amber-50 text-amber-900',
    bad: 'border-destructive bg-destructive/10 text-destructive',
    saved: 'border-accent bg-accent/10 text-foreground',
  };
  const frameCls = outcome?.kind === 'ok' ? 'border-emerald-400'
    : outcome?.kind === 'already' ? 'border-amber-400'
      : outcome?.kind === 'saved' || outcome?.kind === 'synced' ? 'border-sky-300'
        : outcome ? 'border-red-400' : 'border-white';
  const pct = stats.total ? Math.min(100, Math.round((stats.checkedIn / stats.total) * 100)) : 0;

  return (
    <DialogPrimitive.Root open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Content
          className="fixed inset-0 z-[70] flex flex-col bg-[#05030F] text-white font-body outline-none"
          onOpenAutoFocus={(e) => e.preventDefault()}
        >
          {/* ---- Top bar ---------------------------------------------- */}
          <div className="flex items-center gap-2 px-2 pt-[max(env(safe-area-inset-top),8px)] pb-2">
            <DialogPrimitive.Close asChild>
              <button type="button" className="h-11 w-11 inline-flex items-center justify-center text-white/90 hover:text-white" aria-label="Close the scanner">
                <X className="h-6 w-6" />
              </button>
            </DialogPrimitive.Close>
            <div className="min-w-0 flex-1 text-center">
              <DialogPrimitive.Title className="font-serif text-lg leading-tight">Scan tickets</DialogPrimitive.Title>
              <DialogPrimitive.Description className="truncate text-xs text-white/60">{eventTitle}</DialogPrimitive.Description>
            </div>
            {torch.supported ? (
              <button type="button" onClick={toggleTorch} aria-pressed={torch.on} aria-label={torch.on ? 'Turn the light off' : 'Turn the light on'}
                className={`h-11 w-11 inline-flex items-center justify-center ${torch.on ? 'text-amber-300' : 'text-white/80 hover:text-white'}`}>
                <Flashlight className="h-5 w-5" />
              </button>
            ) : <span className="h-11 w-11" aria-hidden />}
          </div>

          {/* ---- Camera --------------------------------------------------- */}
          <div className="relative flex-1 min-h-0 overflow-hidden">
            <video ref={videoRef} className={`absolute inset-0 h-full w-full object-cover ${phase.kind === 'live' ? 'opacity-100' : 'opacity-0'}`} playsInline muted autoPlay aria-label="Camera" />

            {phase.kind === 'live' && (
              <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                {/* The frame: four corners, the world outside dimmed, and a
                    line sweeping through it so it reads as working. */}
                <div className="relative aspect-square w-[min(72vw,58vh,340px)] shadow-[0_0_0_9999px_rgba(5,3,15,0.55)]">
                  {(['left-0 top-0 border-l-4 border-t-4', 'right-0 top-0 border-r-4 border-t-4', 'left-0 bottom-0 border-l-4 border-b-4', 'right-0 bottom-0 border-r-4 border-b-4'] as const).map((c) => (
                    <span key={c} className={`absolute h-9 w-9 transition-colors duration-200 ${frameCls} ${c}`} />
                  ))}
                  {!outcome && !checking && <span className="mims-scanline absolute inset-x-3 h-0.5 bg-white/80" />}
                </div>
                <p className="mt-5 px-6 text-center text-sm text-white/85">Point the camera at the QR code in the email</p>
              </div>
            )}

            {phase.kind === 'starting' && (
              <div className="absolute inset-0 flex flex-col items-center justify-center px-8 text-center text-sm text-white/80">
                <span className="inline-flex items-center gap-2"><Loader2 className="h-5 w-5 animate-spin" />Opening the camera…</span>
                <span className="mt-2 text-xs text-white/60">If the browser asks, allow the camera.</span>
                {slowStart && (
                  <div className="mt-6 max-w-xs">
                    <p className="text-white/85">Still waiting for the camera. If no request appeared, take a photo of the ticket instead, or try again.</p>
                    <div className="mt-4 flex flex-col gap-2.5">
                      <Button type="button" className="h-12 bg-white text-accent hover:bg-white/90 font-serif text-base" onClick={() => fileRef.current?.click()}>
                        <Camera className="h-5 w-5 mr-2" />Take a photo of the ticket
                      </Button>
                      <Button type="button" variant="outline" className="h-12 border-white/60 bg-transparent text-white hover:bg-white/10 hover:text-white" onClick={retry}>
                        Try the camera again
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {phase.kind === 'blocked' && (
              <div className="absolute inset-0 overflow-y-auto px-6 py-8 flex flex-col items-center justify-center text-center">
                <CameraOff className="h-10 w-10 text-white/80" />
                <CameraHelp problem={phase.problem} />
                <div className="mt-6 flex w-full max-w-xs flex-col gap-2.5">
                  <Button type="button" className="h-12 bg-white text-accent hover:bg-white/90 font-serif text-base" onClick={() => fileRef.current?.click()}>
                    <Camera className="h-5 w-5 mr-2" />Take a photo of the ticket
                  </Button>
                  {phase.problem !== 'insecure' && phase.problem !== 'unsupported' && (
                    <Button type="button" variant="outline" className="h-12 border-white/60 bg-transparent text-white hover:bg-white/10 hover:text-white" onClick={retry}>
                      Try the camera again
                    </Button>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* ---- Answer, count and actions ------------------------------ */}
          <div className="bg-background text-foreground px-4 pt-4 pb-[max(env(safe-area-inset-bottom),16px)]">
            <div className={`flex min-h-[84px] items-center gap-3 border-l-4 border px-4 py-3 transition-colors ${toneCls[panel.tone]}`} role="status" aria-live="polite">
              <span className="shrink-0">{panel.icon}</span>
              <div className="min-w-0">
                <div className="font-serif text-[22px] leading-tight break-words">{panel.title}</div>
                {panel.text && <div className="mt-0.5 text-sm opacity-90">{panel.text}</div>}
              </div>
            </div>

            <div className="mt-3">
              <div className="flex items-baseline justify-between text-xs text-muted-foreground tabular-nums">
                <span><span className="text-foreground font-medium">{stats.checkedIn}</span> of {stats.total} registered are in</span>
                <span>{scanned === 1 ? '1 scanned now' : `${scanned} scanned now`}</span>
              </div>
              <div className="mt-1.5 h-1 bg-muted" aria-hidden><div className="h-1 bg-accent transition-all" style={{ width: `${pct}%` }} /></div>
              <div className="mt-2 flex items-start gap-2 text-xs text-muted-foreground" aria-live="polite">
                <span className={`mt-[5px] h-1.5 w-1.5 shrink-0 ${offline ? 'bg-amber-500' : 'bg-emerald-600'}`} aria-hidden />
                <span>
                  {offline
                    ? `No signal. ${waiting === 1 ? '1 ticket saved on this phone' : `${waiting} tickets saved on this phone`}, sent when the connection returns.`
                    : waiting
                      ? `Sending ${waiting === 1 ? '1 saved ticket' : `${waiting} saved tickets`}…`
                      : 'Live: the count includes every phone scanning this event.'}
                </span>
              </div>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-2">
              <Button type="button" variant="outline" className="h-12" onClick={() => fileRef.current?.click()} disabled={readingPhoto}>
                <Camera className="h-4 w-4 mr-2" />Take a photo
              </Button>
              <Button type="button" variant="solid" className="h-12" onClick={onClose}>Done</Button>
            </div>
            <input ref={fileRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={onPhoto} />
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}

/** What to do when the camera cannot be used, for the phone in hand. */
function CameraHelp({ problem }: { problem: CameraProblemKind }) {
  const p = platform();
  let title = 'The camera could not be opened';
  let steps: string[] = [];
  if (problem === 'in-app') {
    title = 'Open this page in your browser';
    steps = ['This page is open inside another app, which does not share the camera.', p === 'ios' ? 'Tap the menu of the app and choose Open in Safari, then sign in and open Attendance again.' : 'Tap the menu of the app and choose Open in Chrome, then sign in and open Attendance again.'];
  } else if (problem === 'denied') {
    title = 'Allow the camera for minervaims.org';
    if (p === 'ios' && isIosNonSafari()) {
      steps = ['Open the iPhone Settings, find this browser (Chrome, Firefox or Edge) and switch Camera on.', 'Come back here and tap Try the camera again.'];
    } else if (p === 'ios') {
      steps = ['In Safari, tap the page menu beside the address (the icon with the lines, or aA), then Website Settings, and set Camera to Allow.', 'If there is no Camera option: iPhone Settings, Apps, Safari, Camera, and choose Ask or Allow.', 'Then tap Try the camera again.'];
    } else if (p === 'android') {
      steps = ['Tap the icon to the left of the address, then Permissions, and allow Camera.', 'Then tap Try the camera again.'];
    } else {
      steps = ['Click the camera icon at the right of the address bar, or the icon to its left, and allow the camera for this site.', 'Then click Try the camera again.'];
    }
  } else if (problem === 'in-use') {
    steps = ['Another app is using the camera. Close it (a video call, the camera app) and try again.'];
  } else if (problem === 'no-camera') {
    steps = ['This device has no camera the browser can use. Use a phone, or tick people in the list.'];
  } else if (problem === 'insecure' || problem === 'unsupported') {
    steps = ['This browser does not give pages access to the camera. Open minervaims.org in Safari or Chrome.'];
  } else {
    steps = ['Try again, or take a photo of the ticket instead.'];
  }
  return (
    <>
      <h3 className="mt-4 font-serif text-xl">{title}</h3>
      <ol className="mt-3 max-w-sm space-y-2 text-left text-sm text-white/80">
        {steps.map((s, i) => (
          <li key={i} className="flex gap-2.5"><span className="mt-[7px] h-1.5 w-1.5 shrink-0 bg-white/70" aria-hidden /><span>{s}</span></li>
        ))}
      </ol>
      <p className="mt-4 max-w-sm text-xs text-white/60">Taking a photo works in any case: it opens your camera app, and the photo is read here.</p>
    </>
  );
}
