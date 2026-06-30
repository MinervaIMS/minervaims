import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface ApplicationSettings {
  applicationsOpen: boolean;
  semesterLabel: string;
  applyFormUrl: string;
  startDate: string | null;
  endDate: string | null;
}

const DEFAULT_SETTINGS: ApplicationSettings = {
  applicationsOpen: false,
  semesterLabel: 'Spring 2026',
  applyFormUrl: '/apply',
  startDate: null,
  endDate: null,
};

/**
 * Window-driven applications gate.
 * `applicationsOpen` is derived purely from start_date/end_date — the manual
 * toggle has been removed so scheduling is the single source of truth.
 */
export const useApplicationSettings = () => {
  const [settings, setSettings] = useState<ApplicationSettings>(DEFAULT_SETTINGS);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchSettings = async () => {
      try {
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
          const row = data as unknown as {
            semester_label: string;
            apply_form_url: string | null;
            start_date: string | null;
            end_date: string | null;
          };
          const now = Date.now();
          const start = row.start_date ? new Date(row.start_date).getTime() : null;
          const end = row.end_date ? new Date(row.end_date).getTime() : null;
          const open = start !== null && end !== null && now >= start && now <= end;
          setSettings({
            applicationsOpen: open,
            semesterLabel: row.semester_label,
            applyFormUrl: row.apply_form_url || '/apply',
            startDate: row.start_date,
            endDate: row.end_date,
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
