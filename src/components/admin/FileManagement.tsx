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
import { supabase } from '@/integrations/supabase/client';
import { Edit, Trash2, FileText, Search, Download, ChevronDown, ChevronUp, ChevronLeft, ChevronRight, MoreHorizontal, Loader2, FolderDown } from 'lucide-react';
import { divisionLabels, fundLabels, activeFunds, closedFunds, Division, Fund } from '@/lib/types';
import { PdfThumbnail } from '@/components/shared/PdfThumbnail';
import { downloadFilesSequentially, sanitizeFilename } from '@/lib/download-utils';
import { WorkspacePageHeader } from '@/components/admin/WorkspacePageHeader';
import { useAuth } from '@/contexts/AuthContext';
import { useAccess } from '@/hooks/useAccess';
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
  created_at: string;
  updated_at: string;
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
  const [yearFilter, setYearFilter] = useState<number | 'all'>('all');
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

  const handleSetStatus = async (fileId: string, status: 'draft' | 'published' | 'blocked') => {
    try {
      const { data, error } = await supabase.functions.invoke('admin-files', {
        body: { action: 'set-status', file: { id: fileId, status } },
        headers: { Authorization: `Bearer ${session?.access_token}` },
      });
      if (error) throw error;
      if (data?.error) { toast({ title: 'Error', description: data.error, variant: 'destructive' }); return; }
      setFiles((prev) => prev.map((f) => (f.id === fileId ? { ...f, status } : f)));
      toast({ title: `Report ${status === 'published' ? 'published' : status === 'blocked' ? 'blocked' : 'set to draft'}` });
    } catch (e) {
      toast({ title: 'Could not update status', description: e instanceof Error ? e.message : undefined, variant: 'destructive' });
    }
  };

  useEffect(() => {
    fetchFiles();
  }, []);

  const fetchFiles = async () => {
    try {
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

  const filteredFiles = useMemo(() => {
    return files.filter(file => {
      // Allowed divisions filter (for restricted users)
      if (allowedDivisions && !allowedDivisions.includes(file.division as Division)) return false;
      // Division filter
      if (divisionFilter !== 'all' && file.division !== divisionFilter) return false;
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
  }, [files, divisionFilter, yearFilter, searchQuery, allowedDivisions]);

  const fileYears = useMemo(() => {
    let relevantFiles = files;
    if (allowedDivisions) {
      relevantFiles = files.filter(f => allowedDivisions.includes(f.division as Division));
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
  }, [divisionFilter, yearFilter, searchQuery]);

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
      const response = await fetch(file.file_url);
      if (!response.ok) throw new Error('Download failed');
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      // Clean filename: keep letters, numbers, spaces, hyphens, underscores
      const cleanTitle = file.title
        .replace(/[^a-zA-Z0-9\s\-_]/g, '')
        .replace(/\s+/g, ' ')
        .trim();
      link.download = `${cleanTitle || 'document'}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      
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
    if (!confirm('Are you sure you want to delete this file?')) return;

    const previousFiles = files;
    setFiles(prev => prev.filter(f => f.id !== fileId));

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

      toast({ title: "Success", description: "File deleted successfully" });
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
    return <p className="font-body text-muted-foreground">Loading files...</p>;
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



      {/* Filters - matching Archive page UI */}
      <div className="mb-8 pb-6 border-b border-separator">
        <div className="flex flex-col sm:flex-row gap-4">
          {/* Division filter */}
          <div>
            <label className="font-body text-xs text-muted-foreground uppercase tracking-wider block mb-2">
              Division
            </label>
            <select
              value={divisionFilter}
              onChange={(e) => setDivisionFilter(e.target.value as Division | 'all')}
              className="bg-background border border-separator px-3 h-10 min-w-[200px]"
              style={{ fontFamily: '"Times New Roman", Times, serif' }}
            >
              {!allowedDivisions && <option value="all">All Divisions</option>}
              {allowedDivisions && allowedDivisions.length > 1 && <option value="all">All Divisions</option>}
              {availableDivisions.map(([key, label]) => (
                <option key={key} value={key}>{label}</option>
              ))}
            </select>
          </div>

          {/* Year filter */}
          <div>
            <label className="font-body text-xs text-muted-foreground uppercase tracking-wider block mb-2">
              Year
            </label>
            <select
              value={yearFilter}
              onChange={(e) => setYearFilter(e.target.value === 'all' ? 'all' : parseInt(e.target.value))}
              className="bg-background border border-separator px-3 h-10 min-w-[120px]"
              style={{ fontFamily: '"Times New Roman", Times, serif' }}
            >
              <option value="all">All Years</option>
              {fileYears.map((year) => (
                <option key={year} value={year}>{year}</option>
              ))}
            </select>
          </div>

          {/* Search */}
          <div className="flex-1">
            <label className="font-body text-xs text-muted-foreground uppercase tracking-wider block mb-2">
              Search
            </label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search by title or description..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-3 h-10 border border-separator bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-accent transition-colors"
                style={{ fontFamily: '"Times New Roman", Times, serif' }}
              />
            </div>
          </div>
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
          <div className="space-y-0">
            {paginatedFiles.map((file, index) => (
              <article key={file.id} className={`py-6 ${index !== paginatedFiles.length - 1 ? 'border-b border-separator' : ''}`}>
                <div className="flex flex-col md:flex-row md:items-start gap-4">
                  {/* PDF Preview Thumbnail - A4 aspect ratio */}
                  <div className="flex-shrink-0">
                    <PdfThumbnail
                      url={file.file_url}
                      className="w-28 bg-background rounded border border-separator"
                      alt={`Preview of ${file.title}`}
                    />
                  </div>

                  {/* Content */}
                  <div className="flex-1">
                    <time className="font-body text-xs text-muted-foreground uppercase tracking-wider">
                      {formatDate(file.date)}
                      <span className="ml-4 text-primary">
                        {divisionLabels[file.division as Division]}
                      </span>
                      {file.fund && (
                        <span className="ml-4 text-primary/70">
                          {fundLabels[file.fund as Fund]}
                        </span>
                      )}
                    </time>
                    <h3 className="font-serif text-subheading mt-2 mb-2">
                      {file.title}
                      {file.status && file.status !== 'published' && (
                        <span className={`ml-3 align-middle text-xs uppercase tracking-wider font-body px-2 py-0.5 border ${file.status === 'blocked' ? 'text-destructive border-destructive/40' : 'text-amber-700 border-amber-700/40'}`}>
                          {file.status}
                        </span>
                      )}
                    </h3>
                    {file.description && (
                      <div>
                        <p className={`font-body text-body text-muted-foreground ${expandedDescriptions.has(file.id) ? '' : 'line-clamp-2'}`}>
                          {file.description}
                        </p>
                        {file.description.length > 150 && (
                          <button
                            onClick={() => toggleDescription(file.id)}
                            className="inline-flex items-center gap-1 font-body text-small text-primary hover:underline mt-1"
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
                    <div className="mt-3">
                      <button
                        onClick={() => handleDownload(file)}
                        disabled={downloadingFiles.has(file.id)}
                        className="inline-flex items-center gap-1.5 font-body text-small text-primary hover:underline disabled:opacity-50 disabled:cursor-wait"
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
                  <div className="flex gap-2 mt-2 md:mt-6 flex-shrink-0 flex-wrap justify-end">
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
                    <Button
                      variant="outline"
                      size="icon"
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
    </div>
  );
};

export default FileManagement;
