import { useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Download, Trash2, Loader2, Search, ChevronLeft, ChevronRight } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useAccess } from '@/hooks/useAccess';
import { logActivity } from '@/lib/activity-log';
import { useToast } from '@/hooks/use-toast';
import { downloadCSV } from '@/lib/download-utils';
import { WorkspacePageHeader } from '@/components/admin/WorkspacePageHeader';
import { WorkspaceLoader } from '@/components/admin/WorkspaceLoader';
import { ColumnFilter } from '@/components/admin/ColumnFilter';
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
  const { session } = useAuth();
  const { primaryRole } = useAccess();
  const [subscribers, setSubscribers] = useState<Subscriber[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [sourceFilter, setSourceFilter] = useState<string[]>([]);
  const [page, setPage] = useState(1);

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
    const target = subscribers.find((s) => s.id === id);
    const { error } = await supabase.from('newsletter_subscribers').delete().eq('id', id);
    if (error) {
      toast({ title: 'Delete failed', description: error.message, variant: 'destructive' });
      return;
    }
    setSubscribers((prev) => prev.filter((s) => s.id !== id));
    logActivity(session, primaryRole, { action: 'delete', section: 'Website', subsection: 'Newsletter', entityType: 'newsletter_subscriber', entityId: id, entityName: target?.email ?? null });
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
        description="Subscribers to the public newsletter form. Export the list or remove individual records."
        actions={
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="outline" className="font-body" disabled={subscribers.length === 0}>
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
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={handleDownload}>Download</AlertDialogAction>
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
          className="pl-10 font-body"
        />
      </div>

      <p className="font-body text-small text-muted-foreground mb-4">
        Showing {paged.length} of {filtered.length} subscriber{filtered.length !== 1 ? 's' : ''}
        {filtered.length !== subscribers.length && ` (${subscribers.length} total)`}
      </p>

      {loading ? (
        <WorkspaceLoader />
      ) : filtered.length === 0 ? (
        <Card><CardContent className="py-12 text-center"><p className="font-body text-muted-foreground">
          {subscribers.length === 0 ? 'No subscribers yet.' : 'No subscribers match the current filters.'}
        </p></CardContent></Card>
      ) : (
        <>
          <div className="border border-separator overflow-x-auto">
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
                    <td className="px-3 py-2 whitespace-nowrap">{new Date(s.subscribed_at).toLocaleString()}</td>
                    <td className="px-3 py-2">{s.source}</td>
                    <td className="px-3 py-2 text-right">
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="icon" aria-label="Remove subscriber">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Remove subscriber</AlertDialogTitle>
                            <AlertDialogDescription>
                              Remove {s.email} from the newsletter list? This cannot be undone.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={() => handleDelete(s.id)}>Remove</AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-6 font-body text-sm">
              <span className="text-muted-foreground">
                Page {currentPage} of {totalPages}
              </span>
              <div className="flex gap-2">
                <Button
                  variant="outline" size="sm"
                  onClick={() => goToPage(currentPage - 1)}
                  disabled={currentPage === 1}
                >
                  <ChevronLeft className="h-4 w-4 mr-1" />Previous
                </Button>
                <Button
                  variant="outline" size="sm"
                  onClick={() => goToPage(currentPage + 1)}
                  disabled={currentPage === totalPages}
                >
                  Next<ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
