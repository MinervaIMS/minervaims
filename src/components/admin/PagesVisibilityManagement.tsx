import { useMemo, useState } from 'react';
import { Loader2, Search } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { HIDEABLE_PAGES } from '@/lib/hideable-pages';
import { usePageVisibility } from '@/hooks/usePageVisibility';
import { useAccess } from '@/hooks/useAccess';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { WorkspacePageHeader } from '@/components/admin/WorkspacePageHeader';
import { ColumnFilter } from '@/components/admin/ColumnFilter';

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

// Table layout mirrors People > Members: one search bar above, column
// filters inside the header row, bordered flat table.
const PagesVisibilityManagement = () => {
  const { canView, canManage } = useAccess();
  const { user, roles } = useAuth();
  const { getRow, isHidden, setHidden, loading } = usePageVisibility();
  const [pending, setPending] = useState<Record<string, boolean>>({});
  const [search, setSearch] = useState('');
  const [groupFilter, setGroupFilter] = useState<string[]>([]);
  const [statusFilter, setStatusFilter] = useState<string[]>([]);
  const canEdit = canManage('website-pages');

  const groupOptions = useMemo(() =>
    [...new Set(HIDEABLE_PAGES.map((p) => p.group ?? 'Other'))]
      .map((g) => ({ value: g, label: g })), []);
  const statusOptions = [
    { value: 'visible', label: 'Visible' },
    { value: 'hidden', label: 'Hidden' },
  ];

  const rows = useMemo(() => {
    const q = search.trim().toLowerCase();
    return HIDEABLE_PAGES
      .filter((p) => groupFilter.length === 0 || groupFilter.includes(p.group ?? 'Other'))
      .filter((p) => statusFilter.length === 0 || statusFilter.includes(isHidden(p.key) ? 'hidden' : 'visible'))
      .filter((p) => !q || p.label.toLowerCase().includes(q) || p.path.toLowerCase().includes(q));
  }, [search, groupFilter, statusFilter, isHidden]);

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
        <p className="mb-4 text-sm text-muted-foreground font-body border border-separator px-4 py-2">
          View-only: you can see which pages are visible or hidden. Changing page visibility is reserved for the President and Admin.
        </p>
      )}

      {/* Search bar above the table; column filters live in the header row. */}
      <div className="mb-4 max-w-md">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input className="pl-10 font-body" placeholder="Search by page or route" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
      </div>

      {rows.length === 0 ? (
        <Card><CardContent className="py-12 text-center"><p className="font-body text-muted-foreground">No pages match the current filters.</p></CardContent></Card>
      ) : (
        <div className="border border-separator overflow-x-auto">
          <table className="w-full text-left font-body text-sm">
            <thead className="bg-muted/40 text-muted-foreground">
              <tr>
                <th className="px-3 py-2 font-normal">Page</th>
                <th className="px-3 py-2 font-normal">Route</th>
                <th className="px-3 py-2 font-normal"><ColumnFilter label="Group" options={groupOptions} selected={groupFilter} onChange={setGroupFilter} /></th>
                <th className="px-3 py-2 font-normal"><ColumnFilter label="Status" options={statusOptions} selected={statusFilter} onChange={setStatusFilter} /></th>
                <th className="px-3 py-2 font-normal">Last updated</th>
                <th className="px-3 py-2 font-normal text-right">Visible</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((p) => {
                const row = getRow(p.key);
                const hidden = isHidden(p.key);
                const isPending = !!pending[p.key];
                return (
                  <tr key={p.key} className="border-t border-separator">
                    <td className="px-3 py-2 text-foreground whitespace-nowrap">{p.label}</td>
                    <td className="px-3 py-2 text-muted-foreground"><code className="text-xs">{p.path}</code></td>
                    <td className="px-3 py-2 whitespace-nowrap">{p.group ?? 'Other'}</td>
                    <td className="px-3 py-2">
                      <span
                        className={
                          hidden
                            ? 'inline-block px-2.5 py-0.5 text-[11px] font-body uppercase tracking-wider bg-accent text-accent-foreground'
                            : 'inline-block px-2.5 py-0.5 text-[11px] font-body uppercase tracking-wider border border-separator text-foreground'
                        }
                      >
                        {hidden ? 'Hidden' : 'Visible'}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-muted-foreground whitespace-nowrap">{formatDate(row?.updated_at ?? null)}</td>
                    <td className="px-3 py-2 text-right">
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
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default PagesVisibilityManagement;
