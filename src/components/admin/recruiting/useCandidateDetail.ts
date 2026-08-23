import { useCallback, useRef, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import { getApplication, signDocumentUrl, type ApplicationRow, type ApplicationNote } from '@/lib/applications-api';

// =====================================================================
// useCandidateDetail — opening a candidate, quickly and once.
// ---------------------------------------------------------------------
// Screening a semester's intake means opening thirty or forty candidates
// one after another, so this is the single most repeated interaction in
// the workspace. It used to be the slowest.
//
// WHAT IT USED TO DO, in this order, with the whole panel behind a loader
// until the last of them returned:
//
//   1. await getApplication(id)                  one edge-function call
//   2. await signDocumentUrl(id, 'cv')           a second one
//   3. await signDocumentUrl(id, 'answer')       a third one
//   4. load()                                    RE-FETCHED THE WHOLE LIST
//
// Three round trips in series, plus a refetch of every application in the
// semester, before a single word of the candidate appeared. Steps 2 and 3
// do not depend on each other and neither of them is needed to show the
// candidate's name, programme, choices, status or notes.
//
// WHAT IT DOES NOW:
//
//   * the candidate and the notes are fetched first and PUBLISHED THE
//     MOMENT THEY ARRIVE, so the panel is readable after one round trip;
//   * the two document URLs are requested TOGETHER, in parallel, and fill
//     their panes as they land, each with its own small placeholder;
//   * nothing refetches the list. The one field the server changes when a
//     CV is first opened - the status - comes back inside the same
//     response, so the caller patches that row and leaves the rest alone;
//   * every candidate opened in this session is REMEMBERED. Signed URLs
//     expire, so the cache holds them only for as long as they are valid
//     and re-signs after that; the candidate's own data is refreshed in
//     the background while the remembered copy is already on screen.
//
// Moving back to a candidate you looked at two minutes ago is therefore
// instant, which is what a screening session actually consists of.
//
// NOTHING IS SHOWN THAT HAS NOT BEEN READ FROM THE SERVER. The cache only
// ever holds real responses, and a stale entry is refreshed rather than
// trusted; no correctness is traded for speed.
// =====================================================================

export interface CandidateDetail {
  application: ApplicationRow;
  notes: ApplicationNote[];
}

interface Entry {
  detail: CandidateDetail;
  cvUrl: string | null;
  answerUrl: string | null;
  /** When the signed URLs were issued. */
  signedAt: number;
}

/**
 * How long a signed document URL is reused before being requested again.
 * Comfortably inside the lifetime the storage layer grants them, so a
 * reused URL is never a URL that has quietly stopped working.
 */
const SIGNED_TTL_MS = 4 * 60 * 1000;

export function useCandidateDetail(session: Session | null) {
  const cache = useRef(new Map<string, Entry>());
  /** Guards against a slow response for a candidate the reviewer has left. */
  const wanted = useRef<string | null>(null);

  const [openId, setOpenId] = useState<string | null>(null);
  const [detail, setDetail] = useState<CandidateDetail | null>(null);
  const [cvUrl, setCvUrl] = useState<string | null>(null);
  const [answerUrl, setAnswerUrl] = useState<string | null>(null);
  /** True only until the candidate's own data is on screen. */
  const [loading, setLoading] = useState(false);
  /** True while the two previews are still being signed. */
  const [docsLoading, setDocsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const signBoth = useCallback(async (id: string) => {
    // TOGETHER, NOT ONE AFTER THE OTHER. Neither depends on the other, and
    // an application with no submitted work must not delay the CV.
    const [cv, answer] = await Promise.all([
      signDocumentUrl(session, id, 'cv', 'preview').catch(() => null),
      signDocumentUrl(session, id, 'answer', 'preview').catch(() => null),
    ]);
    return { cv, answer };
  }, [session]);

  /**
   * Open a candidate. `onApplication` is called with the freshly read row so
   * the caller can patch that one row in its table: opening a CV advances the
   * status server-side, and this is how the table learns about it without
   * refetching every application in the semester.
   */
  const open = useCallback(async (id: string, onApplication?: (a: ApplicationRow) => void) => {
    wanted.current = id;
    setOpenId(id);
    setError(null);

    const hit = cache.current.get(id);
    const fresh = hit && Date.now() - hit.signedAt < SIGNED_TTL_MS;
    if (hit) {
      // Straight onto the screen, then verified behind it.
      setDetail(hit.detail);
      setCvUrl(fresh ? hit.cvUrl : null);
      setAnswerUrl(fresh ? hit.answerUrl : null);
      setLoading(false);
      setDocsLoading(!fresh);
    } else {
      setDetail(null); setCvUrl(null); setAnswerUrl(null);
      setLoading(true); setDocsLoading(true);
    }

    try {
      const d = await getApplication(session, id);
      if (wanted.current !== id) return;
      setDetail(d);
      setLoading(false);
      onApplication?.(d.application);

      if (!fresh) {
        const { cv, answer } = await signBoth(id);
        if (wanted.current !== id) return;
        setCvUrl(cv); setAnswerUrl(answer);
        cache.current.set(id, { detail: d, cvUrl: cv, answerUrl: answer, signedAt: Date.now() });
      } else {
        cache.current.set(id, { ...hit!, detail: d });
      }
    } catch (e) {
      if (wanted.current !== id) return;
      setError(e instanceof Error ? e.message : 'Could not open this candidate.');
      setLoading(false);
    } finally {
      if (wanted.current === id) setDocsLoading(false);
    }
  }, [session, signBoth]);

  const close = useCallback(() => {
    wanted.current = null;
    setOpenId(null); setDetail(null); setCvUrl(null); setAnswerUrl(null); setError(null);
  }, []);

  /** Re-read one candidate after a change, keeping the cache honest. */
  const refresh = useCallback(async (id: string) => {
    const d = await getApplication(session, id);
    const hit = cache.current.get(id);
    cache.current.set(id, {
      detail: d,
      cvUrl: hit?.cvUrl ?? null,
      answerUrl: hit?.answerUrl ?? null,
      signedAt: hit?.signedAt ?? 0,
    });
    if (wanted.current === id) setDetail(d);
    return d;
  }, [session]);

  /** Apply a status change locally without another round trip. */
  const patch = useCallback((id: string, changes: Partial<ApplicationRow>) => {
    const hit = cache.current.get(id);
    if (hit) {
      cache.current.set(id, { ...hit, detail: { ...hit.detail, application: { ...hit.detail.application, ...changes } } });
    }
    setDetail((prev) => (prev && prev.application.id === id
      ? { ...prev, application: { ...prev.application, ...changes } }
      : prev));
  }, []);

  return { openId, detail, cvUrl, answerUrl, loading, docsLoading, error, open, close, refresh, patch };
}

export default useCandidateDetail;
