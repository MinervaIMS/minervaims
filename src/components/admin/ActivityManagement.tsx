import { useState, useEffect, useMemo } from 'react';
import { format } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Loader2, User, Download } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from '@/components/ui/pagination';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { downloadCSV } from '@/lib/download-utils';
import { cn } from '@/lib/utils';

interface ActivityLog {
  id: string;
  user_id: string;
  user_email: string;
  user_role: string;
  action: string;
  entity_type: string;
  entity_id: string | null;
  entity_name: string | null;
  details: unknown;
  created_at: string;
}

const ACTIVITIES_PER_PAGE = 25;

// Action labels for display
const actionLabels: Record<string, string> = {
  create: 'Created',
  update: 'Updated',
  delete: 'Deleted',
  reorder: 'Reordered',
};

// Entity type labels
const entityLabels: Record<string, string> = {
  event: 'event',
  alumnus: 'alumnus',
  file: 'file',
  team_member: 'team member',
  reading: 'reading',
};

// Section labels for filter
const sectionLabels: Record<string, string> = {
  event: 'Events',
  alumnus: 'Alumni',
  file: 'Files',
  team_member: 'Team',
  reading: 'Readings',
};

// Role labels for display
const roleLabels: Record<string, string> = {
  admin: 'Admin',
  president: 'President',
  vice_president: 'Vice President',
  head_of_asset_management: 'Head of Asset Management',
  head_of_equity: 'Head of Equity',
  head_of_investment: 'Head of Investment',
  head_of_macro: 'Head of Macro',
  head_of_portfolio: 'Head of Portfolio',
  head_of_quant: 'Head of Quant',
  head_of_operations: 'Head of Operations',
  head_of_media: 'Head of Media',
  portfolio_manager: 'Portfolio Manager',
  member: 'Member',
};

