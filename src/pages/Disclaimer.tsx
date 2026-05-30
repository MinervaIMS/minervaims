import { Helmet } from 'react-helmet-async';
import { PageIntroduction, PageLoader } from '@/components/shared';
import { useImagePreload } from '@/hooks/useImagePreload';
import termsBg from '@/assets/terms-bg.webp';

const Disclaimer = () => {
  const imagesLoaded = useImagePreload([termsBg]);

  if (!imagesLoaded) {
    return <PageLoader />;
  }

  return (
    <>
      <Helmet>
        <title>Disclaimer | MIMS</title>
        <meta
          name="description"
          content="Educational disclaimer for the Minerva Investment Management Society website. No investment advice; independent from Università Bocconi."
        />
      </Helmet>
      <div className="relative">
        <div className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: `url(${termsBg})` }} />
        <div className="relative z-10">
          <PageIntroduction
            title="Disclaimer"
            transparentBackground
          />
        </div>
      </div>

      <div className="container py-section-sm md:py-section">
        <div className="max-w-3xl space-y-8">
          <p className="font-body text-small text-muted-foreground">
            Last updated: January 1st, 2026
          </p>

          <section>
            <h2 className="font-serif text-heading mb-4">1. Educational Purpose</h2>
            <p className="font-body text-body text-muted-foreground">
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
          </section>

          <section>
            <h2 className="font-serif text-heading mb-4">2. No Warranty — Use at Your Own Risk</h2>
            <p className="font-body text-body text-muted-foreground">
              Information is provided "as is" and may be incomplete, outdated, or inaccurate. Opinions are
              those of the authors at the time of publication and may change without notice. You are solely
              responsible for any use of the information and should obtain independent advice from a qualified
              professional before making any investment decision. Past performance, back-tested, or simulated
              results are not indicative of future results. Investing involves risk, including the possible
              loss of capital.
            </p>
          </section>

          <section>
            <h2 className="font-serif text-heading mb-4">3. Independence from Università Bocconi</h2>
            <p className="font-body text-body text-muted-foreground">
              MIMS is independent from Università Bocconi. Bocconi University does not review, approve,
              endorse, or monitor this website or its contents and is not responsible for any content,
              activities, or outcomes connected to it. Use of this website is at your own risk.
            </p>
          </section>
        </div>
      </div>
    </>
  );
};

export default Disclaimer;
