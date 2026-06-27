import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import {
  Plus, Edit, Trash2, LogOut, X, Loader2,
  ChevronLeft, ChevronRight, MoreHorizontal, Download, Search,
  Calendar as CalendarIcon, FileBarChart2, Users as UsersIcon,
  CalendarDays, ClipboardList, Image as ImageIcon, Globe,
  Settings as SettingsIcon, PanelLeftClose, PanelLeftOpen, User as UserIcon,
  Presentation, BarChart3, LayoutTemplate, Info,
} from 'lucide-react';
import { Helmet } from 'react-helmet-async';
import { Link } from 'react-router-dom';
import { Progress } from '@/components/ui/progress';
import { EventsListNew } from '@/components/shared/EventsListNew';
import FileManagement from '@/components/admin/FileManagement';
import TeamManagement from '@/components/admin/TeamManagement';
import AlumniManagement from '@/components/admin/AlumniManagement';
import UserManagement from '@/components/admin/UserManagement';
import ApplicationSettings from '@/components/admin/ApplicationSettings';
import ReadingsManagement from '@/components/admin/ReadingsManagement';
import ActivityManagement from '@/components/admin/ActivityManagement';
import NewsletterManagement from '@/components/admin/NewsletterManagement';
import PagesVisibilityManagement from '@/components/admin/PagesVisibilityManagement';
import { WorkspacePageHeader } from '@/components/admin/WorkspacePageHeader';

import { useAuth } from '@/contexts/AuthContext';
import { usePermissions, type Permissions } from '@/hooks/usePermissions';
import { useIsDesktop } from '@/hooks/use-desktop';
import { downloadCSV } from '@/lib/download-utils';
import logoWhite from '@/assets/logo-white.svg';

interface DbEvent {
  id: string;
  title: string;
  date: string;
  place: string;
  moderator?: string | null;
  guest?: string[] | null;
  description?: string | null;
  poster_url?: string | null;
  created_at: string;
  updated_at: string;
}

// ──────────────────────────────────────────────────────────────────────────────
// Navigation model
// ──────────────────────────────────────────────────────────────────────────────

type SubItem = {
  key: string;
  label: string;
  /** Permission predicate. If omitted, always available to anyone with hasAnyAccess. */
  allowed?: (p: Permissions) => boolean;
};

type NavSection = {
  key: string;
  label: string;
  Icon: React.ComponentType<{ className?: string }>;
  subItems: SubItem[];
};

const NAV: NavSection[] = [
  {
    key: 'my-role', label: 'My profile', Icon: UserIcon,
    subItems: [],
  },
  {
    key: 'welcome', label: 'Welcome', Icon: Info,
    subItems: [],
  },
  {
    key: 'dashboard', label: 'Dashboard', Icon: BarChart3,
    subItems: [],
  },
  {
    key: 'calendar', label: 'Calendar', Icon: CalendarDays,
    subItems: [],
  },
  {
    key: 'reports', label: 'Reports', Icon: FileBarChart2,
    subItems: [
      { key: 'reports-upload', label: 'Upload', allowed: (p) => p.canAccessFiles },
      { key: 'reports-archive', label: 'Archive', allowed: (p) => p.canAccessFiles },
      { key: 'reports-templates', label: 'Templates & code repos' },
      { key: 'reports-funds', label: "Funds' performances" },
    ],
  },
  {
    key: 'people', label: 'People', Icon: UsersIcon,
    subItems: [
      { key: 'people-members', label: 'Members', allowed: (p) => p.canAccessTeam },
      { key: 'people-advisors', label: 'Advisors', allowed: (p) => p.canAccessTeam },
      { key: 'people-alumni', label: 'Alumni', allowed: (p) => p.canAccessAlumni },
    ],
  },
  {
    key: 'events', label: 'Events', Icon: Presentation,
    subItems: [
      { key: 'events-create', label: 'Create', allowed: (p) => p.canAccessEvents },
      { key: 'events-forms', label: 'Forms', allowed: (p) => p.canAccessEvents },
      { key: 'events-attendance', label: 'Attendance', allowed: (p) => p.canAccessEvents },
      { key: 'events-archive', label: 'Archive', allowed: (p) => p.canAccessEvents },
      { key: 'events-alumni-calls', label: 'Alumni calls', allowed: (p) => p.canAccessEvents },
    ],
  },
  {
    key: 'applications', label: 'Applications', Icon: ClipboardList,
    subItems: [
      { key: 'applications-website', label: 'Website Page', allowed: (p) => p.canAccessSettings },
      { key: 'applications-status', label: 'Status', allowed: (p) => p.canAccessSettings },
      { key: 'applications-screening', label: 'Candidates', allowed: (p) => p.canAccessSettings },
      { key: 'applications-joiners', label: 'New joiners', allowed: (p) => p.canAccessSettings },
      { key: 'applications-form', label: 'Form settings', allowed: (p) => p.canAccessSettings },
    ],
  },
  {
    key: 'smm', label: 'SMM & graphics', Icon: ImageIcon,
    subItems: [
      { key: 'smm-ig', label: 'Instagram' },
      { key: 'smm-li', label: 'LinkedIn' },
      { key: 'smm-other', label: 'Other templates' },
      { key: 'smm-brand', label: 'Design, brand & logo' },
    ],
  },
  {
    key: 'operations', label: 'Operations', Icon: Globe,
    subItems: [
      { key: 'ops-fee', label: 'Membership fee' },
      { key: 'ops-treasury', label: 'Treasury' },
      { key: 'ops-accounts', label: 'Accounts & credentials' },
      { key: 'ops-external', label: 'External relations' },
      { key: 'ops-newsletter', label: 'Newsletter', allowed: (p) => p.canAccessUsers },
      { key: 'ops-auto-emails', label: 'Auto emails' },

      { key: 'ops-docs', label: 'Statuto' },
    ],
  },

  {
    key: 'website', label: 'Website', Icon: LayoutTemplate,
    subItems: [
      { key: 'website-pages', label: 'Pages', allowed: (p) => p.isFullAccess },
      { key: 'website-readings', label: 'Readings', allowed: (p) => p.canAccessReadings },
      { key: 'website-testimonials', label: 'Testimonials' },
      { key: 'website-alumni-companies', label: 'Alumni companies' },
    ],
  },

  {
    key: 'settings', label: 'Settings', Icon: SettingsIcon,
    subItems: [
      { key: 'settings-users', label: 'Users', allowed: (p) => p.canAccessUsers },
      { key: 'settings-roles', label: 'Roles permissions', allowed: (p) => p.canAccessUsers },
      { key: 'settings-activity', label: 'Activity log', allowed: (p) => p.canAccessActivity },
      { key: 'settings-edit-dashboard', label: 'Edit workspace', allowed: (p) => p.canAccessUsers },
    ],
  },
];

