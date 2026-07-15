// =====================================================================
// Activity logging — one helper every workspace page can call.
// Records who did what, where (section/subsection), to which entity, and
// with WHICH ROLE AT THAT MOMENT (entries never change retroactively when
// someone's role changes later). Best-effort: a logging failure must never
// break the user's action.
//
// The write goes through the log_activity() database function, which
// stamps the caller's identity and CURRENT role server-side from the
// verified session (nothing here is trusted from the frontend). If the
// function is unavailable, it falls back to a direct RLS-guarded insert.
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

export async function logActivity(
  session: Session | null,
  role: string | null,
  ev: ActivityEvent,
): Promise<void> {
  const user = session?.user;
  if (!user) return;
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
      user_id: user.id,
      user_email: user.email ?? '',
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
