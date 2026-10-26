import { useRef, useState, type ReactNode } from 'react';
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
import type { Greenbook, GreenbookDownload } from '@/lib/brainteasers-api';
import { CareerCard } from './CareerCard';

// =====================================================================
// A book of the Career section that can be downloaded only as the
// reader's own copy, with their name, email and the date on every page
// (see _shared/pdf-watermark.ts). Every download is recorded. The
// President and the admin account replace or remove it and can see who
// has taken a copy.
//
// The greenbook of Career > Brainteasers was the first (GreenbookView);
// the guides of Career > IB Questions are drawn here too (Step 101). The
// page gives the book's words and the four things it can do with it.
//
// What the book is, who it is for and why it matters: for a member, at
// the head of the right-hand card, above how to read it with the
// questions; for the President and the admin account, whose right-hand
// card is the register of downloads, under the download. The download
// itself stays in view either way.
// =====================================================================

const MAX_MB = 60;
const mb = (n: number | null | undefined) => (n ? `${(n / 1024 / 1024).toFixed(1)} MB` : '');

export interface BookActions {
  download: () => Promise<Blob>;
  upload: (file: File, title?: string) => Promise<Greenbook>;
  remove: () => Promise<unknown>;
  register: () => Promise<GreenbookDownload[]>;
}

export interface BookCopy {
  /** "The greenbook" */
  cardTitle: string;
  cardSubtitle: string;
  help: { page: string; topic: string };
  /** The name on the drawn cover when the book has no title, and in messages: "Greenbook". */
  name: string;
  /** The start of the saved file's name: "Greenbook". */
  filePrefix: string;
  /** "the greenbook", inside sentences. */
  inSentence: string;
  emptyTitle: string;
  emptyBody: string;
  pdfLabel: string;
  about: { label: string; text: string }[];
  aboutTitle: string;
  aboutSubtitle: string;
  /** What follows the description for members: how to read the book with the questions. */
  readWith: ReactNode;
}

/** What the book is, who it is for, why it matters. */
export function About({ items }: { items: { label: string; text: string }[] }) {
  return (
    <dl className="space-y-2.5">
      {items.map((a) => (
        <div key={a.label} className="grid gap-0.5 sm:grid-cols-[7.5rem_minmax(0,1fr)] sm:gap-3">
          <dt className="text-xs font-semibold uppercase tracking-wider text-accent sm:pt-0.5">{a.label}</dt>
          <dd className="text-sm leading-relaxed text-foreground">{a.text}</dd>
        </div>
      ))}
    </dl>
  );
}

