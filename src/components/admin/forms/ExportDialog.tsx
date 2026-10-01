// =====================================================================
// Export the answers, exactly as needed.
// ---------------------------------------------------------------------
// Three choices, in the order people make them: which answers (all, the
// ones the filters show, or the ones ticked), which columns (grouped as
// who answered, when, the questions, the payment and the notes, with
// every question named), and which format (Excel or CSV). The attached
// files can come along as a ZIP with a folder per member. A line at the
// bottom says what will be downloaded before it is.
// =====================================================================

import { useEffect, useMemo, useState } from 'react';
import { Download, FileSpreadsheet, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { buildCsv, buildXlsx } from '@/lib/xlsx-lite';
import { downloadBlob, safeFileName } from '@/lib/file-download';
import { zipFromUrls } from '@/lib/zip';
import type { FormResponse, InternalForm } from '@/lib/internal-forms-api';
import { GROUP_LABEL, exportRows, filesForZip, type Column } from './answers-model';

type Rows = 'all' | 'filtered' | 'selected';

export function ExportDialog({
  open, onOpenChange, form, columns, all, filtered, selected, signFiles,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  form: InternalForm;
  columns: Column[];
  all: FormResponse[];
  filtered: FormResponse[];
  selected: FormResponse[];
  signFiles: (paths: string[]) => Promise<Record<string, string>>;
}) {
  const { toast } = useToast();
  const [format, setFormat] = useState<'xlsx' | 'csv'>('xlsx');
  const [rows, setRows] = useState<Rows>('all');
  const [chosen, setChosen] = useState<Set<string>>(new Set());
  const [withFiles, setWithFiles] = useState(false);
  const [name, setName] = useState('');
  const [busy, setBusy] = useState<string | null>(null);
  const hasFiles = form.fields.some((f) => f.type === 'file');

  useEffect(() => {
    if (!open) return;
    setRows(selected.length ? 'selected' : filtered.length !== all.length ? 'filtered' : 'all');
    // Everything but the internal notes, by default.
    setChosen(new Set(columns.filter((c) => c.group !== 'notes' && c.key !== 'updated').map((c) => c.key)));
    setName(`${form.title} answers ${new Date().toISOString().slice(0, 10)}`);
    setWithFiles(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const groups = useMemo(() => {
    const g = new Map<Column['group'], Column[]>();
    for (const c of columns) g.set(c.group, [...(g.get(c.group) ?? []), c]);
    return [...g.entries()];
  }, [columns]);

  const list = rows === 'selected' ? selected : rows === 'filtered' ? filtered : all;
  const cols = columns.filter((c) => chosen.has(c.key));
  const fileCount = hasFiles && withFiles ? filesForZip(form, list).length : 0;
  const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;
  const toggle = (key: string, on: boolean) => setChosen((s) => { const n = new Set(s); if (on) n.add(key); else n.delete(key); return n; });

  const run = async () => {
    const base = safeFileName(name || form.title);
    setBusy('sheet');
    try {
      const header = cols.map((c) => c.label);
      const data = exportRows(cols, list);
      const blob = format === 'xlsx' ? buildXlsx(form.title, header, data) : buildCsv(header, data);
      downloadBlob(blob, `${base}.${format}`);
      if (withFiles && fileCount) {
        setBusy('files');
        const files = filesForZip(form, list);
        const urls = await signFiles(files.map((f) => f.path));
        const names = new Map<string, number>();
        const entries = files.filter((f) => urls[f.path]).map((f) => {
          const k = f.name.toLowerCase(); const n = (names.get(k) ?? 0) + 1; names.set(k, n);
          return { name: n === 1 ? f.name : f.name.replace(/(\.[a-z0-9]{1,8})?$/i, ` (${n})$1`), url: urls[f.path] };
        });
        const { blob: zip, failed } = await zipFromUrls(entries);
        downloadBlob(zip, `${base} files.zip`);
        if (failed.length) toast({ title: `${failed.length} file${failed.length === 1 ? '' : 's'} could not be added`, description: failed.slice(0, 3).join(', '), variant: 'destructive' });
      }
      toast({ title: 'Export ready', description: `${plural(list.length, 'answer', 'answers')}, ${plural(cols.length, 'column', 'columns')}${withFiles && fileCount ? `, ${plural(fileCount, 'file', 'files')}` : ''}.` });
      onOpenChange(false);
    } catch (e) {
      toast({ title: 'The export did not complete', description: e instanceof Error ? e.message : undefined, variant: 'destructive' });
    } finally {
      setBusy(null);
    }
  };

  const rowChoice = (value: Rows, label: string, count: number) => (
    <label key={value} className={`flex cursor-pointer items-center justify-between gap-3 border px-3 py-2.5 text-sm ${rows === value ? 'border-accent bg-accent/5' : 'border-separator'} ${count === 0 ? 'cursor-not-allowed opacity-50' : ''}`}>
      <span className="flex items-center gap-2"><input type="radio" data-ro name="export-rows" checked={rows === value} disabled={count === 0} onChange={() => setRows(value)} className="accent-[hsl(var(--accent))]" />{label}</span>
      <span className="tabular-nums text-muted-foreground">{count}</span>
    </label>
  );

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!busy) onOpenChange(o); }}>
      <DialogContent className="flex max-h-[92vh] w-[min(96vw,48rem)] max-w-[min(96vw,48rem)] flex-col gap-0 overflow-hidden p-0">
        <DialogHeader className="shrink-0 border-b border-separator px-6 pb-4 pt-6 text-left">
          <DialogTitle className="font-serif">Export the answers</DialogTitle>
          <DialogDescription className="font-body">Choose the answers, the columns and the format. Files are made on this computer; nothing is sent anywhere.</DialogDescription>
        </DialogHeader>
        <div className="min-h-0 flex-1 space-y-6 overflow-y-auto px-6 py-5 font-body">
          <section>
            <h3 className="mb-2 text-xs uppercase tracking-wider text-muted-foreground">1. Which answers</h3>
            <div className="grid gap-2 sm:grid-cols-3">
              {rowChoice('all', 'All answers', all.length)}
              {rowChoice('filtered', 'As filtered', filtered.length)}
              {rowChoice('selected', 'Ticked in the table', selected.length)}
            </div>
          </section>
          <section>
            <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
              <h3 className="text-xs uppercase tracking-wider text-muted-foreground">2. Which columns ({cols.length} of {columns.length})</h3>
              <div className="flex gap-1">
                <Button type="button" data-ro variant="ghost" size="sm" onClick={() => setChosen(new Set(columns.map((c) => c.key)))}>All</Button>
                <Button type="button" data-ro variant="ghost" size="sm" onClick={() => setChosen(new Set(['name']))}>Only the name</Button>
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              {groups.map(([g, cs]) => (
                <fieldset key={g} className="border border-separator p-3">
                  <legend className="px-1 text-sm font-medium text-foreground">{GROUP_LABEL[g]}</legend>
                  <div className="space-y-1.5">
                    {cs.map((c) => (
                      <label key={c.key} className="flex items-start gap-2 text-sm">
                        <input type="checkbox" data-ro className="mt-1 accent-[hsl(var(--accent))]" checked={chosen.has(c.key)} onChange={(e) => toggle(c.key, e.target.checked)} />
                        <span className="min-w-0 break-words">{c.label}</span>
                      </label>
                    ))}
                  </div>
                </fieldset>
              ))}
            </div>
          </section>
          <section>
            <h3 className="mb-2 text-xs uppercase tracking-wider text-muted-foreground">3. Format and name</h3>
            <div className="flex flex-wrap gap-2">
              {(['xlsx', 'csv'] as const).map((f) => (
                <label key={f} className={`flex cursor-pointer items-center gap-2 border px-3 py-2 text-sm ${format === f ? 'border-accent bg-accent/5' : 'border-separator'}`}>
                  <input type="radio" data-ro name="export-format" checked={format === f} onChange={() => setFormat(f)} className="accent-[hsl(var(--accent))]" />
                  {f === 'xlsx' ? 'Excel (.xlsx)' : 'CSV (.csv)'}
                </label>
              ))}
            </div>
            <div className="mt-3 max-w-md space-y-1">
              <Label htmlFor="export-name" className="text-xs">File name</Label>
              <Input id="export-name" value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            {hasFiles && (
              <label className="mt-3 flex items-start gap-2 text-sm">
                <Switch data-ro className="mt-0.5" checked={withFiles} onCheckedChange={setWithFiles} />
                <span>Also download the attached files<span className="block text-muted-foreground">A second ZIP file, with a folder for each member.</span></span>
              </label>
            )}
          </section>
        </div>
        <div className="flex shrink-0 flex-wrap items-center gap-3 border-t border-separator bg-background px-6 py-4">
          <p className="mr-auto text-sm text-muted-foreground" aria-live="polite">
            {plural(list.length, 'answer', 'answers')} · {plural(cols.length, 'column', 'columns')} · {format === 'xlsx' ? 'Excel' : 'CSV'}{withFiles && hasFiles ? ` · ${plural(fileCount, 'file', 'files')}` : ''}
          </p>
          <Button data-ro variant="outline" onClick={() => onOpenChange(false)} disabled={!!busy}>Cancel</Button>
          <Button data-ro variant="solid" onClick={run} disabled={!!busy || cols.length === 0 || list.length === 0}>
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : format === 'xlsx' ? <FileSpreadsheet className="h-4 w-4" /> : <Download className="h-4 w-4" />}
            {busy === 'files' ? 'Packing the files' : 'Download'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
