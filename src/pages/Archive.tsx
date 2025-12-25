import { useState, useEffect, useMemo } from 'react';
import { PageIntroduction } from "@/components/shared";
import { supabase } from "@/integrations/supabase/client";
import { Division, Fund, divisionLabels, fundLabels, activeFunds, inactiveFunds } from "@/lib/types";
import { ArchiveFilesList } from "@/components/shared/ArchiveFilesList";
import archiveBg from "@/assets/archive-bg-3.png";

interface ArchiveFile {
  id: string;
  title: string;
  description: string | null;
  file_url: string;
  date: string;
  division: string;
  fund: string | null;
}

const Archive = () => {
  const [files, setFiles] = useState<ArchiveFile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [divisionFilter, setDivisionFilter] = useState<Division | 'all'>('all');
  const [fundFilter, setFundFilter] = useState<Fund | 'all'>('all');

  useEffect(() => {
    fetchFiles();
  }, []);

  const fetchFiles = async () => {
    try {
      const { data, error } = await supabase
        .from('archive_files')
        .select('*')
        .order('date', { ascending: false });

      if (error) throw error;
      setFiles(data || []);
    } catch (error) {
      console.error('Error fetching files:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const filteredFiles = useMemo(() => {
    return files.filter(file => {
      if (divisionFilter !== 'all' && file.division !== divisionFilter) return false;
      if (divisionFilter === 'portfolio' && fundFilter !== 'all' && file.fund !== fundFilter) return false;
      return true;
    });
  }, [files, divisionFilter, fundFilter]);

  return (
    <>
      {/* Hero section with background image */}
      <div className="relative">
        <div className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: `url(${archiveBg})` }} />
        <div className="relative z-10">
          <PageIntroduction
            title="Archive"
            description="Browse all research reports and publications."
            transparentBackground
          />
        </div>
      </div>

      {/* Content section */}
      <div className="bg-background">
        <div className="container py-section-sm md:py-section">
          {/* Filters */}
          <div className="mb-8 pb-6 border-b border-separator">
            <div className="flex flex-col sm:flex-row gap-4">
              <div>
                <label className="font-body text-xs text-muted-foreground uppercase tracking-wider block mb-2">
                  Division
                </label>
                <select
                  value={divisionFilter}
                  onChange={(e) => {
                    setDivisionFilter(e.target.value as Division | 'all');
                    if (e.target.value !== 'portfolio') {
                      setFundFilter('all');
                    }
                  }}
                  className="font-body text-small bg-background border border-separator px-3 py-2 min-w-[200px]"
                >
                  <option value="all">All Divisions</option>
                  {Object.entries(divisionLabels).map(([key, label]) => (
                    <option key={key} value={key}>{label}</option>
                  ))}
                </select>
              </div>

              {divisionFilter === 'portfolio' && (
                <div>
                  <label className="font-body text-xs text-muted-foreground uppercase tracking-wider block mb-2">
                    Fund
                  </label>
                  <select
                    value={fundFilter}
                    onChange={(e) => setFundFilter(e.target.value as Fund | 'all')}
                    className="font-body text-small bg-background border border-separator px-3 py-2 min-w-[280px]"
                  >
                    <option value="all">All Funds</option>
                    <optgroup label="Active Funds">
                      {activeFunds.map((fund) => (
                        <option key={fund} value={fund}>{fundLabels[fund]}</option>
                      ))}
                    </optgroup>
                    <optgroup label="Inactive Funds">
                      {inactiveFunds.map((fund) => (
                        <option key={fund} value={fund}>{fundLabels[fund]}</option>
                      ))}
                    </optgroup>
                  </select>
                </div>
              )}
            </div>
          </div>

          {/* Results count */}
          <p className="font-body text-small text-muted-foreground mb-6">
            Showing {filteredFiles.length} {filteredFiles.length === 1 ? 'report' : 'reports'}
          </p>

          {/* Files list */}
          {isLoading ? (
            <p className="font-body text-muted-foreground py-8">Loading reports...</p>
          ) : (
            <ArchiveFilesList files={filteredFiles} showDivision={divisionFilter === 'all'} />
          )}
        </div>
      </div>
    </>
  );
};

export default Archive;
