import { PageIntroduction, ArchiveFilters } from "@/components/shared";
import { reports } from "@/lib/data";
import archiveBg from "@/assets/archive-bg-4.png";

const Archive = () => {
  return (
    <>
      {/* Hero section with background image */}
      <div className="relative">
        {/* Background image layer */}
        <div className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: `url(${archiveBg})` }} />
        {/* Overlay */}
        <div className="absolute inset-0 bg-foreground/60" />
        {/* Content */}
        <div className="relative z-10">
          <PageIntroduction
            title="Archive"
            description="Browse all research reports and publications."
            transparentBackground
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
