import { useState } from 'react';
import { Calendar, MapPin, Users, ChevronDown, ChevronUp } from 'lucide-react';

interface DbEvent {
  id: string;
  title: string;
  date: string;
  place: string;
  moderator?: string | null;
  guest?: string[] | null;
  description?: string | null;
}

interface EventsListNewProps {
  events: DbEvent[];
}

function ExpandableDescription({ description }: { description: string }) {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div className="mb-6">
      <p 
        className={`font-body text-body text-muted-foreground ${!isExpanded ? 'line-clamp-2' : ''}`}
      >
        {description}
      </p>
      {description.length > 150 && (
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="flex items-center gap-1 font-body text-sm text-primary hover:text-primary/80 mt-2 transition-colors"
        >
          {isExpanded ? (
            <>
              Show less <ChevronUp className="h-4 w-4" />
            </>
          ) : (
            <>
              Read more <ChevronDown className="h-4 w-4" />
            </>
          )}
        </button>
      )}
    </div>
  );
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

          {/* Description - expandable */}
          {event.description && (
            <ExpandableDescription description={event.description} />
          )}

          {/* Moderator and Guests */}
          {(event.moderator || (event.guest && event.guest.length > 0)) && (
            <div className="flex items-start gap-2 text-muted-foreground">
              <Users className="h-4 w-4 mt-0.5 flex-shrink-0" />
              <div className="font-body text-sm">
                {event.moderator && (
                  <span className="block">
                    <span className="font-medium">Moderator:</span> {event.moderator}
                  </span>
                )}
                {event.guest && event.guest.length > 0 && (
                  <div className="block">
                    <span className="font-medium">Guest{event.guest.length > 1 ? 's' : ''}:</span>
                    <ul className="list-disc list-inside ml-1 mt-1">
                      {event.guest.map((g, idx) => (
                        <li key={idx}>{g}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          )}
        </article>
      ))}
    </div>
  );
}
