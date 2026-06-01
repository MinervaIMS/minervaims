import { Helmet } from 'react-helmet-async';
import { LegalLayout, LegalSectionBlock, type LegalSection } from '@/components/shared';

const sections: LegalSection[] = [
  { id: 'educational', title: '1. Educational Purpose' },
  { id: 'no-warranty', title: '2. No Warranty' },
  { id: 'independence', title: '3. Independence from Bocconi' },
];

const Disclaimer = () => (
  <>
    <Helmet>
      <title>Disclaimer | MIMS</title>
      <meta
        name="description"
        content="Educational disclaimer for the Minerva Investment Management Society website. No investment advice; independent from Università Bocconi."
      />
    </Helmet>
    <LegalLayout
      title="Disclaimer"
      description="Educational notice and limits on the use of materials published on this website."
      lastUpdated="January 1st, 2026"
      effectiveDate="January 1st, 2026"
      currentId="disclaimer"
      sections={sections}
    >
      <LegalSectionBlock id="educational" number="01" title="Educational Purpose">
        <p>
          Minerva Investment Management Society (MIMS) is a student society promoted and managed by
          Bocconi University's students. This website and any documents made available through it
          (including reports, presentations, virtual portfolio materials and event content) are provided
          solely for educational and academic purposes. They do not constitute investment advice,
          investment research, a personal recommendation, or an offer or solicitation to buy or sell any
          security or financial instrument, or to adopt any investment strategy. Any references to issuers,
          securities, asset classes, indices, markets, or strategies are for illustrative purposes only and
          may relate to simulated or virtual portfolios; they must not be relied upon for real-world
          investment decisions.
        </p>
      </LegalSectionBlock>

      <LegalSectionBlock id="no-warranty" number="02" title="No Warranty — Use at Your Own Risk">
        <p>
          Information is provided "as is" and may be incomplete, outdated, or inaccurate. Opinions are
          those of the authors at the time of publication and may change without notice. You are solely
          responsible for any use of the information and should obtain independent advice from a qualified
          professional before making any investment decision. Past performance, back-tested, or simulated
          results are not indicative of future results. Investing involves risk, including the possible
          loss of capital.
        </p>
      </LegalSectionBlock>

      <LegalSectionBlock id="independence" number="03" title="Independence from Università Bocconi">
        <p>
          MIMS is independent from Università Bocconi. Bocconi University does not review, approve,
          endorse, or monitor this website or its contents and is not responsible for any content,
          activities, or outcomes connected to it. Use of this website is at your own risk.
        </p>
      </LegalSectionBlock>
    </LegalLayout>
  </>
);

export default Disclaimer;
