import { PageIntroduction } from "@/components/shared";
import privacyBg from "@/assets/privacy-bg.webp";

const PrivacyPolicy = () => {
  return (
    <>
      <div className="relative">
        <div className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: `url(${privacyBg})` }} />
        <div className="relative z-10">
          <PageIntroduction title="Privacy Policy" transparentBackground />
        </div>
      </div>

      <div className="container py-section-sm md:py-section">
        <div className="max-w-3xl space-y-8">
          <p className="font-body text-small text-muted-foreground">Last updated: January 1st, 2026</p>

          <section>
            <h2 className="font-serif text-heading mb-4">1. Who We Are</h2>
            <p className="font-body text-body text-muted-foreground">
              Minerva Investment Management Society (MIMS) ("we", "us", "our") is a society promoted and run by students
              of Bocconi University. This website is operated by MIMS and is independent from Bocconi University.
            </p>
          </section>

          <section>
            <h2 className="font-serif text-heading mb-4">2. Data Controller and Contact</h2>
            <div className="font-body text-body text-muted-foreground space-y-2">
              <p>For the purposes of the General Data Protection Regulation ("GDPR"), the data controller is:</p>
              <ul className="list-disc list-inside pl-4 space-y-1">
                <li>
                  <strong>Controller:</strong> Minerva Investment Management Society (MIMS)
                </li>
                <li>
                  <strong>Email:</strong> as.minerva@unibocconi.it
                </li>
              </ul>
              <p>If you have questions or want to exercise your rights, contact us at the email above.</p>
            </div>
          </section>

          <section>
            <h2 className="font-serif text-heading mb-4">3. Scope</h2>
            <div className="font-body text-body text-muted-foreground space-y-2">
              <p>This Policy applies to personal data processed through:</p>
              <ul className="list-disc list-inside pl-4 space-y-1">
                <li>Our public website (including logs and security data),</li>
                <li>Contact channels (email and forms),</li>
                <li>Newsletter subscription,</li>
                <li>Event registrations,</li>
                <li>"Join Us" / recruiting applications (including CVs and supporting documents),</li>
                <li>Embedded third-party content and links (e.g., Instagram, LinkedIn) where applicable.</li>
              </ul>
            </div>
          </section>

          <section>
            <h2 className="font-serif text-heading mb-4">4. Personal Data We Collect</h2>
            <div className="font-body text-body text-muted-foreground space-y-4">
              <p>Depending on how you interact with us, we may collect:</p>

              <div>
                <h3 className="font-serif text-subheading mb-2">4.1 Website Usage and Device Data</h3>
                <p>
                  IP address, approximate location derived from IP (country/city), device and browser identifiers,
                  referral URL, pages viewed, date/time, and similar technical data. This data may be collected via
                  server logs and (only if enabled with consent) analytics cookies.
                </p>
              </div>

              <div>
                <h3 className="font-serif text-subheading mb-2">4.2 Contact and Communications Data</h3>
                <p>Name, email address, message content, and any information you provide when you contact us.</p>
              </div>

              <div>
                <h3 className="font-serif text-subheading mb-2">4.3 Newsletter Data</h3>
                <p>
                  Email address and subscription metadata (e.g., timestamp, consent record). If double opt-in is used,
                  confirmation logs.
                </p>
              </div>

              <div>
                <h3 className="font-serif text-subheading mb-2">4.4 Events and Applications ("Join Us")</h3>
                <p>
                  Identification and contact data (name, email, phone if provided), academic information
                  (course/programme, year), CV/resume, motivation letter, LinkedIn profile URL, and any other
                  information you choose to provide.
                </p>
                <p className="mt-2 italic">
                  Important: Please do not include special category data (e.g., health data) or excessive personal data
                  in applications unless strictly necessary.
                </p>
              </div>

              <div>
                <h3 className="font-serif text-subheading mb-2">4.5 Social Media Interactions</h3>
                <p>
                  If you interact with our social pages (LinkedIn/Instagram) or load embedded social content, those
                  platforms may collect data under their own policies.
                </p>
              </div>
            </div>
          </section>

          <section>
            <h2 className="font-serif text-heading mb-4">5. Purposes and Legal Bases</h2>
            <div className="font-body text-body text-muted-foreground space-y-4">
              <p>We process personal data only where lawful. Typical purposes and legal bases include:</p>

              <div>
                <h3 className="font-serif text-subheading mb-2">5.1 Operating, Securing, and Improving the Website</h3>
                <p>
                  <strong>Purpose:</strong> Deliver the website, prevent abuse, maintain security, and debug issues.
                </p>
                <p>
                  <strong>Legal basis:</strong> Legitimate interests (security and service operation); and/or necessity
                  for the service explicitly requested.
                </p>
              </div>

              <div>
                <h3 className="font-serif text-subheading mb-2">5.2 Responding to Enquiries</h3>
                <p>
                  <strong>Purpose:</strong> Answer messages and provide requested information.
                </p>
                <p>
                  <strong>Legal basis:</strong> Legitimate interests; and where applicable, steps at your request prior
                  to entering a relationship (e.g., participation requests).
                </p>
              </div>

              <div>
                <h3 className="font-serif text-subheading mb-2">5.3 Newsletter</h3>
                <p>
                  <strong>Purpose:</strong> Send updates you requested.
                </p>
                <p>
                  <strong>Legal basis:</strong> Consent (you can withdraw at any time via unsubscribe or by contacting
                  us).
                </p>
              </div>

              <div>
                <h3 className="font-serif text-subheading mb-2">5.4 Events Management</h3>
                <p>
                  <strong>Purpose:</strong> Register attendance, manage logistics, communicate updates.
                </p>
                <p>
                  <strong>Legal basis:</strong> Legitimate interests and/or steps at your request.
                </p>
              </div>

              <div>
                <h3 className="font-serif text-subheading mb-2">
                  5.5 Recruiting / Membership Applications ("Join Us")
                </h3>
                <p>
                  <strong>Purpose:</strong> Evaluate applications, run interviews/tests, communicate outcomes, and
                  maintain selection records.
                </p>
                <p>
                  <strong>Legal basis:</strong> Steps at your request prior to entering a membership relationship and
                  legitimate interests (fair selection process, fraud prevention, recordkeeping).
                </p>
              </div>

              <div>
                <h3 className="font-serif text-subheading mb-2">5.6 Legal/Compliance</h3>
                <p>
                  <strong>Purpose:</strong> Comply with applicable law, respond to lawful requests, enforce policies.
                </p>
                <p>
                  <strong>Legal basis:</strong> Legal obligation and legitimate interests.
                </p>
              </div>
            </div>
          </section>

          <section>
            <h2 className="font-serif text-heading mb-4">6. Cookies and Similar Technologies</h2>
            <p className="font-body text-body text-muted-foreground">
              We use cookies and similar technologies as described in our{" "}
              <a href="/cookie-policy" className="text-accent underline hover:text-accent/80">
                Cookie Policy
              </a>
              . Non-essential cookies are used only with your consent. You can change your choices at any time via
              "Cookie Settings" in the footer.
            </p>
          </section>

          <section>
            <h2 className="font-serif text-heading mb-4">7. Sharing and Recipients</h2>
            <div className="font-body text-body text-muted-foreground space-y-2">
              <p>We may share personal data only as needed, for example with:</p>
              <ul className="list-disc list-inside pl-4 space-y-1">
                <li>Website hosting, security, and IT service providers (as processors),</li>
                <li>Newsletter provider (e.g., Mailchimp) if used,</li>
                <li>Form/communications providers (e.g., Google Forms) if used,</li>
                <li>Event tooling or room booking systems where relevant.</li>
              </ul>
              <p className="mt-2 font-semibold">We do not sell personal data.</p>
            </div>
          </section>

          <section>
            <h2 className="font-serif text-heading mb-4">8. International Transfers</h2>
            <p className="font-body text-body text-muted-foreground">
              Some providers may process data outside the EEA/UK (e.g., the United States). Where this occurs, we will
              implement appropriate safeguards (such as the EU Standard Contractual Clauses and additional measures
              where required) and ensure a lawful transfer mechanism.
            </p>
          </section>

          <section>
            <h2 className="font-serif text-heading mb-4">9. Data Retention</h2>
            <div className="font-body text-body text-muted-foreground space-y-2">
              <p>We keep personal data only as long as necessary:</p>
              <ul className="list-disc list-inside pl-4 space-y-1">
                <li>
                  <strong>Server/security logs:</strong> Typically up to 90–180 days unless needed to investigate
                  incidents.
                </li>
                <li>
                  <strong>Enquiries:</strong> Up to 24 months after last contact (or sooner if resolved and deletion is
                  requested).
                </li>
                <li>
                  <strong>Newsletter:</strong> Until you unsubscribe; then suppression record may be kept to ensure you
                  are not re-added unintentionally.
                </li>
                <li>
                  <strong>Event data:</strong> Up to 24 months after the event (or longer where required for
                  compliance).
                </li>
                <li>
                  <strong>Recruiting applications:</strong> Up to 12 months after the end of the selection cycle, unless
                  you become a member (then during membership + up to 24 months for audit/continuity).
                </li>
              </ul>
              <p>Retention may be extended where required for legal claims or compliance.</p>
            </div>
          </section>

          <section>
            <h2 className="font-serif text-heading mb-4">10. Security</h2>
            <p className="font-body text-body text-muted-foreground">
              We apply appropriate technical and organisational measures to protect personal data (access controls,
              least privilege, secure hosting, and confidentiality procedures). No system is completely secure; we
              cannot guarantee absolute security.
            </p>
          </section>

          <section>
            <h2 className="font-serif text-heading mb-4">11. Your Rights</h2>
            <div className="font-body text-body text-muted-foreground space-y-2">
              <p>Subject to applicable law, you may have the right to:</p>
              <ul className="list-disc list-inside pl-4 space-y-1">
                <li>Access your data,</li>
                <li>Rectify inaccurate data,</li>
                <li>Erase data,</li>
                <li>Restrict processing,</li>
                <li>Object to processing based on legitimate interests,</li>
                <li>Portability (where processing is based on consent/contract and carried out by automated means),</li>
                <li>Withdraw consent at any time (without affecting prior processing).</li>
              </ul>
              <p>To exercise rights, contact us at as.minerva@unibocconi.it. We may need to verify your identity.</p>
            </div>
          </section>

          <section>
            <h2 className="font-serif text-heading mb-4">12. Complaints</h2>
            <p className="font-body text-body text-muted-foreground">
              You may lodge a complaint with the Italian supervisory authority (Garante per la Protezione dei Dati
              Personali) or your local EEA authority. We encourage you to contact us first so we can address concerns.
            </p>
          </section>

          <section>
            <h2 className="font-serif text-heading mb-4">13. Children</h2>
            <p className="font-body text-body text-muted-foreground">
              This website is not intended for children. If you believe a child has provided us personal data, contact
              us and we will take appropriate steps.
            </p>
          </section>

          <section>
            <h2 className="font-serif text-heading mb-4">14. Changes to This Policy</h2>
            <p className="font-body text-body text-muted-foreground">
              We may update this Policy from time to time. The "Last updated" date will be revised, and material changes
              may be highlighted on the website.
            </p>
          </section>
        </div>
      </div>
    </>
  );
};

export default PrivacyPolicy;
