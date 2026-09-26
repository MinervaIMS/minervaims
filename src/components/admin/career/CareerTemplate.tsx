import { useEffect, useRef, useState } from 'react';
import { Download, Lock, Upload, Loader2, FileText, ShieldAlert, ZoomIn, ZoomOut } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { useAccess } from '@/hooks/useAccess';
import { WorkspacePageHeader } from '@/components/admin/WorkspacePageHeader';
import { WorkspaceLoader } from '@/components/admin/WorkspaceLoader';
import { HelpDot } from '@/components/admin/help/HelpSystem';
import { CareerCard, Step } from '@/components/admin/career/CareerCard';
import { DocxPreview } from '@/components/admin/career/DocxPreview';
import { CV_DISCLAIMER, CL_DISCLAIMER } from '@/lib/career/disclaimers';
import { listCareerFiles, uploadCareerFile, downloadFrom, type CareerFile, type CareerFileKind } from '@/lib/career-api';

// =====================================================================
// Career > CV Template and Career > Cover Letter Template.
// ---------------------------------------------------------------------
// One page, two documents. The left half says what the template is, that
// it stays inside Minerva, and the disclaimer in full, with the download;
// the right half shows the document itself, page by page, scrolling on
// its own. On a phone the two halves stack: download first, then the
// preview.
//
// The file is replaced by the President, the Vice President and the Head
// of Operations (access matrix: `career-cv` / `career-cl` at 'manage').
// =====================================================================

type Which = 'cv' | 'cl';

const COPY: Record<Which, {
  resource: string; kind: CareerFileKind; title: string; description: string; noun: string;
  steps: string[]; pdfName: string;
}> = {
  cv: {
    resource: 'career-cv', kind: 'cv_template', title: 'CV Template',
    description: 'The association’s one-page CV template, with the guide to filling it in.',
    noun: 'CV template',
    steps: [
      'Download the template and open it in Word (or Pages or Google Docs).',
      'Follow the guidance in the document: every bullet is action, method and a quantified result.',
      'Remove every square bracket and every note in round brackets, keeping the GDPR line in the footer.',
      'Export it as a one-page PDF named Name_Surname_CV.pdf.',
    ],
    pdfName: 'Name_Surname_CV.pdf',
  },
  cl: {
    resource: 'career-cl', kind: 'cl_template', title: 'Cover Letter Template',
    description: 'The association’s cover letter template, with the guide to writing each paragraph.',
    noun: 'cover letter template',
    steps: [
      'Download the template and open it in Word (or Pages or Google Docs).',
      'Write one job per paragraph: who you are, why this firm, your evidence, how you work with people, what happens next.',
      'Name the exact programme, division, office and year as they appear in the posting.',
      'Export it as a one-page PDF named Name_Surname_Cover_Letter_Firm.pdf.',
    ],
    pdfName: 'Name_Surname_Cover_Letter_Firm.pdf',
  },
};

function sizeLabel(bytes: number | null): string {
  if (!bytes) return '';
  return bytes > 1024 * 1024 ? `${(bytes / 1024 / 1024).toFixed(1)} MB` : `${Math.max(1, Math.round(bytes / 1024))} KB`;
}

