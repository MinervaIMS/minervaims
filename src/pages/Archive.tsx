import { useState, useEffect } from 'react';
import { PageIntroduction, ArchiveFilters } from "@/components/shared";
import { reports } from "@/lib/data";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { FileText, Download, Calendar } from "lucide-react";
import { divisionLabels, fundLabels, Division, Fund } from "@/lib/types";
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
  const [latestFiles, setLatestFiles] = useState<ArchiveFile[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchLatestFiles();
  }, []);

  const fetchLatestFiles = async () => {
    try {
      const { data, error } = await supabase
        .from('archive_files')
        .select('*')
        .order('date', { ascending: false })
        .limit(5);

      if (error) throw error;
      setLatestFiles(data || []);
    } catch (error) {
      console.error('Error fetching latest files:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  return (
    <>
      {/* Hero section with background image */}
      <div className="relative">
        {/* Background image layer */}
        <div className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: `url(${archiveBg})` }} />
        {/* Content */}
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
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Main content - Archive filters */}
            <div className="lg:col-span-2">
              <ArchiveFilters reports={reports} />
            </div>

            {/* Sidebar - Latest uploads preview */}
            <div className="lg:col-span-1">
              <div className="sticky top-24">
                <h3 className="font-serif text-xl font-medium mb-4">Latest Uploads</h3>
                {isLoading ? (
                  <p className="font-body text-muted-foreground text-sm">Loading...</p>
                ) : latestFiles.length === 0 ? (
                  <Card>
                    <CardContent className="py-6 text-center">
                      <FileText className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                      <p className="font-body text-sm text-muted-foreground">
                        No uploaded files yet
                      </p>
                    </CardContent>
                  </Card>
                ) : (
                  <div className="space-y-3">
                    {latestFiles.map((file) => (
                      <Card key={file.id} className="hover:shadow-md transition-shadow">
                        <CardContent className="p-4">
                          <div className="flex items-start gap-3">
                            <div className="flex-shrink-0 w-10 h-10 bg-destructive/10 rounded flex items-center justify-center">
                              <FileText className="h-5 w-5 text-destructive" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <h4 className="font-serif text-sm font-medium line-clamp-2 mb-1">
                                {file.title}
                              </h4>
                              <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
                                <Calendar className="h-3 w-3" />
                                <span>{formatDate(file.date)}</span>
                              </div>
                              <div className="flex flex-wrap gap-1">
                                <span className="font-body text-xs px-1.5 py-0.5 bg-muted rounded">
                                  {divisionLabels[file.division as Division]}
                                </span>
                                {file.fund && (
                                  <span className="font-body text-xs px-1.5 py-0.5 bg-primary/10 text-primary rounded">
                                    {fundLabels[file.fund as Fund]}
                                  </span>
                                )}
                              </div>
                            </div>
                            <a
                              href={file.file_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex-shrink-0 p-1.5 hover:bg-muted rounded transition-colors"
                              title="Download PDF"
                            >
                              <Download className="h-4 w-4 text-muted-foreground" />
                            </a>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default Archive;