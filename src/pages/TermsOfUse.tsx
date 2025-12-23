import { PageIntroduction } from '@/components/shared';

const TermsOfUse = () => {
  return (
    <>
      <PageIntroduction
        title="Terms of Use"
        description="These Terms govern use of the MIMS website and any content made available through it. By accessing the website, you agree to these Terms."
      />

      <div className="container py-section-sm md:py-section">
        <div className="max-w-3xl space-y-8">
          <p className="font-body text-small text-muted-foreground">
            Last updated: [DD Month YYYY]
          </p>

          <section>
            <h2 className="font-serif text-heading mb-4">1. About MIMS and Independence from the University</h2>
            <div className="font-body text-body text-muted-foreground space-y-2">
              <p>
                Minerva Investment Management Society (MIMS) is an Associazione promossa e gestita da studenti 
                dell'Università Bocconi. MIMS is independent from Università Bocconi. Any statements and opinions 
                published are solely those of MIMS and/or the individual authors.
              </p>
              <p className="font-semibold">
                Bocconi University does not review, approve, endorse, or monitor the contents of this website, 
                and Bocconi University is not responsible for any content, activities, or outcomes connected to it.
              </p>
            </div>
          </section>

          <section>
            <h2 className="font-serif text-heading mb-4">2. Acceptance of These Terms</h2>
            <p className="font-body text-body text-muted-foreground">
              By using this website you confirm that you have read and accepted these Terms. If you do not agree, 
              do not use the website.
            </p>
          </section>

          <section>
            <h2 className="font-serif text-heading mb-4">3. Educational Purpose — No Investment Advice</h2>
            <div className="font-body text-body text-muted-foreground space-y-2">
              <p>
                All content (including reports, "fund" pages, research notes, presentations, events material, 
                and any linked documents) is provided strictly for educational and academic purposes.
              </p>
              <p>Nothing on this website constitutes:</p>
              <ul className="list-disc list-inside pl-4 space-y-1">
                <li>investment advice,</li>
                <li>investment research,</li>
                <li>a personal recommendation,</li>
                <li>an offer or solicitation to buy or sell securities or adopt any investment strategy,</li>
                <li>or any regulated investment service.</li>
              </ul>
              <p className="mt-2">
                MIMS does not provide personalised financial advice or act as an investment firm, broker, or advisor. 
                No client relationship is created by your use of this website.
              </p>
            </div>
          </section>

          <section>
            <h2 className="font-serif text-heading mb-4">4. No Reliance; Risk and Accuracy</h2>
            <div className="font-body text-body text-muted-foreground space-y-2">
              <p>
                You are solely responsible for how you use the content. The information may be incomplete, outdated, 
                or contain errors. We do not guarantee accuracy, completeness, or timeliness. You must independently 
                verify information before acting on it.
              </p>
              <p>
                Any opinions may change without notice. Past performance and simulated/virtual portfolio results are 
                not indicative of future results. Investing involves risk, including possible loss of capital.
              </p>
            </div>
          </section>

          <section>
            <h2 className="font-serif text-heading mb-4">5. Limitation of Liability</h2>
            <p className="font-body text-body text-muted-foreground">
              To the maximum extent permitted by law, MIMS and its members, authors, and contributors disclaim all 
              liability for any loss or damage (direct or indirect) arising from your access to, use of, or reliance 
              on this website or any content linked to it.
            </p>
          </section>

          <section>
            <h2 className="font-serif text-heading mb-4">6. Intellectual Property and Permitted Use</h2>
            <div className="font-body text-body text-muted-foreground space-y-2">
              <p>
                Unless stated otherwise, MIMS owns or licenses the content on this website, including text, documents, 
                branding, and design.
              </p>
              <p>
                You may view and download materials for personal, non-commercial use only, provided you keep all 
                copyright and attribution notices.
              </p>
              <p>
                You must not reproduce, redistribute, publish, sell, or create derivative works from the content 
                (in whole or in part) without prior written permission from MIMS.
              </p>
            </div>
          </section>

          <section>
            <h2 className="font-serif text-heading mb-4">7. User Conduct</h2>
            <div className="font-body text-body text-muted-foreground space-y-2">
              <p>You must not:</p>
              <ul className="list-disc list-inside pl-4 space-y-1">
                <li>misuse the website (including security testing, scraping, or interfering with availability),</li>
                <li>upload malware or unlawful material,</li>
                <li>use the website in a way that infringes rights, harms others, or breaches applicable law.</li>
              </ul>
              <p className="mt-2">We may restrict or block access where necessary for security or compliance.</p>
            </div>
          </section>

          <section>
            <h2 className="font-serif text-heading mb-4">8. Third-Party Links and Social Platforms</h2>
            <p className="font-body text-body text-muted-foreground">
              This website may link to third-party websites and social platforms (e.g., LinkedIn, Instagram) that 
              we do not control. Their terms and privacy policies apply. We are not responsible for third-party content.
            </p>
          </section>

          <section>
            <h2 className="font-serif text-heading mb-4">9. Events and Applications ("Join Us")</h2>
            <div className="font-body text-body text-muted-foreground space-y-2">
              <p>If you register for events or apply to join MIMS, you agree that:</p>
              <ul className="list-disc list-inside pl-4 space-y-1">
                <li>you will provide accurate information,</li>
                <li>selection processes are competitive and discretionary,</li>
                <li>submission does not guarantee acceptance,</li>
                <li>we may contact you using the details provided for selection and logistics.</li>
              </ul>
              <p className="mt-2">
                Personal data handling is described in the{' '}
                <a href="/privacy-policy" className="text-accent underline hover:text-accent/80">Privacy Policy</a>.
              </p>
            </div>
          </section>

          <section>
            <h2 className="font-serif text-heading mb-4">10. Non-Profit and Fundraising</h2>
            <p className="font-body text-body text-muted-foreground">
              MIMS is a non-profit student association and does not distribute profits. The website does not solicit 
              on-campus fundraising. Any sponsorships or partnerships are handled in accordance with applicable 
              University rules and approvals where required.
            </p>
          </section>

          <section>
            <h2 className="font-serif text-heading mb-4">11. Changes to the Website and Terms</h2>
            <p className="font-body text-body text-muted-foreground">
              We may modify the website or these Terms at any time. The "Last updated" date indicates the current 
              version. Continued use after changes constitutes acceptance.
            </p>
          </section>

          <section>
            <h2 className="font-serif text-heading mb-4">12. Governing Law and Jurisdiction</h2>
            <p className="font-body text-body text-muted-foreground">
              These Terms are governed by Italian law. Any disputes shall be subject to the jurisdiction of the 
              courts of Milan, Italy, unless mandatory consumer law provides otherwise.
            </p>
          </section>

          <section>
            <h2 className="font-serif text-heading mb-4">13. Contact</h2>
            <p className="font-body text-body text-muted-foreground">
              For legal or policy enquiries contact:{' '}
              <a href="mailto:as.minerva@unibocconi.it" className="text-accent underline hover:text-accent/80">
                as.minerva@unibocconi.it
              </a>
            </p>
          </section>
        </div>
      </div>
    </>
  );
};

export default TermsOfUse;
