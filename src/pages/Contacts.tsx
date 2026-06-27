import { Helmet } from "react-helmet-async";
import { Link } from "react-router-dom";
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
          <div>
            <h2 className="font-serif text-xl sm:text-heading mb-6 pb-3 border-b border-separator text-accent">
              Get in touch with Minerva
            </h2>
            <p className="font-body text-body-lg text-muted-foreground max-w-xl">
              For general enquiries, research collaborations, or Society-related matters, the team can be reached directly by email. We endeavour to respond to all correspondence within three business days.
            </p>

            <div className="mt-14 pb-8 sm:pb-0 sm:pr-7 flex justify-center">
              <a
                href="mailto:as.minerva@unibocconi.it"
                className="group inline-flex items-center gap-3 font-serif text-3xl md:text-4xl text-accent break-words"
              >
                <span className="underline-offset-4 group-hover:underline">
                  as.minerva@unibocconi.it
                </span>
              </a>
            </div>
          </div>

          {/* Partnerships & Collaborations section */}
          <div className="mt-16 md:mt-20">
            <h2 className="font-serif text-xl sm:text-heading mb-6 pb-3 border-b border-separator text-accent">
              Partnerships &amp; Collaborations
            </h2>
            <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-6">
              <p className="font-body text-body-lg text-muted-foreground max-w-3xl">
                From student associations to institutions and companies, Minerva has a long experience in promoting partnerships of great mutual return. Find out more
              </p>
              <Link to="/partnerships" className="cta-link whitespace-nowrap shrink-0">
                Visit Partnerships
              </Link>
            </div>
          </div>
        </div>
      </section>
    </>
  );
};

export default Contacts;
