import { useEffect, useState } from 'react';
import { PageIntroduction } from '@/components/shared';
import { EventsListNew } from '@/components/shared/EventsListNew';
import { supabase } from '@/integrations/supabase/client';

interface DbEvent {
  id: string;
  title: string;
  date: string;
  place: string;
  moderator?: string | null;
  guest?: string | null;
  description?: string | null;
}

const Events = () => {
  const [events, setEvents] = useState<DbEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);

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

  return (
    <>
      <PageIntroduction
        title="Events"
        description="Conferences, workshops, and seminars organised by MIMS."
      />

      <div className="container py-section-sm md:py-section">
        {isLoading ? (
          <p className="font-body text-muted-foreground py-8">Loading events...</p>
        ) : (
          <EventsListNew events={events} />
        )}
      </div>
    </>
  );
};

export default Events;