import { CalendarPlus } from 'lucide-react';
import { Button, type ButtonProps } from '@/components/ui/button';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { calendarLinks, interviewCalendarLinks } from '@/lib/calendar-links';

// =====================================================================
// "Add to calendar": one button, the calendar of your choice.
//   Apple Calendar   the .ics: an iPhone, iPad or Mac opens it straight
//                    into "Add to calendar"
//   Google Calendar  opens Google Calendar filled in (Android, the web)
//   Outlook          Microsoft 365, which Bocconi addresses use
//   Outlook.com      personal Microsoft accounts
//   Other apps       the .ics file, for any other calendar
// =====================================================================

export function AddToCalendar({ eventId, interview, variant = 'outline', size = 'sm', className = '', label = 'Add to calendar' }: {
  /** An event, or (instead) an interview booking. */
  eventId?: string;
  interview?: { bookingId: string; who: 'candidate' | 'examiner' };
  variant?: ButtonProps['variant'];
  size?: ButtonProps['size'];
  className?: string;
  label?: string;
}) {
  const links = interview ? interviewCalendarLinks(interview.bookingId, interview.who) : calendarLinks(eventId ?? '');
  const item = (href: string, text: string, newTab: boolean) => (
    <DropdownMenuItem asChild>
      <a href={href} {...(newTab ? { target: '_blank', rel: 'noopener noreferrer' } : {})} className="cursor-pointer font-body">{text}</a>
    </DropdownMenuItem>
  );
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button data-ro type="button" variant={variant} size={size} className={className}>
          <CalendarPlus className="h-4 w-4 mr-2" />{label}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="min-w-[13rem]">
        <DropdownMenuLabel className="font-body text-xs uppercase tracking-wider text-muted-foreground font-normal">Add to your calendar</DropdownMenuLabel>
        {item(links.apple, 'Apple Calendar', false)}
        {item(links.google, 'Google Calendar', true)}
        {item(links.outlook, 'Outlook (Bocconi, work)', true)}
        {item(links.outlookcom, 'Outlook.com', true)}
        <DropdownMenuSeparator />
        {item(links.ics, 'Other apps (.ics file)', false)}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
