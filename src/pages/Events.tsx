import { PageIntroduction, EventsList } from '@/components/shared';
import { events } from '@/lib/data';

const Events = () => {
  return (
    <>
      <PageIntroduction
        title="Events"
        description="Conferences, workshops, and seminars organised by MIMS."
      />

      <div className="container py-section-sm md:py-section">
        <EventsList events={events} />
      </div>
    </>
  );
};

export default Events;
