// =====================================================================
// The answers to a form: understand them, then act on them.
// ---------------------------------------------------------------------
// SUMMARY answers the questions organisers actually have, without a
// spreadsheet: how many said yes, how many of each size, how many items
// in total, what people wrote most recently. Every choice is counted
// with a bar; every number is totalled and averaged.
//
// TABLE is one row per member and one column per question, with the
// name always visible on the left. Search reads names, emails and every
// answer; the payment filter shows who still has to pay; Columns hides
// what is not needed today. The Paid box is ticked right in the row. A
// row opens the member's full answer beside the table.
//
// Export is a dialog that asks which answers, which columns and which
// format, and can bring the attached files along.
// =====================================================================

import { useMemo, useState } from 'react';
import {
  BarChart3, Columns3, Download, FileText, Loader2, Search, Table2, Trash2, X,
} from 'lucide-react';
import type { Session } from '@supabase/supabase-js';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import { friendlyError } from '@/lib/errors';
import { downloadAs } from '@/lib/file-download';
import { isQuestion, type FileAnswer } from '@/lib/internal-forms-rules';
import {
  deleteResponse, setResponseNote, setResponsePaid, signFormFiles, type FormResponse, type InternalForm,
} from '@/lib/internal-forms-api';
import { allColumns, responseHaystack, stamp, summarise, type Column } from './answers-model';
import { FIELD_ICON, money } from './forms-model';
import { ResponseSheet } from './ResponseSheet';
import { ExportDialog } from './ExportDialog';

type View = 'summary' | 'table';
type PayFilter = 'all' | 'paid' | 'unpaid';
type Sort = 'newest' | 'oldest' | 'name' | 'unpaid';

const fold = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

