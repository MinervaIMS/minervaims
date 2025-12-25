import { Link } from 'react-router-dom';
import logoWhite from '@/assets/logo-white.png';

const exploreLinks = [
  { label: 'Join Us', href: '/join' },
  { label: 'Archive', href: '/archive' },
  { label: 'Site Map', href: '/sitemap' },
];

const connectLinks = [
  { label: 'Mail', href: 'mailto:as.minerva@unibocconi.it' },
  { label: 'LinkedIn', href: 'https://www.linkedin.com/company/minerva-investment-management-society/', external: true },
  { label: 'Instagram', href: 'https://www.instagram.com/mims_bocconi/', external: true },
];

const legalLinks = [
  { label: 'Terms of Use', href: '/terms-of-use' },
  { label: 'Privacy Policy', href: '/privacy-policy' },
  { label: 'Cookie Policy', href: '/cookie-policy' },
];

export function Footer() {
  return (
    <footer className="bg-foreground text-background">
      <div className="container py-12 md:py-16">
        {/* Main Footer Content - Logo + 3 Columns */}
        <div className="grid grid-cols-1 md:grid-cols-[200px_80px_80px_80px] gap-8 md:gap-12 mb-8">
          {/* Logo */}
          <div className="flex items-start">
            <Link to="/" aria-label="MIMS Home">
              <img 
                src={logoWhite} 
                alt="Minerva Investment Management Society" 
                className="h-20 md:h-24 w-auto"
              />
            </Link>
          </div>

          {/* Explore */}
          <div>
            <h3 className="font-serif text-subheading mb-4 uppercase tracking-wide">Explore</h3>
            <ul className="space-y-2">
              {exploreLinks.map((link) => (
                <li key={link.href}>
                  <Link
                    to={link.href}
                    className="font-body text-small text-background/80 hover:text-background hover:underline hover:decoration-accent transition-colors"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Connect */}
          <div>
            <h3 className="font-serif text-subheading mb-4 uppercase tracking-wide">Connect</h3>
            <ul className="space-y-2">
              {connectLinks.map((link) => (
                <li key={link.label}>
                  <a
                    href={link.href}
                    className="font-body text-small text-background/80 hover:text-background hover:underline hover:decoration-accent transition-colors"
                    target={link.external ? '_blank' : undefined}
                    rel={link.external ? 'noopener noreferrer' : undefined}
                  >
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Legal */}
          <div>
            <h3 className="font-serif text-subheading mb-4 uppercase tracking-wide">Legal</h3>
            <ul className="space-y-2">
              {legalLinks.map((link) => (
                <li key={link.href}>
                  <Link
                    to={link.href}
                    className="font-body text-small text-background/80 hover:text-background hover:underline hover:decoration-accent transition-colors"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Separator */}
        <div className="border-t border-background/20 mb-6" />

        {/* Disclaimer - Full Width */}
        <div className="mb-8 py-4">
          <h4 className="font-serif text-[15px] font-semibold text-[#D6D6D6] mb-3 uppercase tracking-wide">
            Disclaimer
          </h4>
          <div className="font-body text-[14px] md:text-[14px] text-[#D6D6D6] leading-[1.6] space-y-4">
            <p>
              Minerva Investment Management Society (MIMS) is a student society promoted and managed by Bocconi University's students. 
              This website and any documents made available through it (including reports, presentations, virtual portfolio materials 
              and event content) are provided solely for educational and academic purposes. They do not constitute investment advice, 
              investment research, a personal recommendation, or an offer or solicitation to buy or sell any security or financial 
              instrument, or to adopt any investment strategy. Any references to issuers, securities, asset classes, indices, markets, 
              or strategies are for illustrative purposes only and may relate to simulated or virtual portfolios; they must not be 
              relied upon for real-world investment decisions.
            </p>
            <p>
              Information is provided 'as is' and may be incomplete, outdated, or inaccurate. Opinions are those of the authors at 
              the time of publication and may change without notice. You are solely responsible for any use of the information and 
              should obtain independent advice from a qualified professional before making any investment decision. Past performance, 
              back-tested, or simulated results are not indicative of future results. Investing involves risk, including the possible 
              loss of capital.
            </p>
            <p>
              MIMS is independent from Università Bocconi. Bocconi University does not review, approve, endorse, or monitor this 
              website or its contents and is not responsible for any content, activities, or outcomes connected to it. Use of this 
              website is at your own risk.
            </p>
          </div>
        </div>

        {/* Copyright */}
        <div className="border-t border-background/20 pt-6">
          <p className="font-body text-[13px] text-[#9A9A9A] leading-[1.4]">
            © {new Date().getFullYear()} Minerva Investment Management Society (MIMS). All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}
