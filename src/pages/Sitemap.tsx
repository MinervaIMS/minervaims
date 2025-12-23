import { Link } from 'react-router-dom';
import { PageIntroduction } from '@/components/shared';

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
        { label: 'All Divisions', href: '/divisions' },
        { label: 'Equity Research', href: '/divisions/equity' },
        { label: 'Investment Research', href: '/divisions/investment' },
        { label: 'Macro Research', href: '/divisions/macro' },
        { label: 'Portfolio Management', href: '/divisions/portfolio' },
        { label: 'Quant Research', href: '/divisions/quant' },
      ],
    },
    {
      title: 'Funds',
      links: [
        { label: 'All Funds', href: '/funds' },
        { label: 'Long Short Equity Fund', href: '/funds/long-short' },
        { label: 'Multi Asset Global Opportunities Fund', href: '/funds/multi-asset' },
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
      <PageIntroduction
        title="Sitemap"
        description="Complete overview of all pages on this website."
      />

      <div className="container py-section-sm md:py-section">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-12">
          {sections.map((section) => (
            <div key={section.title}>
              <h2 className="font-serif text-heading mb-4 pb-2 border-b border-separator">
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
