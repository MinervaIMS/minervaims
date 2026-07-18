import { useState, useEffect, useMemo } from 'react';
import { format } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Download, Search } from 'lucide-react';
import { WorkspacePageHeader } from '@/components/admin/WorkspacePageHeader';
import { HelpDot } from '@/components/admin/help/HelpSystem';
import { WorkspaceLoader } from '@/components/admin/WorkspaceLoader';
import { ColumnFilter } from '@/components/admin/ColumnFilter';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
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
import { roleLabel as composeRoleLabel } from '@/lib/roles';

interface ActivityLog {
  id: string;
  user_id: string;
  user_email: string;
  user_role: string;
  action: string;
  entity_type: string;
  entity_id: string | null;
  entity_name: string | null;
  section: string | null;
  subsection: string | null;
  details: unknown;
  created_at: string;
}

// Where an entry happened: new entries carry section/subsection explicitly;
// older entries fall back to a mapping from their entity type.
const legacyPlace: Record<string, { section: string; subsection: string }> = {
  event: { section: 'Events', subsection: 'Event archive' },
  alumnus: { section: 'People', subsection: 'Alumni' },
  file: { section: 'Reports', subsection: 'Report archive' },
  team_member: { section: 'People', subsection: 'Members' },
  reading: { section: 'Website', subsection: 'Readings' },
  page_visibility: { section: 'Website', subsection: 'Pages' },
  user_role: { section: 'Settings', subsection: 'Users' },
  fee_period: { section: 'Operations', subsection: 'Membership fees' },
};
const placeOf = (a: ActivityLog): { section: string; subsection: string } =>
  a.section
    ? { section: a.section, subsection: a.subsection ?? '' }
    : legacyPlace[a.entity_type] ?? { section: 'Workspace', subsection: a.entity_type };

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
  const [search, setSearch] = useState('');
  const [actionFilter, setActionFilter] = useState<string[]>([]);
  const [sectionFilter, setSectionFilter] = useState<string[]>([]);
  const [userFilter, setUserFilter] = useState<string[]>([]);
  const [startDate, setStartDate] = useState<Date | undefined>(undefined);
  const [endDate, setEndDate] = useState<Date | undefined>(undefined);
  const [currentPage, setCurrentPage] = useState(1);
  const { toast } = useToast();

  useEffect(() => {
    fetchActivities();
    // eslint-disable-next-line react-hooks/exhaustive-deps
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

  // Column filter options are built over the whole log.
  const actionOptions = useMemo(() =>
    [...new Set(activities.map((a) => a.action))].sort()
      .map((a) => ({ value: a, label: actionLabels[a] || a.replace(/_/g, ' ') })), [activities]);
  const sectionOptions = useMemo(() =>
    [...new Set(activities.map((a) => placeOf(a).section))].sort()
      .map((s) => ({ value: s, label: s })), [activities]);
  const userOptions = useMemo(() => {
    const seen = new Map<string, string>();
    activities.forEach((a) => { if (!seen.has(a.user_id)) seen.set(a.user_id, a.user_email); });
    return [...seen.entries()].sort((a, b) => a[1].localeCompare(b[1]))
      .map(([id, email]) => ({ value: id, label: email }));
  }, [activities]);

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

  // Filter activities
  const filteredActivities = useMemo(() => {
    const q = search.trim().toLowerCase();
    return activities.filter((activity) => {
      if (actionFilter.length > 0 && !actionFilter.includes(activity.action)) return false;
      if (sectionFilter.length > 0 && !sectionFilter.includes(placeOf(activity).section)) return false;
      if (userFilter.length > 0 && !userFilter.includes(activity.user_id)) return false;
      if (startDate || endDate) {
        const activityDate = new Date(activity.created_at);
        if (startDate && activityDate < startDate) return false;
        if (endDate) {
          const endOfDay = new Date(endDate);
          endOfDay.setHours(23, 59, 59, 999);
          if (activityDate > endOfDay) return false;
        }
      }
      if (q) {
        const hay = `${activity.user_email} ${activity.entity_name ?? ''} ${getActivityDescription(activity)} ${placeOf(activity).section} ${placeOf(activity).subsection}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activities, search, actionFilter, sectionFilter, userFilter, startDate, endDate]);

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [search, actionFilter, sectionFilter, userFilter, startDate, endDate]);

  // Clear date filter
  const clearDateFilter = () => {
    setStartDate(undefined);
    setEndDate(undefined);
  };

  // CSV download handler
  const handleDownloadCSV = () => {
    const csvColumns: { key: keyof ActivityLog; header: string }[] = [
      { key: 'user_email', header: 'User Email' },
      { key: 'user_role', header: 'Role at the time' },
      { key: 'action', header: 'Action' },
      { key: 'section', header: 'Section' },
      { key: 'subsection', header: 'Subsection' },
      { key: 'entity_type', header: 'Entity Type' },
      { key: 'entity_name', header: 'Entity Name' },
      { key: 'created_at', header: 'Date' },
    ];
    // Export with the legacy fallback applied, so old rows also carry a place.
    const exportRows = filteredActivities.map((a) => ({ ...a, section: placeOf(a).section, subsection: placeOf(a).subsection }));
    downloadCSV(exportRows, csvColumns, `activity-logs-${new Date().toISOString().split('T')[0]}.csv`);
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
    return date.toLocaleDateString('en-GB', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (isLoading) {
    return (
      <div>
        <WorkspacePageHeader
          title="Activity log"
          description="Every meaningful action in the workspace is recorded here for accountability and security."
        />
        <WorkspaceLoader />
      </div>
    );
  }

  return (
    <div id="activity-section">
      <WorkspacePageHeader
        title="Activity log"
        description="Every meaningful action in the workspace is recorded here for accountability and security: who did what, where, to which item, and when, with the role they held at that exact moment. Entries never change retroactively."
        actions={
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="outline" className="font-body">
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
        }
      />

      {/* Search bar and date range above the table; the other filters live in
          the table header row (the same pattern as People > Members). */}
      <div className="mb-4 flex flex-col sm:flex-row gap-3 sm:items-center flex-wrap">
        <div className="relative max-w-md flex-1 min-w-[220px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input className="pl-10 font-body" placeholder="Search by user, item or description" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <Popover>
          <PopoverTrigger asChild>
            <button className={cn('font-body bg-background border border-input px-3 h-10 min-w-[130px] text-left', !startDate && 'text-muted-foreground')}>
              {startDate ? format(startDate, 'MMM d, yyyy') : 'From date'}
            </button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar mode="single" selected={startDate} onSelect={setStartDate} initialFocus className={cn('p-3 pointer-events-auto')} />
          </PopoverContent>
        </Popover>
        <Popover>
          <PopoverTrigger asChild>
            <button className={cn('font-body bg-background border border-input px-3 h-10 min-w-[130px] text-left', !endDate && 'text-muted-foreground')}>
              {endDate ? format(endDate, 'MMM d, yyyy') : 'To date'}
            </button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar mode="single" selected={endDate} onSelect={setEndDate} initialFocus className={cn('p-3 pointer-events-auto')} />
          </PopoverContent>
        </Popover>
        {(startDate || endDate) && (
          <button onClick={clearDateFilter} className="font-body h-10 px-3 text-muted-foreground hover:text-foreground transition-colors">
            Clear
          </button>
        )}
        <HelpDot page="settings-activity" topic="filters" />
      </div>

      <p className="font-body text-small text-muted-foreground mb-4">
        Showing {paginatedActivities.length} of {filteredActivities.length} {filteredActivities.length === 1 ? 'entry' : 'entries'}
        {totalPages > 1 && ` (page ${currentPage} of ${totalPages})`}
      </p>

      {filteredActivities.length === 0 ? (
        <Card><CardContent className="py-12 text-center"><p className="font-body text-muted-foreground">No activities match the current filters.</p></CardContent></Card>
      ) : (
        <div className="border border-separator overflow-x-auto">
          <table className="w-full text-left font-body text-sm">
            <thead className="bg-muted/40 text-muted-foreground">
              <tr>
                <th className="px-3 py-2 font-normal whitespace-nowrap">When</th>
                <th className="px-3 py-2 font-normal"><ColumnFilter label="User" options={userOptions} selected={userFilter} onChange={setUserFilter} /></th>
                <th className="px-3 py-2 font-normal">Role at the time</th>
                <th className="px-3 py-2 font-normal"><ColumnFilter label="Section" options={sectionOptions} selected={sectionFilter} onChange={setSectionFilter} /></th>
                <th className="px-3 py-2 font-normal"><ColumnFilter label="Action" options={actionOptions} selected={actionFilter} onChange={setActionFilter} /></th>
                <th className="px-3 py-2 font-normal">Description</th>
              </tr>
            </thead>
            <tbody>
              {paginatedActivities.map((activity) => {
                const place = placeOf(activity);
                return (
                  <tr key={activity.id} className="border-t border-separator align-top">
                    <td className="px-3 py-2 whitespace-nowrap text-muted-foreground">{formatDateTime(activity.created_at)}</td>
                    <td className="px-3 py-2 text-foreground">{activity.user_email}</td>
                    <td className="px-3 py-2 whitespace-nowrap" title="Role held at the moment of the action. It never changes retroactively.">
                      {roleLabels[activity.user_role] || composeRoleLabel(activity.user_role as never, null)}
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap">
                      <span className="text-[11px] px-1.5 py-0.5 bg-accent/10 text-accent whitespace-nowrap">
                        {place.section}{place.subsection ? ` › ${place.subsection}` : ''}
                      </span>
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap">{actionLabels[activity.action] || activity.action.replace(/_/g, ' ')}</td>
                    <td className="px-3 py-2">{getActivityDescription(activity)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
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
