// =====================================================================
// activity.ts — the audit trail, recorded where the writes happen.
// ---------------------------------------------------------------------
// WHY THE LOG WAS EMPTY, AND WHY MOVING IT HERE IS THE FIX.
//
// Logging used to be a call the CLIENT made, by hand, after it had
// finished a save:
//
//     await saveThing(...);
//     logActivity(session, role, { action: 'update', section: ..., ... });
//
// Fifty such calls across twenty-eight components, and every one of them
// a thing an author has to remember. That arrangement fails in four ways
// at once, and all four were live:
//
//   * IT IS INCOMPLETE BY CONSTRUCTION. A page that forgets the call
//     writes nothing to the log, and nothing anywhere says it forgot. As
//     the workspace grew, the proportion of writes that were recorded
//     fell, silently. An audit trail that is missing entries is worse
//     than no audit trail, because it is read as complete.
//
//   * IT RECORDS AN INTENTION, NOT AN EVENT. The client logs what it
//     BELIEVES it just did. If the server refused the write, or accepted
//     part of it, the log says it happened anyway.
//
//   * IT IS THE EASIEST THING IN THE REQUEST TO LOSE. It is a second
//     round trip, from a browser, after the one that mattered; a closed
//     tab, a dropped connection or a navigation between the two and the
//     entry is simply gone.
//
//   * IT COSTS THE MEMBER TIME. Several call sites awaited it before
//     showing the result, so every save carried a second round trip
//     purely so that a log the member never reads could be written.
//
// So it moves to the server, where the write actually happens. Every
// edge function is wrapped, the wrapper sees the request AND the
// response, and it records what was asked, by whom, with which role, and
// WHETHER IT SUCCEEDED. Nothing has to be remembered by anybody: a new
// subsection is audited the day it is written, because the function it
// goes through is already wrapped.
//
// ---------------------------------------------------------------------
// IT CANNOT SLOW THE WORKSPACE DOWN, BY CONSTRUCTION.
//
// The entry is written AFTER the response has been handed back, never
// before. `EdgeRuntime.waitUntil` is what keeps the runtime alive long
// enough to finish it; where that is unavailable the promise simply
// floats. The member's request is never waiting on it, and a logging
// failure is swallowed rather than surfaced, because a broken audit
// trail must never break the thing being audited.
//
// READS ARE NOT LOGGED. Recording every list call would bury the writes
// under thousands of rows of noise within a week and would make the log
// unusable for the one thing it exists for. `MUTATES` below decides.
// =====================================================================

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';

/** What the wrapper collects while the handler runs. */
interface AuditState {
  userId?: string;
  email?: string;
  role?: string;
  action?: string;
  entityName?: string | null;
  entityId?: string | null;
  details?: Record<string, unknown>;
}

export interface AuditHandle {
  /** Called once the caller has been identified. */
  actor(user: { id: string; email?: string | null }, roles: string[]): void;
  /** Called once the request body has been read. */
  request(action: string, body: Record<string, unknown>): void;
  /** Optional: name the affected record more precisely than the body does. */
  subject(name?: string | null, id?: string | null): void;
}

