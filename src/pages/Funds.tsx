import { Link } from 'react-router-dom';
import { PageIntroduction, FundCard } from '@/components/shared';

const Funds = () => {
  return (
    <>
      <PageIntroduction
        title="Our Funds"
        description="We manage simulated investment portfolios with defined mandates and risk parameters."
      />

      <div className="container py-section-sm md:py-section">
        <div className="max-w-3xl">
          <FundCard
            fund="long-short"
            description="European equity long/short strategy targeting absolute returns with controlled volatility."
          />
          <FundCard
            fund="multi-asset"
            description="Global multi-asset strategy with tactical allocation across equities, fixed income, and alternatives."
          />
        </div>
      </div>
    </>
  );
};

export default Funds;
