import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { openApplyDivisions, closedApplyDivisions } from '@/lib/applications-api';
import type { OrgDivision } from '@/lib/roles';

// =====================================================================
// TWO QUESTIONS, AND A ROUND CAN END BY ANSWERING EITHER.
// ---------------------------------------------------------------------
// `applicationsOpen` has always meant ONE thing: the scheduled window is
// running. It keeps that meaning exactly, because several pages lean on
// it for other purposes (the written questions lock while a round is on,
// whether or not any division is still taking part).
//
// `acceptingApplications` is the new question, and it is the one the
// PUBLIC surfaces ask: is the window running AND is there a division left
// to apply to? A round where every division has filled its places is over
// for a visitor, however many days the schedule has left, and the site
// says so in the same words it uses after the closing date.
// =====================================================================
interface ApplicationSettings {
  /** The scheduled window is running. */
  applicationsOpen: boolean;
  /** The window is running AND at least one division is still taking part. */
  acceptingApplications: boolean;
  semesterLabel: string;
  applyFormUrl: string;
  /** Window bounds, when the row supplies them. */
  startDate: Date | null;
  endDate: Date | null;
  /** Divisions that filled their places and closed before the round ended. */
  closedDivisions: OrgDivision[];
  /** The divisions the form still offers. */
  openDivisions: OrgDivision[];
  /**
   * True once a row has been read and it carries both window dates. When this
   * is false the page is in its closed state because the intake has not been
   * configured, not because the window has passed: surfaces that care about
   * the difference (the /join admin notice) read this flag.
   */
  isConfigured: boolean;
}

const DEFAULT_SETTINGS: ApplicationSettings = {
  applicationsOpen: false,
  acceptingApplications: false,
  semesterLabel: 'Spring 2026',
  applyFormUrl: 'https://forms.google.com/your-form-url',
  startDate: null,
  endDate: null,
  closedDivisions: [],
  openDivisions: openApplyDivisions([]),
  isConfigured: false,
};

const toDate = (value: string | null): Date | null => {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
};

export const useApplicationSettings = () => {
  const [settings, setSettings] = useState<ApplicationSettings>(DEFAULT_SETTINGS);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        // Use raw query to avoid type issues with new table
        const { data, error } = await supabase
          .from('application_settings' as never)
          .select('semester_label, apply_form_url, start_date, end_date, closed_divisions')
          .limit(1)
          .maybeSingle();

        if (error) {
          console.error('Error fetching application settings:', error);
          return;
        }

        if (data) {
          const typedData = data as unknown as {
            semester_label: string; apply_form_url: string;
            start_date: string | null; end_date: string | null;
            closed_divisions?: string[] | null;
          };
          // Open/close is determined strictly by the scheduled window.
          const now = Date.now();
          const startDate = toDate(typedData.start_date);
          const endDate = toDate(typedData.end_date);
          const start = startDate ? startDate.getTime() : null;
          const end = endDate ? endDate.getTime() : null;
          const open = start !== null && end !== null && now >= start && now <= end;
          // A column added by migration: a workspace whose database has not
          // been migrated yet reads `undefined` and behaves exactly as before.
          const rawClosed = typedData.closed_divisions ?? [];
          const closedDivisions = closedApplyDivisions(rawClosed);
          const openDivisions = openApplyDivisions(rawClosed);
          setSettings({
            applicationsOpen: open,
            acceptingApplications: open && openDivisions.length > 0,
            closedDivisions,
            openDivisions,
            // A row with a blank label still has to render a sentence, so fall
            // back to the default rather than printing an empty semester.
            semesterLabel: typedData.semester_label?.trim() || DEFAULT_SETTINGS.semesterLabel,
            applyFormUrl: typedData.apply_form_url,
            startDate,
            endDate,
            isConfigured: startDate !== null && endDate !== null,
          });
        }
      } catch (error) {
        console.error('Error fetching application settings:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchSettings();
  }, []);

  return { settings, isLoading };
};
