import { useEffect, useMemo, useState } from 'react';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Eye, Search, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { WorkspacePageHeader } from '@/components/admin/WorkspacePageHeader';
import { ColumnFilter } from '@/components/admin/ColumnFilter';
import { ClearFilters } from '@/components/shared/ClearFilters';
import {
  Pagination, PaginationContent, PaginationEllipsis, PaginationItem,
  PaginationLink, PaginationNext, PaginationPrevious,
} from '@/components/ui/pagination';
import { WorkspaceLoader } from '@/components/admin/WorkspaceLoader';
import { getAutoEmails, type AutoTemplate, type EmailLogRow } from '@/lib/ops-api';

/** Rows a page in the sent register: the workspace's own figure. */
const LOG_PER_PAGE = 25;

// =====================================================================
// THE OUTCOMES AN EMAIL CAN HAVE.
// ---------------------------------------------------------------------
// The database's own check constraint on `email_send_log.status`, in the
// order somebody reads them in: what happened, then what went wrong.
// "Sent" and "bounced" are the two anybody actually filters for, and
// bounced is the one that explains a silence.
// =====================================================================
const STATUS_OPTIONS = [
  { value: 'sent', label: 'Sent' },
  { value: 'pending', label: 'Pending' },
  { value: 'suppressed', label: 'Suppressed' },
  { value: 'failed', label: 'Failed' },
  { value: 'bounced', label: 'Bounced' },
  { value: 'complained', label: 'Marked as spam' },
  { value: 'dlq', label: 'Set aside' },
];

export default function AutoEmails() {
  const { session } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [templates, setTemplates] = useState<AutoTemplate[]>([]);
  const [log, setLog] = useState<EmailLogRow[]>([]);
  const [preview, setPreview] = useState<AutoTemplate | null>(null);
  const [q, setQ] = useState('');
  const [logPage, setLogPage] = useState(1);
  const [logTotal, setLogTotal] = useState(0);
  const [logBusy, setLogBusy] = useState(false);

  // ═══════════════════════════════════════════════════════════════════
  // NARROWING THE REGISTER, AGAINST THE WHOLE OF IT.
  // -------------------------------------------------------------------
  // The search term is DEBOUNCED and every filter is applied by the
  // endpoint, because the register is unbounded: a semester of recruiting
  // alone puts four emails against every applicant, and a filter that
  // only searched the page on screen would answer "no" for anything
  // older than the last few days.
  // ═══════════════════════════════════════════════════════════════════
  const [logSearch, setLogSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string[]>([]);
  const [templateFilter, setTemplateFilter] = useState<string[]>([]);
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(logSearch.trim()), 300);
    return () => clearTimeout(t);
  }, [logSearch]);

  // Narrowing starts again at the first page: page 4 of the old result is
  // not page 4 of the new one.
  useEffect(() => { setLogPage(1); }, [debouncedSearch, statusFilter, templateFilter, from, to]);

  const activeFilters = (debouncedSearch ? 1 : 0) + (statusFilter.length ? 1 : 0)
    + (templateFilter.length ? 1 : 0) + (from ? 1 : 0) + (to ? 1 : 0);
  const clearLogFilters = () => {
    setLogSearch(''); setDebouncedSearch(''); setStatusFilter([]); setTemplateFilter([]); setFrom(''); setTo('');
  };

  useEffect(() => {
    let cancelled = false;
    (async () => {
      // The first read paints the page; every later one only refreshes the
      // register, so the catalogue above it does not flicker on a keystroke.
      const first = templates.length === 0;
      if (first) setLoading(true); else setLogBusy(true);
      try {
        const r = await getAutoEmails(session, {
          search: debouncedSearch,
          status: statusFilter,
          template: templateFilter,
          // A date names a whole day: from its first instant to its last.
          from: from ? new Date(`${from}T00:00:00`).toISOString() : undefined,
          to: to ? new Date(`${to}T23:59:59.999`).toISOString() : undefined,
          limit: LOG_PER_PAGE,
          offset: (logPage - 1) * LOG_PER_PAGE,
        });
        if (cancelled) return;
        setTemplates(r.templates);
        setLog(r.log);
        setLogTotal(r.log_total ?? r.log.length);
      } catch (e) {
        if (!cancelled) toast({ title: 'Failed to load', description: e instanceof Error ? e.message : undefined, variant: 'destructive' });
      } finally {
        if (!cancelled) { setLoading(false); setLogBusy(false); }
      }
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedSearch, statusFilter, templateFilter, from, to, logPage]);

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
  // pagination rather than three. The page itself is cut server-side now,
  // so `log` IS the page and the count is the whole filtered register.
  const logTotalPages = Math.max(1, Math.ceil(logTotal / LOG_PER_PAGE));
  const pagedLog = log;
  // A narrowing that shortens the register must not leave the reader on a
  // page that no longer exists.
  useEffect(() => {
    if (logPage > 1 && logPage > logTotalPages) setLogPage(Math.max(1, logTotalPages));
  }, [logPage, logTotalPages]);

  /** The emails the catalogue knows about, as filter options. */
  const templateOptions = useMemo(
    () => templates.map((t) => ({ value: t.key, label: t.name })),
    [templates],
  );

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
          description="Every automatic email the workspace can send, and what it sent."
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
          <span className="font-body text-sm text-muted-foreground inline-flex items-center gap-2">
            {logBusy && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            {logTotal === 1 ? '1 email' : `${logTotal} emails`}
            {activeFilters > 0 && ' match'}
            {logTotalPages > 1 && ` · page ${logPage} of ${logTotalPages}`}
          </span>
        </div>

        {/* Search and filters. The register answers questions about one
            person or one kind of email, and until now it could only be
            read in the order it happened. */}
        <div className="mb-4 flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[16rem] max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              className="pl-10 font-body"
              placeholder="Search by recipient or email key…"
              value={logSearch}
              onChange={(e) => setLogSearch(e.target.value)}
            />
          </div>
          <div className="font-body text-sm">
            <ColumnFilter label="Email" options={templateOptions} selected={templateFilter} onChange={setTemplateFilter} />
          </div>
          <div className="font-body text-sm">
            <ColumnFilter label="Outcome" options={STATUS_OPTIONS} selected={statusFilter} onChange={setStatusFilter} />
          </div>
          <div className="flex items-center gap-2 font-body text-sm">
            <label className="text-muted-foreground" htmlFor="log-from">From</label>
            <Input id="log-from" type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="w-[10.5rem] font-body" />
            <label className="text-muted-foreground" htmlFor="log-to">to</label>
            <Input id="log-to" type="date" value={to} onChange={(e) => setTo(e.target.value)} className="w-[10.5rem] font-body" />
          </div>
          <ClearFilters count={activeFilters} onClear={clearLogFilters} size="sm" />
        </div>

        {log.length === 0 ? (
          <p className="font-body text-sm text-muted-foreground">
            {activeFilters > 0 ? 'No email matches these filters.' : 'No automatic emails recorded yet.'}
          </p>
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
                    <td className="px-3 py-2">
                      <span className="text-foreground">{l.template_label || l.template_name}</span>
                      {l.template_label && <span className="text-xs text-muted-foreground ml-2">{l.template_name}</span>}
                    </td>
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
                      {l.error_message && (
                        <div className="text-xs normal-case text-muted-foreground mt-0.5 break-words max-w-[22rem]">{l.error_message}</div>
                      )}
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
