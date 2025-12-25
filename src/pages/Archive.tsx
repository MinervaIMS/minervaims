import { PageIntroduction, ArchiveFilters } from '@/components/shared';
import { reports } from '@/lib/data';
import archiveBg from '@/assets/archive-bg-new.png';

const Archive = () => {
  return (
    <>
      {/* Hero section with background image */}
      <div 
        className="bg-cover bg-center relative"
        style={{ backgroundImage: `url(${archiveBg})` }}
      >
        <div className="bg-foreground/60">
          <PageIntroduction
            title="Archive"
            description="Browse all research reports and publications."
          />
        </div>
      </div>

      {/* Content section without background image */}
      <div className="bg-background">
        <div className="container py-section-sm md:py-section">
          <ArchiveFilters reports={reports} />
        </div>
      </div>
    </>
  );
};

export default Archive;
