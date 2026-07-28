import { DIVISIONS } from './content';
import { DivisionRow } from './DivisionRow';

// =====================================================================
// 02 · The Divisions
//
// One orienting line, then five full-width rows. Five, not seven: these
// are the divisions a candidate can apply to. Media and Communication and
// Operations are described on /about, which is the right place for them.
// =====================================================================

interface Props {
  still: boolean;
}

export function DivisionsBlock({ still }: Props) {
  return (
    <section aria-labelledby="join-divisions">
      <div className="container pt-20 md:pt-28 pb-12 md:pb-16">
        <div
          className="join-reveal flex items-baseline gap-5 pb-5"
          style={{ borderBottom: '1px solid var(--join-hairline)' }}
        >
          <span className="join-label">02</span>
          <h2 id="join-divisions" className="font-serif text-heading" style={{ color: 'var(--join-ink)' }}>
            The Divisions
          </h2>
        </div>
        <p
          className="join-reveal font-body text-body-lg leading-relaxed mt-8 max-w-3xl"
          style={{ color: 'var(--join-body)' }}
        >
          You express a first-choice and a second-choice division in the application form. Your first choice
          determines your written question.
        </p>
      </div>

      {DIVISIONS.map((division, i) => (
        <DivisionRow key={division.key} division={division} still={still} index={i} />
      ))}
    </section>
  );
}

export default DivisionsBlock;
