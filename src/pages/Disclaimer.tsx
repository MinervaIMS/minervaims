import { Helmet } from 'react-helmet-async';
import { LegalLayout, LegalSectionBlock, type LegalSection } from '@/components/shared';

// =====================================================================
// Disclaimer for the association's published content: reports, articles,
// opinions, fund figures and any financial or educational material.
// =====================================================================

const sections: LegalSection[] = [
  { id: 'nature', title: '1. Nature of the Content' },
  { id: 'no-advice', title: '2. No Advice, No Offer' },
  { id: 'funds', title: '3. Student-Managed Funds' },
  { id: 'no-warranty', title: '4. No Warranty' },
  { id: 'authors', title: '5. Authors and Opinions' },
  { id: 'independence', title: '6. Independence from Bocconi' },
  { id: 'liability', title: '7. Liability' },
  { id: 'contact', title: '8. Reporting Errors' },
];

const Disclaimer = () => (
  <>
    <Helmet>
      <title>Disclaimer | MIMS</title>
      <meta
        name="description"
        content="Important information about the educational nature of all content published by Minerva Investment Management Society."
      />
    </Helmet>
    <LegalLayout
      title="Disclaimer"
      description="Important information about the educational nature of everything published on this website."
      lastUpdated="July 12th, 2026"
      currentId="disclaimer"
      sections={sections}
    >
      <LegalSectionBlock id="nature" number="01" title="Nature of the Content">
        <p>
          Minerva Investment Management Society ("MIMS") is a non-profit student society of Università Bocconi with
          exclusively educational purposes. All content on this website, including research reports, articles,
          market commentary, valuations, model outputs, performance figures and any other material, is prepared by
          students as part of their learning and is published for information and educational purposes only.
        </p>
      </LegalSectionBlock>

      <LegalSectionBlock id="no-advice" number="02" title="No Advice, No Offer">
        <p>
          Nothing on this website constitutes investment advice, a personal recommendation, investment research
          within the meaning of the applicable regulatory framework, legal, tax or accounting advice, or an offer,
          invitation or solicitation to buy, sell or subscribe to any financial instrument, product or service.
          MIMS and its members are not authorised or supervised by CONSOB, the Bank of Italy or any other authority
          and do not provide investment services under the Italian Consolidated Law on Finance (Legislative Decree
          58/1998). Content is not tailored to the circumstances of any person.
        </p>
      </LegalSectionBlock>

      <LegalSectionBlock id="funds" number="03" title="Student-Managed Funds">
        <p>
          References to the "Multi Asset Fund", the "Long Short Fund" or other portfolios describe internal
          educational exercises managed by students. They are not collective investment undertakings, are not
          offered to the public, are not audited, and no third-party money is accepted or managed. Published
          performance figures are prepared with care but are unaudited educational data; past, simulated or
          back-tested performance is not indicative of future results.
        </p>
      </LegalSectionBlock>

      <LegalSectionBlock id="no-warranty" number="04" title="No Warranty">
        <p>
          Content is provided "as is" and may be incomplete, outdated or inaccurate. We make no representation or
          warranty, express or implied, as to accuracy, completeness, timeliness or fitness for any purpose. You are
          solely responsible for any use of the information; before making any financial decision, consult a
          qualified professional. Investing involves risk, including the possible loss of capital.
        </p>
      </LegalSectionBlock>

      <LegalSectionBlock id="authors" number="05" title="Authors and Opinions">
        <p>
          Opinions expressed are those of the student authors at the time of publication and may change without
          notice. They do not represent positions of Università Bocconi, of the association's partners or advisors,
          or of the authors' past, present or future employers. Authors write in a personal, educational capacity;
          reports may cover securities in which authors have no position and no duty of ongoing coverage exists.
        </p>
      </LegalSectionBlock>

      <LegalSectionBlock id="independence" number="06" title="Independence from Università Bocconi">
        <p>
          MIMS is independent from Università Bocconi. The University does not review, approve, endorse or monitor
          this website or its contents and bears no responsibility for them. References to Bocconi describe the
          association's status as a student society within the University's student association framework and imply
          no sponsorship of the content published here.
        </p>
      </LegalSectionBlock>

      <LegalSectionBlock id="liability" number="07" title="Liability">
        <p>
          To the maximum extent permitted by Italian law, MIMS, its governing bodies, members and volunteers accept
          no liability for losses or damages of any kind arising from the use of, or reliance on, any content of
          this website. This does not exclude liability that cannot be excluded by law (article 1229 of the Italian
          Civil Code). The <a href="/terms-of-use">Terms of Use</a> contain the full liability framework.
        </p>
      </LegalSectionBlock>

      <LegalSectionBlock id="contact" number="08" title="Reporting Errors">
        <p>
          If you believe any published content is inaccurate, infringes rights or requires correction, write to{' '}
          <a href="mailto:as.minerva@unibocconi.it">as.minerva@unibocconi.it</a>. We review reports promptly and
          correct or remove content where appropriate.
        </p>
      </LegalSectionBlock>
    </LegalLayout>
  </>
);

export default Disclaimer;
