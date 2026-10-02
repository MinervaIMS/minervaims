// =====================================================================
// One member's answers, in full, beside the table.
// ---------------------------------------------------------------------
// Who answered and when, the payment (ticked here, with who ticked it
// and when), a note for the team, and every answer at its full length,
// files included. Previous and Next, or the arrow keys, walk the answers
// in the order the table shows them.
// =====================================================================

import { useEffect, useState } from 'react';
import { ChevronLeft, ChevronRight, Download, ExternalLink, FileText, Loader2, Mail, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { useMedia } from '@/components/admin/calendar/calendar-hooks';
import { answerText, isQuestion, type AnswerValue, type FileAnswer } from '@/lib/internal-forms-rules';
import type { FormResponse, InternalForm } from '@/lib/internal-forms-api';
import { dueOf, memberRoleLabel, stamp } from './answers-model';
import { money } from './forms-model';

export function ResponseSheet({
  form, response, position, onStep, onClose, onPaid, onNote, onDelete, onOpenFile, readOnly, busy,
}: {
  form: InternalForm;
  response: FormResponse | null;
  position: { index: number; total: number } | null;
  onStep: (d: 1 | -1) => void;
  onClose: () => void;
  onPaid: (r: FormResponse, paid: boolean) => void;
  onNote: (r: FormResponse, note: string) => void;
  onDelete: (r: FormResponse) => void;
  onOpenFile: (f: FileAnswer, download: boolean) => void;
  readOnly: boolean;
  busy: string | null;
}) {
  const wide = useMedia('(min-width: 640px)');
  const [note, setNote] = useState('');
  useEffect(() => { setNote(response?.staff_note ?? ''); }, [response?.id, response?.staff_note]);

  return (
    <Sheet open={!!response} onOpenChange={(o) => !o && onClose()}>
      <SheetContent
        side={wide ? 'right' : 'bottom'}
        className={wide ? 'flex w-full flex-col gap-0 p-0 sm:max-w-[36rem]' : 'flex max-h-[92vh] flex-col gap-0 p-0'}
        onKeyDown={(e) => {
          const t = e.target as HTMLElement;
          if (t.closest('input, textarea') || !position || position.total < 2) return;
          if (e.key === 'ArrowRight') { e.preventDefault(); onStep(1); }
          if (e.key === 'ArrowLeft') { e.preventDefault(); onStep(-1); }
        }}
      >
        {response && (
          <>
            <SheetHeader className="shrink-0 space-y-1.5 border-b border-separator px-5 pb-4 pt-5 pr-12 text-left">
              <SheetTitle className="font-serif text-2xl leading-tight text-accent">{response.member_name || 'Member'}</SheetTitle>
              <SheetDescription className="font-body text-[13px]">
                {[memberRoleLabel(response), `sent ${stamp(response.submitted_at)}`, response.edit_count > 0 ? `changed ${response.edit_count} ${response.edit_count === 1 ? 'time' : 'times'}, last ${stamp(response.updated_at)}` : ''].filter(Boolean).join(' · ')}
              </SheetDescription>
              {response.member_email && (
                <a href={`mailto:${response.member_email}`} className="inline-flex items-center gap-1.5 font-body text-sm text-accent underline underline-offset-2"><Mail className="h-4 w-4" />{response.member_email}</a>
              )}
            </SheetHeader>

            <div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-5 py-5 font-body">
              {form.track_payments && (
                <section className={`border px-4 py-3 ${response.paid ? 'border-emerald-300 bg-emerald-50 dark:border-emerald-800 dark:bg-emerald-950/30' : 'border-amber-300 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/30'}`}>
                  <label className="flex items-center justify-between gap-3">
                    <span>
                      <span className="block text-[15px] font-medium text-foreground">{response.paid ? 'Paid' : 'Not paid yet'}{dueOf(form, response) != null ? ` · ${money(dueOf(form, response))}` : ''}</span>
                      <span className="block text-xs text-muted-foreground">{response.paid ? `Recorded ${stamp(response.paid_at)}${response.paid_by_name ? ` by ${response.paid_by_name}` : ''}` : 'Tick when the payment reaches the Society.'}</span>
                    </span>
                    <span className="flex items-center gap-2">
                      {busy === `paid:${response.id}` && <Loader2 className="h-4 w-4 animate-spin" />}
                      <Switch checked={response.paid} disabled={readOnly || busy === `paid:${response.id}`} onCheckedChange={(v) => onPaid(response, v)} aria-label="Paid" />
                    </span>
                  </label>
                </section>
              )}

              <section>
                <h3 className="mb-2 text-xs uppercase tracking-wider text-muted-foreground">Answers</h3>
                <dl className="divide-y divide-separator border-y-2 border-y-accent">
                  {form.fields.filter((f) => isQuestion(f) && (!f.showIf || response.answers?.[f.id] !== undefined)).map((f) => {
                    const v = response.answers?.[f.id] as AnswerValue | undefined;
                    return (
                      <div key={f.id} className="py-3">
                        <dt className="text-xs uppercase tracking-wider text-muted-foreground">{f.label}</dt>
                        <dd className="mt-1 whitespace-pre-wrap break-words text-[15px] text-foreground">
                          {f.type === 'file' && Array.isArray(v) && v.length ? (
                            <ul className="space-y-1.5">
                              {(v as FileAnswer[]).map((x) => (
                                <li key={x.path} className="flex items-center gap-2">
                                  <FileText aria-hidden className="h-4 w-4 shrink-0 text-muted-foreground" />
                                  <span className="min-w-0 flex-1 break-words">{x.name}</span>
                                  <Button variant="ghost" size="icon" className="h-9 w-9" onClick={() => onOpenFile(x, false)} aria-label={`Open ${x.name}`} title="Open"><ExternalLink className="h-4 w-4" /></Button>
                                  <Button variant="ghost" size="icon" className="h-9 w-9" onClick={() => onOpenFile(x, true)} aria-label={`Download ${x.name}`} title="Download"><Download className="h-4 w-4" /></Button>
                                </li>
                              ))}
                            </ul>
                          ) : answerText(f, v) || <span className="text-muted-foreground">No answer</span>}
                        </dd>
                      </div>
                    );
                  })}
                </dl>
              </section>

              <section>
                <h3 className="mb-2 text-xs uppercase tracking-wider text-muted-foreground">Note for the team</h3>
                <Textarea rows={3} maxLength={2000} value={note} disabled={readOnly} onChange={(e) => setNote(e.target.value)}
                  onBlur={() => { if ((note || '') !== (response.staff_note || '')) onNote(response, note); }}
                  placeholder="Only the form's organisers see this. Saved when you click away." />
              </section>
            </div>

            <div className="flex shrink-0 flex-wrap items-center gap-2 border-t border-separator bg-background px-5 py-3">
              {position && position.total > 1 && (
                <div className="mr-auto flex items-center gap-1">
                  <Button data-ro variant="ghost" size="icon" className="h-10 w-10" aria-label="Previous answer" onClick={() => onStep(-1)}><ChevronLeft className="h-4 w-4" /></Button>
                  <span className="font-body text-xs tabular-nums text-muted-foreground">{position.index + 1} of {position.total}</span>
                  <Button data-ro variant="ghost" size="icon" className="h-10 w-10" aria-label="Next answer" onClick={() => onStep(1)}><ChevronRight className="h-4 w-4" /></Button>
                </div>
              )}
              {!readOnly && (
                <Button variant="ghost" size="sm" className="text-destructive hover:bg-destructive/10 hover:text-destructive" onClick={() => onDelete(response)}>
                  <Trash2 className="h-4 w-4" />Delete this answer
                </Button>
              )}
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
