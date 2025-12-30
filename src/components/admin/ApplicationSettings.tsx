import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Loader2, Save } from 'lucide-react';

interface ApplicationSettingsData {
  id: string;
  applications_open: boolean;
  semester_label: string;
  apply_form_url: string;
  updated_at: string;
}

const ApplicationSettings = () => {
  const [settings, setSettings] = useState<ApplicationSettingsData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [formData, setFormData] = useState({
    applications_open: false,
    semester_label: '',
    apply_form_url: '',
  });
  const { toast } = useToast();
  const { session } = useAuth();

  useEffect(() => {
    if (session?.access_token) {
      fetchSettings();
    }
  }, [session?.access_token]);

  const fetchSettings = async () => {
    if (!session?.access_token) {
      console.log('No session token available for fetching settings');
      setIsLoading(false);
      return;
    }
    
    try {
      console.log('Fetching application settings...');
      const { data, error } = await supabase.functions.invoke('admin-settings', {
        body: { action: 'get' },
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      console.log('Fetch response:', { data, error });

      if (error) throw error;

      if (data?.error) {
        toast({
          title: "Error",
          description: data.error,
          variant: "destructive",
        });
        return;
      }

      if (data?.data) {
        setSettings(data.data);
        setFormData({
          applications_open: data.data.applications_open,
          semester_label: data.data.semester_label,
          apply_form_url: data.data.apply_form_url,
        });
      }
    } catch (error) {
      console.error('Error fetching settings:', error);
      toast({
        title: "Error",
        description: "Failed to fetch application settings",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    if (!session?.access_token) {
      toast({
        title: "Error",
        description: "No active session. Please log in again.",
        variant: "destructive",
      });
      return;
    }
    
    setIsSaving(true);
    try {
      console.log('Saving application settings...', formData);
      const { data, error } = await supabase.functions.invoke('admin-settings', {
        body: { 
          action: 'update',
          settings: formData,
        },
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      console.log('Save response:', { data, error });

      if (error) {
        console.error('Supabase function error:', error);
        throw error;
      }

      if (data?.error) {
        toast({
          title: "Error",
          description: data.error,
          variant: "destructive",
        });
        return;
      }

      if (data?.data) {
        setSettings(data.data);
      }
      toast({
        title: "Success",
        description: "Application settings updated successfully",
      });
    } catch (error) {
      console.error('Error saving settings:', error);
      toast({
        title: "Error",
        description: `Failed to save application settings: ${error instanceof Error ? error.message : 'Unknown error'}`,
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleToggle = async (checked: boolean) => {
    setFormData(prev => ({ ...prev, applications_open: checked }));
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="font-serif text-heading">Application Settings</h2>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="font-serif">Recruitment Status</CardTitle>
          <CardDescription className="font-body">
            Control whether applications are open or closed for the current recruitment cycle.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Application Status Toggle */}
          <div className="flex items-center justify-between p-4 border border-separator rounded-lg">
            <div>
              <p className="font-body font-medium">Applications Open</p>
              <p className="font-body text-sm text-muted-foreground">
                {formData.applications_open 
                  ? "Applications are currently open. The 'Apply Now' button is visible on the homepage."
                  : "Applications are currently closed. The homepage shows recruitment is closed."
                }
              </p>
            </div>
            <Switch
              checked={formData.applications_open}
              onCheckedChange={handleToggle}
            />
          </div>

          {/* Semester Label */}
          <div className="space-y-2">
            <Label htmlFor="semester_label" className="font-body">Semester Label</Label>
            <Input
              id="semester_label"
              value={formData.semester_label}
              onChange={(e) => setFormData(prev => ({ ...prev, semester_label: e.target.value }))}
              placeholder="e.g., Spring 2026"
            />
            <p className="font-body text-sm text-muted-foreground">
              This label appears on the Join page when applications are open.
            </p>
          </div>

          {/* Apply Form URL */}
          <div className="space-y-2">
            <Label htmlFor="apply_form_url" className="font-body">Application Form URL</Label>
            <Input
              id="apply_form_url"
              value={formData.apply_form_url}
              onChange={(e) => setFormData(prev => ({ ...prev, apply_form_url: e.target.value }))}
              placeholder="https://forms.google.com/..."
            />
            <p className="font-body text-sm text-muted-foreground">
              The URL candidates are directed to when they click "Apply Now" on the Join page.
            </p>
          </div>

          {/* Save Button */}
          <div className="flex justify-end pt-4">
            <Button onClick={handleSave} disabled={isSaving} className="font-body">
              {isSaving ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  Save Changes
                </>
              )}
            </Button>
          </div>

          {/* Last Updated Info */}
          {settings?.updated_at && (
            <p className="font-body text-xs text-muted-foreground text-right">
              Last updated: {new Date(settings.updated_at).toLocaleString()}
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default ApplicationSettings;