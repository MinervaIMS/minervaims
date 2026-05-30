import { Link } from 'react-router-dom';
import { User, Instagram, ArrowUpRight } from 'lucide-react';
import footerLogo from '@/assets/footer-logo.svg';
import linkedinIcon from '@/assets/linkedin-icon-small.png';

const exploreLinks = [
  { label: 'Join Us', href: '/join', external: false },
  { label: 'Archive', href: '/archive', external: false },
  { label: 'Site Map', href: '/sitemap', external: false },
];

const contactLinks = [
  { label: 'as.minerva@unibocconi.it', href: 'mailto:as.minerva@unibocconi.it', external: true },
];

const socialLinks = [
  { label: 'LinkedIn', href: 'https://www.linkedin.com/company/minerva-investment-management/', icon: 'linkedin' },
  { label: 'Instagram', href: 'https://www.instagram.com/minerva.ims/', icon: 'instagram' },
];

const legalLinks = [
  { label: 'Terms of Use', href: '/terms-of-use', external: false },
  { label: 'Privacy Policy', href: '/privacy-policy', external: false },
  { label: 'Cookie Policy', href: '/cookie-policy', external: false },
];

const LinkWithArrow = ({ children }: { children: React.ReactNode }) => (
  <span className="inline-flex items-center gap-1.5">
    {children}
    <ArrowUpRight size={14} className="opacity-60" />
  </span>
);

export function Footer() {
  return (
    <footer className="bg-foreground text-background">
      <div className="container py-10 px-6 sm:py-12 md:py-16 md:px-8">
        {/* Main Footer Content - Responsive Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-6 sm:gap-8 md:gap-6 lg:gap-8 mb-8">
          {/* Column 1: Logo - Full width on mobile, spans 2 cols on sm */}
          <div className="col-span-2 sm:col-span-2 md:col-span-1 lg:col-span-1 flex items-start justify-center md:justify-start mb-4 sm:mb-6 md:mb-0">
            <Link to="/" aria-label="MIMS Home">
              <img 
                src={footerLogo} 
                alt="Minerva Investment Management Society" 
                width={160}
                height={160}
                className="h-28 sm:h-32 md:h-36 lg:h-40 w-auto"
                loading="lazy"
                decoding="async"
              />
            </Link>
          </div>

          {/* Column 2: Explore */}
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

          {/* Column 3: Contact */}
          <div>
            <h3 className="font-serif text-subheading mb-4 uppercase tracking-wide">Contact</h3>
            <ul className="space-y-2">
              {contactLinks.map((link) => (
                <li key={link.label}>
                  <a
                    href={link.href}
                    className="font-body text-small text-background/80 hover:text-background hover:underline hover:decoration-accent transition-colors break-all"
                  >
                    <LinkWithArrow>{link.label}</LinkWithArrow>
                  </a>
                </li>
              ))}
            </ul>
            {/* Social Icons */}
            <div className="flex items-center gap-4 mt-4">
              {socialLinks.map((social) => (
                <a
                  key={social.label}
                  href={social.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={social.label}
                  className="text-background/80 hover:text-background transition-colors"
                >
                  {social.icon === 'linkedin' ? (
                    <img 
                      src={linkedinIcon} 
                      alt="LinkedIn" 
                      width={36}
                      height={36}
                      className="h-9 w-9 opacity-80 hover:opacity-100 transition-opacity"
                      loading="lazy"
                      decoding="async"
                    />
                  ) : (
                    <Instagram size={36} />
                  )}
                </a>
              ))}
            </div>
          </div>

          {/* Column 4: Members */}
          <div>
            <h3 className="font-serif text-subheading mb-4 uppercase tracking-wide">Members</h3>
            <Link
              to="/admin"
              className="inline-flex items-center gap-2 bg-background text-foreground px-4 py-2 rounded text-small hover:bg-background/90 transition-colors mb-2"
            >
              <User size={16} />
              <span style={{ fontFamily: '"Times New Roman", Times, serif' }} className="uppercase">Login</span>
            </Link>
            <p className="font-body text-body text-background/80 leading-[1.6] mt-3 italic">
              For approved society<br />members only.
            </p>
          </div>

          {/* Column 5: Legal */}
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
        <div className="border-t border-background/20 mb-4 sm:mb-6" />

        {/* Disclaimer - Full Width */}
        <div className="mb-6 sm:mb-8 py-3 sm:py-4">
          <h4 className="font-serif text-body-lg font-semibold text-background/80 mb-3 uppercase tracking-wide">
            Disclaimer
          </h4>
          <div className="font-body text-small md:text-body text-background/80 leading-[1.6] space-y-4 text-justify">
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

        {/* Builder Credit and Copyright */}
        <div className="border-t border-background/20 pt-4 sm:pt-6 flex flex-col items-center gap-2 sm:gap-3 text-center px-2 sm:px-4">
          <a
            href="https://www.linkedin.com/in/riccardo-colombo01/"
            target="_blank"
            rel="noopener noreferrer"
            className="font-body text-xs md:text-small text-background/80 underline hover:text-background transition-colors"
          >
            Website built by Riccardo Colombo for Minerva IMS.
          </a>
          <p className="font-body text-xs md:text-small text-background/60 leading-[1.4]">
            © {new Date().getFullYear()} Minerva Investment Management Society (MIMS). All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}
