import { Helmet } from 'react-helmet-async';
import { LegalLayout, LegalSectionBlock, type LegalSection } from '@/components/shared';

const sections: LegalSection[] = [
  { id: 'who-we-are', title: '1. Who We Are' },
  { id: 'controller', title: '2. Data Controller and Contact' },
  { id: 'scope', title: '3. Scope' },
  { id: 'data-collected', title: '4. Personal Data We Collect' },
  { id: 'legal-bases', title: '5. Purposes and Legal Bases' },
  { id: 'cookies', title: '6. Cookies and Similar Technologies' },
  { id: 'sharing', title: '7. Sharing and Recipients' },
  { id: 'transfers', title: '8. International Transfers' },
  { id: 'retention', title: '9. Data Retention' },
  { id: 'security', title: '10. Security' },
  { id: 'rights', title: '11. Your Rights' },
  { id: 'complaints', title: '12. Complaints' },
  { id: 'children', title: '13. Children' },
  { id: 'changes', title: '14. Changes to This Policy' },
];

const PrivacyPolicy = () => (
  <>
    <Helmet>
      <title>Privacy Policy | MIMS</title>
      <meta
        name="description"
        content="How Minerva Investment Management Society collects, uses and protects personal data, in line with GDPR."
      />
    </Helmet>
    <LegalLayout
      title="Privacy Policy"
      description="How we collect, use and protect personal data, in line with the GDPR."
      lastUpdated="January 1st, 2026"
      currentId="privacy"
      sections={sections}
    >
      <LegalSectionBlock id="who-we-are" number="01" title="Who We Are">
        <p>
          Minerva Investment Management Society (MIMS) ("we", "us", "our") is a society promoted and run by students
          of Bocconi University. This website is operated by MIMS and is independent from Bocconi University.
        </p>
      </LegalSectionBlock>

      <LegalSectionBlock id="controller" number="02" title="Data Controller and Contact">
        <p>For the purposes of the General Data Protection Regulation ("GDPR"), the data controller is:</p>
        <ul>
          <li><strong>Controller:</strong> Minerva Investment Management Society (MIMS)</li>
          <li><strong>Email:</strong> as.minerva@unibocconi.it</li>
        </ul>
        <p>If you have questions or want to exercise your rights, contact us at the email above.</p>
      </LegalSectionBlock>

      <LegalSectionBlock id="scope" number="03" title="Scope">
        <p>This Policy applies to personal data processed through:</p>
        <ul>
          <li>Our public website (including logs and security data),</li>
          <li>Contact channels (email and forms),</li>
          <li>Newsletter subscription,</li>
          <li>Event registrations,</li>
          <li>"Join Us" / recruiting applications (including CVs and supporting documents),</li>
          <li>Embedded third-party content and links (e.g., Instagram, LinkedIn) where applicable.</li>
        </ul>
      </LegalSectionBlock>

      <LegalSectionBlock id="data-collected" number="04" title="Personal Data We Collect">
        <p>Depending on how you interact with us, we may collect:</p>
        <h3>4.1 Website Usage and Device Data</h3>
        <p>
          IP address, approximate location derived from IP (country/city), device and browser identifiers,
          referral URL, pages viewed, date/time, and similar technical data. This data may be collected via
          server logs and (only if enabled with consent) analytics cookies.
        </p>
        <h3>4.2 Contact and Communications Data</h3>
        <p>Name, email address, message content, and any information you provide when you contact us.</p>
        <h3>4.3 Newsletter Data</h3>
        <p>
          Email address and subscription metadata (e.g., timestamp, consent record). If double opt-in is used,
          confirmation logs.
        </p>
        <h3>4.4 Events and Applications ("Join Us")</h3>
        <p>
          Identification and contact data (name, email, phone if provided), academic information
          (course/programme, year), CV/resume, motivation letter, LinkedIn profile URL, and any other
          information you choose to provide.
        </p>
        <p className="italic">
          Important: Please do not include special category data (e.g., health data) or excessive personal data
          in applications unless strictly necessary.
        </p>
        <h3>4.5 Social Media Interactions</h3>
        <p>
          If you interact with our social pages (LinkedIn/Instagram) or load embedded social content, those
          platforms may collect data under their own policies.
        </p>
      </LegalSectionBlock>

      <LegalSectionBlock id="legal-bases" number="05" title="Purposes and Legal Bases">
        <p>We process personal data only where lawful. Typical purposes and legal bases include:</p>
        <h3>5.1 Operating, Securing, and Improving the Website</h3>
        <p><strong>Purpose:</strong> Deliver the website, prevent abuse, maintain security, and debug issues.</p>
        <p><strong>Legal basis:</strong> Legitimate interests (security and service operation); and/or necessity for the service explicitly requested.</p>
        <h3>5.2 Responding to Enquiries</h3>
        <p><strong>Purpose:</strong> Answer messages and provide requested information.</p>
        <p><strong>Legal basis:</strong> Legitimate interests; and where applicable, steps at your request prior to entering a relationship (e.g., participation requests).</p>
        <h3>5.3 Newsletter</h3>
        <p><strong>Purpose:</strong> Send updates you requested.</p>
        <p><strong>Legal basis:</strong> Consent (you can withdraw at any time via unsubscribe or by contacting us).</p>
        <h3>5.4 Events Management</h3>
        <p><strong>Purpose:</strong> Register attendance, manage logistics, communicate updates.</p>
        <p><strong>Legal basis:</strong> Legitimate interests and/or steps at your request.</p>
        <h3>5.5 Recruiting / Membership Applications ("Join Us")</h3>
        <p><strong>Purpose:</strong> Evaluate applications, run interviews/tests, communicate outcomes, and maintain selection records.</p>
        <p><strong>Legal basis:</strong> Steps at your request prior to entering a membership relationship and legitimate interests (fair selection process, fraud prevention, recordkeeping).</p>
        <h3>5.6 Legal/Compliance</h3>
        <p><strong>Purpose:</strong> Comply with applicable law, respond to lawful requests, enforce policies.</p>
        <p><strong>Legal basis:</strong> Legal obligation and legitimate interests.</p>
      </LegalSectionBlock>

      <LegalSectionBlock id="cookies" number="06" title="Cookies and Similar Technologies">
        <p>
          We use cookies and similar technologies as described in our <a href="/cookie-policy">Cookie Policy</a>.
          Non-essential cookies are used only with your consent. You can change your choices at any time via
          "Cookie Settings" in the footer.
        </p>
      </LegalSectionBlock>

      <LegalSectionBlock id="sharing" number="07" title="Sharing and Recipients">
        <p>We may share personal data only as needed, for example with:</p>
        <ul>
          <li>Website hosting, security, and IT service providers (as processors),</li>
          <li>Newsletter provider (e.g., Mailchimp) if used,</li>
          <li>Form/communications providers (e.g., Google Forms) if used,</li>
          <li>Event tooling or room booking systems where relevant.</li>
        </ul>
        <p><strong>We do not sell personal data.</strong></p>
      </LegalSectionBlock>

      <LegalSectionBlock id="transfers" number="08" title="International Transfers">
        <p>
          Some providers may process data outside the EEA/UK (e.g., the United States). Where this occurs, we will
          implement appropriate safeguards (such as the EU Standard Contractual Clauses and additional measures
          where required) and ensure a lawful transfer mechanism.
        </p>
      </LegalSectionBlock>

      <LegalSectionBlock id="retention" number="09" title="Data Retention">
        <p>We keep personal data only as long as necessary:</p>
        <ul>
          <li><strong>Server/security logs:</strong> Typically up to 90–180 days unless needed to investigate incidents.</li>
          <li><strong>Enquiries:</strong> Up to 24 months after last contact (or sooner if resolved and deletion is requested).</li>
          <li><strong>Newsletter:</strong> Until you unsubscribe; then suppression record may be kept to ensure you are not re-added unintentionally.</li>
          <li><strong>Event data:</strong> Up to 24 months after the event (or longer where required for compliance).</li>
          <li><strong>Recruiting applications:</strong> Up to 12 months after the end of the selection cycle, unless you become a member (then during membership + up to 24 months for audit/continuity).</li>
        </ul>
        <p>Retention may be extended where required for legal claims or compliance.</p>
      </LegalSectionBlock>

      <LegalSectionBlock id="security" number="10" title="Security">
        <p>
          We apply appropriate technical and organisational measures to protect personal data (access controls,
          least privilege, secure hosting, and confidentiality procedures). No system is completely secure; we
          cannot guarantee absolute security.
        </p>
      </LegalSectionBlock>

      <LegalSectionBlock id="rights" number="11" title="Your Rights">
        <p>Subject to applicable law, you may have the right to:</p>
        <ul>
          <li>Access your data,</li>
          <li>Rectify inaccurate data,</li>
          <li>Erase data,</li>
          <li>Restrict processing,</li>
          <li>Object to processing based on legitimate interests,</li>
          <li>Portability (where processing is based on consent/contract and carried out by automated means),</li>
          <li>Withdraw consent at any time (without affecting prior processing).</li>
        </ul>
        <p>To exercise rights, contact us at as.minerva@unibocconi.it. We may need to verify your identity.</p>
      </LegalSectionBlock>

      <LegalSectionBlock id="complaints" number="12" title="Complaints">
        <p>
          You may lodge a complaint with the Italian supervisory authority (Garante per la Protezione dei Dati
          Personali) or your local EEA authority. We encourage you to contact us first so we can address concerns.
        </p>
      </LegalSectionBlock>

      <LegalSectionBlock id="children" number="13" title="Children">
        <p>
          This website is not intended for children. If you believe a child has provided us personal data, contact
          us and we will take appropriate steps.
        </p>
      </LegalSectionBlock>

      <LegalSectionBlock id="changes" number="14" title="Changes to This Policy">
        <p>
          We may update this Policy from time to time. The "Last updated" date will be revised, and material changes
          may be highlighted on the website.
        </p>
      </LegalSectionBlock>
    </LegalLayout>
  </>
);

export default PrivacyPolicy;
