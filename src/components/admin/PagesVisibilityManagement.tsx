import { Fragment, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { HIDEABLE_PAGES } from '@/lib/hideable-pages';
import { usePageVisibility } from '@/hooks/usePageVisibility';
import { useAccess } from '@/hooks/useAccess';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { WorkspacePageHeader } from '@/components/admin/WorkspacePageHeader';

const formatDate = (iso: string | null | undefined) => {
  if (!iso) return '-';
  try {
    const d = new Date(iso);
    const day = String(d.getDate()).padStart(2, '0');
    const month = d.toLocaleString('en-GB', { month: 'short' });
    const year = d.getFullYear();
    const hh = String(d.getHours()).padStart(2, '0');
    const mm = String(d.getMinutes()).padStart(2, '0');
    return `${day} ${month} ${year}, ${hh}:${mm}`;
  } catch {
    return '-';
  }
};

const PagesVisibilityManagement = () => {
  const { canView, canManage } = useAccess();
  const { user, roles } = useAuth();
  const { getRow, isHidden, setHidden, loading } = usePageVisibility();
  const [pending, setPending] = useState<Record<string, boolean>>({});
  const canEdit = canManage('website-pages');

  if (!canView('website-pages')) {
    return (
      <div className="py-16 text-center">
        <h2 className="font-serif text-heading text-accent mb-3">No access</h2>
        <p className="font-body text-muted-foreground">
          You do not have permission to view page visibility.
        </p>
      </div>
    );
  }

  const handleToggle = async (
    pageKey: string,
    label: string,
    currentlyHidden: boolean,
  ) => {
    const next = !currentlyHidden;
    setPending((p) => ({ ...p, [pageKey]: true }));
    try {
      await setHidden(pageKey, next);

      // Best-effort activity log
      try {
        await supabase.from('activity_logs').insert({
          user_id: user?.id ?? null,
          user_email: user?.email ?? '',
          user_role: roles[0]?.role ?? 'admin',
          action: 'update',
          entity_type: 'page_visibility',
          // entity_id is a uuid column; the page key is not one, so it
          // travels in details instead (a bad id would reject the insert).
          entity_id: null,
          entity_name: label,
          section: 'Website',
          subsection: 'Pages',
          details: { is_hidden: next, page_key: pageKey },
        } as never);
      } catch (e) {
        console.warn('activity log write failed', e);
      }

      toast.success(next ? 'Page hidden' : 'Page visible', {
        description: `${label} is now ${next ? 'hidden from the public' : 'visible to the public'}.`,
      });
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Could not update visibility';
      toast.error('Update failed', { description: msg });
    } finally {
      setPending((p) => {
        const n = { ...p };
        delete n[pageKey];
        return n;
      });
    }
  };

  return (
    <div>
      <WorkspacePageHeader
        title="Pages"
        description={`Toggle individual public pages on or off. When a page is hidden, the URL remains reachable but visitors see a "Page Under Update" notice over a blurred body. Homepage and legal pages cannot be hidden.`}
      />

      {!canEdit && (
        <p className="mb-4 text-sm text-muted-foreground font-body border border-separator rounded-lg px-4 py-2">
          View-only: you can see which pages are visible or hidden. Changing page visibility is reserved for the President and Admin.
        </p>
      )}

      <div className="border border-separator">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="font-serif text-accent">Page</TableHead>
              <TableHead className="font-body">Route</TableHead>
              <TableHead className="font-body">Status</TableHead>
              <TableHead className="font-body">Last updated</TableHead>
              <TableHead className="font-body text-right">Visible</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {HIDEABLE_PAGES.map((p, idx) => {
              const row = getRow(p.key);
              const hidden = isHidden(p.key);
              const isPending = !!pending[p.key];
              const showGroup = p.group && p.group !== HIDEABLE_PAGES[idx - 1]?.group;
              return (
                <Fragment key={p.key}>
                {showGroup && (
                  <TableRow className="bg-muted/40 hover:bg-muted/40">
                    <TableCell colSpan={5} className="font-body text-xs uppercase tracking-wider text-muted-foreground py-2">
                      {p.group}
                    </TableCell>
                  </TableRow>
                )}
                <TableRow key={p.key}>
                  <TableCell className="font-serif text-foreground">
                    {p.label}
                  </TableCell>
                  <TableCell className="font-body text-muted-foreground">
                    <code className="text-xs">{p.path}</code>
                  </TableCell>
                  <TableCell>
                    <span
                      className={
                        hidden
                          ? 'inline-block px-3 py-1 text-xs font-body uppercase tracking-wider bg-accent text-accent-foreground'
                          : 'inline-block px-3 py-1 text-xs font-body uppercase tracking-wider border border-separator text-foreground'
                      }
                    >
                      {hidden ? 'Hidden' : 'Visible'}
                    </span>
                  </TableCell>
                  <TableCell className="font-body text-muted-foreground">
                    {formatDate(row?.updated_at ?? null)}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="inline-flex items-center gap-2">
                      {isPending && (
                        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                      )}
                      <Switch
                        checked={!hidden}
                        disabled={isPending || loading || !canEdit}
                        onCheckedChange={() => handleToggle(p.key, p.label, hidden)}
                        aria-label={`Toggle visibility for ${p.label}`}
                      />
                    </div>
                  </TableCell>
                </TableRow>
                </Fragment>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};

export default PagesVisibilityManagement;
