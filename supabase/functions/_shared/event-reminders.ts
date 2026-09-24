// =====================================================================
// Registration reminders: when each one goes out, and what it is doing.
// ---------------------------------------------------------------------
// The sending itself happens in the database (see the migration
// 20260923140200_event_registration_reminders.sql): a job every ten
// minutes sends one due (event, stage) to every active member not yet on
// the event's list. This file only answers "what is the schedule of this
// event", for the Registration Forms page, with the same rules:
//
//   - a stage is due on the event day (Rome) minus 14, 7 or 3 days;
//   - it can still go out the following day if its own day was missed,
//     and never after that;
//   - a stopped event, or one whose form is closed, sends nothing.
//
// Mirrored for display by `ReminderStageStatus` in src/lib/events-api.ts.
// =====================================================================

import { romeToday } from './attendance-window.ts';

export type ReminderStage = '2w' | '1w' | '3d';

export const REMINDER_STAGES: { stage: ReminderStage; days: number; label: string }[] = [
  { stage: '2w', days: 14, label: '2 weeks before' },
  { stage: '1w', days: 7, label: '1 week before' },
  { stage: '3d', days: 3, label: '3 days before' },
];

export const REMINDER_TEMPLATE_KEY: Record<ReminderStage, string> = {
  '2w': 'ws_event_reminder_2w',
  '1w': 'ws_event_reminder_1w',
  '3d': 'ws_event_reminder_3d',
};

export function isReminderStage(v: unknown): v is ReminderStage {
  return v === '2w' || v === '1w' || v === '3d';
}

/** The event's day on the association's clock, as YYYY-MM-DD. */
export function eventDay(startAt: string | null | undefined, date: string | null | undefined): string | null {
  if (startAt) {
    const d = new Date(startAt);
    if (!isNaN(d.getTime())) return romeToday(d);
  }
  return date ? String(date).slice(0, 10) : null;
}

function addDays(iso: string, n: number): string {
  const [y, m, d] = iso.slice(0, 10).split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d + n)).toISOString().slice(0, 10);
}

export type ReminderState = 'sent' | 'scheduled' | 'on_hold' | 'skipped';

export interface ReminderStageStatus {
  stage: ReminderStage;
  label: string;
  due_on: string;
  state: ReminderState;
  sent_at: string | null;
  recipients: number | null;
  /** Its own day was missed and it goes out on the grace day, today. */
  catching_up: boolean;
}

export interface ReminderLogRow { stage: string; sent_at: string; recipients: number }

/**
 * The three stages of one event. `on_hold` is a stage still ahead that
 * will not go out while the reminders are stopped or the form is closed;
 * `skipped` is one whose last possible day has passed without it.
 */
export function reminderSchedule(
  day: string | null,
  log: ReminderLogRow[],
  opts: { paused: boolean; registrationEnabled: boolean; today?: string },
): ReminderStageStatus[] {
  if (!day) return [];
  const today = opts.today ?? romeToday();
  return REMINDER_STAGES.map(({ stage, days, label }) => {
    const dueOn = addDays(day, -days);
    const sent = log.find((l) => l.stage === stage);
    let state: ReminderState;
    if (sent) state = 'sent';
    else if (today > addDays(dueOn, 1)) state = 'skipped';
    else if (opts.paused || !opts.registrationEnabled) state = 'on_hold';
    else state = 'scheduled';
    return {
      stage, label, due_on: dueOn, state,
      sent_at: sent?.sent_at ?? null,
      recipients: sent ? sent.recipients : null,
      catching_up: state === 'scheduled' && today > dueOn,
    };
  });
}
