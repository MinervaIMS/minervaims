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
          .from('application_settings' as any)
          .select('applications_open, semester_label, apply_form_url')
          .limit(1)
          .maybeSingle();

        if (error) {
          console.error('Error fetching application settings:', error);
          return;
        }

        if (data) {
          const typedData = data as unknown as { applications_open: boolean; semester_label: string; apply_form_url: string };
          setSettings({
            applicationsOpen: typedData.applications_open,
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