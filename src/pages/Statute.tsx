import { Helmet } from 'react-helmet-async';
import { PageIntroduction, PageLoader } from '@/components/shared';
import { useImagePreload } from '@/hooks/useImagePreload';
import termsBg from '@/assets/terms-bg.webp';

const Statute = () => {
  const imagesLoaded = useImagePreload([termsBg]);

  if (!imagesLoaded) {
    return <PageLoader />;
  }

  return (
    <>
      <Helmet>
        <title>Society Statute | MIMS</title>
        <meta
          name="description"
          content="Official statute of the Minerva Investment Management Society. Currently under revision; the updated version will be published at the start of academic year 2026/27."
        />
      </Helmet>
      <div className="relative">
        <div className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: `url(${termsBg})` }} />
        <div className="relative z-10">
          <PageIntroduction
            title="Society Statute"
            transparentBackground
          />
        </div>
      </div>

      <div className="container py-section-sm md:py-section">
        <div className="max-w-3xl space-y-8">
          <p className="font-body text-small text-muted-foreground">
            Status: Under revision
          </p>

          <section>
            <h2 className="font-serif text-heading mb-4">1. Document Under Revision</h2>
            <p className="font-body text-body text-muted-foreground">
              The official statute of the Minerva Investment Management Society is currently being revised by
              the Board. The updated document will set out the Society's purpose, governance structure,
              membership rules, division responsibilities, and internal procedures.
            </p>
          </section>

          <section>
            <h2 className="font-serif text-heading mb-4">2. Expected Publication</h2>
            <p className="font-body text-body text-muted-foreground">
              The revised statute will be made available on this page at the start of the next academic
              semester of academic year 2026/27. Until then, this page acts as a placeholder and no version of
              the statute is considered current or binding through this website.
            </p>
          </section>

          <section>
            <h2 className="font-serif text-heading mb-4">3. Requests and Enquiries</h2>
            <p className="font-body text-body text-muted-foreground">
              For questions regarding the Society's governance in the interim, please contact the Board at{' '}
              <a
                href="mailto:as.minerva@unibocconi.it"
                className="underline hover:text-primary transition-colors"
              >
                as.minerva@unibocconi.it
              </a>
              .
            </p>
          </section>
        </div>
      </div>
    </>
  );
};

export default Statute;
