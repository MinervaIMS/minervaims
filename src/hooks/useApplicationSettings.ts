import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface ApplicationSettings {
  applicationsOpen: boolean;
  semesterLabel: string;
  applyFormUrl: string;
}

const DEFAULT_SETTINGS: ApplicationSettings = {
  applicationsOpen: false,
  semesterLabel: 'Spring 2026',
  applyFormUrl: 'https://forms.google.com/your-form-url',
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
          const start = typedData.start_date ? new Date(typedData.start_date).getTime() : null;
          const end = typedData.end_date ? new Date(typedData.end_date).getTime() : null;
          const open = start !== null && end !== null && now >= start && now <= end;
          setSettings({
            applicationsOpen: open,
            semesterLabel: typedData.semester_label,
            applyFormUrl: typedData.apply_form_url,
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
