import { Link } from 'react-router-dom';
import { Division, divisionLabels } from '@/lib/types';

interface DivisionCardProps {
  division: Division;
  description: string;
}

export function DivisionCard({ division, description }: DivisionCardProps) {
  return (
    <article className="py-6 border-b border-separator last:border-b-0">
      <Link to={`/divisions/${division}`} className="group block">
        <h3 className="font-serif text-subheading group-hover:text-primary transition-colors mb-2">
          {divisionLabels[division]}
        </h3>
        <p className="font-body text-body text-muted-foreground mb-3">
          {description}
        </p>
        <span className="font-body text-small text-primary">
          View division
        </span>
      </Link>
    </article>
  );
}
