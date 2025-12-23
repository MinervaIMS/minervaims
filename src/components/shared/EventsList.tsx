import { Event } from '@/lib/types';

interface EventsListProps {
  events: Event[];
}

export function EventsList({ events }: EventsListProps) {
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  };

  // Sort by date descending
  const sortedEvents = [...events].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  );

  if (sortedEvents.length === 0) {
    return (
      <p className="font-body text-muted-foreground py-8">
        No events available at this time.
      </p>
    );
  }

  return (
    <div className="space-y-0">
      {sortedEvents.map((event, index) => (
        <article
          key={event.id}
          className={`py-8 ${index !== sortedEvents.length - 1 ? 'border-b border-separator' : ''}`}
        >
          <div className="grid grid-cols-1 md:grid-cols-[1fr_2fr] gap-6">
            {/* Image placeholder */}
            <div className="aspect-video bg-muted flex items-center justify-center">
              <span className="font-serif text-muted-foreground">Event Photo</span>
            </div>
            
            {/* Content */}
            <div>
              <time className="font-body text-xs text-muted-foreground uppercase tracking-wider">
                {formatDate(event.date)}
              </time>
              <h3 className="font-serif text-subheading mt-2 mb-2">
                {event.title}
              </h3>
              {event.location && (
                <p className="font-body text-small text-primary mb-2">
                  {event.location}
                </p>
              )}
              <p className="font-body text-body text-muted-foreground">
                {event.description}
              </p>
            </div>
          </div>
        </article>
      ))}
    </div>
  );
}
