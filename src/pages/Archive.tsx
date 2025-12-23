import { PageIntroduction, ArchiveFilters } from '@/components/shared';
import { reports } from '@/lib/data';

const Archive = () => {
  return (
    <>
      <PageIntroduction
        title="Archive"
        description="Browse all research reports and publications."
      />

      <div className="container py-section-sm md:py-section">
        <ArchiveFilters reports={reports} />
      </div>
    </>
  );
};

export default Archive;
