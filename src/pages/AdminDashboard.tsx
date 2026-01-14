import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Plus, Edit, Trash2, LogOut, X, Calendar, FileText, Users, GraduationCap, UserCog, Loader2, Settings, ChevronLeft, ChevronRight, MoreHorizontal, BookOpen } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { EventsListNew } from '@/components/shared/EventsListNew';
import FileManagement from '@/components/admin/FileManagement';
import TeamManagement from '@/components/admin/TeamManagement';
import AlumniManagement from '@/components/admin/AlumniManagement';
import UserManagement from '@/components/admin/UserManagement';
import ApplicationSettings from '@/components/admin/ApplicationSettings';
import ReadingsManagement from '@/components/admin/ReadingsManagement';
import { useAuth } from '@/contexts/AuthContext';
import { usePermissions } from '@/hooks/usePermissions';

// Role-based dashboard icons
import dashboardIconAdmin from '@/assets/dashboard-icon-admin.svg';
import dashboardIconMacro from '@/assets/dashboard-icon-macro.svg';
import dashboardIconInvestment from '@/assets/dashboard-icon-investment.svg';
import dashboardIconQuant from '@/assets/dashboard-icon-quant.svg';
import dashboardIconEquity from '@/assets/dashboard-icon-equity.svg';
import dashboardIconPortfolio from '@/assets/dashboard-icon-portfolio.svg';
import dashboardIconPM from '@/assets/dashboard-icon-pm.svg';
import dashboardIconOpsMedia from '@/assets/dashboard-icon-ops-media.svg';

interface DbEvent {
  id: string;
  title: string;
  date: string;
  place: string;
  moderator?: string | null;
  guest?: string[] | null;
  description?: string | null;
  created_at: string;
  updated_at: string;
}

