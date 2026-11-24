import { supabase } from '@/integrations/supabase/client';
import { listPublicReports } from '@/lib/reports-api';
import type { SearchEvent, SearchMember, SearchReading, SearchSources } from '@/lib/site-search-data';
import type { PublicReport } from '@/lib/reports-public';

// =====================================================================
// THE WEBSITE'S SEARCH: THE READS (Step 107). What the search looks
// through, read from the same sources the pages read, once per visit,
// when the search first opens (or the magnifier is hovered). Loaded with
// the search, never with the first screen.
// =====================================================================
export type Loaded = Omit<SearchSources, 'hidden' | 'eventType' | 'now'>;
let sources: Promise<{ data: Loaded; failed: boolean }> | null = null;

/** The reads behind the search; called on opening, and on a hover over the magnifier. */
export function prefetchSearchSources(): Promise<{ data: Loaded; failed: boolean }> {
  if (sources) return sources;
  const settle = <T,>(p: PromiseLike<T>, fallback: T) => Promise.resolve(p).then((v) => ({ v, ok: true }), () => ({ v: fallback, ok: false }));
  sources = Promise.all([
    settle(listPublicReports(), [] as PublicReport[]),
    settle(supabase.from('team_members').select('id, name, surname, position, division, fund, is_board')
      .order('display_order', { ascending: true }).then(({ data, error }) => { if (error) throw error; return (data ?? []) as SearchMember[]; }), [] as SearchMember[]),
    settle(supabase.from('website_events').select('id, title, date, place, online, moderator, guest, description, event_type, is_past, registration_enabled')
      .eq('show_on_website', true).order('listing_order', { ascending: true })
      .then(({ data, error }) => { if (error) throw error; return (data ?? []) as unknown as SearchEvent[]; }), [] as SearchEvent[]),
    settle(supabase.from('readings').select('id, title, author, description, publication_year, contributor_name, contributor_surname')
      .order('display_order', { ascending: true }).then(({ data, error }) => { if (error) throw error; return (data ?? []) as SearchReading[]; }), [] as SearchReading[]),
  ]).then(([reports, members, events, readings]) => {
    const failed = !reports.ok || !members.ok || !events.ok || !readings.ok;
    // A read that failed is tried again the next time the search opens.
    if (failed) sources = null;
    return { data: { reports: reports.v, members: members.v, events: events.v, readings: readings.v }, failed };
  });
  return sources;
}

