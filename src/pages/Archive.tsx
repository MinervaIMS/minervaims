import { useState, useEffect, useMemo, useRef } from "react";
import { useSearchParams } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { PageIntroduction, PageLoader } from "@/components/shared";
import { supabase } from "@/integrations/supabase/client";
import { Division, Fund, divisionLabels, fundLabels, activeFunds, closedFunds } from "@/lib/types";
import { ArchiveFilesList } from "@/components/shared/ArchiveFilesList";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";
import { useImagePreload } from "@/hooks/useImagePreload";
import archiveBg from "@/assets/mims-archive.webp.asset.json";
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

const ITEMS_PER_PAGE = 15;

const Archive = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [files, setFiles] = useState<ArchiveFile[]>([]);
  const [isDataLoading, setIsDataLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [highlightedFileId, setHighlightedFileId] = useState<string | null>(null);
  const hasScrolledToFile = useRef(false);
  const imagesLoaded = useImagePreload([archiveBg]);

  // Read fileId from URL params (for direct linking from carousels)
  const fileIdFromUrl = searchParams.get("fileId");

  // Read division filter from URL params, default to 'all'
  const divisionFromUrl = searchParams.get("division");
  const divisionFilter: Division | "all" =
    divisionFromUrl && divisionLabels[divisionFromUrl as Division] ? (divisionFromUrl as Division) : "all";

  // Read fund filter from URL params
  const fundFromUrl = searchParams.get("fund");
  const fundFilter: Fund | "all" = fundFromUrl && fundLabels[fundFromUrl as Fund] ? (fundFromUrl as Fund) : "all";

  // Read year filter from URL params
  const yearFromUrl = searchParams.get("year");
  const yearFilter: string = yearFromUrl || "all";

  const setDivisionFilter = (division: Division | "all") => {
    const newParams = new URLSearchParams(searchParams);
    if (division === "all") {
      newParams.delete("division");
      newParams.delete("fund");
    } else {
      newParams.set("division", division);
      if (division !== "portfolio") {
        newParams.delete("fund");
      }
    }
    // Clear fileId when changing filters
    newParams.delete("fileId");
    setSearchParams(newParams);
  };

  const setFundFilter = (fund: Fund | "all") => {
    const newParams = new URLSearchParams(searchParams);
    if (fund === "all") {
      newParams.delete("fund");
    } else {
      newParams.set("fund", fund);
    }
    // Clear fileId when changing filters
    newParams.delete("fileId");
    setSearchParams(newParams);
  };

  const setYearFilter = (year: string) => {
    const newParams = new URLSearchParams(searchParams);
    if (year === "all") {
      newParams.delete("year");
    } else {
      newParams.set("year", year);
    }
    // Clear fileId when changing filters
    newParams.delete("fileId");
    setSearchParams(newParams);
  };

  useEffect(() => {
    fetchFiles();
  }, []);

  // Reset to page 1 when filters change (but not when fileId changes)
  useEffect(() => {
    if (!fileIdFromUrl) {
      setCurrentPage(1);
    }
  }, [divisionFilter, fundFilter, yearFilter, searchQuery]);

  const fetchFiles = async () => {
    try {
      const { data, error } = await supabase.from("archive_files").select("*").order("date", { ascending: false });

      if (error) throw error;
      setFiles(data || []);
    } catch (error) {
      console.error("Error fetching files:", error);
    } finally {
      setIsDataLoading(false);
    }
  };

  // Extract unique years from files
  const availableYears = useMemo(() => {
    const years = new Set<number>();
    files.forEach((file) => {
      const year = new Date(file.date).getFullYear();
      years.add(year);
    });
    return Array.from(years).sort((a, b) => b - a);
  }, [files]);

  const filteredFiles = useMemo(() => {
    return files.filter((file) => {
      // Division filter
      if (divisionFilter !== "all" && file.division !== divisionFilter) return false;
      // Fund filter (only when portfolio division is selected)
      if (divisionFilter === "portfolio" && fundFilter !== "all" && file.fund !== fundFilter) return false;
      // Year filter
      if (yearFilter !== "all") {
        const fileYear = new Date(file.date).getFullYear().toString();
        if (fileYear !== yearFilter) return false;
      }
      // Search filter
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const matchesTitle = file.title.toLowerCase().includes(query);
        const matchesDescription = file.description?.toLowerCase().includes(query) || false;
        if (!matchesTitle && !matchesDescription) return false;
      }
      return true;
    });
  }, [files, divisionFilter, fundFilter, yearFilter, searchQuery]);

  // Handle direct file linking - find the page containing the file and scroll to it
  useEffect(() => {
    if (fileIdFromUrl && files.length > 0 && !hasScrolledToFile.current) {
      // Find the file in the unfiltered list
      const fileIndex = files.findIndex((f) => f.id === fileIdFromUrl);
      if (fileIndex !== -1) {
        // Calculate which page the file is on
        const targetPage = Math.floor(fileIndex / ITEMS_PER_PAGE) + 1;
        setCurrentPage(targetPage);
        setHighlightedFileId(fileIdFromUrl);
        hasScrolledToFile.current = true;

        // Scroll to the file after a short delay to allow rendering
        setTimeout(() => {
          const element = document.getElementById(`file-${fileIdFromUrl}`);
          if (element) {
            element.scrollIntoView({ behavior: "smooth", block: "center" });
          }
          // Remove highlight after 3 seconds
          setTimeout(() => {
            setHighlightedFileId(null);
          }, 3000);
        }, 300);
      }
    }
  }, [fileIdFromUrl, files]);

  // Pagination calculations
  const totalPages = Math.ceil(filteredFiles.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const paginatedFiles = filteredFiles.slice(startIndex, startIndex + ITEMS_PER_PAGE);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // Generate page numbers to display
  const getPageNumbers = () => {
    const pages: (number | "ellipsis")[] = [];
    if (totalPages <= 5) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      if (currentPage <= 3) {
        pages.push(1, 2, 3, 4, "ellipsis", totalPages);
      } else if (currentPage >= totalPages - 2) {
        pages.push(1, "ellipsis", totalPages - 3, totalPages - 2, totalPages - 1, totalPages);
      } else {
        pages.push(1, "ellipsis", currentPage - 1, currentPage, currentPage + 1, "ellipsis", totalPages);
      }
    }
    return pages;
  };

  if (isDataLoading || !imagesLoaded) {
    return <PageLoader />;
  }

  return (
    <>
      <Helmet>
        <title>Archive | MIMS</title>
      </Helmet>
      {/* Hero section with background image */}
      <div data-page-hero className="relative">
        <div className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: `url(${archiveBg})` }} />
        <div className="relative z-10">
          <PageIntroduction title="Archive" transparentBackground />
        </div>
      </div>

      {/* Content section */}
      <div className="bg-background">
        <div className="container py-section-sm md:py-section">
          <h2 className="font-serif text-xl sm:text-heading mb-6 pb-3 border-b border-separator text-accent">
            Browse all research reports and publications
          </h2>
          {/* Sticky Filters Bar */}
          <div className="sticky top-16 z-20 bg-background py-4 mb-4 -mx-4 px-4 md:-mx-6 md:px-6">
            <div className="flex flex-col sm:flex-row gap-4 flex-wrap">
              {/* Division filter */}
              <div>
                <label className="font-serif text-xs text-muted-foreground uppercase tracking-wider block mb-2">
                  Division
                </label>
                <select
                  value={divisionFilter}
                  onChange={(e) => setDivisionFilter(e.target.value as Division | "all")}
                  className="font-serif text-small bg-background border border-separator px-3 h-10 min-w-[200px]"
                >
                  <option value="all">All Divisions</option>
                  {Object.entries(divisionLabels).map(([key, label]) => (
                    <option key={key} value={key}>
                      {label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Year filter */}
              <div>
                <label className="font-serif text-xs text-muted-foreground uppercase tracking-wider block mb-2">
                  Year
                </label>
                <select
                  value={yearFilter}
                  onChange={(e) => setYearFilter(e.target.value)}
                  className="font-serif text-small bg-background border border-separator px-3 h-10 min-w-[120px]"
                >
                  <option value="all">All Years</option>
                  {availableYears.map((year) => (
                    <option key={year} value={year.toString()}>
                      {year}
                    </option>
                  ))}
                </select>
              </div>

              {/* Search */}
              <div className="flex-1 min-w-[200px]">
                <label className="font-serif text-xs text-muted-foreground uppercase tracking-wider block mb-2">
                  Search
                </label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    type="text"
                    placeholder="Search by title or description..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10 font-serif text-small h-10 rounded-none"
                  />
                </div>
              </div>

              {divisionFilter === "portfolio" && (
                <div>
                  <label className="font-serif text-xs text-muted-foreground uppercase tracking-wider block mb-2">
                    Fund
                  </label>
                  <select
                    value={fundFilter}
                    onChange={(e) => setFundFilter(e.target.value as Fund | "all")}
                    className="font-serif text-small bg-background border border-separator px-3 h-10 min-w-[280px]"
                  >
                    <option value="all">All Funds</option>
                    <optgroup label="Active Funds">
                      {activeFunds.map((fund) => (
                        <option key={fund} value={fund}>
                          {fundLabels[fund]}
                        </option>
                      ))}
                    </optgroup>
                    <optgroup label="Closed Funds">
                      {closedFunds.map((fund) => (
                        <option key={fund} value={fund}>
                          {fundLabels[fund]}
                        </option>
                      ))}
                    </optgroup>
                  </select>
                </div>
              )}
            </div>
          </div>

          {/* Results count */}
          <p className="font-body text-small text-muted-foreground mb-6">
            Showing {filteredFiles.length > 0 ? startIndex + 1 : 0}-
            {Math.min(startIndex + ITEMS_PER_PAGE, filteredFiles.length)} of {filteredFiles.length}{" "}
            {filteredFiles.length === 1 ? "report" : "reports"}
          </p>

          {/* Files list */}
          <ArchiveFilesList
            files={paginatedFiles}
            showDivision={divisionFilter === "all"}
            highlightedFileId={highlightedFileId}
          />

          {/* Pagination */}
          {totalPages > 1 && (
            <Pagination className="mt-8">
              <PaginationContent>
                <PaginationItem>
                  <PaginationPrevious
                    onClick={() => currentPage > 1 && handlePageChange(currentPage - 1)}
                    className={currentPage === 1 ? "pointer-events-none opacity-50" : "cursor-pointer"}
                  />
                </PaginationItem>

                {getPageNumbers().map((page, index) => (
                  <PaginationItem key={index}>
                    {page === "ellipsis" ? (
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
                    className={currentPage === totalPages ? "pointer-events-none opacity-50" : "cursor-pointer"}
                  />
                </PaginationItem>
              </PaginationContent>
            </Pagination>
          )}
        </div>
      </div>
    </>
  );
};

export default Archive;
