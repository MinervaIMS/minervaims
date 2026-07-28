import { Link } from 'react-router-dom';
import { ALUMNI_GROUPS } from './content';

// =====================================================================
// 03 · Alumni
//
// A composed static wall rather than a marquee: an applicant scanning
// this section is looking for specific names, and a moving row makes that
// work. Grouped with hairline separators so the wall states four facts
// (banking, buy side, consulting and institutions, graduate study)
// instead of listing twenty logos.
//
// Every mark is normalised to one monochrome light treatment with a CSS
// filter, which works whatever colours each source SVG carries, and every
// logo is boxed to the same optical height. No brand colour, no
// testimonials, no headshots.
// =====================================================================

export function AlumniWall() {
  return (
    <section aria-labelledby="join-alumni" className="container py-20 md:py-28">
      <div
        className="join-reveal flex items-baseline gap-5 pb-5"
        style={{ borderBottom: '1px solid var(--join-hairline)' }}
      >
        <span className="join-label">03</span>
        <h2 id="join-alumni" className="font-serif text-heading" style={{ color: 'var(--join-ink)' }}>
          Alumni
        </h2>
      </div>

      <div className="mt-12 md:mt-16">
        {ALUMNI_GROUPS.map((group, gi) => (
          <div
            key={group.title}
            className="join-reveal py-9 md:py-12"
            data-reveal-delay={gi * 110}
            style={{ borderTop: gi === 0 ? 'none' : '1px solid var(--join-hairline)' }}
          >
            <h3 className="join-label mb-8">{group.title}</h3>
            <ul className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-x-8 gap-y-10 list-none p-0 m-0">
              {group.logos.map((logo) => (
                <li key={logo.file} className="join-logo-item flex items-center justify-center">
                  <img
                    src={`/logos/${logo.file}`}
                    alt={logo.name}
                    loading="lazy"
                    decoding="async"
                    width={160}
                    height={44}
                    className="join-logo max-h-11 w-auto max-w-[9.5rem] object-contain"
                  />
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      <div className="join-reveal mt-12 md:mt-14">
        <Link to="/people/alumni" className="join-link">
          Discover Alumni Network <span aria-hidden>&rarr;</span>
        </Link>
      </div>
    </section>
  );
}

export default AlumniWall;
