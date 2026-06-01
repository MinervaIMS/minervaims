import { Helmet } from 'react-helmet-async';
import { LegalLayout, LegalSectionBlock, type LegalSection } from '@/components/shared';

const sections: LegalSection[] = [
  { id: 'about', title: '1. About MIMS' },
  { id: 'acceptance', title: '2. Acceptance of Terms' },
  { id: 'educational', title: '3. Educational Purpose' },
  { id: 'no-reliance', title: '4. No Reliance; Risk' },
  { id: 'liability', title: '5. Limitation of Liability' },
  { id: 'ip', title: '6. Intellectual Property' },
  { id: 'conduct', title: '7. User Conduct' },
  { id: 'third-party', title: '8. Third-Party Links' },
  { id: 'join', title: '9. Events and Applications' },
  { id: 'non-profit', title: '10. Non-Profit and Fundraising' },
  { id: 'changes', title: '11. Changes' },
  { id: 'law', title: '12. Governing Law' },
  { id: 'contact', title: '13. Contact' },
];

const TermsOfUse = () => (
  <>
    <Helmet>
      <title>Terms of Use | MIMS</title>
      <meta
        name="description"
        content="Terms governing the use of the Minerva Investment Management Society website."
      />
    </Helmet>
    <LegalLayout
      title="Terms of Use"
      description="The rules that govern your use of this website and its content."
      lastUpdated="January 1st, 2026"
      effectiveDate="January 1st, 2026"
      currentId="terms"
      sections={sections}
    >
      <LegalSectionBlock id="about" number="01" title="About MIMS and Independence from the University">
        <p>
          Minerva Investment Management Society (MIMS) is an Associazione promossa e gestita da studenti
          dell'Università Bocconi. MIMS is independent from Università Bocconi. Any statements and opinions
          published are solely those of MIMS and/or the individual authors.
        </p>
        <p><strong>
          Bocconi University does not review, approve, endorse, or monitor the contents of this website,
          and Bocconi University is not responsible for any content, activities, or outcomes connected to it.
        </strong></p>
      </LegalSectionBlock>

      <LegalSectionBlock id="acceptance" number="02" title="Acceptance of These Terms">
        <p>
          By using this website you confirm that you have read and accepted these Terms. If you do not agree,
          do not use the website.
        </p>
      </LegalSectionBlock>

      <LegalSectionBlock id="educational" number="03" title="Educational Purpose — No Investment Advice">
        <p>
          All content (including reports, "fund" pages, research notes, presentations, events material,
          and any linked documents) is provided strictly for educational and academic purposes.
        </p>
        <p>Nothing on this website constitutes:</p>
        <ul>
          <li>investment advice,</li>
          <li>investment research,</li>
          <li>a personal recommendation,</li>
          <li>an offer or solicitation to buy or sell securities or adopt any investment strategy,</li>
          <li>or any regulated investment service.</li>
        </ul>
        <p>
          MIMS does not provide personalised financial advice or act as an investment firm, broker, or advisor.
          No client relationship is created by your use of this website.
        </p>
      </LegalSectionBlock>

      <LegalSectionBlock id="no-reliance" number="04" title="No Reliance; Risk and Accuracy">
        <p>
          You are solely responsible for how you use the content. The information may be incomplete, outdated,
          or contain errors. We do not guarantee accuracy, completeness, or timeliness. You must independently
          verify information before acting on it.
        </p>
        <p>
          Any opinions may change without notice. Past performance and simulated/virtual portfolio results are
          not indicative of future results. Investing involves risk, including possible loss of capital.
        </p>
      </LegalSectionBlock>

      <LegalSectionBlock id="liability" number="05" title="Limitation of Liability">
        <p>
          To the maximum extent permitted by law, MIMS and its members, authors, and contributors disclaim all
          liability for any loss or damage (direct or indirect) arising from your access to, use of, or reliance
          on this website or any content linked to it.
        </p>
      </LegalSectionBlock>

      <LegalSectionBlock id="ip" number="06" title="Intellectual Property and Permitted Use">
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
      </LegalSectionBlock>

      <LegalSectionBlock id="conduct" number="07" title="User Conduct">
        <p>You must not:</p>
        <ul>
          <li>misuse the website (including security testing, scraping, or interfering with availability),</li>
          <li>upload malware or unlawful material,</li>
          <li>use the website in a way that infringes rights, harms others, or breaches applicable law.</li>
        </ul>
        <p>We may restrict or block access where necessary for security or compliance.</p>
      </LegalSectionBlock>

      <LegalSectionBlock id="third-party" number="08" title="Third-Party Links and Social Platforms">
        <p>
          This website may link to third-party websites and social platforms (e.g., LinkedIn, Instagram) that
          we do not control. Their terms and privacy policies apply. We are not responsible for third-party content.
        </p>
      </LegalSectionBlock>

      <LegalSectionBlock id="join" number="09" title='Events and Applications ("Join Us")'>
        <p>If you register for events or apply to join MIMS, you agree that:</p>
        <ul>
          <li>you will provide accurate information,</li>
          <li>selection processes are competitive and discretionary,</li>
          <li>submission does not guarantee acceptance,</li>
          <li>we may contact you using the details provided for selection and logistics.</li>
        </ul>
        <p>Personal data handling is described in the <a href="/privacy-policy">Privacy Policy</a>.</p>
      </LegalSectionBlock>

      <LegalSectionBlock id="non-profit" number="10" title="Non-Profit and Fundraising">
        <p>
          MIMS is a non-profit student association and does not distribute profits. The website does not solicit
          on-campus fundraising. Any sponsorships or partnerships are handled in accordance with applicable
          University rules and approvals where required.
        </p>
      </LegalSectionBlock>

      <LegalSectionBlock id="changes" number="11" title="Changes to the Website and Terms">
        <p>
          We may modify the website or these Terms at any time. The "Last updated" date indicates the current
          version. Continued use after changes constitutes acceptance.
        </p>
      </LegalSectionBlock>

      <LegalSectionBlock id="law" number="12" title="Governing Law and Jurisdiction">
        <p>
          These Terms are governed by Italian law. Any disputes shall be subject to the jurisdiction of the
          courts of Milan, Italy, unless mandatory consumer law provides otherwise.
        </p>
      </LegalSectionBlock>

      <LegalSectionBlock id="contact" number="13" title="Contact">
        <p>
          For legal or policy enquiries contact:{' '}
          <a href="mailto:as.minerva@unibocconi.it">as.minerva@unibocconi.it</a>
        </p>
      </LegalSectionBlock>
    </LegalLayout>
  </>
);

export default TermsOfUse;
