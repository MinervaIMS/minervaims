import { useEffect, useState } from 'react';
import { PageIntroduction } from '@/components/shared';
import { EventsListNew } from '@/components/shared/EventsListNew';
import { supabase } from '@/integrations/supabase/client';
import eventsBg from "@/assets/events-bg.png";

interface DbEvent {
  id: string;
  title: string;
  date: string;
  place: string;
  moderator?: string | null;
  guest?: string[] | null;
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
      <section className="py-section-sm md:py-section bg-background">
        <div className="container">
          <h2 className="font-serif text-heading mb-6 pb-3 border-b border-separator">
            Professional Exposure, Strong Network, Personal Development
          </h2>
          <p className="font-body text-body-lg text-muted-foreground mb-4 max-w-4xl">
            Beyond research and portfolio management, MIMS delivers a year-round programme designed to develop technical judgement and long-term connections across the membership. Each semester, the Society hosts one flagship event with industry professionals, offering direct exposure to real-world investment processes. We complement this with company visits and internal forums where each team presents its work to the full Society, followed by structured discussion and debate to challenge assumptions and improve decision-making.
          </p>
          <p className="font-body text-body-lg text-muted-foreground max-w-4xl">
            To strengthen cohesion, MIMS also organises division-only and association-wide aperitivos, creating consistent touchpoints between members. Finally, frequent alumni calls give current members direct access to a truly international network, enabling candid Q&A on academic choices, recruitment pathways, and the realities of roles across banks, boutiques, hedge funds and asset managers.
          </p>
        </div>
      </section>

      <div className="container py-section-sm md:py-section">
        <h2 className="font-serif text-heading mb-8 pb-3 border-b border-separator">
          Minerva Events, since 2019 bridging the gap between students and professionals
        </h2>
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