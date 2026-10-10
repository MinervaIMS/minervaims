import { useRef, useState } from 'react';
import { BookOpen, Download, FileUp, Loader2, ShieldCheck, Trash2, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { HelpDot } from '@/components/admin/help/HelpSystem';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { friendlyError } from '@/lib/errors';
import { formatStamp } from '@/lib/event-time';
import {
  downloadGreenbook, greenbookRegister, removeGreenbook, uploadGreenbook,
  type Greenbook, type GreenbookDownload,
} from '@/lib/brainteasers-api';
import { CareerCard } from '../CareerCard';

// =====================================================================
// The greenbook: the one file of Career > Brainteasers that can be
// downloaded, and only as the reader's own copy, with their name, email
// and the date on every page (see _shared/pdf-watermark.ts). Every
// download is recorded. The President and the admin account replace or
// remove it and can see who has taken a copy.
// =====================================================================

const MAX_MB = 60;
const mb = (n: number | null | undefined) => (n ? `${(n / 1024 / 1024).toFixed(1)} MB` : '');

// Where the book's chapters meet the types of question here (the first
// edition's chapters), so the two are read together.
const CHAPTERS: { ch: string; title: string; types: string }[] = [
  { ch: '2', title: 'Brain Teasers', types: 'Reasoning' },
  { ch: '3', title: 'Calculus and Linear Algebra', types: 'Math' },
  { ch: '4', title: 'Probability Theory', types: 'Probability, Statistics' },
  { ch: '5', title: 'Stochastic Process and Stochastic Calculus', types: 'Probability' },
  { ch: '6', title: 'Finance', types: 'Option Theory, Finance' },
];

export function GreenbookView({ greenbook, canReplace, perDay, onChange }: {
  greenbook: Greenbook | null;
  canReplace: boolean;
  perDay: number;
  onChange: (g: Greenbook | null) => void;
}) {
  const { session, profile } = useAuth();
  const { toast } = useToast();
  const [busy, setBusy] = useState<null | 'download' | 'upload' | 'remove'>(null);
  const [stage, setStage] = useState('');
  const [askRemove, setAskRemove] = useState(false);
  const [register, setRegister] = useState<GreenbookDownload[] | null>(null);
  const [loadingRegister, setLoadingRegister] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const isTheBook = !!greenbook && /quantitative finance interviews/i.test(greenbook.title || '');

  const download = async () => {
    setBusy('download');
    try {
      const blob = await downloadGreenbook(session);
      const who = (profile?.full_name || 'member').normalize('NFKD').replace(/[̀-ͯ]/g, '').replace(/[^A-Za-z0-9]+/g, '_').replace(/^_|_$/g, '');
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Greenbook_${who || 'member'}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
      toast({ title: 'Your copy is downloading', description: 'It carries your name on every page. Keep it to yourself.' });
    } catch (e) {
      toast({ title: 'Could not download the greenbook', description: friendlyError(e), variant: 'destructive' });
    } finally { setBusy(null); }
  };

  const upload = async (file: File) => {
    if (file.type && file.type !== 'application/pdf') { toast({ title: 'Choose a PDF', variant: 'destructive' }); return; }
    if (file.size > MAX_MB * 1024 * 1024) { toast({ title: `The PDF must be under ${MAX_MB} MB`, variant: 'destructive' }); return; }
    setBusy('upload');
    setStage(`Uploading ${mb(file.size)}...`);
    const slow = window.setTimeout(() => setStage('Checking the file...'), 6000);
    try {
      const g = await uploadGreenbook(session, file, greenbook?.title || undefined);
      onChange(g);
      setRegister(null);
      toast({ title: greenbook ? 'Greenbook replaced' : 'Greenbook uploaded', description: `${g.pages ? `${g.pages} pages, ` : ''}${mb(g.size_bytes)}. Every download now carries the reader's name.` });
    } catch (e) {
      toast({ title: 'Could not upload the greenbook', description: friendlyError(e), variant: 'destructive' });
    } finally {
      window.clearTimeout(slow);
      setBusy(null); setStage('');
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  const remove = async () => {
    setBusy('remove');
    try {
      await removeGreenbook(session);
      onChange(null);
      setAskRemove(false);
      toast({ title: 'Greenbook removed' });
    } catch (e) {
      toast({ title: 'Could not remove the greenbook', description: friendlyError(e), variant: 'destructive' });
    } finally { setBusy(null); }
  };

  const loadRegister = async () => {
    setLoadingRegister(true);
    try { setRegister(await greenbookRegister(session)); }
    catch (e) { toast({ title: 'Could not load the downloads', description: friendlyError(e), variant: 'destructive' }); }
    finally { setLoadingRegister(false); }
  };

  return (
    <div className="grid grid-cols-1 gap-4 lg:min-h-0 lg:flex-1 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)]">
      <CareerCard title="The greenbook" subtitle="The one file you can download here" scroll className="lg:h-full" action={<HelpDot page="career-brainteasers" topic="greenbook" />}>
        {greenbook ? (
          <div className="space-y-5">
            <div className="flex items-start gap-4">
              <div aria-hidden className="flex h-28 w-20 shrink-0 flex-col justify-between rounded-md bg-accent p-2.5 text-accent-foreground shadow-[0_6px_18px_-8px_hsl(var(--overlay)/0.6)]">
                <BookOpen className="h-5 w-5 opacity-80" />
                <span className="font-serif text-[11px] leading-tight">{(greenbook.title || 'Greenbook').split(' ').slice(0, 4).join(' ')}</span>
              </div>
              <div className="min-w-0">
                <p className="font-serif text-xl leading-snug text-foreground">{greenbook.title || greenbook.file_name}</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  {[greenbook.pages ? `${greenbook.pages} pages` : '', mb(greenbook.size_bytes), `updated ${formatStamp(greenbook.updated_at)}`].filter(Boolean).join(' · ')}
                </p>
              </div>
            </div>

            <div className="rounded-lg border border-accent/30 bg-accent/[0.04] p-4">
              <p className="flex items-center gap-2 font-semibold text-accent"><ShieldCheck className="h-4 w-4" />For members only</p>
              <p className="mt-1.5 text-sm leading-relaxed text-foreground">
                Your copy is made for you when you download it: your name, your email and today's date are printed on every page, and the download is recorded.
                It is for your own study. Do not share it, upload it or send it outside the Society: every copy says whose it was.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <Button data-ro type="button" variant="solid" onClick={download} disabled={busy !== null}>
                {busy === 'download' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
                {busy === 'download' ? 'Preparing your copy...' : 'Download my copy'}
              </Button>
              <span className="text-xs text-muted-foreground">PDF, {mb(greenbook.size_bytes)}. Up to {perDay} downloads a day.</span>
            </div>
          </div>
        ) : (
          <div className="flex flex-1 flex-col items-center justify-center py-10 text-center">
            <BookOpen aria-hidden className="h-8 w-8 text-accent/60" />
            <p className="mt-3 font-serif text-lg text-foreground">The greenbook is on its way</p>
            <p className="mt-1 max-w-sm text-sm text-muted-foreground">It appears here, to download as your own copy, once the President has uploaded it.</p>
          </div>
        )}

        {canReplace && (
          <div className="mt-6 border-t border-separator pt-5">
            <p className="text-xs font-semibold uppercase tracking-wider text-accent">Only the President and the admin account</p>
            <p className="mt-1.5 text-sm text-muted-foreground">
              Upload the PDF (up to {MAX_MB} MB, not password-protected). It is checked by watermarking it once, the way every download will be, and replaces the current one.
            </p>
            <input ref={fileRef} type="file" accept="application/pdf,.pdf" className="hidden" data-ro
              onChange={(e) => { const f = e.target.files?.[0]; if (f) void upload(f); }} aria-label="Choose the greenbook PDF" />
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <Button data-ro type="button" variant="outline" size="sm" onClick={() => fileRef.current?.click()} disabled={busy !== null}>
                {busy === 'upload' ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileUp className="h-4 w-4" />}
                {busy === 'upload' ? stage || 'Uploading...' : greenbook ? 'Replace the PDF' : 'Upload the PDF'}
              </Button>
              {greenbook && (
                <Button data-ro type="button" variant="ghost" size="sm" onClick={() => setAskRemove(true)} disabled={busy !== null} className="text-destructive">
                  <Trash2 className="h-4 w-4" />Remove
                </Button>
              )}
            </div>
          </div>
        )}
      </CareerCard>

      {canReplace ? (
        <CareerCard
          title="Who has a copy" subtitle="Every download, newest first" scroll className="lg:h-full"
          action={<Button data-ro type="button" size="sm" variant="outline" onClick={loadRegister} disabled={loadingRegister}>
            {loadingRegister ? <Loader2 className="h-4 w-4 animate-spin" /> : <Users className="h-4 w-4" />}{register ? 'Refresh' : 'Show'}
          </Button>}
        >
          {register === null ? (
            <p className="text-sm text-muted-foreground">The register is loaded when you ask for it. Each copy carries the name shown here.</p>
          ) : register.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nobody has downloaded it yet.</p>
          ) : (
            <table className="w-full text-left text-sm">
              <thead className="text-xs uppercase tracking-wider text-muted-foreground">
                <tr><th className="pb-2 font-normal">Name</th><th className="pb-2 font-normal">When</th></tr>
              </thead>
              <tbody className="divide-y divide-separator">
                {register.map((r, i) => (
                  <tr key={`${r.downloaded_at}-${i}`}>
                    <td className="py-2 pr-3"><span className="block text-foreground">{r.name}</span>{r.email && <span className="block text-xs text-muted-foreground">{r.email}</span>}</td>
                    <td className="whitespace-nowrap py-2 text-muted-foreground">{formatStamp(r.downloaded_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CareerCard>
      ) : (
        <CareerCard title="Read it with the questions" subtitle="Where the book meets the types" scroll className="lg:h-full">
          {isTheBook ? (
            <ul className="divide-y divide-separator">
              {CHAPTERS.map((c) => (
                <li key={c.ch} className="flex items-baseline gap-3 py-2.5">
                  <span className="w-8 shrink-0 font-serif text-lg text-accent">{c.ch}</span>
                  <span className="min-w-0"><span className="block text-[15px] text-foreground">{c.title}</span><span className="block text-xs text-muted-foreground">Questions: {c.types}</span></span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted-foreground">Work through a chapter, then filter the questions by the same type and test yourself: the book explains the method, the questions check that it stuck.</p>
          )}
        </CareerCard>
      )}

      <AlertDialog open={askRemove} onOpenChange={(o) => { if (busy !== 'remove') setAskRemove(o); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove the greenbook?</AlertDialogTitle>
            <AlertDialogDescription>Members can no longer download it until a new PDF is uploaded. Copies already downloaded are not affected, and the register of downloads is kept.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-ro disabled={busy === 'remove'}>Keep it</AlertDialogCancel>
            <AlertDialogAction data-ro onClick={(e) => { e.preventDefault(); void remove(); }} disabled={busy === 'remove'}>
              {busy === 'remove' ? <Loader2 className="h-4 w-4 animate-spin" /> : null}Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

export default GreenbookView;
