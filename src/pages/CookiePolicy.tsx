import { Helmet } from 'react-helmet-async';
import { LegalLayout, LegalSectionBlock, type LegalSection } from '@/components/shared';
import { openCookieSettings } from '@/components/cookies';

const sections: LegalSection[] = [
  { id: 'what', title: '1. What Cookies Are' },
  { id: 'how', title: '2. How We Use Cookies' },
  { id: 'legal-basis', title: '3. Legal Basis' },
  { id: 'choices', title: '4. Your Choices' },
  { id: 'list', title: '5. Cookie List' },
  { id: 'third-party', title: '6. Third-Party Embeds' },
  { id: 'retention', title: '7. How Long Choices Last' },
];

const CookiePolicy = () => {
  const openPreferences = openCookieSettings;

  return (
    <>
      <Helmet>
        <title>Cookie Policy | MIMS</title>
        <meta
          name="description"
          content="How cookies and similar technologies are used on the Minerva Investment Management Society website."
        />
      </Helmet>
      <LegalLayout
        title="Cookie Policy"
        description="How we use cookies and similar technologies on this website, and how you can control them."
        lastUpdated="January 1st, 2026"
        currentId="cookie"
        sections={sections}
        tocFooter={
          <button
            type="button"
            onClick={openPreferences}
            className="lp-toc-cta"
          >
            Manage Cookie Preferences
          </button>
        }
      >
        <LegalSectionBlock id="what" number="01" title="What Cookies Are">
          <p>
            Cookies are small text files stored on your device. We may also use similar technologies
            (e.g., local storage or pixels) where applicable.
          </p>
        </LegalSectionBlock>

        <LegalSectionBlock id="how" number="02" title="How We Use Cookies">
          <p>We use:</p>
          <ul>
            <li><strong>Strictly necessary cookies</strong> (required for the website to function and for security),</li>
            <li><strong>Preference cookies</strong> (to remember settings),</li>
            <li><strong>Analytics cookies</strong> (to understand usage and improve the site),</li>
            <li><strong>Third-party cookies</strong> (e.g., embedded social content) where enabled.</li>
          </ul>
          <p>Non-essential cookies are used only with your consent.</p>
        </LegalSectionBlock>

        <LegalSectionBlock id="legal-basis" number="03" title="Legal Basis">
          <p>
            Strictly necessary cookies are used because they are required to provide the service you explicitly
            request and to maintain security. All other cookies are used only with your consent, which you can
            withdraw at any time.
          </p>
        </LegalSectionBlock>

        <LegalSectionBlock id="choices" number="04" title="Your Choices">
          <p>You can:</p>
          <ul>
            <li>Accept all cookies,</li>
            <li>Reject all non-essential cookies,</li>
            <li>Customise choices by category,</li>
          </ul>
          <p>
            at any time via the{' '}
            <button
              type="button"
              onClick={openPreferences}
              className="text-accent underline hover:text-accent/80"
            >
              Manage Cookie Preferences
            </button>
            {' '}button above.
          </p>
          <p>
            You can also control cookies via your browser settings, but blocking necessary cookies may
            affect site functionality.
          </p>
        </LegalSectionBlock>

        <LegalSectionBlock id="list" number="05" title="Cookie List" wide>
          <p>The following table lists the cookies used on this website:</p>
          <div className="lp-table-scroll">
            <table>
              <thead>
                <tr>
                  <th>Cookie Name</th>
                  <th>Provider</th>
                  <th>Category</th>
                  <th>Purpose</th>
                  <th>Duration</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>mims_cookie_consent</td>
                  <td>MIMS</td>
                  <td>Strictly Necessary</td>
                  <td>Stores your cookie consent preferences</td>
                  <td>6 months</td>
                </tr>
              </tbody>
            </table>
          </div>
          <p className="italic">
            At present, we do not use analytics or marketing cookies. If this changes, we will update
            this table and request consent where required.
          </p>
        </LegalSectionBlock>

        <LegalSectionBlock id="third-party" number="06" title="Third-Party Embeds and Links">
          <p>
            Social media embeds (e.g., Instagram) and third-party services may set cookies or collect data.
            Where feasible, we implement a two-step loading mechanism:
          </p>
          <ul>
            <li><strong>Default state:</strong> Embed is blocked with a notice and a "Load content" button.</li>
            <li><strong>After consent:</strong> Only load the embed after you have consented to the relevant category (or after explicit click where legally acceptable).</li>
          </ul>
        </LegalSectionBlock>

        <LegalSectionBlock id="retention" number="07" title="How Long Choices Last">
          <p>
            We store consent choices for up to 6 months (or less if required by law or if you clear cookies).
            We may re-display the banner earlier if cookies/categorisation materially change.
          </p>
        </LegalSectionBlock>
      </LegalLayout>
    </>
  );
};

export default CookiePolicy;