const AdminDashboard = () => {
  const [events, setEvents] = useState<DbEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<DbEvent | null>(null);
  const [formData, setFormData] = useState({
    title: '',
    date: '',
    place: '',
    moderator: '',
    guests: [''],
    description: '',
  });
  const [eventsCurrentPage, setEventsCurrentPage] = useState(1);
  const EVENTS_PER_PAGE = 15;
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user, isLoading: authLoading, signOut, session, isSessionExpired, roles } = useAuth();
  const permissions = usePermissions();

  // Handle session expiry
  useEffect(() => {
    if (isSessionExpired) {
      toast({
        title: "Session Expired",
        description: "Your session has expired. Please log in again.",
        variant: "destructive",
      });
      signOut().then(() => {
        navigate('/auth', { state: { from: '/admin', sessionExpired: true } });
      });
    }
  }, [isSessionExpired, signOut, navigate, toast]);

  useEffect(() => {
    if (!authLoading) {
      if (!user) {
        navigate('/auth', { state: { from: '/admin' } });
        return;
      }
      
      // Check if user is only a member (pending approval) or has no roles
      // Skip this check for admin email
      const isAdminEmail = user.email === 'as.minerva@unibocconi.it';
      const isMemberOnly = roles.length > 0 && roles.every(r => r.role === 'member');
      const hasNoRoles = roles.length === 0;
      
      if (!isAdminEmail && (isMemberOnly || hasNoRoles)) {
        navigate('/pending-approval');
        return;
      }
      
      // Check if user has any dashboard access
      if (!permissions.hasAnyAccess) {
        toast({
          title: "Access Denied",
          description: "You don't have permission to access the admin dashboard.",
          variant: "destructive",
        });
        navigate('/');
        return;
      }
      fetchEvents();
    }
  }, [user, authLoading, navigate, roles, permissions.hasAnyAccess]);

  const fetchEvents = async () => {
    try {
      const { data, error } = await supabase
        .from('events')
        .select('*')
        .order('date', { ascending: false });

      if (error) throw error;
      setEvents(data || []);
    } catch (error) {
      console.error('Error fetching events:', error);
      toast({
        title: "Error",
        description: "Failed to fetch events",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Events pagination logic
  const eventsTotalPages = Math.ceil(events.length / EVENTS_PER_PAGE);
  const eventsStartIndex = (eventsCurrentPage - 1) * EVENTS_PER_PAGE;
  const paginatedEvents = useMemo(() => 
    events.slice(eventsStartIndex, eventsStartIndex + EVENTS_PER_PAGE),
    [events, eventsStartIndex, EVENTS_PER_PAGE]
  );

  const handleEventsPageChange = (page: number) => {
    setEventsCurrentPage(page);
  };

  const getEventsPageNumbers = () => {
    const pages: (number | 'ellipsis')[] = [];
    if (eventsTotalPages <= 7) {
      for (let i = 1; i <= eventsTotalPages; i++) pages.push(i);
    } else {
      pages.push(1);
      if (eventsCurrentPage > 3) pages.push('ellipsis');
      for (let i = Math.max(2, eventsCurrentPage - 1); i <= Math.min(eventsTotalPages - 1, eventsCurrentPage + 1); i++) {
        pages.push(i);
      }
      if (eventsCurrentPage < eventsTotalPages - 2) pages.push('ellipsis');
      pages.push(eventsTotalPages);
    }
    return pages;
  };

  const handleLogout = async () => {
    await signOut();
    navigate('/auth');
  };

  const resetForm = () => {
    setFormData({
      title: '',
      date: '',
      place: '',
      moderator: '',
      guests: [''],
      description: '',
    });
    setEditingEvent(null);
  };

  const openCreateDialog = () => {
    resetForm();
    setIsDialogOpen(true);
  };

  const openEditDialog = (event: DbEvent) => {
    setEditingEvent(event);
    setFormData({
      title: event.title,
      date: event.date,
      place: event.place,
      moderator: event.moderator || '',
      guests: event.guest && event.guest.length > 0 ? event.guest : [''],
      description: event.description || '',
    });
    setIsDialogOpen(true);
  };

  const addGuestField = () => {
    setFormData({ ...formData, guests: [...formData.guests, ''] });
  };

  const removeGuestField = (index: number) => {
    if (formData.guests.length > 1) {
      const newGuests = formData.guests.filter((_, i) => i !== index);
      setFormData({ ...formData, guests: newGuests });
    }
  };

  const updateGuest = (index: number, value: string) => {
    const newGuests = [...formData.guests];
    newGuests[index] = value;
    setFormData({ ...formData, guests: newGuests });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.title.trim() || !formData.date || !formData.place.trim()) {
      toast({
        title: "Error",
        description: "Title, date, and place are required",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const action = editingEvent ? 'update' : 'create';
      const filteredGuests = formData.guests.filter(g => g.trim() !== '');
      
      const eventData = {
        title: formData.title,
        date: formData.date,
        place: formData.place,
        moderator: formData.moderator || null,
        guest: filteredGuests.length > 0 ? filteredGuests : null,
        description: formData.description || null,
        ...(editingEvent && { id: editingEvent.id }),
      };

      const { data, error } = await supabase.functions.invoke('admin-events', {
        body: { action, event: eventData },
        headers: {
          Authorization: `Bearer ${session?.access_token}`,
        },
      });

      if (error) throw error;

      if (data.error) {
        toast({
          title: "Error",
          description: data.error,
          variant: "destructive",
        });
        return;
      }

      toast({
        title: "Success",
        description: `Event ${editingEvent ? 'updated' : 'created'} successfully`,
      });

      setIsDialogOpen(false);
      resetForm();
      fetchEvents();
    } catch (error) {
      console.error('Submit error:', error);
      toast({
        title: "Error",
        description: "Failed to save event",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (eventId: string) => {
    if (!confirm('Are you sure you want to delete this event?')) return;

    try {
      const { data, error } = await supabase.functions.invoke('admin-events', {
        body: { action: 'delete', event: { id: eventId } },
        headers: {
          Authorization: `Bearer ${session?.access_token}`,
        },
      });

      if (error) throw error;

      if (data.error) {
        toast({
          title: "Error",
          description: data.error,
          variant: "destructive",
        });
        return;
      }

      toast({
        title: "Success",
        description: "Event deleted successfully",
      });

      fetchEvents();
    } catch (error) {
      console.error('Delete error:', error);
      toast({
        title: "Error",
        description: "Failed to delete event",
        variant: "destructive",
      });
    }
  };

  if (authLoading || isLoading) {
    return (
      <div className="container py-section-sm md:py-section flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!user || !permissions.hasAnyAccess) {
    return null;
  }

  // Determine default tab based on permissions
  const getDefaultTab = () => {
    if (permissions.canAccessUsers) return 'users';
    if (permissions.canAccessAlumni) return 'alumni';
    if (permissions.canAccessEvents) return 'events';
    if (permissions.canAccessFiles) return 'files';
    if (permissions.canAccessTeam) return 'team';
    if (permissions.canAccessReadings) return 'readings';
    return 'events';
  };

  // Get user's primary role for display
  const getUserRoleLabel = () => {
    if (!roles.length) return 'No Role';
    const roleLabels: Record<string, string> = {
      admin: 'Admin',
      president: 'President',
      vice_president: 'Vice President',
      head_of_asset_management: 'Head of Asset Management',
      head_of_equity: 'Head of Equity Research',
      head_of_investment: 'Head of Investment Research',
      head_of_macro: 'Head of Macro Research',
      head_of_portfolio: 'Head of Portfolio Management',
      head_of_quant: 'Head of Quantitative Research',
      head_of_operations: 'Head of Operations',
      head_of_media: 'Head of Media',
      member: 'Member',
    };
    // Get the highest priority role
    const priorityOrder: string[] = ['president', 'vice_president', 'admin', 'head_of_asset_management', 
      'head_of_operations', 'head_of_media', 'head_of_equity', 'head_of_investment', 
      'head_of_macro', 'head_of_portfolio', 'head_of_quant', 'portfolio_manager', 'member'];
    const userRoleNames: string[] = roles.map(r => r.role);
    const primaryRole = priorityOrder.find(r => userRoleNames.includes(r)) || String(roles[0].role);
    return roleLabels[primaryRole] || primaryRole;
  };

  // Get the appropriate dashboard icon based on user roles
  const getDashboardIcon = () => {
    const userRoleNames = roles.map(r => r.role);
    
    // Admin, president, vice_president, head_of_asset_management
    if (userRoleNames.some(r => ['admin', 'president', 'vice_president', 'head_of_asset_management'].includes(r))) {
      return dashboardIconAdmin;
    }
    // Head of operations or head of media
    if (userRoleNames.some(r => ['head_of_operations', 'head_of_media'].includes(r))) {
      return dashboardIconOpsMedia;
    }
    // Division heads
    if (userRoleNames.includes('head_of_macro')) return dashboardIconMacro;
    if (userRoleNames.includes('head_of_investment')) return dashboardIconInvestment;
    if (userRoleNames.includes('head_of_quant')) return dashboardIconQuant;
    if (userRoleNames.includes('head_of_equity')) return dashboardIconEquity;
    if (userRoleNames.includes('head_of_portfolio')) return dashboardIconPortfolio;
    if (userRoleNames.includes('portfolio_manager')) return dashboardIconPM;
    
    return null;
  };

  const dashboardIcon = getDashboardIcon();

  return (
    <div className="container py-section-sm md:py-section">
      {/* Header */}
      <div className="flex items-center justify-between mb-10 pb-6 border-b border-separator">
        <div className="flex items-center gap-6">
          {dashboardIcon && (
            <div className="flex items-center">
              <img 
                src={dashboardIcon} 
                alt="Dashboard icon" 
                className="h-[6.75rem] w-[6.75rem] md:h-[7.875rem] md:w-[7.875rem]"
              />
            </div>
          )}
          <div className="flex flex-col">
            <h1 className="font-serif text-display text-accent mb-2">Dashboard</h1>
            <p className="font-body text-muted-foreground text-lg">
              {user.email}
            </p>
            <span 
              className="text-xl font-medium text-accent italic mt-2"
              style={{ fontFamily: '"Times New Roman", Times, serif' }}
            >
              {getUserRoleLabel()}
            </span>
          </div>
        </div>
        <Button 
          variant="outline" 
          onClick={handleLogout} 
          className="font-body border-accent text-accent hover:bg-accent hover:text-accent-foreground transition-all"
        >
          <LogOut className="h-4 w-4 mr-2" />
          Logout
        </Button>
      </div>

      {/* Tabs */}
      <Tabs defaultValue={getDefaultTab()} className="w-full">
        <TabsList className="mb-8">
          {permissions.canAccessUsers && (
            <TabsTrigger value="users" className="uppercase" style={{ fontFamily: '"Times New Roman", Times, serif', fontVariant: 'small-caps' }}>
              <UserCog className="h-4 w-4 mr-2" />
              Users
            </TabsTrigger>
          )}
          {permissions.canAccessAlumni && (
            <TabsTrigger value="alumni" className="uppercase" style={{ fontFamily: '"Times New Roman", Times, serif', fontVariant: 'small-caps' }}>
              <GraduationCap className="h-4 w-4 mr-2" />
              Alumni
            </TabsTrigger>
          )}
          {permissions.canAccessEvents && (
            <TabsTrigger value="events" className="uppercase" style={{ fontFamily: '"Times New Roman", Times, serif', fontVariant: 'small-caps' }}>
              <Calendar className="h-4 w-4 mr-2" />
              Events
            </TabsTrigger>
          )}
          {permissions.canAccessFiles && (
            <TabsTrigger value="files" className="uppercase" style={{ fontFamily: '"Times New Roman", Times, serif', fontVariant: 'small-caps' }}>
              <FileText className="h-4 w-4 mr-2" />
              Archive Files
            </TabsTrigger>
          )}
          {permissions.canAccessTeam && (
            <TabsTrigger value="team" className="uppercase" style={{ fontFamily: '"Times New Roman", Times, serif', fontVariant: 'small-caps' }}>
              <Users className="h-4 w-4 mr-2" />
              Team
            </TabsTrigger>
          )}
          {permissions.canAccessSettings && (
            <TabsTrigger value="settings" className="uppercase" style={{ fontFamily: '"Times New Roman", Times, serif', fontVariant: 'small-caps' }}>
              <FileText className="h-4 w-4 mr-2" />
              Applications
            </TabsTrigger>
          )}
          {permissions.canAccessReadings && (
            <TabsTrigger value="readings" className="uppercase" style={{ fontFamily: '"Times New Roman", Times, serif', fontVariant: 'small-caps' }}>
              <BookOpen className="h-4 w-4 mr-2" />
              Readings
            </TabsTrigger>
          )}
        </TabsList>

        {permissions.canAccessUsers && (
          <TabsContent value="users">
            <UserManagement />
          </TabsContent>
        )}

        {permissions.canAccessAlumni && (
          <TabsContent value="alumni">
            <AlumniManagement />
          </TabsContent>
        )}

        {permissions.canAccessEvents && (
          <TabsContent value="events">
            {/* Events Header */}
            <div className="flex items-center justify-between mb-8">
              <h2 className="font-serif text-heading text-accent">Events Management</h2>
              <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogTrigger asChild>
                  <Button onClick={openCreateDialog} className="font-body">
                    <Plus className="h-4 w-4 mr-2" />
                    Add Event
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle className="font-serif">
                      {editingEvent ? 'Edit Event' : 'Add New Event'}
                    </DialogTitle>
                  </DialogHeader>
                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="title" className="font-body">Title *</Label>
                      <Input
                        id="title"
                        value={formData.title}
                        onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                        placeholder="Event title"
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
                      <Label htmlFor="place" className="font-body">Place *</Label>
                      <Input
                        id="place"
                        value={formData.place}
                        onChange={(e) => setFormData({ ...formData, place: e.target.value })}
                        placeholder="Event location"
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="moderator" className="font-body">Moderator (optional)</Label>
                      <Input
                        id="moderator"
                        value={formData.moderator}
                        onChange={(e) => setFormData({ ...formData, moderator: e.target.value })}
                        placeholder="e.g., John Smith, CEO at Company"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="font-body">Guests (optional)</Label>
                      {formData.guests.map((guest, index) => (
                        <div key={index} className="flex gap-2">
                          <Input
                            value={guest}
                            onChange={(e) => updateGuest(index, e.target.value)}
                            placeholder={`Guest ${index + 1}, e.g., Jane Doe, Partner at Firm`}
                          />
                          {formData.guests.length > 1 && (
                            <Button
                              type="button"
                              variant="outline"
                              size="icon"
                              onClick={() => removeGuestField(index)}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      ))}
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={addGuestField}
                        className="font-body"
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        Add another guest
                      </Button>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="description" className="font-body">Description (optional)</Label>
                      <Textarea
                        id="description"
                        value={formData.description}
                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                        placeholder="Event description"
                        rows={3}
                      />
                    </div>
                    {isSubmitting && (
                      <div className="space-y-2">
                        <Progress value={100} className="h-1 animate-pulse" />
                        <p className="text-xs text-muted-foreground text-center font-body">Saving event...</p>
                      </div>
                    )}
                    <div className="flex gap-4 pt-4">
                      <Button type="submit" className="flex-1 font-body" disabled={isSubmitting}>
                        {isSubmitting ? (
                          <>
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            Saving...
                          </>
                        ) : (editingEvent ? 'Update Event' : 'Create Event')}
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
            </div>

            {/* Results count */}
            <p className="font-body text-small text-muted-foreground mb-6">
              Showing {paginatedEvents.length} of {events.length} {events.length === 1 ? 'event' : 'events'}
              {eventsTotalPages > 1 && ` (page ${eventsCurrentPage} of ${eventsTotalPages})`}
            </p>

            {/* Events List */}
            {events.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <p className="font-body text-muted-foreground">
                    No events yet. Click "Add Event" to create one.
                  </p>
                </CardContent>
              </Card>
            ) : (
              <>
                <div className="space-y-0">
                  {paginatedEvents.map((event, index) => (
                    <div 
                      key={event.id}
                      className={`py-8 ${index !== paginatedEvents.length - 1 ? 'border-b border-separator' : ''}`}
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <EventsListNew events={[event]} />
                        </div>
                        
                        {/* Actions */}
                        <div className="flex gap-2 pt-8">
                          <Button
                            variant="outline"
                            size="icon"
                            onClick={() => openEditDialog(event)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="destructive"
                            size="icon"
                            onClick={() => handleDelete(event.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Pagination */}
                {eventsTotalPages > 1 && (
                  <nav className="flex justify-center mt-8" aria-label="Events Pagination">
                    <ul className="flex items-center gap-1">
                      <li>
                        <button
                          onClick={() => handleEventsPageChange(eventsCurrentPage - 1)}
                          disabled={eventsCurrentPage === 1}
                          className="flex items-center gap-1 px-3 py-2 font-body text-sm border border-separator rounded hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed"
                          aria-label="Go to previous page"
                        >
                          <ChevronLeft className="h-4 w-4" />
                          Previous
                        </button>
                      </li>
                      {getEventsPageNumbers().map((page, index) => (
                        <li key={index}>
                          {page === 'ellipsis' ? (
                            <span className="flex h-9 w-9 items-center justify-center" aria-hidden>
                              <MoreHorizontal className="h-4 w-4" />
                            </span>
                          ) : (
                            <button
                              onClick={() => handleEventsPageChange(page)}
                              className={`h-9 w-9 font-body text-sm border rounded ${
                                eventsCurrentPage === page
                                  ? 'border-primary bg-primary text-primary-foreground'
                                  : 'border-separator hover:bg-muted'
                              }`}
                              aria-current={eventsCurrentPage === page ? 'page' : undefined}
                            >
                              {page}
                            </button>
                          )}
                        </li>
                      ))}
                      <li>
                        <button
                          onClick={() => handleEventsPageChange(eventsCurrentPage + 1)}
                          disabled={eventsCurrentPage === eventsTotalPages}
                          className="flex items-center gap-1 px-3 py-2 font-body text-sm border border-separator rounded hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed"
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
          </TabsContent>
        )}

        {permissions.canAccessFiles && (
          <TabsContent value="files">
            <FileManagement allowedDivisions={permissions.allowedDivisions} />
          </TabsContent>
        )}

        {permissions.canAccessTeam && (
          <TabsContent value="team">
            <TeamManagement 
              allowedDivisions={permissions.allowedDivisions} 
              isFullAccess={permissions.isFullAccess}
            />
          </TabsContent>
        )}

        {permissions.canAccessSettings && (
          <TabsContent value="settings">
            <ApplicationSettings />
          </TabsContent>
        )}

        {permissions.canAccessReadings && (
          <TabsContent value="readings">
            <ReadingsManagement />
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
};

export default AdminDashboard;
