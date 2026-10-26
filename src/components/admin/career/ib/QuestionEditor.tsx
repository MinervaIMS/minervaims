import { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import type { IbBank, IbLetter, IbQuestionDraft } from '@/lib/ib-questions-api';
import { Segmented } from '../gpa/shared';
import { BANK_INFO, LETTERS } from './ib-model';
import { QuestionBody } from './QuestionBody';

// =====================================================================
// Correct a question of IB Questions or add one (the President, the Vice
// President, the Head of Operations and the admin account), as
// Brainteasers' editor does: the fields on the left, the question as
// members will see it on the right, with the right answer marked and the
// explanation under it. Plain text: what is typed is what is shown.
// =====================================================================

const TEXTAREA = 'w-full resize-y rounded-md border border-input bg-background px-3 py-2 font-body text-sm leading-relaxed outline-none focus-visible:ring-2 focus-visible:ring-ring';

export function QuestionEditor({ open, bank, initial, subjects, sections, saving, onClose, onSave }: {
  open: boolean;
  /** The bank a new question goes into. */
  bank: IbBank;
  initial: IbQuestionDraft | null;
  subjects: string[];
  sections: string[];
  saving: boolean;
  onClose: () => void;
  onSave: (d: IbQuestionDraft) => void;
}) {
  const blank = (): IbQuestionDraft => ({
    bank, subject: subjects[0] ?? '', section: '', question: '', original: null, kind: 'technical',
    instruction: 'Select the single best answer.', statement: null, options: ['', '', '', ''], correct: 'A', explanation: '', page: null, hidden: false,
  });
  const [d, setD] = useState<IbQuestionDraft>(initial ?? blank());
  // A fresh draft each time the window opens; `blank` is rebuilt every render and is left out on purpose.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { if (open) setD(initial ?? blank()); }, [open, initial]);

  const problem = !d.subject.trim() ? 'Give the subject.'
    : !d.section.trim() ? 'Give the subsection.'
      : !d.question.trim() ? 'Write the question.'
        : d.kind === 'completion' && !(d.statement ?? '').includes('____') ? 'Write the statement, with ____ where the missing term goes.'
          : d.options.some((o) => !o.trim()) ? 'Write all four answers.'
            : new Set(d.options.map((o) => o.trim().toLowerCase())).size !== 4 ? 'The four answers must be different.'
              : !d.explanation.trim() ? 'Write the explanation.' : null;

  const submit = () => {
    if (problem) return;
    onSave({
      ...d, subject: d.subject.trim(), section: d.section.trim(), question: d.question.trim(),
      original: d.original?.trim() || null, instruction: d.instruction.trim(),
      statement: d.kind === 'completion' ? (d.statement ?? '').trim() : null,
      options: d.options.map((o) => o.trim()), explanation: d.explanation.trim(),
    });
  };
  const setOption = (i: number, v: string) => setD({ ...d, options: d.options.map((o, k) => (k === i ? v : o)) });

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o && !saving) onClose(); }}>
      <DialogContent className="max-h-[92dvh] max-w-5xl overflow-y-auto ws-form-touch">
        <DialogHeader>
          <DialogTitle className="font-serif text-2xl font-normal text-accent">{initial?.id ? 'Edit the question' : 'Add a question'}</DialogTitle>
          <DialogDescription>{BANK_INFO[d.bank].short}. Four answers, one of them right; the page shows them in a shuffled order.</DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-1 gap-5 font-body lg:grid-cols-2">
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label htmlFor="ib-subject" className="text-xs">Subject</Label>
                <Input id="ib-subject" list="ib-subjects" value={d.subject} maxLength={60} onChange={(e) => setD({ ...d, subject: e.target.value })} />
                <datalist id="ib-subjects">{subjects.map((t) => <option key={t} value={t} />)}</datalist>
              </div>
              <div className="space-y-1">
                <Label htmlFor="ib-section" className="text-xs">Subsection</Label>
                <Input id="ib-section" list="ib-sections" value={d.section} maxLength={80} onChange={(e) => setD({ ...d, section: e.target.value })} />
                <datalist id="ib-sections">{sections.map((t) => <option key={t} value={t} />)}</datalist>
              </div>
            </div>
            <div className="space-y-1">
              <span className="text-xs font-medium">Kind</span>
              <Segmented<'technical' | 'completion'> value={d.kind} onChange={(v) => setD({ ...d, kind: v, statement: v === 'completion' ? (d.statement ?? '') : d.statement })} label="Kind of question"
                options={[{ value: 'technical', label: 'A question' }, { value: 'completion', label: 'A statement to complete' }]} className="w-full" />
            </div>
            <div className="space-y-1">
              <Label htmlFor="ib-q" className="text-xs">{d.kind === 'completion' ? 'The interview question' : 'Question'}</Label>
              <textarea id="ib-q" rows={3} maxLength={2000} className={TEXTAREA} value={d.question} onChange={(e) => setD({ ...d, question: e.target.value })} />
            </div>
            {d.kind === 'completion' ? (
              <div className="space-y-1">
                <Label htmlFor="ib-statement" className="text-xs">Statement to complete (____ for the missing term)</Label>
                <textarea id="ib-statement" rows={3} maxLength={2000} className={TEXTAREA} value={d.statement ?? ''} onChange={(e) => setD({ ...d, statement: e.target.value })} />
              </div>
            ) : (
              <div className="space-y-1">
                <Label htmlFor="ib-original" className="text-xs">The guide's own wording (optional)</Label>
                <textarea id="ib-original" rows={2} maxLength={2000} className={TEXTAREA} value={d.original ?? ''} onChange={(e) => setD({ ...d, original: e.target.value })} />
              </div>
            )}
            <div className="space-y-1">
              <Label htmlFor="ib-instruction" className="text-xs">Instruction</Label>
              <Input id="ib-instruction" value={d.instruction} maxLength={300} onChange={(e) => setD({ ...d, instruction: e.target.value })} />
            </div>
            <fieldset className="space-y-2">
              <legend className="text-xs font-medium">Answers, and the right one</legend>
              {d.options.map((o, i) => (
                <div key={LETTERS[i]} className="flex items-center gap-2">
                  <button type="button" onClick={() => setD({ ...d, correct: LETTERS[i] })} aria-pressed={d.correct === LETTERS[i]} aria-label={`Answer ${LETTERS[i]} is the right one`}
                    className={`inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full border text-xs lg:h-9 lg:w-9 ${d.correct === LETTERS[i] ? 'border-emerald-600 bg-emerald-50 text-emerald-800' : 'border-input text-muted-foreground hover:border-accent/50'}`}>
                    {LETTERS[i]}
                  </button>
                  <Input value={o} maxLength={500} onChange={(e) => setOption(i, e.target.value)} aria-label={`Answer ${LETTERS[i]}`} />
                </div>
              ))}
              <p className="text-xs text-muted-foreground">Press a letter to mark the right answer: now {d.correct}.</p>
            </fieldset>
            <div className="space-y-1">
              <Label htmlFor="ib-expl" className="text-xs">Explanation, from the guide</Label>
              <textarea id="ib-expl" rows={5} maxLength={8000} className={TEXTAREA} value={d.explanation} onChange={(e) => setD({ ...d, explanation: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label htmlFor="ib-page" className="text-xs">Page of the guide</Label>
                <Input id="ib-page" inputMode="numeric" value={d.page ?? ''} onChange={(e) => { const v = e.target.value.replace(/\D+/g, ''); setD({ ...d, page: v ? Number(v) : null }); }} />
              </div>
            </div>
            <label className="flex items-center justify-between gap-3 rounded-md border border-separator px-3 py-2.5">
              <span><span className="block text-sm text-foreground">Hidden from members</span><span className="block text-xs text-muted-foreground">Kept, but not listed, until you show it again.</span></span>
              <Switch checked={d.hidden} onCheckedChange={(v) => setD({ ...d, hidden: v })} aria-label="Hidden from members" />
            </label>
          </div>
          <div className="min-w-0 rounded-lg border border-separator p-4">
            <p className="mb-3 text-xs uppercase tracking-wider text-muted-foreground">As members see it, once answered</p>
            <QuestionBody
              question={{ id: d.id ?? 'new', bank: d.bank, subject: d.subject, section: d.section, question: d.question || 'Nothing written yet.', original: d.original, kind: d.kind, instruction: d.instruction, statement: d.statement, options: d.options.map((o) => o || '...'), page: d.page, hidden: d.hidden, sort_order: 0 }}
              order={[0, 1, 2, 3]}
              checked={{ right: true, correct: d.correct, choice: d.correct, explanation: d.explanation || 'Nothing written yet.' }}
              onCheck={async () => undefined} onRetry={() => undefined} perHour={0} idPrefix="ib-preview"
            />
          </div>
        </div>
        {/* On a phone the window is one long column, so its buttons stay at the foot of it while it scrolls. */}
        <div className="mt-2 flex flex-wrap items-center justify-end gap-3 font-body max-lg:sticky max-lg:-bottom-6 max-lg:z-10 max-lg:-mx-6 max-lg:-mb-6 max-lg:border-t max-lg:border-separator max-lg:bg-background max-lg:px-6 max-lg:py-3">
          {problem && <span className="mr-auto text-sm text-muted-foreground">{problem}</span>}
          <Button type="button" variant="ghost" onClick={onClose} disabled={saving}>Cancel</Button>
          <Button type="button" variant="solid" onClick={submit} disabled={saving || !!problem}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}{initial?.id ? 'Save changes' : 'Add the question'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default QuestionEditor;
