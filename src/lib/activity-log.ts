// =====================================================================
// Activity logging, from the client. THE EXCEPTION, NOT THE RULE.
// ---------------------------------------------------------------------
// The audit trail is written on the SERVER now. Every edge function is
// wrapped by `supabase/functions/_shared/activity.ts`, which records who
// asked for what, with which role, and whether it succeeded, after the
// response has gone back. That is where the trail comes from, and it is
// complete by construction: a subsection added next year is audited the
// day it is written, because the function it goes through is wrapped
// already.
//
// This module used to be that trail, and it was the reason the log was
// half empty. Forty-eight calls, written out by hand in twenty-five
// components, each of them a thing an author had to remember; every one
// that was forgotten was a write that happened and was never recorded,
// with nothing anywhere to say so. Those forty-eight are gone, because
// the function behind each of them now records the same event itself,
// and keeping both would have written every action to the log twice.
//
// WHAT IS LEFT HERE IS WHAT THE SERVER CANNOT SEE:
//
//   * a download, which happens entirely in the browser and reaches no
//     function at all;
//   * the two writes the workspace still makes straight to a table
//     rather than through a function.
//
// Add a call here only for something in one of those two categories. If
// the action goes through an edge function, it is already logged, and a
// second entry makes the trail harder to read rather than fuller.
//
// ---------------------------------------------------------------------
// IT NEVER DELAYS ANYTHING AND IT NEVER THROWS.
//
// `void logActivity(...)` is the intended shape and the reason this
// returns nothing worth awaiting: several call sites used to await it
// before showing the result, so a member watched a spinner through a
// second round trip in order to write a line they will never read. The
// promise is deliberately swallowed here, so a caller cannot accidentally
// make the interface wait for it, and a failure is a console warning and
// nothing else.
// =====================================================================

import { supabase } from '@/integrations/supabase/client';
import type { Session } from '@supabase/supabase-js';

export interface ActivityEvent {
  action: 'create' | 'update' | 'delete' | 'status_change' | 'registration' | 'approval' | 'rejection' | 'upload' | 'download' | 'close' | 'open';
  section: string;      // e.g. 'Events'
  subsection: string;   // e.g. 'Association on Display'
  entityType: string;   // e.g. 'aod_signup'
  entityId?: string | null;
  entityName?: string | null;   // human reference to the affected item
  details?: Record<string, unknown>;
}

/**
 * Records one client-side event. Returns immediately.
 *
 * The write goes through the `log_activity()` database function, which
 * stamps the caller's identity and current role server-side from the
 * verified session, so nothing about who did it is taken from the
 * browser. A direct insert stands in if that function is unavailable.
 */
export function logActivity(
  session: Session | null,
  role: string | null,
  ev: ActivityEvent,
): void {
  const user = session?.user;
  if (!user) return;
  void send(user.id, user.email ?? '', role, ev);
}

async function send(
  userId: string,
  email: string,
  role: string | null,
  ev: ActivityEvent,
): Promise<void> {
  try {
    const { error } = await supabase.rpc('log_activity', {
      p_action: ev.action,
      p_entity_type: ev.entityType,
      p_entity_name: ev.entityName ?? null,
      p_section: ev.section,
      p_subsection: ev.subsection,
      p_entity_id: ev.entityId ?? null,
      p_details: (ev.details as never) ?? null,
    } as never);
    if (!error) return;
    console.warn('activity log rpc failed, falling back to direct insert', error.message);
  } catch (e) {
    console.warn('activity log rpc threw, falling back to direct insert', e);
  }
  try {
    const { error } = await supabase.from('activity_logs').insert({
      user_id: userId,
      user_email: email,
      user_role: role ?? 'member',
      action: ev.action,
      entity_type: ev.entityType,
      entity_id: ev.entityId ?? null,
      entity_name: ev.entityName ?? null,
      section: ev.section,
      subsection: ev.subsection,
      details: (ev.details as never) ?? null,
    } as never);
    if (error) console.warn('activity log write failed', error.message);
  } catch (e) {
    console.warn('activity log write failed', e);
  }
}