function filterNav(permissions: Permissions): NavSection[] {
  return NAV
    .map((s) => ({ ...s, subItems: s.subItems.filter((si) => !si.allowed || si.allowed(permissions)) }))
    .filter((s) => s.key === 'my-role' || s.key === 'welcome' || s.key === 'dashboard' || s.key === 'calendar' || s.subItems.length > 0);
}

// ──────────────────────────────────────────────────────────────────────────────
// Component
// ──────────────────────────────────────────────────────────────────────────────

const MinervaWorkspace = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user, isLoading: authLoading, signOut, session, isSessionExpired, roles } = useAuth();
  const permissions = usePermissions();
  const isDesktop = useIsDesktop();

  // Shell state
  const [navExpanded, setNavExpanded] = useState(true);
  const [submenuOpen, setSubmenuOpen] = useState(true);
  const [activeSectionKey, setActiveSectionKey] = useState<string | null>(null);
  const [activeSubKey, setActiveSubKey] = useState<string | null>(null);

  const visibleNav = useMemo(() => filterNav(permissions), [permissions]);

  // Set initial active section/sub-item
  useEffect(() => {
    if (!activeSectionKey && visibleNav.length > 0) {
      const first = visibleNav[0];
      setActiveSectionKey(first.key);
      setActiveSubKey(first.subItems[0]?.key ?? null);
      if (first.subItems.length === 0) setSubmenuOpen(false);
    }
  }, [visibleNav, activeSectionKey]);

  // Auto-collapse main nav rail when a submenu panel is shown
  useEffect(() => {
    const section = visibleNav.find((s) => s.key === activeSectionKey);
    if (submenuOpen && section && section.subItems.length > 0) {
      setNavExpanded(false);
    }
  }, [submenuOpen, activeSectionKey, visibleNav]);

  // Events state (existing logic preserved)
  const [events, setEvents] = useState<DbEvent[]>([]);
  const [isEventsLoading, setIsEventsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<DbEvent | null>(null);
  const [formData, setFormData] = useState({
    title: '', date: '', place: '', moderator: '', guests: [''], description: '', poster_url: '',
  });
  const [isUploadingPoster, setIsUploadingPoster] = useState(false);
  const [eventsCurrentPage, setEventsCurrentPage] = useState(1);
  const [eventsYearFilter, setEventsYearFilter] = useState<number | 'all'>('all');
  const [eventsSearchQuery, setEventsSearchQuery] = useState('');
  const EVENTS_PER_PAGE = 15;

  // Session expiry
  useEffect(() => {
    if (isSessionExpired) {
      toast({ title: 'Session Expired', description: 'Your session has expired. Please log in again.', variant: 'destructive' });
      signOut().then(() => navigate('/auth', { state: { from: '/admin', sessionExpired: true } }));
    }
  }, [isSessionExpired, signOut, navigate, toast]);

  // Auth gate
  useEffect(() => {
    if (!authLoading) {
      if (!user) {
        navigate('/auth', { state: { from: '/admin' } });
        return;
      }
      const isAdminEmail = user.email === 'as.minerva@unibocconi.it';
      const isMemberOnly = roles.length > 0 && roles.every((r) => r.role === 'member');
      const hasNoRoles = roles.length === 0;
      if (!isAdminEmail && (isMemberOnly || hasNoRoles)) {
        navigate('/pending-approval');
        return;
      }
      if (!permissions.hasAnyAccess) {
        toast({ title: 'Access Denied', description: "You don't have permission to access the Minerva Workspace.", variant: 'destructive' });
        navigate('/');
        return;
      }
      fetchEvents();
    }
  }, [user, authLoading, navigate, roles, permissions.hasAnyAccess]);

  const fetchEvents = async () => {
    try {
      const { data, error } = await supabase.from('events').select('*').order('date', { ascending: false });
      if (error) throw error;
      setEvents(data || []);
    } catch (error) {
      console.error('Error fetching events:', error);
      toast({ title: 'Error', description: 'Failed to fetch events', variant: 'destructive' });
    } finally {
      setIsEventsLoading(false);
    }
  };

  const filteredEvents = useMemo(() => {
    return events.filter((event) => {
      if (eventsYearFilter !== 'all') {
        const eventYear = new Date(event.date).getFullYear();
        if (eventYear !== eventsYearFilter) return false;
      }
      if (eventsSearchQuery.trim()) {
        const q = eventsSearchQuery.toLowerCase();
        const matches =
          event.title.toLowerCase().includes(q) ||
          event.place.toLowerCase().includes(q) ||
          (event.moderator?.toLowerCase().includes(q) ?? false) ||
          (event.guest?.some((g) => g.toLowerCase().includes(q)) ?? false) ||
          (event.description?.toLowerCase().includes(q) ?? false);
        if (!matches) return false;
      }
      return true;
    });
  }, [events, eventsYearFilter, eventsSearchQuery]);

  const eventsYears = useMemo(() => {
    const years = [...new Set(events.map((e) => new Date(e.date).getFullYear()))];
    return years.sort((a, b) => b - a);
  }, [events]);

  const eventsTotalPages = Math.ceil(filteredEvents.length / EVENTS_PER_PAGE);
  const eventsStartIndex = (eventsCurrentPage - 1) * EVENTS_PER_PAGE;
  const paginatedEvents = useMemo(
    () => filteredEvents.slice(eventsStartIndex, eventsStartIndex + EVENTS_PER_PAGE),
    [filteredEvents, eventsStartIndex]
  );

  useEffect(() => { setEventsCurrentPage(1); }, [eventsYearFilter, eventsSearchQuery]);

  const getEventsPageNumbers = () => {
    const pages: (number | 'ellipsis')[] = [];
    if (eventsTotalPages <= 7) {
      for (let i = 1; i <= eventsTotalPages; i++) pages.push(i);
    } else {
      pages.push(1);
      if (eventsCurrentPage > 3) pages.push('ellipsis');
      for (let i = Math.max(2, eventsCurrentPage - 1); i <= Math.min(eventsTotalPages - 1, eventsCurrentPage + 1); i++) pages.push(i);
      if (eventsCurrentPage < eventsTotalPages - 2) pages.push('ellipsis');
      pages.push(eventsTotalPages);
    }
    return pages;
  };

  const resetForm = () => {
    setFormData({ title: '', date: '', place: '', moderator: '', guests: [''], description: '', poster_url: '' });
    setEditingEvent(null);
  };
  const openCreateDialog = () => { resetForm(); setIsDialogOpen(true); };
  const openEditDialog = (event: DbEvent) => {
    setEditingEvent(event);
    setFormData({
      title: event.title, date: event.date, place: event.place,
      moderator: event.moderator || '',
      guests: event.guest && event.guest.length > 0 ? event.guest : [''],
      description: event.description || '',
      poster_url: event.poster_url || '',
    });
    setIsDialogOpen(true);
  };

  const handlePosterUpload = async (file: File) => {
    const ext = (file.name.split('.').pop() || '').toLowerCase();
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'application/pdf'];
    const allowedExts = ['jpg', 'jpeg', 'png', 'pdf'];
    const typeOk = allowedTypes.includes(file.type) || allowedExts.includes(ext);
    if (!typeOk) {
      toast({ title: 'Invalid file', description: 'Please select a JPG, PNG or PDF file.', variant: 'destructive' });
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      toast({ title: 'File too large', description: 'Poster must be under 10 MB.', variant: 'destructive' });
      return;
    }
    setIsUploadingPoster(true);
    try {
      const path = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext || 'bin'}`;
      const contentType = file.type || (ext === 'pdf' ? 'application/pdf' : `image/${ext}`);
      const { error } = await supabase.storage.from('event-posters').upload(path, file, {
        cacheControl: '3600', upsert: false, contentType,
      });
      if (error) throw error;
      const { data: pub } = supabase.storage.from('event-posters').getPublicUrl(path);
      setFormData((prev) => ({ ...prev, poster_url: pub.publicUrl }));
      toast({ title: 'Poster uploaded' });
    } catch (err) {
      console.error('Poster upload error:', err);
      const message = err instanceof Error ? err.message : 'Could not upload poster.';
      toast({ title: 'Upload failed', description: message, variant: 'destructive' });
    } finally {
      setIsUploadingPoster(false);
    }
  };
  const addGuestField = () => setFormData({ ...formData, guests: [...formData.guests, ''] });
  const removeGuestField = (i: number) => formData.guests.length > 1 && setFormData({ ...formData, guests: formData.guests.filter((_, idx) => idx !== i) });
  const updateGuest = (i: number, v: string) => {
    const g = [...formData.guests]; g[i] = v; setFormData({ ...formData, guests: g });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title.trim() || !formData.date || !formData.place.trim()) {
      toast({ title: 'Error', description: 'Title, date, and place are required', variant: 'destructive' });
      return;
    }
    setIsSubmitting(true);
    try {
      const action = editingEvent ? 'update' : 'create';
      const filteredGuests = formData.guests.filter((g) => g.trim() !== '');
      const eventData = {
        title: formData.title, date: formData.date, place: formData.place,
        moderator: formData.moderator || null,
        guest: filteredGuests.length > 0 ? filteredGuests : null,
        description: formData.description || null,
        poster_url: formData.poster_url || null,
        ...(editingEvent && { id: editingEvent.id }),
      };
      const { data, error } = await supabase.functions.invoke('admin-events', {
        body: { action, event: eventData },
        headers: { Authorization: `Bearer ${session?.access_token}` },
      });
      if (error) throw error;
      if (data.error) { toast({ title: 'Error', description: data.error, variant: 'destructive' }); return; }
      toast({ title: 'Success', description: `Event ${editingEvent ? 'updated' : 'created'} successfully` });
      setIsDialogOpen(false); resetForm(); fetchEvents();
    } catch (error) {
      console.error('Submit error:', error);
      toast({ title: 'Error', description: 'Failed to save event', variant: 'destructive' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (eventId: string) => {
    if (!confirm('Are you sure you want to delete this event?')) return;
    try {
      const { data, error } = await supabase.functions.invoke('admin-events', {
        body: { action: 'delete', event: { id: eventId } },
        headers: { Authorization: `Bearer ${session?.access_token}` },
      });
      if (error) throw error;
      if (data.error) { toast({ title: 'Error', description: data.error, variant: 'destructive' }); return; }
      toast({ title: 'Success', description: 'Event deleted successfully' });
      fetchEvents();
    } catch (error) {
      console.error('Delete error:', error);
      toast({ title: 'Error', description: 'Failed to delete event', variant: 'destructive' });
    }
  };

  // ────────────────────────────────────────────────────────────────────────────
  // Loading / guards
  // ────────────────────────────────────────────────────────────────────────────

  // Workspace sits below the public header (h-20 mobile / h-24 desktop = 6rem)
  const shellHeight = 'h-screen';

  if (authLoading) {
    return (
      <div className={`${shellHeight} flex items-center justify-center`}>
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!isDesktop) {
    return (
      <div className={`${shellHeight} flex items-center justify-center px-6`}>
        <Card className="max-w-md">
          <CardContent className="py-10 text-center">
            <h1 className="font-serif text-heading text-accent mb-3">Minerva Workspace available on desktop</h1>
            <p className="font-body text-muted-foreground">
              Please open this page on a desktop computer or a tablet in landscape mode.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!user || !permissions.hasAnyAccess) return null;

  const roleLabels: Record<string, string> = {
    admin: 'Admin', president: 'President', vice_president: 'Vice President',
    head_of_asset_management: 'Head of Asset Management',
    head_of_equity: 'Head of Equity Research', head_of_investment: 'Head of Investment Research',
    head_of_macro: 'Head of Macro Research', head_of_portfolio: 'Head of Portfolio Management',
    head_of_quant: 'Head of Quantitative Research', head_of_operations: 'Head of Operations',
    head_of_media: 'Head of Media', portfolio_manager: 'Portfolio Manager', member: 'Member',
  };
  const priorityOrder = ['president', 'vice_president', 'admin', 'head_of_asset_management',
    'head_of_operations', 'head_of_media', 'head_of_equity', 'head_of_investment',
    'head_of_macro', 'head_of_portfolio', 'head_of_quant', 'portfolio_manager', 'member'];
  const userRoleNames = roles.map((r) => r.role);
  const primaryRole = priorityOrder.find((r) => userRoleNames.includes(r as any)) || (roles[0]?.role ?? '');
  const roleLabel = roleLabels[primaryRole] || primaryRole || 'No Role';

  const activeSection = visibleNav.find((s) => s.key === activeSectionKey) ?? null;
  const activeSub = activeSection?.subItems.find((si) => si.key === activeSubKey) ?? null;

  const handleNavClick = (section: NavSection) => {
    setActiveSectionKey(section.key);
    if (section.subItems.length === 0) {
      setSubmenuOpen(false);
      setActiveSubKey(null);
    } else if (section.subItems.length > 1) {
      setSubmenuOpen(true);
      setActiveSubKey(section.subItems[0].key);
    } else {
      setSubmenuOpen(false);
      setActiveSubKey(section.subItems[0].key);
    }
  };


  // ────────────────────────────────────────────────────────────────────────────
  // Content router
  // ────────────────────────────────────────────────────────────────────────────

  const renderMyRole = () => (
    <div>
      <WorkspacePageHeader
        title="My profile"
        description="Your account details and current workspace role."
      />
      <div className="max-w-2xl space-y-4 font-body">
        <div>
          <div className="text-xs uppercase tracking-wider text-muted-foreground mb-1">Role</div>
          <div className="text-lg text-foreground">{roleLabel}</div>
        </div>
        <div>
          <div className="text-xs uppercase tracking-wider text-muted-foreground mb-1">Email</div>
          <div className="text-foreground">{user.email}</div>
        </div>
      </div>
    </div>
  );

  const renderPlaceholder = (title: string, description: string) => (
    <div>
      <WorkspacePageHeader title={title} description={description} />
      <div className="py-12 text-center">
        <p className="font-body text-muted-foreground">Coming soon.</p>
      </div>
    </div>
  );

  const renderContent = () => {
    if (activeSectionKey === 'my-role') return renderMyRole();
    if (activeSectionKey === 'welcome') {
      return renderPlaceholder('Welcome', 'Your entry point to the Minerva workspace.');
    }
    if (activeSectionKey === 'dashboard') {
      return renderPlaceholder('Dashboard', 'Role-aware overview of workspace activity.');
    }
    if (activeSectionKey === 'calendar' && !activeSubKey) {
      return renderPlaceholder('Calendar', 'Upcoming events, deadlines and meetings.');
    }
    if (!activeSubKey) return null;
    switch (activeSubKey) {
      case 'reports-archive':
        return <FileManagement allowedDivisions={permissions.allowedDivisions} />;
      case 'people-members':
        return <TeamManagement allowedDivisions={permissions.allowedDivisions} isFullAccess={permissions.isFullAccess} />;
      case 'people-alumni':
        return <AlumniManagement />;
      case 'events-archive':
        return renderEventsManagement();
      case 'applications-website':
        return <ApplicationSettings />;
      case 'website-readings':
        return <ReadingsManagement />;
      case 'settings-users':
        return <UserManagement />;
      case 'settings-activity':
        return <ActivityManagement />;
      case 'ops-newsletter':
        return <NewsletterManagement />;
      case 'website-pages':
        return <PagesVisibilityManagement />;



      default:
        return renderPlaceholder(activeSub?.label ?? 'Coming soon', 'This section is under construction.');
    }
  };

  const renderEventsManagement = () => (
    <div>
      <WorkspacePageHeader
        title="Events archive"
        description="Past and upcoming events with posters, moderators and guests."
        actions={<>

          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="outline" className="font-body" disabled={events.length === 0}>
                <Download className="h-4 w-4 mr-2" />Download CSV
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Download Events CSV</AlertDialogTitle>
                <AlertDialogDescription>
                  This will download a CSV file containing {events.length} event{events.length !== 1 ? 's' : ''}.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={() => {
                  const columns: { key: keyof DbEvent; header: string }[] = [
                    { key: 'title', header: 'Title' },
                    { key: 'date', header: 'Date' },
                    { key: 'place', header: 'Place' },
                    { key: 'moderator', header: 'Moderator' },
                    { key: 'guest', header: 'Guests' },
                    { key: 'description', header: 'Description' },
                  ];
                  downloadCSV(events, columns, 'events.csv');
                  toast({ title: 'Download started', description: 'Events CSV is being downloaded.' });
                }}>Download</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={openCreateDialog} className="font-body">
                <Plus className="h-4 w-4 mr-2" />Add Event
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="font-serif">{editingEvent ? 'Edit Event' : 'Add New Event'}</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2"><Label htmlFor="title" className="font-body">Title *</Label>
                  <Input id="title" value={formData.title} onChange={(e) => setFormData({ ...formData, title: e.target.value })} placeholder="Event title" required /></div>
                <div className="space-y-2"><Label htmlFor="date" className="font-body">Date *</Label>
                  <Input id="date" type="date" value={formData.date} onChange={(e) => setFormData({ ...formData, date: e.target.value })} required /></div>
                <div className="space-y-2"><Label htmlFor="place" className="font-body">Place *</Label>
                  <Input id="place" value={formData.place} onChange={(e) => setFormData({ ...formData, place: e.target.value })} placeholder="Event location" required /></div>
                <div className="space-y-2"><Label htmlFor="moderator" className="font-body">Moderator (optional)</Label>
                  <Input id="moderator" value={formData.moderator} onChange={(e) => setFormData({ ...formData, moderator: e.target.value })} placeholder="e.g., John Smith, CEO at Company" /></div>
                <div className="space-y-2">
                  <Label className="font-body">Guests (optional)</Label>
                  {formData.guests.map((guest, index) => (
                    <div key={index} className="flex gap-2">
                      <Input value={guest} onChange={(e) => updateGuest(index, e.target.value)} placeholder={`Guest ${index + 1}, e.g., Jane Doe, Partner at Firm`} />
                      {formData.guests.length > 1 && (
                        <Button type="button" variant="outline" size="icon" onClick={() => removeGuestField(index)}><X className="h-4 w-4" /></Button>
                      )}
                    </div>
                  ))}
                  <Button type="button" variant="outline" size="sm" onClick={addGuestField} className="font-body"><Plus className="h-4 w-4 mr-2" />Add another guest</Button>
                </div>
                <div className="space-y-2"><Label htmlFor="description" className="font-body">Description (optional)</Label>
                  <Textarea id="description" value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} placeholder="Event description" rows={3} /></div>
                <div className="space-y-2">
                  <Label htmlFor="poster" className="font-body">Poster (optional)</Label>
                  {formData.poster_url && (
                    <div className="flex items-start gap-3">
                      {formData.poster_url.toLowerCase().endsWith('.pdf') ? (
                        <div className="w-24 h-32 border border-separator flex items-center justify-center bg-muted">
                          <span className="font-serif text-xs">PDF</span>
                        </div>
                      ) : (
                        <img src={formData.poster_url} alt="Poster preview" className="w-24 h-auto border border-separator" />
                      )}
                      <Button type="button" variant="outline" size="sm" onClick={() => setFormData({ ...formData, poster_url: '' })} className="font-body">
                        Remove
                      </Button>
                    </div>
                  )}
                  <Input
                    id="poster"
                    type="file"
                    accept="image/jpeg,image/png,image/jpg,application/pdf,.jpg,.jpeg,.png,.pdf"
                    disabled={isUploadingPoster}
                    onChange={(e) => { const f = e.target.files?.[0]; if (f) handlePosterUpload(f); e.target.value = ''; }}
                  />
                  {isUploadingPoster && (
                    <p className="text-xs text-muted-foreground font-body">
                      <Loader2 className="inline h-3 w-3 mr-1 animate-spin" />Uploading poster...
                    </p>
                  )}
                  <p className="text-xs text-muted-foreground font-body">
                    JPG, PNG or PDF. Any aspect ratio. Max 10 MB.
                  </p>
                </div>
                {isSubmitting && (
                  <div className="space-y-2"><Progress value={100} className="h-1 animate-pulse" />
                    <p className="text-xs text-muted-foreground text-center font-body">Saving event...</p></div>
                )}
                <div className="flex gap-4 pt-4">
                  <Button type="submit" className="flex-1 font-body" disabled={isSubmitting}>
                    {isSubmitting ? (<><Loader2 className="h-4 w-4 mr-2 animate-spin" />Saving...</>) : (editingEvent ? 'Update Event' : 'Create Event')}
                  </Button>
                  <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)} className="font-body">Cancel</Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
          </>}
      />


      <div className="mb-8 pb-6 border-b border-separator">
        <div className="flex flex-col sm:flex-row gap-4">
          <div>
            <label className="font-body text-xs text-muted-foreground uppercase tracking-wider block mb-2">Year</label>
            <select value={eventsYearFilter} onChange={(e) => setEventsYearFilter(e.target.value === 'all' ? 'all' : parseInt(e.target.value))}
              className="bg-background border border-separator px-3 h-10 min-w-[150px]" style={{ fontFamily: '"Times New Roman", Times, serif' }}>
              <option value="all">All Years</option>
              {eventsYears.map((y) => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>
          <div className="flex-1">
            <label className="font-body text-xs text-muted-foreground uppercase tracking-wider block mb-2">Search</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input type="text" placeholder="Search by title, place, moderator, guests..." value={eventsSearchQuery} onChange={(e) => setEventsSearchQuery(e.target.value)}
                className="w-full pl-10 pr-3 h-10 border border-separator bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-accent transition-colors"
                style={{ fontFamily: '"Times New Roman", Times, serif' }} />
            </div>
          </div>
        </div>
      </div>

      <p className="font-body text-small text-muted-foreground mb-6">
        Showing {paginatedEvents.length} of {filteredEvents.length} {filteredEvents.length === 1 ? 'event' : 'events'}
        {eventsTotalPages > 1 && ` (page ${eventsCurrentPage} of ${eventsTotalPages})`}
      </p>

      {isEventsLoading ? (
        <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
      ) : events.length === 0 ? (
        <Card><CardContent className="py-12 text-center"><p className="font-body text-muted-foreground">No events yet. Click "Add Event" to create one.</p></CardContent></Card>
      ) : (
        <>
          <div className="space-y-0">
            {paginatedEvents.map((event, index) => (
              <div key={event.id} className={`py-0 ${index !== paginatedEvents.length - 1 ? 'border-b border-separator' : ''}`}>
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1"><EventsListNew events={[event]} /></div>
                  <div className="flex gap-2 pt-0">
                    <Button variant="outline" size="icon" onClick={() => openEditDialog(event)}><Edit className="h-4 w-4" /></Button>
                    <Button variant="destructive" size="icon" onClick={() => handleDelete(event.id)}><Trash2 className="h-4 w-4" /></Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
          {eventsTotalPages > 1 && (
            <nav className="flex justify-center mt-8" aria-label="Events Pagination">
              <ul className="flex items-center gap-1">
                <li><button onClick={() => setEventsCurrentPage(eventsCurrentPage - 1)} disabled={eventsCurrentPage === 1}
                  className="flex items-center gap-1 px-3 py-2 font-body text-sm border border-separator rounded hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed">
                  <ChevronLeft className="h-4 w-4" />Previous</button></li>
                {getEventsPageNumbers().map((page, i) => (
                  <li key={i}>{page === 'ellipsis' ? (
                    <span className="flex h-9 w-9 items-center justify-center"><MoreHorizontal className="h-4 w-4" /></span>
                  ) : (
                    <button onClick={() => setEventsCurrentPage(page)}
                      className={`h-9 w-9 font-body text-sm border rounded ${eventsCurrentPage === page ? 'border-primary bg-primary text-primary-foreground' : 'border-separator hover:bg-muted'}`}>
                      {page}</button>
                  )}</li>
                ))}
                <li><button onClick={() => setEventsCurrentPage(eventsCurrentPage + 1)} disabled={eventsCurrentPage === eventsTotalPages}
                  className="flex items-center gap-1 px-3 py-2 font-body text-sm border border-separator rounded hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed">
                  Next<ChevronRight className="h-4 w-4" /></button></li>
              </ul>
            </nav>
          )}
        </>
      )}
    </div>
  );

  // ────────────────────────────────────────────────────────────────────────────
  // Render shell
  // ────────────────────────────────────────────────────────────────────────────

  return (
    <>
    <Helmet>
      <title>Workspace | MIMS</title>
    </Helmet>
    <div className={`${shellHeight} w-full flex bg-background overflow-hidden`}>
      {/* Nav column */}
      <aside
        className="flex flex-col bg-accent text-accent-foreground transition-[width] duration-200 ease-in-out shrink-0"
        style={{ width: navExpanded ? 240 : 72 }}
      >
        {/* Logo */}
        <div className="shrink-0 flex items-center justify-center px-4 h-20">
          <Link to="/" title="Return to homepage" className="flex items-center justify-center">
            <img src={logoWhite} alt="Minerva — Return to homepage" className="h-14 w-14 shrink-0" />
          </Link>
        </div>

        {/* Nav items (scrollable) */}
        <nav className="flex-1 overflow-y-auto py-3">
          {visibleNav.map((section) => {
            const isActive = section.key === activeSectionKey;
            return (
              <button
                key={section.key}
                onClick={() => handleNavClick(section)}
                title={!navExpanded ? section.label : undefined}
                className={`group w-full flex items-center gap-3 px-4 h-12 text-left transition-colors tracking-wide ${
                  isActive ? 'bg-background/15' : 'hover:bg-background/10'
                } ${navExpanded ? '' : 'justify-center'}`}
                style={{ fontFamily: '"Times New Roman", Times, serif' }}
              >
                <section.Icon className="h-5 w-5 shrink-0" />
                {navExpanded && <span className="text-base">{section.label}</span>}
              </button>
            );
          })}
        </nav>

        {/* Collapse toggle */}
        <div className="shrink-0 p-2">
          <button
            onClick={() => setNavExpanded((v) => !v)}
            className={`w-full flex items-center gap-3 px-2 h-10 hover:bg-background/10 transition-colors ${navExpanded ? '' : 'justify-center'}`}
            title={navExpanded ? 'Collapse sidebar' : 'Expand sidebar'}
            style={{ fontFamily: '"Times New Roman", Times, serif' }}
          >
            {navExpanded ? <PanelLeftClose className="h-5 w-5" /> : <PanelLeftOpen className="h-5 w-5" />}
            {navExpanded && <span className="text-sm opacity-80 tracking-wide">Collapse</span>}
          </button>
        </div>
      </aside>

      {/* Right side */}
      <div className="flex-1 min-w-0 flex flex-col">
        {/* Top strip */}
        <div className="shrink-0 h-20 flex items-center justify-between gap-6 px-6 bg-muted/40 border-b border-separator">
          <div className="flex flex-col leading-tight shrink-0">
            <span className="italic text-accent text-[28px]" style={{ fontFamily: '"Times New Roman", Times, serif' }}>
              {roleLabel}
            </span>
            <span className="font-body text-sm text-muted-foreground">{user.email}</span>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <Button
              variant="outline"
              onClick={() => navigate('/')}
              style={{ fontFamily: '"Times New Roman", Times, serif' }}
            >
              <Globe className="h-4 w-4 mr-2" />Return to website
            </Button>
            <Button
              variant="outline"
              onClick={async () => { await signOut(); navigate('/auth'); }}
              style={{ fontFamily: '"Times New Roman", Times, serif' }}
            >
              <LogOut className="h-4 w-4 mr-2" />Log out
            </Button>
          </div>
        </div>

        {/* Body row */}
        <div className="flex-1 min-h-0 flex">
          {/* Submenu panel */}
          <div
            className="bg-muted/30 border-r border-separator overflow-hidden transition-[width] duration-200 ease-in-out shrink-0"
            style={{ width: submenuOpen && activeSection && activeSection.subItems.length > 0 ? 240 : 0 }}
          >
            {activeSection && activeSection.subItems.length > 0 && (
              <div className="w-[240px] h-full flex flex-col">
                <div className="shrink-0 h-14 flex items-center justify-between px-4">
                  <h3 className="font-serif text-lg text-accent tracking-wide">{activeSection.label}</h3>
                  <button
                    onClick={() => setSubmenuOpen(false)}
                    className="h-7 w-7 flex items-center justify-center hover:bg-background"
                    title="Hide submenu"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </button>
                </div>
                <div className="flex-1 overflow-y-auto py-3">
                  {activeSection.subItems.map((si) => {
                    const isActive = si.key === activeSubKey;
                    return (
                      <button
                        key={si.key}
                        onClick={() => setActiveSubKey(si.key)}
                        className={`w-full text-left px-4 h-11 flex items-center transition-colors text-body ${
                          isActive ? 'text-accent font-medium bg-[#ece9f4]' : 'text-foreground hover:bg-background/60'
                        }`}
                        style={{ fontFamily: '"Times New Roman", Times, serif' }}
                      >
                        {si.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Content area */}
          <div className="flex-1 min-w-0 flex flex-col overflow-hidden">
            {/* Breadcrumb strip */}
            <div className="shrink-0 h-14 flex items-center gap-3 px-6">
              {!submenuOpen && activeSection && activeSection.subItems.length > 1 && (
                <button
                  onClick={() => setSubmenuOpen(true)}
                  className="h-7 w-7 flex items-center justify-center hover:bg-muted"
                  title="Show submenu"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              )}
              <nav className="font-body text-sm text-muted-foreground flex items-center gap-2">
                <span>Minerva Workspace</span>
                {activeSection && <><span>/</span><span>{activeSection.label}</span></>}
                {activeSub && <><span>/</span><span className="text-foreground">{activeSub.label}</span></>}
              </nav>
            </div>

            {/* Scrollable content */}
            <div className="flex-1 overflow-y-auto px-6 py-6">
              {renderContent()}
            </div>
          </div>
        </div>
      </div>
    </div>
    </>
  );
};

export default MinervaWorkspace;
