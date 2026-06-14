import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface Row {
  page_key: string;
  is_hidden: boolean;
  updated_at: string;
  updated_by: string | null;
}

let cache: Record<string, Row> | null = null;
const listeners = new Set<(map: Record<string, Row>) => void>();
let inflight: Promise<Record<string, Row>> | null = null;
let realtimeSetup = false;

const notify = () => {
  if (!cache) return;
  for (const l of listeners) l(cache);
};

const setupRealtime = () => {
  if (realtimeSetup) return;
  realtimeSetup = true;
  supabase
    .channel('page_visibility_changes')
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'page_visibility' },
      () => {
        // Refetch on any change
        inflight = null;
        cache = null;
        fetchAll().then(notify).catch(() => {});
      },
    )
    .subscribe();
};

const fetchAll = async (): Promise<Record<string, Row>> => {
  if (cache) return cache;
  if (inflight) return inflight;
  inflight = (async () => {
    const { data, error } = await supabase
      .from('page_visibility')
      .select('page_key, is_hidden, updated_at, updated_by');
    if (error) {
      console.error('page_visibility fetch error', error);
      return {};
    }
    const map: Record<string, Row> = {};
    for (const r of data ?? []) map[r.page_key] = r as Row;
    cache = map;
    return map;
  })();
  return inflight;
};

export const usePageVisibility = () => {
  const [map, setMap] = useState<Record<string, Row> | null>(cache);
  const [loading, setLoading] = useState(cache === null);

  useEffect(() => {
    setupRealtime();
    let mounted = true;
    fetchAll().then((m) => {
      if (!mounted) return;
      setMap(m);
      setLoading(false);
    });
    const listener = (m: Record<string, Row>) => mounted && setMap({ ...m });
    listeners.add(listener);
    return () => {
      mounted = false;
      listeners.delete(listener);
    };
  }, []);

  const isHidden = useCallback(
    (pageKey: string): boolean => !!(map && map[pageKey]?.is_hidden),
    [map],
  );

  const getRow = useCallback(
    (pageKey: string): Row | null => (map ? map[pageKey] ?? null : null),
    [map],
  );

  const setHidden = useCallback(async (pageKey: string, hidden: boolean) => {
    const { data: userRes } = await supabase.auth.getUser();
    const userId = userRes.user?.id ?? null;
    const { error } = await supabase
      .from('page_visibility')
      .upsert(
        { page_key: pageKey, is_hidden: hidden, updated_by: userId, updated_at: new Date().toISOString() },
        { onConflict: 'page_key' },
      );
    if (error) throw error;
    // Optimistic local update — realtime will reconcile
    if (cache) {
      cache = {
        ...cache,
        [pageKey]: {
          page_key: pageKey,
          is_hidden: hidden,
          updated_at: new Date().toISOString(),
          updated_by: userId,
        },
      };
      notify();
    }
  }, []);

  return { map, loading, isHidden, getRow, setHidden };
};
