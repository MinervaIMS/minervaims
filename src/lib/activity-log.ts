// =====================================================================
// Activity logging — one helper every workspace page can call.
// Records who did what, where (section/subsection), to which entity, and
// with WHICH ROLE AT THAT MOMENT (entries never change retroactively when
// someone's role changes later). Best-effort: a logging failure must never
// break the user's action.
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
  try {
    const user = session?.user;
    if (!user) return;
    await supabase.from('activity_logs').insert({
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
  } catch (e) {
    console.warn('activity log write failed', e);
  }
}
