import { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import {
  Plus, Edit, Trash2, LogOut, X, Loader2,
  ChevronLeft, ChevronRight, MoreHorizontal, Download, Search,
  Calendar as CalendarIcon, FileBarChart2, Users as UsersIcon,
  CalendarDays, ClipboardList, Image as ImageIcon, Globe,
  Settings as SettingsIcon, PanelLeftClose, PanelLeftOpen, User as UserIcon,
  Presentation, BarChart3, LayoutTemplate, Info, HelpCircle,
} from 'lucide-react';
import { Helmet } from 'react-helmet-async';
import { Link } from 'react-router-dom';
import { Progress } from '@/components/ui/progress';
import { Switch } from '@/components/ui/switch';
import { EVENT_TYPE_LABELS, type EventType } from '@/lib/events-api';
import FileManagement from '@/components/admin/FileManagement';
import MembersManagement from '@/components/admin/MembersManagement';
import MyProfile from '@/components/admin/MyProfile';
import ContactPrompt from '@/components/admin/ContactPrompt';
import CandidatesManagement from '@/components/admin/CandidatesManagement';
import NewJoiners from '@/components/admin/NewJoiners';
import FormSettings from '@/components/admin/FormSettings';
import QuestionsManagement from '@/components/admin/QuestionsManagement';
import ApplicationStatus from '@/components/admin/ApplicationStatus';
import InterviewCalendar from '@/components/admin/InterviewCalendar';
import InterviewCalendarCandidate from '@/components/admin/InterviewCalendarCandidate';
import ReportUpload from '@/components/admin/ReportUpload';
import ResourceManager from '@/components/admin/ResourceManager';
import FundsPerformances from '@/components/admin/FundsPerformances';
import EventCreate from '@/components/admin/EventCreate';
import EventForms from '@/components/admin/EventForms';
import EventAttendance from '@/components/admin/EventAttendance';
import AlumniCalls from '@/components/admin/AlumniCalls';
import AssociationOnDisplay from '@/components/admin/AssociationOnDisplay';
import WorkspaceCalendar from '@/components/admin/WorkspaceCalendar';
import MembershipFee from '@/components/admin/MembershipFee';
import Treasury from '@/components/admin/Treasury';
import AutoEmails from '@/components/admin/AutoEmails';
import EditorialCalendar from '@/components/admin/EditorialCalendar';
import AdsRegister from '@/components/admin/AdsRegister';
import { PageLoader } from '@/components/shared/PageLoader';
import AlumniManagement from '@/components/admin/AlumniManagement';
import UserManagement from '@/components/admin/UserManagement';
import RolePermissionsTable from '@/components/admin/RolePermissionsTable';
import HowToUse from '@/components/admin/HowToUse';
import WorkspaceDashboard from '@/components/admin/WorkspaceDashboard';
import { HelpProvider, PageHelpButton } from '@/components/admin/help/HelpSystem';
import { HelpDot } from '@/components/admin/help/HelpSystem';
import ApplicationSettings from '@/components/admin/ApplicationSettings';
import ReadingsManagement from '@/components/admin/ReadingsManagement';
import ActivityManagement from '@/components/admin/ActivityManagement';
import NewsletterManagement from '@/components/admin/NewsletterManagement';
import PagesVisibilityManagement from '@/components/admin/PagesVisibilityManagement';
import TestimonialsManagement from '@/components/admin/TestimonialsManagement';
import { WorkspacePageHeader } from '@/components/admin/WorkspacePageHeader';
import { WorkspaceLoader } from '@/components/admin/WorkspaceLoader';

import { useAuth } from '@/contexts/AuthContext';
import { usePermissions, type Permissions } from '@/hooks/usePermissions';
import { useAccess } from '@/hooks/useAccess';
import { primaryAssignment, roleLabel as composeRoleLabel } from '@/lib/roles';
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
  event_type?: string | null;
  // Extended columns preserved when editing from the archive (so an edit
  // never silently resets an event's type, schedule or registration).
  division?: string | null;
  start_at?: string | null;
  end_at?: string | null;
  online?: boolean | null;
  registration_enabled?: boolean | null;
  registration_audience?: string | null;
  show_on_website?: boolean | null;
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

// Workspace navigation. Internal `key`s are intentionally unchanged (they drive
// routing, permissions and render cases); only labels, grouping and order are
// reorganised. NOTE: "Calendar" and "People" are kept even though they were not
// in the requested 10-section list, because removing them would remove real
// functionality (the shared calendar; members/advisors/alumni management).
const NAV: NavSection[] = [
  {
    key: 'dashboard', label: 'Dashboard', Icon: BarChart3,
    subItems: [],
  },
  {
    key: 'my-role', label: 'My profile', Icon: UserIcon,
    subItems: [],
  },
  {
    key: 'calendar', label: 'Calendar', Icon: CalendarDays,
    subItems: [],
  },
  {
    key: 'reports', label: 'Reports', Icon: FileBarChart2,
    subItems: [
      { key: 'reports-upload', label: 'Upload report', allowed: (p) => p.can('reports-upload') },
      { key: 'reports-archive', label: 'Report archive', allowed: (p) => p.can('reports-archive') },
      { key: 'reports-templates', label: 'Templates & repositories', allowed: (p) => p.can('reports-templates') },
      { key: 'reports-funds', label: 'Fund performances', allowed: (p) => p.can('reports-funds') },
    ],
  },
  {
    key: 'applications', label: 'Recruiting', Icon: ClipboardList,
    subItems: [
      { key: 'applications-website', label: 'Application page', allowed: (p) => p.can('applications-website') },
      { key: 'applications-screening', label: 'Candidates screening', allowed: (p) => p.can('applications-screening') },
      { key: 'applications-interview-calendar', label: 'Interview calendar', allowed: (p) => p.can('applications-interview-calendar') },
      { key: 'applications-joiners', label: 'Offers', allowed: (p) => p.can('applications-joiners') },
      { key: 'applications-form', label: 'Form & settings', allowed: (p) => p.can('applications-form') },
    ],
  },
  {
    key: 'events', label: 'Events', Icon: Presentation,
    subItems: [
      { key: 'events-create', label: 'Create event', allowed: (p) => p.can('events-create') },
      { key: 'events-forms', label: 'Registration forms', allowed: (p) => p.can('events-forms') },
      { key: 'events-attendance', label: 'Attendance', allowed: (p) => p.can('events-attendance') },
      { key: 'events-archive', label: 'Event archive', allowed: (p) => p.can('events-archive') },
      { key: 'events-alumni-calls', label: 'Alumni calls', allowed: (p) => p.can('events-alumni-calls') },
      { key: 'events-on-display', label: 'Association on Display', allowed: (p) => p.can('events-on-display') },
    ],
  },
  {
    key: 'people', label: 'People', Icon: UsersIcon,
    subItems: [
      { key: 'people-members', label: 'Members', allowed: (p) => p.can('people-members') },
      { key: 'people-advisors', label: 'Advisors', allowed: (p) => p.can('people-advisors') },
      { key: 'people-alumni', label: 'Alumni', allowed: (p) => p.can('people-alumni') },
    ],
  },
  {
    key: 'smm', label: 'Social Media', Icon: ImageIcon,
    subItems: [
      { key: 'smm-editorial', label: 'Editorial calendar', allowed: (p) => p.can('smm-editorial') },
      { key: 'smm-ig', label: 'Instagram', allowed: (p) => p.can('smm-ig') },
      { key: 'smm-li', label: 'LinkedIn', allowed: (p) => p.can('smm-li') },
      { key: 'smm-other', label: 'Other templates', allowed: (p) => p.can('smm-other') },
      { key: 'smm-brand', label: 'Brand & design', allowed: (p) => p.can('smm-brand') },
      { key: 'smm-ads', label: 'Ads & spending', allowed: (p) => p.can('smm-ads') },
    ],
  },
  {
    key: 'operations', label: 'Operations', Icon: Globe,
    subItems: [
      { key: 'ops-fee', label: 'Membership fees', allowed: (p) => p.can('ops-fee') },
      { key: 'ops-treasury', label: 'Treasury', allowed: (p) => p.can('ops-treasury') },
      { key: 'ops-external', label: 'External relations', allowed: (p) => p.can('ops-external') },
      { key: 'ops-docs', label: 'Statute & documents', allowed: (p) => p.can('ops-docs') },
    ],
  },

  {
    key: 'website', label: 'Website', Icon: LayoutTemplate,
    subItems: [
      { key: 'website-pages', label: 'Pages', allowed: (p) => p.can('website-pages') },
      { key: 'website-readings', label: 'Readings', allowed: (p) => p.can('website-readings') },
      { key: 'website-testimonials', label: 'Testimonials', allowed: (p) => p.can('website-testimonials') },
      { key: 'ops-newsletter', label: 'Newsletter', allowed: (p) => p.can('ops-newsletter') },
      { key: 'ops-auto-emails', label: 'Automatic emails', allowed: (p) => p.can('ops-auto-emails') },
    ],
  },

  {
    key: 'settings', label: 'Settings', Icon: SettingsIcon,
    subItems: [
      { key: 'settings-users', label: 'Users', allowed: (p) => p.can('settings-users') },
      { key: 'settings-roles', label: 'Role permissions', allowed: (p) => p.can('settings-roles') },
      { key: 'settings-activity', label: 'Activity log', allowed: (p) => p.can('settings-activity') },
    ],
  },
  {
    key: 'welcome', label: 'How to use', Icon: HelpCircle,
    subItems: [],
  },
];

function filterNav(permissions: Permissions): NavSection[] {
  return NAV
    .map((s) => ({ ...s, subItems: s.subItems.filter((si) => !si.allowed || si.allowed(permissions)) }))
    .filter((s) => s.key === 'my-role' || s.key === 'welcome' || s.key === 'dashboard' || s.key === 'calendar' || s.subItems.length > 0);
}

// Candidates are hard-isolated: they may only ever reach their own profile and
// their application status. This is enforced here, plus by the render guard
// below, plus by row-level security in the database (defence in depth).
const CANDIDATE_NAV: NavSection[] = [
  { key: 'my-role', label: 'My profile', Icon: UserIcon, subItems: [] },
  {
    key: 'applications', label: 'My application', Icon: ClipboardList,
    subItems: [
      { key: 'applications-status', label: 'Status' },
      { key: 'applications-interview-calendar', label: 'Interview calendar' },
    ],
  },
];

// ──────────────────────────────────────────────────────────────────────────────
// Component
// ──────────────────────────────────────────────────────────────────────────────

const MinervaWorkspace = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user, isLoading: authLoading, signOut, session, isSessionExpired, roles, rolesLoaded, refreshProfile } = useAuth();
  const permissions = usePermissions();
  const access = useAccess();
  const isCandidate = access.isCandidate;
  const isDesktop = useIsDesktop();

  // Flag <html> while the workspace is mounted so the dark site backdrop
  // (and its black ::after) cannot show through Radix scroll-locks.
  useEffect(() => {
    document.documentElement.classList.add('ws-active');
    return () => document.documentElement.classList.remove('ws-active');
  }, []);

  // Shell state. On the first landing of a browser session we intentionally
  // show the fully expanded rail (with section names) so the user sees the
  // navigation surface once; the flag persists in sessionStorage so any later
  // navigation within the same session behaves as usual.
  const firstVisitRef = useRef(false);
  const [navExpanded, setNavExpanded] = useState(() => {
    if (typeof window === 'undefined') return true;
    try {
      const seen = sessionStorage.getItem('mims:ws:nav-first-seen');
      if (!seen) {
        sessionStorage.setItem('mims:ws:nav-first-seen', '1');
        firstVisitRef.current = true;
        return true;
      }
    } catch { /* sessionStorage unavailable */ }
    return true;
  });
  const [submenuOpen, setSubmenuOpen] = useState(true);
  const [activeSectionKey, setActiveSectionKey] = useState<string | null>(null);
  const [activeSubKey, setActiveSubKey] = useState<string | null>(null);

  const visibleNav = useMemo(
    () => (isCandidate ? CANDIDATE_NAV : filterNav(permissions)),
    [permissions, isCandidate],
  );

  // Set initial active section/sub-item
  useEffect(() => {
    if (!activeSectionKey && visibleNav.length > 0) {
      const first = visibleNav[0];
      setActiveSectionKey(first.key);
      setActiveSubKey(first.subItems[0]?.key ?? null);
      if (first.subItems.length === 0) setSubmenuOpen(false);
    }
  }, [visibleNav, activeSectionKey]);

  // Auto-collapse main nav rail when a submenu panel is shown, except on the
  // very first visit of the session — where the expanded rail stays visible
  // until the user interacts with it.
  useEffect(() => {
    if (firstVisitRef.current) { firstVisitRef.current = false; return; }
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
    title: '', date: '', place: '', moderator: '', guests: [''], description: '', poster_url: '', show_on_website: true,
  });
  const [isUploadingPoster, setIsUploadingPoster] = useState(false);
  const [eventsCurrentPage, setEventsCurrentPage] = useState(1);
  const [eventsYearFilter, setEventsYearFilter] = useState<number | 'all'>('all');
  const [eventsSearchQuery, setEventsSearchQuery] = useState('');
  const [eventsTypeFilter, setEventsTypeFilter] = useState<EventType | 'all'>('all');
  const [eventsWebsiteFilter, setEventsWebsiteFilter] = useState<'all' | 'on' | 'off'>('all');
  const [togglingWebsite, setTogglingWebsite] = useState<string | null>(null);
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
      // Candidates are allowed into a heavily restricted view; everyone with no
      // workspace role (members / pending) is sent to the holding page.
      if (!isAdminEmail && !isCandidate && !permissions.hasAnyAccess) {
        // Wait until roles are actually known: a just-confirmed candidate has an
        // empty roles array for a moment, and must NOT be flung to the
        // approval-pending page (applicants never need approval).
        if (!rolesLoaded) return;
        const isMemberOnly = roles.length > 0 && roles.every((r) => r.role === 'member' || r.role === 'pending');
        const hasNoRoles = roles.length === 0;
        if (isMemberOnly || hasNoRoles) {
          // Safety net: if this user actually has an application on file, they
          // are a candidate whose role just hasn't synced client-side yet.
          // Refresh roles and let the next render re-evaluate — do NOT trap
          // them on /pending-approval.
          (async () => {
            const { data: app } = await supabase
              .from('applications').select('id').eq('user_id', user.id).maybeSingle();
            if (app) { await refreshProfile(); return; }
            navigate('/pending-approval');
          })();
          return;
        }
        toast({ title: 'Access Denied', description: "You don't have permission to access the Minerva Workspace.", variant: 'destructive' });
        navigate('/');
        return;
      }
      if (!isCandidate) fetchEvents();
    }
  }, [user, authLoading, navigate, roles, rolesLoaded, permissions.hasAnyAccess, isCandidate, refreshProfile]);

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
      // The archive records every event type. Filter only by the controls below.
      if (eventsTypeFilter !== 'all' && (event.event_type ?? 'other') !== eventsTypeFilter) return false;
      if (eventsWebsiteFilter === 'on' && event.show_on_website === false) return false;
      if (eventsWebsiteFilter === 'off' && event.show_on_website !== false) return false;
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
  }, [events, eventsYearFilter, eventsSearchQuery, eventsTypeFilter, eventsWebsiteFilter]);

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

  useEffect(() => { setEventsCurrentPage(1); }, [eventsYearFilter, eventsSearchQuery, eventsTypeFilter, eventsWebsiteFilter]);

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
    setFormData({ title: '', date: '', place: '', moderator: '', guests: [''], description: '', poster_url: '', show_on_website: true });
    setEditingEvent(null);
  };
  const openEditDialog = (event: DbEvent) => {
    setEditingEvent(event);
    setFormData({
      title: event.title, date: event.date, place: event.place,
      moderator: event.moderator || '',
      guests: event.guest && event.guest.length > 0 ? event.guest : [''],
      description: event.description || '',
      poster_url: event.poster_url || '',
      show_on_website: event.show_on_website !== false,
    });
    setIsDialogOpen(true);
  };

  // Flip an event's website visibility straight from the archive list.
  const toggleWebsite = async (event: DbEvent, value: boolean) => {
    setTogglingWebsite(event.id);
    try {
      const { data, error } = await supabase.functions.invoke('admin-events', {
        body: {
          action: 'update',
          event: {
            id: event.id, title: event.title, date: event.date, place: event.place,
            moderator: event.moderator ?? null, guest: event.guest ?? null,
            description: event.description ?? null, poster_url: event.poster_url ?? null,
            event_type: event.event_type ?? 'other', division: event.division ?? null,
            start_at: event.start_at ?? null, end_at: event.end_at ?? null, online: event.online ?? false,
            registration_enabled: event.registration_enabled ?? false,
            registration_audience: event.registration_audience ?? 'members',
            show_on_website: value,
          },
        },
        headers: { Authorization: `Bearer ${session?.access_token}` },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      setEvents((prev) => prev.map((e) => (e.id === event.id ? { ...e, show_on_website: value } : e)));
    } catch (err) {
      toast({ title: 'Could not update', description: err instanceof Error ? err.message : undefined, variant: 'destructive' });
    } finally {
      setTogglingWebsite(null);
    }
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
        show_on_website: formData.show_on_website,
        // Preserve the event's type, schedule and registration settings on
        // edit — the archive dialog does not expose them, so without this an
        // update would reset them (event_type would fall back to "other").
        ...(editingEvent && {
          id: editingEvent.id,
          event_type: editingEvent.event_type ?? 'other',
          division: editingEvent.division ?? null,
          start_at: editingEvent.start_at ?? null,
          end_at: editingEvent.end_at ?? null,
          online: editingEvent.online ?? false,
          registration_enabled: editingEvent.registration_enabled ?? false,
          registration_audience: editingEvent.registration_audience ?? 'members',
        }),
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
    return <PageLoader />;
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

  if (!user || (!permissions.hasAnyAccess && !isCandidate)) return null;

  const primaryRoleAssignment = primaryAssignment(
    roles.map((r) => ({ role: r.role, division: r.division ?? null })),
  );
  const roleLabel = isCandidate
    ? 'Candidate'
    : primaryRoleAssignment
      ? composeRoleLabel(primaryRoleAssignment.role, primaryRoleAssignment.division)
      : 'No Role';

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

  const renderPlaceholder = (title: string, description: string) => (
    <div>
      <WorkspacePageHeader title={title} description={description} />
      <div className="py-12 text-center">
        <p className="font-body text-muted-foreground">Coming soon.</p>
      </div>
    </div>
  );

  const renderContent = () => {
    // Hard guard: a candidate can only ever render their profile or status.
    if (isCandidate) {
      if (activeSubKey === 'applications-status') return <ApplicationStatus />;
      if (activeSubKey === 'applications-interview-calendar') return <InterviewCalendarCandidate />;
      return <MyProfile />;
    }
    if (activeSectionKey === 'my-role') return <MyProfile />;
    if (activeSectionKey === 'welcome') {
      return <HowToUse />;
    }
    if (activeSectionKey === 'dashboard') {
      return <WorkspaceDashboard onNavigate={(section, sub) => { setActiveSectionKey(section); setActiveSubKey(sub); }} />;
    }
    if (activeSectionKey === 'calendar' && !activeSubKey) {
      return <WorkspaceCalendar onNavigate={(section, sub) => { setActiveSectionKey(section); setActiveSubKey(sub); }} />;
    }
    if (!activeSubKey) return null;
    switch (activeSubKey) {
      case 'reports-upload':
        return <ReportUpload />;
      case 'reports-archive':
        return <FileManagement allowedDivisions={permissions.allowedDivisions} />;
      case 'reports-templates':
        return <ResourceManager
          category="reports_templates"
          title="Templates & repositories"
          description="Useful division material: text, files, links and code repositories. Star up to five favourites to pin them on top; each item shows who added it and when."
          restrictDivisions={access.allowedDivisions}
          canViewOtherDivisions={access.canViewOtherDivisions}
          canManage={access.canManage('reports-templates')}
        />;
      case 'reports-funds':
        return <FundsPerformances />;
      case 'people-members':
        return <MembersManagement />;
      case 'people-advisors':
        return <MembersManagement silentAdvisors />;
      case 'people-alumni':
        return <AlumniManagement />;
      case 'events-create':
        return <EventCreate />;
      case 'events-forms':
        return <EventForms />;
      case 'events-attendance':
        return <EventAttendance />;
      case 'events-alumni-calls':
        return <AlumniCalls />;
      case 'events-on-display':
        return <AssociationOnDisplay />;
      case 'events-archive':
        return renderEventsManagement();
      case 'applications-website':
        return <ApplicationSettings />;
      case 'applications-screening':
        return <CandidatesManagement />;
      case 'applications-joiners':
        return <NewJoiners />;
      case 'applications-form':
        // "Form & settings" now also holds the division application Questions.
        return <div className="grid grid-cols-1 xl:grid-cols-2 gap-x-14 gap-y-12 items-start"><FormSettings /><QuestionsManagement /></div>;
      case 'applications-status':
        return <ApplicationStatus />;
      case 'applications-interview-calendar':
        return <InterviewCalendar />;
      case 'website-readings':
        return <ReadingsManagement />;
      case 'website-testimonials':
        return <TestimonialsManagement />;
      case 'settings-users':
        return <UserManagement />;
      case 'settings-roles':
        return <RolePermissionsTable />;
      case 'settings-activity':
        return <ActivityManagement />;
      case 'smm-editorial':
        return <EditorialCalendar />;
      case 'smm-ads':
        return <AdsRegister />;
      case 'smm-ig':
        return <ResourceManager category="smm_instagram" title="Instagram" description="Reusable Instagram material: text, files, links and code. Star up to five favourites to pin them on top." divisions={['none']} />;
      case 'smm-li':
        return <ResourceManager category="smm_linkedin" title="LinkedIn" description="Reusable LinkedIn material: text, files, links and code. Star up to five favourites to pin them on top." divisions={['none']} />;
      case 'smm-other':
        return <ResourceManager category="smm_other" title="Other templates" description="Other reusable communication material: text, files, links and code." divisions={['none']} />;
      case 'smm-brand':
        return <ResourceManager category="smm_brand" title="Brand & design" description="The association's visual identity: fonts, colours, logo usage, visual style, tone and design rules. Star the key references to pin them on top (up to five)." divisions={['none']} />;
      case 'ops-fee':
        return <MembershipFee />;
      case 'ops-treasury':
        return <Treasury />;
      case 'ops-external':
        return <ResourceManager category="external_relations" title="External relations" description="A flexible repository for external relationships: text, files, links and code. Star up to five favourites to pin them on top." divisions={['none']} />;
      case 'ops-auto-emails':
        return <AutoEmails />;
      case 'ops-docs':
        return <ResourceManager category="operations_statuto" title="Statute and important documents" description="Official association documents: the statute (PDF/Word), drafts, university and CASA approval documents, and the Statute Bible. Star up to five favourites to pin them on top." divisions={['none']} />;
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
        description="Every event of every type: meetings, calls, division and guest events. Each row shows its type and whether it is published on the public website; use the toggle to publish or hide it."
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
                    { key: 'event_type', header: 'Type' },
                    { key: 'show_on_website', header: 'On website' },
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
          {/* Event creation moved to Events → Create. This dialog edits existing events. */}
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
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
                <div className="flex items-center justify-between gap-4 rounded-lg border border-separator p-3">
                  <div>
                    <Label className="font-body">Show on the public website</Label>
                    <p className="text-xs text-muted-foreground font-body">When on, this event appears on the public Events page. Turn off for internal events (meetings, calls).</p>
                  </div>
                  <Switch checked={formData.show_on_website} onCheckedChange={(v) => setFormData({ ...formData, show_on_website: v })} />
                </div>
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
              className="bg-background border border-separator px-3 h-10 min-w-[130px]" style={{ fontFamily: '"Times New Roman", Times, serif' }}>
              <option value="all">All Years</option>
              {eventsYears.map((y) => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>
          <div>
            <label className="font-body text-xs text-muted-foreground uppercase tracking-wider block mb-2">Type</label>
            <select value={eventsTypeFilter} onChange={(e) => setEventsTypeFilter(e.target.value as EventType | 'all')}
              className="bg-background border border-separator px-3 h-10 min-w-[150px]" style={{ fontFamily: '"Times New Roman", Times, serif' }}>
              <option value="all">All types</option>
              {(Object.keys(EVENT_TYPE_LABELS) as EventType[]).map((t) => <option key={t} value={t}>{EVENT_TYPE_LABELS[t]}</option>)}
            </select>
          </div>
          <div>
            <label className="font-body text-xs text-muted-foreground uppercase tracking-wider block mb-2">Website</label>
            <select value={eventsWebsiteFilter} onChange={(e) => setEventsWebsiteFilter(e.target.value as 'all' | 'on' | 'off')}
              className="bg-background border border-separator px-3 h-10 min-w-[140px]" style={{ fontFamily: '"Times New Roman", Times, serif' }}>
              <option value="all">All events</option>
              <option value="on">On the website</option>
              <option value="off">Not on the website</option>
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
        <WorkspaceLoader />
      ) : events.length === 0 ? (
        <Card><CardContent className="py-12 text-center"><p className="font-body text-muted-foreground">No events yet. Click "Add Event" to create one.</p></CardContent></Card>
      ) : filteredEvents.length === 0 ? (
        <Card><CardContent className="py-12 text-center"><p className="font-body text-muted-foreground">No events match the current filters.</p></CardContent></Card>
      ) : (
        <>
          <div className="space-y-0">
            {paginatedEvents.map((event, index) => {
              const onWeb = event.show_on_website !== false;
              const isPdf = (event.poster_url || '').toLowerCase().endsWith('.pdf');
              const typeLabel = EVENT_TYPE_LABELS[(event.event_type as EventType) ?? 'other'] ?? 'Other';
              return (
                <div key={event.id} className={`flex items-start gap-3 py-3 ${index !== paginatedEvents.length - 1 ? 'border-b border-separator' : ''}`}>
                  {/* Compact poster thumbnail */}
                  {event.poster_url ? (
                    isPdf ? (
                      <div className="w-24 h-32 shrink-0 border border-separator bg-muted flex items-center justify-center"><span className="font-serif text-xs">PDF</span></div>
                    ) : (
                      <img src={event.poster_url} alt="" className="w-24 h-32 shrink-0 object-cover border border-separator" />
                    )
                  ) : (
                    <div className="w-24 h-32 shrink-0 border border-separator bg-muted/40 flex items-center justify-center"><ImageIcon className="h-6 w-6 text-muted-foreground" /></div>
                  )}
                  {/* Details */}
                  <div className="flex-1 min-w-0 font-body">
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      <span className="text-[11px] px-1.5 py-0.5 rounded bg-accent/10 text-accent">{typeLabel}</span>
                      <span className={`inline-flex items-center gap-1 text-[11px] px-1.5 py-0.5 rounded ${onWeb ? 'bg-emerald-50 text-emerald-700' : 'bg-muted text-muted-foreground'}`}>
                        <Globe className="h-3 w-3" />{onWeb ? 'On website' : 'Not on website'}
                      </span>
                    </div>
                    <h3 className="font-serif text-lg text-foreground truncate">{event.title}</h3>
                    <div className="text-xs text-muted-foreground">
                      {new Date(event.date).toLocaleDateString(undefined, { day: 'numeric', month: 'long', year: 'numeric' })} · {event.place}
                    </div>
                    {(event.moderator || (event.guest && event.guest.length > 0)) && (
                      <div className="text-xs text-muted-foreground mt-1 truncate">
                        {event.moderator && <>Moderator: {event.moderator}</>}
                        {event.moderator && event.guest && event.guest.length > 0 && ' · '}
                        {event.guest && event.guest.length > 0 && <>Guest{event.guest.length > 1 ? 's' : ''}: {event.guest.join(', ')}</>}
                      </div>
                    )}
                  </div>
                  {/* Actions */}
                  <div className="flex items-center gap-2 shrink-0">
                    <div className="flex items-center gap-1.5 mr-1" title="Show on the public website"><HelpDot page="events-archive" topic="website-toggle" />
                      {togglingWebsite === event.id && <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />}
                      <Switch checked={onWeb} disabled={togglingWebsite === event.id} onCheckedChange={(v) => toggleWebsite(event, v)} />
                    </div>
                    <Button variant="outline" size="icon" onClick={() => openEditDialog(event)}><Edit className="h-4 w-4" /></Button>
                    <Button variant="destructive" size="icon" onClick={() => handleDelete(event.id)}><Trash2 className="h-4 w-4" /></Button>
                  </div>
                </div>
              );
            })}
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
    <div className={`ws-flat ${shellHeight} w-full flex bg-background overflow-hidden`}>
      <ContactPrompt onGoToProfile={() => { setActiveSectionKey('my-role'); setActiveSubKey(null); }} />
      {/* Nav column */}
      <aside
        className="minerva-nav flex flex-col bg-accent text-accent-foreground transition-[width] duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] shrink-0 overflow-hidden"
        style={{ width: navExpanded ? 240 : 72 }}
      >
        {/* Logo */}
        <div className="shrink-0 flex items-center justify-center px-4 h-20">
          <Link to="/" title="Return to homepage" className="flex items-center justify-center">
            <img src={logoWhite} alt="Minerva - Return to homepage" className="h-14 w-14 shrink-0" />
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
                className={`group w-full flex items-center gap-3 px-4 h-14 text-left transition-colors tracking-wide ${
                  isActive ? 'bg-background/15' : 'hover:bg-background/10'
                } ${navExpanded ? '' : 'justify-center'}`}
                style={{ fontFamily: '"Times New Roman", Times, serif' }}
              >
                <section.Icon className="h-6 w-6 shrink-0" />
                <span
                  className={`text-lg whitespace-nowrap transition-opacity duration-200 ${
                    navExpanded ? 'opacity-100' : 'opacity-0 pointer-events-none w-0 overflow-hidden'
                  }`}
                >
                  {section.label}
                </span>
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
            {navExpanded && <span className="text-sm opacity-80 tracking-wide">{"\n\n"}</span>}
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
              className="text-base"
              onClick={() => navigate('/')}
              style={{ fontFamily: '"Times New Roman", Times, serif' }}
            >
              <Globe className="h-4 w-4 mr-2" />Return to Website
            </Button>
            <Button
              variant="outline"
              className="text-base"
              onClick={async () => { await signOut(); navigate('/'); }}
              style={{ fontFamily: '"Times New Roman", Times, serif' }}
            >
              <LogOut className="h-4 w-4 mr-2" />Log Out
            </Button>
          </div>
        </div>

        {/* Body row */}
        <div className="flex-1 min-h-0 flex">
          {/* Submenu panel */}
          <div
            className="bg-muted/30 border-r border-separator overflow-hidden transition-[width] duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] shrink-0"
            style={{ width: submenuOpen && activeSection && activeSection.subItems.length > 0 ? 240 : 0 }}

          >
            {activeSection && activeSection.subItems.length > 0 && (
              <div className="w-[240px] h-full flex flex-col">
                <div className="shrink-0 h-14 flex items-center justify-between px-4">
                  <h3 className="font-serif text-[19px] text-accent tracking-wide">{activeSection.label}</h3>
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
                        className={`w-full text-left px-4 h-11 flex items-center transition-colors text-[17px] ${
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

            {/* Scrollable content. `relative` so the workspace loader can fill
                and centre within exactly this pane (the portion that loads). */}
            <div className="flex-1 overflow-y-auto px-6 py-6 relative">
              <HelpProvider>
                {renderContent()}
                {/* Contextual help entry point for the page being viewed. */}
                {!isCandidate && <PageHelpButton page={activeSubKey ?? activeSectionKey ?? ''} />}
              </HelpProvider>
            </div>
          </div>
        </div>
      </div>
    </div>
    </>
  );
};

export default MinervaWorkspace;
