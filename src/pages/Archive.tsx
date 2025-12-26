import { useState, useEffect, useMemo } from 'react';
import { PageIntroduction } from "@/components/shared";
import { supabase } from "@/integrations/supabase/client";
import { Division, Fund, divisionLabels, fundLabels, activeFunds, inactiveFunds } from "@/lib/types";
import { ArchiveFilesList } from "@/components/shared/ArchiveFilesList";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";
import archiveBg from "@/assets/archive-bg-3.png";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";

interface ArchiveFile {
  id: string;
  title: string;
  description: string | null;
  file_url: string;
  date: string;
  division: string;
  fund: string | null;
}

const ITEMS_PER_PAGE = 20;

const Archive = () => {
  const [files, setFiles] = useState<ArchiveFile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [divisionFilter, setDivisionFilter] = useState<Division | 'all'>('all');
  const [fundFilter, setFundFilter] = useState<Fund | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    fetchFiles();
  }, []);

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [divisionFilter, fundFilter, searchQuery]);

  const fetchFiles = async () => {
    try {
      const { data, error } = await supabase
        .from('archive_files')
        .select('*')
        .order('date', { ascending: false });

      if (error) throw error;
      setFiles(data || []);
    } catch (error) {
      console.error('Error fetching files:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const filteredFiles = useMemo(() => {
    return files.filter(file => {
      // Division filter
      if (divisionFilter !== 'all' && file.division !== divisionFilter) return false;
      // Fund filter (only when portfolio division is selected)
      if (divisionFilter === 'portfolio' && fundFilter !== 'all' && file.fund !== fundFilter) return false;
      // Search filter
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const matchesTitle = file.title.toLowerCase().includes(query);
        const matchesDescription = file.description?.toLowerCase().includes(query) || false;
        if (!matchesTitle && !matchesDescription) return false;
      }
      return true;
    });
  }, [files, divisionFilter, fundFilter, searchQuery]);

  // Pagination calculations
  const totalPages = Math.ceil(filteredFiles.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const paginatedFiles = filteredFiles.slice(startIndex, startIndex + ITEMS_PER_PAGE);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Generate page numbers to display
  const getPageNumbers = () => {
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
    return pages;
  };

  return (
    <>
      {/* Hero section with background image */}
      <div className="relative">
        <div className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: `url(${archiveBg})` }} />
        <div className="relative z-10">
          <PageIntroduction
            title="Archive"
            description="Browse all research reports and publications."
            transparentBackground
          />
        </div>
      </div>

      {/* Content section */}
      <div className="bg-background">
        <div className="container py-section-sm md:py-section">
          {/* Filters */}
          <div className="mb-8 pb-6 border-b border-separator">
            <div className="flex flex-col sm:flex-row gap-4">
              {/* Division filter */}
              <div>
                <label className="font-body text-xs text-muted-foreground uppercase tracking-wider block mb-2">
                  Division
                </label>
                <select
                  value={divisionFilter}
                  onChange={(e) => {
                    setDivisionFilter(e.target.value as Division | 'all');
                    if (e.target.value !== 'portfolio') {
                      setFundFilter('all');
                    }
                  }}
                  className="font-body text-small bg-background border border-separator px-3 h-10 min-w-[200px]"
                >
                  <option value="all">All Divisions</option>
                  {Object.entries(divisionLabels).map(([key, label]) => (
                    <option key={key} value={key}>{label}</option>
                  ))}
                </select>
              </div>

              {/* Search */}
              <div className="flex-1">
                <label className="font-body text-xs text-muted-foreground uppercase tracking-wider block mb-2">
                  Search
                </label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    type="text"
                    placeholder="Search by title or description..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10 font-body text-small h-10"
                  />
                </div>
              </div>

              {divisionFilter === 'portfolio' && (
                <div>
                  <label className="font-body text-xs text-muted-foreground uppercase tracking-wider block mb-2">
                    Fund
                  </label>
                  <select
                    value={fundFilter}
                    onChange={(e) => setFundFilter(e.target.value as Fund | 'all')}
                    className="font-body text-small bg-background border border-separator px-3 py-2 min-w-[280px]"
                  >
                    <option value="all">All Funds</option>
                    <optgroup label="Active Funds">
                      {activeFunds.map((fund) => (
                        <option key={fund} value={fund}>{fundLabels[fund]}</option>
                      ))}
                    </optgroup>
                    <optgroup label="Inactive Funds">
                      {inactiveFunds.map((fund) => (
                        <option key={fund} value={fund}>{fundLabels[fund]}</option>
                      ))}
                    </optgroup>
                  </select>
                </div>
              )}
            </div>
          </div>

          {/* Results count */}
          <p className="font-body text-small text-muted-foreground mb-6">
            Showing {startIndex + 1}-{Math.min(startIndex + ITEMS_PER_PAGE, filteredFiles.length)} of {filteredFiles.length} {filteredFiles.length === 1 ? 'report' : 'reports'}
          </p>

          {/* Files list */}
          {isLoading ? (
            <p className="font-body text-muted-foreground py-8">Loading reports...</p>
          ) : (
            <>
              <ArchiveFilesList files={paginatedFiles} showDivision={divisionFilter === 'all'} />
              
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
            </>
          )}
        </div>
      </div>
    </>
  );
};

export default Archive;
