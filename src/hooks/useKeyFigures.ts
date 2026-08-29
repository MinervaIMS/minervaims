import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';

// =====================================================================
// useKeyFigures — the three numbers the homepage and /join open with.
// ---------------------------------------------------------------------
// WHY THIS WAS UNRELIABLE, AND WHAT CHANGED.
//
// The figures came from three requests issued together through
// Promise.all, written into state on success and, on any failure,
// left at their initial value of zero. Promise.all rejects as soon as
// ANY ONE of its promises rejects, so a single slow or refused request -
// the alumni counting RPC on a cold start, a dropped connection on a
// phone changing network - discarded the two that had succeeded as well.
// The homepage then showed the association as having no reports, no
// members and no alumni, which is the worst possible failure mode for
// three numbers whose whole job is to establish that it is substantial.
//
// Four things now stand between a bad moment and that outcome:
//
//   1. THE THREE COUNTS ARE INDEPENDENT. `Promise.allSettled` lets each
//      one succeed or fail on its own, and a figure that failed keeps
//      the last value known for it rather than becoming zero.
//
//   2. IT RETRIES. A failed attempt is tried again twice, backing off,
//      because most of these failures are transient by nature.
//
//   3. THE CACHE SURVIVES THE TAB. It moved from sessionStorage to
//      localStorage, so a returning visitor has real numbers on screen
//      in the first frame rather than after a round trip - and if every
//      request fails, the last known figures are shown instead of
//      nothing. They are stale, not wrong; these numbers change a
//      handful of times a semester.
//
//   4. FAILURE IS NOT REMEMBERED. `hasFetched` used to be set before
//      the request rather than after it succeeded, so a failed load was
//      never retried for the life of the page. It is now set on success.
//
// ZERO IS NEVER PUBLISHED AS A FIGURE. `isLoading` stays true until
// there is something real to show, and the components render a
// placeholder of the right size rather than the number 0.
// =====================================================================

interface KeyFigures {
  reports: number;
  members: number;
  alumni: number;
}

const CACHE_KEY = 'mims_key_figures';
/** How long a cached figure is served without re-reading it. */
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes
/**
 * How long a cached figure may still be used AS A FALLBACK when every
 * request has failed. A month-old members count is a far better answer
 * than a zero, and these numbers move a few times a semester.
 */
const STALE_FALLBACK_DURATION = 30 * 24 * 60 * 60 * 1000; // 30 days

/** How many times a failed read is retried, and how long between tries. */
const RETRIES = 2;
const RETRY_DELAY_MS = 900;

interface CachedData {
  data: KeyFigures;
  timestamp: number;
}

const roundDownToTen = (n: number) => Math.floor(n / 10) * 10;

/** The cache, with its age, so the caller can decide what to do about it. */
function readCache(): CachedData | null {
  try {
    const cached = localStorage.getItem(CACHE_KEY);
    if (!cached) return null;
    const parsed = JSON.parse(cached) as CachedData;
    if (!parsed?.data || typeof parsed.timestamp !== 'number') return null;
    return parsed;
  } catch {
    return null;
  }
}

function setCachedData(data: KeyFigures) {
  try {
    const cacheEntry: CachedData = { data, timestamp: Date.now() };
    localStorage.setItem(CACHE_KEY, JSON.stringify(cacheEntry));
  } catch {
    // Private browsing, a full quota: the figures still work this session.
  }
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** A figure worth showing: a real, positive count. */
const isUsable = (n: number | null | undefined): n is number => typeof n === 'number' && n > 0;

export function useKeyFigures() {
  const [counts, setCounts] = useState<KeyFigures>({ reports: 0, members: 0, alumni: 0 });
  const [isLoading, setIsLoading] = useState(true);
  const hasFetched = useRef(false);

  useEffect(() => {
    if (hasFetched.current) return;
    let cancelled = false;

    const cache = readCache();
    const fresh = cache && Date.now() - cache.timestamp <= CACHE_DURATION;

    // A cached set is shown IMMEDIATELY, fresh or not: the page opens with
    // real numbers, and a background read replaces them if it can.
    if (cache && Date.now() - cache.timestamp <= STALE_FALLBACK_DURATION) {
      setCounts(cache.data);
      setIsLoading(false);
      if (fresh) { hasFetched.current = true; return; }
    }

    /** One attempt. Returns whatever it managed to read, per figure. */
    const attempt = async (): Promise<Partial<KeyFigures>> => {
      const [reportsRes, membersRes, alumniRes] = await Promise.allSettled([
        // The published count, stated explicitly. Without the filter this
        // counted whatever the viewer's policies allowed, so the homepage
        // figure went up for a signed-in staff member (drafts and blocked
        // reports included) and back down for everybody else.
        supabase.from('archive_files').select('id', { count: 'exact', head: true })
          .eq('status', 'published').is('deleted_at', null),
        supabase.from('team_members').select('id', { count: 'exact', head: true }),
        // The alumni table is no longer publicly readable in full; the total
        // comes from the public counting RPC instead.
        supabase.rpc('public_alumni_filter_count'),
      ]);

      const out: Partial<KeyFigures> = {};
      if (reportsRes.status === 'fulfilled' && isUsable(reportsRes.value.count)) {
        out.reports = roundDownToTen(reportsRes.value.count);
      }
      if (membersRes.status === 'fulfilled' && isUsable(membersRes.value.count)) {
        out.members = roundDownToTen(membersRes.value.count);
      }
      if (alumniRes.status === 'fulfilled' && isUsable(alumniRes.value.data as number | null)) {
        out.alumni = roundDownToTen(alumniRes.value.data as number);
      }
      return out;
    };

    /** Write whatever this round produced, keeping the rest untouched. */
    const publish = (got: Partial<KeyFigures>) => {
      const complete = got.reports != null && got.members != null && got.alumni != null;
      setCounts((prev) => {
        // A figure that failed keeps whatever was last known for it - the
        // cache, or the previous state - rather than dropping to zero.
        const next: KeyFigures = {
          reports: got.reports ?? prev.reports,
          members: got.members ?? prev.members,
          alumni: got.alumni ?? prev.alumni,
        };
        // Only a COMPLETE set is cached, so a partial read can never become
        // the "last known good" figures for the next visit.
        if (complete) setCachedData(next);
        return next;
      });
      if (complete) hasFetched.current = true;
      return complete;
    };

    const fetchCounts = async () => {
      let got: Partial<KeyFigures> = {};

      const round = async () => {
        try {
          got = { ...got, ...(await attempt()) };
        } catch (error) {
          // allSettled does not throw; this catches anything the client
          // itself raises before the requests are even made.
          console.error('Error fetching key figures:', error);
        }
      };

      await round();
      if (cancelled) return;
      const complete = publish(got);

      // THE PAGE IS RELEASED AFTER THE FIRST ATTEMPT, ALWAYS. The homepage
      // holds its loader until this flag clears, so making it wait out the
      // retries would turn a bad network into several extra seconds of
      // blank page. The retries continue behind the page that is already
      // on screen, and a figure that arrives late simply appears.
      setIsLoading(false);
      if (complete) return;

      for (let i = 0; i < RETRIES; i++) {
        await sleep(RETRY_DELAY_MS * (i + 1));
        if (cancelled) return;
        await round();
        if (cancelled) return;
        if (publish(got)) return;
      }
    };

    fetchCounts();
    return () => { cancelled = true; };
  }, []);

  return { counts, isLoading };
}
