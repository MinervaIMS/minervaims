import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ExternalLink } from 'lucide-react';
import { Seo } from '@/components/shared/Seo';
import { PageIntroduction, PageLoader } from '@/components/shared';
import { useImagePreload } from '@/hooks/useImagePreload';
import { HERO_OVERLAY_URL } from '@/lib/hero-overlay';
import londonBgAsset from '@/assets/MIMS_London_Background.webp.asset.json';
import { listPublishedPartners, type Partner } from '@/lib/partnerships-api';

// =====================================================================
// PARTNERSHIPS (/partnerships), Step 105.
// ---------------------------------------------------------------------
// The Society's agreements and joint initiatives with other student
// associations, as the Board lists them in Website > Partnerships: one
// list, each partner with its logo, name, what the agreement covers and a
// link. It starts empty and says so. Relations with companies are on
// Company relations, the page that was called Partnerships until this
// step.
// =====================================================================

function PartnerCard({ p }: { p: Partner }) {
  const body = (
    <>
      {/* The logo when there is one; without it the name alone leads the card. */}
      {p.logo_url && (
        <div className="mb-5 flex h-16 items-center">
          <img src={p.logo_url} alt={`${p.name} logo`} className="max-h-16 max-w-[11rem] object-contain" loading="lazy" decoding="async" />
        </div>
      )}
      <h3 className="font-serif text-subheading text-foreground">{p.name}</h3>
      {p.summary && <p className="mt-2 font-body text-body text-muted-foreground">{p.summary}</p>}
      {p.url && (
        <span className="mt-auto inline-flex items-center gap-1.5 pt-5 font-body text-small text-primary underline underline-offset-4 group-hover:text-accent">
          Visit their website<ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
        </span>
      )}
    </>
  );
  return (
    <li className="flex">
      {p.url ? (
        <a href={p.url} target="_blank" rel="noopener noreferrer" className="group flex w-full flex-col bg-muted p-6 md:p-7 transition-colors duration-300 ease-out hover:bg-[#ece9f4] focus-visible:bg-[#ece9f4]">
          {body}
        </a>
      ) : (
        <div className="flex w-full flex-col bg-muted p-6 md:p-7">{body}</div>
      )}
    </li>
  );
}

const Partnerships = () => {
  const londonBg = londonBgAsset.url;
  const imagesLoaded = useImagePreload([londonBg, HERO_OVERLAY_URL]);
  const [partners, setPartners] = useState<Partner[] | null>(null);
  useEffect(() => { listPublishedPartners().then(setPartners); }, []);

  if (!imagesLoaded || partners === null) return <PageLoader />;

  return (
    <>
      <Seo page="/partnerships" />

      <div data-page-hero className="relative">
        <div className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: `url(${londonBg})` }} />
        <div className="absolute inset-0 hero-overlay" />
        <div className="relative z-10">
          <PageIntroduction title="Partnerships" transparentBackground />
        </div>
      </div>

      <section className="py-section-sm md:py-section bg-background">
        <div className="container">
          <h2 className="font-serif text-heading mb-6 pb-3 border-b border-separator text-accent">Working together</h2>
          <p className="font-body text-body-lg text-muted-foreground max-w-3xl">
            Minerva Investment Management Society works alongside other student associations on joint events and initiatives. Every partnership follows the rules Bocconi University sets for its recognised student associations.
          </p>
          <p className="font-body text-body text-muted-foreground max-w-3xl mt-4">
            Companies and institutions engage with the Society through the formats set out on{' '}
            <Link to="/company-relations" className="text-accent underline underline-offset-4 hover:opacity-80">Company relations</Link>.
          </p>
        </div>
      </section>

      {partners.length === 0 ? (
        <section className="pb-section-sm md:pb-section bg-background">
          <div className="container">
            <div className="bg-muted p-8 md:p-10 max-w-3xl">
              <p className="font-body text-body-lg text-foreground">Our current agreements will be listed here.</p>
              <p className="font-body text-body text-muted-foreground mt-2">
                To propose an initiative with another student association, write to us from{' '}
                <Link to="/contacts" className="text-accent underline underline-offset-4 hover:opacity-80">Contacts</Link>.
              </p>
            </div>
          </div>
        </section>
      ) : (
        <section className="pb-section-sm md:pb-section bg-background" aria-labelledby="partners-heading">
          <div className="container">
            <h2 id="partners-heading" className="font-serif text-heading mb-3 pb-3 border-b border-separator text-accent">Student associations</h2>
            <p className="font-body text-body text-muted-foreground max-w-3xl mb-8">Associations we work alongside: joint events, shared initiatives and opportunities for both memberships.</p>
            <ul className="grid grid-cols-1 gap-[.7rem] sm:grid-cols-2 md:gap-4 lg:grid-cols-3">
              {partners.map((p) => <PartnerCard key={p.id} p={p} />)}
            </ul>
          </div>
        </section>
      )}

      <section className="pb-section-sm md:pb-section bg-background">
        <div className="container">
          <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-6 border-t border-separator pt-8">
            <p className="font-body text-body-lg text-muted-foreground max-w-3xl">
              Representing a student association and interested in working with Minerva? We would be glad to hear from you.
            </p>
            <Link to="/contacts" className="cta-link whitespace-nowrap shrink-0">Get in touch</Link>
          </div>
        </div>
      </section>
    </>
  );
};

export default Partnerships;