export default function CareerTemplate({ which }: { which: Which }) {
  const c = COPY[which];
  const disclaimer = which === 'cv' ? CV_DISCLAIMER : CL_DISCLAIMER;
  const { session } = useAuth();
  const { toast } = useToast();
  const access = useAccess();
  const [file, setFile] = useState<CareerFile | null>(null);
  const [canManage, setCanManage] = useState(false);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [fit, setFit] = useState(true);
  const inputRef = useRef<HTMLInputElement>(null);

  const load = async () => {
    setLoading(true);
    try {
      const res = await listCareerFiles(session, [c.kind]);
      setFile(res.files.find((f) => f.kind === c.kind) ?? null);
      setCanManage(!!res.can_manage[c.kind]);
    } catch (e) {
      toast({ title: 'Could not load the template', description: e instanceof Error ? e.message : undefined, variant: 'destructive' });
    } finally { setLoading(false); }
  };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { load(); }, [which]);

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
      await load();
    } catch (e) {
      toast({ title: 'Could not replace the template', description: e instanceof Error ? e.message : undefined, variant: 'destructive' });
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  const download = () => {
    if (!file?.download_url) return;
    downloadFrom(file.download_url, file.file_name);
  };

  return (
    <div>
      <WorkspacePageHeader title={c.title} description={c.description} />
      {loading ? <WorkspaceLoader /> : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:items-start">
          {/* ---- Left: what it is, the rule, the disclaimer, the download ---- */}
          <div className="min-w-0 space-y-4">
            <div className="flex items-start gap-3 rounded-xl border border-accent/40 bg-accent/5 p-4 sm:p-5" role="note">
              <Lock className="h-5 w-5 text-accent shrink-0 mt-0.5" />
              <div className="font-body min-w-0">
                <p className="font-serif text-lg text-accent leading-snug">For Minerva members only</p>
                <p className="mt-1 text-sm text-foreground">
                  This material is not to be shared outside Minerva. Please do not forward it, post it or upload it anywhere
                  outside the society, and do not pass it on to friends who are not members.
                </p>
              </div>
            </div>

            <CareerCard
              title={`Download the ${c.noun}`}
              subtitle={file ? [file.file_name, sizeLabel(file.size_bytes), `updated ${new Date(file.updated_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}`].filter(Boolean).join(' · ') : 'Not uploaded yet'}
              icon={<FileText className="h-5 w-5" />}
              action={<HelpDot page={c.resource} topic="use" />}
            >
              {file ? (
                <Button className="w-full sm:w-auto self-start" onClick={download} disabled={!file.download_url}>
                  <Download className="h-4 w-4 mr-2" />Download the {c.noun} (.docx)
                </Button>
              ) : (
                <p className="text-sm text-muted-foreground">
                  The {c.noun} has not been uploaded yet.{mayReplace ? ' Upload it below.' : ' It will appear here as soon as the Board uploads it.'}
                </p>
              )}
              <ol className="mt-5 space-y-3">
                {c.steps.map((s, i) => <Step key={i} n={i + 1}>{s}</Step>)}
              </ol>
            </CareerCard>

            <CareerCard title="Disclaimer" icon={<ShieldAlert className="h-5 w-5" />}>
              <ul className="space-y-3">
                {disclaimer.map((d) => (
                  <li key={d.title} className="text-sm leading-relaxed text-foreground">
                    <strong className="font-semibold">{d.title}</strong> {d.text}
                  </li>
                ))}
              </ul>
            </CareerCard>

            {mayReplace && (
              <div className="rounded-xl border border-dashed border-separator p-4 sm:p-5 font-body">
                <p className="text-sm text-foreground font-medium">Replace the {c.noun}</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Upload a new .docx: it replaces the current file for every member at once, and the preview follows. Only the President,
                  the Vice President and the Head of Operations see this.
                </p>
                <input
                  ref={inputRef} type="file" className="hidden"
                  accept=".docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                  onChange={(e) => replace(e.target.files?.[0])}
                />
                <Button variant="outline" size="sm" className="mt-3" disabled={uploading} onClick={() => inputRef.current?.click()}>
                  {uploading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Upload className="h-4 w-4 mr-2" />}
                  {file ? 'Upload a new version' : 'Upload the template'}
                </Button>
              </div>
            )}
          </div>

          {/* ---- Right: the document itself, scrolling on its own ---- */}
          <div className="min-w-0 rounded-xl border border-separator bg-muted/30 overflow-hidden lg:sticky lg:top-4">
            <div className="flex items-center justify-between gap-2 px-4 py-2 border-b border-separator bg-background font-body">
              <span className="text-xs uppercase tracking-wider text-muted-foreground shrink-0">Preview</span>
              {file && (
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-xs text-muted-foreground truncate">{file.file_name}</span>
                  <Button
                    variant="ghost" size="sm" className="h-7 px-2 shrink-0 text-xs" data-ro-allow
                    onClick={() => setFit((f) => !f)}
                    aria-label={fit ? 'Show the pages at their real size' : 'Fit the pages to the column'}
                  >
                    {fit ? <ZoomIn className="h-4 w-4 sm:mr-1" /> : <ZoomOut className="h-4 w-4 sm:mr-1" />}
                    <span className="hidden sm:inline">{fit ? 'Real size' : 'Fit'}</span>
                  </Button>
                </div>
              )}
            </div>
            <div className="h-[70vh] lg:h-[calc(100vh-13rem)] overflow-auto overscroll-contain" data-ro>
              {file ? (
                <DocxPreview url={file.view_url} title={c.title} fit={fit} />
              ) : (
                <div className="h-full flex items-center justify-center p-8 text-center font-body text-sm text-muted-foreground">
                  The preview appears here once the {c.noun} has been uploaded.
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