export function AnswersView({ form, responses, setResponses, session, readOnly }: {
  form: InternalForm;
  responses: FormResponse[];
  setResponses: (fn: (prev: FormResponse[]) => FormResponse[]) => void;
  session: Session | null;
  readOnly: boolean;
}) {
  const { toast } = useToast();
  const [view, setView] = useState<View>(responses.length ? 'table' : 'summary');
  const [query, setQuery] = useState('');
  const [pay, setPay] = useState<PayFilter>('all');
  const [sort, setSort] = useState<Sort>('newest');
  const [hidden, setHidden] = useState<Set<string>>(new Set(['email', 'role', 'updated', 'paid_at', 'note']));
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [openId, setOpenId] = useState<string | null>(null);
  const [exportOpen, setExportOpen] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [toDelete, setToDelete] = useState<FormResponse | null>(null);

  const columns = useMemo(() => allColumns(form, responses), [form, responses]);
  const hay = useMemo(() => new Map(responses.map((r) => [r.id, responseHaystack(form, r)])), [form, responses]);

  const shown = useMemo(() => {
    const words = fold(query).split(/\s+/).filter(Boolean);
    let list = responses.filter((r) => {
      if (pay === 'paid' && !r.paid) return false;
      if (pay === 'unpaid' && r.paid) return false;
      const h = hay.get(r.id) ?? '';
      return words.every((w) => h.includes(w));
    });
    list = [...list].sort((a, b) => {
      if (sort === 'oldest') return a.submitted_at.localeCompare(b.submitted_at);
      if (sort === 'name') return (a.member_name ?? '').localeCompare(b.member_name ?? '', 'en', { sensitivity: 'base' });
      if (sort === 'unpaid') return Number(a.paid) - Number(b.paid) || (a.member_name ?? '').localeCompare(b.member_name ?? '');
      return b.submitted_at.localeCompare(a.submitted_at);
    });
    return list;
  }, [responses, query, pay, sort, hay]);

  const paidCount = responses.filter((r) => r.paid).length;
  const last = responses.reduce<string | null>((m, r) => (!m || r.updated_at > m ? r.updated_at : m), null);
  const openResponse = responses.find((r) => r.id === openId) ?? null;
  const openIndex = openResponse ? shown.findIndex((r) => r.id === openResponse.id) : -1;
  const visibleCols = columns.filter((c) => c.key !== 'name' && !hidden.has(c.key));
  const filtersOn = !!query.trim() || pay !== 'all';

  // ── Actions ────────────────────────────────────────────────────────
  const markPaid = async (r: FormResponse, paid: boolean) => {
    setBusy(`paid:${r.id}`);
    setResponses((prev) => prev.map((x) => (x.id === r.id ? { ...x, paid } : x)));
    try {
      const saved = await setResponsePaid(session, r.id, paid);
      setResponses((prev) => prev.map((x) => (x.id === r.id ? { ...x, ...saved } : x)));
    } catch (e) {
      setResponses((prev) => prev.map((x) => (x.id === r.id ? { ...x, paid: !paid } : x)));
      toast({ title: 'Could not record the payment', description: friendlyError(e), variant: 'destructive' });
    } finally { setBusy(null); }
  };
  const saveNote = async (r: FormResponse, note: string) => {
    try {
      const saved = await setResponseNote(session, r.id, note);
      setResponses((prev) => prev.map((x) => (x.id === r.id ? { ...x, staff_note: saved.staff_note } : x)));
      toast({ title: 'Note saved' });
    } catch (e) { toast({ title: 'Could not save the note', description: friendlyError(e), variant: 'destructive' }); }
  };
  const remove = async () => {
    if (!toDelete) return;
    const r = toDelete;
    setBusy(`delete:${r.id}`);
    try {
      await deleteResponse(session, r.id);
      setResponses((prev) => prev.filter((x) => x.id !== r.id));
      setOpenId(null);
      toast({ title: 'Answer deleted' });
    } catch (e) { toast({ title: 'Could not delete the answer', description: friendlyError(e), variant: 'destructive' }); }
    finally { setBusy(null); setToDelete(null); }
  };
  const openFile = async (f: FileAnswer, download: boolean) => {
    try {
      const urls = await signFormFiles(session, [f.path]);
      const url = urls[f.path];
      if (!url) throw new Error('The file could not be found.');
      if (download) await downloadAs(url, f.name);
      else window.open(url, '_blank', 'noopener');
    } catch (e) { toast({ title: 'Could not open the file', description: friendlyError(e), variant: 'destructive' }); }
  };
  const toggleSel = (id: string, on: boolean) => setSelected((s) => { const n = new Set(s); if (on) n.add(id); else n.delete(id); return n; });

  const cell = (c: Column, r: FormResponse) => {
    if (c.key === 'paid') {
      return (
        <input type="checkbox" checked={r.paid} disabled={readOnly || busy === `paid:${r.id}`}
          onChange={(e) => markPaid(r, e.target.checked)} onClick={(e) => e.stopPropagation()}
          aria-label={`${r.member_name ?? 'Member'} has paid`} className="h-4 w-4 accent-[hsl(var(--accent))]" />
      );
    }
    if (c.field?.type === 'file') {
      const files = (r.answers?.[c.field.id] as FileAnswer[] | undefined) ?? [];
      return files.length ? <span className="inline-flex items-center gap-1 text-accent"><FileText className="h-3.5 w-3.5" />{files.length === 1 ? files[0].name : `${files.length} files`}</span> : <span className="text-muted-foreground">-</span>;
    }
    const v = c.value(r);
    if (v === '' || v === null || v === undefined) return <span className="text-muted-foreground">-</span>;
    return <span className="line-clamp-2 whitespace-pre-wrap break-words">{String(v)}</span>;
  };

  // ── Empty ───────────────────────────────────────────────────────────
  if (responses.length === 0) {
    return (
      <div className="border border-dashed border-separator px-5 py-12 text-center font-body">
        <BarChart3 className="mx-auto mb-3 h-8 w-8 text-accent" aria-hidden />
        <p className="font-serif text-xl text-foreground">No answers yet</p>
        <p className="mx-auto mt-1 max-w-md text-sm text-muted-foreground">
          {form.status === 'draft' ? 'Open the form, then share its link: answers appear here as soon as members send them.' : 'Answers appear here as soon as members send them. Members also find open forms on their Dashboard.'}
        </p>
      </div>
    );
  }

  return (
    <div className="font-body">
      {/* Key figures */}
      <div className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <div className="border border-separator p-3"><p className="text-xs uppercase tracking-wider text-muted-foreground">Answers</p><p className="mt-1 font-serif text-3xl text-accent tabular-nums">{responses.length}</p></div>
        {form.track_payments && (
          <div className="border border-separator p-3">
            <p className="text-xs uppercase tracking-wider text-muted-foreground">Paid</p>
            <p className="mt-1 font-serif text-3xl text-accent tabular-nums">{paidCount}<span className="text-lg text-muted-foreground"> of {responses.length}</span></p>
            <div className="mt-2 h-1.5 bg-muted" aria-hidden><div className="h-full bg-accent" style={{ width: `${Math.round((paidCount / responses.length) * 100)}%` }} /></div>
          </div>
        )}
        {form.track_payments && form.payment_amount != null && (
          <div className="border border-separator p-3"><p className="text-xs uppercase tracking-wider text-muted-foreground">Collected</p><p className="mt-1 font-serif text-2xl text-accent tabular-nums">{money(paidCount * form.payment_amount)}</p><p className="text-xs text-muted-foreground">{money((responses.length - paidCount) * form.payment_amount)} still due</p></div>
        )}
        <div className="border border-separator p-3"><p className="text-xs uppercase tracking-wider text-muted-foreground">Latest</p><p className="mt-1 text-sm text-foreground">{stamp(last)}</p></div>
      </div>

      {/* View switch */}
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <div role="group" aria-label="Show answers as" className="inline-flex border border-separator">
          {([['summary', 'Summary', BarChart3], ['table', 'Table', Table2]] as const).map(([v, label, Icon]) => (
            <button key={v} type="button" data-ro aria-pressed={view === v} onClick={() => setView(v)}
              className={`inline-flex h-10 items-center gap-1.5 px-3 text-sm ${view === v ? 'bg-accent text-accent-foreground' : 'text-muted-foreground hover:bg-accent/5 hover:text-accent'}`}>
              <Icon className="h-4 w-4" aria-hidden />{label}
            </button>
          ))}
        </div>
        <Button data-ro variant="outline" className="ml-auto" onClick={() => setExportOpen(true)}><Download className="h-4 w-4" />Export</Button>
      </div>

      {view === 'summary' ? (
        <div className="grid gap-4 lg:grid-cols-2">
          {form.fields.filter(isQuestion).map((f) => {
            const s = summarise(f, responses);
            const Icon = FIELD_ICON[f.type];
            const max = s.kind === 'choices' || s.kind === 'numbers' ? Math.max(1, ...s.rows.map((x) => x.count)) : 1;
            return (
              <section key={f.id} className="border border-separator p-4">
                <h3 className="flex items-start gap-2 text-[15px] font-medium text-foreground"><Icon aria-hidden className="mt-0.5 h-4 w-4 shrink-0 text-accent" />{f.label}</h3>
                <p className="mb-3 mt-0.5 text-xs text-muted-foreground">{s.answered} of {responses.length} answered</p>
                {s.kind === 'numbers' && (
                  <dl className="mb-3 grid grid-cols-4 gap-2 text-center">
                    {[['Total', s.total], ['Average', Math.round(s.mean * 100) / 100], ['Lowest', s.min], ['Highest', s.max]].map(([k, v]) => (
                      <div key={k as string} className="bg-muted/40 px-1 py-2"><dt className="text-[11px] uppercase tracking-wider text-muted-foreground">{k}</dt><dd className="font-serif text-xl text-accent tabular-nums">{v as number}</dd></div>
                    ))}
                  </dl>
                )}
                {(s.kind === 'choices' || s.kind === 'numbers') && s.rows.length > 0 && (
                  <ul className="space-y-1.5">
                    {s.rows.map((row) => (
                      <li key={row.label} className="grid grid-cols-[minmax(0,10rem)_minmax(0,1fr)_3.5rem] items-center gap-2 text-sm">
                        <span className="truncate" title={row.label}>{row.label}</span>
                        <span className="h-2.5 bg-muted" aria-hidden><span className="block h-full bg-accent" style={{ width: `${(row.count / max) * 100}%` }} /></span>
                        <span className="text-right tabular-nums text-muted-foreground">{row.count}{s.answered ? <span className="text-xs"> ({Math.round((row.count / s.answered) * 100)}%)</span> : null}</span>
                      </li>
                    ))}
                  </ul>
                )}
                {s.kind === 'texts' && (
                  <ul className="space-y-2">
                    {s.latest.map((x, i) => <li key={i} className="border-l-2 border-separator pl-3 text-sm"><span className="line-clamp-3 whitespace-pre-wrap">{x.text}</span><span className="text-xs text-muted-foreground">{x.who}</span></li>)}
                    {s.answered > s.latest.length && <li><button type="button" data-ro className="text-sm text-accent underline underline-offset-2" onClick={() => setView('table')}>See all {s.answered} in the table</button></li>}
                  </ul>
                )}
                {s.kind === 'files' && <p className="text-sm">{s.files} {s.files === 1 ? 'file' : 'files'} attached. Download them all from Export.</p>}
                {s.kind === 'consent' && <p className="text-sm">{s.answered} ticked the box.</p>}
              </section>
            );
          })}
        </div>
      ) : (
        <>
          {/* Toolbar */}
          <div className="mb-3 flex flex-col gap-2 lg:flex-row lg:items-center">
            <div className="relative min-w-0 flex-1">
              <Search aria-hidden className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search names, emails and answers" aria-label="Search the answers" className="h-10 pl-9" />
            </div>
            <div className="flex flex-wrap gap-2">
              {form.track_payments && (
                <div role="group" aria-label="Payment" className="inline-flex border border-separator">
                  {([['all', 'Everyone'], ['unpaid', 'Not paid'], ['paid', 'Paid']] as const).map(([v, label]) => (
                    <button key={v} type="button" data-ro aria-pressed={pay === v} onClick={() => setPay(v)}
                      className={`h-10 px-3 text-sm ${pay === v ? 'bg-accent text-accent-foreground' : 'text-muted-foreground hover:bg-accent/5 hover:text-accent'}`}>
                      {label}{v === 'unpaid' ? ` ${responses.length - paidCount}` : v === 'paid' ? ` ${paidCount}` : ''}
                    </button>
                  ))}
                </div>
              )}
              <select value={sort} onChange={(e) => setSort(e.target.value as Sort)} aria-label="Order" className="h-10 border border-input bg-background px-2 text-sm">
                <option value="newest">Newest first</option>
                <option value="oldest">Oldest first</option>
                <option value="name">Name, A to Z</option>
                {form.track_payments && <option value="unpaid">Not paid first</option>}
              </select>
              <Popover>
                <PopoverTrigger asChild>
                  <Button data-ro variant="outline" className="h-10"><Columns3 className="h-4 w-4" />Columns</Button>
                </PopoverTrigger>
                <PopoverContent align="end" className="max-h-[60vh] w-72 overflow-y-auto p-3 font-body">
                  <p className="mb-2 text-xs uppercase tracking-wider text-muted-foreground">Show in the table</p>
                  <div className="space-y-1.5">
                    {columns.filter((c) => c.key !== 'name').map((c) => (
                      <label key={c.key} className="flex items-start gap-2 text-sm">
                        <input type="checkbox" data-ro className="mt-1 accent-[hsl(var(--accent))]" checked={!hidden.has(c.key)}
                          onChange={(e) => setHidden((h) => { const n = new Set(h); if (e.target.checked) n.delete(c.key); else n.add(c.key); return n; })} />
                        <span className="min-w-0 break-words">{c.label}</span>
                      </label>
                    ))}
                  </div>
                </PopoverContent>
              </Popover>
            </div>
          </div>
          <div className="mb-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[13px] text-muted-foreground" aria-live="polite">
            <span>{filtersOn ? `${shown.length} of ${responses.length} answers` : `${responses.length} answers`}</span>
            {selected.size > 0 && <span className="text-foreground">{selected.size} ticked</span>}
            {selected.size > 0 && <button type="button" data-ro className="text-accent underline underline-offset-2" onClick={() => setSelected(new Set())}>Untick all</button>}
            {filtersOn && <button type="button" data-ro className="inline-flex items-center gap-1 text-accent underline underline-offset-2" onClick={() => { setQuery(''); setPay('all'); }}><X className="h-3.5 w-3.5" />Clear search and filter</button>}
          </div>

          <div className="overflow-x-auto border border-separator">
            <table className="w-full min-w-[40rem] border-collapse text-left text-sm">
              <thead className="sticky top-0 z-10 bg-muted/60 backdrop-blur">
                <tr className="[&>th]:align-bottom">
                  <th scope="col" className="w-10 px-3 py-2.5">
                    <input type="checkbox" data-ro aria-label="Tick every answer shown" className="h-4 w-4 accent-[hsl(var(--accent))]"
                      checked={shown.length > 0 && shown.every((r) => selected.has(r.id))}
                      onChange={(e) => setSelected(e.target.checked ? new Set(shown.map((r) => r.id)) : new Set())} />
                  </th>
                  <th scope="col" className="sticky left-0 z-10 min-w-[12rem] bg-muted px-3 py-2.5 text-[13px] font-medium text-muted-foreground">Member</th>
                  <th scope="col" className="min-w-[11.5rem] px-3 py-2.5 text-[13px] font-medium text-muted-foreground">Sent</th>
                  {visibleCols.filter((c) => c.key !== 'submitted').map((c) => (
                    <th key={c.key} scope="col" title={c.label} className={`px-3 py-2.5 text-[13px] font-medium text-muted-foreground ${c.key === 'paid' ? 'w-16 text-center' : 'min-w-[9rem] max-w-[18rem]'}`}>
                      <span className="line-clamp-2">{c.label}</span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {shown.map((r) => (
                  <tr key={r.id} className={`border-t border-separator ${selected.has(r.id) ? 'bg-accent/5' : 'hover:bg-muted/30'}`}>
                    <td className="px-3 py-2.5 align-top">
                      <input type="checkbox" data-ro aria-label={`Tick ${r.member_name ?? 'this answer'}`} className="h-4 w-4 accent-[hsl(var(--accent))]"
                        checked={selected.has(r.id)} onChange={(e) => toggleSel(r.id, e.target.checked)} />
                    </td>
                    <td className="sticky left-0 bg-background px-3 py-2.5 align-top">
                      <button type="button" data-ro onClick={() => setOpenId(r.id)} className="text-left">
                        <span className="block font-medium text-accent underline-offset-2 hover:underline">{r.member_name || 'Member'}</span>
                        <span className="block text-xs text-muted-foreground">{r.member_email}</span>
                      </button>
                    </td>
                    <td className="whitespace-nowrap px-3 py-2.5 align-top text-muted-foreground">{stamp(r.submitted_at)}{r.edit_count > 0 && <span className="block text-xs">changed {r.edit_count}x</span>}</td>
                    {visibleCols.filter((c) => c.key !== 'submitted').map((c) => (
                      <td key={c.key} className={`px-3 py-2.5 align-top ${c.key === 'paid' ? 'text-center' : 'max-w-[18rem]'}`}>{cell(c, r)}</td>
                    ))}
                  </tr>
                ))}
                {shown.length === 0 && (
                  <tr><td colSpan={3 + visibleCols.length} className="px-3 py-10 text-center text-muted-foreground">No answer matches. <button type="button" data-ro className="text-accent underline" onClick={() => { setQuery(''); setPay('all'); }}>Clear search and filter</button></td></tr>
                )}
              </tbody>
            </table>
          </div>
        </>
      )}

      <ResponseSheet
        form={form}
        response={openResponse}
        position={openIndex >= 0 ? { index: openIndex, total: shown.length } : null}
        onStep={(d) => { if (openIndex >= 0 && shown.length) setOpenId(shown[(openIndex + d + shown.length) % shown.length].id); }}
        onClose={() => setOpenId(null)}
        onPaid={markPaid}
        onNote={saveNote}
        onDelete={(r) => setToDelete(r)}
        onOpenFile={openFile}
        readOnly={readOnly}
        busy={busy}
      />

      <ExportDialog
        open={exportOpen}
        onOpenChange={setExportOpen}
        form={form}
        columns={columns}
        all={responses}
        filtered={shown}
        selected={responses.filter((r) => selected.has(r.id))}
        signFiles={(paths) => signFormFiles(session, paths)}
      />

      <AlertDialog open={!!toDelete} onOpenChange={(o) => { if (!o) setToDelete(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete the answer of {toDelete?.member_name || 'this member'}?</AlertDialogTitle>
            <AlertDialogDescription>Their answers and any files they attached are deleted for good. They can answer again while the form is open.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={(e) => { e.preventDefault(); remove(); }} disabled={!!busy}>
              {busy?.startsWith('delete') ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
