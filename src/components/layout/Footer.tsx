import { Link } from 'react-router-dom';

const exploreLinks = [
  { label: 'Join Us', href: '/join' },
  { label: 'Archive', href: '/archive' },
  { label: 'Sitemap', href: '/sitemap' },
];

const connectLinks = [
  { label: 'Email', href: 'mailto:contact@mims-placeholder.org' },
  { label: 'LinkedIn', href: '#' },
  { label: 'Instagram', href: '#' },
];

const legalLinks = [
  { label: 'Terms of Use', href: '/terms' },
  { label: 'Privacy Policy', href: '/privacy' },
  { label: 'Cookie Policy', href: '/cookies' },
];

export function Footer() {
  return (
    <footer className="bg-foreground text-background">
      <div className="container py-12 md:py-16">
        {/* Main Footer Content */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 md:gap-12 mb-12">
          {/* Explore */}
          <div>
            <h3 className="font-serif text-subheading mb-4">Explore</h3>
            <ul className="space-y-2">
              {exploreLinks.map((link) => (
                <li key={link.href}>
                  <Link
                    to={link.href}
                    className="font-body text-small text-background/80 hover:text-background transition-colors"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Connect */}
          <div>
            <h3 className="font-serif text-subheading mb-4">Connect</h3>
            <ul className="space-y-2">
              {connectLinks.map((link) => (
                <li key={link.label}>
                  <a
                    href={link.href}
                    className="font-body text-small text-background/80 hover:text-background transition-colors"
                    target={link.href.startsWith('http') || link.href === '#' ? '_blank' : undefined}
                    rel={link.href.startsWith('http') || link.href === '#' ? 'noopener noreferrer' : undefined}
                  >
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Legal */}
          <div>
            <h3 className="font-serif text-subheading mb-4">Legal</h3>
            <ul className="space-y-2">
              {legalLinks.map((link) => (
                <li key={link.href}>
                  <Link
                    to={link.href}
                    className="font-body text-small text-background/80 hover:text-background transition-colors"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Separator */}
        <div className="border-t border-background/20 mb-8" />

        {/* Disclaimer */}
        <div className="space-y-4">
          <h4 className="font-serif text-body font-semibold">Important Notice</h4>
          <div className="font-body text-xs text-background/70 space-y-3 max-w-4xl">
            <p>
              The content provided on this website is for educational and informational purposes only. 
              Nothing contained herein constitutes investment advice, a recommendation, or a solicitation 
              to buy or sell any financial instruments. All opinions, analyses, and projections are 
              those of Minerva Investment Management Society (MIMS) and do not represent the views of 
              Università Bocconi.
            </p>
            <p>
              MIMS is an association promoted and run by students of Università Bocconi. Università 
              Bocconi does not endorse, approve, or assume responsibility for the activities, views, 
              or content produced by this association. The use of the University's name or affiliation 
              is solely to identify the academic context in which members of the association are enrolled.
            </p>
            <p>
              Past performance is not indicative of future results. Any investment decisions should be 
              made after consulting with a qualified financial professional.
            </p>
          </div>
        </div>

        {/* Copyright */}
        <div className="border-t border-background/20 mt-8 pt-8">
          <p className="font-body text-xs text-background/50">
            © {new Date().getFullYear()} Minerva Investment Management Society. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}
