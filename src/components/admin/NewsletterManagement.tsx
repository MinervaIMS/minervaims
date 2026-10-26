import { useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Download, Trash2, Search } from 'lucide-react';
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from '@/components/ui/pagination';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { downloadCSV } from '@/lib/download-utils';
import { WorkspacePageHeader } from '@/components/admin/WorkspacePageHeader';
import { formatStamp } from '@/lib/event-time';
import { WorkspaceLoader } from '@/components/admin/WorkspaceLoader';
import { ColumnFilter } from '@/components/admin/ColumnFilter';
import { FilterSheet, FilterSummary, filterChips, type FilterGroup } from '@/components/admin/kit/Filters';
import { RecordCard, RecordList } from '@/components/admin/kit/RecordCard';
import { MoreMenu } from '@/components/admin/kit/MoreMenu';
import { Card, CardContent } from '@/components/ui/card';

interface Subscriber {
  id: string;
  email: string;
  source: string;
  subscribed_at: string;
}

const PAGE_SIZE = 25;

export default function NewsletterManagement() {
  const { toast } = useToast();
  const [subscribers, setSubscribers] = useState<Subscriber[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [sourceFilter, setSourceFilter] = useState<string[]>([]);
  const [page, setPage] = useState(1);
  const [toRemove, setToRemove] = useState<Subscriber | null>(null);

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('newsletter_subscribers')
      .select('id, email, source, subscribed_at')
      .order('subscribed_at', { ascending: false });
    if (error) {
      toast({ title: 'Failed to load subscribers', description: error.message, variant: 'destructive' });
    } else {
      setSubscribers(data ?? []);
    }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const sourceOptions = useMemo(() =>
    [...new Set(subscribers.map((s) => s.source))].sort()
      .map((v) => ({ value: v, label: v })), [subscribers]);


  // Every filter on this register, and the way back out of all of them:
  // named above the list on every screen, and in one sheet on a phone.
  const filterGroups: FilterGroup[] = [
    { key: 'source', label: 'Source', options: sourceOptions, selected: sourceFilter, onChange: (v) => { setSourceFilter(v); setPage(1); } },
  ];
  const clearAllFilters = () => {
    setSourceFilter([]);
    setSearch('');
    setPage(1);
  };

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return subscribers
      .filter((s) => sourceFilter.length === 0 || sourceFilter.includes(s.source))
      .filter((s) => !q || s.email.toLowerCase().includes(q));
  }, [subscribers, search, sourceFilter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const paged = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  const goToPage = (p: number) => {
    setPage(p);
    setTimeout(() => window.scrollTo({ top: 0, behavior: 'smooth' }), 0);
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from('newsletter_subscribers').delete().eq('id', id);
    if (error) {
      toast({ title: 'Delete failed', description: error.message, variant: 'destructive' });
      return;
    }
    setSubscribers((prev) => prev.filter((s) => s.id !== id));
    // Recorded in Activity tracking by the audit trigger on the table.
    toast({ title: 'Subscriber removed' });
  };

  const handleDownload = () => {
    const columns: { key: keyof Subscriber; header: string }[] = [
      { key: 'email', header: 'Email' },
      { key: 'subscribed_at', header: 'Subscribed At' },
      { key: 'source', header: 'Source' },
    ];
    downloadCSV(subscribers, columns, 'newsletter-subscribers.csv');
    toast({ title: 'Download started', description: 'Newsletter subscribers CSV is being downloaded.' });
  };

  return (
    <div>
      <WorkspacePageHeader
        title="Newsletter"
        description="Subscribers to the public newsletter."
        actions={
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="outline" className="font-body h-11 lg:h-10" disabled={subscribers.length === 0}>
                <Download className="h-4 w-4 mr-2" />Download CSV
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Download Newsletter Subscribers CSV</AlertDialogTitle>
                <AlertDialogDescription>
                  This will download a CSV file containing {subscribers.length} subscriber{subscribers.length !== 1 ? 's' : ''}.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel className="h-11 lg:h-10">Cancel</AlertDialogCancel>
                <AlertDialogAction className="h-11 lg:h-10" onClick={handleDownload}>Download</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        }
      />


      {/* Search bar above the table; column filters live in the header row
          (the same pattern as People > Members). */}
      <div className="mb-4 relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          placeholder="Search by email"
          className="pl-10 font-body h-11 lg:h-10"
        />
        <div className="mt-3 lg:hidden">
          <FilterSheet groups={filterGroups} shown={filtered.length} noun={{ one: 'subscriber', many: 'subscribers' }} onClearAll={clearAllFilters} />
        </div>
      </div>

      <FilterSummary
        shown={filtered.length}
        total={subscribers.length}
        noun={{ one: 'subscriber', many: 'subscribers' }}
        chips={filterChips(filterGroups, { value: search, clear: () => { setSearch(''); setPage(1); } })}
        onClearAll={clearAllFilters}
        note={totalPages > 1 ? `page ${currentPage} of ${totalPages}` : undefined}
      />

      {loading ? (
        <WorkspaceLoader />
      ) : filtered.length === 0 ? (
        <Card><CardContent className="py-12 text-center"><p className="font-body text-muted-foreground">
          {subscribers.length === 0 ? 'No subscribers yet.' : 'No subscribers match the current filters.'}
        </p></CardContent></Card>
      ) : (
        <>
          {/* On a phone a card per subscriber; on a computer the table.
              Removing is rare and cannot be undone: under More, in red, and
              it asks first (Step 98). */}
          <RecordList label="Subscribers">
            {paged.map((s) => (
              <RecordCard
                key={s.id}
                title={<span className="break-all">{s.email}</span>}
                meta={formatStamp(s.subscribed_at)}
                aside={<span className="text-xs text-muted-foreground">{s.source}</span>}
                actions={(
                  <MoreMenu
                    label={`More actions for ${s.email}`}
                    title={s.email}
                    actions={[{ key: 'remove', label: 'Remove subscriber', icon: Trash2, destructive: true, onSelect: () => setToRemove(s) }]}
                  />
                )}
              />
            ))}
          </RecordList>
          <div className="hidden lg:block max-w-full border border-separator overflow-x-auto">
            <table className="w-full text-left font-body text-sm">
              <thead className="bg-muted/40 text-muted-foreground">
                <tr>
                  <th className="px-3 py-2 font-normal">Email</th>
                  <th className="px-3 py-2 font-normal">Subscribed at</th>
                  <th className="px-3 py-2 font-normal"><ColumnFilter label="Source" options={sourceOptions} selected={sourceFilter} onChange={setSourceFilter} /></th>
                  <th className="px-3 py-2 font-normal w-20 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {paged.map((s) => (
                  <tr key={s.id} className="border-t border-separator">
                    <td className="px-3 py-2 text-foreground">{s.email}</td>
                    <td className="px-3 py-2 whitespace-nowrap">{formatStamp(s.subscribed_at)}</td>
                    <td className="px-3 py-2">{s.source}</td>
                    <td className="px-3 py-2 text-right">
                      <MoreMenu
                        label={`More actions for ${s.email}`}
                        title={s.email}
                        actions={[{ key: 'remove', label: 'Remove subscriber', icon: Trash2, destructive: true, onSelect: () => setToRemove(s) }]}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Numbered pagination, the same as People > Alumni. */}
          {totalPages > 1 && (
            <Pagination className="mt-8">
              <PaginationContent>
                <PaginationItem>
                  <PaginationPrevious
                    onClick={() => currentPage > 1 && goToPage(currentPage - 1)}
                    className={`max-lg:h-11 ${currentPage === 1 ? 'pointer-events-none opacity-50' : 'cursor-pointer'}`}
                  />
                </PaginationItem>
                {(() => {
                  const pages: (number | 'ellipsis')[] = [];
                  if (totalPages <= 5) {
                    for (let i = 1; i <= totalPages; i++) pages.push(i);
                  } else {
                    if (currentPage <= 3) {
                      pages.push(1, 2, 3, 4, 'ellipsis', totalPages);
                    } else if (currentPage >= totalPages - 2) {
                      pages.push(1, 'ellipsis', totalPages - 3, totalPages - 2, totalPages - 1, totalPages);
                    } else {
                      pages.push(1, 'ellipsis', currentPage - 1, currentPage, currentPage + 1, 'ellipsis', totalPages);
                    }
                  }
                  return pages.map((page, index) => (
                    <PaginationItem key={index}>
                      {page === 'ellipsis' ? (
                        <span className="px-3 py-2">...</span>
                      ) : (
                        <PaginationLink
                          isActive={currentPage === page}
                          onClick={() => goToPage(page)}
                          className="cursor-pointer max-lg:h-11 max-lg:w-11"
                        >
                          {page}
                        </PaginationLink>
                      )}
                    </PaginationItem>
                  ));
                })()}
                <PaginationItem>
                  <PaginationNext
                    onClick={() => currentPage < totalPages && goToPage(currentPage + 1)}
                    className={`max-lg:h-11 ${currentPage === totalPages ? 'pointer-events-none opacity-50' : 'cursor-pointer'}`}
                  />
                </PaginationItem>
              </PaginationContent>
            </Pagination>
          )}
        </>
      )}

      <AlertDialog open={!!toRemove} onOpenChange={(o) => { if (!o) setToRemove(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove subscriber</AlertDialogTitle>
            <AlertDialogDescription>
              Remove {toRemove?.email} from the newsletter list? This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="h-11 lg:h-10">Cancel</AlertDialogCancel>
            <AlertDialogAction className="h-11 lg:h-10" onClick={() => { if (toRemove) handleDelete(toRemove.id); setToRemove(null); }}>Remove</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
