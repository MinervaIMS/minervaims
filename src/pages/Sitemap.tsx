import { Link } from 'react-router-dom';
import { Seo } from '@/components/shared/Seo';
import { PageIntroduction, PageLoader } from '@/components/shared';
import { useImagePreload } from '@/hooks/useImagePreload';
import { HERO_OVERLAY_URL } from '@/lib/hero-overlay';
import sitemapBgAsset from '@/assets/MIMS_Sitemap.webp.asset.json';

const Sitemap = () => {
  const sitemapBg = sitemapBgAsset.url;
    // The dark wash over the hero is a SECOND downloaded image, not a gradient
  // (see lib/hero-overlay.ts). Preloading it with the photograph is what stops
  // the page opening on the bright, unshaded picture and darkening a moment
  // later. Both `.hero-overlay` and `.page-intro-overlay` use this same asset.
  const imagesLoaded = useImagePreload([sitemapBg, HERO_OVERLAY_URL]);

  const sections = [
    {
      title: 'Main',
      links: [
        { label: 'Home', href: '/' },
        { label: 'About', href: '/about' },
        { label: 'Events', href: '/events' },
        { label: 'Archive', href: '/archive' },
        { label: 'Readings', href: '/readings' },
        { label: 'Partnerships', href: '/partnerships' },
        { label: 'Contacts', href: '/contacts' },
      ],
    },
    {
      title: 'Join Us',
      links: [
        { label: 'Recruiting And Admissions', href: '/join' },
        { label: 'Application Form', href: '/apply' },
        { label: 'Sign In To The Workspace', href: '/auth' },
      ],
    },
    {
      title: 'Divisions',
      links: [
        { label: 'Equity Research', href: '/divisions/equity' },
        { label: 'Investment Research', href: '/divisions/investment' },
        { label: 'Macro Research', href: '/divisions/macro' },
        { label: 'Portfolio Management', href: '/divisions/portfolio' },
        { label: 'Quantitative Research', href: '/divisions/quant' },
      ],
    },
    {
      title: 'Funds',
      links: [
        { label: 'Long Short Equity Fund', href: '/funds/long-short' },
        { label: 'Multi Asset Global Opportunities Fund', href: '/funds/multi-asset' },
        { label: 'Diversified Passive Selection Fund (Closed)', href: '/funds/dps' },
        { label: 'Italian Equity PIR Fund (Closed)', href: '/funds/pir' },
      ],
    },
    {
      title: 'People',
      links: [
        { label: 'Members', href: '/people/members' },
        { label: 'Alumni', href: '/people/alumni' },
      ],
    },
    {
      title: 'Legal',
      links: [
        { label: 'Terms of Use', href: '/terms-of-use' },
        { label: 'Privacy Policy', href: '/privacy-policy' },
        { label: 'Cookie Policy', href: '/cookie-policy' },
        { label: 'Disclaimer', href: '/disclaimer' },
        { label: 'Society Statute', href: '/statute' },
        { label: 'Sitemap', href: '/sitemap' },
      ],
    },
  ];

  if (!imagesLoaded) {
    return <PageLoader />;
  }

  return (
    <>
      <Seo page="/sitemap" />
      <div className="relative">
        <div className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: `url(${sitemapBg})` }} />
        <div className="absolute inset-0 hero-overlay" />
        <div className="relative z-10">
          <PageIntroduction
            title="Sitemap"
            transparentBackground
          />
        </div>
      </div>

      <div className="container py-section-sm md:py-section">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-12">
          {sections.map((section) => (
            <div key={section.title}>
              <h2 className="font-serif text-heading mb-4 pb-2 border-b border-separator text-accent">
                {section.title}
              </h2>
              <ul className="space-y-2">
                {section.links.map((link) => (
                  <li key={link.href}>
                    <Link 
                      to={link.href}
                      className="font-body text-body text-muted-foreground hover:text-primary transition-colors"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </>
  );
};

export default Sitemap;
