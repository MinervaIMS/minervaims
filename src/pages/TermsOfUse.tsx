import { Helmet } from 'react-helmet-async';
import { LegalLayout, LegalSectionBlock, type LegalSection } from '@/components/shared';

// =====================================================================
// Terms of Use for the public website and the reserved Workspace.
// Drafted for an Italian unrecognised association (articles 36 to 38 of
// the Italian Civil Code).
// =====================================================================

const sections: LegalSection[] = [
  { id: 'about', title: '1. About MIMS' },
  { id: 'acceptance', title: '2. Acceptance of These Terms' },
  { id: 'educational', title: '3. Educational Purpose Only' },
  { id: 'no-advice', title: '4. No Investment Advice or Solicitation' },
  { id: 'no-reliance', title: '5. No Reliance and Risk' },
  { id: 'ip', title: '6. Intellectual Property' },
  { id: 'conduct', title: '7. Acceptable Use' },
  { id: 'forms', title: '8. Forms and Submitted Content' },
  { id: 'workspace', title: '9. The Reserved Workspace' },
  { id: 'bocconi', title: '10. Relationship with Bocconi' },
  { id: 'third-party', title: '11. Third-Party Links and Content' },
  { id: 'availability', title: '12. Availability and Changes' },
  { id: 'liability', title: '13. Limitation of Liability' },
  { id: 'indemnity', title: '14. Your Responsibility' },
  { id: 'law', title: '15. Governing Law and Jurisdiction' },
  { id: 'misc', title: '16. Final Provisions' },
];

