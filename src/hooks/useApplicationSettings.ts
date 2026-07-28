import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { currentSemester } from '@/lib/semester';

// =====================================================================
// Application status — the single source of truth for "are we open?".
//
// Open/closed is derived from the scheduled window in application_settings
// (start_date / end_date) when auto_open is set, and from the manual
// applications_open flag otherwise.
//
// The important part is what happens when that row is missing or only
// half filled in. Closed is a DESIGNED state, not a failure state: the
// hook always resolves to a usable status, reports `isDegraded` so the
// pages can surface an admin-only warning, and never leaves a consumer
// with an empty semester label to print into a sentence.
// =====================================================================

export interface ApplicationSettings {
  /** Whether the application funnel is currently open. */
  applicationsOpen: boolean;
  /** Never empty: falls back to the current academic semester. */
  semesterLabel: string;
  applyFormUrl: string;
  /** Deadline, already formatted for display. Null when unknown. */
  deadlineDate: string | null;
  deadlineTime: string | null;
  /** Raw window, for consumers that need to compute rather than print. */
  startDate: Date | null;
  endDate: Date | null;
  /**
   * True when the row is absent, unreadable, or scheduled to open
   * automatically without a usable window. The page still renders its
   * closed state; only workspace accounts are told something is wrong.
   */
  isDegraded: boolean;
  /** Populated alongside isDegraded, for the admin-only notice. */
  degradedReason: string | null;
}

const FALLBACK: ApplicationSettings = {
  applicationsOpen: false,
  semesterLabel: currentSemester().label,
  applyFormUrl: '/apply',
  deadlineDate: null,
  deadlineTime: null,
  startDate: null,
  endDate: null,
  isDegraded: true,
  degradedReason: 'No application settings row was found.',
};

interface SettingsRow {
  semester_label: string | null;
  apply_form_url: string | null;
  start_date: string | null;
  end_date: string | null;
  applications_open: boolean | null;
  auto_open: boolean | null;
}

const parseDate = (value: string | null): Date | null => {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
};

// Deadlines are quoted in Italian time on the page, so they are formatted
// in Europe/Rome regardless of where the reader is.
const dateFormat = new Intl.DateTimeFormat('en-GB', {
  day: 'numeric',
  month: 'long',
  year: 'numeric',
  timeZone: 'Europe/Rome',
});
const timeFormat = new Intl.DateTimeFormat('en-GB', {
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
  timeZone: 'Europe/Rome',
});

export const useApplicationSettings = () => {
  const [settings, setSettings] = useState<ApplicationSettings>(FALLBACK);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    const fetchSettings = async () => {
      try {
        const { data, error } = await supabase
          .from('application_settings' as never)
          .select('semester_label, apply_form_url, start_date, end_date, applications_open, auto_open')
          .limit(1)
          .maybeSingle();

        if (cancelled) return;

        if (error) {
          console.error('Error fetching application settings:', error);
          setSettings({ ...FALLBACK, degradedReason: 'The application settings could not be read.' });
          return;
        }

        if (!data) {
          setSettings(FALLBACK);
          return;
        }

        const row = data as unknown as SettingsRow;
        const start = parseDate(row.start_date);
        const end = parseDate(row.end_date);
        const autoOpen = row.auto_open ?? true;

        // A scheduled intake needs both ends of the window. Anything else
        // is a half-populated row: stay closed and tell the workspace.
        const windowUsable = start !== null && end !== null && end.getTime() > start.getTime();
        const now = Date.now();

        let open: boolean;
        let degradedReason: string | null = null;

        if (autoOpen) {
          open = windowUsable && now >= start!.getTime() && now <= end!.getTime();
          if (!windowUsable) {
            degradedReason =
              'Applications are set to open automatically, but the intake window is incomplete. Set both the opening and the closing date in Workspace › Applications › Settings.';
          }
        } else {
          open = row.applications_open === true;
        }

        setSettings({
          applicationsOpen: open,
          semesterLabel: row.semester_label?.trim() || currentSemester().label,
          applyFormUrl: row.apply_form_url?.trim() || '/apply',
          deadlineDate: end ? dateFormat.format(end) : null,
          deadlineTime: end ? timeFormat.format(end) : null,
          startDate: start,
          endDate: end,
          isDegraded: degradedReason !== null,
          degradedReason,
        });
      } catch (error) {
        if (cancelled) return;
        console.error('Error fetching application settings:', error);
        setSettings({ ...FALLBACK, degradedReason: 'The application settings could not be read.' });
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };

    fetchSettings();
    return () => {
      cancelled = true;
    };
  }, []);

  return { settings, isLoading };
};
