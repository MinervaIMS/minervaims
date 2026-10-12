import { useEffect, useRef, useState } from 'react';
import { Download, Upload, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { useAccess } from '@/hooks/useAccess';
import { WorkspaceLoader } from '@/components/admin/WorkspaceLoader';
import { HelpDot } from '@/components/admin/help/HelpSystem';
import { CareerCard, Step } from '@/components/admin/career/CareerCard';
import { CareerPage } from '@/components/admin/career/CareerPage';
import { DocxPreview } from '@/components/admin/career/DocxPreview';
import { prefetchDocx } from '@/components/admin/career/docx-cache';
import { Segmented } from '@/components/admin/career/gpa/shared';
import { CV_DISCLAIMER, CL_DISCLAIMER } from '@/lib/career/disclaimers';
import { listCareerFiles, uploadCareerFile, downloadCareerFile, type CareerFile, type CareerFileKind } from '@/lib/career-api';

// =====================================================================
// Career > CV & Cover Letter: the CV template and the cover letter
// template, one page with a tab each.
// ---------------------------------------------------------------------
// They used to be two pages; they are written together, so they are now
// two tabs (Step 89), each keeping its own permission (`career-cv`,
// `career-cl`) as Social Templates does. The tab is in the address
// (`?tab=cv`, `?tab=cover-letter`) and the old addresses open the right
// tab. Both files are read once, when the page opens, and the other
// tab's document is fetched quietly in the background, so switching tab
// shows it at once instead of loading again.
//
// Each tab is laid out the same way. On a computer it fits the screen: on the left
// the file and its download, with the members-only rule, then how to use
// it and the disclaimer in full, in a card that scrolls on its own; on
// the right, taking most of the width, the document itself, page by
// page. On a phone the parts stack: download first, then the preview.
//
// Downloads are recorded (see `downloadCareerFile`), which is why the
// notice beside the button can say so.
//
// The file is replaced by the President, the Vice President and the Head
// of Operations (access matrix: `career-cv` / `career-cl` at 'manage').
// =====================================================================

type Which = 'cv' | 'cl';
/** The tab in the address, and the template behind it. */
const TAB_WHICH: Record<string, Which> = { cv: 'cv', 'cover-letter': 'cl' };
const KINDS: CareerFileKind[] = ['cv_template', 'cl_template'];

const COPY: Record<Which, {
  resource: string; kind: CareerFileKind; title: string; description: string; noun: string; steps: string[];
}> = {
  cv: {
    resource: 'career-cv', kind: 'cv_template', title: 'CV Template',
    description: 'Write a one-page CV recruiters can read at a glance, following the template and the guide inside it.',
    noun: 'CV template',
    steps: [
      'Download the template and open it in Word, Pages or Google Docs.',
      'Follow the guidance in the document: every bullet is an action, the method and a quantified result.',
      'Remove every square bracket and every note in round brackets, keeping the GDPR line in the footer.',
      'Export it as a one-page PDF named Name_Surname_CV.pdf.',
    ],
  },
  cl: {
    resource: 'career-cl', kind: 'cl_template', title: 'Cover Letter Template',
    description: 'Make a specific case to one firm in one page, with the template guiding you paragraph by paragraph.',
    noun: 'cover letter template',
    steps: [
      'Download the template and open it in Word, Pages or Google Docs.',
      'Write one job per paragraph: who you are, why this firm, your evidence, how you work with people, what happens next.',
      'Name the exact programme, division, office and year as they appear in the posting.',
      'Export it as a one-page PDF named Name_Surname_Cover_Letter_Firm.pdf.',
    ],
  },
};

function sizeLabel(bytes: number | null): string {
  if (!bytes) return '';
  return bytes > 1024 * 1024 ? `${(bytes / 1024 / 1024).toFixed(1)} MB` : `${Math.max(1, Math.round(bytes / 1024))} KB`;
}

export default function CareerTemplate({ tabs, activeTab, onTab }: {
  /** The tabs this reader may open, in order. */
  tabs: { tab: string; resource: string; label: string }[];
  activeTab: string | null;
  onTab: (tab: string) => void;
}) {
  const { session } = useAuth();
  const { toast } = useToast();
  const [files, setFiles] = useState<Partial<Record<CareerFileKind, CareerFile>>>({});
  const [canManage, setCanManage] = useState<Partial<Record<CareerFileKind, boolean>>>({});
  const [loading, setLoading] = useState(true);
  const which: Which = TAB_WHICH[activeTab ?? ''] ?? TAB_WHICH[tabs[0]?.tab ?? ''] ?? 'cv';
  const c = COPY[which];

  // Both templates at once: the first load shows the page loader; a
  // refresh after an upload keeps the page on screen and only swaps the file.
  const load = async (first = false) => {
    if (first) setLoading(true);
    try {
      const res = await listCareerFiles(session, KINDS);
      setFiles(Object.fromEntries(res.files.filter((f) => KINDS.includes(f.kind)).map((f) => [f.kind, f])));
      setCanManage(res.can_manage);
    } catch (e) {
      toast({ title: 'Could not load the templates', description: e instanceof Error ? e.message : undefined, variant: 'destructive' });
    } finally { if (first) setLoading(false); }
  };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { load(true); }, []);

  // The other tab's document, fetched quietly so it shows at once.
  useEffect(() => {
    if (loading) return;
    const other = files[which === 'cv' ? 'cl_template' : 'cv_template'];
    if (!other?.view_url) return;
    const t = window.setTimeout(() => prefetchDocx(other.view_url!), 800);
    return () => window.clearTimeout(t);
  }, [loading, files, which]);

  return (
    <CareerPage
      title="CV & Cover Letter"
      description="A one-page CV recruiters read at a glance, and a cover letter that makes a specific case to one firm: two templates, each with the guide written into it."
      toolbar={tabs.length > 1 ? (
        <Segmented<string>
          value={activeTab ?? tabs[0].tab} onChange={onTab} label="Template" nowrap className="w-full sm:w-auto sm:inline-flex"
          options={tabs.map((t) => ({ value: t.tab, label: t.label === 'CV' ? 'CV template' : 'Cover letter template' }))}
        />
      ) : undefined}
    >
      {loading ? <WorkspaceLoader /> : (
        <TemplateTab key={which} which={which} file={files[c.kind] ?? null} serverCanManage={!!canManage[c.kind]} onReplaced={() => load()} />
      )}
    </CareerPage>
  );
}

