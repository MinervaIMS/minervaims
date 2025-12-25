import { PageIntroduction, ArchiveFilters } from '@/components/shared';
import { reports } from '@/lib/data';
import archiveBg from '@/assets/archive-bg.png';

const Archive = () => {
  return (
    <div 
      className="min-h-screen bg-cover bg-center bg-fixed"
      style={{ backgroundImage: `url(${archiveBg})` }}
    >
      <div className="bg-background/90 min-h-screen">
        <PageIntroduction
          title="Archive"
          description="Browse all research reports and publications."
        />

        <div className="container py-section-sm md:py-section">
          <ArchiveFilters reports={reports} />
        </div>
      </div>
    </div>
  );
};

export default Archive;
