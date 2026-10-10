import { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import type { BrainteaserDraft } from '@/lib/brainteasers-api';
import { MathText } from './MathText';

// =====================================================================
// Correct a question or add one (the President, the Vice President, the
// Head of Operations and the admin account). The text takes the same
// small grammar the set is written in: a blank line between paragraphs,
// $...$ for maths in a line and $$ on lines of their own for a formula
// on its own, \$ for a dollar sign. What it will look like is shown
// beside it, exactly as members will see it.
// =====================================================================

const TEXTAREA = 'w-full resize-y rounded-md border border-input bg-background px-3 py-2 font-mono text-[13px] leading-relaxed outline-none focus-visible:ring-2 focus-visible:ring-ring';

export function ProblemEditor({ open, initial, types, firms, saving, onClose, onSave }: {
  open: boolean;
  initial: BrainteaserDraft | null;
  types: string[];
  firms: string[];
  saving: boolean;
  onClose: () => void;
  onSave: (d: BrainteaserDraft) => void;
}) {
  const blank: BrainteaserDraft = { title: '', field: types[0] ?? 'Probability', firms: [], question: '', answer: '', hidden: false };
  const [d, setD] = useState<BrainteaserDraft>(initial ?? blank);
  const [firmText, setFirmText] = useState((initial?.firms ?? []).join(', '));
  const [preview, setPreview] = useState<'question' | 'answer'>('question');
  useEffect(() => {
    if (open) { setD(initial ?? blank); setFirmText((initial?.firms ?? []).join(', ')); setPreview('question'); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, initial]);

  const problem = !d.title.trim() ? 'Give the question a title.'
    : !d.field.trim() ? 'Choose the type.'
      : !d.question.trim() ? 'Write the question.'
        : !d.answer.trim() ? 'Write the solution.' : null;

  const submit = () => {
    if (problem) return;
    onSave({ ...d, title: d.title.trim(), field: d.field.trim(), firms: firmText.split(/[,;]/).map((f) => f.trim()).filter(Boolean) });
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o && !saving) onClose(); }}>
      <DialogContent className="max-h-[92vh] max-w-5xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-serif text-2xl font-normal text-accent">{initial?.id ? 'Edit the question' : 'Add a question'}</DialogTitle>
          <DialogDescription>Maths between $ signs; a formula on its own between $$ lines; a blank line starts a new paragraph.</DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-1 gap-5 font-body lg:grid-cols-2">
          <div className="space-y-3">
            <div className="space-y-1">
              <Label htmlFor="bt-title" className="text-xs">Title</Label>
              <Input id="bt-title" value={d.title} maxLength={120} onChange={(e) => setD({ ...d, title: e.target.value })} placeholder="e.g. More Heads" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label htmlFor="bt-type" className="text-xs">Type</Label>
                <Input id="bt-type" list="bt-types" value={d.field} maxLength={40} onChange={(e) => setD({ ...d, field: e.target.value })} />
                <datalist id="bt-types">{types.map((t) => <option key={t} value={t} />)}</datalist>
              </div>
              <div className="space-y-1">
                <Label htmlFor="bt-firms" className="text-xs">Firms (comma separated)</Label>
                <Input id="bt-firms" list="bt-firm-list" value={firmText} onChange={(e) => setFirmText(e.target.value)} placeholder="e.g. Jane Street, SIG" />
                <datalist id="bt-firm-list">{firms.map((f) => <option key={f} value={f} />)}</datalist>
              </div>
            </div>
            <div className="space-y-1">
              <Label htmlFor="bt-q" className="text-xs">Question</Label>
              <textarea id="bt-q" rows={6} maxLength={8000} className={TEXTAREA} value={d.question}
                onChange={(e) => setD({ ...d, question: e.target.value })} onFocus={() => setPreview('question')} />
            </div>
            <div className="space-y-1">
              <Label htmlFor="bt-a" className="text-xs">Solution</Label>
              <textarea id="bt-a" rows={9} maxLength={20000} className={TEXTAREA} value={d.answer}
                onChange={(e) => setD({ ...d, answer: e.target.value })} onFocus={() => setPreview('answer')} />
            </div>
            <label className="flex items-center justify-between gap-3 rounded-md border border-separator px-3 py-2.5">
              <span><span className="block text-sm text-foreground">Hidden from members</span><span className="block text-xs text-muted-foreground">Kept, but not listed, until you show it again.</span></span>
              <Switch checked={d.hidden} onCheckedChange={(v) => setD({ ...d, hidden: v })} aria-label="Hidden from members" />
            </label>
          </div>
          <div className="min-w-0 rounded-lg border border-separator p-4">
            <p className="mb-3 text-xs uppercase tracking-wider text-muted-foreground">As members see the {preview === 'question' ? 'question' : 'solution'}</p>
            <MathText text={(preview === 'question' ? d.question : d.answer) || 'Nothing written yet.'} />
          </div>
        </div>
        <div className="mt-2 flex flex-wrap items-center justify-end gap-3 font-body">
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

export default ProblemEditor;