/** One template: the file, how to use it, the disclaimer, and the document itself. */
function TemplateTab({ which, file, serverCanManage, onReplaced }: {
  which: Which;
  file: CareerFile | null;
  serverCanManage: boolean;
  onReplaced: () => Promise<void>;
}) {
  const c = COPY[which];
  const disclaimer = which === 'cv' ? CV_DISCLAIMER : CL_DISCLAIMER;
  const { session } = useAuth();
  const { toast } = useToast();
  const access = useAccess();
  const [uploading, setUploading] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [zoom, setZoom] = useState<'fit' | 'actual'>('fit');
  const [fitScale, setFitScale] = useState<number | null>(null);
  const [fullView, setFullView] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const canManage = serverCanManage;

  // The server decides; the page also respects the phone's read-only cap.
  const mayReplace = canManage && access.canManage(c.resource);

  const replace = async (f: File | undefined) => {
    if (!f) return;
    if (!f.name.toLowerCase().endsWith('.docx')) {
      toast({ title: 'Choose a Word document', description: 'The template must be a .docx file.', variant: 'destructive' });
      return;
    }
    setUploading(true);
    try {
      await uploadCareerFile(session, c.kind, f);
      toast({ title: 'Template replaced', description: `Members now download ${f.name}.` });
      await onReplaced();
    } catch (e) {
      toast({ title: 'Could not replace the template', description: e instanceof Error ? e.message : undefined, variant: 'destructive' });
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  const download = async () => {
    if (!file) return;
    setDownloading(true);
    try {
      await downloadCareerFile(session, file);
    } catch (e) {
      toast({ title: 'Could not download the template', description: e instanceof Error ? e.message : undefined, variant: 'destructive' });
    } finally { setDownloading(false); }
  };

  const updated = file ? new Date(file.updated_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '';

  return (
    <>
        {/* The left column has a fixed width on a computer, so every pixel
            the window gains goes to the document. */}
        <div className="flex flex-col gap-4 lg:min-h-0 lg:flex-1 lg:flex-row lg:items-stretch">
          {/* ---- Left: the file, the rule, how to use it, the disclaimer ---- */}
          <div className="min-w-0 flex flex-col gap-4 lg:w-[18rem] lg:shrink-0 2xl:w-[21rem] lg:min-h-0">
            <CareerCard
              title={file ? file.file_name : `The ${c.noun}`}
              subtitle={file ? [sizeLabel(file.size_bytes), `Updated ${updated}`].filter(Boolean).join(' · ') : 'Not uploaded yet'}
              action={<HelpDot page="career-templates" topic={which === 'cv' ? 'use' : 'use-cl'} />}
              className="shrink-0"
            >
              {file ? (
                <Button variant="solid" className="w-full" onClick={download} disabled={downloading}>
                  {downloading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
                  Download the {c.noun}
                </Button>
              ) : (
                <p className="text-sm text-muted-foreground">
                  The {c.noun} has not been uploaded yet.{mayReplace ? ' Upload it below.' : ' It will appear here as soon as the Board uploads it.'}
                </p>
              )}
              <div className="mt-4 border-l-2 border-accent bg-accent/[0.05] px-3.5 py-2.5 text-sm leading-relaxed text-foreground" role="note">
                <strong className="font-semibold">For Minerva members only.</strong>{' '}
                Downloads are tracked. The template is for your personal use: please do not share it outside Minerva.
              </div>
            </CareerCard>

            <CareerCard title="How to use it" scroll className="lg:flex-1">
              <ol className="space-y-3">
                {c.steps.map((s, i) => <Step key={i} n={i + 1}>{s}</Step>)}
              </ol>
              <h3 className="mt-6 mb-3 pb-1.5 border-b border-separator text-[11px] uppercase tracking-wider font-semibold text-accent">Disclaimer</h3>
              <ul className="space-y-3">
                {disclaimer.map((d) => (
                  <li key={d.title} className="text-sm leading-relaxed text-foreground">
                    <strong className="font-semibold">{d.title}</strong> {d.text}
                  </li>
                ))}
              </ul>
            </CareerCard>

            {mayReplace && (
              <div className="shrink-0 rounded-xl border border-dashed border-separator px-4 py-3 flex flex-wrap items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-foreground">Replace the {c.noun}</p>
                  <p className="text-xs text-muted-foreground">A new .docx replaces it for every member at once.</p>
                </div>
                <input
                  ref={inputRef} type="file" className="hidden"
                  accept=".docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                  onChange={(e) => replace(e.target.files?.[0])}
                />
                <Button variant="outline" size="sm" disabled={uploading} onClick={() => inputRef.current?.click()}>
                  {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                  {file ? 'Upload a new version' : 'Upload the template'}
                </Button>
              </div>
            )}
          </div>

          {/* ---- Right: the document itself, scrolling on its own ---- */}
          <section
            className="min-w-0 flex flex-col rounded-xl border border-separator bg-muted/40 overflow-hidden lg:flex-1 lg:min-h-0"
            aria-label={`Preview of the ${c.noun}`}
          >
            <div className="shrink-0 flex items-center justify-between gap-3 px-4 py-2.5 border-b border-separator bg-background">
              <span className="shrink-0 text-xs uppercase tracking-wider text-muted-foreground">Preview</span>
              {file && (
                // Zoom lives here, in the bar, never on top of the page.
                <div className="flex min-w-0 items-center gap-2">
                  <div className="flex items-stretch overflow-hidden rounded-md border border-separator text-xs" role="group" aria-label="Zoom">
                    <button
                      type="button" data-ro-allow aria-pressed={zoom === 'fit'} onClick={() => setZoom('fit')}
                      className={`px-2.5 py-1 transition-colors ${zoom === 'fit' ? 'bg-accent text-accent-foreground' : 'text-muted-foreground hover:bg-muted'}`}
                    >
                      Fit width{fitScale ? ` (${Math.round(fitScale * 100)}%)` : ''}
                    </button>
                    <button
                      type="button" data-ro-allow aria-pressed={zoom === 'actual'} onClick={() => setZoom('actual')}
                      className={`border-l border-separator px-2.5 py-1 transition-colors ${zoom === 'actual' ? 'bg-accent text-accent-foreground' : 'text-muted-foreground hover:bg-muted'}`}
                    >
                      100%
                    </button>
                  </div>
                  <Button variant="outline" size="sm" className="hidden h-7 px-2.5 text-xs lg:inline-flex" data-ro-allow onClick={() => setFullView(true)}>
                    Full view
                  </Button>
                </div>
              )}
            </div>
            <div className="h-[70vh] overflow-auto overscroll-contain lg:h-auto lg:flex-1 lg:min-h-0" data-ro>
              {file ? (
                <DocxPreview key={file.view_url ?? file.id} url={file.view_url} title={c.title} zoom={zoom} onFitScale={setFitScale} />
              ) : (
                <div className="h-full min-h-[16rem] flex items-center justify-center p-8 text-center text-sm text-muted-foreground">
                  The preview appears here once the {c.noun} has been uploaded.
                </div>
              )}
            </div>
          </section>
        </div>

      {/* The document large: nearly the whole window, the page at least at
          its real width wherever the screen allows. */}
      {file && (
        <Dialog open={fullView} onOpenChange={setFullView}>
          <DialogContent className="flex h-[92vh] w-[96vw] max-w-[72rem] flex-col gap-0 overflow-hidden p-0">
            <DialogHeader className="shrink-0 border-b border-separator px-5 py-3 text-left">
              <DialogTitle className="font-serif text-lg text-accent">{file.file_name}</DialogTitle>
              <DialogDescription className="text-xs">For Minerva members only. Downloads are tracked.</DialogDescription>
            </DialogHeader>
            <div className="min-h-0 flex-1 overflow-auto overscroll-contain bg-muted/40" data-ro>
              {fullView && <DocxPreview url={file.view_url} title={`${c.title}, full view`} />}
            </div>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}
