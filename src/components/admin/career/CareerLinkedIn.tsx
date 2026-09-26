import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import {
  Copy, Check, Download, Upload, Loader2, Trash2, Pencil, ChevronDown, ChevronUp,
  FileText, Sparkles, UserRound, Image as ImageIcon, Plus, ArrowRight, Frame, Camera, PanelTop,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { useAccess } from '@/hooks/useAccess';
import { WorkspacePageHeader } from '@/components/admin/WorkspacePageHeader';
import { WorkspaceLoader } from '@/components/admin/WorkspaceLoader';
import { HelpDot } from '@/components/admin/help/HelpSystem';
import { CareerCard, Step } from '@/components/admin/career/CareerCard';
import { ABOUT_PROMPT, PORTRAIT_PROMPT } from '@/lib/career/prompts';
import {
  listCareerFiles, uploadCareerFile, renameCareerFile, deleteCareerFile, downloadFrom,
  type CareerFile,
} from '@/lib/career-api';

// =====================================================================
// Career > LinkedIn.
// ---------------------------------------------------------------------
// Three cards of equal width, one per part of a profile, each with the
// same shape: what you put in, what you get out, the steps, and one
// button that does the association's half of the work.
//
//   About Section    copy the prompt; attach your CV to an AI chat
//   Profile Picture  copy the prompt, download the background; attach
//                    your square photo and the background to an AI that
//                    edits images
//   Wallpaper        pick one of the association's banners and download
//                    it
//
// THE WALLPAPERS ARE SHOWN WHOLE. They are not in LinkedIn's 4:1 banner
// shape, and LinkedIn crops them itself when they are uploaded, so the
// gallery lays each one out at its own proportions (from the width and
// height recorded at upload) and never crops it. A switch draws the band
// LinkedIn will show on top of it, for the member who wants to see it.
//
// The background and the wallpapers are changed by the President, the
// Vice President and the Head of Operations; the controls for that are
// drawn only for them, and the `career-files` function checks again.
// =====================================================================

/** LinkedIn's banner is 1584 x 396: four times as wide as it is tall. */
const LINKEDIN_BANNER_RATIO = 4;

function wordCount(text: string): number {
  return text.trim().split(/\s+/).length;
}

function sizeLabel(bytes: number | null): string {
  if (!bytes) return '';
  return bytes > 1024 * 1024 ? `${(bytes / 1024 / 1024).toFixed(1)} MB` : `${Math.max(1, Math.round(bytes / 1024))} KB`;
}

/** A readable name for a file that was given no label. */
function nameOf(f: CareerFile): string {
  if (f.label) return f.label;
  return f.file_name.replace(/\.[a-z0-9]+$/i, '').replace(/[_-]+/g, ' ').trim() || 'Wallpaper';
}

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
    const ok = await copyText(text);
    if (ok) {
      setCopied(true);
      toast({ title: 'Prompt copied', description: `Paste it into the AI chat, together with ${what}.` });
    } else {
      toast({ title: 'Could not copy the prompt', description: 'Open "Read the prompt" below and copy it by hand.', variant: 'destructive' });
    }
  };
  return (
    <Button className="w-full" onClick={copy} data-ro-allow aria-live="polite">
      {copied ? <Check className="h-4 w-4 mr-2" /> : <Copy className="h-4 w-4 mr-2" />}
      {copied ? 'Copied' : 'Copy prompt'}
    </Button>
  );
}

