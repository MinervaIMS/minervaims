import { useState, useEffect, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Plus, Edit, Trash2, Search, Loader2, Download } from 'lucide-react';
import linkedinIcon from '@/assets/linkedin-icon.png';
import { Progress } from '@/components/ui/progress';
import { downloadCSV } from '@/lib/download-utils';
import { WorkspacePageHeader } from '@/components/admin/WorkspacePageHeader';
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
  company: string;
  city: string | null;
  linkedin_url: string | null;
  job_area: string | null;
  created_at: string;
  updated_at: string;
}

export default function AlumniManagement() {
  const [alumni, setAlumni] = useState<AlumniRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingAlumni, setEditingAlumni] = useState<AlumniRecord | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
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

  // Handle page change with scroll to top
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

  useEffect(() => {
    fetchAlumni();
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
      toast({
        title: "Error",
        description: "Failed to fetch alumni",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      surname: '',
      graduation_year: new Date().getFullYear(),
      company: '',
      city: '',
      linkedin_url: '',
      job_area: '',
    });
    setEditingAlumni(null);
  };

  const openCreateDialog = () => {
    resetForm();
    setIsDialogOpen(true);
  };

  const openEditDialog = (record: AlumniRecord) => {
    setEditingAlumni(record);
    setFormData({
      name: record.name,
      surname: record.surname,
      graduation_year: record.graduation_year,
      company: record.company,
      city: record.city || '',
      linkedin_url: record.linkedin_url || '',
      job_area: record.job_area || '',
    });
    setIsDialogOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;

    if (!formData.name.trim() || !formData.surname.trim() || !formData.company.trim()) {
      toast({
        title: "Error",
        description: "Name, surname, and company are required",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);
    const action = editingAlumni ? 'update' : 'create';
    
    const alumniData = {
      name: formData.name.trim(),
      surname: formData.surname.trim(),
      graduation_year: formData.graduation_year,
      company: formData.company.trim(),
      city: formData.city.trim() || null,
      linkedin_url: formData.linkedin_url.trim() || null,
      job_area: formData.job_area.trim() || null,
      ...(editingAlumni && { id: editingAlumni.id }),
    };

    // Optimistic update
    const tempId = editingAlumni?.id || crypto.randomUUID();
    const optimisticRecord: AlumniRecord = {
      id: tempId,
      ...alumniData,
      city: alumniData.city,
      linkedin_url: alumniData.linkedin_url,
      job_area: alumniData.job_area,
      created_at: editingAlumni?.created_at || new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    if (editingAlumni) {
      setAlumni(prev => prev.map(a => a.id === editingAlumni.id ? optimisticRecord : a));
    } else {
      setAlumni(prev => [optimisticRecord, ...prev]);
    }
    
    setIsDialogOpen(false);
    resetForm();

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const { data, error } = await supabase.functions.invoke('admin-alumni', {
        body: { action, alumni: alumniData },
        headers: { Authorization: `Bearer ${session?.access_token}` },
      });

      if (error || data?.error) {
        // Revert optimistic update
        fetchAlumni();
        toast({
          title: "Error",
          description: data?.error || "Failed to save alumni",
          variant: "destructive",
        });
        return;
      }

      toast({ title: "Success", description: `Alumni ${editingAlumni ? 'updated' : 'created'} successfully` });
      // Refresh to get real data
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

    // Optimistic delete
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
    } catch (error) {
      console.error('Delete error:', error);
      setAlumni(previousAlumni);
      toast({ title: "Error", description: "Failed to delete alumni", variant: "destructive" });
    }
  };

  const filteredAlumni = useMemo(() => {
    if (!searchQuery.trim()) return alumni;
    const query = searchQuery.toLowerCase();
    return alumni.filter(a => (
      a.name.toLowerCase().includes(query) ||
      a.surname.toLowerCase().includes(query) ||
      a.company.toLowerCase().includes(query) ||
      a.city?.toLowerCase().includes(query)
    ));
  }, [alumni, searchQuery]);

  // Pagination
  const totalPages = Math.ceil(filteredAlumni.length / ALUMNI_PER_PAGE);
  const paginatedAlumni = useMemo(() => {
    const startIndex = (currentPage - 1) * ALUMNI_PER_PAGE;
    return filteredAlumni.slice(startIndex, startIndex + ALUMNI_PER_PAGE);
  }, [filteredAlumni, currentPage]);

  // Reset to page 1 when search changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery]);

  // Group paginated alumni by graduation year
  const groupedAlumni = useMemo(() => {
    return paginatedAlumni.reduce((acc, record) => {
      const year = record.graduation_year;
      if (!acc[year]) acc[year] = [];
      acc[year].push(record);
      return acc;
    }, {} as Record<number, AlumniRecord[]>);
  }, [paginatedAlumni]);

  const sortedYears = Object.keys(groupedAlumni).map(Number).sort((a, b) => b - a);

  if (isLoading) {
    return <p className="font-body text-muted-foreground">Loading alumni...</p>;
  }

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
        description="Maintain the alumni directory, current roles and career history."
        actions={<>

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
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="First name"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="surname" className="font-body">Last Name *</Label>
                  <Input
                    id="surname"
                    value={formData.surname}
                    onChange={(e) => setFormData({ ...formData, surname: e.target.value })}
                    placeholder="Last name"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="graduation_year" className="font-body">Graduation Year *</Label>
                <Input
                  id="graduation_year"
                  type="number"
                  value={formData.graduation_year}
                  onChange={(e) => setFormData({ ...formData, graduation_year: parseInt(e.target.value) })}
                  min={1990}
                  max={new Date().getFullYear() + 5}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="company" className="font-body">Company *</Label>
                <Input
                  id="company"
                  value={formData.company}
                  onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                  placeholder="Current company"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="job_area" className="font-body">Job Area</Label>
                <Input
                  id="job_area"
                  value={formData.job_area}
                  onChange={(e) => setFormData({ ...formData, job_area: e.target.value })}
                  placeholder="e.g. Investment Banking, Markets, Private Equity..."
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="city" className="font-body">City</Label>
                <Input
                  id="city"
                  value={formData.city}
                  onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                  placeholder="City"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="linkedin" className="font-body">LinkedIn URL</Label>
                <Input
                  id="linkedin"
                  value={formData.linkedin_url}
                  onChange={(e) => setFormData({ ...formData, linkedin_url: e.target.value })}
                  placeholder="https://linkedin.com/in/..."
                />
              </div>

              {isSubmitting && (
                <div className="space-y-2">
                  <Progress value={100} className="h-1 animate-pulse" />
                  <p className="text-xs text-muted-foreground text-center font-body">Saving alumni...</p>
                </div>
              )}

              <div className="flex gap-4 pt-4">
                <Button type="submit" className="flex-1 font-body" disabled={isSubmitting}>
                  {isSubmitting ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Saving...
                    </>
                  ) : (editingAlumni ? 'Update Alumni' : 'Add Alumni')}
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



      {/* Search */}
      <div className="mb-6">
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Search by name, company, or city..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
            style={{ fontFamily: '"Times New Roman", Times, serif' }}
          />
        </div>
      </div>

      {/* Results count */}
      <p className="font-body text-small text-muted-foreground mb-6">
        Showing {paginatedAlumni.length} of {filteredAlumni.length} alumni
        {filteredAlumni.length !== alumni.length && ` (${alumni.length} total)`}
      </p>

      {/* Alumni List grouped by year */}
      {alumni.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="font-body text-muted-foreground">
              No alumni yet. Click "Add Alumni" to create one.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-8">
          {sortedYears.map((year) => (
            <div key={year}>
              <h3 className="font-serif text-subheading text-accent mb-4 pb-2 border-b border-separator">
                Class of {year}
              </h3>
              <div className="divide-y divide-separator">
                {groupedAlumni[year].map((record) => (
                  <div key={record.id} className="py-4 flex items-center justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      {/* Desktop layout - matching Alumni page */}
                      <div className="hidden sm:flex items-center">
                        <span className="text-body font-medium w-[20%] truncate text-left" style={{ fontFamily: '"Times New Roman", Times, serif' }}>
                          {record.surname} {record.name}
                        </span>
                        <span className="w-[10%] flex justify-start">
                          {record.linkedin_url ? (
                            <a
                              href={record.linkedin_url}
                              target="_blank"
                              rel="noopener noreferrer"
                            >
                              <img src={linkedinIcon} alt="LinkedIn" className="w-5 h-5" />
                            </a>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </span>
                        <span className="font-body text-body text-muted-foreground w-[25%] truncate text-left">
                          {record.job_area || '—'}
                        </span>
                        <span className="font-body text-body text-muted-foreground w-[25%] truncate text-left">
                          {record.company}
                        </span>
                        <span className="font-body text-body text-muted-foreground w-[20%] truncate text-left">
                          {record.city || '—'}
                        </span>
                      </div>
                      {/* Mobile layout */}
                      <div className="sm:hidden">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-body font-medium" style={{ fontFamily: '"Times New Roman", Times, serif' }}>
                            {record.surname} {record.name}
                          </span>
                          {record.linkedin_url && (
                            <a
                              href={record.linkedin_url}
                              target="_blank"
                              rel="noopener noreferrer"
                            >
                              <img src={linkedinIcon} alt="LinkedIn" className="w-5 h-5" />
                            </a>
                          )}
                        </div>
                        <p className="font-body text-small text-muted-foreground">
                          {record.company}{record.city ? ` • ${record.city}` : ''}
                        </p>
                        {record.job_area && (
                          <p className="font-body text-xs text-muted-foreground/70">
                            {record.job_area}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-2 flex-shrink-0">
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => openEditDialog(record)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="destructive"
                        size="icon"
                        onClick={() => handleDelete(record.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}

          {/* Pagination */}
          {totalPages > 1 && (
            <Pagination className="mt-8">
              <PaginationContent>
                <PaginationItem>
                  <PaginationPrevious 
                    onClick={() => currentPage > 1 && handlePageChange(currentPage - 1)}
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
                          onClick={() => handlePageChange(page)}
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
                    onClick={() => currentPage < totalPages && handlePageChange(currentPage + 1)}
                    className={currentPage === totalPages ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                  />
                </PaginationItem>
              </PaginationContent>
            </Pagination>
          )}
        </div>
      )}
    </div>
  );
}
