import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Input } from '@/components/ui/input';
import { Search, History, MoreHorizontal, ChevronLeft, ChevronRight } from 'lucide-react';
import { format } from 'date-fns';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from '@/components/ui/pagination';

import type { Tables } from '@/integrations/supabase/types';

type ActivityLog = Tables<'activity_logs'>;

const ITEMS_PER_PAGE = 20;

// Action labels for display
const actionLabels: Record<string, string> = {
  create: 'Created',
  update: 'Updated',
  delete: 'Deleted',
  reorder: 'Reordered',
};

// Entity type labels for display
const entityTypeLabels: Record<string, string> = {
  event: 'Events',
  alumni: 'Alumni',
  file: 'Archive Files',
  team_member: 'Team Members',
  reading: 'Readings',
  settings: 'Settings',
};

const ActivityLogsManagement = () => {
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [actionFilter, setActionFilter] = useState<string>('all');
  const [entityTypeFilter, setEntityTypeFilter] = useState<string>('all');
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    fetchLogs();
  }, []);

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, actionFilter, entityTypeFilter]);

  const fetchLogs = async () => {
    try {
      const { data, error } = await supabase
        .from('activity_logs')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setLogs(data || []);
    } catch (error) {
      console.error('Error fetching activity logs:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Get unique actions and entity types from logs
  const availableActions = useMemo(() => {
    const actions = new Set(logs.map(log => log.action));
    return Array.from(actions).sort();
  }, [logs]);

  const availableEntityTypes = useMemo(() => {
    const types = new Set(logs.map(log => log.entity_type));
    return Array.from(types).sort();
  }, [logs]);

  // Filter logs
  const filteredLogs = useMemo(() => {
    return logs.filter(log => {
      // Action filter
      if (actionFilter !== 'all' && log.action !== actionFilter) return false;
      
      // Entity type filter
      if (entityTypeFilter !== 'all' && log.entity_type !== entityTypeFilter) return false;
      
      // Search filter (search by user email)
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const matchesEmail = log.user_email.toLowerCase().includes(query);
        const matchesEntityName = log.entity_name?.toLowerCase().includes(query) || false;
        if (!matchesEmail && !matchesEntityName) return false;
      }
      
      return true;
    });
  }, [logs, actionFilter, entityTypeFilter, searchQuery]);

  // Pagination
  const totalPages = Math.ceil(filteredLogs.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const paginatedLogs = filteredLogs.slice(startIndex, startIndex + ITEMS_PER_PAGE);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  // Generate page numbers to display
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

  const formatDate = (dateString: string) => {
    return format(new Date(dateString), 'MMM d, yyyy HH:mm');
  };

  const getActionBadgeClass = (action: string) => {
    switch (action) {
      case 'create':
        return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400';
      case 'update':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400';
      case 'delete':
        return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400';
      case 'reorder':
        return 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400';
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-accent"></div>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <h2 className="font-serif text-heading text-accent">Activity Logs</h2>
      </div>

      {/* Filters */}
      <div className="mb-8 pb-6 border-b border-separator">
        <div className="flex flex-col sm:flex-row gap-4 flex-wrap">
          {/* Action filter */}
          <div>
            <label className="font-body text-xs text-muted-foreground uppercase tracking-wider block mb-2">
              Action
            </label>
            <select
              value={actionFilter}
              onChange={(e) => setActionFilter(e.target.value)}
              className="font-body text-small bg-background border border-separator px-3 h-10 min-w-[160px]"
            >
              <option value="all">All Actions</option>
              {availableActions.map((action) => (
                <option key={action} value={action}>
                  {actionLabels[action] || action}
                </option>
              ))}
            </select>
          </div>

          {/* Entity type filter */}
          <div>
            <label className="font-body text-xs text-muted-foreground uppercase tracking-wider block mb-2">
              Section
            </label>
            <select
              value={entityTypeFilter}
              onChange={(e) => setEntityTypeFilter(e.target.value)}
              className="font-body text-small bg-background border border-separator px-3 h-10 min-w-[180px]"
            >
              <option value="all">All Sections</option>
              {availableEntityTypes.map((type) => (
                <option key={type} value={type}>
                  {entityTypeLabels[type] || type}
                </option>
              ))}
            </select>
          </div>

          {/* Search */}
          <div className="flex-1 min-w-[200px]">
            <label className="font-body text-xs text-muted-foreground uppercase tracking-wider block mb-2">
              Search User
            </label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Search by email or entity name..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 font-body text-small h-10"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Results count */}
      <p className="font-body text-small text-muted-foreground mb-6">
        Showing {filteredLogs.length > 0 ? startIndex + 1 : 0}-{Math.min(startIndex + ITEMS_PER_PAGE, filteredLogs.length)} of {filteredLogs.length} {filteredLogs.length === 1 ? 'activity' : 'activities'}
      </p>

      {/* Activity logs table */}
      {paginatedLogs.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <History className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p className="font-body">No activity logs found</p>
          {(searchQuery || actionFilter !== 'all' || entityTypeFilter !== 'all') && (
            <p className="font-body text-sm mt-2">Try adjusting your filters</p>
          )}
        </div>
      ) : (
        <div className="border border-separator rounded-lg overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/30">
                <TableHead className="font-body text-xs uppercase tracking-wider">Date & Time</TableHead>
                <TableHead className="font-body text-xs uppercase tracking-wider">User</TableHead>
                <TableHead className="font-body text-xs uppercase tracking-wider">Role</TableHead>
                <TableHead className="font-body text-xs uppercase tracking-wider">Action</TableHead>
                <TableHead className="font-body text-xs uppercase tracking-wider">Section</TableHead>
                <TableHead className="font-body text-xs uppercase tracking-wider">Entity</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedLogs.map((log) => (
                <TableRow key={log.id} className="hover:bg-muted/20">
                  <TableCell className="font-body text-small whitespace-nowrap">
                    {formatDate(log.created_at)}
                  </TableCell>
                  <TableCell className="font-body text-small">
                    {log.user_email}
                  </TableCell>
                  <TableCell className="font-body text-small text-muted-foreground">
                    {log.user_role}
                  </TableCell>
                  <TableCell>
                    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getActionBadgeClass(log.action)}`}>
                      {actionLabels[log.action] || log.action}
                    </span>
                  </TableCell>
                  <TableCell className="font-body text-small">
                    {entityTypeLabels[log.entity_type] || log.entity_type}
                  </TableCell>
                  <TableCell className="font-body text-small text-muted-foreground max-w-[200px] truncate">
                    {log.entity_name || '—'}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

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
            
            {getPageNumbers().map((page, index) => (
              <PaginationItem key={index}>
                {page === 'ellipsis' ? (
                  <span className="px-3 py-2">
                    <MoreHorizontal className="h-4 w-4" />
                  </span>
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
            ))}
            
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
  );
};

export default ActivityLogsManagement;
