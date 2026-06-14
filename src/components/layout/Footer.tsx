import { Link } from 'react-router-dom';
import { ArrowUpRight } from 'lucide-react';

import footerLogo from '@/assets/footer-logo.svg';
import linkedinIcon from '@/assets/linkedin-black.svg';
import instagramIcon from '@/assets/instagram-black.svg';

const exploreLinks = [
  { label: 'About', href: '/about' },
  { label: 'Events', href: '/events' },
  { label: 'Join Us', href: '/join' },
  { label: 'Reports', href: '/archive' },
  { label: 'Readings', href: '/readings' },
];

const divisionLinks = [
  { label: 'Equity Research', href: '/divisions/equity' },
  { label: 'Investment Research', href: '/divisions/investment' },
  { label: 'Macro Research', href: '/divisions/macro' },
  { label: 'Portfolio Management', href: '/divisions/portfolio' },
  { label: 'Quantitative Research', href: '/divisions/quant' },
];

const fundLinks = [
  { label: 'Long Short Equity Fund', href: '/funds/long-short' },
  { label: 'Multi Asset Global Opportunities Fund', href: '/funds/multi-asset' },
];

const peopleLinks = [
  { label: 'Members', href: '/people/members' },
  { label: 'Alumni', href: '/people/alumni' },
];

const legalLinks = [
  { label: 'Terms of Use', href: '/terms-of-use' },
  { label: 'Privacy Policy', href: '/privacy-policy' },
  { label: 'Cookie Policy', href: '/cookie-policy' },
  { label: 'Disclaimer', href: '/disclaimer' },
  { label: 'Society Statute', href: '/statute' },
];

const socialLinks = [
  { label: 'LinkedIn', href: 'https://www.linkedin.com/company/minerva-investment-management/', icon: linkedinIcon },
  { label: 'Instagram', href: 'https://www.instagram.com/minerva.ims/', icon: instagramIcon },
];

const linkClass =
  'font-body text-body text-background/80 hover:text-background hover:underline hover:decoration-background transition-colors';

const columnHeadingClass =
  'font-serif text-heading mb-5 text-background';

function LinkColumn({
  title,
  links,
}: {
  title: string;
  links: { label: string; href: string }[];
}) {
  return (
    <div>
      <h3 className={columnHeadingClass}>{title}</h3>
      <ul className="space-y-3">
        {links.map((link) => (
          <li key={link.href}>
            <Link to={link.href} className={linkClass}>
              {link.label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function Footer() {
  return (
    <footer className="bg-black text-background" style={{ paddingBottom: "env(safe-area-inset-bottom)" }}>
      <div className="container py-10 px-6 sm:py-12 md:py-16 md:px-8">
        {/* Top: Logo + Socials + Contact (horizontally centered, vertically aligned) */}
        <div className="flex flex-col lg:flex-row flex-wrap items-center lg:justify-between gap-10 lg:gap-8 pb-10 mb-10 border-b border-background/20">
          <button
            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
            aria-label="Back to top"
            className="shrink-0 bg-transparent border-0 p-0 cursor-pointer"
          >
            <img
              src={footerLogo}
              alt="Minerva Investment Management Society"
              width={200}
              height={200}
              className="h-36 sm:h-40 md:h-44 lg:h-48 w-auto"
              loading="lazy"
              decoding="async"
            />
          </button>

          <div className="text-center md:text-left">
            <p className="font-body text-body text-background/80 mb-5 leading-relaxed">
              For partnerships, joining information, or general enquiries:
            </p>
            <a
              href="mailto:as.minerva@unibocconi.it"
              className="font-serif text-background hover:underline hover:decoration-background transition-colors inline-flex items-center gap-2 text-[1.75rem] sm:text-[2rem] md:text-[2.25rem] leading-tight whitespace-nowrap"
            >
              <span>as.minerva@unibocconi.it</span>
              <ArrowUpRight className="shrink-0 h-7 w-7 sm:h-8 sm:w-8 md:h-9 md:w-9 text-background/70" strokeWidth={1.5} />
            </a>
          </div>

          <div className="flex flex-row gap-4 shrink-0">
            {socialLinks.map((social) => (
              <a
                key={social.label}
                href={social.href}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={social.label}
                className="inline-flex items-center hover:opacity-80 transition-opacity"
              >
                <img
                  src={social.icon}
                  alt=""
                  width={54}
                  height={54}
                  className="h-[3.375rem] w-[3.375rem]"
                  loading="lazy"
                  decoding="async"
                />
              </a>
            ))}
          </div>
        </div>

        {/* Bottom: 5 link columns */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-8 mb-10">
          <LinkColumn title="Explore" links={exploreLinks} />
          <LinkColumn title="Divisions" links={divisionLinks} />
          <LinkColumn title="Funds" links={fundLinks} />

          <LinkColumn title="People" links={peopleLinks} />

          <LinkColumn title="Legal" links={legalLinks} />
        </div>

        {/* Builder Credit and Copyright */}
        <div className="border-t border-background/20 pt-4 sm:pt-6 flex flex-col sm:flex-row items-center justify-between gap-2 sm:gap-3 px-2 sm:px-4">
          <p className="font-body text-xs md:text-small text-background/60 leading-[1.4]">
            © {new Date().getFullYear()} Minerva Investment Management Society (MIMS). All rights reserved.
          </p>
          <a
            href="https://www.linkedin.com/in/riccardo-colombo01/"
            target="_blank"
            rel="noopener noreferrer"
            className="font-body text-xs md:text-small text-background/60 underline hover:text-background transition-colors"
          >
            Website built for Minerva IMS.
          </a>
        </div>
      </div>
    </footer>
  );
}
