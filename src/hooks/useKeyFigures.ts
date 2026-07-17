import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface KeyFigures {
  reports: number;
  members: number;
  alumni: number;
}

const CACHE_KEY = 'mims_key_figures';
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

interface CachedData {
  data: KeyFigures;
  timestamp: number;
}

const roundDownToTen = (n: number) => Math.floor(n / 10) * 10;

function getCachedData(): KeyFigures | null {
  try {
    const cached = sessionStorage.getItem(CACHE_KEY);
    if (!cached) return null;
    
    const { data, timestamp }: CachedData = JSON.parse(cached);
    if (Date.now() - timestamp > CACHE_DURATION) {
      sessionStorage.removeItem(CACHE_KEY);
      return null;
    }
    return data;
  } catch {
    return null;
  }
}

function setCachedData(data: KeyFigures) {
  try {
    const cacheEntry: CachedData = { data, timestamp: Date.now() };
    sessionStorage.setItem(CACHE_KEY, JSON.stringify(cacheEntry));
  } catch {
    // Ignore storage errors
  }
}

export function useKeyFigures() {
  const [counts, setCounts] = useState<KeyFigures>({ reports: 0, members: 0, alumni: 0 });
  const [isLoading, setIsLoading] = useState(true);
  const hasFetched = useRef(false);

  useEffect(() => {
    if (hasFetched.current) return;
    hasFetched.current = true;

    // Check cache first
    const cached = getCachedData();
    if (cached) {
      setCounts(cached);
      setIsLoading(false);
      return;
    }

    const fetchCounts = async () => {
      try {
        // The alumni table is no longer publicly readable in full; the total
        // comes from the public counting RPC instead.
        const [reportsRes, membersRes, alumniRes] = await Promise.all([
          supabase.from('archive_files').select('id', { count: 'exact', head: true }),
          supabase.from('team_members').select('id', { count: 'exact', head: true }),
          supabase.rpc('public_alumni_filter_count'),
        ]);

        const data: KeyFigures = {
          reports: roundDownToTen(reportsRes.count || 0),
          members: roundDownToTen(membersRes.count || 0),
          alumni: roundDownToTen((alumniRes.data as number | null) || 0),
        };

        setCounts(data);
        setCachedData(data);
      } catch (error) {
        console.error('Error fetching key figures:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchCounts();
  }, []);

  return { counts, isLoading };
}