export function BookView({ book, canReplace, perDay, onChange, actions, copy }: {
  book: Greenbook | null;
  canReplace: boolean;
  perDay: number;
  onChange: (g: Greenbook | null) => void;
  actions: BookActions;
  copy: BookCopy;
}) {
  const { profile } = useAuth();
  const { toast } = useToast();
  const [busy, setBusy] = useState<null | 'download' | 'upload' | 'remove'>(null);
  const [stage, setStage] = useState('');
  const [askRemove, setAskRemove] = useState(false);
  const [register, setRegister] = useState<GreenbookDownload[] | null>(null);
  const [loadingRegister, setLoadingRegister] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const download = async () => {
    setBusy('download');
    try {
      const blob = await actions.download();
      const who = (profile?.full_name || 'member').normalize('NFKD').replace(/[̀-ͯ]/g, '').replace(/[^A-Za-z0-9]+/g, '_').replace(/^_|_$/g, '');
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${copy.filePrefix}_${who || 'member'}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
      toast({ title: 'Your copy is downloading', description: 'It carries your name on every page. Keep it to yourself.' });
    } catch (e) {
      toast({ title: `Could not download ${copy.inSentence}`, description: friendlyError(e), variant: 'destructive' });
    } finally { setBusy(null); }
  };

  const upload = async (file: File) => {
    if (file.type && file.type !== 'application/pdf') { toast({ title: 'Choose a PDF', variant: 'destructive' }); return; }
    if (file.size > MAX_MB * 1024 * 1024) { toast({ title: `The PDF must be under ${MAX_MB} MB`, variant: 'destructive' }); return; }
    setBusy('upload');
    setStage(`Uploading ${mb(file.size)}...`);
    const slow = window.setTimeout(() => setStage('Checking the file...'), 6000);
    try {
      const g = await actions.upload(file, book?.title || undefined);
      onChange(g);
      setRegister(null);
      toast({ title: book ? `${copy.name} replaced` : `${copy.name} uploaded`, description: `${g.pages ? `${g.pages} pages, ` : ''}${mb(g.size_bytes)}. Every download now carries the reader's name.` });
    } catch (e) {
      toast({ title: `Could not upload ${copy.inSentence}`, description: friendlyError(e), variant: 'destructive' });
    } finally {
      window.clearTimeout(slow);
      setBusy(null); setStage('');
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  const remove = async () => {
    setBusy('remove');
    try {
      await actions.remove();
      onChange(null);
      setAskRemove(false);
      toast({ title: `${copy.name} removed` });
    } catch (e) {
      toast({ title: `Could not remove ${copy.inSentence}`, description: friendlyError(e), variant: 'destructive' });
    } finally { setBusy(null); }
  };

  const loadRegister = async () => {
    setLoadingRegister(true);
    try { setRegister(await actions.register()); }
    catch (e) { toast({ title: 'Could not load the downloads', description: friendlyError(e), variant: 'destructive' }); }
    finally { setLoadingRegister(false); }
  };

  return (
    <div className="grid grid-cols-1 gap-4 lg:min-h-0 lg:flex-1 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)]">
      <CareerCard title={copy.cardTitle} subtitle={copy.cardSubtitle} scroll className="lg:h-full" action={<HelpDot page={copy.help.page} topic={copy.help.topic} />}>
        {book ? (
          <div className="space-y-5">
            <div className="flex items-start gap-4">
              <div aria-hidden className="flex h-28 w-20 shrink-0 flex-col justify-between rounded-md bg-accent p-2.5 text-accent-foreground shadow-[0_6px_18px_-8px_hsl(var(--overlay)/0.6)]">
                <BookOpen className="h-5 w-5 opacity-80" />
                <span className="font-serif text-[11px] leading-tight">{(book.title || copy.name).split(' ').slice(0, 4).join(' ')}</span>
              </div>
              <div className="min-w-0">
                <p className="font-serif text-xl leading-snug text-foreground">{book.title || book.file_name}</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  {[book.pages ? `${book.pages} pages` : '', mb(book.size_bytes), `updated ${formatStamp(book.updated_at)}`].filter(Boolean).join(' · ')}
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
              <span className="text-xs text-muted-foreground">PDF, {mb(book.size_bytes)}. Up to {perDay} downloads a day.</span>
            </div>
          </div>
        ) : (
          <div className="flex flex-1 flex-col items-center justify-center py-10 text-center">
            <BookOpen aria-hidden className="h-8 w-8 text-accent/60" />
            <p className="mt-3 font-serif text-lg text-foreground">{copy.emptyTitle}</p>
            <p className="mt-1 max-w-sm text-sm text-muted-foreground">{copy.emptyBody}</p>
          </div>
        )}

        {canReplace && <div className="mt-6 border-t border-separator pt-5"><About items={copy.about} /></div>}

        {canReplace && (
          <div className="mt-6 border-t border-separator pt-5">
            <p className="text-xs font-semibold uppercase tracking-wider text-accent">Only the President and the admin account</p>
            <p className="mt-1.5 text-sm text-muted-foreground">
              Upload the PDF (up to {MAX_MB} MB, not password-protected). It is checked by watermarking it once, the way every download will be, and replaces the current one.
            </p>
            <input ref={fileRef} type="file" accept="application/pdf,.pdf" className="hidden" data-ro
              onChange={(e) => { const f = e.target.files?.[0]; if (f) void upload(f); }} aria-label={copy.pdfLabel} />
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <Button data-ro type="button" variant="outline" size="sm" onClick={() => fileRef.current?.click()} disabled={busy !== null}>
                {busy === 'upload' ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileUp className="h-4 w-4" />}
                {busy === 'upload' ? stage || 'Uploading...' : book ? 'Replace the PDF' : 'Upload the PDF'}
              </Button>
              {book && (
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
        <CareerCard title={copy.aboutTitle} subtitle={copy.aboutSubtitle} scroll className="lg:h-full">
          <About items={copy.about} />
          {copy.readWith}
        </CareerCard>
      )}

      <AlertDialog open={askRemove} onOpenChange={(o) => { if (busy !== 'remove') setAskRemove(o); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove {copy.inSentence}?</AlertDialogTitle>
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

export default BookView;
