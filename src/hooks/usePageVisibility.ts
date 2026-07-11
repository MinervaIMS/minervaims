import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface PageVisibilityRow {
  page_key: string;
  is_hidden: boolean;
  updated_at: string | null;
  updated_by: string | null;
}

type VisMap = Record<string, PageVisibilityRow>;

const LS_KEY = 'mims_page_visibility_v1';

// Seed the module cache synchronously from localStorage so that returning
// visitors render the correct visibility on the very first paint — with no
// flash of the blur/overlay on pages that are actually visible. A background
// reconcile still runs on mount to catch any change made while they were away.
const readLS = (): VisMap | null => {
  try {
    const raw = typeof localStorage !== 'undefined' && localStorage.getItem(LS_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? (parsed as VisMap) : null;
  } catch {
    return null;
  }
};

const writeLS = (map: VisMap) => {
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(map));
  } catch {
    /* storage unavailable — non-fatal */
  }
};

const listeners = new Set<(m: VisMap) => void>();
let cache: VisMap | null = readLS();
let inflight: Promise<VisMap> | null = null;
let channelInit = false;

const notify = () => {
  if (!cache) return;
  const snap = cache;
  listeners.forEach((l) => l(snap));
};

const fetchAll = async (): Promise<VisMap> => {
  if (inflight) return inflight;
  inflight = (async () => {
    const { data, error } = await supabase
      .from('page_visibility')
      .select('page_key,is_hidden,updated_at,updated_by');
    if (error) {
      console.error('page_visibility fetch error', error);
      cache = cache ?? {};
      return cache;
    }
    const map: VisMap = {};
    (data ?? []).forEach((r) => {
      map[r.page_key] = r as PageVisibilityRow;
    });
    cache = map;
    writeLS(map);
    notify();
    return map;
  })();
  try {
    return await inflight;
  } finally {
    inflight = null;
  }
};

const ensureChannel = () => {
  if (channelInit) return;
  channelInit = true;
  supabase
    .channel('page_visibility_changes')
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'page_visibility' },
      () => {
        cache = null;
        fetchAll();
      },
    )
    .subscribe();
};

export const usePageVisibility = () => {
  const [map, setMap] = useState<VisMap>(cache ?? {});
  const [loading, setLoading] = useState<boolean>(cache === null);

  useEffect(() => {
    ensureChannel();
    const cb = (m: VisMap) => setMap({ ...m });
    listeners.add(cb);
    if (cache === null) {
      fetchAll().then(() => setLoading(false));
    } else {
      // Seeded from localStorage: render immediately (no flash), then reconcile
      // with the server in the background to pick up any change made meanwhile.
      setMap({ ...cache });
      setLoading(false);
      fetchAll();
    }
    return () => {
      listeners.delete(cb);
    };
  }, []);

  const isHidden = useCallback(
    (pageKey: string) => !!map[pageKey]?.is_hidden,
    [map],
  );

  const getRow = useCallback(
    (pageKey: string): PageVisibilityRow | undefined => map[pageKey],
    [map],
  );

  const setHidden = useCallback(async (pageKey: string, hidden: boolean) => {
    const { data: auth } = await supabase.auth.getUser();
    const uid = auth.user?.id ?? null;
    const optimistic: PageVisibilityRow = {
      page_key: pageKey,
      is_hidden: hidden,
      updated_at: new Date().toISOString(),
      updated_by: uid,
    };
    cache = { ...(cache ?? {}), [pageKey]: optimistic };
    notify();
    const { error } = await supabase
      .from('page_visibility')
      .upsert(
        {
          page_key: pageKey,
          is_hidden: hidden,
          updated_by: uid,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'page_key' },
      );
    if (error) {
      // Roll back
      cache = null;
      await fetchAll();
      throw error;
    }
  }, []);

  return { map, loading, isHidden, getRow, setHidden };
};