// ---------------------------------------------------------------------
// WHERE EACH FUNCTION'S WRITES BELONG, in the workspace's own words.
// The log is read by people who know the navigation, not the codebase.
// ---------------------------------------------------------------------
const PLACE: Record<string, { section: string; subsection: string }> = {
  'admin-alumni': { section: 'People', subsection: 'Alumni' },
  'admin-alumni-calls': { section: 'Events', subsection: 'Alumni calls' },
  'admin-aod': { section: 'Events', subsection: 'Association on Display' },
  'admin-applications': { section: 'Recruiting', subsection: 'Candidates screening' },
  'admin-auto-emails': { section: 'Operations', subsection: 'Automatic emails' },
  'admin-calendar': { section: 'General', subsection: 'Calendar' },
  'admin-events': { section: 'Events', subsection: 'Event archive' },
  'admin-fees': { section: 'Operations', subsection: 'Membership fees' },
  'admin-files': { section: 'Reports', subsection: 'Report archive' },
  'admin-funds': { section: 'Reports', subsection: 'Fund performances' },
  'admin-history': { section: 'Website', subsection: 'History' },
  'admin-interviews': { section: 'Recruiting', subsection: 'Interview calendar' },
  'admin-join-faqs': { section: 'Website', subsection: 'FAQs' },
  'admin-members': { section: 'People', subsection: 'Members' },
  'admin-readings': { section: 'Website', subsection: 'Readings' },
  'admin-resources': { section: 'Workspace', subsection: 'Resources' },
  'admin-settings': { section: 'Recruiting', subsection: 'Applications on website' },
  'admin-smm': { section: 'Media & Communication', subsection: 'Editorial calendar' },
  'admin-team': { section: 'People', subsection: 'Members' },
  'admin-testimonials': { section: 'Website', subsection: 'Testimonials' },
  'admin-treasury': { section: 'Operations', subsection: 'Treasury' },
  'admin-users': { section: 'Settings', subsection: 'Users' },
  'admin-event-reg': { section: 'Events', subsection: 'Registration forms' },
};

/**
 * Actions that CHANGE something, and the verb the log prints for them.
 *
 * The key is either `fn:action` for the cases that need to be specific,
 * or a bare `action` shared by every function that uses that name. An
 * action absent from both is treated as a read and is not recorded.
 */
const MUTATES: Record<string, string> = {
  // Shared verbs, used the same way by many functions.
  save: 'update', create: 'create', add: 'create', insert: 'create',
  update: 'update', edit: 'update', upsert: 'update', reorder: 'update',
  delete: 'delete', remove: 'delete',
  publish: 'update', unpublish: 'update', 'set-published': 'update',
  'set-open': 'update', 'set-visible': 'update', 'set-role': 'update',
  open: 'open', close: 'close',
  upload: 'upload', signup: 'registration', register: 'registration',
  'remove-signup': 'delete',
  approve: 'approval', reject: 'rejection',
  // The specific ones, where the shared verb would say too little.
  'admin-applications:set-status': 'status_change',
  'admin-applications:set-evaluation-division': 'status_change',
  'admin-applications:send-offer': 'approval',
  'admin-applications:resend-offer': 'approval',
  'admin-fees:set-paid': 'update',
  'admin-smm:editorial-save': 'update',
  'admin-smm:editorial-delete': 'delete',
  'admin-smm:ads-save': 'update',
  'admin-smm:ads-delete': 'delete',
  'admin-aod:create-day': 'create',
  'admin-aod:delete-day': 'delete',
  'admin-interviews:save-slots': 'update',
  'admin-interviews:book': 'registration',
  'admin-interviews:cancel': 'delete',
  'admin-auto-emails:save-template': 'update',
  'admin-auto-emails:create-template': 'create',
};

/** What a write is called in the log, or null when it is a read. */
function verbFor(fn: string, action: string): string | null {
  return MUTATES[`${fn}:${action}`] ?? MUTATES[action] ?? null;
}

/**
 * A human reference to what was touched, dug out of the request body.
 *
 * The bodies are not uniform, so this looks for the handful of shapes
 * they actually use rather than pretending there is a schema. When it
 * finds nothing it returns null, and the log prints the action alone,
 * which is still the useful half.
 */
function nameFrom(body: Record<string, unknown>): string | null {
  const direct = ['title', 'name', 'label', 'question', 'description', 'email', 'semester_label'];
  for (const k of direct) {
    const v = body[k];
    if (typeof v === 'string' && v.trim()) return v.trim().slice(0, 160);
  }
  for (const holder of ['item', 'entry', 'faq', 'member', 'event', 'template', 'ad', 'reading', 'testimonial', 'alumnus', 'resource', 'settings']) {
    const nested = body[holder];
    if (nested && typeof nested === 'object') {
      const found = nameFrom(nested as Record<string, unknown>);
      if (found) return found;
    }
  }
  return null;
}

