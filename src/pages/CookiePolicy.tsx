import { Helmet } from 'react-helmet-async';
import { LegalLayout, LegalSectionBlock, type LegalSection } from '@/components/shared';
import { openCookieSettings } from '@/components/cookies';

// =====================================================================
// Cookie Policy, aligned with the Garante's Guidelines on cookies of
// 10 June 2021 and article 122 of the Italian Privacy Code. The list in
// section 5 reflects what the website actually sets today; update it
// whenever a new tool is added.
// =====================================================================

const sections: LegalSection[] = [
  { id: 'what', title: '1. What Cookies Are' },
  { id: 'how', title: '2. How This Website Uses Them' },
  { id: 'legal-basis', title: '3. Legal Basis and Consent' },
  { id: 'choices', title: '4. Your Choices' },
  { id: 'list', title: '5. Detailed List' },
  { id: 'third', title: '6. Third-Party Content' },
  { id: 'browser', title: '7. Browser Controls' },
  { id: 'changes', title: '8. Changes' },
];

const CookiePolicy = () => (
  <>
    <Helmet>
      <title>Cookie Policy | MIMS</title>
      <meta
        name="description"
        content="How the Minerva Investment Management Society website uses cookies and similar technologies, and how to control them."
      />
    </Helmet>
    <LegalLayout
      title="Cookie Policy"
      description="How this website uses cookies and similar technologies, and how you control them."
      lastUpdated="July 12th, 2026"
      currentId="cookies"
      sections={sections}
    >
      <LegalSectionBlock id="what" number="01" title="What Cookies Are">
        <p>
          Cookies are small text files that a website stores on your device. Similar technologies, such as browser
          local storage, serve the same purposes: remembering information between pages and visits. Italian and
          European law (article 122 of the Italian Privacy Code and the GDPR, as interpreted by the Garante's
          Guidelines of 10 June 2021) distinguishes between technical cookies, which need no consent, and all other
          cookies, which may be used only with your prior consent.
        </p>
      </LegalSectionBlock>

      <LegalSectionBlock id="how" number="02" title="How This Website Uses Them">
        <p>This website is deliberately minimal in its use of cookies and similar technologies:</p>
        <ul>
          <li>
            <strong>Strictly necessary items</strong> keep the website secure and functional: they include the item
            that remembers your cookie choices and, for Workspace users only, the authentication session that keeps
            you signed in. These are always active.
          </li>
          <li>
            <strong>Preferences, analytics and external media</strong> categories exist in the consent banner but
            load only if you enable them. As of the date above, the website sets no third-party analytics or
            advertising cookies by default; if an analytics tool is adopted in the future it will run only under the
            analytics consent category and this policy will be updated first.
          </li>
        </ul>
        <p>We do not use cookies for advertising, cross-site tracking or profiling.</p>
      </LegalSectionBlock>

      <LegalSectionBlock id="legal-basis" number="03" title="Legal Basis and Consent">
        <p>
          Technical items are used on the basis of our legitimate interest in operating a secure, functional
          website, and do not require consent. Every non-essential category requires your prior, specific consent,
          collected through the banner shown on your first visit. Consent is stored on your device so the banner
          does not reappear at every visit; you can change or withdraw it at any time (section 4), with effect for
          the future. We keep no server-side record of your identity linked to the consent choice for visitors who
          are not signed in.
        </p>
      </LegalSectionBlock>

      <LegalSectionBlock id="choices" number="04" title="Your Choices">
        <p>
          You can review and change your cookie choices at any time from the{' '}
          <button
            type="button"
            onClick={openCookieSettings}
            className="underline underline-offset-2 hover:opacity-80"
          >
            cookie settings
          </button>{' '}
          panel, also reachable from the website footer. Declining non-essential categories never limits your access
          to the website's content.
        </p>
      </LegalSectionBlock>

      <LegalSectionBlock id="list" number="05" title="Detailed List" wide>
        <p>Items currently set by the website:</p>
        <ul>
          <li>
            <strong>mims-cookie-consent</strong> (local storage, first party). Purpose: remembers the consent
            choices you made in the banner. Category: strictly necessary. Duration: until you clear your browser
            data or change your choices.
          </li>
          <li>
            <strong>Supabase authentication token</strong> (local storage, first party; set only when you sign in to
            the Workspace). Purpose: keeps your authenticated session active and secure. Category: strictly
            necessary for the reserved area. Duration: for the session's validity; removed on sign-out.
          </li>
          <li>
            <strong>Hosting security cookies</strong> may be set transiently by our hosting infrastructure to
            protect the website (for example against abusive traffic). Category: strictly necessary. Duration:
            short-lived.
          </li>
        </ul>
        <p>
          No preferences, analytics or external media items are set today without your consent; the corresponding
          categories in the banner are reserved for future features and third-party embeds, which will be documented
          here before use.
        </p>
      </LegalSectionBlock>

      <LegalSectionBlock id="third" number="06" title="Third-Party Content">
        <p>
          Some pages may embed third-party content, such as social media posts or maps. These providers may set
          their own cookies when their content loads, under their own policies. Embedded third-party media loads
          only if you have enabled the external media category, in line with the consent-gating approach required by
          the Garante's Guidelines.
        </p>
      </LegalSectionBlock>

      <LegalSectionBlock id="browser" number="07" title="Browser Controls">
        <p>
          You can also control cookies from your browser: block them, delete them, or receive a warning before they
          are set. Instructions are available in the help pages of every major browser. Blocking strictly necessary
          items may prevent parts of the website, in particular the Workspace sign-in, from working.
        </p>
      </LegalSectionBlock>

      <LegalSectionBlock id="changes" number="08" title="Changes">
        <p>
          If we introduce a new cookie or a new category of similar technology, we will update this policy and,
          where consent is required, request it through the banner before the new item is used. The date at the top
          identifies the version in force. Questions:{' '}
          <a href="mailto:as.minerva@unibocconi.it">as.minerva@unibocconi.it</a>.
        </p>
      </LegalSectionBlock>
    </LegalLayout>
  </>
);

export default CookiePolicy;