const TermsOfUse = () => (
  <>
    <Helmet>
      <title>Terms of Use | MIMS</title>
      <meta
        name="description"
        content="The terms governing the use of the Minerva Investment Management Society website and reserved Workspace."
      />
    </Helmet>
    <LegalLayout
      title="Terms of Use"
      description="The rules that govern your use of this website and of the reserved Workspace."
      lastUpdated="July 12th, 2026"
      currentId="terms"
      sections={sections}
    >
      <LegalSectionBlock id="about" number="01" title="About MIMS">
        <p>
          This website is operated by Minerva Investment Management Society ("MIMS", "we", "us"), a student society
          organised as an unrecognised association under articles 36 to 38 of the Italian Civil Code, formed by
          students of Università Bocconi, Milan, Italy. As an unrecognised association, MIMS acts through the
          persons who represent it under its Statute; obligations undertaken in the association's name are governed
          by article 38 of the Italian Civil Code. Contact:{' '}
          <a href="mailto:as.minerva@unibocconi.it">as.minerva@unibocconi.it</a>.
        </p>
      </LegalSectionBlock>

      <LegalSectionBlock id="acceptance" number="02" title="Acceptance of These Terms">
        <p>
          By accessing or using this website you accept these Terms of Use, the{' '}
          <a href="/privacy-policy">Privacy Policy</a>, the <a href="/cookie-policy">Cookie Policy</a> and the{' '}
          <a href="/disclaimer">Disclaimer</a>, which together form the legal framework of the website. If you do
          not agree, please do not use the website. Additional rules accepted during specific processes (for example
          when applying for membership or registering for an event) supplement these Terms for that process.
        </p>
      </LegalSectionBlock>

      <LegalSectionBlock id="educational" number="03" title="Educational Purpose Only">
        <p>
          MIMS is a non-profit student initiative with exclusively educational and cultural purposes. Everything
          published on this website, including research reports, articles, market commentary, fund figures and any
          other material, is produced by students for learning purposes. Nothing on this website constitutes
          professional activity, a financial service, or an offer of services regulated under Italian or European
          financial legislation.
        </p>
      </LegalSectionBlock>

      <LegalSectionBlock id="no-advice" number="04" title="No Investment Advice or Solicitation">
        <p>
          No content on this website constitutes investment advice, investment research within the meaning of the
          applicable regulatory framework, legal, tax or accounting advice, a personal recommendation, or a
          solicitation, invitation or offer to buy or sell any financial instrument or to adopt any investment
          strategy. The "funds" referred to on this website are internal educational portfolios managed by students
          for learning purposes: they are not collective investment undertakings, they are not offered to the
          public, and no third-party money is ever accepted or managed.
        </p>
        <p>
          MIMS and its members are not authorised or supervised by CONSOB, the Bank of Italy or any other
          supervisory authority, and do not provide investment services or activities under the Italian Consolidated
          Law on Finance (Legislative Decree 58/1998).
        </p>
      </LegalSectionBlock>

      <LegalSectionBlock id="no-reliance" number="05" title="No Reliance and Risk">
        <p>
          Content is provided "as is", may contain errors and may become outdated without notice. Opinions are those
          of the student authors at the time of writing. You must not rely on any content for actual investment or
          financial decisions; obtain advice from a qualified professional instead. Past, simulated or back-tested
          performance is not indicative of future results. Investing involves risk, including loss of capital.
        </p>
      </LegalSectionBlock>

      <LegalSectionBlock id="ip" number="06" title="Intellectual Property">
        <p>
          The website, its design, the association's name and logo, and all published materials, including reports
          and templates, are property of MIMS or of their respective authors, who license them to MIMS for
          publication, and are protected by Italian Law 633/1941 on copyright and applicable EU law. You may read,
          download and print materials for personal, non-commercial, educational use, keeping every notice intact
          and citing MIMS as the source. Any other use, including reproduction, redistribution, commercial use,
          systematic scraping, or text and data mining for machine learning purposes, requires our prior written
          consent. MIMS reserves its rights under article 4 of Directive (EU) 2019/790 with respect to text and data
          mining.
        </p>
      </LegalSectionBlock>

      <LegalSectionBlock id="conduct" number="07" title="Acceptable Use">
        <p>When using the website you must not:</p>
        <ul>
          <li>attempt to gain unauthorised access to the Workspace, other accounts, or the underlying infrastructure;</li>
          <li>interfere with the operation of the website, introduce malicious code, or perform denial of service, scraping or bulk-harvesting activity;</li>
          <li>submit false, misleading or unlawful content through forms, applications or registrations, or impersonate another person;</li>
          <li>use contact details published on the website to send unsolicited commercial communications;</li>
          <li>use the website in any way that breaches applicable law or the rights of third parties.</li>
        </ul>
      </LegalSectionBlock>

      <LegalSectionBlock id="forms" number="08" title="Forms and Submitted Content">
        <p>
          Where the website allows you to submit information (membership applications, event registrations, the
          newsletter form, correspondence), you warrant that what you submit is accurate, that it is yours to
          submit, and that it does not infringe third-party rights. Documents submitted with applications (for
          example a CV) are used only for the selection process as described in the{' '}
          <a href="/privacy-policy">Privacy Policy</a>. We may refuse, remove or disregard submissions that breach
          these Terms.
        </p>
      </LegalSectionBlock>

      <LegalSectionBlock id="workspace" number="09" title="The Reserved Workspace">
        <p>
          The Workspace is a reserved area for members, advisors, alumni and applicants of MIMS. Access is personal:
          credentials must not be shared and each account may be used only by its holder. Access levels follow the
          role assigned under the association's internal rules and may be changed or revoked by the association at
          any time in line with its Statute. Actions performed in the Workspace are logged for security and
          accountability, as described in the Privacy Policy and inside the Workspace itself.
        </p>
        <p>
          Materials available in the Workspace, including templates, code repositories, research in progress, the
          alumni directory and internal documents, are confidential association assets. They may be used only for
          association purposes and may not be copied, disclosed or exploited outside the association, during or
          after membership. Removing or misusing such assets may give rise to liability towards the association and
          its members.
        </p>
      </LegalSectionBlock>

      <LegalSectionBlock id="bocconi" number="10" title="Relationship with Università Bocconi">
        <p>
          MIMS is a student association recognised within the Bocconi student association framework and, as such, it
          complies with the University's rules applicable to student associations, including the regulations on
          student associations and the University's Honor Code and student conduct rules, which bind its student
          members. Università Bocconi does not operate, endorse or supervise this website and assumes no
          responsibility for its content. The association's activities on campus are separately governed by the
          applicable University regulations.
        </p>
      </LegalSectionBlock>

      <LegalSectionBlock id="third-party" number="11" title="Third-Party Links and Content">
        <p>
          The website may link to external websites and embed third-party content (for example LinkedIn, Instagram
          or maps). Those services are governed by their own terms and privacy policies; we do not control them and
          accept no responsibility for their content or practices. Embedded third-party media loads only with your
          consent, as described in the <a href="/cookie-policy">Cookie Policy</a>.
        </p>
      </LegalSectionBlock>

      <LegalSectionBlock id="availability" number="12" title="Availability and Changes">
        <p>
          The website is provided free of charge as a voluntary student initiative. We may change, suspend or
          discontinue any part of it at any time, and we do not warrant uninterrupted or error-free availability.
          We may update these Terms; the date at the top identifies the version in force, and continued use after a
          change constitutes acceptance of the updated Terms.
        </p>
      </LegalSectionBlock>

      <LegalSectionBlock id="liability" number="13" title="Limitation of Liability">
        <p>
          To the maximum extent permitted by Italian law, MIMS, its governing bodies, members and volunteers accept
          no liability for damages arising from use of the website or reliance on its content, including indirect or
          consequential damages, loss of profits or loss of data. Nothing in these Terms excludes or limits
          liability for wilful misconduct or gross negligence (article 1229 of the Italian Civil Code) or any other
          liability that cannot be excluded by law. Mandatory consumer protections, where applicable, remain
          unaffected.
        </p>
      </LegalSectionBlock>

      <LegalSectionBlock id="indemnity" number="14" title="Your Responsibility">
        <p>
          You are responsible for your use of the website and for any content you submit. If your breach of these
          Terms causes claims or losses to MIMS or its members, you may be required to compensate them under the
          general rules of Italian law.
        </p>
      </LegalSectionBlock>

      <LegalSectionBlock id="law" number="15" title="Governing Law and Jurisdiction">
        <p>
          These Terms are governed by Italian law. For any dispute connected with the website, the courts of Milan
          have jurisdiction, without prejudice to any mandatory consumer forum provided by law for users acting as
          consumers resident in Italy or in the European Union.
        </p>
      </LegalSectionBlock>

      <LegalSectionBlock id="misc" number="16" title="Final Provisions">
        <p>
          If any provision of these Terms is held invalid, the remaining provisions stay effective. A failure to
          enforce a provision is not a waiver. These Terms are drafted in English for accessibility; legal concepts
          refer to Italian law. In case of conflict, the association's Statute prevails in internal association
          matters and the applicable University regulations prevail in the matters they govern; these Terms govern
          the use of the website and of the Workspace.
        </p>
      </LegalSectionBlock>
    </LegalLayout>
  </>
);

export default TermsOfUse;