/** The prompt itself, folded away until asked for. */
function PromptPeek({ text }: { text: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="rounded-lg border border-separator">
      <button
        type="button" data-ro-allow
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="w-full flex items-center justify-between gap-2 px-3 py-2 text-xs text-muted-foreground hover:text-foreground"
      >
        <span>{open ? 'Hide the prompt' : 'Read the prompt'} <span className="tabular-nums">({wordCount(text).toLocaleString('en-GB')} words)</span></span>
        {open ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
      </button>
      {open && (
        <pre className="max-h-72 overflow-y-auto overscroll-contain border-t border-separator px-3 py-2 whitespace-pre-wrap break-words font-mono text-[11px] leading-relaxed text-foreground/85">
          {text}
        </pre>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------
// The "what goes in, what comes out" strip at the top of a card.
// ---------------------------------------------------------------------

interface FlowItem { icon?: ReactNode; image?: string | null; label: string; result?: boolean }

/**
 * The inputs, joined by "+", and the result after an arrow. A grid of two
 * rows, so the joiners sit level with the middle of the squares whatever
 * the length of the captions under them.
 */
function Flow({ items, label }: { items: FlowItem[]; label: string }) {
  const columns = items.map((_, i) => (i === 0 ? 'minmax(0,1fr)' : 'auto minmax(0,1fr)')).join(' ');
  return (
    <div
      className="grid items-center gap-x-1.5 sm:gap-x-2 gap-y-1.5 rounded-lg bg-muted/30 p-3 mb-5"
      style={{ gridTemplateColumns: columns }}
      role="img" aria-label={label}
    >
      {items.map((it, i) => (
        <FlowSquare key={`s${i}`} item={it} joiner={i === 0 ? null : it.result ? 'arrow' : 'plus'} />
      ))}
      {items.map((it, i) => (
        <FlowCaption key={`c${i}`} text={it.label} first={i === 0} />
      ))}
    </div>
  );
}

function FlowSquare({ item, joiner }: { item: FlowItem; joiner: 'plus' | 'arrow' | null }) {
  return (
    <>
      {joiner && (
        <span aria-hidden className="text-muted-foreground text-sm leading-none flex justify-center">
          {joiner === 'arrow' ? <ArrowRight className="h-4 w-4" /> : '+'}
        </span>
      )}
      <div className="flex justify-center min-w-0">
        <div
          className={`w-full max-w-[5.5rem] aspect-square rounded-lg border overflow-hidden flex items-center justify-center ${
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
      <span className="self-start text-[10px] sm:text-[11px] leading-tight text-center text-muted-foreground min-w-0">{text}</span>
    </>
  );
}

// ---------------------------------------------------------------------
// A small panel for the managers, at the foot of a card.
// ---------------------------------------------------------------------

function ManagerPanel({ title, note, children }: { title: string; note: string; children: ReactNode }) {
  return (
    <div className="mt-5 rounded-lg border border-dashed border-separator p-3.5">
      <p className="text-sm text-foreground font-medium">{title}</p>
      <p className="mt-1 text-xs text-muted-foreground">{note}</p>
      <div className="mt-3 flex flex-wrap gap-2">{children}</div>
    </div>
  );
}

// ---------------------------------------------------------------------
// The wallpaper stage: the picture whole, at its own proportions.
// ---------------------------------------------------------------------

function WallpaperStage({ file, showFrame }: { file: CareerFile; showFrame: boolean }) {
  const ratio = file.width && file.height ? file.width / file.height : 1734 / 907;
  // The band LinkedIn keeps: a full-width strip when the picture is taller
  // than 4:1, a full-height one when it is wider.
  const band = ratio < LINKEDIN_BANNER_RATIO
    ? { axis: 'y' as const, keep: ratio / LINKEDIN_BANNER_RATIO }
    : { axis: 'x' as const, keep: LINKEDIN_BANNER_RATIO / ratio };
  const shade = `${((1 - band.keep) / 2) * 100}%`;
  return (
    <div className="relative w-full overflow-hidden rounded-lg border border-separator bg-muted" style={{ aspectRatio: String(ratio) }}>
      {file.view_url
        ? <img src={file.view_url} alt={nameOf(file)} className="absolute inset-0 h-full w-full object-contain" />
        : <div className="absolute inset-0 flex items-center justify-center text-muted-foreground"><ImageIcon className="h-6 w-6" /></div>}
      {showFrame && band.keep < 0.999 && (
        <div aria-hidden className="absolute inset-0 pointer-events-none">
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
          <span className="absolute left-2 bottom-2 rounded bg-black/70 px-1.5 py-0.5 text-[10px] uppercase tracking-wider text-white">
            LinkedIn banner, 4:1
          </span>
        </div>
      )}
    </div>
  );
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
  const [renaming, setRenaming] = useState(false);
  const [labelDraft, setLabelDraft] = useState('');
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

  useEffect(() => { setRenaming(false); }, [selectedId]);

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

  const saveLabel = async () => {
    if (!selected) return;
    const label = labelDraft.trim();
    if (!label) { toast({ title: 'Give the wallpaper a name', variant: 'destructive' }); return; }
    setBusy('rename');
    try {
      await renameCareerFile(session, selected.id, label);
      setRenaming(false);
      await load(selected.id);
    } catch (e) {
      toast({ title: 'Could not rename the wallpaper', description: e instanceof Error ? e.message : undefined, variant: 'destructive' });
    } finally { setBusy(null); }
  };

  const removeWallpaper = async (f: CareerFile) => {
    setBusy('delete');
    try {
      await deleteCareerFile(session, f.id);
      toast({ title: 'Wallpaper removed', description: nameOf(f) });
      await load(null);
    } catch (e) {
      toast({ title: 'Could not remove the wallpaper', description: e instanceof Error ? e.message : undefined, variant: 'destructive' });
    } finally { setBusy(null); setConfirmDelete(null); }
  };

  return (
    <div>
      <WorkspacePageHeader
        title="LinkedIn"
        description="Three parts of a profile, done the Minerva way: the About section, the profile picture and the banner."
      />
      {loading ? <WorkspaceLoader /> : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 lg:items-stretch">
          {/* ---------------- 1. About Section ---------------- */}
          <CareerCard
            title="About Section"
            subtitle="Your CV and one prompt"
            icon={<FileText className="h-5 w-5" />}
            action={<HelpDot page="career-linkedin" topic="about" />}
          >
            <Flow
              label="Your CV plus the prompt, in an AI chat, gives your About section"
              items={[
                { icon: <FileText className="h-7 w-7" />, label: 'Your CV, as a PDF' },
                { icon: <Sparkles className="h-7 w-7" />, label: 'The prompt' },
                { icon: <UserRound className="h-7 w-7" />, label: 'Your About section', result: true },
              ]}
            />
            <ol className="space-y-3">
              <Step n={1}>Copy the prompt with the button below.</Step>
              <Step n={2}>Open an AI chat (ChatGPT, Claude, Gemini or similar) and attach your CV as a PDF.</Step>
              <Step n={3}>Paste the prompt and send it. Answer any question it asks you about yourself.</Step>
              <Step n={4}>Read the draft critically: correct anything that is not true or does not sound like you, then paste it into About on LinkedIn.</Step>
            </ol>
            <div className="mt-auto pt-5 space-y-3">
              <CopyPromptButton text={ABOUT_PROMPT} what="your CV" />
              <PromptPeek text={ABOUT_PROMPT} />
            </div>
          </CareerCard>

          {/* ---------------- 2. Profile Picture ---------------- */}
          <CareerCard
            title="Profile Picture"
            subtitle="Your photo on the Minerva background"
            icon={<Camera className="h-5 w-5" />}
            action={<HelpDot page="career-linkedin" topic="portrait" />}
          >
            <Flow
              label="Your square photo plus the Minerva background plus the prompt, in an AI that edits images, gives your profile picture"
              items={[
                { icon: <UserRound className="h-7 w-7" />, label: 'Image 1: your square photo' },
                { image: background?.view_url, icon: <ImageIcon className="h-7 w-7" />, label: 'Image 2: the background' },
                { icon: <Sparkles className="h-7 w-7" />, label: 'The prompt' },
                { icon: <Frame className="h-7 w-7" />, label: 'Your profile picture', result: true },
              ]}
            />
            <ol className="space-y-3">
              <Step n={1}>Choose a square photo of yourself in formal clothes, facing the camera, in good light. This is Image 1.</Step>
              <Step n={2}>Download the Minerva background below. This is Image 2.</Step>
              <Step n={3}>Open an AI that edits images (for example ChatGPT or Gemini), attach Image 1 and then Image 2, in this order, paste the prompt and send it.</Step>
              <Step n={4}>Check that the face is exactly yours and unchanged, then upload the result to LinkedIn as your profile photo.</Step>
            </ol>
            <div className="mt-auto pt-5 space-y-3">
              <CopyPromptButton text={PORTRAIT_PROMPT} what="your photo and the background" />
              <Button
                variant="outline" className="w-full"
                disabled={!background?.download_url}
                onClick={() => background?.download_url && downloadFrom(background.download_url, background.file_name)}
              >
                <Download className="h-4 w-4 mr-2" />
                {background ? 'Download the background' : 'Background not uploaded yet'}
              </Button>
              <PromptPeek text={PORTRAIT_PROMPT} />
            </div>
            {mayManage && (
              <ManagerPanel
                title="Replace the background"
                note="A JPEG, PNG or WebP image, up to 15 MB. It replaces the current one for every member at once."
              >
                <input
                  ref={bgInput} type="file" className="hidden" accept="image/jpeg,image/png,image/webp"
                  onChange={(e) => uploadBackground(e.target.files?.[0])}
                />
                <Button variant="outline" size="sm" disabled={busy !== null} onClick={() => bgInput.current?.click()}>
                  {busy === 'background' ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Upload className="h-4 w-4 mr-2" />}
                  {background ? 'Upload a new background' : 'Upload the background'}
                </Button>
              </ManagerPanel>
            )}
          </CareerCard>

          {/* ---------------- 3. Wallpaper ---------------- */}
          <CareerCard
            title="Wallpaper"
            subtitle={wallpapers.length === 1 ? '1 banner to choose from' : `${wallpapers.length} banners to choose from`}
            icon={<PanelTop className="h-5 w-5" />}
            action={<HelpDot page="career-linkedin" topic="wallpaper" />}
          >
            {selected ? (
              <>
                <WallpaperStage file={selected} showFrame={showFrame} />
                <div className="mt-2 flex items-center justify-between gap-2">
                  <span className="text-[11px] text-muted-foreground">Shown whole, as it downloads.</span>
                  <button
                    type="button" data-ro-allow
                    onClick={() => setShowFrame((v) => !v)}
                    aria-pressed={showFrame}
                    className={`shrink-0 whitespace-nowrap inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] transition-colors ${
                      showFrame ? 'border-accent bg-accent text-accent-foreground' : 'border-separator text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    <Frame className="h-3.5 w-3.5" />
                    What LinkedIn shows
                  </button>
                </div>

                {/* The shelf: every banner at its own proportions. */}
                {wallpapers.length > 1 && (
                  <div className="mt-4 flex flex-wrap gap-2" role="radiogroup" aria-label="Choose a wallpaper">
                    {wallpapers.map((w) => {
                      const r = w.width && w.height ? w.width / w.height : 1734 / 907;
                      const on = w.id === selectedId;
                      return (
                        <button
                          key={w.id} type="button" role="radio" aria-checked={on} data-ro-allow
                          onClick={() => setSelectedId(w.id)}
                          title={nameOf(w)}
                          className={`relative h-10 sm:h-14 max-w-full shrink-0 overflow-hidden rounded-md border bg-muted transition ${
                            on ? 'border-accent ring-2 ring-accent ring-offset-2 ring-offset-background' : 'border-separator opacity-80 hover:opacity-100'
                          }`}
                          style={{ aspectRatio: String(r) }}
                        >
                          {w.view_url && <img src={w.view_url} alt={nameOf(w)} className="h-full w-full object-contain" loading="lazy" />}
                        </button>
                      );
                    })}
                  </div>
                )}

                <div className="mt-4 flex items-baseline justify-between gap-3 min-w-0">
                  <span className="font-serif text-lg text-foreground truncate min-w-0">{nameOf(selected)}</span>
                  <span className="shrink-0 text-xs text-muted-foreground tabular-nums">
                    {[selected.width && selected.height ? `${selected.width} × ${selected.height}` : '', sizeLabel(selected.size_bytes)].filter(Boolean).join(' · ')}
                  </span>
                </div>
              </>
            ) : (
              <div className="rounded-lg border border-dashed border-separator bg-muted/30 px-4 py-10 text-center text-sm text-muted-foreground">
                No wallpaper has been uploaded yet.{mayManage ? ' Add the first one below.' : ' They will appear here as soon as the Board adds them.'}
              </div>
            )}

            <ol className="mt-5 space-y-3">
              <Step n={1}>Pick a banner: the large picture shows the one selected.</Step>
              <Step n={2}>Download it with the button below.</Step>
              <Step n={3}>On LinkedIn, open your profile, click the camera on the banner and upload it. LinkedIn fits it to its 4:1 banner by itself: drag it to choose the part it shows.</Step>
            </ol>

            <div className="mt-auto pt-5">
              <Button
                className="w-full"
                disabled={!selected?.download_url}
                onClick={() => selected?.download_url && downloadFrom(selected.download_url, selected.file_name)}
              >
                <Download className="h-4 w-4 mr-2" />Download wallpaper
              </Button>
            </div>

            {mayManage && (
              <ManagerPanel
                title="Manage the wallpapers"
                note="JPEG, PNG or WebP, up to 15 MB each. Upload them as they are: LinkedIn crops them itself, and the gallery shows them whole."
              >
                <input
                  ref={wpInput} type="file" multiple className="hidden" accept="image/jpeg,image/png,image/webp"
                  onChange={(e) => uploadWallpapers(e.target.files)}
                />
                <Button variant="outline" size="sm" disabled={busy !== null} onClick={() => wpInput.current?.click()}>
                  {busy === 'wallpaper' ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Plus className="h-4 w-4 mr-2" />}
                  Add wallpapers
                </Button>
                {selected && !renaming && (
                  <>
                    <Button variant="outline" size="sm" disabled={busy !== null} onClick={() => { setLabelDraft(nameOf(selected)); setRenaming(true); }}>
                      <Pencil className="h-4 w-4 mr-2" />Rename
                    </Button>
                    <Button variant="outline" size="sm" disabled={busy !== null} onClick={() => setConfirmDelete(selected)}>
                      <Trash2 className="h-4 w-4 mr-2" />Remove
                    </Button>
                  </>
                )}
                {selected && renaming && (
                  <div className="w-full flex flex-col sm:flex-row gap-2">
                    <Input
                      value={labelDraft} maxLength={120} autoFocus aria-label="Wallpaper name"
                      onChange={(e) => setLabelDraft(e.target.value)}
                      onKeyDown={(e) => { if (e.key === 'Enter') saveLabel(); if (e.key === 'Escape') setRenaming(false); }}
                      className="h-9"
                    />
                    <div className="flex gap-2 shrink-0">
                      <Button size="sm" disabled={busy !== null} onClick={saveLabel}>
                        {busy === 'rename' && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}Save
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => setRenaming(false)}>Cancel</Button>
                    </div>
                  </div>
                )}
              </ManagerPanel>
            )}
          </CareerCard>
        </div>
      )}

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
            <AlertDialogAction onClick={(e) => { e.preventDefault(); if (confirmDelete) removeWallpaper(confirmDelete); }} disabled={busy === 'delete'}>
              {busy === 'delete' && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
