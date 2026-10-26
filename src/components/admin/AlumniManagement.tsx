import { useState, useEffect, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { callFunction, friendlyError } from '@/lib/errors';
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
import { ClearFilters } from '@/components/shared/ClearFilters';
import { FilterSheet, type FilterGroup } from '@/components/admin/kit/Filters';
import { MoreMenu } from '@/components/admin/kit/MoreMenu';
import { useConfirm } from '@/components/admin/kit/ConfirmDialog';
import { Pinned, REGISTER_FIRST_COLUMN, REGISTER_HEAD, RegisterFrame, RegisterPage } from '@/components/admin/kit/Register';
import { CityInput } from '@/components/shared/CityInput';
import { normaliseCity } from '@/lib/city-format';
import { PendingAlumni } from '@/components/admin/PendingAlumni';
import { PersonRecordDialog, type PersonRecordTarget } from '@/components/admin/PersonRecord';
import { fetchPeopleOverview, type PeopleOverview } from '@/lib/rosters-api';
import { semesterLabel } from '@/lib/rosters';
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
// People > Alumni: the complete alumni directory, aligned with the
// People > Members register: one search bar above the table, column
// filters inside the header row, seniority-free flat listing ordered by
// graduation year. The CSV export is reserved for President and Admin.
// =====================================================================
export default function AlumniManagement() {
  const { session } = useAuth();
  const access = useAccess();
  const canManage = access.canManage('people-alumni');
  // The full-directory export is reserved for the President and the
  // association (admin) account.
  const canDownloadCsv = access.isFullAccess;
  // SINCE AND REPORTS (Step 94B): for the readers who see every division,
  // since when each alumnus was in Minerva and how many published reports
  // carry their name; the name opens their record (career in Minerva,
  // reports, this entry).
  const readsPeople = access.can('people-rosters');
  const [overview, setOverview] = useState<PeopleOverview | null>(null);
  const [personOf, setPersonOf] = useState<PersonRecordTarget | null>(null);
  useEffect(() => {
    if (!readsPeople) return;
    fetchPeopleOverview().then(setOverview).catch(() => setOverview(null));
  }, [readsPeople]);
  const seesRecords = overview?.visible === true;
  const overviewOf = (id: string) => (overview?.visible ? overview.alumni[id] : undefined);
  const sinceOf = (id: string) => { const since = overviewOf(id)?.since; return since ? semesterLabel(since) : ''; };
  const openRecord = (r: { id: string; name: string; surname: string }) => setPersonOf({ kind: 'alumni', id: r.id, name: `${r.name} ${r.surname}` });

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
      // Historic rows were typed by many hands ("milan", "Milano", "Milan").
      // Reading them through the formatter means the register, the column
      // filter and the export all show one spelling, with no edit required.
      setAlumni((data || []).map((row) => ({ ...row, city: normaliseCity(row.city) || null })));
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

  // A former member from "To complete": the same form, with their name in.
  const openCreateFor = (name: string, surname: string) => {
    resetForm();
    setFormData((f) => ({ ...f, name, surname }));
    setIsDialogOpen(true);
  };

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
      // Stored canonical ("Milan" becomes "Milan, Italy"), so the register,
      // the public directory and the city filter all agree on one spelling.
      city: normaliseCity(formData.city) || null,
      linkedin_url: formData.linkedin_url.trim() || null,
      job_area: formData.job_area.trim() || null,
      ...(editingAlumni && { id: editingAlumni.id }),
    };

    setIsDialogOpen(false);
    resetForm();

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const { data, error } = await callFunction('admin-alumni', { body: { action, alumni: alumniData }, session });

      if (error || data?.error) {
        fetchAlumni();
        toast({ title: "Error", description: friendlyError(error ?? data?.error, "Failed to save alumni"), variant: "destructive" });
        return;
      }

      toast({ title: "Success", description: `Alumni ${editingAlumni ? 'updated' : 'created'} successfully` });
      fetchAlumni();
    } catch (error) {
      console.error('Submit error:', error);
      fetchAlumni();
      toast({ title: "Error", description: "Failed to save alumni", variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Asked in the workspace's own window (Step 98), not the browser's.
  const { confirm: confirmAction, dialog: confirmDialog } = useConfirm();
  const handleDelete = async (alumniId: string) => {
    const who = alumni.find((a) => a.id === alumniId);
    const ok = await confirmAction({
      title: 'Delete this alumnus?',
      body: <p>{who ? `${who.name} ${who.surname} is` : 'The alumnus is'} deleted from the alumni directory. This cannot be undone.</p>,
      action: 'Delete alumnus',
    });
    if (!ok) return;

    const previousAlumni = alumni;
    setAlumni(prev => prev.filter(a => a.id !== alumniId));

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const { data, error } = await callFunction('admin-alumni', { body: { action: 'delete', alumni: { id: alumniId } }, session });

      if (error || data?.error) {
        setAlumni(previousAlumni);
        toast({ title: "Error", description: friendlyError(error ?? data?.error, "Failed to delete alumni"), variant: "destructive" });
        return;
      }

      toast({ title: "Success", description: "Alumni deleted successfully" });
      const rec = previousAlumni.find((a) => a.id === alumniId);
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


  // Every filter on this register, and the way back out of all of them.
  const activeFilterCount = (yearFilter.length > 0 ? 1 : 0) + (jobAreaFilter.length > 0 ? 1 : 0) + (companyFilter.length > 0 ? 1 : 0) + (cityFilter.length > 0 ? 1 : 0) + (searchQuery.trim() ? 1 : 0);
  const clearAllFilters = () => {
    setYearFilter([]);
    setJobAreaFilter([]);
    setCompanyFilter([]);
    setCityFilter([]);
    setSearchQuery('');
  };

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
    if (seesRecords) {
      const rows = alumni.map((a) => ({ ...a, since: sinceOf(a.id), reports: overviewOf(a.id)?.reports ?? 0 }));
      downloadCSV(rows, [...columns, { key: 'since', header: 'In Minerva since' }, { key: 'reports', header: 'Reports' }], 'alumni.csv');
    } else {
      downloadCSV(alumni, columns, 'alumni.csv');
    }
    toast({ title: "Download started", description: "Alumni CSV is being downloaded." });
  };

  // Turning a page should put the reader back at the head of the list. The
  // workspace scrolls inside its own panel on desktop and inside the mobile
  // shell's main element, so neither is the document: both are asked, and
  // the window is the fallback for anything else.
  const goToPage = (page: number) => {
    setCurrentPage(page);
    const surfaces = [
      document.getElementById('ws-content'),
      document.getElementById('mobile-ws-content'),
    ].filter(Boolean) as HTMLElement[];
    if (surfaces.length === 0) window.scrollTo({ top: 0, behavior: 'smooth' });
    surfaces.forEach((el) => el.scrollTo({ top: 0, behavior: 'smooth' }));
  };

  // An alumnus's actions: Edit on the row, Delete in More, last (Step 98).
  const alumnusActions = (record: (typeof alumni)[number]) => (
    <>
      <Button variant="outline" size="icon" className="h-11 w-11 lg:h-10 lg:w-10" onClick={() => openEditDialog(record)} aria-label={`Edit ${record.name} ${record.surname}`} title="Edit"><Edit className="h-4 w-4" /></Button>
      <MoreMenu
        label={`More actions for ${record.name} ${record.surname}`}
        title={`${record.name} ${record.surname}`}
        triggerClassName="lg:h-10 lg:w-10"
        actions={[{ key: 'delete', label: 'Delete alumnus', icon: Trash2, destructive: true, onSelect: () => handleDelete(record.id) }]}
      />
    </>
  );
  // The column funnels as a list, for the phone's Filters sheet (Step 98).
  const filterGroups: FilterGroup[] = [
    { key: 'class', label: 'Class', options: yearOptions, selected: yearFilter, onChange: setYearFilter },
    { key: 'area', label: 'Job Area', options: jobAreaOptions, selected: jobAreaFilter, onChange: setJobAreaFilter },
    { key: 'company', label: 'Company', options: companyOptions, selected: companyFilter, onChange: setCompanyFilter },
    { key: 'city', label: 'City', options: cityOptions, selected: cityFilter, onChange: setCityFilter },
  ];

  return (
    <RegisterPage>
    <div id="alumni-section">
      <Pinned>
      {confirmDialog}
      <WorkspacePageHeader
        title="Alumni"
        description="The full directory of former members."
        actionColumns="row"
        actions={<>
          {canDownloadCsv && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="outline" className="font-body h-11 lg:h-10" disabled={alumni.length === 0}>
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
                <Button variant="solid" onClick={openCreateDialog} className="font-body h-11 lg:h-10">
                  + Add Alumnus
                </Button>
              </DialogTrigger>
              <DialogContent className="ws-form-touch max-w-lg max-h-[92dvh] overflow-y-auto">
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
                    <CityInput id="city" value={formData.city} onChange={(city) => setFormData({ ...formData, city })} />
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

      <PendingAlumni onAdd={canManage ? openCreateFor : undefined} refreshKey={alumni.length} />
      <PersonRecordDialog target={personOf} onClose={() => setPersonOf(null)} />

      {/* Search bar above the table; column filters live in the header row
          (the same pattern as People > Members). */}
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-start">
        <div className="max-w-md flex-1">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input className="pl-10 font-body h-11 lg:h-10" placeholder="Search by name, company, city or job area" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
          </div>
          <ClearFilters count={activeFilterCount} onClear={clearAllFilters} size="sm" className="mt-3 max-lg:h-11" />
        </div>
        <FilterSheet groups={filterGroups} shown={filteredAlumni.length} noun={{ one: 'alumnus', many: 'alumni' }} onClearAll={clearAllFilters} />
      </div>

      <p className="font-body text-small text-muted-foreground mb-4">
        Showing {paginatedAlumni.length} of {filteredAlumni.length} alumni
        {filteredAlumni.length !== alumni.length && ` (${alumni.length} total)`}
      </p>
      </Pinned>

      {isLoading ? (
        <WorkspaceLoader />
      ) : alumni.length === 0 ? (
        <Pinned><Card><CardContent className="py-12 text-center"><p className="font-body text-muted-foreground">No alumni yet.</p></CardContent></Card></Pinned>
      ) : filteredAlumni.length === 0 ? (
        <Pinned><Card><CardContent className="py-12 text-center"><p className="font-body text-muted-foreground">No alumni match the current filters.</p></CardContent></Card></Pinned>
      ) : (
        <>
        {/* Phones: one card per alumnus. Seven columns cannot be read on a
            narrow screen, and letting the table set the width pushed the
            whole page sideways, so the register is stacked instead. The
            column filters are behind the Filters button on this width. Up to
            the desktop width, as every register does since Step 98. */}
        <div className="lg:hidden divide-y divide-separator border border-separator">
          {paginatedAlumni.map((record) => (
            <div key={record.id} className="px-4 py-3">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  {/* Name first, in the serif the public directory uses, so
                      the eye lands on the person; everything else is quiet
                      supporting detail underneath. */}
                  <div className="flex items-center justify-between gap-2 mb-1">
                    {seesRecords && overviewOf(record.id) ? (
                      <button type="button" data-ro onClick={() => openRecord(record)} className="min-h-11 text-left text-body-lg font-medium break-words underline-offset-4 hover:underline" style={{ fontFamily: '"Times New Roman", Times, serif' }}>
                        {record.surname} {record.name}
                      </button>
                    ) : (
                      <span className="text-body-lg font-medium break-words" style={{ fontFamily: '"Times New Roman", Times, serif' }}>
                        {record.surname} {record.name}
                      </span>
                    )}
                    {record.linkedin_url && (
                      <a href={record.linkedin_url} target="_blank" rel="noopener noreferrer" title="Open LinkedIn profile" className="shrink-0 inline-flex h-11 w-11 items-center justify-center">
                        <img src={linkedinIcon} alt="LinkedIn" width={23} height={23} className="w-[1.4375rem] h-[1.4375rem] shrink-0 object-contain" />
                      </a>
                    )}
                  </div>
                  <p className="font-body text-small text-muted-foreground">
                    {record.company || '-'}{record.city ? ` · ${record.city}` : ''}
                  </p>
                  {record.job_area && (
                    <p className="font-body text-xs text-muted-foreground/70 mt-0.5">{record.job_area}</p>
                  )}
                  <p className="font-body text-xs text-muted-foreground/70 mt-0.5">Class of {record.graduation_year}</p>
                  {seesRecords && (sinceOf(record.id) || overviewOf(record.id)?.reports) ? (
                    <p className="font-body text-xs text-muted-foreground/70 mt-0.5">
                      {[sinceOf(record.id) && `In Minerva from ${sinceOf(record.id)}`, overviewOf(record.id)?.reports ? `${overviewOf(record.id)!.reports} reports` : ''].filter(Boolean).join(' · ')}
                    </p>
                  ) : null}
                </div>
                {canManage && (
                  <div className="flex gap-2 shrink-0">
                    {alumnusActions(record)}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>

        <RegisterFrame>
          <table className="w-full text-left font-body text-sm">
            <thead className={REGISTER_HEAD}>
              <tr>
                <th className={`px-3 py-2 font-normal ${REGISTER_FIRST_COLUMN}`}>Name</th>
                <th className="px-3 py-2 font-normal"><ColumnFilter label="Class" options={yearOptions} selected={yearFilter} onChange={setYearFilter} /></th>
                {seesRecords && <th className="px-3 py-2 font-normal whitespace-nowrap" title="The first semester the Society's records show this person">Since</th>}
                {seesRecords && <th className="px-3 py-2 font-normal text-right" title="Published reports that carry this name">Reports</th>}
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
                  <td className={`px-3 py-2 text-foreground whitespace-nowrap ${REGISTER_FIRST_COLUMN}`}>
                    {seesRecords && overviewOf(record.id) ? (
                      <button type="button" data-ro className="text-left hover:text-accent underline-offset-4 hover:underline" onClick={() => openRecord(record)}
                        title="Open the person's record: career in Minerva and reports">
                        {record.surname} {record.name}
                      </button>
                    ) : <>{record.surname} {record.name}</>}
                  </td>
                  <td className="px-3 py-2 whitespace-nowrap">{record.graduation_year}</td>
                  {seesRecords && <td className="px-3 py-2 whitespace-nowrap text-muted-foreground">{sinceOf(record.id) || '-'}</td>}
                  {seesRecords && (
                    <td className="px-3 py-2 text-right tabular-nums">
                      {overviewOf(record.id)?.reports ? (
                        <button type="button" data-ro onClick={() => openRecord(record)}
                          className="rounded-sm underline decoration-dotted underline-offset-4 hover:text-accent hover:decoration-solid focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                          aria-label={`Reports by ${record.name} ${record.surname}: ${overviewOf(record.id)!.reports}. Show which.`}>
                          {overviewOf(record.id)!.reports}
                        </button>
                      ) : <span className="text-muted-foreground">0</span>}
                    </td>
                  )}
                  <td className="px-3 py-2 text-center">
                    {record.linkedin_url ? (
                      <a href={record.linkedin_url} target="_blank" rel="noopener noreferrer" title="Open LinkedIn profile" className="inline-flex">
                        <img src={linkedinIcon} alt="LinkedIn" width={18} height={18} className="h-[1.15rem] w-[1.15rem] shrink-0 object-contain opacity-80" />
                      </a>
                    ) : <span className="text-muted-foreground">-</span>}
                  </td>
                  <td className="px-3 py-2">{record.job_area || '-'}</td>
                  <td className="px-3 py-2">{record.company || '-'}</td>
                  <td className="px-3 py-2">{record.city || '-'}</td>
                  {canManage && (
                    <td className="px-3 py-2">
                      <div className="flex gap-2 justify-end">
                        {alumnusActions(record)}
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </RegisterFrame>
        </>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <Pinned>
        <Pagination className="mt-8">
          <PaginationContent>
            <PaginationItem>
              <PaginationPrevious
                onClick={() => currentPage > 1 && goToPage(currentPage - 1)}
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
                      onClick={() => goToPage(page)}
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
                onClick={() => currentPage < totalPages && goToPage(currentPage + 1)}
                className={currentPage === totalPages ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
              />
            </PaginationItem>
          </PaginationContent>
        </Pagination>
        </Pinned>
      )}
    </div>
    </RegisterPage>
  );
}
