import { Link } from 'react-router-dom';
import ScrollStack, { ScrollStackItem } from './ScrollStack';
import { Division, divisionLabels } from '@/lib/types';
import equityBgAsset from '@/assets/MIMS_Equity_Research.webp.asset.json';
import investmentBgAsset from '@/assets/mims-investment-research.webp.asset.json';
import macroBgAsset from '@/assets/MIMS_Macro_Research.webp.asset.json';
import portfolioBgAsset from '@/assets/MIMS_Portfolio_Management.webp.asset.json';
import quantBgAsset from '@/assets/mims-quant-research.webp.asset.json';

interface DivisionCard {
  division: Division;
  background: string;
  description: string;
}

const cards: DivisionCard[] = [
  {
    division: 'equity',
    background: equityBgAsset.url,
    description:
      'Equity Research covers listed companies through fundamental analysis. The team studies business models, industry dynamics and financial statements, builds valuation models, and publishes clear investment theses with key catalysts and risks.',
  },
  {
    division: 'investment',
    background: investmentBgAsset.url,
    description:
      'Investment Research provides cross-asset market views. The team analyses macro conditions and valuations across equities, fixed income, FX and commodities, and publishes outlooks and trade ideas to guide portfolio positioning and risk-taking.',
  },
  {
    division: 'macro',
    background: macroBgAsset.url,
    description:
      'Macro Research analyses global growth, inflation and policy. The team develops scenarios on central banks, fiscal policy and structural trends, and explains how these drivers affect markets, asset prices and portfolio risks.',
  },
  {
    division: 'portfolio',
    background: portfolioBgAsset.url,
    description:
      "Portfolio Management runs MIMS' student-managed portfolios. The team turns research into allocations, sizes positions, monitors exposures and performance, and documents rebalancing decisions through due diligence and transparent reporting.",
  },
  {
    division: 'quant',
    background: quantBgAsset.url,
    description:
      'Quantitative Research builds data-driven models and tools. The team applies statistics, machine learning and derivatives modelling to support forecasting, portfolio construction and risk measurement, publishing technical research and practical frameworks.',
  },
];

const DivisionScrollStack = () => {
  return (
    <ScrollStack title="Our Divisions">
      {cards.map(({ division, background, description }) => (
        <ScrollStackItem key={division}>
          <article className="relative h-full w-full">
            <img
              src={background}
              alt={`${divisionLabels[division]} background`}
              className="absolute inset-0 h-full w-full object-cover"
              loading="lazy"
            />
            {/* THE SHADE IS DRAWN FOR THE SHAPE IT SITS ON, and the two
                shapes are different. A wide card puts the title and the
                description in the top-left corner, so the shade runs on the
                diagonal; a phone's card is a portrait with the text across
                its whole upper half, so the shade runs top to bottom and
                keeps far more density where the words are. Both are a good
                deal darker than they were: at these text sizes over a
                photograph, legibility is worth more than the last of the
                image. */}
            <div
              aria-hidden="true"
              className="absolute inset-0 md:hidden"
              style={{
                background:
                  'linear-gradient(168deg, rgba(0,0,0,0.94) 0%, rgba(0,0,0,0.86) 32%, rgba(0,0,0,0.62) 58%, rgba(0,0,0,0.34) 80%, rgba(0,0,0,0.2) 100%)',
              }}
            />
            <div
              aria-hidden="true"
              className="absolute inset-0 hidden md:block"
              style={{
                background:
                  'linear-gradient(135deg, rgba(0,0,0,0.94) 0%, rgba(0,0,0,0.82) 35%, rgba(0,0,0,0.54) 65%, rgba(0,0,0,0.24) 88%, rgba(0,0,0,0.06) 100%)',
              }}
            />
            <div className="relative z-10 flex h-full flex-col justify-between p-6 pr-10 md:p-14 md:pr-14">
              <div className="max-w-xl">
                <h3 className="font-serif text-2xl sm:text-3xl md:text-5xl text-white mb-3 md:mb-6 drop-shadow-[0_2px_8px_rgba(0,0,0,0.6)]">
                  {divisionLabels[division]}
                </h3>
                <p className="font-body text-body md:text-body-lg text-white/90 leading-relaxed max-w-lg drop-shadow-[0_2px_8px_rgba(0,0,0,0.5)]">
                  {description}
                </p>
              </div>
              <div className="flex justify-end">
                <Link
                  to={`/divisions/${division}`}
                  className="inline-block bg-background text-foreground font-serif text-base md:text-lg px-6 py-3 md:px-10 md:py-4 hover:opacity-90 transition-opacity"
                >
                  Visit Division
                </Link>
              </div>
            </div>

          </article>
        </ScrollStackItem>
      ))}
    </ScrollStack>
  );
};

export default DivisionScrollStack;
