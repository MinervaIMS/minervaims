import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Loader2, RefreshCw, Calendar, Users, FileText, GraduationCap, BookOpen, ChevronLeft, ChevronRight, MoreHorizontal } from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';

interface ActivityLog {
  id: string;
  user_id: string;
  user_email: string;
  user_role: string;
  action: 'create' | 'update' | 'delete' | 'reorder';
  entity_type: 'event' | 'alumni' | 'file' | 'team_member' | 'reading';
  entity_id: string | null;
  entity_name: string;
  details: Record<string, unknown> | null;
  created_at: string;
}

const LOGS_PER_PAGE = 20;

const ActivityLog = () => {
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [entityTypeFilter, setEntityTypeFilter] = useState<string>('all');
  const [actionFilter, setActionFilter] = useState<string>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const { session } = useAuth();
  const { toast } = useToast();

  const fetchLogs = async () => {
    setIsLoading(true);
    try {
      // Use type assertion since activity_logs is not in auto-generated types yet
      const { data, error } = await (supabase as any)
        .from('activity_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(500);

      if (error) throw error;
      setLogs((data as ActivityLog[]) || []);
    } catch (error) {
      console.error('Error fetching activity logs:', error);
      toast({
        title: "Error",
        description: "Failed to fetch activity logs",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (session) {
      fetchLogs();
    }
  }, [session]);

  // Filter logs
  const filteredLogs = useMemo(() => {
    return logs.filter(log => {
      if (entityTypeFilter !== 'all' && log.entity_type !== entityTypeFilter) return false;
      if (actionFilter !== 'all' && log.action !== actionFilter) return false;
      return true;
    });
  }, [logs, entityTypeFilter, actionFilter]);

  // Pagination
  const totalPages = Math.ceil(filteredLogs.length / LOGS_PER_PAGE);
  const paginatedLogs = useMemo(() => {
    const startIndex = (currentPage - 1) * LOGS_PER_PAGE;
    return filteredLogs.slice(startIndex, startIndex + LOGS_PER_PAGE);
  }, [filteredLogs, currentPage]);

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [entityTypeFilter, actionFilter]);

  const getActionBadgeVariant = (action: string) => {
    switch (action) {
      case 'create': return 'default';
      case 'update': return 'secondary';
      case 'delete': return 'destructive';
      case 'reorder': return 'outline';
      default: return 'outline';
    }
  };

  const getEntityIcon = (entityType: string) => {
    switch (entityType) {
      case 'event': return <Calendar className="h-4 w-4" />;
      case 'alumni': return <GraduationCap className="h-4 w-4" />;
      case 'file': return <FileText className="h-4 w-4" />;
      case 'team_member': return <Users className="h-4 w-4" />;
      case 'reading': return <BookOpen className="h-4 w-4" />;
      default: return null;
    }
  };

  const getEntityLabel = (entityType: string) => {
    switch (entityType) {
      case 'event': return 'Event';
      case 'alumni': return 'Alumni';
      case 'file': return 'File';
      case 'team_member': return 'Team Member';
      case 'reading': return 'Reading';
      default: return entityType;
    }
  };

  const getRoleLabel = (role: string) => {
    const roleLabels: Record<string, string> = {
      admin: 'Admin',
      president: 'President',
      vice_president: 'Vice President',
      head_of_asset_management: 'Head of AM',
      head_of_equity: 'Head of Equity',
      head_of_investment: 'Head of Investment',
      head_of_macro: 'Head of Macro',
      head_of_portfolio: 'Head of Portfolio',
      head_of_quant: 'Head of Quant',
      head_of_operations: 'Head of Ops',
      head_of_media: 'Head of Media',
      portfolio_manager: 'Portfolio Manager',
    };
    return roleLabels[role] || role;
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

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="font-serif text-heading text-accent">Activity Log</h2>
        <Button 
          variant="outline" 
          size="sm" 
          onClick={fetchLogs}
          className="font-body"
        >
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-4">
        <div className="flex items-center gap-2">
          <span className="text-sm font-body text-muted-foreground">Entity:</span>
          <Select value={entityTypeFilter} onValueChange={setEntityTypeFilter}>
            <SelectTrigger className="w-[150px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Entities</SelectItem>
              <SelectItem value="event">Events</SelectItem>
              <SelectItem value="alumni">Alumni</SelectItem>
              <SelectItem value="file">Files</SelectItem>
              <SelectItem value="team_member">Team Members</SelectItem>
              <SelectItem value="reading">Readings</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-sm font-body text-muted-foreground">Action:</span>
          <Select value={actionFilter} onValueChange={setActionFilter}>
            <SelectTrigger className="w-[130px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Actions</SelectItem>
              <SelectItem value="create">Create</SelectItem>
              <SelectItem value="update">Update</SelectItem>
              <SelectItem value="delete">Delete</SelectItem>
              <SelectItem value="reorder">Reorder</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Results count */}
      <p className="font-body text-small text-muted-foreground">
        Showing {paginatedLogs.length} of {filteredLogs.length} activities
        {totalPages > 1 && ` (page ${currentPage} of ${totalPages})`}
      </p>

      {/* Logs list */}
      {filteredLogs.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="font-body text-muted-foreground">
              No activity logs found.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {paginatedLogs.map((log) => (
            <Card key={log.id} className="hover:bg-muted/50 transition-colors">
              <CardContent className="py-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    {/* User and action */}
                    <div className="flex items-center gap-2 flex-wrap mb-2">
                      <span className="font-body font-medium text-foreground truncate">
                        {log.user_email}
                      </span>
                      <Badge variant="outline" className="text-xs">
                        {getRoleLabel(log.user_role)}
                      </Badge>
                    </div>
                    
                    {/* Action details */}
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge variant={getActionBadgeVariant(log.action)} className="capitalize">
                        {log.action}
                      </Badge>
                      <div className="flex items-center gap-1 text-muted-foreground">
                        {getEntityIcon(log.entity_type)}
                        <span className="text-sm font-body">{getEntityLabel(log.entity_type)}</span>
                      </div>
                      <span className="text-sm font-body text-foreground font-medium truncate max-w-[300px]">
                        "{log.entity_name}"
                      </span>
                    </div>

                    {/* Additional details */}
                    {log.details && Object.keys(log.details).length > 0 && (
                      <div className="mt-2 text-xs font-body text-muted-foreground">
                        {Object.entries(log.details).map(([key, value]) => (
                          value != null && (
                            <span key={key} className="mr-3">
                              {key}: <span className="text-foreground">{String(value)}</span>
                            </span>
                          )
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Timestamp */}
                  <div className="text-right flex-shrink-0">
                    <div className="text-sm font-body text-muted-foreground">
                      {formatDistanceToNow(new Date(log.created_at), { addSuffix: true })}
                    </div>
                    <div className="text-xs font-body text-muted-foreground/70">
                      {format(new Date(log.created_at), 'MMM d, yyyy h:mm a')}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <nav className="flex justify-center mt-8" aria-label="Activity Log Pagination">
          <ul className="flex items-center gap-1">
            <li>
              <button
                onClick={() => setCurrentPage(currentPage - 1)}
                disabled={currentPage === 1}
                className="flex items-center gap-1 px-3 py-2 font-body text-sm border border-separator rounded hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed"
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
                    onClick={() => setCurrentPage(page)}
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
                onClick={() => setCurrentPage(currentPage + 1)}
                disabled={currentPage === totalPages}
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
    </div>
  );
};

export default ActivityLog;