/** A uuid from the body, if there is an obvious one. */
function idFrom(body: Record<string, unknown>): string | null {
  const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  for (const k of ['id', 'userId', 'user_id', 'day_id', 'period_id', 'member_id', 'entity_id', 'applicationId', 'application_id']) {
    const v = body[k];
    if (typeof v === 'string' && UUID.test(v)) return v;
  }
  return null;
}

/**
 * The single role an entry is stamped with.
 *
 * Somebody can hold more than one; the log names the most senior, which
 * is the one that actually authorised the action.
 */
const RANK = [
  'admin', 'president', 'vice_president', 'head_of_asset_management', 'head_of_operations',
  'head_of_media', 'head_of_division', 'portfolio_manager', 'team_leader',
  'senior_analyst', 'media_analyst', 'analyst', 'advisor', 'alumni', 'member',
];
function seniorRole(roles: string[]): string {
  for (const r of RANK) if (roles.includes(r)) return r;
  return roles[0] ?? 'member';
}

/** Runs work after the response, where the runtime supports it. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function afterResponse(p: Promise<unknown>) {
  const rt = (globalThis as any).EdgeRuntime;
  if (rt && typeof rt.waitUntil === 'function') rt.waitUntil(p);
  else void p;
}

async function write(fn: string, s: AuditState, status: number) {
  if (!s.userId || !s.action) return;
  const verb = verbFor(fn, s.action);
  if (!verb) return;                                   // a read: not recorded
  const place = PLACE[fn] ?? { section: 'Workspace', subsection: fn };
  const ok = status >= 200 && status < 300;
  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );
    await supabase.from('activity_logs').insert({
      user_id: s.userId,
      user_email: s.email ?? '',
      user_role: s.role ?? 'member',
      action: verb,
      entity_type: fn.replace(/^admin-/, ''),
      entity_id: s.entityId ?? null,
      entity_name: s.entityName ?? null,
      section: place.section,
      subsection: place.subsection,
      // THE OUTCOME IS PART OF THE RECORD. A refused attempt is exactly
      // what a security log is for, and it must be distinguishable from
      // one that went through.
      details: { request: s.action, status, outcome: ok ? 'succeeded' : 'refused', ...(s.details ?? {}) },
    });
  } catch {
    // Never surfaced and never retried. A log that can break a save is
    // worse than a log with a gap in it.
  }
}

/**
 * Wraps an edge function handler so that every write it performs is
 * recorded, once, after the response has gone back.
 *
 *   Deno.serve(audited('admin-smm', async (req, audit) => { ... }));
 *
 * The handler calls `audit.actor(user, roles)` once it knows who is
 * asking, and `audit.request(action, body)` once it has read the body.
 * Everything else is inferred.
 */
export function audited(
  fn: string,
  handler: (req: Request, audit: AuditHandle) => Promise<Response>,
): (req: Request) => Promise<Response> {
  return async (req: Request) => {
    const state: AuditState = {};
    const audit: AuditHandle = {
      actor(user, roles) {
        state.userId = user.id;
        state.email = user.email ?? '';
        state.role = seniorRole(roles);
      },
      request(action, body) {
        state.action = action;
        state.entityName = nameFrom(body ?? {});
        state.entityId = idFrom(body ?? {});
      },
      subject(name, id) {
        if (name !== undefined) state.entityName = name;
        if (id !== undefined) state.entityId = id;
      },
    };
    let response: Response;
    try {
      response = await handler(req, audit);
    } catch (error) {
      afterResponse(write(fn, state, 500));
      throw error;
    }
    if (req.method !== 'OPTIONS') afterResponse(write(fn, state, response.status));
    return response;
  };
}
