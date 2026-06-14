import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface PageVisibilityRow {
  page_key: string;
  is_hidden: boolean;
  updated_at: string | null;
  updated_by: string | null;
}

type VisMap = Record<string, PageVisibilityRow>;

const listeners = new Set<(m: VisMap) => void>();
let cache: VisMap | null = null;
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
      cache = {};
      return cache;
    }
    const map: VisMap = {};
    (data ?? []).forEach((r) => {
      map[r.page_key] = r as PageVisibilityRow;
    });
    cache = map;
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
      setMap({ ...cache });
      setLoading(false);
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
