import { Helmet } from "react-helmet-async";
import { Link } from "react-router-dom";
import { PageIntroduction, PageLoader } from "@/components/shared";
import { useImagePreload } from "@/hooks/useImagePreload";
import contactsBgAsset from "@/assets/MIMS_Contacts.webp.asset.json";
import linkedinIcon from "@/assets/linkedin-black.svg";
import instagramIcon from "@/assets/instagram-black.svg";

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
              For general enquiries, research collaborations, or Society-related matters, the team can be reached at{" "}
              <a
                href="mailto:as.minerva@unibocconi.it"
                className="underline underline-offset-4 text-accent"
              >
                as.minerva@unibocconi.it
              </a>
              . We endeavour to respond to all correspondence within three business days.
            </p>

            <div className="space-y-4">
              <p className="font-body text-body-lg text-muted-foreground">
                Follow our work and stay informed on upcoming events and publications.
              </p>
              <div className="flex items-center gap-4">
                <a
                  href="https://www.linkedin.com/company/minerva-investment-management/"
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="MIMS on LinkedIn"
                  className="inline-flex"
                >
                  <img src={linkedinIcon} alt="" className="w-8 h-8" />
                </a>
                <a
                  href="https://www.instagram.com/minerva.ims/"
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="MIMS on Instagram"
                  className="inline-flex"
                >
                  <img src={instagramIcon} alt="" className="w-8 h-8" />
                </a>
              </div>
            </div>

            <p className="font-body text-body-lg text-muted-foreground">
              For companies and financial institutions seeking to establish a partnership or collaborate with the Society, please visit our{" "}
              <Link to="/partnerships" className="underline underline-offset-4 text-accent">
                Partnerships page
              </Link>
              .
            </p>

            <div className="pt-2">
              <Link
                to="/partnerships"
                className="inline-flex items-center justify-center px-6 py-3 bg-background border border-foreground text-foreground font-serif hover:bg-muted transition-colors"
              >
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
