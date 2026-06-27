import { Helmet } from "react-helmet-async";
import { PageIntroduction, PageLoader } from "@/components/shared";
import { useImagePreload } from "@/hooks/useImagePreload";
import contactsBgAsset from "@/assets/MIMS_Contacts.webp.asset.json";

const Contacts = () => {
  const contactsBg = contactsBgAsset.url;
  const imagesLoaded = useImagePreload([contactsBg]);

  if (!imagesLoaded) {
    return <PageLoader />;
  }

  return (
    <>
      <Helmet>
        <title>Contacts | MIMS</title>
      </Helmet>

      <div data-page-hero className="relative">
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: `url(${contactsBg})` }}
        />
        <div className="absolute inset-0 hero-overlay" />
        <div className="relative z-10">
          <PageIntroduction title="Contacts" transparentBackground />
        </div>
      </div>

      <section className="py-section-sm md:py-section bg-background">
        <div className="container">
          <h2 className="font-serif text-xl sm:text-heading mb-6 pb-3 border-b border-separator text-accent">
            Get in touch
          </h2>
          <div className="max-w-4xl space-y-6">
            <p className="font-body text-body-lg text-muted-foreground">
              For general enquiries, collaborations, events, or Society-related questions, please contact the team at{' '}
              <a href="mailto:as.minerva@unibocconi.it" className="underline underline-offset-4 text-accent">
                as.minerva@unibocconi.it
              </a>
              .
            </p>
            <p className="font-body text-body-lg text-muted-foreground">
              We will direct your message to the relevant division or function and respond as soon as possible.
            </p>
          </div>
        </div>
      </section>
    </>
  );
};

export default Contacts;
