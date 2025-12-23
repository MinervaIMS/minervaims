import { Link } from 'react-router-dom';
import { useCookieConsent } from '@/components/cookies';
const exploreLinks = [{
  label: 'Join Us',
  href: '/join'
}, {
  label: 'Archive',
  href: '/archive'
}, {
  label: 'Site Map',
  href: '/sitemap'
}];
const connectLinks = [{
  label: 'Mail',
  href: 'mailto:as.minerva@unibocconi.it'
}, {
  label: 'LinkedIn',
  href: 'https://www.linkedin.com/company/minerva-investment-management-society/',
  external: true
}, {
  label: 'Instagram',
  href: 'https://www.instagram.com/mims_bocconi/',
  external: true
}];
const legalLinks = [{
  label: 'Terms of Use',
  href: '/terms-of-use'
}, {
  label: 'Privacy Policy',
  href: '/privacy-policy'
}, {
  label: 'Cookie Policy',
  href: '/cookie-policy'
}];
export function Footer() {
  const {
    openPreferences
  } = useCookieConsent();
  return <footer className="bg-foreground text-background">
      <div className="container py-12 md:py-16">
        {/* Main Footer Content */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 md:gap-12 mb-12">
          {/* Explore */}
          <div>
            <h3 className="font-serif text-subheading mb-4 uppercase tracking-wide">Explore</h3>
            <ul className="space-y-2">
              {exploreLinks.map(link => <li key={link.href}>
                  <Link to={link.href} className="font-body text-small text-background/80 hover:text-background hover:underline hover:decoration-accent transition-colors">
                    {link.label}
                  </Link>
                </li>)}
            </ul>
          </div>

          {/* Connect */}
          <div>
            <h3 className="font-serif text-subheading mb-4 uppercase tracking-wide">Connect</h3>
            <ul className="space-y-2">
              {connectLinks.map(link => <li key={link.label}>
                  <a href={link.href} className="font-body text-small text-background/80 hover:text-background hover:underline hover:decoration-accent transition-colors" target={link.external ? '_blank' : undefined} rel={link.external ? 'noopener noreferrer' : undefined}>
                    {link.label}
                  </a>
                </li>)}
            </ul>
          </div>

          {/* Legal */}
          <div>
            <h3 className="font-serif text-subheading mb-4 uppercase tracking-wide">Legal</h3>
            <ul className="space-y-2">
              {legalLinks.map(link => <li key={link.href}>
                  <Link to={link.href} className="font-body text-small text-background/80 hover:text-background hover:underline hover:decoration-accent transition-colors">
                    {link.label}
                  </Link>
                </li>)}
              <li>
                <button onClick={openPreferences} className="font-body text-small text-background/80 hover:text-background hover:underline hover:decoration-accent transition-colors text-left">
                  Cookie Settings
                </button>
              </li>
            </ul>
          </div>
        </div>

        {/* Separator */}
        <div className="border-t border-background/20 mb-8" />

        {/* Disclaimer */}
        <div className="space-y-4 mb-8">
          <div className="font-body text-xs text-background/70 space-y-3 max-w-4xl">
            <p>DISCLAIMER</p>
            <p className="text-background/50 text-[10px]">
              All investments involve risk, including the possible loss of capital.
            </p>
          </div>
        </div>

        {/* Copyright */}
        <div className="border-t border-background/20 pt-6">
          <p className="font-body text-xs text-background/50">
            © {new Date().getFullYear()} Minerva Investment Management Society (MIMS). All rights reserved.
          </p>
        </div>
      </div>
    </footer>;
}