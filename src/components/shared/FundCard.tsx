import { Link } from 'react-router-dom';
import { Fund, fundLabels } from '@/lib/types';

interface FundCardProps {
  fund: Fund;
  description: string;
}

export function FundCard({ fund, description }: FundCardProps) {
  return (
    <article className="py-6 border-b border-separator last:border-b-0">
      <Link to={`/funds/${fund}`} className="group block">
        <h3 className="font-serif text-subheading group-hover:text-primary transition-colors mb-2">
          {fundLabels[fund]}
        </h3>
        <p className="font-body text-body text-muted-foreground mb-3">
          {description}
        </p>
        <span className="font-body text-small text-primary">
          View fund
        </span>
      </Link>
    </article>
  );
}
