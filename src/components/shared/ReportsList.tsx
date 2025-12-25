import { Link } from 'react-router-dom';
import { Report } from '@/lib/types';

interface ReportsListProps {
  reports: Report[];
  showDivision?: boolean;
}

export function ReportsList({ reports, showDivision = false }: ReportsListProps) {
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  };

  if (reports.length === 0) {
    return (
      <p className="font-body text-muted-foreground py-8">
        No reports available at this time.
      </p>
    );
  }

  return (
    <div className="space-y-0">
      {reports.map((report, index) => (
        <article
          key={report.id}
          className={`py-6 ${index !== reports.length - 1 ? 'border-b border-separator' : ''}`}
        >
          <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-2 md:gap-4">
            <div className="flex-1">
              <time className="font-body text-xs text-muted-foreground uppercase tracking-wider">
                {formatDate(report.date)}
                {showDivision && report.division && (
                  <span className="ml-4 text-primary">
                    {report.division.charAt(0).toUpperCase() + report.division.slice(1)} Research
                  </span>
                )}
              </time>
              <h3 className="font-serif text-subheading mt-2 mb-2">
                {report.title}
              </h3>
              <p className="font-body text-body text-muted-foreground">
                {report.description}
              </p>
            </div>
            <div className="mt-2 md:mt-6">
              <Link
                to={report.pdfUrl}
                className="page-link text-small text-primary"
              >
                Download PDF
              </Link>
            </div>
          </div>
        </article>
      ))}
    </div>
  );
}
