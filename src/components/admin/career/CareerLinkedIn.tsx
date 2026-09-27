import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import {
  ArrowRight, Camera, CircleUserRound, Copy, Check, Download, FileText, Loader2, MessageSquareText,
  AlignLeft, Plus, Trash2, Upload, Image as ImageIcon,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { useAccess } from '@/hooks/useAccess';
import { WorkspaceLoader } from '@/components/admin/WorkspaceLoader';
import { HelpDot } from '@/components/admin/help/HelpSystem';
import { CareerCard, Step } from '@/components/admin/career/CareerCard';
import { CareerPage } from '@/components/admin/career/CareerPage';
import { ABOUT_PROMPT, PORTRAIT_PROMPT } from '@/lib/career/prompts';
import {
  listCareerFiles, uploadCareerFile, renameCareerFile, deleteCareerFile, downloadCareerFile,
  type CareerFile,
} from '@/lib/career-api';

// =====================================================================
// Career > LinkedIn.
// ---------------------------------------------------------------------
// THREE CARDS, ONE SHAPE. Each card is built from the same four rows, in
// the same order and at the same heights, so the same thing sits at the
// same height in all three:
//
//   1. a picture of the job        what goes in, what comes out
//                                  (for the wallpaper: the wallpaper)
//   2. one line                    what it needs, or which banner it is
//   3. the steps                   scrolling inside the card if needed
//   4. the buttons                 one row, filled, at the foot
//
// ICONS ONLY WHERE THEY SAY SOMETHING: the picture row shows a document
// for the CV, a message for the prompt, lines of text for the About
// section, a camera for your photo and a round portrait for the profile
// picture, which is what LinkedIn shows.
//
// THE PROMPTS ARE COPIED, NOT DISPLAYED. The page has no place to read
// them: the button puts the whole text on the clipboard, ready to paste.
//
// THE WALLPAPERS ARE SHOWN WHOLE. They are not in LinkedIn's 4:1 banner
// shape and LinkedIn crops them itself, so each is drawn at its own
// proportions (from the width and height recorded at upload), and the
// "LinkedIn view" switch shades what LinkedIn will cut away.
//
// The background and the wallpapers are changed by the President, the
// Vice President and the Head of Operations, from a Manage window on the
// card, so the cards look the same for everybody else.
// =====================================================================

/** LinkedIn's banner is 1584 x 396: four times as wide as it is tall. */
const LINKEDIN_BANNER_RATIO = 4;
const DEFAULT_RATIO = 1734 / 907;

function sizeLabel(bytes: number | null): string {
  if (!bytes) return '';
  return bytes > 1024 * 1024 ? `${(bytes / 1024 / 1024).toFixed(1)} MB` : `${Math.max(1, Math.round(bytes / 1024))} KB`;
}

/** A readable name for a file that was given no label. */
function nameOf(f: CareerFile): string {
  if (f.label) return f.label;
  return f.file_name.replace(/\.[a-z0-9]+$/i, '').replace(/[_-]+/g, ' ').trim() || 'Wallpaper';
}

const ratioOf = (f: CareerFile) => (f.width && f.height ? f.width / f.height : DEFAULT_RATIO);

/** Copy text, with the older route for browsers that refuse the clipboard API. */
async function copyText(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch { /* fall through to the older route */ }
  try {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.setAttribute('readonly', '');
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    const ok = document.execCommand('copy');
    ta.remove();
    return ok;
  } catch {
    return false;
  }
}

function CopyPromptButton({ text, what }: { text: string; what: string }) {
  const { toast } = useToast();
  const [copied, setCopied] = useState(false);
  useEffect(() => {
    if (!copied) return;
    const t = setTimeout(() => setCopied(false), 2500);
    return () => clearTimeout(t);
  }, [copied]);
  const copy = async () => {
    if (await copyText(text)) {
      setCopied(true);
      toast({ title: 'Prompt copied', description: `Paste it into the AI chat, together with ${what}.` });
    } else {
      toast({
        title: 'Your browser did not allow copying',
        description: 'Allow clipboard access for this site, or try another browser.',
        variant: 'destructive',
      });
    }
  };
  return (
    <Button variant="solid" className="w-full" onClick={copy} data-ro-allow aria-live="polite">
      {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
      {copied ? 'Copied' : 'Copy prompt'}
    </Button>
  );
}

// ---------------------------------------------------------------------
// Row 1: the picture of the job. The same box in every card.
// ---------------------------------------------------------------------

const VISUAL_BOX = 'h-36 shrink-0 rounded-lg bg-muted/40';

interface FlowItem { icon?: ReactNode; image?: string | null; label: string; result?: boolean }

/**
 * The inputs, joined by "+", and the result after an arrow. A grid of two
 * rows, so the joiners sit level with the middle of the squares whatever
 * the length of the captions under them.
 */
function Flow({ items, label }: { items: FlowItem[]; label: string }) {
  const columns = items.map((_, i) => (i === 0 ? 'minmax(0,1fr)' : 'auto minmax(0,1fr)')).join(' ');
  return (
    <div className={`${VISUAL_BOX} flex items-center px-3`} role="img" aria-label={label}>
      <div className="grid w-full items-center gap-x-1.5 gap-y-1.5 sm:gap-x-2" style={{ gridTemplateColumns: columns }}>
        {items.map((it, i) => (
          <FlowSquare key={`s${i}`} item={it} joiner={i === 0 ? null : it.result ? 'arrow' : 'plus'} />
        ))}
        {items.map((it, i) => (
          <FlowCaption key={`c${i}`} text={it.label} first={i === 0} />
        ))}
      </div>
    </div>
  );
}

function FlowSquare({ item, joiner }: { item: FlowItem; joiner: 'plus' | 'arrow' | null }) {
  return (
    <>
      {joiner && (
        <span aria-hidden className="flex justify-center text-sm leading-none text-muted-foreground">
          {joiner === 'arrow' ? <ArrowRight className="h-4 w-4" /> : '+'}
        </span>
      )}
      <div className="flex min-w-0 justify-center">
        <div
          className={`flex aspect-square w-full max-w-[5rem] items-center justify-center overflow-hidden rounded-lg border ${
            item.result ? 'border-accent bg-accent text-accent-foreground' : 'border-separator bg-background text-accent'
          }`}
        >
          {item.image ? <img src={item.image} alt="" className="h-full w-full object-cover" /> : item.icon}
        </div>
      </div>
    </>
  );
}

function FlowCaption({ text, first }: { text: string; first: boolean }) {
  return (
    <>
      {!first && <span aria-hidden />}
      <span className="min-w-0 self-start text-center text-[10px] leading-tight text-muted-foreground sm:text-[11px]">{text}</span>
    </>
  );
}

/** The size of the largest box of a given shape that fits in the element. */
function useFitted(ratio: number) {
  const ref = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState<{ w: number; h: number } | null>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const fit = () => {
      const W = el.clientWidth; const H = el.clientHeight;
      if (!W || !H) return;
      const w = Math.min(W, H * ratio);
      setSize({ w, h: w / ratio });
    };
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(el);
    return () => ro.disconnect();
  }, [ratio]);
  return { ref, size };
}

