import { Seo } from '@/components/shared/Seo';
import { Link } from "react-router-dom";
import { PageIntroduction, PageLoader } from "@/components/shared";
import { useImagePreload } from "@/hooks/useImagePreload";
import { HERO_OVERLAY_URL } from "@/lib/hero-overlay";
import contactsBgAsset from "@/assets/MIMS_Contacts.webp.asset.json";
import { KeyFigureValue } from "@/components/numbers/KeyFigureValue";
import { useKeyNumbers } from "@/hooks/useKeyNumbers";
import { CONTACTS_FIGURES, describeKeyNumber } from "@/lib/key-numbers";

// =====================================================================
// THE FIGURES BESIDE EACH WAY IN (Step 107). Three key figures from the
// registry under each of the two sections, next to its button: what a
// company or an association weighing a collaboration wants to know first.
// Exact, final from the first frame and never counted up (the number
// rule, AGENTS.md); a figure the registry does not have is left out.
// =====================================================================
function ContactFigures({ slugs, label }: { slugs: readonly string[]; label: string }) {
  const snap = useKeyNumbers();
  const figures = slugs.map((slug) => (snap?.numbers[slug] ? { slug, ...snap.numbers[slug] } : null)).filter((f) => f !== null);
  if (figures.length === 0) return null;
  return (
    <dl aria-label={label} className="grid grid-cols-3 gap-x-4 border-t border-separator pt-5 sm:gap-x-8">
      {figures.map((f) => (
        <div key={f.slug} className="flex min-w-0 flex-col" title={describeKeyNumber(f)}>
          <dt className="order-2 mt-2 font-body text-[0.6875rem] uppercase leading-snug tracking-wider text-muted-foreground sm:text-xs">{f.label}</dt>
          <dd className="order-1 whitespace-nowrap font-serif text-[2rem] leading-none text-primary sm:text-[2.5rem]">
            <KeyFigureValue figure={f} />
          </dd>
        </div>
      ))}
    </dl>
  );
}

const Contacts = () => {
  const contactsBg = contactsBgAsset.url;
    // The dark wash over the hero is a SECOND downloaded image, not a gradient
  // (see lib/hero-overlay.ts). Preloading it with the photograph is what stops
  // the page opening on the bright, unshaded picture and darkening a moment
  // later. Both `.hero-overlay` and `.page-intro-overlay` use this same asset.
  const imagesLoaded = useImagePreload([contactsBg, HERO_OVERLAY_URL]);

  if (!imagesLoaded) {
    return <PageLoader />;
  }

  return (
    <>
      <Seo page="/contacts" />

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
            <h2 className="font-serif text-heading mb-6 pb-3 border-b border-separator text-accent">
              Get in touch with Minerva
            </h2>
            <p className="font-body text-body-lg text-muted-foreground max-w-3xl">
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

          {/* Company relations and Partnerships, as two sections of equal
              weight (Step 105): the same heading, rule, paragraph and link
              each, and since Step 107 three key figures beside the link. `mt-section-sm md:mt-section`: two blocks, each with its
              own heading and rule, are two subjects, and the site joins two
              subjects at 80 on a phone and 128 from md up. */}
          <div className="mt-section-sm md:mt-section">
            <h2 className="font-serif text-heading mb-6 pb-3 border-b border-separator text-accent">
              Company relations
            </h2>
            <p className="font-body text-body-lg text-muted-foreground max-w-3xl">
              Minerva works with financial institutions, asset managers and corporates on structured academic and editorial initiatives. For companies and professionals seeking to engage with the Society, Company relations sets out the available formats and the applicable terms.
            </p>
            <div className="mt-8 flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between lg:gap-12">
              <div className="max-w-2xl flex-1">
                <ContactFigures slugs={CONTACTS_FIGURES.company} label="Company relations in figures" />
              </div>
              <Link to="/company-relations" className="cta-link whitespace-nowrap shrink-0">
                Visit Company relations
              </Link>
            </div>
          </div>

          <div className="mt-section-sm md:mt-section">
            <h2 className="font-serif text-heading mb-6 pb-3 border-b border-separator text-accent">
              Partnerships
            </h2>
            <p className="font-body text-body-lg text-muted-foreground max-w-3xl">
              Minerva works alongside other student associations on joint events and initiatives. Partnerships lists our current agreements and how to propose one.
            </p>
            <div className="mt-8 flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between lg:gap-12">
              <div className="max-w-2xl flex-1">
                <ContactFigures slugs={CONTACTS_FIGURES.partnerships} label="Partnerships in figures" />
              </div>
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
