import { useEffect, useMemo, useState } from 'react';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Eye } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { WorkspacePageHeader } from '@/components/admin/WorkspacePageHeader';
import {
  Pagination, PaginationContent, PaginationEllipsis, PaginationItem,
  PaginationLink, PaginationNext, PaginationPrevious,
} from '@/components/ui/pagination';
import { WorkspaceLoader } from '@/components/admin/WorkspaceLoader';
import { getAutoEmails, type AutoTemplate, type EmailLogRow } from '@/lib/ops-api';

/** Rows a page in the sent register: the workspace's own figure. */
const LOG_PER_PAGE = 25;

export default function AutoEmails() {
  const { session } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [templates, setTemplates] = useState<AutoTemplate[]>([]);
  const [log, setLog] = useState<EmailLogRow[]>([]);
  const [preview, setPreview] = useState<AutoTemplate | null>(null);
  const [q, setQ] = useState('');
  const [logPage, setLogPage] = useState(1);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const r = await getAutoEmails(session);
        setTemplates(r.templates);
        setLog(r.log);
      } catch (e) {
        toast({ title: 'Failed to load', description: e instanceof Error ? e.message : undefined, variant: 'destructive' });
      } finally {
        setLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return templates;
    return templates.filter(
      (t) =>
        t.name.toLowerCase().includes(s) ||
        t.key.toLowerCase().includes(s) ||
        (t.subject || '').toLowerCase().includes(s),
    );
  }, [templates, q]);

  // Twenty-five rows a page, which is what the Activity log and the
  // Alumni register use, so a member moving between them meets one
  // pagination rather than three.
  const logTotalPages = Math.ceil(log.length / LOG_PER_PAGE);
  const pagedLog = useMemo(
    () => log.slice((logPage - 1) * LOG_PER_PAGE, (logPage - 1) * LOG_PER_PAGE + LOG_PER_PAGE),
    [log, logPage],
  );
  // A reload that shortens the register must not leave the reader on a
  // page that no longer exists.
  useEffect(() => {
    if (logPage > 1 && logPage > logTotalPages) setLogPage(Math.max(1, logTotalPages));
  }, [logPage, logTotalPages]);

  const logPageNumbers = (): (number | 'ellipsis')[] => {
    const pages: (number | 'ellipsis')[] = [];
    if (logTotalPages <= 7) {
      for (let i = 1; i <= logTotalPages; i += 1) pages.push(i);
      return pages;
    }
    pages.push(1);
    if (logPage > 3) pages.push('ellipsis');
    for (let i = Math.max(2, logPage - 1); i <= Math.min(logTotalPages - 1, logPage + 1); i += 1) pages.push(i);
    if (logPage < logTotalPages - 2) pages.push('ellipsis');
    pages.push(logTotalPages);
    return pages;
  };

  if (loading)
    return (
      <div>
        <WorkspacePageHeader title="Automatic emails" description="Catalogue of automated emails sent by the system." />
        <WorkspaceLoader />
      </div>
    );

  return (
    <div className="space-y-10">
      <div>
        <WorkspacePageHeader
          title="Automatic emails"
          description="Reference catalogue of every automated email the system can send. For each one you can see the layout, the subject line, when it is fired and who receives it. This section is read-only; templates are maintained in code."
        />

        <div className="mb-4 max-w-sm">
          <Input
            placeholder="Search by name, key or subject…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            className="font-body"
          />
        </div>

        <div className="space-y-3">
          {filtered.map((t) => (
            <Card key={t.id}>
              <CardContent className="py-4">
                <div className="flex items-start justify-between gap-4 font-body">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span
                        className={`inline-block w-2.5 h-2.5 rounded-full ${t.connected ? 'bg-green-600' : 'bg-red-500'}`}
                        title={t.connected ? 'Wired to a trigger' : 'Not wired to a trigger'}
                      />
                      <span className="text-foreground">{t.name}</span>
                      <span className={`text-xs ${t.connected ? 'text-green-700' : 'text-red-600'}`}>
                        {t.connected ? 'Connected' : 'Not connected'}
                      </span>
                      <span className="text-xs text-muted-foreground">· {t.key}</span>
                    </div>

                    <div className="mt-2 text-sm text-muted-foreground">
                      <span className="text-foreground">Subject:</span> {t.subject || <em>-</em>}
                    </div>

                    <div className="mt-2 grid grid-cols-1 md:grid-cols-3 gap-x-6 gap-y-1 text-sm">
                      <div>
                        <span className="text-muted-foreground">Trigger:</span>{' '}
                        {t.trigger_description || <span className="text-muted-foreground italic">not yet configured</span>}
                      </div>
                      <div>
                        <span className="text-muted-foreground">Recipient:</span>{' '}
                        {t.recipient_description || <span className="text-muted-foreground italic">not yet configured</span>}
                      </div>
                      <div>
                        <span className="text-muted-foreground">Schedule:</span>{' '}
                        {t.schedule_description || <span className="text-muted-foreground italic">not yet configured</span>}
                      </div>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => setPreview(t)}
                    className="inline-flex items-center gap-1 text-sm text-accent hover:underline shrink-0"
                  >
                    <Eye className="h-4 w-4" />
                    Preview
                  </button>
                </div>
              </CardContent>
            </Card>
          ))}
          {filtered.length === 0 && (
            <p className="font-body text-sm text-muted-foreground">No templates match your search.</p>
          )}
        </div>
      </div>

      <div>
        {/* The register is a log, and a log grows without limit: every
            automatic email the system has ever sent was rendered as one
            more row, so the page became a single scroll thousands of rows
            long and the browser laid out every one of them. It is paged
            now, in the workspace's own pagination - the same component,
            the same twenty-five rows, the same ellipsis behaviour as the
            Activity log and the Alumni register. */}
        <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="font-serif text-xl text-accent">Sent register</h2>
          {log.length > 0 && (
            <span className="font-body text-sm text-muted-foreground">
              {log.length === 1 ? '1 email' : `${log.length} emails`}
              {logTotalPages > 1 && ` · page ${logPage} of ${logTotalPages}`}
            </span>
          )}
        </div>
        {log.length === 0 ? (
          <p className="font-body text-sm text-muted-foreground">No automatic emails recorded yet.</p>
        ) : (
          <div className="max-w-full border border-separator overflow-x-auto">
            <table className="w-full text-left font-body text-sm">
              <thead className="bg-muted/40 text-muted-foreground">
                <tr>
                  <th className="px-3 py-2 font-normal">Date</th>
                  <th className="px-3 py-2 font-normal">Template</th>
                  <th className="px-3 py-2 font-normal">Recipient</th>
                  <th className="px-3 py-2 font-normal">Status</th>
                </tr>
              </thead>
              <tbody>
                {pagedLog.map((l) => (
                  <tr key={l.id} className="border-t border-separator">
                    <td className="px-3 py-2 whitespace-nowrap">{new Date(l.created_at).toLocaleString()}</td>
                    <td className="px-3 py-2">{l.template_name}</td>
                    <td className="px-3 py-2">{l.recipient_email}</td>
                    <td
                      className={`px-3 py-2 capitalize ${
                        l.status === 'sent'
                          ? 'text-green-700'
                          : l.status === 'failed' || l.status === 'bounced'
                          ? 'text-destructive'
                          : 'text-muted-foreground'
                      }`}
                    >
                      {l.status}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {logTotalPages > 1 && (
          <div className="mt-6">
            <Pagination>
              <PaginationContent>
                <PaginationItem>
                  <PaginationPrevious
                    onClick={() => logPage > 1 && setLogPage(logPage - 1)}
                    className={logPage === 1 ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                  />
                </PaginationItem>
                {logPageNumbers().map((page, idx) =>
                  page === 'ellipsis' ? (
                    <PaginationItem key={`ellipsis-${idx}`}>
                      <PaginationEllipsis />
                    </PaginationItem>
                  ) : (
                    <PaginationItem key={page}>
                      <PaginationLink
                        onClick={() => setLogPage(page)}
                        isActive={logPage === page}
                        className="cursor-pointer"
                      >
                        {page}
                      </PaginationLink>
                    </PaginationItem>
                  ),
                )}
                <PaginationItem>
                  <PaginationNext
                    onClick={() => logPage < logTotalPages && setLogPage(logPage + 1)}
                    className={logPage === logTotalPages ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                  />
                </PaginationItem>
              </PaginationContent>
            </Pagination>
          </div>
        )}
      </div>

      {/* Full-height preview: the email renders at its natural width inside a
          tall scrollable frame, so it reads exactly as recipients see it. */}
      <Dialog open={!!preview} onOpenChange={(o) => !o && setPreview(null)}>
        <DialogContent className="max-w-4xl w-[min(96vw,56rem)] h-[92vh] flex flex-col gap-3 p-5">
          <DialogHeader className="shrink-0">
            <DialogTitle className="font-serif">{preview?.name}</DialogTitle>
          </DialogHeader>
          {preview && (
            <>
              <div className="shrink-0 font-body text-sm flex flex-wrap gap-x-8 gap-y-1 border-b border-separator pb-2">
                <div><span className="text-muted-foreground">Key:</span> {preview.key}</div>
                <div><span className="text-muted-foreground">Subject:</span> <span className="text-foreground">{preview.subject || '-'}</span></div>
              </div>
              <div className="flex-1 min-h-0 border border-separator bg-white">
                <iframe
                  title={`preview-${preview.key}`}
                  sandbox=""
                  srcDoc={preview.body || '<em>No layout stored</em>'}
                  className="w-full h-full block"
                />
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
