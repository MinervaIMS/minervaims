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
        const { data, error } = await supabase
          .from('application_settings')
          .select('applications_open, semester_label, apply_form_url')
          .limit(1)
          .single();

        if (error) {
          console.error('Error fetching application settings:', error);
          return;
        }

        if (data) {
          setSettings({
            applicationsOpen: data.applications_open,
            semesterLabel: data.semester_label,
            applyFormUrl: data.apply_form_url,
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