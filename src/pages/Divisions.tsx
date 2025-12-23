import { Link } from 'react-router-dom';
import { PageIntroduction, DivisionCard } from '@/components/shared';
import { Division } from '@/lib/types';

const divisionDescriptions: Record<Division, string> = {
  equity: 'Fundamental analysis of public equities across sectors and geographies, producing initiations of coverage and sector reports.',
  investment: 'Analysis of private market opportunities, M&A transactions, and alternative investments.',
  macro: 'Macroeconomic analysis covering monetary policy, inflation dynamics, and global growth.',
  portfolio: 'Management of simulated investment portfolios with defined risk parameters and investment mandates.',
  quant: 'Quantitative research on factor strategies, systematic investing, and machine learning applications.',
};

const Divisions = () => {
  return (
    <>
      <PageIntroduction
        title="Divisions"
        description="Our research is organised across five specialised divisions."
      />

      <div className="container py-section-sm md:py-section">
        <div className="max-w-3xl">
          {(Object.keys(divisionDescriptions) as Division[]).map((division) => (
            <DivisionCard
              key={division}
              division={division}
              description={divisionDescriptions[division]}
            />
          ))}
        </div>
      </div>
    </>
  );
};

export default Divisions;
