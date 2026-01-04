import { Link } from 'react-router-dom';
import { PageIntroduction } from '@/components/shared';
import sitemapBg from '@/assets/sitemap-bg.webp';

const Sitemap = () => {
  const sections = [
    {
      title: 'Main',
      links: [
        { label: 'Home', href: '/' },
        { label: 'About Us', href: '/about' },
        { label: 'Events', href: '/events' },
        { label: 'Join Us', href: '/join' },
        { label: 'Archive', href: '/archive' },
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
      title: 'Members',
      links: [
        { label: 'Our Team', href: '/members/team' },
        { label: 'Alumni', href: '/members/alumni' },
      ],
    },
    {
      title: 'Legal',
      links: [
        { label: 'Terms of Use', href: '/terms-of-use' },
        { label: 'Privacy Policy', href: '/privacy-policy' },
        { label: 'Cookie Policy', href: '/cookie-policy' },
      ],
    },
  ];

  return (
    <>
      <div className="relative">
        <div className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: `url(${sitemapBg})` }} />
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
