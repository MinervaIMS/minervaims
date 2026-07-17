import { useState, useMemo } from 'react';
import { Report, Division, Fund, divisionLabels, fundLabels, activeFunds, closedFunds } from '@/lib/types';
import { ReportsList } from './ReportsList';

interface ArchiveFiltersProps {
  reports: Report[];
}

export function ArchiveFilters({ reports }: ArchiveFiltersProps) {
  const [divisionFilter, setDivisionFilter] = useState<Division | 'all'>('all');
  const [fundFilter, setFundFilter] = useState<Fund | 'all'>('all');

  const filteredReports = useMemo(() => {
    return reports.filter(report => {
      if (divisionFilter !== 'all' && report.division !== divisionFilter) return false;
      if (divisionFilter === 'portfolio' && fundFilter !== 'all' && report.fund !== fundFilter) return false;
      return true;
    });
  }, [reports, divisionFilter, fundFilter]);

  // Sort by date descending
  const sortedReports = useMemo(() => {
    return [...filteredReports].sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
    );
  }, [filteredReports]);

  return (
    <div>
      {/* Filters follow the standard filter format: flat corners, body font,
          no labels above the fields. */}
      <div className="mb-8 pb-6 border-b border-separator">
        <div className="flex flex-col sm:flex-row gap-3">
          <select
            value={divisionFilter}
            onChange={(e) => {
              setDivisionFilter(e.target.value as Division | 'all');
              if (e.target.value !== 'portfolio') {
                setFundFilter('all');
              }
            }}
            className="font-body bg-background border border-separator px-3 h-10 min-w-[200px]"
          >
            <option value="all">All Divisions</option>
            {Object.entries(divisionLabels).map(([key, label]) => (
              <option key={key} value={key}>{label}</option>
            ))}
          </select>

          {divisionFilter === 'portfolio' && (
            <select
              value={fundFilter}
              onChange={(e) => setFundFilter(e.target.value as Fund | 'all')}
              className="font-body bg-background border border-separator px-3 h-10 min-w-[280px]"
            >
              <option value="all">All Funds</option>
              <optgroup label="Active Funds">
                {activeFunds.map((fund) => (
                  <option key={fund} value={fund}>{fundLabels[fund]}</option>
                ))}
              </optgroup>
              <optgroup label="Closed Funds">
                {closedFunds.map((fund) => (
                  <option key={fund} value={fund}>{fundLabels[fund]}</option>
                ))}
              </optgroup>
            </select>
          )}
        </div>
      </div>

      {/* Results count */}
      <p className="font-body text-small text-muted-foreground mb-6">
        Showing {sortedReports.length} {sortedReports.length === 1 ? 'report' : 'reports'}
      </p>

      {/* Reports list */}
      <ReportsList reports={sortedReports} showDivision={divisionFilter === 'all'} />
    </div>
  );
}
