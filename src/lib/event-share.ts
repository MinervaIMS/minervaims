// =====================================================================
// AN EVENT'S LINK, AS A CHAT APP SHOWS IT (Step 109).
// ---------------------------------------------------------------------
// An event's registration link (/events/<id>/register, or its short link
// /e/<code>) is the link the Society shares most, in WhatsApp groups
// above all. Its card says which event it is, when and where, and whose:
// the registration page's own facts, worked out by this one function for
// the page (EventRegister.tsx) and for the build (vite.static-pages.ts),
// so the two never disagree.
//
// An alumni call's date and time are not public (Step 91): the card,
// like the page, leaves them out, whoever reads it.
//
// Only relative imports: the build reads this file.
// =====================================================================

import { formatEventWhen } from './event-time';
import { publicPlace } from './event-place';
import { eventShareCard } from './seo/share-cards';

export interface ShareableEvent {
  id: string;
  title: string;
  event_type?: string | null;
  date?: string | null;
  start_at?: string | null;
  end_at?: string | null;
  place?: string | null;
  online?: boolean | null;
  description?: string | null;
}

const SOCIETY = 'Minerva Investment Management Society';

/** A sentence cut at a word, never in the middle of one. */
function clip(text: string, max: number): string {
  const t = text.replace(/\s+/g, ' ').trim();
  if (t.length <= max) return t;
  const head = t.slice(0, max + 1);
  const space = head.lastIndexOf(' ');
  return `${(space > 0 ? head.slice(0, space) : t.slice(0, max)).replace(/[\s,;:.]+$/, '')}...`;
}

/** The registration page's address: the one canonical form of the link. */
export const eventRegisterPath = (id: string) => `/events/${id}/register`;

/** The card's line: when, where, whose, then the event's own words. */
export function eventShareDescription(e: ShareableEvent): string {
  const when = e.event_type === 'alumni_call' ? '' : formatEventWhen(e);
  const where = publicPlace(e);
  const facts = [when, where].filter(Boolean).join(', ');
  const lead = `${facts ? `${facts}. ` : ''}An event of ${SOCIETY}.`;
  const about = String(e.description ?? '').replace(/\s+/g, ' ').trim();
  return about ? clip(`${lead} ${about}`, 220) : lead;
}

/** Everything the page's head needs: one source for the page and the build. */
export function eventShareHead(e: ShareableEvent) {
  return {
    path: eventRegisterPath(e.id),
    title: e.title,
    description: eventShareDescription(e),
    card: eventShareCard(e.event_type),
    // A registration page is a transaction, not an answer to a search:
    // the Events page is the one indexed (lib/seo/routes.ts).
    noindex: true,
  };
}