export default function ActivityManagement() {
  const [activities, setActivities] = useState<ActivityLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [actionFilter, setActionFilter] = useState<string>('all');
  const [sectionFilter, setSectionFilter] = useState<string>('all');
  const [startDate, setStartDate] = useState<Date | undefined>(undefined);
  const [endDate, setEndDate] = useState<Date | undefined>(undefined);
  const [userFilter, setUserFilter] = useState<string>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const { toast } = useToast();

  // Get unique users for filter dropdown
  const uniqueUsers = useMemo(() => {
    const userMap = new Map<string, { id: string; email: string; name: string }>();
    activities.forEach((activity) => {
      if (!userMap.has(activity.user_id)) {
        // Extract name from email or use email as fallback
        const emailParts = activity.user_email.split('@')[0];
        const nameParts = emailParts.split('.');
        const displayName = nameParts.length >= 2 
          ? `${nameParts[0].charAt(0).toUpperCase() + nameParts[0].slice(1)} ${nameParts[1].charAt(0).toUpperCase() + nameParts[1].slice(1)}`
          : emailParts;
        userMap.set(activity.user_id, {
          id: activity.user_id,
          email: activity.user_email,
          name: displayName,
        });
      }
    });
    return Array.from(userMap.values()).sort((a, b) => a.name.localeCompare(b.name));
  }, [activities]);

  useEffect(() => {
    fetchActivities();
  }, []);

  const fetchActivities = async () => {
    try {
      const { data, error } = await supabase
        .from('activity_logs')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setActivities(data || []);
    } catch (error) {
      console.error('Error fetching activities:', error);
      toast({
        title: 'Error',
        description: 'Failed to fetch activity logs',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Filter activities
  const filteredActivities = useMemo(() => {
    return activities.filter((activity) => {
      // Action filter
      if (actionFilter !== 'all' && activity.action !== actionFilter) {
        return false;
      }
      // Section filter
      if (sectionFilter !== 'all' && activity.entity_type !== sectionFilter) {
        return false;
      }
      // User filter
      if (userFilter !== 'all' && activity.user_id !== userFilter) {
        return false;
      }
      // Date range filter
      if (startDate || endDate) {
        const activityDate = new Date(activity.created_at);
        if (startDate && activityDate < startDate) {
          return false;
        }
        if (endDate) {
          const endOfDay = new Date(endDate);
          endOfDay.setHours(23, 59, 59, 999);
          if (activityDate > endOfDay) {
            return false;
          }
        }
      }
      return true;
    });
  }, [activities, actionFilter, sectionFilter, userFilter, startDate, endDate]);

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [actionFilter, sectionFilter, userFilter, startDate, endDate]);

  // Clear date filter
  const clearDateFilter = () => {
    setStartDate(undefined);
    setEndDate(undefined);
  };

  // CSV download handler
  const handleDownloadCSV = () => {
    const csvColumns: { key: keyof ActivityLog; header: string }[] = [
      { key: 'user_email', header: 'User Email' },
      { key: 'user_role', header: 'User Role' },
      { key: 'action', header: 'Action' },
      { key: 'entity_type', header: 'Section' },
      { key: 'entity_name', header: 'Entity Name' },
      { key: 'created_at', header: 'Date' },
    ];
    downloadCSV(filteredActivities, csvColumns, `activity-logs-${new Date().toISOString().split('T')[0]}.csv`);
    toast({
      title: 'Success',
      description: `Downloaded ${filteredActivities.length} activity logs`,
    });
  };

  // Pagination
  const totalPages = Math.ceil(filteredActivities.length / ACTIVITIES_PER_PAGE);
  const startIndex = (currentPage - 1) * ACTIVITIES_PER_PAGE;
  const paginatedActivities = useMemo(
    () => filteredActivities.slice(startIndex, startIndex + ACTIVITIES_PER_PAGE),
    [filteredActivities, startIndex]
  );

  const getPageNumbers = (): (number | 'ellipsis')[] => {
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

  const formatDateTime = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  };

  const getActivityDescription = (activity: ActivityLog) => {
    const actionLabel = actionLabels[activity.action] || activity.action;
    const entityLabel = entityLabels[activity.entity_type] || activity.entity_type;
    
    if (activity.action === 'reorder') {
      const details = activity.details as { count?: number; division?: string; type?: string } | null;
      const count = details?.count || 'multiple';
      if (activity.entity_type === 'team_member' && details?.division) {
        return `${actionLabel} ${count} team members in "${details.division}"`;
      }
      if (activity.entity_type === 'reading' && details?.type) {
        return `${actionLabel} ${count} readings in "${details.type}"`;
      }
      return `${actionLabel} ${count} ${entityLabel}s`;
    }
    
    if (activity.entity_name) {
      return `${actionLabel} ${entityLabel} "${activity.entity_name}"`;
    }
    
    return `${actionLabel} a ${entityLabel}`;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[40vh]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <h2 className="font-serif text-heading text-accent">Activity Tracking</h2>
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="outline" size="sm">
              <Download className="h-4 w-4 mr-2" />
              Download CSV
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Download Activity Logs</AlertDialogTitle>
              <AlertDialogDescription>
                This will download {filteredActivities.length} activity log{filteredActivities.length !== 1 ? 's' : ''} as a CSV file.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleDownloadCSV}>Download</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>

      {/* Filters - matching Archive page UI */}
      <div className="mb-8 pb-6 border-b border-separator">
        <div className="flex flex-col sm:flex-row gap-4">
          {/* Action filter */}
          <div>
            <label className="font-body text-xs text-muted-foreground uppercase tracking-wider block mb-2">
              Action
            </label>
            <select
              value={actionFilter}
              onChange={(e) => setActionFilter(e.target.value)}
              className="bg-background border border-separator px-3 h-10 min-w-[140px]"
              style={{ fontFamily: '"Times New Roman", Times, serif' }}
            >
              <option value="all">All Actions</option>
              <option value="create">Create</option>
              <option value="update">Update</option>
              <option value="delete">Delete</option>
              <option value="reorder">Reorder</option>
            </select>
          </div>

          {/* User filter */}
          <div>
            <label className="font-body text-xs text-muted-foreground uppercase tracking-wider block mb-2">
              User
            </label>
            <select
              value={userFilter}
              onChange={(e) => setUserFilter(e.target.value)}
              className="bg-background border border-separator px-3 h-10 min-w-[180px]"
              style={{ fontFamily: '"Times New Roman", Times, serif' }}
            >
              <option value="all">All Users</option>
              {uniqueUsers.map((user) => (
                <option key={user.id} value={user.id}>{user.name}</option>
              ))}
            </select>
          </div>

          {/* Section filter */}
          <div>
            <label className="font-body text-xs text-muted-foreground uppercase tracking-wider block mb-2">
              Section
            </label>
            <select
              value={sectionFilter}
              onChange={(e) => setSectionFilter(e.target.value)}
              className="bg-background border border-separator px-3 h-10 min-w-[140px]"
              style={{ fontFamily: '"Times New Roman", Times, serif' }}
            >
              <option value="all">All Sections</option>
              {Object.entries(sectionLabels).map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
          </div>

          {/* Date range */}
          <div className="flex gap-2 items-end">
            <div>
              <label className="font-body text-xs text-muted-foreground uppercase tracking-wider block mb-2">
                From
              </label>
              <Popover>
                <PopoverTrigger asChild>
                  <button
                    className={cn(
                      "bg-background border border-separator px-3 h-10 min-w-[130px] text-left",
                      !startDate && "text-muted-foreground"
                    )}
                    style={{ fontFamily: '"Times New Roman", Times, serif' }}
                  >
                    {startDate ? format(startDate, "MMM d, yyyy") : "Select date"}
                  </button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={startDate}
                    onSelect={setStartDate}
                    initialFocus
                    className={cn("p-3 pointer-events-auto")}
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div>
              <label className="font-body text-xs text-muted-foreground uppercase tracking-wider block mb-2">
                To
              </label>
              <Popover>
                <PopoverTrigger asChild>
                  <button
                    className={cn(
                      "bg-background border border-separator px-3 h-10 min-w-[130px] text-left",
                      !endDate && "text-muted-foreground"
                    )}
                    style={{ fontFamily: '"Times New Roman", Times, serif' }}
                  >
                    {endDate ? format(endDate, "MMM d, yyyy") : "Select date"}
                  </button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={endDate}
                    onSelect={setEndDate}
                    initialFocus
                    className={cn("p-3 pointer-events-auto")}
                  />
                </PopoverContent>
              </Popover>
            </div>

            {/* Clear dates */}
            {(startDate || endDate) && (
              <button
                onClick={clearDateFilter}
                className="h-10 px-3 text-muted-foreground hover:text-foreground transition-colors"
                style={{ fontFamily: '"Times New Roman", Times, serif' }}
              >
                Clear
              </button>
            )}
          </div>
        </div>
      </div>


      {/* Results Count */}
      <p
        className="text-muted-foreground mb-4"
        style={{ fontFamily: '"Times New Roman", Times, serif' }}
      >
        Showing {filteredActivities.length} activit{filteredActivities.length === 1 ? 'y' : 'ies'}
      </p>

      {/* Activities List */}
      {paginatedActivities.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-muted-foreground font-body">No activities found.</p>
        </div>
      ) : (
        <div className="divide-y divide-separator">
          {paginatedActivities.map((activity) => (
            <div key={activity.id} className="py-4">
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-muted flex items-center justify-center">
                  <User className="h-4 w-4 text-muted-foreground" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span
                      className="font-medium text-accent truncate"
                      style={{ fontFamily: '"Times New Roman", Times, serif' }}
                    >
                      {activity.user_email}
                    </span>
                    <span
                      className="text-sm text-muted-foreground italic"
                      style={{ fontFamily: '"Times New Roman", Times, serif' }}
                    >
                      ({roleLabels[activity.user_role] || activity.user_role})
                    </span>
                  </div>
                  <p
                    className="text-foreground"
                    style={{ fontFamily: '"Times New Roman", Times, serif' }}
                  >
                    {getActivityDescription(activity)}
                  </p>
                  <p
                    className="text-sm text-muted-foreground mt-1"
                    style={{ fontFamily: '"Times New Roman", Times, serif' }}
                  >
                    {formatDateTime(activity.created_at)}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="mt-8">
          <Pagination>
            <PaginationContent>
              <PaginationItem>
                <PaginationPrevious
                  onClick={() => currentPage > 1 && setCurrentPage(currentPage - 1)}
                  className={currentPage === 1 ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                />
              </PaginationItem>
              {getPageNumbers().map((page, idx) =>
                page === 'ellipsis' ? (
                  <PaginationItem key={`ellipsis-${idx}`}>
                    <PaginationEllipsis />
                  </PaginationItem>
                ) : (
                  <PaginationItem key={page}>
                    <PaginationLink
                      onClick={() => setCurrentPage(page)}
                      isActive={currentPage === page}
                      className="cursor-pointer"
                    >
                      {page}
                    </PaginationLink>
                  </PaginationItem>
                )
              )}
              <PaginationItem>
                <PaginationNext
                  onClick={() => currentPage < totalPages && setCurrentPage(currentPage + 1)}
                  className={currentPage === totalPages ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                />
              </PaginationItem>
            </PaginationContent>
          </Pagination>
        </div>
      )}
    </div>
  );
}
