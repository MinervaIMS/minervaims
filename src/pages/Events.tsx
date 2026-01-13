import { useEffect, useState } from 'react';
import { PageIntroduction } from '@/components/shared';
import { EventsListNew } from '@/components/shared/EventsListNew';
import { supabase } from '@/integrations/supabase/client';
import eventsBg from "@/assets/events-bg.webp";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";

interface DbEvent {
  id: string;
  title: string;
  date: string;
  place: string;
  moderator?: string | null;
  guest?: string[] | null;
  description?: string | null;
}

const ITEMS_PER_PAGE = 10;

const Events = () => {
  const [events, setEvents] = useState<DbEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    const fetchEvents = async () => {
      try {
        const { data, error } = await supabase
          .from('events')
          .select('*')
          .order('date', { ascending: false });

        if (error) {
          console.error('Error fetching events:', error);
          return;
        }

        setEvents(data || []);
      } catch (error) {
        console.error('Error fetching events:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchEvents();
  }, []);

  // Pagination calculations
  const totalPages = Math.ceil(events.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const paginatedEvents = events.slice(startIndex, startIndex + ITEMS_PER_PAGE);

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
      <div className="relative">
        <div className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: `url(${eventsBg})` }} />
        <div className="relative z-10">
          <PageIntroduction
            title="Events"
            transparentBackground
          />
        </div>
      </div>

      {/* Description Section */}
      <section className="pt-section-sm md:pt-section pb-6 md:pb-8 bg-background">
        <div className="container">
          <h2 className="font-serif text-xl sm:text-heading mb-6 pb-3 border-b border-separator text-accent">
            Professional Exposure, Strong Network, Personal Development
          </h2>
          <p className="font-body text-body-lg text-muted-foreground mb-4 max-w-4xl">
            Beyond research and portfolio management, MIMS delivers a year-round programme designed to develop technical judgement and long-term connections across the membership. Each semester, the Society hosts one flagship event with industry professionals, offering direct exposure to real-world investment processes. We complement this with company visits and internal forums where each team presents its work to the full Society, followed by structured discussions and debates to challenge assumptions and improve decision-making.
          </p>
          <p className="font-body text-body-lg text-muted-foreground max-w-4xl">
            To strengthen cohesion, MIMS also organises division-only and association-wide aperitivos, creating consistent touchpoints between members. Finally, frequent alumni calls give current members direct access to a truly international network, enabling candid Q&A on academic choices, recruitment pathways, and the realities of roles across banks, boutiques, hedge funds and asset managers.
          </p>
        </div>
      </section>

      <div className="container py-section-sm md:py-section">
        <h2 className="font-serif text-xl sm:text-heading mb-8 pb-3 border-b border-separator text-accent">
          Minerva Events, since 2019 bridging the gap between students and professionals
        </h2>
        
        {/* Results count */}
        {!isLoading && events.length > 0 && (
          <p className="font-body text-small text-muted-foreground mb-6">
            Showing {startIndex + 1}-{Math.min(startIndex + ITEMS_PER_PAGE, events.length)} of {events.length} events
          </p>
        )}
        
        {isLoading ? (
          <p className="font-body text-muted-foreground py-8">Loading events...</p>
        ) : (
          <>
            <EventsListNew events={paginatedEvents} />
            
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
    </>
  );
};

export default Events;
