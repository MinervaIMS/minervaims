import { Calendar, MapPin, Users } from 'lucide-react';

interface DbEvent {
  id: string;
  title: string;
  date: string;
  place: string;
  moderator?: string | null;
  guest?: string | null;
  description?: string | null;
}

interface EventsListNewProps {
  events: DbEvent[];
}

export function EventsListNew({ events }: EventsListNewProps) {
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    }).toUpperCase();
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
          {/* Date and Location row */}
          <div className="flex items-center gap-2 text-muted-foreground mb-3">
            <Calendar className="h-4 w-4" />
            <span className="font-body text-sm tracking-wider">
              {formatDate(event.date)}
            </span>
            <span className="mx-2">|</span>
            <MapPin className="h-4 w-4" />
            <span className="font-body text-sm tracking-wider uppercase">
              {event.place}
            </span>
          </div>

          {/* Title */}
          <h3 className="font-serif text-subheading mb-3">
            {event.title}
          </h3>

          {/* Description */}
          {event.description && (
            <p className="font-body text-body text-muted-foreground mb-3">
              {event.description}
            </p>
          )}

          {/* Moderator and Guest */}
          {(event.moderator || event.guest) && (
            <div className="flex items-start gap-2 text-muted-foreground">
              <Users className="h-4 w-4 mt-0.5 flex-shrink-0" />
              <span className="font-body text-sm">
                {[event.moderator, event.guest].filter(Boolean).join(', ')}
              </span>
            </div>
          )}
        </article>
      ))}
    </div>
  );
}