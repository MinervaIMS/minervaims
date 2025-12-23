import { useState, useEffect } from 'react';
import { useCookieConsent } from './CookieContext';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';

interface CookieCategory {
  id: 'necessary' | 'preferences' | 'analytics' | 'externalMedia';
  name: string;
  description: string;
  required: boolean;
}

const cookieCategories: CookieCategory[] = [
  {
    id: 'necessary',
    name: 'Strictly Necessary',
    description: 'Required for the website to function. These cookies cannot be disabled.',
    required: true,
  },
  {
    id: 'preferences',
    name: 'Preferences',
    description: 'Allow the website to remember choices you make (such as language or region) and provide enhanced features.',
    required: false,
  },
  {
    id: 'analytics',
    name: 'Analytics',
    description: 'Help us understand how visitors interact with the website by collecting anonymous information.',
    required: false,
  },
  {
    id: 'externalMedia',
    name: 'External Media',
    description: 'Allow embedded content from third-party platforms (e.g., social media) to load.',
    required: false,
  },
];

export function CookiePreferences() {
  const { showPreferences, consent, savePreferences, closePreferences, acceptAll, rejectNonEssential } = useCookieConsent();
  
  const [localPreferences, setLocalPreferences] = useState({
    necessary: true,
    preferences: false,
    analytics: false,
    externalMedia: false,
  });

  useEffect(() => {
    if (consent) {
      setLocalPreferences({
        necessary: true,
        preferences: consent.preferences,
        analytics: consent.analytics,
        externalMedia: consent.externalMedia,
      });
    }
  }, [consent]);

  const handleToggle = (category: CookieCategory['id']) => {
    if (category === 'necessary') return;
    setLocalPreferences(prev => ({
      ...prev,
      [category]: !prev[category],
    }));
  };

  const handleSave = () => {
    savePreferences(localPreferences);
  };

  if (!showPreferences) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-foreground/50" 
        onClick={closePreferences}
        aria-hidden="true"
      />
      
      {/* Modal */}
      <div className="relative bg-background border border-border shadow-lg max-w-lg w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6 space-y-6">
          <div>
            <h2 className="font-serif text-heading text-foreground mb-2">
              Cookie Settings
            </h2>
            <p className="font-body text-small text-muted-foreground">
              Manage your cookie preferences. Non-essential cookies are only used with your consent.
            </p>
          </div>

          <div className="space-y-4">
            {cookieCategories.map((category) => (
              <div 
                key={category.id} 
                className="flex items-start justify-between gap-4 py-3 border-b border-border last:border-b-0"
              >
                <div className="flex-1">
                  <Label 
                    htmlFor={category.id}
                    className="font-serif text-body font-semibold text-foreground cursor-pointer"
                  >
                    {category.name}
                  </Label>
                  <p className="font-body text-xs text-muted-foreground mt-1">
                    {category.description}
                  </p>
                </div>
                <Switch
                  id={category.id}
                  checked={localPreferences[category.id]}
                  onCheckedChange={() => handleToggle(category.id)}
                  disabled={category.required}
                  aria-describedby={`${category.id}-description`}
                />
              </div>
            ))}
          </div>

          <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t border-border">
            <Button
              onClick={rejectNonEssential}
              variant="outline"
              className="font-body text-small flex-1"
            >
              Reject All
            </Button>
            <Button
              onClick={handleSave}
              variant="outline"
              className="font-body text-small flex-1"
            >
              Save Preferences
            </Button>
            <Button
              onClick={acceptAll}
              variant="default"
              className="font-body text-small flex-1"
            >
              Accept All
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
