import { useState, useEffect, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useAccess } from '@/hooks/useAccess';
import { logActivity } from '@/lib/activity-log';
import { Edit, Trash2, Search, Loader2, Download } from 'lucide-react';
import linkedinIcon from '@/assets/linkedin-icon.png';
import { Progress } from '@/components/ui/progress';
import { downloadCSV } from '@/lib/download-utils';
import { WorkspacePageHeader } from '@/components/admin/WorkspacePageHeader';
import { WorkspaceLoader } from '@/components/admin/WorkspaceLoader';
import { ColumnFilter } from '@/components/admin/ColumnFilter';
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";

const ALUMNI_PER_PAGE = 25;

interface AlumniRecord {
  id: string;
  name: string;
  surname: string;
  graduation_year: number;
  company: string | null;
  city: string | null;
  linkedin_url: string | null;
  job_area: string | null;
  created_at: string;
  updated_at: string;
}

// =====================================================================
// People > Alumni — the complete alumni directory, aligned with the
// People > Members register: one search bar above the table, column
// filters inside the header row, seniority-free flat listing ordered by
// graduation year. The CSV export is reserved for President and Admin.
// =====================================================================
export default function AlumniManagement() {
  const { session } = useAuth();
  const access = useAccess();
  const { primaryRole } = access;
  const canManage = access.canManage('people-alumni');
  // The full-directory export is reserved for the President and the
  // association (admin) account.
  const canDownloadCsv = access.isFullAccess;

  const [alumni, setAlumni] = useState<AlumniRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingAlumni, setEditingAlumni] = useState<AlumniRecord | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [yearFilter, setYearFilter] = useState<string[]>([]);
  const [jobAreaFilter, setJobAreaFilter] = useState<string[]>([]);
  const [companyFilter, setCompanyFilter] = useState<string[]>([]);
  const [cityFilter, setCityFilter] = useState<string[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [formData, setFormData] = useState({
    name: '',
    surname: '',
    graduation_year: new Date().getFullYear(),
    company: '',
    city: '',
    linkedin_url: '',
    job_area: '',
  });
  const { toast } = useToast();

  useEffect(() => {
    fetchAlumni();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchAlumni = async () => {
    try {
      const { data, error } = await supabase
        .from('alumni')
        .select('*')
        .order('graduation_year', { ascending: false })
        .order('surname', { ascending: true });

      if (error) throw error;
      setAlumni(data || []);
    } catch (error) {
      console.error('Error fetching alumni:', error);
      toast({ title: "Error", description: "Failed to fetch alumni", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      name: '', surname: '', graduation_year: new Date().getFullYear(),
      company: '', city: '', linkedin_url: '', job_area: '',
    });
    setEditingAlumni(null);
  };

  const openCreateDialog = () => { resetForm(); setIsDialogOpen(true); };

  const openEditDialog = (record: AlumniRecord) => {
    setEditingAlumni(record);
    setFormData({
      name: record.name,
      surname: record.surname,
      graduation_year: record.graduation_year,
      company: record.company || '',
      city: record.city || '',
      linkedin_url: record.linkedin_url || '',
      job_area: record.job_area || '',
    });
    setIsDialogOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;

    if (!formData.name.trim() || !formData.surname.trim()) {
      toast({ title: "Error", description: "Name and surname are required", variant: "destructive" });
      return;
    }

    setIsSubmitting(true);
    const action = editingAlumni ? 'update' : 'create';

    const alumniData = {
      name: formData.name.trim(),
      surname: formData.surname.trim(),
      graduation_year: formData.graduation_year,
      company: formData.company.trim() || null,
      city: formData.city.trim() || null,
      linkedin_url: formData.linkedin_url.trim() || null,
      job_area: formData.job_area.trim() || null,
      ...(editingAlumni && { id: editingAlumni.id }),
    };

    setIsDialogOpen(false);
    resetForm();

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const { data, error } = await supabase.functions.invoke('admin-alumni', {
        body: { action, alumni: alumniData },
        headers: { Authorization: `Bearer ${session?.access_token}` },
      });

      if (error || data?.error) {
        fetchAlumni();
        toast({ title: "Error", description: data?.error || "Failed to save alumni", variant: "destructive" });
        return;
      }

      toast({ title: "Success", description: `Alumni ${editingAlumni ? 'updated' : 'created'} successfully` });
      logActivity(session, primaryRole, { action: editingAlumni ? 'update' : 'create', section: 'People', subsection: 'Alumni', entityType: 'alumnus', entityName: `${alumniData.name} ${alumniData.surname}` });
      fetchAlumni();
    } catch (error) {
      console.error('Submit error:', error);
      fetchAlumni();
      toast({ title: "Error", description: "Failed to save alumni", variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (alumniId: string) => {
    if (!confirm('Are you sure you want to delete this alumni?')) return;

    const previousAlumni = alumni;
    setAlumni(prev => prev.filter(a => a.id !== alumniId));

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const { data, error } = await supabase.functions.invoke('admin-alumni', {
        body: { action: 'delete', alumni: { id: alumniId } },
        headers: { Authorization: `Bearer ${session?.access_token}` },
      });

      if (error || data?.error) {
        setAlumni(previousAlumni);
        toast({ title: "Error", description: data?.error || "Failed to delete alumni", variant: "destructive" });
        return;
      }

      toast({ title: "Success", description: "Alumni deleted successfully" });
      const rec = previousAlumni.find((a) => a.id === alumniId);
      logActivity(session, primaryRole, { action: 'delete', section: 'People', subsection: 'Alumni', entityType: 'alumnus', entityId: alumniId, entityName: rec ? `${rec.name} ${rec.surname}` : null });
    } catch (error) {
      console.error('Delete error:', error);
      setAlumni(previousAlumni);
      toast({ title: "Error", description: "Failed to delete alumni", variant: "destructive" });
    }
  };

  // Column filter options are built over the whole directory.
  const yearOptions = useMemo(() =>
    [...new Set(alumni.map((a) => a.graduation_year))].sort((a, b) => b - a)
      .map((y) => ({ value: String(y), label: `Class of ${y}` })), [alumni]);
  const jobAreaOptions = useMemo(() =>
    [...new Set(alumni.map((a) => a.job_area).filter(Boolean))].sort()
      .map((v) => ({ value: v as string, label: v as string })), [alumni]);
  const companyOptions = useMemo(() =>
    [...new Set(alumni.map((a) => a.company).filter(Boolean))].sort()
      .map((v) => ({ value: v as string, label: v as string })), [alumni]);
  const cityOptions = useMemo(() =>
    [...new Set(alumni.map((a) => a.city).filter(Boolean))].sort()
      .map((v) => ({ value: v as string, label: v as string })), [alumni]);

  const filteredAlumni = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return alumni
      .filter((a) => yearFilter.length === 0 || yearFilter.includes(String(a.graduation_year)))
      .filter((a) => jobAreaFilter.length === 0 || (a.job_area ? jobAreaFilter.includes(a.job_area) : false))
      .filter((a) => companyFilter.length === 0 || (a.company ? companyFilter.includes(a.company) : false))
      .filter((a) => cityFilter.length === 0 || (a.city ? cityFilter.includes(a.city) : false))
      .filter((a) => !q ||
        `${a.name} ${a.surname}`.toLowerCase().includes(q) ||
        (a.company?.toLowerCase().includes(q) ?? false) ||
        (a.city?.toLowerCase().includes(q) ?? false) ||
        (a.job_area?.toLowerCase().includes(q) ?? false));
  }, [alumni, searchQuery, yearFilter, jobAreaFilter, companyFilter, cityFilter]);

  // Pagination
  const totalPages = Math.ceil(filteredAlumni.length / ALUMNI_PER_PAGE);
  const paginatedAlumni = useMemo(() => {
    const startIndex = (currentPage - 1) * ALUMNI_PER_PAGE;
    return filteredAlumni.slice(startIndex, startIndex + ALUMNI_PER_PAGE);
  }, [filteredAlumni, currentPage]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, yearFilter, jobAreaFilter, companyFilter, cityFilter]);

  const handleDownloadCSV = () => {
    const columns: { key: keyof AlumniRecord; header: string }[] = [
      { key: 'surname', header: 'Last Name' },
      { key: 'name', header: 'First Name' },
      { key: 'graduation_year', header: 'Graduation Year' },
      { key: 'company', header: 'Company' },
      { key: 'job_area', header: 'Job Area' },
      { key: 'city', header: 'City' },
      { key: 'linkedin_url', header: 'LinkedIn URL' },
    ];
    downloadCSV(alumni, columns, 'alumni.csv');
    toast({ title: "Download started", description: "Alumni CSV is being downloaded." });
  };

  return (
    <div id="alumni-section">
      <WorkspacePageHeader
        title="Alumni"
        description="The complete alumni directory: every former member, with graduation year, current company, job area and city. The public website shows only the first 100 entries; this register always holds them all."
        actions={<>
          {canDownloadCsv && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="outline" className="font-body" disabled={alumni.length === 0}>
                  <Download className="h-4 w-4 mr-2" />
                  Download CSV
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Download Alumni CSV</AlertDialogTitle>
                  <AlertDialogDescription>
                    This will download a CSV file containing {alumni.length} alumni record{alumni.length !== 1 ? 's' : ''}.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={handleDownloadCSV}>Download</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
          {canManage && (
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button onClick={openCreateDialog} className="font-body">
                  + Add Alumnus
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-lg">
                <DialogHeader>
                  <DialogTitle className="font-serif">
                    {editingAlumni ? 'Edit Alumni' : 'Add New Alumni'}
                  </DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="name" className="font-body">First Name *</Label>
                      <Input id="name" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} placeholder="First name" required />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="surname" className="font-body">Last Name *</Label>
                      <Input id="surname" value={formData.surname} onChange={(e) => setFormData({ ...formData, surname: e.target.value })} placeholder="Last name" required />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="graduation_year" className="font-body">Graduation Year *</Label>
                    <Input id="graduation_year" type="number" value={formData.graduation_year}
                      onChange={(e) => setFormData({ ...formData, graduation_year: parseInt(e.target.value) })}
                      min={1990} max={new Date().getFullYear() + 5} required />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="company" className="font-body">Company</Label>
                    <Input id="company" value={formData.company} onChange={(e) => setFormData({ ...formData, company: e.target.value })} placeholder="Current company" />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="job_area" className="font-body">Job Area</Label>
                    <Input id="job_area" value={formData.job_area} onChange={(e) => setFormData({ ...formData, job_area: e.target.value })} placeholder="e.g. Investment Banking, Markets, Private Equity..." />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="city" className="font-body">City</Label>
                    <Input id="city" value={formData.city} onChange={(e) => setFormData({ ...formData, city: e.target.value })} placeholder="e.g. Milan, Italy" />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="linkedin" className="font-body">LinkedIn URL</Label>
                    <Input id="linkedin" value={formData.linkedin_url} onChange={(e) => setFormData({ ...formData, linkedin_url: e.target.value })} placeholder="https://linkedin.com/in/..." />
                  </div>

                  {isSubmitting && (
                    <div className="space-y-2">
                      <Progress value={100} className="h-1 animate-pulse" />
                      <p className="text-xs text-muted-foreground text-center font-body">Saving alumni...</p>
                    </div>
                  )}

                  <div className="flex gap-4 pt-4">
                    <Button type="submit" className="flex-1 font-body" disabled={isSubmitting}>
                      {isSubmitting ? (<><Loader2 className="h-4 w-4 mr-2 animate-spin" />Saving...</>) : (editingAlumni ? 'Update Alumni' : 'Add Alumni')}
                    </Button>
                    <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)} className="font-body">
                      Cancel
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          )}
        </>}
      />

      {/* Search bar above the table; column filters live in the header row
          (the same pattern as People > Members). */}
      <div className="mb-4 max-w-md">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input className="pl-10 font-body" placeholder="Search by name, company, city or job area" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
        </div>
      </div>

      <p className="font-body text-small text-muted-foreground mb-4">
        Showing {paginatedAlumni.length} of {filteredAlumni.length} alumni
        {filteredAlumni.length !== alumni.length && ` (${alumni.length} total)`}
      </p>

      {isLoading ? (
        <WorkspaceLoader />
      ) : alumni.length === 0 ? (
        <Card><CardContent className="py-12 text-center"><p className="font-body text-muted-foreground">No alumni yet.</p></CardContent></Card>
      ) : filteredAlumni.length === 0 ? (
        <Card><CardContent className="py-12 text-center"><p className="font-body text-muted-foreground">No alumni match the current filters.</p></CardContent></Card>
      ) : (
        <div className="border border-separator overflow-x-auto">
          <table className="w-full text-left font-body text-sm">
            <thead className="bg-muted/40 text-muted-foreground">
              <tr>
                <th className="px-3 py-2 font-normal">Name</th>
                <th className="px-3 py-2 font-normal"><ColumnFilter label="Class" options={yearOptions} selected={yearFilter} onChange={setYearFilter} /></th>
                <th className="px-3 py-2 font-normal text-center">In</th>
                <th className="px-3 py-2 font-normal"><ColumnFilter label="Job Area" options={jobAreaOptions} selected={jobAreaFilter} onChange={setJobAreaFilter} /></th>
                <th className="px-3 py-2 font-normal"><ColumnFilter label="Company" options={companyOptions} selected={companyFilter} onChange={setCompanyFilter} /></th>
                <th className="px-3 py-2 font-normal"><ColumnFilter label="City" options={cityOptions} selected={cityFilter} onChange={setCityFilter} /></th>
                {canManage && <th className="px-3 py-2 font-normal text-right">Actions</th>}
              </tr>
            </thead>
            <tbody>
              {paginatedAlumni.map((record) => (
                <tr key={record.id} className="border-t border-separator">
                  <td className="px-3 py-2 text-foreground whitespace-nowrap">{record.surname} {record.name}</td>
                  <td className="px-3 py-2 whitespace-nowrap">{record.graduation_year}</td>
                  <td className="px-3 py-2 text-center">
                    {record.linkedin_url ? (
                      <a href={record.linkedin_url} target="_blank" rel="noopener noreferrer" title="Open LinkedIn profile" className="inline-flex">
                        <img src={linkedinIcon} alt="LinkedIn" className="h-4 w-4 opacity-80" />
                      </a>
                    ) : <span className="text-muted-foreground">-</span>}
                  </td>
                  <td className="px-3 py-2">{record.job_area || '-'}</td>
                  <td className="px-3 py-2">{record.company || '-'}</td>
                  <td className="px-3 py-2">{record.city || '-'}</td>
                  {canManage && (
                    <td className="px-3 py-2">
                      <div className="flex gap-2 justify-end">
                        <Button variant="outline" size="icon" onClick={() => openEditDialog(record)}><Edit className="h-4 w-4" /></Button>
                        <Button variant="destructive" size="icon" onClick={() => handleDelete(record.id)}><Trash2 className="h-4 w-4" /></Button>
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <Pagination className="mt-8">
          <PaginationContent>
            <PaginationItem>
              <PaginationPrevious
                onClick={() => currentPage > 1 && setCurrentPage(currentPage - 1)}
                className={currentPage === 1 ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
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
                      onClick={() => setCurrentPage(page)}
                      className="cursor-pointer"
                    >
                      {page}
                    </PaginationLink>
                  )}
                </PaginationItem>
              ));
            })()}

            <PaginationItem>
              <PaginationNext
                onClick={() => currentPage < totalPages && setCurrentPage(currentPage + 1)}
                className={currentPage === totalPages ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
              />
            </PaginationItem>
          </PaginationContent>
        </Pagination>
      )}
    </div>
  );
}
