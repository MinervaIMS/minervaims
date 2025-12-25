import { useState } from 'react';
import { Calendar, MapPin, ChevronDown, ChevronUp } from 'lucide-react';

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

interface ExpandableContentProps {
  description?: string | null;
  moderator?: string | null;
  guest?: string[] | null;
}

function ExpandableContent({ description, moderator, guest }: ExpandableContentProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const hasModeratorOrGuests = moderator || (guest && guest.length > 0);
  const hasExpandableContent = (description && description.length > 150) || hasModeratorOrGuests;

  if (!description && !hasModeratorOrGuests) return null;

  return (
    <div className="mb-6">
      {description && (
        <p 
          className={`font-body text-body text-muted-foreground ${!isExpanded ? 'line-clamp-2' : ''}`}
        >
          {description}
        </p>
      )}
      
      {/* Moderator and Guests - only visible when expanded */}
      {isExpanded && hasModeratorOrGuests && (
        <div className="font-body text-sm text-muted-foreground mt-4">
          {moderator && (
            <span className="block">
              <span className="font-medium text-foreground">Moderator:</span> {moderator}
            </span>
          )}
          {guest && guest.length > 0 && (
            <div className="block mt-1">
              <span className="font-medium text-foreground">Guest{guest.length > 1 ? 's' : ''}:</span>
              <ul className="list-disc list-inside ml-1 mt-1">
                {guest.map((g, idx) => (
                  <li key={idx}>{g}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {hasExpandableContent && (
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

          {/* Description, Moderator and Guests - expandable */}
          <ExpandableContent 
            description={event.description}
            moderator={event.moderator}
            guest={event.guest}
          />
        </article>
      ))}
    </div>
  );
}
