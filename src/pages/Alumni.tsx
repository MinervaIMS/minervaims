import { PageIntroduction, AlumniTable } from '@/components/shared';
import { alumni } from '@/lib/data';

const Alumni = () => {
  return (
    <>
      <PageIntroduction
        title="Alumni"
        description="Our alumni network spans leading financial institutions globally."
      />

      <div className="container py-section-sm md:py-section">
        <AlumniTable alumni={alumni} />
      </div>
    </>
  );
};

export default Alumni;
