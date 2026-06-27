import { Helmet } from "react-helmet-async";
import { Link } from "react-router-dom";
import { PageIntroduction, PageLoader } from "@/components/shared";
import { useImagePreload } from "@/hooks/useImagePreload";
import contactsBgAsset from "@/assets/MIMS_Contacts.webp.asset.json";
import linkedinIcon from "@/assets/linkedin-white.svg";
import instagramIcon from "@/assets/instagram-white.svg";

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
          <div className="grid grid-cols-1 lg:grid-cols-[1.55fr_1fr] gap-10 lg:gap-15">
            {/* LEFT — Get in touch */}
            <div>
              <h2 className="font-serif text-xl sm:text-heading mb-6 pb-3 border-b border-separator text-accent">
                Get in touch
              </h2>
              <p className="font-body text-body-lg text-muted-foreground max-w-xl">
                For general enquiries, research collaborations, or Society-related matters, the team can be reached directly by email. We endeavour to respond to all correspondence within three business days.
              </p>

              <div className="mt-9 grid grid-cols-1 sm:grid-cols-2">
                <div className="pb-8 sm:pb-0 sm:pr-7 border-b sm:border-b-0 border-separator">
                  <div className="font-body uppercase tracking-[.1em] text-xs text-muted-foreground">
                    General enquiries
                  </div>
                  <a
                    href="mailto:as.minerva@unibocconi.it"
                    className="block font-serif text-xl text-accent mt-2.5 underline-offset-4 hover:underline break-words"
                  >
                    as.minerva@unibocconi.it
                  </a>
                  <p className="font-body text-sm text-muted-foreground mt-2">
                    Membership, events, and publications.
                  </p>
                </div>
                <div className="pt-8 sm:pt-0 sm:pl-7 sm:border-l border-separator">
                  <div className="font-body uppercase tracking-[.1em] text-xs text-muted-foreground">
                    Institutions &amp; partnerships
                  </div>
                  <p className="font-body text-sm text-muted-foreground mt-2.5">
                    Collaboration with firms and faculty.
                  </p>
                  <Link
                    to="/partnerships"
                    className="inline-flex items-center justify-center mt-4 px-6 py-2.5 bg-background border border-accent text-accent font-serif hover:bg-accent hover:text-background transition-colors"
                  >
                    Visit Partnerships
                  </Link>
                </div>
              </div>
            </div>

            {/* RIGHT — Sidebar */}
            <aside className="bg-muted p-8 self-start">
              <div className="font-body uppercase tracking-[.1em] text-xs text-muted-foreground">
                Follow our work
              </div>
              <div className="flex gap-3 mt-3.5">
                <a
                  href="https://www.linkedin.com/company/minerva-investment-management/"
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="MIMS on LinkedIn"
                  className="w-10 h-10 rounded-full bg-accent flex items-center justify-center hover:opacity-80 transition-opacity"
                >
                  <img src={linkedinIcon} alt="" className="w-4 h-4" />
                </a>
                <a
                  href="https://www.instagram.com/minerva.ims/"
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="MIMS on Instagram"
                  className="w-10 h-10 rounded-full bg-accent flex items-center justify-center hover:opacity-80 transition-opacity"
                >
                  <img src={instagramIcon} alt="" className="w-4 h-4" />
                </a>
              </div>

              <div className="h-px bg-separator my-7" />

              <div className="font-body uppercase tracking-[.1em] text-xs text-muted-foreground">
                Our members
              </div>
              <p className="font-body text-sm text-muted-foreground mt-2.5 leading-relaxed">
                For those interested in getting to know our work and activities better, reach out to our members.
              </p>
              <Link
                to="/people"
                className="inline-flex items-center justify-center mt-4 px-6 py-2.5 bg-background border border-accent text-accent font-serif hover:bg-accent hover:text-background transition-colors"
              >
                Meet the members
              </Link>
            </aside>
          </div>
        </div>
      </section>
    </>
  );
};

export default Contacts;
