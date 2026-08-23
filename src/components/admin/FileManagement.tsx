import { useState, useEffect, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';
import { WorkspaceLoader } from '@/components/admin/WorkspaceLoader';
import { supabase } from '@/integrations/supabase/client';
import { Edit, Trash2, FileText, Search, Download, ChevronDown, ChevronUp, ChevronLeft, ChevronRight, MoreHorizontal, Loader2, FolderDown, RotateCcw } from 'lucide-react';
import { divisionLabels, fundLabels, activeFunds, closedFunds, Division, Fund } from '@/lib/types';
import { PdfThumbnail } from '@/components/shared/PdfThumbnail';
import { downloadFilesSequentially, sanitizeFilename } from '@/lib/download-utils';
import { downloadTitled } from '@/lib/file-download';
import { WorkspacePageHeader } from '@/components/admin/WorkspacePageHeader';
import { useAuth } from '@/contexts/AuthContext';
import { useAccess } from '@/hooks/useAccess';
import { logActivity } from '@/lib/activity-log';
interface ArchiveFile {
  id: string;
  title: string;
  description: string | null;
  file_url: string;
  date: string;
  division: string;
  fund: string | null;
  status?: string;
  project?: string | null;
  /** Set while the report is in the recovery window. Null means live. */
  deleted_at?: string | null;
  created_at: string;
  updated_at: string;
}

// =====================================================================
// THE THREE STATES A REPORT CAN BE IN, and what each one means.
// ---------------------------------------------------------------------
//   Draft      Written, not yet published. Lives here, never public.
//   Published  Live on the website.
//   Blocked    Was published and has been withdrawn. Lives here, no
//              longer public. This is the after-the-fact counterpart to
//              Draft, which is the before.
//
// All three are held in the archive; only Published reaches the public
// website. That was already the intention and already the data model.
// What was missing was the enforcement: the public pages asked for every
// report and let row-level security sort it out, and the staff read
// policy - which a signed-in Head also matches - returns everything. So
// drafts and blocked reports were on the public pages for exactly the
// people least likely to notice. The public queries now name the filter
// themselves; see the note in pages/Archive.tsx.
//
// Deletion is a fourth, orthogonal state: a report of any status can be
// deleted, and it then waits RECOVERY_DAYS days to be restored or purged.
// =====================================================================

/** Must match RECOVERY_DAYS in supabase/functions/admin-files. */
const RECOVERY_DAYS = 30;
const DAY_MS = 24 * 60 * 60 * 1000;

/** Whole days left before a deleted report is purged; 0 means it goes today. */
function daysLeft(deletedAt: string): number {
  const elapsed = Date.now() - new Date(deletedAt).getTime();
  return Math.max(0, Math.ceil((RECOVERY_DAYS * DAY_MS - elapsed) / DAY_MS));
}

interface FileManagementProps {
  allowedDivisions?: Division[] | null;
}

const FileManagement = ({ allowedDivisions }: FileManagementProps) => {
  const [files, setFiles] = useState<ArchiveFile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingFile, setEditingFile] = useState<ArchiveFile | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [divisionFilter, setDivisionFilter] = useState<Division | 'all'>('all');
  // Portfolio Management publishes per fund, so that division gets the same
  // fund filter the public archive offers.
  const [fundFilter, setFundFilter] = useState<Fund | 'all'>('all');
  const [yearFilter, setYearFilter] = useState<number | 'all'>('all');
  // Draft / Published / Blocked. The archive holds all three, so it should be
  // possible to ask it for one of them.
  const [statusFilter, setStatusFilter] = useState<'all' | 'draft' | 'published' | 'blocked'>('all');
  // The recovery window, folded away until it is wanted.
  const [showDeleted, setShowDeleted] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedDescriptions, setExpandedDescriptions] = useState<Set<string>>(new Set());
  const [downloadingFiles, setDownloadingFiles] = useState<Set<string>>(new Set());
  const [currentPage, setCurrentPage] = useState(1);
  const [isDownloadingAll, setIsDownloadingAll] = useState(false);
  const [downloadAllProgress, setDownloadAllProgress] = useState({ current: 0, total: 0 });
  const ITEMS_PER_PAGE = 15;
  
  // If user has restricted divisions, default form to first allowed division
  const defaultDivision = allowedDivisions && allowedDivisions.length > 0 ? allowedDivisions[0] : '' as Division | '';
  
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    file_url: '',
    date: '',
    division: defaultDivision,
    fund: '' as Fund | '',
  });
  const { toast } = useToast();
  const { session } = useAuth();
  const access = useAccess();

  // FAVOURITES ARE NOT PART OF THE ARCHIVE ANY MORE.
  //
  // Pinning five reports to the top of a complete, filtered, paginated
  // archive gave the list two competing orders: the one the filters and the
  // date produce, and a private one belonging to whoever last pressed a star.
  // The archive's job is to hold everything and let it be searched. The star
  // control, the pinned band and the pinning sort are all gone from here.
  //
  // Nothing else loses favourites. The resource sections - Templates &
  // repositories, MIMS Graphics, Instagram, LinkedIn, Other Resources - keep
  // theirs, because a shortlist of five is exactly what a working shelf
  // wants. Their favourites live on a different table and are untouched, and
  // the `is_favourite` column here is left alone rather than dropped, so no
  // existing data is destroyed by this change.

  const handleSetStatus = async (fileId: string, status: 'draft' | 'published' | 'blocked') => {
    try {
      const { data, error } = await supabase.functions.invoke('admin-files', {
        body: { action: 'set-status', file: { id: fileId, status } },
        headers: { Authorization: `Bearer ${session?.access_token}` },
      });
      if (error) throw error;
      if (data?.error) { toast({ title: 'Error', description: data.error, variant: 'destructive' }); return; }
      setFiles((prev) => prev.map((f) => (f.id === fileId ? { ...f, status } : f)));
      const target = files.find((f) => f.id === fileId);
      logActivity(session, access.primaryRole, { action: 'status_change', section: 'Reports', subsection: 'Report archive', entityType: 'file', entityId: fileId, entityName: target?.title ?? null, details: { status } });
      toast({ title: `Report ${status === 'published' ? 'published' : status === 'blocked' ? 'blocked' : 'set to draft'}` });
    } catch (e) {
      toast({ title: 'Could not update status', description: e instanceof Error ? e.message : undefined, variant: 'destructive' });
    }
  };

  useEffect(() => {
    // Close the window on anything already past its thirty days, then load.
    //
    // A recovery period that is only a filter in the interface is not a
    // period at all: the rows and the PDFs would sit in the bucket for ever
    // and "recoverable for 30 days" would be a claim nothing enforced. The
    // sweep is best-effort and deliberately silent - if it fails, the list
    // is still correct, because the window is applied here as well.
    (async () => {
      try {
        const { data: { session: s } } = await supabase.auth.getSession();
        await supabase.functions.invoke('admin-files', {
          body: { action: 'purge-expired' },
          headers: { Authorization: `Bearer ${s?.access_token}` },
        });
      } catch { /* the list below does not depend on this */ }
      fetchFiles();
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchFiles = async () => {
    try {
      // Staff read every report, in every state: this is the archive, and
      // drafts, blocked reports and the recovery window are all part of it.
      // The public pages ask a narrower question; see pages/Archive.tsx.
      const { data, error } = await supabase
        .from('archive_files')
        .select('*')
        .order('date', { ascending: false });

      if (error) throw error;
      setFiles(data || []);
    } catch (error) {
      console.error('Error fetching files:', error);
      toast({
        title: "Error",
        description: "Failed to fetch archive files",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  /** Put a deleted report back, exactly as it was. */
  const handleRestore = async (file: ArchiveFile) => {
    const previous = files;
    setFiles((prev) => prev.map((f) => (f.id === file.id ? { ...f, deleted_at: null } : f)));
    try {
      const { data, error } = await supabase.functions.invoke('admin-files', {
        body: { action: 'restore', file: { id: file.id } },
        headers: { Authorization: `Bearer ${session?.access_token}` },
      });
      if (error || data?.error) {
        setFiles(previous);
        toast({ title: 'Could not restore', description: data?.error || 'Please try again.', variant: 'destructive' });
        return;
      }
      logActivity(session, access.primaryRole, { action: 'update', section: 'Reports', subsection: 'Report archive', entityType: 'file', entityId: file.id, entityName: file.title, details: { operation: 'restore' } });
      toast({ title: 'Report restored', description: `"${file.title}" is back in the archive${file.status === 'published' ? ' and live on the website' : ''}.` });
    } catch (e) {
      setFiles(previous);
      toast({ title: 'Could not restore', description: e instanceof Error ? e.message : undefined, variant: 'destructive' });
    }
  };

  /** Remove a deleted report for good, before its window is up. */
  const handlePurge = async (file: ArchiveFile) => {
    if (!confirm(`Remove "${file.title}" permanently? This cannot be undone: the report and its PDF are deleted immediately.`)) return;
    const previous = files;
    setFiles((prev) => prev.filter((f) => f.id !== file.id));
    try {
      const { data, error } = await supabase.functions.invoke('admin-files', {
        body: { action: 'purge', file: { id: file.id } },
        headers: { Authorization: `Bearer ${session?.access_token}` },
      });
      if (error || data?.error) {
        setFiles(previous);
        toast({ title: 'Could not remove', description: data?.error || 'Please try again.', variant: 'destructive' });
        return;
      }
      logActivity(session, access.primaryRole, { action: 'delete', section: 'Reports', subsection: 'Report archive', entityType: 'file', entityId: file.id, entityName: file.title, details: { operation: 'permanent' } });
      toast({ title: 'Removed permanently' });
    } catch (e) {
      setFiles(previous);
      toast({ title: 'Could not remove', description: e instanceof Error ? e.message : undefined, variant: 'destructive' });
    }
  };

  /**
   * The reports in the recovery window, soonest to expire first.
   *
   * The window is applied here as well as on the server, so a report whose
   * thirty days ran out while this tab was open stops being offered even if
   * the sweep has not reached it yet.
   */
  const deletedFiles = useMemo(
    () => files
      .filter((f) => f.deleted_at && daysLeft(f.deleted_at) > 0)
      .filter((f) => !allowedDivisions || allowedDivisions.includes(f.division as Division))
      .sort((a, b) => new Date(a.deleted_at!).getTime() - new Date(b.deleted_at!).getTime()),
    [files, allowedDivisions],
  );

  const filteredFiles = useMemo(() => {
    return files.filter(file => {
      // A deleted report is not part of the archive while it is deleted; it
      // has its own section below the list.
      if (file.deleted_at) return false;
      // Allowed divisions filter (for restricted users)
      if (allowedDivisions && !allowedDivisions.includes(file.division as Division)) return false;
      // Division filter
      if (divisionFilter !== 'all' && file.division !== divisionFilter) return false;
      if (divisionFilter === 'portfolio' && fundFilter !== 'all' && file.fund !== fundFilter) return false;
      // Status filter: the archive holds three states and it should be
      // possible to ask for one of them, e.g. "what is still a draft?".
      if (statusFilter !== 'all' && (file.status || 'published') !== statusFilter) return false;
      // Year filter
      if (yearFilter !== 'all') {
        const fileYear = new Date(file.date).getFullYear();
        if (fileYear !== yearFilter) return false;
      }
      // Search filter
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const matchesTitle = file.title.toLowerCase().includes(query);
        const matchesDescription = file.description?.toLowerCase().includes(query) || false;
        if (!matchesTitle && !matchesDescription) return false;
      }
      return true;
    });
    // Newest first, and only that. The archive is a record, so its order is
    // the record's own; nothing is pinned above it.
  }, [files, divisionFilter, fundFilter, statusFilter, yearFilter, searchQuery, allowedDivisions]);

  const fileYears = useMemo(() => {
    let relevantFiles = files.filter((f) => !f.deleted_at);
    if (allowedDivisions) {
      relevantFiles = relevantFiles.filter(f => allowedDivisions.includes(f.division as Division));
    }
    const years = [...new Set(relevantFiles.map(f => new Date(f.date).getFullYear()))];
    return years.sort((a, b) => b - a);
  }, [files, allowedDivisions]);

  // Pagination logic
  const totalPages = Math.ceil(filteredFiles.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const paginatedFiles = filteredFiles.slice(startIndex, startIndex + ITEMS_PER_PAGE);

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [divisionFilter, fundFilter, statusFilter, yearFilter, searchQuery]);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    // Use setTimeout to scroll after React re-renders the new page content
    setTimeout(() => {
      window.scrollTo({
        top: 0,
        behavior: 'smooth'
      });
    }, 0);
  };

  const getPageNumbers = () => {
    const pages: (number | 'ellipsis')[] = [];
    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      pages.push(1);
      if (currentPage > 3) pages.push('ellipsis');
      for (let i = Math.max(2, currentPage - 1); i <= Math.min(totalPages - 1, currentPage + 1); i++) {
        pages.push(i);
      }
      if (currentPage < totalPages - 2) pages.push('ellipsis');
      pages.push(totalPages);
    }
    return pages;
  };

  // Get divisions available for filtering/selection based on permissions
  const availableDivisions = useMemo(() => {
    if (allowedDivisions) {
      return Object.entries(divisionLabels).filter(([key]) => 
        allowedDivisions.includes(key as Division)
      );
    }
    return Object.entries(divisionLabels);
  }, [allowedDivisions]);

  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      file_url: '',
      date: '',
      division: defaultDivision,
      fund: '',
    });
    setEditingFile(null);
    setUploadProgress(0);
  };

  const openEditDialog = (file: ArchiveFile) => {
    setEditingFile(file);
    setFormData({
      title: file.title,
      description: file.description || '',
      file_url: file.file_url,
      date: file.date,
      division: file.division as Division,
      fund: (file.fund as Fund) || '',
    });
    setIsDialogOpen(true);
  };

  const toggleDescription = (id: string) => {
    setExpandedDescriptions(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  const handleDownload = async (file: ArchiveFile) => {
    if (downloadingFiles.has(file.id)) return;

    setDownloadingFiles(prev => new Set(prev).add(file.id));

    try {
      // Saved under the report's own title, never the storage key.
      await downloadTitled(file.file_url, file.title, 'pdf');

      toast({
        title: "Download complete",
        description: `${file.title} has been downloaded.`,
      });
    } catch (error) {
      console.error('Download error:', error);
      toast({
        title: "Download failed",
        description: "Please try again or right-click the link to save.",
        variant: "destructive",
      });
    } finally {
      setDownloadingFiles(prev => {
        const next = new Set(prev);
        next.delete(file.id);
        return next;
      });
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.type !== 'application/pdf') {
      toast({
        title: "Error",
        description: "Only PDF files are allowed",
        variant: "destructive",
      });
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      toast({
        title: "Error",
        description: "File size must be less than 10MB",
        variant: "destructive",
      });
      return;
    }

    setIsUploading(true);
    setUploadProgress(0);

    // Simulate progress since we can't track actual upload progress
    const progressInterval = setInterval(() => {
      setUploadProgress(prev => {
        if (prev >= 90) {
          clearInterval(progressInterval);
          return 90;
        }
        return prev + 10;
      });
    }, 200);

    try {
      // Get auth session for edge function
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        throw new Error('Not authenticated');
      }

      // Create FormData for file upload through edge function
      const uploadFormData = new FormData();
      uploadFormData.append('file', file);
      if (formData.division) {
        uploadFormData.append('division', formData.division);
      }

      // Upload through edge function (uses service_role for storage access)
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/admin-files`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
          },
          body: uploadFormData,
        }
      );

      clearInterval(progressInterval);

      const result = await response.json();

      if (!response.ok || result.error) {
        throw new Error(result.error || 'Upload failed');
      }

      setFormData({ ...formData, file_url: result.file_url });
      setUploadProgress(100);
      
      toast({
        title: "Success",
        description: "File uploaded successfully",
      });
    } catch (error) {
      clearInterval(progressInterval);
      console.error('Upload error:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to upload file",
        variant: "destructive",
      });
      setUploadProgress(0);
    } finally {
      setIsUploading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;

    if (!formData.title.trim() || !formData.date || !formData.division || !formData.file_url) {
      toast({
        title: "Error",
        description: "Title, date, division, and file are required",
        variant: "destructive",
      });
      return;
    }

    if (formData.division === 'portfolio' && !formData.fund) {
      toast({
        title: "Error",
        description: "Fund is required for Portfolio Management division",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);
    const action = editingFile ? 'update' : 'create';
    
    const fileData = {
      title: formData.title.trim(),
      description: formData.description.trim() || null,
      file_url: formData.file_url,
      date: formData.date,
      division: formData.division,
      fund: formData.division === 'portfolio' ? formData.fund : null,
      ...(editingFile && { id: editingFile.id }),
    };

    // Optimistic update
    const tempId = editingFile?.id || crypto.randomUUID();
    const optimisticFile: ArchiveFile = {
      id: tempId,
      ...fileData,
      created_at: editingFile?.created_at || new Date().toISOString(),
      updated_at: new Date().toISOString(),
    } as ArchiveFile;

    if (editingFile) {
      setFiles(prev => prev.map(f => f.id === editingFile.id ? optimisticFile : f));
    } else {
      setFiles(prev => [optimisticFile, ...prev]);
    }

    setIsDialogOpen(false);
    resetForm();

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const { data, error } = await supabase.functions.invoke('admin-files', {
        body: { action, file: fileData },
        headers: { Authorization: `Bearer ${session?.access_token}` },
      });

      if (error || data?.error) {
        fetchFiles();
        toast({ title: "Error", description: data?.error || "Failed to save file", variant: "destructive" });
        return;
      }

      toast({ title: "Success", description: `File ${editingFile ? 'updated' : 'created'} successfully` });
      fetchFiles();
    } catch (error) {
      console.error('Submit error:', error);
      fetchFiles();
      toast({ title: "Error", description: "Failed to save file", variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (fileId: string) => {
    // The prompt says what actually happens now, because what happens has
    // changed: this is no longer the end of the report.
    if (!confirm(`Delete this report? It comes off the website immediately and stays recoverable here for ${RECOVERY_DAYS} days.`)) return;

    const previousFiles = files;
    const stamp = new Date().toISOString();
    setFiles(prev => prev.map(f => (f.id === fileId ? { ...f, deleted_at: stamp } : f)));

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const { data, error } = await supabase.functions.invoke('admin-files', {
        body: { action: 'delete', file: { id: fileId } },
        headers: { Authorization: `Bearer ${session?.access_token}` },
      });

      if (error || data?.error) {
        setFiles(previousFiles);
        toast({ title: "Error", description: data?.error || "Failed to delete file", variant: "destructive" });
        return;
      }

      const target = previousFiles.find((f) => f.id === fileId);
      logActivity(session, access.primaryRole, { action: 'delete', section: 'Reports', subsection: 'Report archive', entityType: 'file', entityId: fileId, entityName: target?.title ?? null });
      toast({ title: 'Report deleted', description: `It is off the website and can be restored from Recently deleted for ${RECOVERY_DAYS} days.` });
      // Show the reader where it went, the first time.
      setShowDeleted(true);
    } catch (error) {
      console.error('Delete error:', error);
      setFiles(previousFiles);
      toast({ title: "Error", description: "Failed to delete file", variant: "destructive" });
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  };

  if (isLoading) {
    return <WorkspaceLoader />;
  }

  const handleDownloadAll = async () => {
    if (filteredFiles.length === 0) {
      toast({
        title: "No files to download",
        description: "There are no files matching the current filter.",
        variant: "destructive",
      });
      return;
    }

    setIsDownloadingAll(true);
    setDownloadAllProgress({ current: 0, total: filteredFiles.length });

    const filesToDownload = filteredFiles.map(file => ({
      url: file.file_url,
      filename: `${sanitizeFilename(file.title)}.pdf`,
    }));

    const { success, failed } = await downloadFilesSequentially(
      filesToDownload,
      (current, total) => setDownloadAllProgress({ current, total })
    );

    setIsDownloadingAll(false);

    if (failed === 0) {
      toast({
        title: "Download complete",
        description: `Successfully downloaded ${success} file${success !== 1 ? 's' : ''}.`,
      });
    } else {
      toast({
        title: "Download completed with errors",
        description: `Downloaded ${success} file${success !== 1 ? 's' : ''}, ${failed} failed.`,
        variant: "destructive",
      });
    }
  };

  return (
    <div id="files-section">
      {/* Header */}
      <WorkspacePageHeader
        title="Reports archive"
        description="Browse, search and download every published report. Filter by division, year, fund or free-text search."
        actions={<>

          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button 
                variant="outline" 
                className="font-body"
                disabled={isDownloadingAll || filteredFiles.length === 0}
              >
                {isDownloadingAll ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    {downloadAllProgress.current}/{downloadAllProgress.total}
                  </>
                ) : (
                  <>
                    <FolderDown className="h-4 w-4 mr-2" />
                    Download All
                  </>
                )}
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Download All Files</AlertDialogTitle>
                <AlertDialogDescription>
                  This will download {filteredFiles.length} PDF file{filteredFiles.length !== 1 ? 's' : ''} to your device. This may take a moment.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={handleDownloadAll}>Download</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
          {/* Report creation now lives in Reports → Upload. This dialog is
              kept for editing existing reports only. */}
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="font-serif">
                {editingFile ? 'Edit File' : 'Add New File'}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="title" className="font-body">Title *</Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="Report title"
                  required
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="date" className="font-body">Date *</Label>
                <Input
                  id="date"
                  type="date"
                  value={formData.date}
                  onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="division" className="font-body">Division *</Label>
                <Select
                  value={formData.division}
                  onValueChange={(value: Division) => setFormData({ ...formData, division: value, fund: '' })}
                  disabled={allowedDivisions?.length === 1}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select division" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableDivisions.map(([key, label]) => (
                      <SelectItem key={key} value={key}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {formData.division === 'portfolio' && (
                <div className="space-y-2">
                  <Label htmlFor="fund" className="font-body">Fund *</Label>
                  <Select
                    value={formData.fund}
                    onValueChange={(value: Fund) => setFormData({ ...formData, fund: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select fund" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__active_label__" disabled className="font-semibold text-muted-foreground">
                        Active Funds
                      </SelectItem>
                      {activeFunds.map((fund) => (
                        <SelectItem key={fund} value={fund}>
                          {fundLabels[fund]}
                        </SelectItem>
                      ))}
                      <SelectItem value="__closed_label__" disabled className="font-semibold text-muted-foreground mt-2">
                        Closed Funds
                      </SelectItem>
                      {closedFunds.map((fund) => (
                        <SelectItem key={fund} value={fund}>
                          {fundLabels[fund]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="file" className="font-body">PDF File *</Label>
                <div className="space-y-2">
                  <Input
                    id="file"
                    type="file"
                    accept=".pdf"
                    onChange={handleFileUpload}
                    disabled={isUploading}
                  />
                  {isUploading && (
                    <div className="space-y-1">
                      <Progress value={uploadProgress} className="h-2" />
                      <p className="text-sm text-muted-foreground">Uploading... {uploadProgress}%</p>
                    </div>
                  )}
                  {formData.file_url && !isUploading && (
                    <p className="text-sm text-muted-foreground truncate">
                      <FileText className="inline h-4 w-4 mr-1" />
                      File uploaded
                    </p>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description" className="font-body">Description (optional)</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Brief description of the report"
                  rows={3}
                />
              </div>

              <div className="flex gap-4 pt-4">
                <Button type="submit" className="flex-1 font-body" disabled={isUploading || isSubmitting}>
                  {isSubmitting ? 'Saving...' : (editingFile ? 'Update File' : 'Create File')}
                </Button>
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setIsDialogOpen(false)}
                  className="font-body"
                >
                  Cancel
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
        </>}
      />



      {/* Filters follow the standard filter format: flat corners, body font,
          no labels above the fields. */}
      <div className="mb-8 pb-6 border-b border-separator">
        <div className="flex flex-col sm:flex-row gap-3">
          {/* Search */}
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search by title or description"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="font-body w-full pl-10 pr-3 h-10 border border-separator bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-accent transition-colors"
            />
          </div>

          {/* Division filter */}
          <select
            value={divisionFilter}
            onChange={(e) => {
              const next = e.target.value as Division | 'all';
              setDivisionFilter(next);
              if (next !== 'portfolio') setFundFilter('all');
            }}
            className="font-body bg-background border border-separator px-3 h-10 min-w-[200px]"
          >
            {!allowedDivisions && <option value="all">All Divisions</option>}
            {allowedDivisions && allowedDivisions.length > 1 && <option value="all">All Divisions</option>}
            {availableDivisions.map(([key, label]) => (
              <option key={key} value={key}>{label}</option>
            ))}
          </select>

          {/* Fund filter — only meaningful for Portfolio Management */}
          {divisionFilter === 'portfolio' && (
            <select
              value={fundFilter}
              onChange={(e) => setFundFilter(e.target.value as Fund | 'all')}
              className="font-body bg-background border border-separator px-3 h-10 min-w-[280px]"
            >
              <option value="all">All Funds</option>
              <optgroup label="Active Funds">
                {activeFunds.map((fund) => (
                  <option key={fund} value={fund}>{fundLabels[fund]}</option>
                ))}
              </optgroup>
              <optgroup label="Closed Funds">
                {closedFunds.map((fund) => (
                  <option key={fund} value={fund}>{fundLabels[fund]}</option>
                ))}
              </optgroup>
            </select>
          )}

          {/* Year filter */}
          <select
            value={yearFilter}
            onChange={(e) => setYearFilter(e.target.value === 'all' ? 'all' : parseInt(e.target.value))}
            className="font-body bg-background border border-separator px-3 h-10 min-w-[120px]"
          >
            <option value="all">All Years</option>
            {fileYears.map((year) => (
              <option key={year} value={year}>{year}</option>
            ))}
          </select>

          {/* Status filter, in the same standard filter format as the rest.
              "Which of ours are still drafts" and "what have we withdrawn"
              are questions the archive should be able to answer directly. */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as 'all' | 'draft' | 'published' | 'blocked')}
            aria-label="Filter by publication status"
            className="font-body bg-background border border-separator px-3 h-10 min-w-[190px]"
          >
            <option value="all">All statuses</option>
            <option value="published">Published (public)</option>
            <option value="draft">Draft (not public)</option>
            <option value="blocked">Blocked (not public)</option>
          </select>
        </div>
      </div>

      {/* Results count */}
      <p className="font-body text-small text-muted-foreground mb-6">
        Showing {paginatedFiles.length} of {filteredFiles.length} {filteredFiles.length === 1 ? 'report' : 'reports'}
        {totalPages > 1 && ` (page ${currentPage} of ${totalPages})`}
      </p>

      {/* Files List - matching Archive page UI */}
      {files.length === 0 ? (
        <div className="py-12 text-center border border-separator">
          <p className="font-body text-muted-foreground">
            No archive files yet. Click "Add File" to upload one.
          </p>
        </div>
      ) : filteredFiles.length === 0 ? (
        <div className="py-12 text-center border border-separator">
          <p className="font-body text-muted-foreground">
            No files match your filters.
          </p>
        </div>
      ) : (
        <>
          {/* Phones show two compact report cards per row; from md up the
              established single-column reading layout is unchanged. */}
          <div className="grid grid-cols-2 gap-x-4 gap-y-6 md:grid-cols-1 md:gap-0 md:space-y-0">
            {paginatedFiles.map((file, index) => (
              <article key={file.id} className={`md:py-6 ${index !== paginatedFiles.length - 1 ? 'md:border-b md:border-separator' : ''}`}>
                <div className="flex flex-col md:flex-row md:items-start gap-2 md:gap-4">
                  {/* PDF Preview Thumbnail - A4 aspect ratio */}
                  <div className="flex-shrink-0">
                    <PdfThumbnail
                      url={file.file_url}
                      className="w-full md:w-28 bg-background rounded border border-separator"
                      alt={`Preview of ${file.title}`}
                    />
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <time className="font-body text-[0.65rem] md:text-xs text-muted-foreground uppercase tracking-wider block leading-tight">
                      {formatDate(file.date)}
                      <span className="block md:inline md:ml-4 text-primary">
                        {divisionLabels[file.division as Division]}
                      </span>
                      {file.fund && (
                        <span className="block md:inline md:ml-4 text-primary/70">
                          {fundLabels[file.fund as Fund]}
                        </span>
                      )}
                    </time>
                    <h3 className="font-serif text-base leading-snug md:text-subheading mt-1.5 md:mt-2 mb-1.5 md:mb-2">
                      {file.title}
                      {/* The badge says what the state MEANS for the public
                          website, which is the only thing anyone reading this
                          list wants to know from it. "draft" and "blocked"
                          named the state without saying its consequence. */}
                      {file.status && file.status !== 'published' && (
                        <span
                          title={file.status === 'blocked'
                            ? 'Withdrawn after publication. It stays in this archive and is not shown anywhere on the public website.'
                            : 'Not yet published. It stays in this archive and is not shown anywhere on the public website.'}
                          className={`ml-3 align-middle text-xs uppercase tracking-wider font-body px-2 py-0.5 border ${file.status === 'blocked' ? 'text-destructive border-destructive/40' : 'text-amber-700 border-amber-700/40'}`}
                        >
                          {file.status === 'blocked' ? 'Blocked · not public' : 'Draft · not public'}
                        </span>
                      )}
                    </h3>
                    {file.description && (
                      <div>
                        <p className={`font-body text-sm md:text-body text-muted-foreground ${expandedDescriptions.has(file.id) ? '' : 'line-clamp-2'}`}>
                          {file.description}
                        </p>
                        {file.description.length > 150 && (
                          <button
                            onClick={() => toggleDescription(file.id)}
                            className="inline-flex items-center gap-1 font-body text-xs md:text-small text-primary hover:underline mt-1"
                          >
                            {expandedDescriptions.has(file.id) ? (
                              <>
                                <ChevronUp className="h-3 w-3" />
                                Show less
                              </>
                            ) : (
                              <>
                                <ChevronDown className="h-3 w-3" />
                                Read more
                              </>
                            )}
                          </button>
                        )}
                      </div>
                    )}
                    <div className="mt-1.5 md:mt-3">
                      <button
                        onClick={() => handleDownload(file)}
                        disabled={downloadingFiles.has(file.id)}
                        className="inline-flex items-center gap-1.5 font-body text-xs md:text-small text-primary hover:underline disabled:opacity-50 disabled:cursor-wait"
                      >
                        {downloadingFiles.has(file.id) ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Download className="h-4 w-4" />
                        )}
                        <span>{downloadingFiles.has(file.id) ? 'Downloading...' : 'Download'}</span>
                      </button>
                    </div>
                  </div>

                  {/* Admin Actions */}
                  <div className="flex gap-2 mt-2 md:mt-6 flex-shrink-0 flex-wrap justify-start md:justify-end">
                    {file.status !== 'published' && file.status !== 'blocked' && (
                      <Button variant="outline" size="sm" className="font-body" onClick={() => handleSetStatus(file.id, 'published')}>
                        Publish
                      </Button>
                    )}
                    {access.isFullAccess && file.status !== 'blocked' && (
                      <Button variant="outline" size="sm" className="font-body" onClick={() => handleSetStatus(file.id, 'blocked')}>
                        Block
                      </Button>
                    )}
                    {access.isFullAccess && file.status === 'blocked' && (
                      <Button variant="outline" size="sm" className="font-body" onClick={() => handleSetStatus(file.id, 'published')}>
                        Unblock
                      </Button>
                    )}
                    {/* A published report can be sent back to Draft as well as
                        blocked; without this the only way out of Published was
                        Block, which carries a different meaning. */}
                    {access.isFullAccess && file.status === 'published' && (
                      <Button variant="outline" size="sm" className="font-body" title="Unpublish and hold it as a draft" onClick={() => handleSetStatus(file.id, 'draft')}>
                        Unpublish
                      </Button>
                    )}
                    <Button
                      variant="outline"
                      size="icon"
                      title="Edit this report"
                      onClick={() => openEditDialog(file)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="destructive"
                      size="icon"
                      onClick={() => handleDelete(file.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </article>
            ))}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <nav className="flex justify-center mt-8" aria-label="Pagination">
              <ul className="flex items-center gap-1">
                <li>
                  <button
                    onClick={() => handlePageChange(currentPage - 1)}
                    disabled={currentPage === 1}
                    className="flex items-center gap-1 px-3 py-2 font-body text-sm hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed"
                    aria-label="Go to previous page"
                  >
                    <ChevronLeft className="h-4 w-4" />
                    Previous
                  </button>
                </li>
                {getPageNumbers().map((page, index) => (
                  <li key={index}>
                    {page === 'ellipsis' ? (
                      <span className="flex h-9 w-9 items-center justify-center" aria-hidden>
                        <MoreHorizontal className="h-4 w-4" />
                      </span>
                    ) : (
                      <button
                        onClick={() => handlePageChange(page)}
                        className={`h-9 w-9 font-body text-sm border rounded ${
                          currentPage === page
                            ? 'border-primary bg-primary text-primary-foreground'
                            : 'border-separator hover:bg-muted'
                        }`}
                        aria-current={currentPage === page ? 'page' : undefined}
                      >
                        {page}
                      </button>
                    )}
                  </li>
                ))}
                <li>
                  <button
                    onClick={() => handlePageChange(currentPage + 1)}
                    disabled={currentPage === totalPages}
                    className="flex items-center gap-1 px-3 py-2 font-body text-sm hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed"
                    aria-label="Go to next page"
                  >
                    Next
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </li>
              </ul>
            </nav>
          )}
        </>
      )}

      {/* =================================================================
          RECENTLY DELETED.
          -----------------------------------------------------------------
          Deliberately the same list, in the same place, in the same visual
          language - a disclosure at the foot of the archive rather than a
          separate administration screen somewhere else. A deleted report is
          still one of these reports; it is simply on its way out, and the
          only new things it needs to say are how long is left and how to
          bring it back.

          The row is folded away when there is nothing in it, so an archive
          with no deletions looks exactly as it did before.
          ================================================================= */}
      {deletedFiles.length > 0 && (
        <section className="mt-10 border-t border-separator pt-6" aria-labelledby="archive-deleted-heading">
          <button
            type="button"
            onClick={() => setShowDeleted((v) => !v)}
            className="flex w-full items-center justify-between gap-3 text-left"
            aria-expanded={showDeleted}
          >
            <span className="min-w-0">
              <span id="archive-deleted-heading" className="font-serif text-subheading text-accent block">
                Recently deleted ({deletedFiles.length})
              </span>
              <span className="font-body text-sm text-muted-foreground">
                Deleted reports are off the public website but kept here for {RECOVERY_DAYS} days, then removed permanently. Restoring one brings it back exactly as it was.
              </span>
            </span>
            {showDeleted
              ? <ChevronUp className="h-5 w-5 shrink-0 text-muted-foreground" />
              : <ChevronDown className="h-5 w-5 shrink-0 text-muted-foreground" />}
          </button>

          {showDeleted && (
            <ul className="mt-5 space-y-3">
              {deletedFiles.map((file) => {
                const left = daysLeft(file.deleted_at!);
                // The last few days are the ones worth noticing.
                const urgent = left <= 5;
                return (
                  <li key={file.id} className="flex flex-col gap-3 border border-separator px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="min-w-0">
                      <p className="font-serif text-base leading-snug text-foreground truncate">{file.title}</p>
                      <p className="font-body text-xs text-muted-foreground mt-0.5">
                        {divisionLabels[file.division as Division]} · {formatDate(file.date)}
                        {file.status && file.status !== 'published' && ` · was ${file.status}`}
                      </p>
                      <p className={`font-body text-xs mt-1 ${urgent ? 'text-destructive' : 'text-muted-foreground'}`}>
                        Deleted {formatDate(file.deleted_at!)} · {left === 1 ? '1 day left to restore it' : `${left} days left to restore it`}
                      </p>
                    </div>
                    <div className="flex shrink-0 gap-2">
                      <Button variant="outline" size="sm" className="font-body" onClick={() => handleRestore(file)}>
                        <RotateCcw className="h-4 w-4 mr-1.5" />Restore
                      </Button>
                      {/* Permanent removal is reserved for the roles that may
                          block a report, and the server checks it again. */}
                      {access.isFullAccess && (
                        <Button variant="destructive" size="sm" className="font-body" onClick={() => handlePurge(file)}>
                          Delete permanently
                        </Button>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      )}
    </div>
  );
};

export default FileManagement;
