import { Helmet } from 'react-helmet-async';
import { LegalLayout, LegalSectionBlock, type LegalSection } from '@/components/shared';

const sections: LegalSection[] = [
  { id: 'revision', title: '1. Document Under Revision' },
  { id: 'publication', title: '2. Expected Publication' },
  { id: 'enquiries', title: '3. Requests and Enquiries' },
];

const Statute = () => (
  <>
    <Helmet>
      <title>Society Statute | MIMS</title>
      <meta
        name="description"
        content="Official statute of the Minerva Investment Management Society. Currently under revision; the updated version will be published at the start of academic year 2026/27."
      />
    </Helmet>
    <LegalLayout
      title="Society Statute"
      description="The official statute of MIMS, currently under revision by the Board."
      lastUpdated="Under revision"
      currentId="statute"
      sections={sections}
      languageToggle={
        <>
          <span className="lp-lang-label">Language</span>
          <div className="lp-lang-seg" role="group" aria-label="Statute language">
            <button type="button" className="active" aria-pressed="true">English</button>
            <button type="button" aria-pressed="false" disabled title="Italian version available with the revised statute">Italiano</button>
          </div>
        </>
      }
    >
      <LegalSectionBlock id="revision" number="01" title="Document Under Revision">
        <p>
          The official statute of the Minerva Investment Management Society is currently being revised by
          the Board. The updated document will set out the Society's purpose, governance structure,
          membership rules, division responsibilities, and internal procedures.
        </p>
      </LegalSectionBlock>

      <LegalSectionBlock id="publication" number="02" title="Expected Publication">
        <p>
          The revised statute will be made available on this page at the start of the next academic
          semester of academic year 2026/27. Until then, this page acts as a placeholder and no version of
          the statute is considered current or binding through this website.
        </p>
      </LegalSectionBlock>

      <LegalSectionBlock id="enquiries" number="03" title="Requests and Enquiries">
        <p>
          For questions regarding the Society's governance in the interim, please contact the Board at{' '}
          <a href="mailto:as.minerva@unibocconi.it">as.minerva@unibocconi.it</a>.
        </p>
      </LegalSectionBlock>
    </LegalLayout>
  </>
);

export default Statute;
