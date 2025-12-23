import { PageIntroduction } from '@/components/shared';
import { useCookieConsent } from '@/components/cookies';
import { Button } from '@/components/ui/button';

const CookiePolicy = () => {
  const { openPreferences } = useCookieConsent();

  return (
    <>
      <PageIntroduction
        title="Cookie Policy"
        description="This Cookie Policy explains how MIMS uses cookies and similar technologies on this website, and how you can control them. Non-essential cookies are set only with your consent."
      />

      <div className="container py-section-sm md:py-section">
        <div className="max-w-3xl space-y-8">
          {/* Manage Cookie Preferences Button */}
          <div className="pb-6 border-b border-border">
            <Button
              onClick={openPreferences}
              variant="default"
              className="font-body text-[15px] text-white"
            >
              Manage Cookie Preferences
            </Button>
          </div>

          <p className="font-body text-small text-muted-foreground">
            Last updated: January 1st, 2026
          </p>

          <section>
            <h2 className="font-serif text-heading mb-4">1. What Cookies Are</h2>
            <p className="font-body text-body text-muted-foreground">
              Cookies are small text files stored on your device. We may also use similar technologies 
              (e.g., local storage or pixels) where applicable.
            </p>
          </section>

          <section>
            <h2 className="font-serif text-heading mb-4">2. How We Use Cookies</h2>
            <div className="font-body text-body text-muted-foreground space-y-2">
              <p>We use:</p>
              <ul className="list-disc list-inside pl-4 space-y-1">
                <li><strong>Strictly necessary cookies</strong> (required for the website to function and for security),</li>
                <li><strong>Preference cookies</strong> (to remember settings),</li>
                <li><strong>Analytics cookies</strong> (to understand usage and improve the site),</li>
                <li><strong>Third-party cookies</strong> (e.g., embedded social content) where enabled.</li>
              </ul>
              <p className="mt-2">Non-essential cookies are used only with your consent.</p>
            </div>
          </section>

          <section>
            <h2 className="font-serif text-heading mb-4">3. Legal Basis</h2>
            <p className="font-body text-body text-muted-foreground">
              Strictly necessary cookies are used because they are required to provide the service you explicitly 
              request and to maintain security. All other cookies are used only with your consent, which you can 
              withdraw at any time.
            </p>
          </section>

          <section>
            <h2 className="font-serif text-heading mb-4">4. Your Choices</h2>
            <div className="font-body text-body text-muted-foreground space-y-2">
              <p>You can:</p>
              <ul className="list-disc list-inside pl-4 space-y-1">
                <li>Accept all cookies,</li>
                <li>Reject all non-essential cookies,</li>
                <li>Customise choices by category,</li>
              </ul>
              <p className="mt-2">
                at any time via the{' '}
                <button 
                  onClick={openPreferences}
                  className="text-accent underline hover:text-accent/80"
                >
                  Manage Cookie Preferences
                </button>
                {' '}button above.
              </p>
              <p className="mt-2">
                You can also control cookies via your browser settings, but blocking necessary cookies may 
                affect site functionality.
              </p>
            </div>
          </section>

          <section>
            <h2 className="font-serif text-heading mb-4">5. Cookie List</h2>
            <div className="font-body text-body text-muted-foreground space-y-4">
              <p>
                The following table lists the cookies used on this website:
              </p>
              
              <div className="overflow-x-auto">
                <table className="w-full border-collapse border border-border text-small">
                  <thead>
                    <tr className="bg-muted">
                      <th className="border border-border p-2 text-left font-serif">Cookie Name</th>
                      <th className="border border-border p-2 text-left font-serif">Provider</th>
                      <th className="border border-border p-2 text-left font-serif">Category</th>
                      <th className="border border-border p-2 text-left font-serif">Purpose</th>
                      <th className="border border-border p-2 text-left font-serif">Duration</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td className="border border-border p-2">mims_cookie_consent</td>
                      <td className="border border-border p-2">MIMS</td>
                      <td className="border border-border p-2">Strictly Necessary</td>
                      <td className="border border-border p-2">Stores your cookie consent preferences</td>
                      <td className="border border-border p-2">6 months</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <p className="italic">
                At present, we do not use analytics or marketing cookies. If this changes, we will update 
                this table and request consent where required.
              </p>
            </div>
          </section>

          <section>
            <h2 className="font-serif text-heading mb-4">6. Third-Party Embeds and Links</h2>
            <div className="font-body text-body text-muted-foreground space-y-2">
              <p>
                Social media embeds (e.g., Instagram) and third-party services may set cookies or collect data. 
                Where feasible, we implement a two-step loading mechanism:
              </p>
              <ul className="list-disc list-inside pl-4 space-y-1">
                <li><strong>Default state:</strong> Embed is blocked with a notice and a "Load content" button.</li>
                <li><strong>After consent:</strong> Only load the embed after you have consented to the relevant 
                category (or after explicit click where legally acceptable).</li>
              </ul>
            </div>
          </section>

          <section>
            <h2 className="font-serif text-heading mb-4">7. How Long Choices Last</h2>
            <p className="font-body text-body text-muted-foreground">
              We store consent choices for up to 6 months (or less if required by law or if you clear cookies). 
              We may re-display the banner earlier if cookies/categorisation materially change.
            </p>
          </section>

          <section className="pt-4 border-t border-border">
            <p className="font-body text-body text-muted-foreground">
              To manage your cookie preferences at any time, click the{' '}
              <button 
                onClick={openPreferences}
                className="text-accent underline hover:text-accent/80"
              >
                Manage Cookie Preferences
              </button>
              {' '}button.
            </p>
          </section>
        </div>
      </div>
    </>
  );
};

export default CookiePolicy;