/** The selected wallpaper, whole, with LinkedIn's band on request. */
function WallpaperStage({ file, showFrame }: { file: CareerFile; showFrame: boolean }) {
  const ratio = ratioOf(file);
  const { ref, size } = useFitted(ratio);
  // The band LinkedIn keeps: a full-width strip when the picture is taller
  // than 4:1, a full-height one when it is wider.
  const band = ratio < LINKEDIN_BANNER_RATIO
    ? { axis: 'y' as const, keep: ratio / LINKEDIN_BANNER_RATIO }
    : { axis: 'x' as const, keep: LINKEDIN_BANNER_RATIO / ratio };
  const shade = `${((1 - band.keep) / 2) * 100}%`;
  return (
    <div ref={ref} className="flex h-full min-w-0 flex-1 items-center justify-center">
      {size && (
        <div className="relative overflow-hidden rounded-md" style={{ width: size.w, height: size.h }}>
          {file.view_url
            ? <img src={file.view_url} alt={nameOf(file)} className="h-full w-full object-cover" />
            : <div className="flex h-full w-full items-center justify-center bg-muted text-muted-foreground"><ImageIcon className="h-6 w-6" /></div>}
          {showFrame && band.keep < 0.999 && (
            <div aria-hidden className="pointer-events-none absolute inset-0">
              {band.axis === 'y' ? (
                <>
                  <div className="absolute inset-x-0 top-0 bg-black/55" style={{ height: shade }} />
                  <div className="absolute inset-x-0 bottom-0 bg-black/55" style={{ height: shade }} />
                  <div className="absolute inset-x-0 border-y-2 border-dashed border-white/90" style={{ top: shade, bottom: shade }} />
                </>
              ) : (
                <>
                  <div className="absolute inset-y-0 left-0 bg-black/55" style={{ width: shade }} />
                  <div className="absolute inset-y-0 right-0 bg-black/55" style={{ width: shade }} />
                  <div className="absolute inset-y-0 border-x-2 border-dashed border-white/90" style={{ left: shade, right: shade }} />
                </>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/** Row 2: one line under the picture, the same height in every card. */
function Caption({ children, aside }: { children: ReactNode; aside?: ReactNode }) {
  return (
    <div className="mt-2 flex h-7 shrink-0 items-center justify-between gap-2">
      <span className="min-w-0 truncate text-xs text-muted-foreground">{children}</span>
      {aside}
    </div>
  );
}

/** Row 3: the steps, scrolling inside the card on a computer if needed. */
function Steps({ children }: { children: ReactNode }) {
  return (
    <ol className="mt-3 space-y-3 lg:min-h-0 lg:flex-1 lg:ws-card-scroll lg:-mr-2 lg:pr-2">{children}</ol>
  );
}

/** Row 4: the buttons, one row at the foot of the card. */
function Actions({ children }: { children: ReactNode }) {
  return <div className="mt-4 grid shrink-0 grid-cols-1 gap-2 lg:mt-auto lg:pt-4">{children}</div>;
}

// =====================================================================

export default function CareerLinkedIn() {
  const { session } = useAuth();
  const { toast } = useToast();
  const access = useAccess();
  const [loading, setLoading] = useState(true);
  const [background, setBackground] = useState<CareerFile | null>(null);
  const [wallpapers, setWallpapers] = useState<CareerFile[]>([]);
  const [canManage, setCanManage] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showFrame, setShowFrame] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [manage, setManage] = useState<'background' | 'wallpapers' | null>(null);
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [confirmDelete, setConfirmDelete] = useState<CareerFile | null>(null);
  const bgInput = useRef<HTMLInputElement>(null);
  const wpInput = useRef<HTMLInputElement>(null);

  const load = async (keepSelection?: string | null) => {
    try {
      const res = await listCareerFiles(session, ['portrait_background', 'wallpaper']);
      const bg = res.files.find((f) => f.kind === 'portrait_background') ?? null;
      const wps = res.files.filter((f) => f.kind === 'wallpaper');
      setBackground(bg);
      setWallpapers(wps);
      setCanManage(!!res.can_manage.wallpaper || !!res.can_manage.portrait_background);
      setSelectedId((cur) => {
        const want = keepSelection !== undefined ? keepSelection : cur;
        return want && wps.some((w) => w.id === want) ? want : wps[0]?.id ?? null;
      });
    } catch (e) {
      toast({ title: 'Could not load the LinkedIn files', description: e instanceof Error ? e.message : undefined, variant: 'destructive' });
    } finally { setLoading(false); }
  };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { load(); }, []);

  // The server decides; the page also respects the phone's read-only cap.
  const mayManage = canManage && access.canManage('career-linkedin');
  const selected = useMemo(() => wallpapers.find((w) => w.id === selectedId) ?? null, [wallpapers, selectedId]);

  const download = async (f: CareerFile | null, what: string) => {
    if (!f) return;
    setBusy(`download-${f.id}`);
    try {
      await downloadCareerFile(session, f);
    } catch (e) {
      toast({ title: `Could not download the ${what}`, description: e instanceof Error ? e.message : undefined, variant: 'destructive' });
    } finally { setBusy(null); }
  };

  const uploadBackground = async (f: File | undefined) => {
    if (!f) return;
    setBusy('background');
    try {
      await uploadCareerFile(session, 'portrait_background', f, { label: 'Portrait background' });
      toast({ title: 'Background replaced', description: 'Members now download the new background.' });
      await load();
    } catch (e) {
      toast({ title: 'Could not replace the background', description: e instanceof Error ? e.message : undefined, variant: 'destructive' });
    } finally {
      setBusy(null);
      if (bgInput.current) bgInput.current.value = '';
    }
  };

  const uploadWallpapers = async (list: FileList | null) => {
    const files = Array.from(list ?? []);
    if (files.length === 0) return;
    setBusy('wallpaper');
    let added = 0;
    try {
      for (const f of files) {
        const label = f.name.replace(/\.[a-z0-9]+$/i, '').replace(/[_-]+/g, ' ').trim().slice(0, 120);
        try {
          await uploadCareerFile(session, 'wallpaper', f, { label });
          added += 1;
        } catch (e) {
          toast({ title: `Could not add ${f.name}`, description: e instanceof Error ? e.message : undefined, variant: 'destructive' });
        }
      }
      if (added > 0) toast({ title: added === 1 ? 'Wallpaper added' : `${added} wallpapers added` });
      await load(null);
    } finally {
      setBusy(null);
      if (wpInput.current) wpInput.current.value = '';
    }
  };

  const saveLabel = async (f: CareerFile) => {
    const label = (drafts[f.id] ?? '').trim();
    if (!label) { toast({ title: 'Give the wallpaper a name', variant: 'destructive' }); return; }
    setBusy(`rename-${f.id}`);
    try {
      await renameCareerFile(session, f.id, label);
      setDrafts((d) => { const n = { ...d }; delete n[f.id]; return n; });
      await load(selectedId);
      toast({ title: 'Wallpaper renamed', description: label });
    } catch (e) {
      toast({ title: 'Could not rename the wallpaper', description: e instanceof Error ? e.message : undefined, variant: 'destructive' });
    } finally { setBusy(null); }
  };

  const removeWallpaper = async (f: CareerFile) => {
    setBusy(`delete-${f.id}`);
    try {
      await deleteCareerFile(session, f.id);
      toast({ title: 'Wallpaper removed', description: nameOf(f) });
      await load(selectedId === f.id ? null : selectedId);
    } catch (e) {
      toast({ title: 'Could not remove the wallpaper', description: e instanceof Error ? e.message : undefined, variant: 'destructive' });
    } finally { setBusy(null); setConfirmDelete(null); }
  };

  const manageButton = (which: 'background' | 'wallpapers') => mayManage && (
    <Button variant="outline" size="sm" className="h-7 px-2.5 text-xs" onClick={() => setManage(which)}>Manage</Button>
  );

  return (
    <CareerPage
      title="LinkedIn"
      description="Make your LinkedIn profile recruiter-ready: an About section, a professional photo and a Minerva banner."
    >
      {loading ? <WorkspaceLoader /> : (
        <div className="grid grid-cols-1 gap-4 lg:min-h-0 lg:flex-1 lg:grid-cols-3 lg:items-stretch">
          {/* ---------------- 1. About Section ---------------- */}
          <CareerCard
            title="About Section"
            subtitle="Written from your CV"
            action={<HelpDot page="career-linkedin" topic="about" />}
            className="lg:min-h-0"
            bodyClassName="lg:min-h-0"
          >
            <Flow
              label="Your CV plus the prompt, in an AI chat, gives your About section"
              items={[
                { icon: <FileText className="h-7 w-7" />, label: 'Your CV (PDF)' },
                { icon: <MessageSquareText className="h-7 w-7" />, label: 'The prompt' },
                { icon: <AlignLeft className="h-7 w-7" />, label: 'Your About section', result: true },
              ]}
            />
            <Caption>Works in ChatGPT, Claude, Gemini or similar.</Caption>
            <Steps>
              <Step n={1}>Copy the prompt with the button below.</Step>
              <Step n={2}>Open an AI chat and attach your CV as a PDF.</Step>
              <Step n={3}>Paste the prompt, send it and answer any question it asks you.</Step>
              <Step n={4}>Correct anything that is not true or does not sound like you, then paste it into About on LinkedIn.</Step>
            </Steps>
            <Actions>
              <CopyPromptButton text={ABOUT_PROMPT} what="your CV" />
            </Actions>
          </CareerCard>

          {/* ---------------- 2. Profile Picture ---------------- */}
          <CareerCard
            title="Profile Picture"
            subtitle="Your photo, the Minerva background"
            action={<>{manageButton('background')}<HelpDot page="career-linkedin" topic="portrait" /></>}
            className="lg:min-h-0"
            bodyClassName="lg:min-h-0"
          >
            <Flow
              label="Your square photo plus the Minerva background plus the prompt, in an AI that edits images, gives your profile picture"
              items={[
                { icon: <Camera className="h-7 w-7" />, label: 'Image 1: your photo' },
                { image: background?.view_url, icon: <ImageIcon className="h-7 w-7" />, label: 'Image 2: background' },
                { icon: <MessageSquareText className="h-7 w-7" />, label: 'The prompt' },
                { icon: <CircleUserRound className="h-7 w-7" />, label: 'Your profile picture', result: true },
              ]}
            />
            <Caption>Needs an AI chat that can edit images.</Caption>
            <Steps>
              <Step n={1}>Choose a square photo of yourself in formal clothes, facing the camera, in good light: this is Image 1.</Step>
              <Step n={2}>Download the Minerva background: this is Image 2.</Step>
              <Step n={3}>Attach Image 1 and then Image 2, in this order, paste the prompt and send it.</Step>
              <Step n={4}>Check that your face is exactly as in your photo, then upload the result to LinkedIn.</Step>
            </Steps>
            {/* Two buttons, in the order of the steps. "Copy prompt" is the
                last, so it sits level with the About card's. */}
            <Actions>
              <Button
                variant="solid" className="w-full"
                disabled={!background || busy === `download-${background?.id}`}
                onClick={() => download(background, 'background')}
                title={background ? undefined : 'The background has not been uploaded yet'}
              >
                {busy === `download-${background?.id}` ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
                Download the background
              </Button>
              <CopyPromptButton text={PORTRAIT_PROMPT} what="your photo and the background" />
            </Actions>
          </CareerCard>

          {/* ---------------- 3. Wallpaper ---------------- */}
          <CareerCard
            title="Wallpaper"
            subtitle={wallpapers.length === 1 ? '1 banner to choose from' : `${wallpapers.length} banners to choose from`}
            action={<>{manageButton('wallpapers')}<HelpDot page="career-linkedin" topic="wallpaper" /></>}
            className="lg:min-h-0"
            bodyClassName="lg:min-h-0"
          >
            <div className={`${VISUAL_BOX} flex gap-2 p-2`}>
              {selected ? (
                <>
                  <WallpaperStage file={selected} showFrame={showFrame} />
                  {wallpapers.length > 1 && (
                    <div className="ws-card-scroll w-16 shrink-0 space-y-2 pr-0.5" role="radiogroup" aria-label="Choose a wallpaper">
                      {wallpapers.map((w) => {
                        const on = w.id === selectedId;
                        return (
                          <button
                            key={w.id} type="button" role="radio" aria-checked={on} data-ro-allow
                            onClick={() => setSelectedId(w.id)}
                            title={nameOf(w)}
                            className={`block w-full overflow-hidden rounded border bg-muted transition ${
                              on ? 'border-accent ring-2 ring-accent' : 'border-separator opacity-75 hover:opacity-100'
                            }`}
                            style={{ aspectRatio: String(ratioOf(w)) }}
                          >
                            {w.view_url && <img src={w.view_url} alt={nameOf(w)} className="h-full w-full object-cover" loading="lazy" />}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </>
              ) : (
                <div className="flex flex-1 items-center justify-center px-4 text-center text-sm text-muted-foreground">
                  No wallpaper has been uploaded yet.{mayManage ? ' Add the first one from Manage.' : ' They will appear here as soon as the Board adds them.'}
                </div>
              )}
            </div>
            <Caption
              aside={selected && (
                <button
                  type="button" data-ro-allow
                  onClick={() => setShowFrame((v) => !v)}
                  aria-pressed={showFrame}
                  className={`shrink-0 whitespace-nowrap rounded-full border px-2.5 py-0.5 text-[11px] transition-colors ${
                    showFrame ? 'border-accent bg-accent text-accent-foreground' : 'border-separator text-muted-foreground hover:text-foreground'
                  }`}
                >
                  LinkedIn view
                </button>
              )}
            >
              {selected
                ? [nameOf(selected), selected.width && selected.height ? `${selected.width} × ${selected.height}` : ''].filter(Boolean).join(' · ')
                : 'Banners appear here once uploaded.'}
            </Caption>
            <Steps>
              <Step n={1}>Pick a banner. Switch on LinkedIn view to see the part LinkedIn shows.</Step>
              <Step n={2}>Download it with the button below.</Step>
              <Step n={3}>On LinkedIn, click the camera on your banner, upload it and drag it into place.</Step>
            </Steps>
            <Actions>
              <Button
                variant="solid" className="w-full"
                disabled={!selected || busy === `download-${selected?.id}`}
                onClick={() => download(selected, 'wallpaper')}
              >
                {busy === `download-${selected?.id}` ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
                Download wallpaper
              </Button>
            </Actions>
          </CareerCard>
        </div>
      )}

      {/* ---------------- Manage: background ---------------- */}
      <Dialog open={manage === 'background'} onOpenChange={(o) => { if (!o) setManage(null); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Portrait background</DialogTitle>
            <DialogDescription>
              The image members attach as Image 2. A new upload replaces it for everybody at once. JPEG, PNG or WebP, up to 15 MB.
            </DialogDescription>
          </DialogHeader>
          {background ? (
            <div className="flex items-center gap-3 rounded-lg border border-separator p-2">
              {background.view_url && <img src={background.view_url} alt="" className="h-12 w-auto rounded object-cover" style={{ aspectRatio: String(ratioOf(background)) }} />}
              <div className="min-w-0 text-sm">
                <p className="truncate text-foreground">{background.file_name}</p>
                <p className="text-xs text-muted-foreground">{[background.width && background.height ? `${background.width} × ${background.height}` : '', sizeLabel(background.size_bytes)].filter(Boolean).join(' · ')}</p>
              </div>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No background has been uploaded yet.</p>
          )}
          <input ref={bgInput} type="file" className="hidden" accept="image/jpeg,image/png,image/webp" onChange={(e) => uploadBackground(e.target.files?.[0])} />
          <Button variant="solid" disabled={busy !== null} onClick={() => bgInput.current?.click()}>
            {busy === 'background' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
            {background ? 'Upload a new background' : 'Upload the background'}
          </Button>
        </DialogContent>
      </Dialog>

      {/* ---------------- Manage: wallpapers ---------------- */}
      <Dialog open={manage === 'wallpapers'} onOpenChange={(o) => { if (!o) { setManage(null); setDrafts({}); } }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Wallpapers</DialogTitle>
            <DialogDescription>
              Upload them as they are, without cropping: LinkedIn crops them itself, and the page shows them whole. JPEG, PNG or WebP, up to 15 MB each.
            </DialogDescription>
          </DialogHeader>
          <div className="max-h-[50vh] space-y-2 overflow-y-auto pr-1">
            {wallpapers.length === 0 && <p className="text-sm text-muted-foreground">No wallpaper yet.</p>}
            {wallpapers.map((w) => {
              const draft = drafts[w.id];
              const changed = draft !== undefined && draft.trim() !== nameOf(w);
              return (
                <div key={w.id} className="flex items-center gap-2 rounded-lg border border-separator p-2">
                  {w.view_url && <img src={w.view_url} alt="" className="h-10 w-auto shrink-0 rounded object-cover" style={{ aspectRatio: String(ratioOf(w)) }} />}
                  <Input
                    value={draft ?? nameOf(w)} maxLength={120} aria-label={`Name of ${nameOf(w)}`}
                    onChange={(e) => setDrafts((d) => ({ ...d, [w.id]: e.target.value }))}
                    onKeyDown={(e) => { if (e.key === 'Enter' && changed) saveLabel(w); }}
                    className="h-9 min-w-0 flex-1"
                  />
                  {changed && (
                    <Button size="sm" variant="solid" disabled={busy !== null} onClick={() => saveLabel(w)}>
                      {busy === `rename-${w.id}` && <Loader2 className="h-4 w-4 animate-spin" />}Save
                    </Button>
                  )}
                  <Button size="icon" variant="ghost" className="h-9 w-9 shrink-0" disabled={busy !== null} onClick={() => setConfirmDelete(w)} aria-label={`Remove ${nameOf(w)}`}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              );
            })}
          </div>
          <input ref={wpInput} type="file" multiple className="hidden" accept="image/jpeg,image/png,image/webp" onChange={(e) => uploadWallpapers(e.target.files)} />
          <Button variant="solid" disabled={busy !== null} onClick={() => wpInput.current?.click()}>
            {busy === 'wallpaper' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
            Add wallpapers
          </Button>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!confirmDelete} onOpenChange={(o) => { if (!o) setConfirmDelete(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove this wallpaper?</AlertDialogTitle>
            <AlertDialogDescription>
              {confirmDelete ? `"${nameOf(confirmDelete)}" will no longer be offered to members. Members who already downloaded it keep their copy.` : ''}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep it</AlertDialogCancel>
            <AlertDialogAction onClick={(e) => { e.preventDefault(); if (confirmDelete) removeWallpaper(confirmDelete); }} disabled={busy !== null}>
              {busy === `delete-${confirmDelete?.id}` && <Loader2 className="h-4 w-4 animate-spin" />}Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </CareerPage>
  );
}
