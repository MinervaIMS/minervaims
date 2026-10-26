import { useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { REPORT_TYPES, REPORT_TYPE_LABELS, type ReportType } from '@/lib/report-meta';
import { bulkUpdateReports } from '@/lib/archive-api';
import { TagsInput } from './TagsInput';

// The same change to several reports (Step 93): a type, tags to add, tags
// to take away. Nothing else is touched. The server refuses the whole
// change if any report is outside the editor's division or would end up
// with more than twelve tags.

interface Props {
  ids: string[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  session: Session | null;
  onDone: () => void;
}

export function BulkEditDialog({ ids, open, onOpenChange, session, onDone }: Props) {
  const { toast } = useToast();
  const [type, setType] = useState<ReportType | ''>('');
  const [addTags, setAddTags] = useState<string[]>([]);
  const [removeTags, setRemoveTags] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const nothing = !type && !addTags.length && !removeTags.length;

  const save = async () => {
    setSaving(true);
    try {
      const updated = await bulkUpdateReports({
        ids,
        ...(type ? { report_type: type } : {}),
        ...(addTags.length ? { add_tags: addTags } : {}),
        ...(removeTags.length ? { remove_tags: removeTags } : {}),
      }, session);
      toast({ title: `${updated} ${updated === 1 ? 'report' : 'reports'} updated`, description: 'Check the PDF details above to carry the change into their PDFs.' });
      setType(''); setAddTags([]); setRemoveTags([]);
      onOpenChange(false);
      onDone();
    } catch (e) {
      toast({ title: 'Nothing was changed', description: e instanceof Error ? e.message : undefined, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg ws-form-touch">
        <DialogHeader>
          <DialogTitle className="font-serif">Edit {ids.length} {ids.length === 1 ? 'report' : 'reports'}</DialogTitle>
          <DialogDescription className="font-body">Only what you set here changes; everything else stays as it is.</DialogDescription>
        </DialogHeader>
        <div className="space-y-5">
          <div className="space-y-2">
            <Label htmlFor="bulk-type" className="font-body">Type</Label>
            <select id="bulk-type" value={type} onChange={(e) => setType(e.target.value as ReportType | '')} className="font-body bg-background border border-separator px-3 h-10 w-full">
              <option value="">Keep each report&apos;s type</option>
              {REPORT_TYPES.map((t) => <option key={t} value={t}>{REPORT_TYPE_LABELS[t]}</option>)}
            </select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="bulk-add" className="font-body">Add tags</Label>
            <TagsInput id="bulk-add" value={addTags} onChange={setAddTags} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="bulk-remove" className="font-body">Remove tags</Label>
            <TagsInput id="bulk-remove" value={removeTags} onChange={setRemoveTags} placeholder="A tag to take away, then Enter" />
          </div>
          <div className="flex gap-3 pt-2">
            <Button type="button" className="flex-1 font-body" onClick={save} disabled={saving || nothing}>{saving ? 'Saving...' : 'Apply to the selection'}</Button>
            <Button type="button" variant="outline" className="font-body" onClick={() => onOpenChange(false)}>Cancel</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default BulkEditDialog;
