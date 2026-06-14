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
import { useToast } from '@/hooks/use-toast';
import { downloadCSV } from '@/lib/download-utils';

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

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return subscribers;
    return subscribers.filter((s) => s.email.toLowerCase().includes(q));
  }, [subscribers, search]);

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
      <div className="flex items-center justify-between mb-8 flex-wrap gap-3">
        <h2 className="font-serif text-heading text-accent">Newsletter Subscribers</h2>
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
      </div>

      <div className="mb-6 relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          placeholder="Search by email"
          className="pl-9"
        />
      </div>

      {loading ? (
        <div className="py-16 flex justify-center"><Loader2 className="h-6 w-6 animate-spin" /></div>
      ) : filtered.length === 0 ? (
        <p className="font-body text-muted-foreground py-12 text-center">
          {subscribers.length === 0 ? 'No subscribers yet.' : 'No subscribers match your search.'}
        </p>
      ) : (
        <>
          <div className="overflow-x-auto">
            <table className="w-full font-body text-sm">
              <thead>
                <tr className="border-b border-separator text-left">
                  <th className="py-3 pr-4 font-serif">Email</th>
                  <th className="py-3 pr-4 font-serif">Subscribed at</th>
                  <th className="py-3 pr-4 font-serif">Source</th>
                  <th className="py-3 pr-4 font-serif w-20 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {paged.map((s) => (
                  <tr key={s.id} className="border-b border-separator/60">
                    <td className="py-3 pr-4">{s.email}</td>
                    <td className="py-3 pr-4">{new Date(s.subscribed_at).toLocaleString()}</td>
                    <td className="py-3 pr-4">{s.source}</td>
                    <td className="py-3 pr-4 text-right">
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
                Page {currentPage} of {totalPages} · {filtered.length} subscriber{filtered.length !== 1 ? 's' : ''}
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
