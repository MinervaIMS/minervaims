import { useCookieConsent } from './CookieContext';
import { Button } from '@/components/ui/button';

export function CookieBanner() {
  const { showBanner, acceptAll, rejectNonEssential, openPreferences } = useCookieConsent();

  if (!showBanner) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 bg-background border-t border-border shadow-lg">
      <div className="container py-4 md:py-6">
        <div className="flex flex-col gap-4">
          <div className="space-y-2">
            <h3 className="font-serif text-body font-semibold text-foreground">
              Cookie Consent
            </h3>
            <p className="font-body text-small text-muted-foreground max-w-3xl">
              We use cookies to ensure the website functions correctly and to improve your experience. 
              Non-essential cookies are used only with your consent. You can change your preferences 
              at any time via the Cookie Policy page.
            </p>
          </div>
          
          <div className="flex flex-col sm:flex-row gap-3">
            <Button
              onClick={rejectNonEssential}
              variant="outline"
              className="font-body text-small"
            >
              Reject Non-Essential
            </Button>
            <Button
              onClick={openPreferences}
              variant="outline"
              className="font-body text-small"
            >
              Manage Settings
            </Button>
            <Button
              onClick={acceptAll}
              variant="default"
              className="font-body text-small text-white"
            >
              Accept All
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
