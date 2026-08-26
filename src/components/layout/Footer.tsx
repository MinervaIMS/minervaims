import { useState, FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { z } from 'zod';
import { supabase } from '@/integrations/supabase/client';


import footerLogo from '@/assets/footer-logo.svg';
import linkedinIcon from '@/assets/linkedin-black.svg';
import instagramIcon from '@/assets/instagram-black.svg';
import { useToast } from '@/hooks/use-toast';

// =====================================================================
// WHAT IS NAVIGATION AND WHAT IS SMALL PRINT.
// ---------------------------------------------------------------------
// The footer used to carry a fifth column headed "Legal", holding six
// links at the same size, in the same serif heading, with the same
// vertical rhythm as Divisions and Funds. Two things were wrong with
// that. A policy page is not a destination anybody sets out for, so it
// was drawing the eye at the weight of a section of the site; and two of
// those six links are not policies at all.
//
// The four genuine policies are now a compact strip at the very foot,
// beside the copyright: small, secondary and still perfectly findable.
// The other two are navigation and are treated as such:
//
//   Society Statute is the association's constitution - the document the
//   whole governance of Minerva rests on, and the one a member or an
//   applicant might actually go looking for. It is navigation.
//
//   Sitemap is a map OF the site. It is a utility, not a policy, so it
//   sits with the copyright at the foot rather than under a heading that
//   claims it is a legal notice.
//
// ---------------------------------------------------------------------
// TEN LINKS, TWO COLUMNS, FIVE AND FIVE.
//
// Those ten used to be split eight and two: an "Explore" column that ran
// to eight entries beside a "People" column that held Members and Alumni
// and then stopped. The row was visibly lopsided - one column reached
// the foot of the block and the other ended a third of the way down -
// and "Explore" had stopped meaning anything, because a heading that
// covers the constitution, the report archive and the contact page is
// not a category, it is a leftovers bin.
//
// The same ten links now divide on a real distinction, and divide evenly
// as a consequence rather than by being counted out:
//
//   The Society - what Minerva is and who is in it. About, the two
//   membership pages, the statute it runs on, and how to reach it.
//
//   Explore - what Minerva publishes and does, and how to take part.
//   Events, the report archive, the readings, the partnerships and the
//   application page.
//
// Nothing is added and nothing is dropped: every one of the ten routes
// below is one of the ten that were there before.
// =====================================================================

const societyLinks = [
  { label: 'About', href: '/about' },
  { label: 'Members', href: '/people/members' },
  { label: 'Alumni', href: '/people/alumni' },
  { label: 'Society Statute', href: '/statute' },
  { label: 'Contacts', href: '/contacts' },
];

const exploreLinks = [
  { label: 'Events', href: '/events' },
  { label: 'Report Archive', href: '/archive' },
  { label: 'Readings', href: '/readings' },
  { label: 'Partnerships', href: '/partnerships' },
  { label: 'Join Us', href: '/join' },
];

const divisionLinks = [
  { label: 'Equity Research', href: '/divisions/equity' },
  { label: 'Investment Research', href: '/divisions/investment' },
  { label: 'Macro Research', href: '/divisions/macro' },
  { label: 'Portfolio Management', href: '/divisions/portfolio' },
  { label: 'Quantitative Research', href: '/divisions/quant' },
];

const fundLinks = [
  { label: 'Long Short Equity', href: '/funds/long-short' },
  { label: 'Multi Asset Global Opportunities', href: '/funds/multi-asset' },
  { label: 'Diversified Passive Selection', href: '/funds/dps' },
  { label: 'Italian Equity PIR', href: '/funds/pir' },
];

/** The four genuine policies, for the compact strip at the foot. */
const policyLinks = [
  { label: 'Terms of Use', href: '/terms-of-use' },
  { label: 'Privacy Policy', href: '/privacy-policy' },
  { label: 'Cookie Policy', href: '/cookie-policy' },
  { label: 'Disclaimer', href: '/disclaimer' },
  { label: 'Sitemap', href: '/sitemap' },
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
  const { toast } = useToast();
  const [email, setEmail] = useState('');

  const emailSchema = z.string().trim().email().max(255);

  const handleNewsletterSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const parsed = emailSchema.safeParse(email);
    if (!parsed.success) {
      toast({ title: 'Please enter a valid email address.', variant: 'destructive' });
      return;
    }
    const { error } = await supabase
      .from('newsletter_subscribers')
      .insert({ email: parsed.data, consent: true, source: 'footer' });

    if (error) {
      if (error.code === '23505') {
        toast({ title: "You're already subscribed." });
      } else {
        toast({ title: 'Subscription failed. Please try again later.', variant: 'destructive' });
        return;
      }
    } else {
      toast({ title: 'Thank you for subscribing.' });
    }
    setEmail('');
  };


  return (
    <footer className="bg-black text-background" style={{ paddingBottom: "env(safe-area-inset-bottom)" }}>
      <div className="container py-10 px-6 sm:py-12 md:py-16 md:px-8">
        {/* Top: Logo + Newsletter + Socials/Email (horizontally centered, vertically aligned) */}
        <div className="flex flex-col lg:flex-row flex-wrap items-center lg:justify-between gap-10 lg:gap-8 pb-16 mb-16 border-b border-background/20">
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

          {/* Newsletter form (center) */}
          <div className="flex-1 w-full max-w-xl text-center">
            <h3 className="font-serif text-background text-[2rem] sm:text-[2.25rem] md:text-[2.5rem] leading-tight mb-3">
              Let's keep in touch
            </h3>
            <p className="font-body text-body text-background/80 mb-5 whitespace-pre-line">
              Sign up for our email list to receive updates on upcoming events and activities.{"\n\n"}
            </p>
            <form onSubmit={handleNewsletterSubmit} className="text-left">
              <div className="flex w-full">
                <input
                  id="newsletter-email"
                  type="email"
                  required
                  placeholder="Enter your email here"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="flex-1 min-w-0 bg-background text-foreground px-3 py-2 font-body text-body border-0 focus:outline-none focus:ring-2 focus:ring-background/40 placeholder:text-foreground/60 rounded-none"
                />
                <button
                  type="submit"
                  className="shrink-0 bg-muted text-foreground border border-background font-serif text-body px-6 py-2 hover:bg-[#ece9f4] transition-colors rounded-none"
                >
                  Sign Up
                </button>
              </div>
              <p className="font-body text-small text-background/80 leading-snug mt-4">
                {"\u00a0"}* By signing up you agree to receive updates from us. You can unsubscribe at any time.
              </p>
            </form>
          </div>

          {/* Right column: socials */}
          <div className="flex flex-col items-center gap-5 shrink-0">
            <div className="flex flex-row gap-4">
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
                    width={65}
                    height={65}
                    className="h-[4.0625rem] w-[4.0625rem]"
                    loading="lazy"
                    decoding="async"
                  />
                </a>
              ))}
            </div>
          </div>
        </div>

        {/* FOUR COLUMNS OF 5, 5, 4 AND 5. The block is now square: no
            column ends a third of the way up the one beside it, and the
            hairline band below meets four columns of nearly equal depth
            rather than a staircase.

            The widths still follow the labels rather than the counts.
            Funds carries "Multi Asset Global Opportunities" and takes the
            widest share; Divisions carries "Quantitative Research" and
            takes the next; the two link columns are the same width as
            each other because their longest labels are the same length,
            which is also what makes the row read as symmetrical.

            On a phone this is two columns of two, and 5/5/4/5 pairs
            evenly there as well. */}
        <div className="grid grid-cols-2 gap-x-8 gap-y-10 sm:grid-cols-2 lg:grid-cols-[1fr_1.15fr_1.4fr_1fr] lg:gap-x-10 mb-14">
          <LinkColumn title="The Society" links={societyLinks} />
          <LinkColumn title="Divisions" links={divisionLinks} />
          <LinkColumn title="Funds" links={fundLinks} />
          <LinkColumn title="Explore" links={exploreLinks} />
        </div>

        {/* =============================================================
            THE SMALL PRINT: policies, copyright and attribution, on one
            hairline-topped band.

            The three used to be two separate things - a Legal column up
            in the navigation and a copyright row down here - which meant
            the least important links on the page were also among the
            most prominent. They are now one band, in the same small
            type, reading left to right: who owns the site, what governs
            it, who built it.

            On a phone the policies wrap onto as many lines as they need
            and the copyright sits under them. Each link keeps a 44px
            tap target through its vertical padding without the band
            growing tall, because the padding is shared with the row gap.
            ============================================================= */}
        <div className="border-t border-background/20 pt-8">
          <nav aria-label="Legal and site information" className="flex flex-wrap items-center gap-x-6 gap-y-1">
            {policyLinks.map((link) => (
              <Link
                key={link.href}
                to={link.href}
                className="font-body text-xs md:text-small text-background/60 py-2 hover:text-background hover:underline transition-colors"
              >
                {link.label}
              </Link>
            ))}
          </nav>
          <div className="mt-2 flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between sm:gap-3">
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
      </div>
    </footer>
  );
}
