import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface ApplicationSettings {
  applicationsOpen: boolean;
  semesterLabel: string;
  applyFormUrl: string;
  /** Window bounds, when the row supplies them. */
  startDate: Date | null;
  endDate: Date | null;
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
  semesterLabel: 'Spring 2026',
  applyFormUrl: 'https://forms.google.com/your-form-url',
  startDate: null,
  endDate: null,
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
          .select('semester_label, apply_form_url, start_date, end_date')
          .limit(1)
          .maybeSingle();

        if (error) {
          console.error('Error fetching application settings:', error);
          return;
        }

        if (data) {
          const typedData = data as unknown as { semester_label: string; apply_form_url: string; start_date: string | null; end_date: string | null };
          // Open/close is determined strictly by the scheduled window.
          const now = Date.now();
          const startDate = toDate(typedData.start_date);
          const endDate = toDate(typedData.end_date);
          const start = startDate ? startDate.getTime() : null;
          const end = endDate ? endDate.getTime() : null;
          const open = start !== null && end !== null && now >= start && now <= end;
          setSettings({
            applicationsOpen: open,
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
